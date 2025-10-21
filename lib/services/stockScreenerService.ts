/**
 * Stock Screener Service
 *
 * Fetches stock data from Alpha Vantage TOP_GAINERS_LOSERS API
 * and provides filtered, standardized stock information for bot creation.
 *
 * Features:
 * - Alpha Vantage API integration
 * - In-memory caching to respect rate limits
 * - Stock filtering and sorting
 * - Metric calculation (extensible for quant-analyst)
 */

import {
  AlphaVantageScreenerResponse,
  AlphaVantageStockData,
  ScreenedStock,
  ScreenerType,
  StockScreenerParams,
  StockScreenerResponse,
  AlphaVantageAPIError,
  RateLimitError,
  InvalidParametersError
} from '@/lib/types/stockScreener';

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: AlphaVantageScreenerResponse;
  timestamp: Date;
}

class StockScreenerService {
  private cache: CacheEntry | null = null;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  private readonly API_KEY: string;
  private readonly BASE_URL = 'https://www.alphavantage.co/query';

  constructor() {
    const apiKey = process.env.ALPHA_VANTAGE_KEY || process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_KEY or ALPHA_VANTAGE_API_KEY environment variable is not set');
    }
    this.API_KEY = apiKey;
  }

  /**
   * Fetch raw data from Alpha Vantage TOP_GAINERS_LOSERS endpoint
   * Uses cache to avoid repeated API calls within 5 minutes
   */
  private async fetchTopGainersLosers(): Promise<AlphaVantageScreenerResponse> {
    // Check cache first
    if (this.cache && this.isCacheValid()) {
      console.log('[StockScreener] Using cached data');
      return this.cache.data;
    }

    console.log('[StockScreener] Fetching fresh data from Alpha Vantage');

    const url = `${this.BASE_URL}?function=TOP_GAINERS_LOSERS&apikey=${this.API_KEY}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new AlphaVantageAPIError(
          `Alpha Vantage API returned status ${response.status}`
        );
      }

      const data = await response.json();

      // Check for API error messages
      if (data['Error Message']) {
        throw new AlphaVantageAPIError(data['Error Message']);
      }

      // Check for rate limit message
      if (data['Note'] && data['Note'].includes('API call frequency')) {
        throw new RateLimitError(data['Note']);
      }

      // Validate response structure
      if (!data.top_gainers || !data.top_losers || !data.most_actively_traded) {
        throw new AlphaVantageAPIError('Invalid response structure from Alpha Vantage');
      }

      // Update cache
      this.cache = {
        data,
        timestamp: new Date()
      };

      return data;
    } catch (error) {
      if (error instanceof AlphaVantageAPIError || error instanceof RateLimitError) {
        throw error;
      }

      console.error('[StockScreener] Error fetching data:', error);
      throw new AlphaVantageAPIError(
        `Failed to fetch data from Alpha Vantage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;

    const now = new Date().getTime();
    const cacheTime = this.cache.timestamp.getTime();
    return (now - cacheTime) < this.CACHE_DURATION_MS;
  }

  /**
   * Convert Alpha Vantage stock data to standardized format
   */
  private parseStockData(stock: AlphaVantageStockData): ScreenedStock {
    return {
      symbol: stock.ticker,
      price: parseFloat(stock.price),
      changeAmount: parseFloat(stock.change_amount),
      changePercent: parseFloat(stock.change_percentage.replace('%', '')),
      volume: parseFloat(stock.volume),
      source: 'ALPHA_VANTAGE',
      fetchedAt: new Date()
    };
  }

  /**
   * Calculate additional metrics for stocks
   * NOTE: This is a placeholder - quant-analyst will specify exact formulas
   */
  private calculateMetrics(stock: ScreenedStock): ScreenedStock {
    // Volatility: Based on price change percentage (simple proxy)
    // Higher absolute change = higher volatility
    stock.volatility = Math.abs(stock.changePercent);

    // Momentum: Positive for gainers, negative for losers
    stock.momentum = stock.changePercent;

    // Liquidity: Based on volume (normalized to 0-100 scale)
    // This is a simple proxy - actual liquidity would need more data
    stock.liquidity = Math.min(100, stock.volume / 1000000); // Volume in millions

    return stock;
  }

  /**
   * Filter stocks based on parameters
   */
  private filterStocks(
    stocks: ScreenedStock[],
    params: StockScreenerParams
  ): ScreenedStock[] {
    let filtered = [...stocks];

    // Apply min volume filter
    if (params.minVolume) {
      filtered = filtered.filter(stock => stock.volume >= params.minVolume!);
    }

    // Apply price range filters
    if (params.minPrice) {
      filtered = filtered.filter(stock => stock.price >= params.minPrice!);
    }

    if (params.maxPrice) {
      filtered = filtered.filter(stock => stock.price <= params.maxPrice!);
    }

    // Apply limit
    if (params.limit && params.limit > 0) {
      filtered = filtered.slice(0, params.limit);
    }

    return filtered;
  }

  /**
   * Get screened stocks based on type and filters
   */
  async getScreenedStocks(params: StockScreenerParams): Promise<StockScreenerResponse> {
    // Validate parameters
    if (!['top_gainers', 'top_losers', 'most_active'].includes(params.type)) {
      throw new InvalidParametersError(
        `Invalid screener type: ${params.type}. Must be 'top_gainers', 'top_losers', or 'most_active'`
      );
    }

    if (params.limit && params.limit < 1) {
      throw new InvalidParametersError('Limit must be greater than 0');
    }

    if (params.minPrice && params.maxPrice && params.minPrice > params.maxPrice) {
      throw new InvalidParametersError('minPrice cannot be greater than maxPrice');
    }

    try {
      // Fetch data from Alpha Vantage
      const rawData = await this.fetchTopGainersLosers();

      // Select the appropriate list based on type
      let stockList: AlphaVantageStockData[];
      switch (params.type) {
        case 'top_gainers':
          stockList = rawData.top_gainers;
          break;
        case 'top_losers':
          stockList = rawData.top_losers;
          break;
        case 'most_active':
          stockList = rawData.most_actively_traded;
          break;
      }

      // Parse and calculate metrics
      let stocks = stockList.map(stock => {
        const parsed = this.parseStockData(stock);
        return this.calculateMetrics(parsed);
      });

      // Apply filters
      stocks = this.filterStocks(stocks, params);

      return {
        stocks,
        metadata: {
          type: params.type,
          count: stocks.length,
          fetchedAt: new Date(),
          source: 'ALPHA_VANTAGE'
        }
      };
    } catch (error) {
      console.error('[StockScreener] Failed to fetch stocks:', error);

      // Return empty result with error message
      return {
        stocks: [],
        metadata: {
          type: params.type,
          count: 0,
          fetchedAt: new Date(),
          source: 'ALPHA_VANTAGE'
        },
        error: '현재 주식 데이터 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.'
      };
    }
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache = null;
    console.log('[StockScreener] Cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { isCached: boolean; age?: number } {
    if (!this.cache) {
      return { isCached: false };
    }

    const age = new Date().getTime() - this.cache.timestamp.getTime();
    return {
      isCached: this.isCacheValid(),
      age: Math.floor(age / 1000) // age in seconds
    };
  }
}

// Export singleton instance
export const stockScreenerService = new StockScreenerService();
