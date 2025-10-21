/**
 * Market Events Service
 *
 * Integrates multiple data sources for market event tracking:
 * 1. FMP API - Senate trading, M&A, analyst ratings, earnings, stock splits
 * 2. Alpha Vantage - Market movers (top gainers/losers/most active)
 *
 * Features:
 * - Unified interface for all market events
 * - In-memory caching (5 minutes)
 * - Rate limit protection
 * - Error handling with fallback
 * - Date filtering for calendar-based APIs
 */

import {
  SenateTrade,
  MergerAcquisition,
  AnalystRating,
  UpcomingEarnings,
  StockSplit,
  MarketMover,
  MarketMovers,
  MarketEventsResponse,
  MarketEventsOptions,
  FMPSenateTradingResponse,
  FMPMergersAcquisitionsResponse,
  FMPRatingResponse,
  FMPEarningsCalendarResponse,
  FMPStockSplitResponse,
  MarketEventsAPIError,
  MarketEventsRateLimitError,
} from '@/lib/types/marketEvents';

import { stockScreenerService } from './stockScreenerService';

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: Date;
}

/**
 * Market Events Service Class
 */
class MarketEventsService {
  private readonly FMP_BASE_URL = 'https://financialmodelingprep.com/api';
  private readonly FMP_API_KEY: string;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  // Individual caches for each category
  private senateTradingCache: CacheEntry<SenateTrade[]> | null = null;
  private mergersCache: CacheEntry<MergerAcquisition[]> | null = null;
  private ratingsCache: CacheEntry<AnalystRating[]> | null = null;
  private earningsCache: CacheEntry<UpcomingEarnings[]> | null = null;
  private splitsCache: CacheEntry<StockSplit[]> | null = null;
  private marketMoversCache: CacheEntry<MarketMovers> | null = null;

  constructor() {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      throw new Error('FMP_API_KEY environment variable is not set');
    }
    this.FMP_API_KEY = apiKey;
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Check if cached data is still valid
   */
  private isCacheValid<T>(cache: CacheEntry<T> | null): boolean {
    if (!cache) return false;
    const now = new Date().getTime();
    const cacheTime = cache.timestamp.getTime();
    return now - cacheTime < this.CACHE_DURATION_MS;
  }

  /**
   * Generic FMP API fetch method
   */
  private async fetchFMP<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const queryParams = new URLSearchParams({
      ...params,
      apikey: this.FMP_API_KEY,
    });

    const url = `${this.FMP_BASE_URL}${endpoint}?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new MarketEventsAPIError(`FMP API returned status ${response.status}`);
      }

      const data = await response.json();

      // Check for API error messages
      if (data['Error Message']) {
        throw new MarketEventsAPIError(data['Error Message']);
      }

      // Check for rate limit
      if (data['Note'] && data['Note'].includes('API call frequency')) {
        throw new MarketEventsRateLimitError(data['Note']);
      }

      return data;
    } catch (error) {
      if (error instanceof MarketEventsAPIError || error instanceof MarketEventsRateLimitError) {
        throw error;
      }

      console.error('[MarketEvents] FMP API error:', error);
      throw new MarketEventsAPIError(
        `Failed to fetch from FMP: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get date range (today to 7 days from now)
   */
  private getDateRange(): { from: string; to: string } {
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);

