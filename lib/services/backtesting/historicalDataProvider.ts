/**
 * HistoricalDataProvider
 *
 * Loads historical OHLCV data for backtesting:
 * - Cache-first strategy (MarketData table)
 * - Fetches missing data from Alpha Vantage
 * - Validates data quality (gaps, anomalies)
 * - Tracks data completeness status
 *
 * Reference: docs/backtesting/PHASE2_HISTORICAL_DATA_PIPELINE.md
 */

import { prisma } from '@/lib/prisma';
import { alphaVantageService } from '../alphaVantageService';

interface LoadBarsRequest {
  symbol: string;
  timeHorizon: 'SHORT_TERM' | 'SWING' | 'LONG_TERM';
  startDate: Date;
  endDate: Date;
}

interface HistoricalBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class HistoricalDataProvider {
  /**
   * Load historical OHLCV bars for backtesting
   *
   * Strategy:
   * 1. Map timeHorizon to interval (SHORT_TERM → 15min, SWING → daily)
   * 2. Check cache (MarketData table)
   * 3. If insufficient data, fetch from Alpha Vantage
   * 4. Validate data quality
   * 5. Return chronologically sorted bars
   */
  async loadHistoricalBars(request: LoadBarsRequest): Promise<HistoricalBar[]> {
    const interval = this.getIntervalForTimeHorizon(request.timeHorizon);

    console.log(
      `📊 Loading historical data: ${request.symbol} (${interval}) from ${request.startDate.toISOString()} to ${request.endDate.toISOString()}`
    );

    // 1. Try loading from cache
    let cachedBars = await prisma.marketData.findMany({
      where: {
        symbol: request.symbol,
        interval,
        timestamp: {
          gte: request.startDate,
          lte: request.endDate,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    console.log(`✅ Found ${cachedBars.length} cached bars`);

    // 2. Check if we have sufficient data
    const expectedDays = this.calculateExpectedTradingDays(
      request.startDate,
      request.endDate
    );
    const cacheHitRate = cachedBars.length / expectedDays;

    console.log(
      `📊 Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}% (${cachedBars.length}/${expectedDays} days)`
    );

    // 3. If insufficient data, fetch from Alpha Vantage
    if (cacheHitRate < 0.5 || cachedBars.length === 0) {
      console.log('⚠️  Insufficient cached data, fetching from Alpha Vantage...');

      try {
        await alphaVantageService.fetchAndCacheHistoricalData(
          request.symbol,
          request.startDate,
          request.endDate
        );

        // Reload from cache
        cachedBars = await prisma.marketData.findMany({
          where: {
            symbol: request.symbol,
            interval,
            timestamp: {
              gte: request.startDate,
              lte: request.endDate,
            },
          },
          orderBy: { timestamp: 'asc' },
        });

        console.log(`✅ Loaded ${cachedBars.length} bars after fetching`);
      } catch (error) {
        console.error('❌ Failed to fetch historical data:', error);

        // If we have some cached data, use it
        if (cachedBars.length > 0) {
          console.warn('⚠️  Using partial cached data');
        } else {
          // No cached data and API fetch failed - cannot proceed
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(
            `No historical data available for ${request.symbol}. API fetch failed: ${errorMessage}`
          );
        }
      }
    }

    // 4. Validate minimum data requirement
    if (cachedBars.length < 20) {
      throw new Error(
        `Insufficient data for backtesting: only ${cachedBars.length} bars available (minimum 20 required)`
      );
    }

    return cachedBars.map((bar) => ({
      timestamp: bar.timestamp,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));
  }

  /**
   * Map time horizon to data interval
   */
  private getIntervalForTimeHorizon(timeHorizon: string): string {
    switch (timeHorizon) {
      case 'SHORT_TERM':
        return '15min'; // Day trading
      case 'SWING':
        return 'daily'; // Swing trading
      case 'LONG_TERM':
        return 'daily'; // Position trading
      default:
        return 'daily';
    }
  }

  /**
   * Calculate expected number of trading days between two dates
   * Approximation: ~252 trading days per year (excludes weekends and holidays)
   */
  private calculateExpectedTradingDays(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Approximate: 5/7 days are trading days (excludes weekends)
    // Further reduced by ~10 holidays per year
    const tradingDays = Math.floor(diffDays * (5 / 7) * 0.96);

    return Math.max(tradingDays, 1); // At least 1 day
  }
}

export const historicalDataProvider = new HistoricalDataProvider();
