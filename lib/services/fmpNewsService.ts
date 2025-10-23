/**
 * FMP News Service
 *
 * Fetches news data from Financial Modeling Prep API:
 * 1. Stock News - General news articles
 * 2. Press Releases - Official company announcements
 * 3. Social Sentiment - Social media sentiment analysis (optional)
 * 4. SEC Filings - Official SEC filing documents (8-K, 10-K, 10-Q, etc.)
 * 5. Insider Trading - Insider trading transactions
 *
 * Features:
 * - 5-minute in-memory caching per data source
 * - Rate limit protection (300 calls/minute on paid plan)
 * - Parallel API calls for performance
 * - Graceful error handling with fallback to cached data
 */

import {
  FMPStockNews,
  FMPPressRelease,
  FMPSocialSentiment,
  FMPSecFiling,
  FMPInsiderTrade,
  FMPNewsData,
  FMPNewsOptions,
} from '@/lib/types/fmpNews';

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: Date;
}

/**
 * FMP News Service Class
 */
class FMPNewsService {
  private readonly FMP_BASE_URL = 'https://financialmodelingprep.com/api';
  private readonly FMP_API_KEY: string;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  // Individual caches per symbol
  private stockNewsCache = new Map<string, CacheEntry<FMPStockNews[]>>();
  private pressReleaseCache = new Map<string, CacheEntry<FMPPressRelease[]>>();
  private socialSentimentCache = new Map<string, CacheEntry<FMPSocialSentiment[]>>();
  private secFilingsCache = new Map<string, CacheEntry<FMPSecFiling[]>>();
  private insiderTradesCache = new Map<string, CacheEntry<FMPInsiderTrade[]>>();

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
  private isCacheValid<T>(cache: CacheEntry<T> | undefined): boolean {
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
        throw new Error(`FMP API returned status ${response.status}`);
      }

      const data = await response.json();