    return {
      from: today.toISOString().split('T')[0], // YYYY-MM-DD
      to: sevenDaysLater.toISOString().split('T')[0],
    };
  }

  /**
   * Interpret rating change to signal
   */
  private interpretRatingChange(previousGrade: string, newGrade: string): 'BUY' | 'SELL' | 'HOLD' {
    // Handle null or undefined grades
    if (!previousGrade || !newGrade) {
      return 'HOLD';
    }

    const bullishGrades = ['Strong Buy', 'Buy', 'Overweight', 'Outperform'];
    const bearishGrades = ['Strong Sell', 'Sell', 'Underweight', 'Underperform'];
    const neutralGrades = ['Hold', 'Neutral', 'Equal-Weight', 'Equal Weight', 'Market Perform'];

    const wasBullish = bullishGrades.some((grade) =>
      previousGrade.toLowerCase().includes(grade.toLowerCase())
    );
    const isBullish = bullishGrades.some((grade) =>
      newGrade.toLowerCase().includes(grade.toLowerCase())
    );
    const wasBearish = bearishGrades.some((grade) =>
      previousGrade.toLowerCase().includes(grade.toLowerCase())
    );
    const isBearish = bearishGrades.some((grade) =>
      newGrade.toLowerCase().includes(grade.toLowerCase())
    );
    const wasNeutral = neutralGrades.some((grade) =>
      previousGrade.toLowerCase().includes(grade.toLowerCase())
    );
    const isNeutral = neutralGrades.some((grade) =>
      newGrade.toLowerCase().includes(grade.toLowerCase())
    );

    // Upgrade scenarios
    if (!wasBullish && isBullish) return 'BUY';
    if (wasBearish && !isBearish) return 'BUY';
    if (wasNeutral && isBullish) return 'BUY';

    // Downgrade scenarios
    if (wasBullish && !isBullish) return 'SELL';
    if (!wasBearish && isBearish) return 'SELL';
    if (isNeutral && wasBullish) return 'SELL';

    return 'HOLD';
  }

  // ========================================
  // 1. Senate Trading
  // ========================================

  /**
   * Fetch Senate trading data
   */
  async getSenateTrading(options?: { limit?: number }): Promise<SenateTrade[]> {
    // Check cache
    if (this.senateTradingCache && this.isCacheValid(this.senateTradingCache)) {
      console.log('[MarketEvents] Using cached senate trading data');
      return options?.limit
        ? this.senateTradingCache.data.slice(0, options.limit)
        : this.senateTradingCache.data;
    }

    console.log('[MarketEvents] Fetching fresh senate trading data from FMP');

    try {
      const rawData = await this.fetchFMP<FMPSenateTradingResponse[]>('/v4/senate-trading', {
        page: '0',
      });

      // Check if rawData is an array
      if (!Array.isArray(rawData)) {
        console.error('[MarketEvents] Senate Trading API returned non-array response:', rawData);
        throw new MarketEventsAPIError(`Senate Trading API returned invalid response: ${JSON.stringify(rawData)}`);
      }

      const trades: SenateTrade[] = rawData.map((item) => ({
        firstName: item.firstName,
        lastName: item.lastName,
        symbol: item.symbol,
        transactionType: item.type.toLowerCase() as 'purchase' | 'sale' | 'exchange',
        amount: item.amount,
        transactionDate: item.transactionDate,
        disclosureDate: item.dateRecieved,
        assetType: item.assetType,
        comment: item.comment,
        party: item.party,
      }));

      // Update cache
      this.senateTradingCache = {
        data: trades,
        timestamp: new Date(),
      };

      return options?.limit ? trades.slice(0, options.limit) : trades;
    } catch (error) {
      console.error('[MarketEvents] Failed to fetch senate trading:', error);
      // Return cached data if available, otherwise empty array
      return this.senateTradingCache?.data || [];
    }
  }

  // ========================================
  // 2. Mergers & Acquisitions
  // ========================================

  /**
   * Fetch M&A feed data
   */
  async getMergersAcquisitions(options?: { limit?: number }): Promise<MergerAcquisition[]> {
    // Check cache
    if (this.mergersCache && this.isCacheValid(this.mergersCache)) {
      console.log('[MarketEvents] Using cached M&A data');
      return options?.limit ? this.mergersCache.data.slice(0, options.limit) : this.mergersCache.data;
    }

    console.log('[MarketEvents] Fetching fresh M&A data from FMP');

    try {
      const rawData = await this.fetchFMP<FMPMergersAcquisitionsResponse[]>(
        '/v4/mergers-acquisitions-rss-feed',
        { page: '0' }
      );

      // Check if rawData is an array
      if (!Array.isArray(rawData)) {
        console.error('[MarketEvents] M&A API returned non-array response:', rawData);
        throw new MarketEventsAPIError(`M&A API returned invalid response: ${JSON.stringify(rawData)}`);
      }

      const deals: MergerAcquisition[] = rawData.map((item) => ({
        title: `${item.companyName} → ${item.targetedCompanyName}`,
        symbol: item.symbol,
        publishedDate: item.transactionDate,
        url: item.url,
      }));

      // Update cache
      this.mergersCache = {
        data: deals,
        timestamp: new Date(),
      };

      return options?.limit ? deals.slice(0, options.limit) : deals;
    } catch (error) {
      console.error('[MarketEvents] Failed to fetch M&A data:', error);
      return this.mergersCache?.data || [];
    }
  }

  // ========================================
  // 3. Analyst Ratings
  // ========================================

  /**
   * Fetch analyst rating changes (upgrades/downgrades)
   */
  async getAnalystRatings(options?: { limit?: number }): Promise<AnalystRating[]> {
    // Check cache
    if (this.ratingsCache && this.isCacheValid(this.ratingsCache)) {
      console.log('[MarketEvents] Using cached analyst ratings data');
      return options?.limit ? this.ratingsCache.data.slice(0, options.limit) : this.ratingsCache.data;
    }

    console.log('[MarketEvents] Fetching fresh analyst ratings from FMP');

    try {
      const rawData = await this.fetchFMP<FMPRatingResponse[]>('/v4/upgrades-downgrades-rss-feed', {
        page: '0',
      });

      // Check if rawData is an array
      if (!Array.isArray(rawData)) {
        console.error('[MarketEvents] Analyst Ratings API returned non-array response:', rawData);
        throw new MarketEventsAPIError(`Analyst Ratings API returned invalid response: ${JSON.stringify(rawData)}`);
      }

      const ratings: AnalystRating[] = rawData.map((item) => ({
        symbol: item.symbol,
        gradingCompany: item.gradingCompany,
        previousGrade: item.previousGrade,
        newGrade: item.newGrade,
        publishedDate: item.publishedDate,
        newsURL: item.newsURL,
        newsTitle: item.newsTitle,
        signal: this.interpretRatingChange(item.previousGrade, item.newGrade),
      }));

      // Update cache
      this.ratingsCache = {
        data: ratings,
        timestamp: new Date(),
      };

      return options?.limit ? ratings.slice(0, options.limit) : ratings;
    } catch (error) {
      console.error('[MarketEvents] Failed to fetch analyst ratings:', error);
      return this.ratingsCache?.data || [];
    }
  }

  // ========================================
  // 4. Earnings Calendar
  // ========================================

  /**
   * Fetch upcoming earnings (next 7 days)
   */
  async getUpcomingEarnings(options?: MarketEventsOptions): Promise<UpcomingEarnings[]> {
    // Check cache
    if (this.earningsCache && this.isCacheValid(this.earningsCache)) {
      console.log('[MarketEvents] Using cached earnings data');
      return options?.limit
        ? this.earningsCache.data.slice(0, options.limit)
        : this.earningsCache.data;
    }

    console.log('[MarketEvents] Fetching fresh earnings calendar from FMP');

    try {
      const { from, to } = options?.from && options?.to
        ? { from: options.from, to: options.to }
        : this.getDateRange();

      const rawData = await this.fetchFMP<FMPEarningsCalendarResponse[]>('/v3/earning_calendar', {
        from,
        to,
      });

      const earnings: UpcomingEarnings[] = rawData.map((item) => ({
        symbol: item.symbol,
        date: item.date,
        epsEstimated: item.epsEstimated,
        eps: item.eps,
        revenueEstimated: item.revenueEstimated,
        revenue: item.revenue,
        time: item.time,
        fiscalDateEnding: item.fiscalDateEnding,
      }));

      // Update cache
      this.earningsCache = {
        data: earnings,
        timestamp: new Date(),
      };

      return options?.limit ? earnings.slice(0, options.limit) : earnings;
    } catch (error) {
      console.error('[MarketEvents] Failed to fetch earnings calendar:', error);
      return this.earningsCache?.data || [];
    }
  }

  // ========================================
  // 5. Stock Splits
  // ========================================

  /**
   * Fetch upcoming stock splits (next 7 days)
   */
  async getStockSplits(options?: MarketEventsOptions): Promise<StockSplit[]> {
    // Check cache
    if (this.splitsCache && this.isCacheValid(this.splitsCache)) {
      console.log('[MarketEvents] Using cached stock splits data');
      return options?.limit ? this.splitsCache.data.slice(0, options.limit) : this.splitsCache.data;
    }

    console.log('[MarketEvents] Fetching fresh stock splits from FMP');

    try {
      const { from, to } = options?.from && options?.to
        ? { from: options.from, to: options.to }
        : this.getDateRange();

      const rawData = await this.fetchFMP<FMPStockSplitResponse[]>('/v3/stock_split_calendar', {
        from,
        to,
      });

      const splits: StockSplit[] = rawData.map((item) => ({
        symbol: item.symbol,
        date: item.date,
        numerator: item.numerator,
        denominator: item.denominator,
        label: item.label,
      }));

      // Update cache
      this.splitsCache = {
        data: splits,
        timestamp: new Date(),
      };

      return options?.limit ? splits.slice(0, options.limit) : splits;
    } catch (error) {
      console.error('[MarketEvents] Failed to fetch stock splits:', error);
      return this.splitsCache?.data || [];
    }
  }

  // ========================================
  // 6. Market Movers (Alpha Vantage)
  // ========================================

  /**
   * Fetch market movers (top gainers/losers/most active)
   * Uses existing stockScreenerService for Alpha Vantage integration
   */
  async getMarketMovers(options?: { limit?: number }): Promise<MarketMovers> {
    // Check cache
    if (this.marketMoversCache && this.isCacheValid(this.marketMoversCache)) {
      console.log('[MarketEvents] Using cached market movers data');
      const cached = this.marketMoversCache.data;

      if (options?.limit) {
        return {
          topGainers: cached.topGainers.slice(0, options.limit),
          topLosers: cached.topLosers.slice(0, options.limit),
          mostActive: cached.mostActive.slice(0, options.limit),
        };
      }

      return cached;
    }

    console.log('[MarketEvents] Fetching fresh market movers from Alpha Vantage');

    try {
      // Fetch from stockScreenerService
      const [gainersData, losersData, activeData] = await Promise.all([
        stockScreenerService.getScreenedStocks({ type: 'top_gainers', limit: options?.limit || 20 }),
        stockScreenerService.getScreenedStocks({ type: 'top_losers', limit: options?.limit || 20 }),
        stockScreenerService.getScreenedStocks({ type: 'most_active', limit: options?.limit || 20 }),
      ]);

      const marketMovers: MarketMovers = {
        topGainers: gainersData.stocks.map((stock) => ({
          symbol: stock.symbol,
          price: stock.price,
          changeAmount: stock.changeAmount,
          changePercent: stock.changePercent,
          volume: stock.volume,
        })),
        topLosers: losersData.stocks.map((stock) => ({
          symbol: stock.symbol,
          price: stock.price,
          changeAmount: stock.changeAmount,
          changePercent: stock.changePercent,
          volume: stock.volume,
        })),
        mostActive: activeData.stocks.map((stock) => ({
          symbol: stock.symbol,
          price: stock.price,
          changeAmount: stock.changeAmount,
          changePercent: stock.changePercent,
          volume: stock.volume,
        })),
      };

      // Update cache
      this.marketMoversCache = {
        data: marketMovers,
        timestamp: new Date(),
      };

      return marketMovers;
    } catch (error) {
      console.error('[MarketEvents] Failed to fetch market movers:', error);

      // Return cached data with error message, or empty arrays with error
      const errorMessage = '현재 시장 동향 데이터 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.';

      if (this.marketMoversCache?.data) {
        return {
          ...this.marketMoversCache.data,
          error: errorMessage,
        };
      }

      return {
        topGainers: [],
        topLosers: [],
        mostActive: [],
        error: errorMessage,
      };
    }
  }

  // ========================================
  // Main Method: Get All Market Events
  // ========================================

  /**
   * Fetch all market events data in parallel
   */
  async getAllMarketEvents(options?: MarketEventsOptions): Promise<MarketEventsResponse> {
    console.log('[MarketEvents] Fetching all market events...');

    const limit = options?.limit || 10;

    // Fetch all data in parallel
    const [
      senateTrading,
      mergersAcquisitions,
      analystRatings,
      upcomingEarnings,
      stockSplits,
      marketMovers,
    ] = await Promise.all([
      this.getSenateTrading({ limit }),
      this.getMergersAcquisitions({ limit }),
      this.getAnalystRatings({ limit }),
      this.getUpcomingEarnings({ ...options, limit }),
      this.getStockSplits({ ...options, limit }),
      this.getMarketMovers({ limit }),
    ]);

    console.log('[MarketEvents] All market events fetched successfully');

    return {
      senateTrading,
      mergersAcquisitions,
      analystRatings,
      upcomingEarnings,
      stockSplits,
      marketMovers,
      metadata: {
        fetchedAt: new Date().toISOString(),
        categories: 6,
        cacheStatus: {
          senateTrading: this.isCacheValid(this.senateTradingCache),
          mergersAcquisitions: this.isCacheValid(this.mergersCache),
          ratingChanges: this.isCacheValid(this.ratingsCache),
          earnings: this.isCacheValid(this.earningsCache),
          stockSplits: this.isCacheValid(this.splitsCache),
          marketMovers: this.isCacheValid(this.marketMoversCache),
        },
      },
    };
  }

  /**
   * Clear all caches (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.senateTradingCache = null;
    this.mergersCache = null;
    this.ratingsCache = null;
    this.earningsCache = null;
    this.splitsCache = null;
    this.marketMoversCache = null;
    console.log('[MarketEvents] All caches cleared');
  }

  /**
   * Get cache status for all categories
   */
  getCacheStatus(): Record<string, { isCached: boolean; age?: number }> {
    const getStatus = <T>(cache: CacheEntry<T> | null) => {
      if (!cache) return { isCached: false };
      const age = new Date().getTime() - cache.timestamp.getTime();
      return {
        isCached: this.isCacheValid(cache),
        age: Math.floor(age / 1000), // age in seconds
      };
    };

    return {
      senateTrading: getStatus(this.senateTradingCache),
      mergersAcquisitions: getStatus(this.mergersCache),
      analystRatings: getStatus(this.ratingsCache),
      upcomingEarnings: getStatus(this.earningsCache),
      stockSplits: getStatus(this.splitsCache),
      marketMovers: getStatus(this.marketMoversCache),
    };
  }
}

// Export singleton instance
export const marketEventsService = new MarketEventsService();
