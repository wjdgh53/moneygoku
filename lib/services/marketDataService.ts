import { prisma } from '@/lib/prisma';

// Mock TradingView API data (since we're using free tier)
// In a real implementation, this would connect to TradingView API
const MOCK_MARKET_DATA = {
  AAPL: { price: 150.25, change: 1.75, changePercent: 1.18 },
  TSLA: { price: 238.30, change: -7.50, changePercent: -3.05 },
  MSFT: { price: 378.50, change: 2.25, changePercent: 0.60 },
  GOOGL: { price: 138.20, change: -1.80, changePercent: -1.29 },
  NVDA: { price: 875.30, change: 15.40, changePercent: 1.79 }
};

export class MarketDataService {
  private static instance: MarketDataService;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  // Start polling market data every minute
  public startPolling(): void {
    if (this.intervalId) {
      console.log('Market data polling is already running');
      return;
    }

    console.log('📈 Starting market data polling (1-minute intervals)');

    // Poll immediately then every minute
    this.pollMarketData();
    this.intervalId = setInterval(() => {
      this.pollMarketData();
    }, 60 * 1000); // 1 minute
  }

  // Stop polling
  public stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('📉 Market data polling stopped');
    }
  }

  // Poll market data and update database
  private async pollMarketData(): Promise<void> {
    try {
      const timestamp = new Date();

      for (const [symbol, data] of Object.entries(MOCK_MARKET_DATA)) {
        // Add some random variation to simulate real market movement
        const variation = (Math.random() - 0.5) * 2; // -1% to +1%
        const currentPrice = data.price * (1 + variation / 100);

        await prisma.marketData.upsert({
          where: {
            symbol_timestamp: {
              symbol,
              timestamp
            }
          },
          update: {
            open: currentPrice * 0.999,
            high: currentPrice * 1.002,
            low: currentPrice * 0.998,
            close: currentPrice,
            volume: Math.floor(Math.random() * 1000000) + 500000
          },
          create: {
            symbol,
            timestamp,
            open: currentPrice * 0.999,
            high: currentPrice * 1.002,
            low: currentPrice * 0.998,
            close: currentPrice,
            volume: Math.floor(Math.random() * 1000000) + 500000,
            source: 'TRADINGVIEW'
          }
        });
      }

      console.log(`📊 Market data updated for ${Object.keys(MOCK_MARKET_DATA).length} symbols`);
    } catch (error) {
      console.error('Error polling market data:', error);
    }
  }

  // Get latest market data for a symbol
  public async getLatestPrice(symbol: string): Promise<number | null> {
    try {
      const latestData = await prisma.marketData.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' }
      });

      return latestData?.close || null;
    } catch (error) {
      console.error(`Error fetching latest price for ${symbol}:`, error);
      return null;
    }
  }

  // Get market data for multiple symbols
  public async getMarketData(symbols: string[]): Promise<Record<string, any>> {
    try {
      const data: Record<string, any> = {};

      for (const symbol of symbols) {
        const latestData = await prisma.marketData.findFirst({
          where: { symbol },
          orderBy: { timestamp: 'desc' }
        });

        if (latestData) {
          data[symbol] = {
            price: latestData.close,
            open: latestData.open,
            high: latestData.high,
            low: latestData.low,
            volume: latestData.volume,
            timestamp: latestData.timestamp
          };
        }
      }

      return data;
    } catch (error) {
      console.error('Error fetching market data:', error);
      return {};
    }
  }
}

// Export singleton instance
export const marketDataService = MarketDataService.getInstance();