# Phase 2: Historical Data Pipeline - Technical Implementation Plan

## Executive Summary
This document specifies a comprehensive market data collection, caching, and validation system to support backtesting. The pipeline addresses Alpha Vantage's strict API limits (25 calls/day free tier) through intelligent caching, batch downloads, and incremental updates.

---

## 1. Technical Architecture

### 1.1 System Components

```
┌────────────────────────────────────────────────────────────┐
│               Data Ingestion Controller                    │
│  - Orchestrates batch downloads                            │
│  - Manages API rate limiting                               │
│  - Schedules daily incremental updates                     │
└──────────────────┬─────────────────────────────────────────┘
                   │
      ┌────────────┴──────────────┐
      │                           │
┌─────▼────────────┐    ┌─────────▼──────────┐
│ Alpha Vantage    │    │  Cache Manager     │
│ API Client       │    │                    │
│ - Rate limiter   │    │ - MarketData table │
│ - Retry logic    │    │ - Query optimizer  │
│ - Multi-interval │    │ - Compression      │
└─────┬────────────┘    └─────────┬──────────┘
      │                           │
      │                           │
┌─────▼───────────────────────────▼──────────┐
│         Data Validation Engine             │
│  - Gap detection                           │
│  - Anomaly filtering (zero volume, spikes) │
│  - Completeness scoring                    │
└────────────────────────────────────────────┘
```

### 1.2 Data Flow Diagram

```
1. Initialization (One-time)
   ├─ Load watchlist symbols
   ├─ For each symbol:
   │  ├─ Download 2 years of daily data (1 API call)
   │  ├─ Download 2 years of intraday data (multiple calls)
   │  └─ Store in MarketData table
   └─ Estimated: 3-5 API calls per symbol

2. Daily Updates (Scheduled)
   ├─ Check last update timestamp
   ├─ Fetch only missing bars (incremental)
   │  └─ Use "outputsize=compact" (last 100 bars)
   └─ Estimated: 1 API call per symbol per day

3. Backtest Query (Read-only)
   ├─ Query MarketData by (symbol, timeHorizon, date range)
   ├─ Return chronologically ordered bars
   └─ No API calls (served from cache)
```

---

## 2. Database Schema Enhancement

### 2.1 Enhanced MarketData Model

```prisma
model MarketData {
  id        String   @id @default(cuid())

  // Identification
  symbol    String
  interval  String   // "1min", "5min", "15min", "60min", "daily"
  timestamp DateTime // Bar start time (UTC)

  // OHLCV data
  open      Float
  high      Float
  low       Float
  close     Float
  volume    Float

  // Data quality flags
  isValidated Boolean  @default(false)  // Passed validation checks
  hasGap      Boolean  @default(false)  // Gap detected before this bar
  isAnomaly   Boolean  @default(false)  // Flagged as anomalous (spike, zero volume)

  // Metadata
  source    String   @default("ALPHA_VANTAGE")
  fetchedAt DateTime @default(now())   // When data was fetched from API
  createdAt DateTime @default(now())

  @@unique([symbol, interval, timestamp])
  @@index([symbol, interval])
  @@index([timestamp])
  @@index([isValidated])
  @@map("market_data")
}

// New model: Track data completeness
model MarketDataStatus {
  id            String   @id @default(cuid())

  symbol        String
  interval      String

  // Coverage tracking
  oldestBar     DateTime?  // Earliest bar we have
  latestBar     DateTime?  // Most recent bar we have
  totalBars     Int        @default(0)

  // Data quality
  completeness  Float      @default(0.0)  // 0-100% based on expected bars
  gapCount      Int        @default(0)
  anomalyCount  Int        @default(0)

  // Update tracking
  lastFetchedAt DateTime?  // Last API call timestamp
  lastValidatedAt DateTime? // Last validation run

  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  @@unique([symbol, interval])
  @@map("market_data_status")
}
```

### 2.2 API Usage Tracking

```prisma
model AlphaVantageApiLog {
  id            String   @id @default(cuid())

  endpoint      String   // "TIME_SERIES_INTRADAY", "TIME_SERIES_DAILY"
  symbol        String
  interval      String?
  outputsize    String?  // "compact" or "full"

  // Response
  success       Boolean
  barsReturned  Int      @default(0)
  errorMessage  String?

  // Rate limiting
  timestamp     DateTime @default(now())
  responseTime  Int      // milliseconds

  @@index([timestamp])
  @@map("alpha_vantage_api_logs")
}
```

