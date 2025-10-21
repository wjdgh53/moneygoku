import { prisma } from '@/lib/prisma';

class AlphaVantageService {
  private intervalId: NodeJS.Timeout | null = null;
  private isPolling = false;
  private readonly POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes

  async fetchQuote(symbol: string) {
    if (!process.env.ALPHA_VANTAGE_API_KEY) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;

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
}

export const alphaVantageService = new AlphaVantageService();

// Auto-start polling in production
if (process.env.NODE_ENV === 'production' && process.env.ALPHA_VANTAGE_API_KEY) {
  alphaVantageService.startPolling();
}