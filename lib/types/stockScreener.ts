/**
 * Stock Screener Type Definitions
 *
 * Defines types for stock screening, Alpha Vantage API responses,
 * and strategy matching functionality.
 */

/**
 * Stock data from Alpha Vantage TOP_GAINERS_LOSERS endpoint
 */
export interface AlphaVantageStockData {
  ticker: string;
  price: string;
  change_amount: string;
  change_percentage: string;
  volume: string;
}

/**
 * Response from Alpha Vantage TOP_GAINERS_LOSERS API
 */
export interface AlphaVantageScreenerResponse {
  metadata: string;
  last_updated: string;
  top_gainers: AlphaVantageStockData[];
  top_losers: AlphaVantageStockData[];
  most_actively_traded: AlphaVantageStockData[];
}

/**
 * Screener filter types
 */
export type ScreenerType = 'top_gainers' | 'top_losers' | 'most_active';

/**
 * Standardized stock data with calculated metrics
 */
export interface ScreenedStock {
  symbol: string;
  name?: string;
  price: number;
  changeAmount: number;
  changePercent: number;
  volume: number;

  // Calculated metrics (to be defined by quant-analyst)
  volatility?: number;
  momentum?: number;
  liquidity?: number;

  // Metadata
  source: 'ALPHA_VANTAGE';
  fetchedAt: Date;
}

/**
 * Stock screener query parameters
 */
export interface StockScreenerParams {
  type: ScreenerType;
  limit?: number;
  minVolume?: number;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Stock screener response with metadata
 */
export interface StockScreenerResponse {
  stocks: ScreenedStock[];
  metadata: {
    type: ScreenerType;
    count: number;
    fetchedAt: Date;
    source: 'ALPHA_VANTAGE';
  };
  error?: string; // Error message if API fails
}

/**
 * Strategy matching result
 */
export interface StrategyMatch {
  symbol: string;
  strategyId: string;
  strategyName: string;
  confidence: number; // 0-100
  reasoning: string;
  matchedFactors: {
    timeHorizon?: boolean;
    riskAppetite?: boolean;
    volatility?: boolean;
    momentum?: boolean;
    liquidity?: boolean;
  };
}

/**
 * Bulk bot creation request
 */
export interface BulkBotCreateRequest {
  bots: {
    symbol: string;
    strategyId: string;
    fundAllocation: number;
    name: string;
    orderType?: 'MARKET' | 'LIMIT';
  }[];
}

/**
 * Single bot creation result
 */
export interface BotCreationResult {
  success: boolean;
  bot?: {
    id: string;
    name: string;
    symbol: string;
    strategyId: string;
    fundAllocation: number;
  };
  error?: {
    code: string;
    message: string;
    symbol?: string;
  };
}

/**
 * Bulk bot creation response
 */
export interface BulkBotCreateResponse {
  created: BotCreationResult[];
  failed: BotCreationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Custom error types for stock screening
 */
export class StockScreenerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'StockScreenerError';
  }
}

export class AlphaVantageAPIError extends StockScreenerError {
  constructor(message: string) {
    super(message, 'ALPHA_VANTAGE_API_ERROR', 503);
    this.name = 'AlphaVantageAPIError';
  }
}

export class RateLimitError extends StockScreenerError {
  constructor(message: string = 'API rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
  }
}

export class InvalidParametersError extends StockScreenerError {
  constructor(message: string) {
    super(message, 'INVALID_PARAMETERS', 400);
    this.name = 'InvalidParametersError';
  }
}
