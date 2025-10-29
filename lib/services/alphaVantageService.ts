import { prisma } from '@/lib/prisma';
import { getAlphaVantageKey } from '@/lib/config/env';

class AlphaVantageService {
  private intervalId: NodeJS.Timeout | null = null;
  private isPolling = false;
  private readonly POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes

  async fetchQuote(symbol: string) {
    const apiKey = getAlphaVantageKey();
    if (!apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data['Error Message'] || data['Note']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message'] || data['Note']}`);
      }

      const quote = data['Global Quote'];
      if (!quote) {
        throw new Error('No quote data received');
      }

      return {
        symbol: symbol.toUpperCase(),
        open: parseFloat(quote['02. open']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        close: parseFloat(quote['05. price']),
        volume: parseFloat(quote['06. volume']),
        timestamp: new Date(),
        source: 'ALPHA_VANTAGE'
      };
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  async updateMarketData() {
    try {
      // Get all active symbols from watchlist
      const activeWatchlist = await prisma.watchList.findMany({
        where: { isActive: true },
        select: { symbol: true }
      });

      const symbols = activeWatchlist.map(item => item.symbol);

      if (symbols.length === 0) {
        console.log('No active symbols in watchlist for market data update');
        return;
      }

      console.log(`Updating market data for symbols: ${symbols.join(', ')}`);

      for (const symbol of symbols) {
        try {
          // Add delay between requests to respect API limits
          await new Promise(resolve => setTimeout(resolve, 1000));

          const quoteData = await this.fetchQuote(symbol);

          await prisma.marketData.create({
            data: quoteData
          });

          console.log(`Updated market data for ${symbol}: $${quoteData.close}`);
        } catch (error) {
          console.error(`Failed to update market data for ${symbol}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in updateMarketData:', error);
    }
  }

  startPolling() {
    if (this.isPolling) {
      console.log('Market data polling is already running');
      return;
    }

    console.log('Starting market data polling (15-minute intervals)');
    this.isPolling = true;

    // Fetch immediately
    this.updateMarketData();

    // Then poll every 15 minutes
    this.intervalId = setInterval(() => {
      this.updateMarketData();
    }, this.POLL_INTERVAL);
  }

  stopPolling() {
    if (!this.isPolling) {
      console.log('Market data polling is not running');
      return;
    }

    console.log('Stopping market data polling');
    this.isPolling = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getStatus() {
    return {
      isPolling: this.isPolling,
      interval: this.POLL_INTERVAL / 1000 / 60 // minutes
    };
  }

  // Get current price for a symbol
  async getCurrentPrice(symbol: string): Promise<number> {
    const quote = await this.fetchQuote(symbol);
    return quote.close;
  }

  /**
   * Fetch daily historical data from Alpha Vantage
   * Returns up to 100 days of daily OHLCV data (compact mode)
   * For full 20+ years, use outputsize=full
   */
  async fetchDailyTimeSeries(symbol: string, outputsize: 'compact' | 'full' = 'full') {
    const apiKey = getAlphaVantageKey();
    if (!apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputsize}&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        throw new Error(`Alpha Vantage API limit: ${data['Note']}`);
      }

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        throw new Error('No time series data received');
      }

      // Convert to array of bars
      const bars = Object.entries(timeSeries).map(([dateStr, values]: [string, any]) => ({
        symbol: symbol.toUpperCase(),
        interval: 'daily',
        timestamp: new Date(dateStr + 'T00:00:00Z'), // UTC midnight
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseFloat(values['5. volume']),
        isValidated: true,
        hasGap: false,
        isAnomaly: false,
        source: 'ALPHA_VANTAGE',
      }));

      return bars;
    } catch (error) {
      console.error(`Error fetching daily time series for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch and cache historical data for a symbol
   * Saves to database to avoid repeated API calls
   */
  async fetchAndCacheHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    console.log(`🔄 Fetching historical data for ${symbol} from Alpha Vantage...`);

    try {
      // Fetch all available daily data
      const bars = await this.fetchDailyTimeSeries(symbol, 'full');

      // Filter to requested date range
      const filteredBars = bars.filter(
        (bar) => bar.timestamp >= startDate && bar.timestamp <= endDate
      );

      if (filteredBars.length === 0) {
        throw new Error(`No data available for ${symbol} in the requested date range`);
      }

      // Save to database (skip duplicates)
      await prisma.marketData.createMany({
        data: filteredBars,
        skipDuplicates: true,
      });

      console.log(`✅ Cached ${filteredBars.length} bars for ${symbol}`);
      return filteredBars.length;
    } catch (error) {
      console.error(`Failed to fetch historical data for ${symbol}:`, error);
      throw error;
    }
  }
}

export const alphaVantageService = new AlphaVantageService();

// Auto-start polling in production
if (process.env.NODE_ENV === 'production' && getAlphaVantageKey()) {
  alphaVantageService.startPolling();
}