---

## 3. Core Implementation

### 3.1 Alpha Vantage API Client (with Rate Limiting)

**File:** `/lib/services/alphaVantageClient.ts`

```typescript
import { prisma } from '@/lib/prisma';

interface FetchOptions {
  symbol: string;
  interval: '1min' | '5min' | '15min' | '30min' | '60min' | 'daily';
  outputsize?: 'compact' | 'full';
  month?: string; // For intraday: "2023-01" format
}

export class AlphaVantageClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private readonly rateLimit = {
    callsPerMinute: 5,
    callsPerDay: 25
  };

  private lastCallTimestamp: number = 0;
  private callsToday: number = 0;
  private callsThisMinute: number = 0;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ ALPHA_VANTAGE_API_KEY not set');
    }
  }

  /**
   * Fetch time series data with rate limiting
   */
  async fetchTimeSeries(options: FetchOptions): Promise<any[]> {
    const startTime = Date.now();

    // 1. Check rate limits
    await this.enforceRateLimit();

    // 2. Build API URL
    const url = this.buildUrl(options);
    console.log(`📊 Fetching ${options.symbol} ${options.interval}...`);

    try {
      // 3. Make API call
      const response = await fetch(url);
      const data = await response.json();

      // 4. Check for errors
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        throw new Error(`Rate limit exceeded: ${data['Note']}`);
      }

      // 5. Parse response
      const bars = this.parseResponse(data, options.interval);

      // 6. Log API call
      await this.logApiCall({
        endpoint: options.interval === 'daily' ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_INTRADAY',
        symbol: options.symbol,
        interval: options.interval,
        outputsize: options.outputsize,
        success: true,
        barsReturned: bars.length,
        responseTime: Date.now() - startTime
      });

      console.log(`✅ Fetched ${bars.length} bars in ${Date.now() - startTime}ms`);

      return bars;

    } catch (error: any) {
      console.error(`❌ API call failed:`, error);

      // Log failure
      await this.logApiCall({
        endpoint: options.interval === 'daily' ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_INTRADAY',
        symbol: options.symbol,
        interval: options.interval,
        outputsize: options.outputsize,
        success: false,
        barsReturned: 0,
        errorMessage: error.message,
        responseTime: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Enforce rate limiting (5 calls/min, 25 calls/day)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCalls = await prisma.alphaVantageApiLog.count({
      where: {
        timestamp: {
          gte: todayStart
        }
      }
    });

    if (todayCalls >= this.rateLimit.callsPerDay) {
      throw new Error(`Daily API limit reached (${this.rateLimit.callsPerDay} calls/day). Try again tomorrow.`);
    }

    // Check per-minute limit
    const oneMinuteAgo = new Date(now - 60 * 1000);
    const recentCalls = await prisma.alphaVantageApiLog.count({
      where: {
        timestamp: {
          gte: oneMinuteAgo
        }
      }
    });

    if (recentCalls >= this.rateLimit.callsPerMinute) {
      const waitTime = 60 * 1000 - (now - this.lastCallTimestamp);
      console.log(`⏳ Rate limit: waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCallTimestamp = now;
  }

  /**
   * Build Alpha Vantage API URL
   */
  private buildUrl(options: FetchOptions): string {
    const params = new URLSearchParams({
      apikey: this.apiKey,
      symbol: options.symbol
    });

    if (options.interval === 'daily') {
      params.set('function', 'TIME_SERIES_DAILY');
      params.set('outputsize', options.outputsize || 'full');
      params.set('datatype', 'json');
    } else {
      params.set('function', 'TIME_SERIES_INTRADAY');
      params.set('interval', options.interval);
      params.set('outputsize', options.outputsize || 'full');
      params.set('datatype', 'json');

      if (options.month) {
        params.set('month', options.month);
      }

      // Enable extended hours for intraday
      params.set('extended_hours', 'true');
    }

    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Parse Alpha Vantage response into normalized bars
   */
  private parseResponse(data: any, interval: string): any[] {
    const bars: any[] = [];

    // Determine time series key
    let timeSeriesKey = '';
    if (interval === 'daily') {
      timeSeriesKey = 'Time Series (Daily)';
    } else {
      timeSeriesKey = `Time Series (${interval})`;
    }

    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) {
      console.warn('⚠️ No time series data found in response');
      return bars;
    }

    // Parse each bar
    for (const [timestamp, values] of Object.entries(timeSeries)) {
      bars.push({
        timestamp: new Date(timestamp),
        open: parseFloat((values as any)['1. open']),
        high: parseFloat((values as any)['2. high']),
        low: parseFloat((values as any)['3. low']),
        close: parseFloat((values as any)['4. close']),
        volume: parseFloat((values as any)['5. volume'])
      });
    }

    // Sort chronologically (oldest first)
    bars.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return bars;
  }

  /**
   * Log API call to database
   */
  private async logApiCall(params: {
    endpoint: string;
    symbol: string;
    interval?: string;
    outputsize?: string;
    success: boolean;
    barsReturned: number;
    errorMessage?: string;
    responseTime: number;
  }): Promise<void> {
    try {
      await prisma.alphaVantageApiLog.create({
        data: params
      });
    } catch (error) {
      console.error('Failed to log API call:', error);
    }
  }

  /**
   * Get remaining API calls for today
   */
  async getRemainingCalls(): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCalls = await prisma.alphaVantageApiLog.count({
      where: {
        timestamp: {
          gte: todayStart
        }
      }
    });

    return Math.max(0, this.rateLimit.callsPerDay - todayCalls);
  }
}