      // Check for API error messages
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }

      return data;
    } catch (error) {
      console.error('[FMPNews] API error:', error);
      throw error;
    }
  }

  // ========================================
  // 1. Stock News
  // ========================================

  /**
   * Get stock news for a specific symbol
   */
  async getStockNews(symbol: string, limit: number = 5): Promise<FMPStockNews[]> {
    const cacheKey = `${symbol}_${limit}`;
    const cached = this.stockNewsCache.get(cacheKey);

    // Check cache
    if (cached && this.isCacheValid(cached)) {
      console.log(`[FMPNews] Using cached stock news for ${symbol}`);
      return cached.data;
    }

    console.log(`[FMPNews] Fetching fresh stock news for ${symbol}`);

    try {
      const rawData = await this.fetchFMP<FMPStockNews[]>('/v3/stock_news', {
        tickers: symbol,
        page: '0',
      });

      // Limit results
      const news = Array.isArray(rawData) ? rawData.slice(0, limit) : [];

      // Update cache
      this.stockNewsCache.set(cacheKey, {
        data: news,
        timestamp: new Date(),
      });

      return news;
    } catch (error) {
      console.error(`[FMPNews] Failed to fetch stock news for ${symbol}:`, error);
      return cached?.data || [];
    }
  }

  // ========================================
  // 2. Press Releases
  // ========================================

  /**
   * Get press releases for a specific symbol
   */
  async getPressReleases(symbol: string, limit: number = 5): Promise<FMPPressRelease[]> {
    const cacheKey = `${symbol}_${limit}`;
    const cached = this.pressReleaseCache.get(cacheKey);

    // Check cache
    if (cached && this.isCacheValid(cached)) {
      console.log(`[FMPNews] Using cached press releases for ${symbol}`);
      return cached.data;
    }

    console.log(`[FMPNews] Fetching fresh press releases for ${symbol}`);

    try {
      const rawData = await this.fetchFMP<FMPPressRelease[]>(`/v3/press-releases/${symbol}`, {
        page: '0',
      });

      // Limit results
      const releases = Array.isArray(rawData) ? rawData.slice(0, limit) : [];

      // Update cache
      this.pressReleaseCache.set(cacheKey, {
        data: releases,
        timestamp: new Date(),
      });

      return releases;
    } catch (error) {
      console.error(`[FMPNews] Failed to fetch press releases for ${symbol}:`, error);
      return cached?.data || [];
    }
  }

  // ========================================
  // 3. Social Sentiment (Optional)
  // ========================================

  /**
   * Get social sentiment data (optional - may not be available for all symbols)
   */
  async getSocialSentiment(symbol: string, page: number = 0): Promise<FMPSocialSentiment[]> {
    const cacheKey = `${symbol}_${page}`;
    const cached = this.socialSentimentCache.get(cacheKey);

    // Check cache
    if (cached && this.isCacheValid(cached)) {
      console.log(`[FMPNews] Using cached social sentiment for ${symbol}`);
      return cached.data;
    }

    console.log(`[FMPNews] Fetching social sentiment for ${symbol} (may fail if not available)`);

    try {
      const rawData = await this.fetchFMP<FMPSocialSentiment[]>(
        '/v4/historical/social-sentiment',
        {
          symbol,
          page: page.toString(),
        }
      );

      const sentiment = Array.isArray(rawData) ? rawData : [];

      // Update cache
      this.socialSentimentCache.set(cacheKey, {
        data: sentiment,
        timestamp: new Date(),
      });

      return sentiment;
    } catch (error) {
      // Social sentiment may not be available for all stocks - return empty array
      console.warn(`[FMPNews] Social sentiment not available for ${symbol} (this is normal)`);
      return cached?.data || [];
    }
  }

  // ========================================
  // 4. SEC Filings
  // ========================================

  /**
   * Get SEC filings for a specific symbol
   */
  async getSecFilings(symbol: string, limit: number = 5, type?: string): Promise<FMPSecFiling[]> {
    const cacheKey = `${symbol}_${limit}_${type || 'all'}`;
    const cached = this.secFilingsCache.get(cacheKey);

    // Check cache
    if (cached && this.isCacheValid(cached)) {
      console.log(`[FMPNews] Using cached SEC filings for ${symbol}`);
      return cached.data;
    }

    console.log(`[FMPNews] Fetching fresh SEC filings for ${symbol}`);

    try {
      const params: Record<string, string> = {
        page: '0',
      };

      // Add type filter if specified
      if (type) {
        params.type = type;
      }

      const rawData = await this.fetchFMP<FMPSecFiling[]>(
        `/v3/sec_filings/${symbol}`,
        params
      );

      // Limit results
      const filings = Array.isArray(rawData) ? rawData.slice(0, limit) : [];

      // Update cache
      this.secFilingsCache.set(cacheKey, {
        data: filings,
        timestamp: new Date(),
      });

      return filings;
    } catch (error) {
      console.error(`[FMPNews] Failed to fetch SEC filings for ${symbol}:`, error);
      return cached?.data || [];
    }
  }

  // ========================================
  // 5. Insider Trading
  // ========================================

  /**
   * Get insider trading transactions for a specific symbol
   */
  async getInsiderTrades(symbol: string, limit: number = 5): Promise<FMPInsiderTrade[]> {
    const cacheKey = `${symbol}_${limit}`;
    const cached = this.insiderTradesCache.get(cacheKey);

    // Check cache
    if (cached && this.isCacheValid(cached)) {
      console.log(`[FMPNews] Using cached insider trades for ${symbol}`);
      return cached.data;
    }

    console.log(`[FMPNews] Fetching fresh insider trades for ${symbol}`);

    try {
      const rawData = await this.fetchFMP<FMPInsiderTrade[]>('/v4/insider-trading', {
        symbol,
        page: '0',
      });

      // Filter for last 30 days and limit results
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const trades = Array.isArray(rawData)
        ? rawData
            .filter(trade => new Date(trade.filingDate) >= thirtyDaysAgo)
            .slice(0, limit)
        : [];

      // Update cache
      this.insiderTradesCache.set(cacheKey, {
        data: trades,
        timestamp: new Date(),
      });

      return trades;
    } catch (error) {
      console.error(`[FMPNews] Failed to fetch insider trades for ${symbol}:`, error);
      return cached?.data || [];
    }
  }

  // ========================================
  // Main Method: Get All News Data
  // ========================================

  /**
   * Fetch all news data in parallel
   */
  async getAllNews(symbol: string, options?: FMPNewsOptions): Promise<FMPNewsData> {
    const {
      newsLimit = 5,
      pressReleaseLimit = 5,
      includeSocialSentiment = true,
      socialSentimentPage = 0,
      secFilingsLimit = 5,
      secFilingsType,
      insiderTradesLimit = 5,
    } = options || {};

    console.log(`[FMPNews] Fetching all news for ${symbol}...`);

    // Fetch all required data sources in parallel
    const [stockNews, pressReleases, secFilings, insiderTrades] = await Promise.all([
      this.getStockNews(symbol, newsLimit),
      this.getPressReleases(symbol, pressReleaseLimit),
      this.getSecFilings(symbol, secFilingsLimit, secFilingsType),
      this.getInsiderTrades(symbol, insiderTradesLimit),
    ]);

    // Fetch social sentiment separately (optional - don't fail if it errors)
    let socialSentiment: FMPSocialSentiment[] = [];
    if (includeSocialSentiment) {
      socialSentiment = await this.getSocialSentiment(symbol, socialSentimentPage);
    }

    console.log(
      `[FMPNews] Fetched ${stockNews.length} news, ${pressReleases.length} releases, ` +
      `${secFilings.length} SEC filings, ${insiderTrades.length} insider trades, ` +
      `${socialSentiment.length} sentiment data`
    );

    return {
      stockNews,
      pressReleases,
      socialSentiment,
      secFilings,
      insiderTrades,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.stockNewsCache.clear();
    this.pressReleaseCache.clear();
    this.socialSentimentCache.clear();
    this.secFilingsCache.clear();
    this.insiderTradesCache.clear();
    console.log('[FMPNews] All caches cleared');
  }
}

// Export singleton instance
export const fmpNewsService = new FMPNewsService();
