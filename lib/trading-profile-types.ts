/**
 * Trading Profile 2D System - Type Definitions
 *
 * Two independent dimensions:
 * 1. Time Horizon (투자 기간)
 * 2. Risk Appetite (리스크 성향)
 */

// ============================================================================
// Core Enums
// ============================================================================

export enum TimeHorizon {
  DAY = 'day',           // 1-3 days (Day Trading)
  SWING = 'swing',       // 3-30 days (Swing Trading)
  POSITION = 'position'  // 30+ days (Position Trading)
}

export enum RiskAppetite {
  DEFENSIVE = 'defensive',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive'
}

// ============================================================================
// Time Horizon Configuration
// ============================================================================

export interface TimeHorizonConfig {
  // Execution Parameters
  executionInterval: string;      // How often to check positions
  rebalanceInterval: string;      // How often to rebalance portfolio

  // Technical Analysis
  technicalIntervals: string[];   // Chart intervals to analyze
  primaryInterval: string;        // Main interval for decision making

  // Indicators Configuration
  indicators: {
    rsi?: {
      period: number;
      overbought: number;
      oversold: number;
    };
    macd?: {
      fast: number;
      slow: number;
      signal: number;
    };
    ema?: {
      short: number;
      medium: number;
      long: number;
    };
    sma?: {
      short: number;
      long: number;
    };
    bb?: {
      period: number;
      stdDev: number;
    };
    adx?: {
      period: number;
      trendThreshold: number;
    };
    volume?: {
      enabled: boolean;
      threshold: number;
    };
    fundamentals?: {
      enabled: boolean;
    };
  };

  // Strategy Preferences
  preferredStrategies: string[];

  // Holding Period
  holdingPeriod: {
    min: string;
    target: string;
    max: string;
  };
}

// ============================================================================
// Risk Appetite Configuration
// ============================================================================

export interface RiskAppetiteConfig {
  // Position Sizing
  maxPositionSize: number;        // % of portfolio per position
  maxTotalExposure: number;       // % of portfolio total exposure
  kellyMultiplier: number;        // Kelly criterion multiplier

  // Risk Management
  stopLoss: number;               // % stop loss
  takeProfit: number;             // % take profit
  trailingStop: {
    enabled: boolean;
    activation: number | null;    // % profit to activate
    distance: number | null;      // % distance to trail
  };

  // Trade Filtering
  minWinRate: number;             // Minimum historical win rate
  minSharpeRatio: number;         // Minimum Sharpe ratio
  maxDrawdown: number;            // Maximum acceptable drawdown

  // Leverage
  maxLeverage: number;            // Maximum leverage allowed

  // Asset Selection
  preferredAssets: string[];      // Asset types to focus on
}

// ============================================================================
// Combined Trading Profile
// ============================================================================

export interface TradingProfile {
  // Identity
  id: string;
  name: string;
  description: string;

  // Dimensions
  timeHorizon: TimeHorizon;
  riskAppetite: RiskAppetite;

  // From Time Horizon
  executionInterval: string;
  rebalanceInterval: string;
  technicalIntervals: string[];
  primaryInterval: string;
  indicators: TimeHorizonConfig['indicators'];
  holdingPeriod: TimeHorizonConfig['holdingPeriod'];

  // From Risk Appetite
  maxPositionSize: number;
  maxTotalExposure: number;
  kellyMultiplier: number;
  stopLoss: number;
  takeProfit: number;
  trailingStop: RiskAppetiteConfig['trailingStop'];
  maxLeverage: number;
  minWinRate: number;
  minSharpeRatio: number;
  maxDrawdown: number;

  // Combined
  strategies: string[];
  preferredAssets: string[];

  // Adjusted Parameters (based on combination)
  adjustedParams?: {
    [key: string]: any;
  };

  // Special Rules
  specialRules?: {
    maxTradesPerDay?: number;
    avoidVolatileHours?: boolean;
    requireHighLiquidity?: boolean;
    requireTrendConfirmation?: boolean;
    pyramiding?: boolean;
    partialProfits?: boolean;
    leverageOnDips?: boolean;
    optionsHedging?: boolean;
    sectorRotation?: boolean;
  };
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  warning?: string;
  note?: string;
  recommendations?: string[];
}

export interface ProfileValidationInput {
  timeHorizon: TimeHorizon;
  riskAppetite: RiskAppetite;
  userExperience: number;      // Years of trading experience
  capitalSize: number;          // Total trading capital
  monthlyIncome?: number;       // Monthly income for risk assessment
  riskTolerance?: number;       // 1-10 scale
}

// ============================================================================
// Market State
// ============================================================================

export interface MarketState {
  volatility: number;           // VIX or similar (0-100)
  trend: 'strong_bull' | 'weak_bull' | 'neutral' | 'weak_bear' | 'strong_bear';
  volume: 'low' | 'normal' | 'high';
  correlations: {
    [key: string]: number;
  };
}

// ============================================================================
// Performance Metrics
// ============================================================================

export interface PerformanceMetrics {
  winRate: number;              // % of winning trades
  sharpeRatio: number;          // Risk-adjusted return
  maxDrawdown: number;          // Maximum % drawdown
  avgReturn: number;            // Average return per trade
  totalReturn: number;          // Total return %
  profitFactor: number;         // Gross profit / gross loss
  avgHoldingPeriod: string;     // Average holding period

  // By time period
  daily?: number;
  weekly?: number;
  monthly?: number;
  yearly?: number;
}

// ============================================================================
// Profile Adjustment
// ============================================================================

export interface ProfileAdjustment {
  reason: string;
  parameter: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

export interface AdjustmentHistory {
  profileId: string;
  adjustments: ProfileAdjustment[];
  performanceBefore: PerformanceMetrics;
  performanceAfter?: PerformanceMetrics;
}

// ============================================================================
// Database Schema Types
// ============================================================================

export interface UserTradingProfile {
  id: string;
  userId: string;
  profileId: string;
  timeHorizon: TimeHorizon;
  riskAppetite: RiskAppetite;
  config: TradingProfile;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastAdjustedAt?: Date;
  performanceHistory: PerformanceMetrics[];
  adjustmentHistory: AdjustmentHistory[];
}

// ============================================================================
// Profile Creation Input
// ============================================================================

export interface CreateProfileInput {
  timeHorizon: TimeHorizon;
  riskAppetite: RiskAppetite;
  customizations?: {
    // Allow user to override specific parameters
    executionInterval?: string;
    stopLoss?: number;
    takeProfit?: number;
    maxPositionSize?: number;
    indicators?: Partial<TimeHorizonConfig['indicators']>;
  };
}

// ============================================================================
// Strategy Types
// ============================================================================

export type StrategyType =
  | 'scalping'
  | 'momentum'
  | 'meanReversion'
  | 'breakout'
  | 'trendFollowing'
  | 'valueInvesting'
  | 'dollarCostAveraging'
  | 'portfolioRotation'
  | 'pairsTrading'
  | 'arbitrage'
  | 'optionsSpreads';

export type AssetType =
  | 'large-cap'
  | 'mid-cap'
  | 'small-cap'
  | 'blue-chip'
  | 'growth-stocks'
  | 'value-stocks'
  | 'dividend-stocks'
  | 'sector-etfs'
  | 'leveraged-etfs'
  | 'low-volatility'
  | 'moderate-volatility'
  | 'high-volatility'
  | 'options'
  | 'futures';