export const alphaVantageClient = new AlphaVantageClient();
```

**Estimated LOC:** 250 lines

---

### 3.2 Historical Data Provider

**File:** `/lib/services/historicalDataProvider.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { alphaVantageClient } from './alphaVantageClient';

interface LoadBarsOptions {
  symbol: string;
  timeHorizon: 'SHORT_TERM' | 'SWING' | 'LONG_TERM';
  startDate: Date;
  endDate: Date;
}

export class HistoricalDataProvider {
  /**
   * Load historical bars for backtesting (with caching)
   */
  async loadHistoricalBars(options: LoadBarsOptions): Promise<any[]> {
    // 1. Determine interval based on timeHorizon
    const interval = this.getInterval(options.timeHorizon);

    // 2. Check if data exists in cache
    const cachedBars = await this.loadFromCache(
      options.symbol,
      interval,
      options.startDate,
      options.endDate
    );

    // 3. Calculate completeness
    const expectedBars = this.calculateExpectedBars(
      interval,
      options.startDate,
      options.endDate
    );

    const completeness = (cachedBars.length / expectedBars) * 100;

    console.log(`📊 Cache status: ${cachedBars.length}/${expectedBars} bars (${completeness.toFixed(1)}%)`);

    // 4. If cache is insufficient (<90%), fetch from API
    if (completeness < 90) {
      console.log(`⚠️ Cache incomplete - fetching from API...`);
      await this.fetchAndStore(options.symbol, interval, options.startDate, options.endDate);

      // Reload from cache
      return this.loadFromCache(
        options.symbol,
        interval,
        options.startDate,
        options.endDate
      );
    }

    return cachedBars;
  }

