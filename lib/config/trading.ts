/**
 * Trading Configuration
 *
 * Centralized configuration for trading parameters, risk management,
 * and position sizing. Extracted from hardcoded values in services.
 */

/**
 * Risk Management Thresholds
 */
export const RISK_MANAGEMENT = {
  /**
   * Position concentration limits
   * - DAMPENING_THRESHOLD: Start reducing positive adjustments (50%)
   * - BLOCKING_THRESHOLD: Block additional buys (80%)
   */
  POSITION_CONCENTRATION: {
    DAMPENING_THRESHOLD: 0.5,    // 50% of fund allocation
    BLOCKING_THRESHOLD: 0.8,      // 80% of fund allocation
    DAMPENING_MIN_FACTOR: 0.3,    // Minimum dampening multiplier
  },

  /**
   * Default stop loss and take profit percentages
   */
  DEFAULT_STOP_LOSS: 5.0,       // 5%
  DEFAULT_TAKE_PROFIT: 10.0,    // 10%

  /**
   * Kelly Criterion parameters for position sizing
   */
  KELLY: {
    MAX_FRACTION: 0.25,         // Maximum 25% of portfolio per position
    FRACTIONAL_KELLY: 0.5,      // Use half-Kelly for conservative sizing
  },
} as const;

/**
 * News Analysis Configuration
 */
export const NEWS_ANALYSIS = {
  /**
   * News fetch limits
   */
  LIMITS: {
    STOCK_NEWS: 5,
    PRESS_RELEASES: 5,
    SOCIAL_SENTIMENT: 1,
    SEC_FILINGS: 5,
    INSIDER_TRADES: 5,
  },

  /**
   * Sentiment score thresholds
   */
  SENTIMENT: {
    VERY_POSITIVE: 0.3,
    POSITIVE: 0.1,
    NEUTRAL: 0.0,
    NEGATIVE: -0.1,
    VERY_NEGATIVE: -0.3,
  },

  /**
   * News weight in final score calculation
   */
  WEIGHT: 0.7,  // 70% weight for news sentiment
} as const;

/**
 * Technical Analysis Configuration
 */
export const TECHNICAL_ANALYSIS = {
  /**
   * RSI thresholds
   */
  RSI: {
    OVERSOLD: 30,
    OVERBOUGHT: 70,
    PERIOD: 14,
  },

  /**
   * MACD parameters
   */
  MACD: {
    FAST_PERIOD: 12,
    SLOW_PERIOD: 26,
    SIGNAL_PERIOD: 9,
  },

  /**
   * Bollinger Bands parameters
   */
  BOLLINGER: {
    PERIOD: 20,
    STD_DEV: 2,
  },

  /**
   * Technical signal weight in final score
   */
  WEIGHT: 0.3,  // 30% weight for technical signals
} as const;

/**
 * AI Trading Decision Configuration
 */
export const AI_TRADING = {
  /**
   * GPT adjustment range
   */
  GPT_ADJUSTMENT: {
    MIN: -0.5,
    MAX: 0.5,
    STRONG_SIGNAL: 0.3,  // Threshold for "strong" signal
  },

  /**
   * Decision thresholds
   */
  DECISION_THRESHOLDS: {
    BUY: 0.3,           // Buy if final score >= 0.3
    SELL: -0.3,         // Sell if final score <= -0.3
    HOLD_MIN: -0.3,     // Hold if -0.3 < score < 0.3
    HOLD_MAX: 0.3,
  },

  /**
   * Objective score calculation weights
   */
  OBJECTIVE_WEIGHTS: {
    NEWS: 0.7,          // 70% weight for news sentiment
    TECHNICAL: 0.3,     // 30% weight for technical signals
  },
} as const;

/**
 * API Configuration
 */
export const API = {
  /**
   * Rate limiting
   */
  RATE_LIMITS: {
    ALPHA_VANTAGE: 5,    // 5 calls per minute (free tier)
    FMP: 250,            // 250 calls per day (free tier)
    OPENAI: 60,          // 60 calls per minute
  },

  /**
   * Timeout configuration (milliseconds)
   */
  TIMEOUTS: {
    MARKET_DATA: 10000,  // 10 seconds
    NEWS_API: 15000,     // 15 seconds
    AI_ANALYSIS: 30000,  // 30 seconds
    TRADE_EXECUTION: 5000, // 5 seconds
  },

  /**
   * Retry configuration
   */
  RETRIES: {
    MAX_ATTEMPTS: 3,
    BACKOFF_MS: 1000,    // Initial backoff: 1 second
  },
} as const;

/**
 * Portfolio Configuration
 */
export const PORTFOLIO = {
  /**
   * Default initial cash
   */
  INITIAL_CASH: 10000.0,  // $10,000

  /**
   * Default fund allocation per bot
   */
  DEFAULT_FUND_ALLOCATION: 1000.0,  // $1,000

  /**
   * Minimum position value
   */
  MIN_POSITION_VALUE: 100.0,  // $100
} as const;

/**
 * Scheduler Configuration
 */
export const SCHEDULER = {
  /**
   * Time horizons and their typical execution frequencies
   */
  TIME_HORIZONS: {
    SHORT_TERM: {
      name: 'Short-term (Day Trading)',
      typical_frequency: 'Every 4 hours',
    },
    SWING: {
      name: 'Swing Trading',
      typical_frequency: '9 AM and 3 PM',
    },
    LONG_TERM: {
      name: 'Long-term (Position Trading)',
      typical_frequency: 'Once daily at 10 AM',
    },
  },
} as const;

/**
 * Type exports for TypeScript
 */
export type RiskManagementConfig = typeof RISK_MANAGEMENT;
export type NewsAnalysisConfig = typeof NEWS_ANALYSIS;
export type TechnicalAnalysisConfig = typeof TECHNICAL_ANALYSIS;
export type AITradingConfig = typeof AI_TRADING;
export type APIConfig = typeof API;
export type PortfolioConfig = typeof PORTFOLIO;
export type SchedulerConfig = typeof SCHEDULER;
