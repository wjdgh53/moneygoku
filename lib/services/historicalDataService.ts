import { prisma } from '@/lib/prisma';

export interface HistoricalDataPoint {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface AlphaVantageTimeSeriesResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
}

class HistoricalDataService {
  private readonly API_KEY: string;
  private readonly BASE_URL = 'https://www.alphavantage.co/query';

  constructor() {
    if (!process.env.ALPHA_VANTAGE_API_KEY) {
      throw new Error('Alpha Vantage API key not configured');
    }
    this.API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  }

  async fetchHistoricalData(symbol: string, outputSize: 'compact' | 'full' = 'full'): Promise<HistoricalDataPoint[]> {
    const params = new URLSearchParams({
      function: 'TIME_SERIES_DAILY',
      symbol,
      outputsize: outputSize,
      apikey: this.API_KEY
    });

    const url = `${this.BASE_URL}?${params}`;

    try {
      console.log(`Fetching historical data for ${symbol}...`);

      const response = await fetch(url);
      const data: AlphaVantageTimeSeriesResponse = await response.json();

      // Check for API errors (use type assertion for error properties)
      const dataWithErrors = data as any;
      if (dataWithErrors['Error Message'] || dataWithErrors['Note']) {
        throw new Error(`Alpha Vantage error: ${dataWithErrors['Error Message'] || dataWithErrors['Note']}`);
      }

      if (!data['Time Series (Daily)']) {
        throw new Error('No time series data received from Alpha Vantage');
      }

      const timeSeries = data['Time Series (Daily)'];
      const historicalData: HistoricalDataPoint[] = [];

      // Convert Alpha Vantage format to our format
      for (const [date, values] of Object.entries(timeSeries)) {
        historicalData.push({
          date,
          open: values['1. open'],
          high: values['2. high'],
          low: values['3. low'],
          close: values['4. close'],
          volume: values['5. volume']
        });
      }

      // Sort by date (oldest first for proper historical order)
      historicalData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log(`✓ Fetched ${historicalData.length} historical data points for ${symbol}`);
      return historicalData;

    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }

  async saveHistoricalDataToDatabase(symbol: string, historicalData: HistoricalDataPoint[]): Promise<number> {
    let savedCount = 0;

    console.log(`Saving ${historicalData.length} historical data points for ${symbol} to database...`);

    for (const dataPoint of historicalData) {
      try {
        // Check if data already exists for this symbol and date
        const existing = await prisma.marketData.findFirst({
          where: {
            symbol: symbol.toUpperCase(),
            timestamp: {
              gte: new Date(`${dataPoint.date}T00:00:00Z`),
              lt: new Date(`${dataPoint.date}T23:59:59Z`)
            }
          }
        });

        if (!existing) {
          await prisma.marketData.create({
            data: {
              symbol: symbol.toUpperCase(),
              open: parseFloat(dataPoint.open),
              high: parseFloat(dataPoint.high),
              low: parseFloat(dataPoint.low),
              close: parseFloat(dataPoint.close),
              volume: parseFloat(dataPoint.volume),
              timestamp: new Date(`${dataPoint.date}T16:00:00Z`), // Market close time
              source: 'ALPHA_VANTAGE_HISTORICAL'
            }
          });
          savedCount++;
        }
      } catch (error) {
        console.error(`Error saving data point for ${symbol} on ${dataPoint.date}:`, error);
      }
    }

    console.log(`✓ Saved ${savedCount} new historical data points for ${symbol}`);
    return savedCount;
  }

  async fetchAndStoreHistoricalData(symbol: string, outputSize: 'compact' | 'full' = 'full'): Promise<{
    fetched: number;
    saved: number;
    symbol: string;
  }> {
    try {
      // Fetch historical data from Alpha Vantage
      const historicalData = await this.fetchHistoricalData(symbol, outputSize);

      // Save to database
      const savedCount = await this.saveHistoricalDataToDatabase(symbol, historicalData);

      return {
        fetched: historicalData.length,
        saved: savedCount,
        symbol: symbol.toUpperCase()
      };

    } catch (error) {
      console.error(`Error in fetchAndStoreHistoricalData for ${symbol}:`, error);
      throw error;
    }
  }

  async getStoredDataCount(symbol: string): Promise<number> {
    const count = await prisma.marketData.count({
      where: { symbol: symbol.toUpperCase() }
    });
    return count;
  }

  async fetchHistoricalDataForAllWatchlistSymbols(): Promise<{
    results: Array<{
      symbol: string;
      fetched: number;
      saved: number;
      error?: string;
    }>;
    totalFetched: number;
    totalSaved: number;
  }> {
    const activeSymbols = await prisma.watchList.findMany({
      where: { isActive: true },
      select: { symbol: true }
    });

    const results = [];
    let totalFetched = 0;
    let totalSaved = 0;

    for (const { symbol } of activeSymbols) {
      try {
        console.log(`Processing historical data for ${symbol}...`);

        const result = await this.fetchAndStoreHistoricalData(symbol);

        results.push({
          symbol: result.symbol,
          fetched: result.fetched,
          saved: result.saved
        });

        totalFetched += result.fetched;
        totalSaved += result.saved;

        // Add delay between requests to respect API limits
        await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds for free tier

      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        results.push({
          symbol: symbol.toUpperCase(),
          fetched: 0,
          saved: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      results,
      totalFetched,
      totalSaved
    };
  }
}

export const historicalDataService = new HistoricalDataService();