  /**
   * Load bars from MarketData cache
   */
  private async loadFromCache(
    symbol: string,
    interval: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const bars = await prisma.marketData.findMany({
      where: {
        symbol,
        interval,
        timestamp: {
          gte: startDate,
          lte: endDate
        },
        isValidated: true // Only return validated bars
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    return bars;
  }

  /**
   * Fetch data from Alpha Vantage and store in cache
   */
  private async fetchAndStore(
    symbol: string,
    interval: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    if (interval === 'daily') {
      // Daily data: 1 API call for 20+ years
      await this.fetchDailyData(symbol);
    } else {
      // Intraday data: Multiple API calls (1 per month)
      await this.fetchIntradayData(symbol, interval, startDate, endDate);
    }

    // Validate newly stored data
    await this.validateData(symbol, interval);

    // Update status tracking
    await this.updateDataStatus(symbol, interval);
  }

  /**
   * Fetch daily data (full history)
   */
  private async fetchDailyData(symbol: string): Promise<void> {
    const bars = await alphaVantageClient.fetchTimeSeries({
      symbol,
      interval: 'daily',
      outputsize: 'full'
    });

    // Store in database (batch insert)
    await this.batchInsertBars(symbol, 'daily', bars);

    console.log(`✅ Stored ${bars.length} daily bars for ${symbol}`);
  }

  /**
   * Fetch intraday data (monthly slices due to Alpha Vantage limit)
   */
  private async fetchIntradayData(
    symbol: string,
    interval: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    // Generate list of months to fetch
    const months = this.generateMonthList(startDate, endDate);

    console.log(`📅 Fetching ${months.length} months of intraday data...`);

    for (const month of months) {
      console.log(`   Fetching ${month}...`);

      try {
        const bars = await alphaVantageClient.fetchTimeSeries({
          symbol,
          interval: interval as any,
          outputsize: 'full',
          month
        });

        if (bars.length > 0) {
          await this.batchInsertBars(symbol, interval, bars);
        }

        // Delay between calls (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds = 5 calls/min

      } catch (error: any) {
        console.error(`❌ Failed to fetch ${month}:`, error.message);

        // Check if rate limit hit
        if (error.message.includes('Rate limit')) {
          console.log('⏳ Rate limit reached - stopping fetch. Resume tomorrow.');
          break;
        }
      }
    }
  }

  /**
   * Batch insert bars into database (optimized)
   */
  private async batchInsertBars(
    symbol: string,
    interval: string,
    bars: any[]
  ): Promise<void> {
    const BATCH_SIZE = 500;

    for (let i = 0; i < bars.length; i += BATCH_SIZE) {
      const batch = bars.slice(i, i + BATCH_SIZE);

      // Use upsert to avoid duplicates
      await prisma.$transaction(
        batch.map(bar =>
          prisma.marketData.upsert({
            where: {
              symbol_interval_timestamp: {
                symbol,
                interval,
                timestamp: bar.timestamp
              }
            },
            create: {
              symbol,
              interval,
              timestamp: bar.timestamp,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
              volume: bar.volume,
              isValidated: false
            },
            update: {
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
              volume: bar.volume
            }
          })
        )
      );

      console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(bars.length / BATCH_SIZE)} inserted`);
    }
  }

  /**
   * Validate data quality
   */
  private async validateData(symbol: string, interval: string): Promise<void> {
    console.log(`🔍 Validating data for ${symbol} ${interval}...`);

    // Load all bars for this symbol/interval
    const bars = await prisma.marketData.findMany({
      where: { symbol, interval, isValidated: false },
      orderBy: { timestamp: 'asc' }
    });

    let anomalyCount = 0;
    let gapCount = 0;

    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      let isAnomaly = false;
      let hasGap = false;

      // 1. Check for zero volume
      if (bar.volume === 0) {
        isAnomaly = true;
        console.warn(`⚠️ Zero volume detected: ${bar.timestamp.toISOString()}`);
      }

      // 2. Check for extreme price movements (>50% in one bar)
      if (bar.high / bar.low > 1.5) {
        isAnomaly = true;
        console.warn(`⚠️ Extreme price movement: ${bar.timestamp.toISOString()} (${((bar.high / bar.low - 1) * 100).toFixed(2)}%)`);
      }

      // 3. Check for gaps (time discontinuity)
      if (i > 0) {
        const prevBar = bars[i - 1];
        const expectedInterval = this.getExpectedIntervalMs(interval);
        const actualInterval = bar.timestamp.getTime() - prevBar.timestamp.getTime();

        // Allow for weekends/holidays (3x normal interval)
        if (actualInterval > expectedInterval * 3) {
          hasGap = true;
          gapCount++;
        }
      }

      if (isAnomaly) anomalyCount++;

      // Update bar
      await prisma.marketData.update({
        where: { id: bar.id },
        data: {
          isValidated: true,
          isAnomaly,
          hasGap
        }
      });
    }

    console.log(`✅ Validation complete: ${anomalyCount} anomalies, ${gapCount} gaps`);
  }

  /**
   * Update MarketDataStatus tracking
   */
  private async updateDataStatus(symbol: string, interval: string): Promise<void> {
    // Get oldest and latest bars
    const [oldest, latest, total] = await Promise.all([
      prisma.marketData.findFirst({
        where: { symbol, interval, isValidated: true },
        orderBy: { timestamp: 'asc' }
      }),
      prisma.marketData.findFirst({
        where: { symbol, interval, isValidated: true },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.marketData.count({
        where: { symbol, interval, isValidated: true }
      })
    ]);

    // Count gaps and anomalies
    const [gapCount, anomalyCount] = await Promise.all([
      prisma.marketData.count({
        where: { symbol, interval, hasGap: true }
      }),
      prisma.marketData.count({
        where: { symbol, interval, isAnomaly: true }
      })
    ]);

    // Calculate completeness
    let completeness = 0;
    if (oldest && latest) {
      const expectedBars = this.calculateExpectedBars(
        interval,
        oldest.timestamp,
        latest.timestamp
      );
      completeness = (total / expectedBars) * 100;
    }

    // Upsert status
    await prisma.marketDataStatus.upsert({
      where: {
        symbol_interval: { symbol, interval }
      },
      create: {
        symbol,
        interval,
        oldestBar: oldest?.timestamp,
        latestBar: latest?.timestamp,
        totalBars: total,
        completeness,
        gapCount,
        anomalyCount,
        lastFetchedAt: new Date(),
        lastValidatedAt: new Date()
      },
      update: {
        oldestBar: oldest?.timestamp,
        latestBar: latest?.timestamp,
        totalBars: total,
        completeness,
        gapCount,
        anomalyCount,
        lastFetchedAt: new Date(),
        lastValidatedAt: new Date()
      }
    });

    console.log(`📊 Data status updated: ${total} bars, ${completeness.toFixed(1)}% complete`);
  }

  // Helper methods

  private getInterval(timeHorizon: string): string {
    switch (timeHorizon) {
      case 'SHORT_TERM': return '15min';
      case 'SWING': return '60min';
      case 'LONG_TERM': return 'daily';
      default: return 'daily';
    }
  }

  private calculateExpectedBars(interval: string, startDate: Date, endDate: Date): number {
    const totalMs = endDate.getTime() - startDate.getTime();
    const intervalMs = this.getExpectedIntervalMs(interval);

    if (interval === 'daily') {
      // 252 trading days per year
      const years = totalMs / (365 * 24 * 60 * 60 * 1000);
      return Math.floor(years * 252);
    } else {
      // Trading hours: 6.5 hours/day (9:30-4:00), 252 days/year
      const tradingMinutesPerYear = 6.5 * 60 * 252;
      const years = totalMs / (365 * 24 * 60 * 60 * 1000);
      const intervalMinutes = intervalMs / (60 * 1000);
      return Math.floor((tradingMinutesPerYear * years) / intervalMinutes);
    }
  }

  private getExpectedIntervalMs(interval: string): number {
    switch (interval) {
      case '1min': return 60 * 1000;
      case '5min': return 5 * 60 * 1000;
      case '15min': return 15 * 60 * 1000;
      case '60min': return 60 * 60 * 1000;
      case 'daily': return 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private generateMonthList(startDate: Date, endDate: Date): string[] {
    const months: string[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);

      // Move to next month
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }
}

export const historicalDataProvider = new HistoricalDataProvider();
```

**Estimated LOC:** 380 lines

---

### 3.3 Batch Download Script

**File:** `/scripts/backtest-data-download.ts`

```typescript
import { historicalDataProvider } from '@/lib/services/historicalDataProvider';
import { prisma } from '@/lib/prisma';
import { alphaVantageClient } from '@/lib/services/alphaVantageClient';

/**
 * Batch download historical data for all watchlist symbols
 *
 * Usage:
 *   npx ts-node scripts/backtest-data-download.ts
 *
 * WARNING: This will use significant API quota (3-5 calls per symbol)
 */

async function main() {
  console.log('🚀 Starting batch historical data download\n');

  // 1. Load watchlist symbols
  const watchlist = await prisma.watchList.findMany({
    where: { isActive: true }
  });

  console.log(`📊 Found ${watchlist.length} symbols in watchlist\n`);

  // 2. Check remaining API calls
  const remainingCalls = await alphaVantageClient.getRemainingCalls();
  console.log(`📡 Remaining API calls today: ${remainingCalls}\n`);

  if (remainingCalls < 3) {
    console.error('❌ Insufficient API calls remaining. Need at least 3 per symbol.');
    process.exit(1);
  }

  // 3. Calculate how many symbols we can process
  const maxSymbols = Math.floor(remainingCalls / 3); // Conservative estimate
  const symbolsToProcess = watchlist.slice(0, maxSymbols);

  console.log(`✅ Will process ${symbolsToProcess.length} symbols\n`);

  // 4. Process each symbol
  for (let i = 0; i < symbolsToProcess.length; i++) {
    const { symbol, name } = symbolsToProcess[i];

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${i + 1}/${symbolsToProcess.length}] Processing ${symbol} (${name})`);
    console.log('='.repeat(60));

    try {
      // Download daily data (1 API call)
      console.log('\n📅 Downloading daily data...');
      await historicalDataProvider.loadHistoricalBars({
        symbol,
        timeHorizon: 'LONG_TERM',
        startDate: new Date('2023-01-01'),
        endDate: new Date()
      });

      // Download 60min data for swing trading (multiple API calls)
      console.log('\n⏰ Downloading 60min data...');
      await historicalDataProvider.loadHistoricalBars({
        symbol,
        timeHorizon: 'SWING',
        startDate: new Date('2023-01-01'),
        endDate: new Date()
      });

      // Download 15min data for day trading (many API calls - may hit limit)
      console.log('\n⚡ Downloading 15min data...');
      await historicalDataProvider.loadHistoricalBars({
        symbol,
        timeHorizon: 'SHORT_TERM',
        startDate: new Date('2024-01-01'), // Only 1 year for 15min
        endDate: new Date()
      });

      console.log(`\n✅ ${symbol} complete\n`);

    } catch (error: any) {
      console.error(`\n❌ Failed to process ${symbol}:`, error.message);

      if (error.message.includes('Rate limit')) {
        console.log('\n⏳ Daily API limit reached. Resume tomorrow.');
        break;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Batch download complete');
  console.log('='.repeat(60));

  // 5. Print summary
  const statuses = await prisma.marketDataStatus.findMany({
    where: {
      symbol: {
        in: symbolsToProcess.map(s => s.symbol)
      }
    }
  });

  console.log('\n📊 Data Coverage Summary:\n');
  console.log('Symbol'.padEnd(10), 'Interval'.padEnd(10), 'Bars'.padEnd(10), 'Completeness'.padEnd(15), 'Gaps'.padEnd(8));
  console.log('-'.repeat(60));

  for (const status of statuses) {
    console.log(
      status.symbol.padEnd(10),
      status.interval.padEnd(10),
      status.totalBars.toString().padEnd(10),
      `${status.completeness.toFixed(1)}%`.padEnd(15),
      status.gapCount.toString().padEnd(8)
    );
  }
}

main()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Estimated LOC:** 150 lines

---

### 3.4 Daily Incremental Update (Cron Job)

**File:** `/lib/services/marketDataUpdater.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { alphaVantageClient } from './alphaVantageClient';
import { historicalDataProvider } from './historicalDataProvider';

export class MarketDataUpdater {
  /**
   * Daily update: Fetch latest bars for all active symbols
   * Should run once per day after market close (e.g., 6 PM ET)
   */
  async runDailyUpdate(): Promise<void> {
    console.log('🔄 Starting daily market data update\n');

    // 1. Load watchlist
    const watchlist = await prisma.watchList.findMany({
      where: { isActive: true }
    });

    console.log(`📊 Updating ${watchlist.length} symbols\n`);

    // 2. Check API quota
    const remainingCalls = await alphaVantageClient.getRemainingCalls();
    console.log(`📡 Remaining API calls: ${remainingCalls}\n`);

    if (remainingCalls < watchlist.length) {
      console.warn(`⚠️ Insufficient API calls (need ${watchlist.length}, have ${remainingCalls})`);
    }

    // 3. Update each symbol
    for (const { symbol, name } of watchlist) {
      console.log(`📈 Updating ${symbol}...`);

      try {
        // Fetch latest 100 bars (compact mode)
        const bars = await alphaVantageClient.fetchTimeSeries({
          symbol,
          interval: 'daily',
          outputsize: 'compact'
        });

        // Store new bars
        for (const bar of bars) {
          await prisma.marketData.upsert({
            where: {
              symbol_interval_timestamp: {
                symbol,
                interval: 'daily',
                timestamp: bar.timestamp
              }
            },
            create: {
              symbol,
              interval: 'daily',
              timestamp: bar.timestamp,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
              volume: bar.volume,
              isValidated: true
            },
            update: {
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
              volume: bar.volume
            }
          });
        }

        // Update status
        await prisma.marketDataStatus.update({
          where: {
            symbol_interval: { symbol, interval: 'daily' }
          },
          data: {
            lastFetchedAt: new Date(),
            latestBar: bars[bars.length - 1].timestamp
          }
        });

        console.log(`✅ ${symbol} updated (${bars.length} bars)`);

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds

      } catch (error: any) {
        console.error(`❌ Failed to update ${symbol}:`, error.message);
      }
    }

    console.log('\n✅ Daily update complete');
  }
}

export const marketDataUpdater = new MarketDataUpdater();
```

**Estimated LOC:** 100 lines

---

## 4. Cost Optimization Strategies

### 4.1 API Call Budgeting

```typescript
// Priority queue: Which symbols to update first
export async function prioritizeSymbols(): Promise<string[]> {
  // 1. Active bots (highest priority)
  const activeBots = await prisma.bot.findMany({
    where: { status: 'ACTIVE' },
    select: { symbol: true }
  });

  // 2. Recently traded symbols
  const recentTrades = await prisma.trade.findMany({
    where: {
      executedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    },
    select: { symbol: true },
    distinct: ['symbol']
  });

  // 3. Watchlist symbols
  const watchlist = await prisma.watchList.findMany({
    where: { isActive: true },
    select: { symbol: true }
  });

  // Deduplicate and prioritize
  const prioritized = new Set([
    ...activeBots.map(b => b.symbol),
    ...recentTrades.map(t => t.symbol),
    ...watchlist.map(w => w.symbol)
  ]);

  return Array.from(prioritized);
}
```

### 4.2 Compression Strategy

```typescript
// Store only essential bars (remove intraday bars older than 6 months)
export async function compressOldData(): Promise<void> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Delete old intraday data
  const deleted = await prisma.marketData.deleteMany({
    where: {
      interval: {
        in: ['1min', '5min', '15min', '60min']
      },
      timestamp: {
        lt: sixMonthsAgo
      }
    }
  });

  console.log(`🗑️ Compressed: Deleted ${deleted.count} old intraday bars`);
}
```

---

## 5. Implementation Roadmap

### Sprint 1 (2 weeks): Core Infrastructure
- **Days 1-3:** Implement Prisma schema (MarketData, MarketDataStatus, AlphaVantageApiLog)
- **Days 4-7:** Build AlphaVantageClient with rate limiting
- **Days 8-10:** Build HistoricalDataProvider (cache-first loading)
- **Deliverable:** Working data ingestion with rate limiting

### Sprint 2 (2 weeks): Batch Downloads & Validation
- **Days 1-4:** Implement batch download script
- **Days 5-8:** Build data validation engine (gap detection, anomaly filtering)
- **Days 9-10:** Test full download for 10 symbols
- **Deliverable:** Historical data for all watchlist symbols

### Sprint 3 (1 week): Daily Updates & Monitoring
- **Days 1-3:** Build MarketDataUpdater (incremental updates)
- **Days 4-5:** Set up cron job for daily updates
- **Days 6-7:** Build monitoring dashboard (data coverage, API usage)
- **Deliverable:** Automated daily data pipeline

---

## 6. Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Alpha Vantage API limit exhaustion | High | High | Priority queue, incremental updates, compression |
| Intraday data too large (10k+ bars) | Medium | Medium | Store only recent 6 months, daily aggregation for old data |
| Data quality (gaps, errors) | High | Medium | Validation pipeline, multiple data source fallback (future) |
| API downtime | Medium | Low | Graceful degradation, retry logic, cached data |

### Mitigation Strategies

1. **API Limits:** Use priority queue to update most important symbols first
2. **Storage:** Compress old intraday data, keep only daily for historical
3. **Data Quality:** Multi-source validation (future: add FMP, Polygon.io)
4. **Reliability:** Implement exponential backoff retry logic

---

## 7. Success Metrics

### Data Quality Thresholds
- **Completeness:** >95% of expected bars present
- **Missing Data:** <1% gaps in trading hours
- **Anomalies:** <0.5% zero-volume bars
- **Freshness:** Latest bar within 24 hours of market close

### Performance Benchmarks
- **Initial Download:** Complete 1 symbol in <5 minutes (all intervals)
- **Daily Update:** Update 25 symbols in <10 minutes (1 API call each)
- **Query Speed:** Load 500 bars from cache in <100ms

### API Usage Efficiency
- **Daily Quota:** Use <20 calls/day for maintenance updates
- **Initial Setup:** Complete all symbols within 5 days (25 calls/day)
- **Cache Hit Rate:** >95% of backtest queries served from cache

---

## 8. Code Structure

```
/lib/services/data/
├── alphaVantageClient.ts          (250 LOC)
├── historicalDataProvider.ts      (380 LOC)
├── marketDataUpdater.ts           (100 LOC)
└── __tests__/
    ├── alphaVantage.test.ts       (100 LOC)
    └── dataValidation.test.ts     (80 LOC)

/scripts/
├── backtest-data-download.ts      (150 LOC)
├── validate-data-quality.ts       (100 LOC)
└── compress-old-data.ts           (50 LOC)

/prisma/migrations/
└── YYYYMMDD_add_market_data_models.sql
```

**Total Estimated LOC:** 1,210 lines (excluding tests)

---

## 9. Database Migration Script

```sql
-- Migration: Add market data pipeline tables
-- File: /prisma/migrations/YYYYMMDD_add_market_data_pipeline.sql

-- Enhanced MarketData with validation
ALTER TABLE "market_data"
ADD COLUMN "interval" TEXT NOT NULL DEFAULT 'daily',
ADD COLUMN "isValidated" BOOLEAN DEFAULT FALSE,
ADD COLUMN "hasGap" BOOLEAN DEFAULT FALSE,
ADD COLUMN "isAnomaly" BOOLEAN DEFAULT FALSE,
ADD COLUMN "fetchedAt" TIMESTAMP DEFAULT NOW();

-- Add unique constraint on (symbol, interval, timestamp)
CREATE UNIQUE INDEX "uq_market_data_symbol_interval_timestamp"
ON "market_data"("symbol", "interval", "timestamp");

-- Add indexes for queries
CREATE INDEX "idx_market_data_symbol_interval" ON "market_data"("symbol", "interval");
CREATE INDEX "idx_market_data_validated" ON "market_data"("isValidated");

-- MarketDataStatus
CREATE TABLE "market_data_status" (
  "id" TEXT PRIMARY KEY,
  "symbol" TEXT NOT NULL,
  "interval" TEXT NOT NULL,

  "oldestBar" TIMESTAMP,
  "latestBar" TIMESTAMP,
  "totalBars" INTEGER DEFAULT 0,

  "completeness" DOUBLE PRECISION DEFAULT 0.0,
  "gapCount" INTEGER DEFAULT 0,
  "anomalyCount" INTEGER DEFAULT 0,

  "lastFetchedAt" TIMESTAMP,
  "lastValidatedAt" TIMESTAMP,

  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),

  CONSTRAINT "uq_status_symbol_interval" UNIQUE ("symbol", "interval")
);

CREATE INDEX "idx_status_symbol" ON "market_data_status"("symbol");

-- AlphaVantageApiLog
CREATE TABLE "alpha_vantage_api_logs" (
  "id" TEXT PRIMARY KEY,

  "endpoint" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "interval" TEXT,
  "outputsize" TEXT,

  "success" BOOLEAN NOT NULL,
  "barsReturned" INTEGER DEFAULT 0,
  "errorMessage" TEXT,

  "timestamp" TIMESTAMP DEFAULT NOW(),
  "responseTime" INTEGER
);

CREATE INDEX "idx_api_log_timestamp" ON "alpha_vantage_api_logs"("timestamp");
CREATE INDEX "idx_api_log_symbol" ON "alpha_vantage_api_logs"("symbol");
```

---

## 10. Cron Job Configuration

```typescript
// File: /lib/services/cronJobs.ts

import cron from 'node-cron';
import { marketDataUpdater } from './data/marketDataUpdater';

export function initializeDataPipeline() {
  // Run daily at 6:30 PM ET (after market close)
  cron.schedule('30 18 * * 1-5', async () => {
    console.log('🕒 Daily market data update triggered');
    try {
      await marketDataUpdater.runDailyUpdate();
    } catch (error) {
      console.error('❌ Daily update failed:', error);
    }
  }, {
    timezone: 'America/New_York'
  });

  console.log('✅ Market data cron job initialized');
}
```

---

## Conclusion

This Historical Data Pipeline provides a robust, cost-efficient solution for collecting and caching market data while respecting Alpha Vantage's strict API limits. The system prioritizes important symbols, validates data quality, and automatically updates daily to keep backtests fresh.

**Key Features:**
- ✅ Rate-limited API client (5 calls/min, 25 calls/day)
- ✅ Intelligent caching with 95%+ hit rate
- ✅ Data validation (gaps, anomalies, completeness)
- ✅ Automated daily updates
- ✅ Priority-based symbol queuing
- ✅ Cost optimization (compression, incremental updates)

**Next Steps:**
1. Review and approve schema design
2. Begin Sprint 1: Core infrastructure
3. Run initial batch download (5 days to complete all symbols)
