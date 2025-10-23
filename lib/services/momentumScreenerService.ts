/**
 * Momentum Screener Service
 *
 * 모멘텀 종목 스크리닝 서비스
 * - 거래량 > 평균의 200% (Most Active 활용)
 * - 가격변동률 > +3% (Top Gainers 활용)
 * - 시가총액 > $1B (FMP Stock Screener)
 * - RSI < 80 (FMP Technical Indicators)
 *
 * Hybrid approach: Alpha Vantage + FMP
 */

import { stockScreenerService } from './stockScreenerService';

/**
 * Momentum Stock Result
 */
export interface MomentumStock {
  symbol: string;
  changePercent: number;
  volume: number;
  price: number;
  marketCap?: number;
  rsi?: number;
}

class MomentumScreenerService {
  private readonly FMP_BASE_URL = 'https://financialmodelingprep.com/api';
  private readonly FMP_API_KEY: string;

  constructor() {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      throw new Error('FMP_API_KEY environment variable is not set');
    }
    this.FMP_API_KEY = apiKey;
  }

  /**
   * Get momentum stocks matching all criteria
   * Returns array of symbols that pass all filters
   */
  async getMomentumStocks(): Promise<string[]> {
    try {
      console.log('[MomentumScreener] Starting momentum screening...');

      // Step 1: Get Top Gainers (changePercent > 3%)
      const gainersResponse = await stockScreenerService.getScreenedStocks({
        type: 'top_gainers',
        limit: 50, // Get top 50 to have enough candidates
      });

      const gainers = gainersResponse.stocks.filter(
        (stock) => stock.changePercent > 3
      );

      console.log(
        `[MomentumScreener] Found ${gainers.length} gainers with >3% change`
      );

      if (gainers.length === 0) {
        console.log('[MomentumScreener] No gainers found, returning empty array');
        return [];
      }

      // Step 2: Get Most Active (high volume)
      const activeResponse = await stockScreenerService.getScreenedStocks({
        type: 'most_active',
        limit: 50,
      });

      const activeSymbols = new Set(activeResponse.stocks.map((s) => s.symbol));

      console.log(
        `[MomentumScreener] Found ${activeSymbols.size} most active stocks`
      );

      // Step 3: Find intersection (gainers that are also most active)
      const momentumCandidates = gainers.filter((stock) =>
        activeSymbols.has(stock.symbol)
      );

      console.log(
        `[MomentumScreener] Found ${momentumCandidates.length} momentum candidates (gainers + active)`
      );

      if (momentumCandidates.length === 0) {
        console.log('[MomentumScreener] No momentum candidates found');
        return [];
      }

      // Step 4 & 5: Check market cap and RSI (in parallel for better performance)
      const qualifiedStocks = await this.filterByMarketCapAndRSI(
        momentumCandidates.map((s) => s.symbol)
      );

      console.log(
        `[MomentumScreener] Final momentum stocks: ${qualifiedStocks.length}`
      );
      console.log(`[MomentumScreener] Symbols: ${qualifiedStocks.join(', ')}`);

      return qualifiedStocks;
    } catch (error) {
      console.error('[MomentumScreener] Error screening momentum stocks:', error);
      return []; // Return empty array on error to not break the flow
    }
  }

  /**
   * Filter stocks by market cap (> $1B) and RSI (< 80)
   * Uses FMP API for both checks
   */
  private async filterByMarketCapAndRSI(
    symbols: string[]
  ): Promise<string[]> {
    const qualified: string[] = [];

    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          try {
            // Check market cap and RSI in parallel
            const [marketCap, rsi] = await Promise.all([
              this.getMarketCap(symbol),
              this.getRSI(symbol),
            ]);

            // Log individual checks
            console.log(
              `[MomentumScreener] ${symbol}: MarketCap=${marketCap ? '$' + (marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}, RSI=${rsi ?? 'N/A'}`
            );

            // Both conditions must be met
            if (marketCap && marketCap > 1_000_000_000 && rsi && rsi < 80) {
              return symbol;
            }

            return null;
          } catch (error) {
            console.error(
              `[MomentumScreener] Error checking ${symbol}:`,
              error
            );
            return null;
          }
        })
      );

      // Add qualified symbols from this batch
      batchResults.forEach((symbol) => {
        if (symbol) qualified.push(symbol);
      });

      // Small delay between batches to respect rate limits
      if (i + batchSize < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    return qualified;
  }

  /**
   * Get market cap for a symbol using FMP Company Profile API
   */
  private async getMarketCap(symbol: string): Promise<number | null> {
    try {
      const url = `${this.FMP_BASE_URL}/v3/profile/${symbol}?apikey=${this.FMP_API_KEY}`;

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0 && data[0].mktCap) {
        return data[0].mktCap;
      }

      return null;
    } catch (error) {
      console.error(`[MomentumScreener] Error fetching market cap for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get RSI for a symbol using FMP Technical Indicators API
   */
  private async getRSI(symbol: string): Promise<number | null> {
    try {
      // Get daily RSI with 14-day period
      const url = `${this.FMP_BASE_URL}/v3/technical_indicator/daily/${symbol}?period=14&type=rsi&apikey=${this.FMP_API_KEY}`;

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      // Get the most recent RSI value
      if (Array.isArray(data) && data.length > 0 && data[0].rsi !== undefined) {
        return data[0].rsi;
      }

      return null;
    } catch (error) {
      console.error(`[MomentumScreener] Error fetching RSI for ${symbol}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const momentumScreenerService = new MomentumScreenerService();
