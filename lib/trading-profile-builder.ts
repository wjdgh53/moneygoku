/**
 * Trading Profile Builder
 *
 * Creates trading profiles by combining Time Horizon and Risk Appetite
 */

import {
  TimeHorizon,
  RiskAppetite,
  TimeHorizonConfig,
  RiskAppetiteConfig,
  TradingProfile,
  ValidationResult,
  ProfileValidationInput,
  CreateProfileInput,
  MarketState,
  PerformanceMetrics
} from './trading-profile-types';

// ============================================================================
// Time Horizon Configurations
// ============================================================================

const TIME_HORIZON_CONFIGS: Record<TimeHorizon, TimeHorizonConfig> = {
  [TimeHorizon.DAY]: {
    executionInterval: '30m',
    rebalanceInterval: '4h',
    technicalIntervals: ['15m', '30m', '1h'],
    primaryInterval: '30m',
    indicators: {
      rsi: { period: 14, overbought: 70, oversold: 30 },
      macd: { fast: 12, slow: 26, signal: 9 },
      bb: { period: 20, stdDev: 2 },
      volume: { enabled: true, threshold: 1.5 }
    },
    preferredStrategies: ['scalping', 'momentum', 'meanReversion', 'breakout'],
    holdingPeriod: {
      min: '2h',
      target: '24h',
      max: '72h'
    }
  },

  [TimeHorizon.SWING]: {
    executionInterval: '4h',
    rebalanceInterval: '1d',
    technicalIntervals: ['1h', '4h', '1d'],
    primaryInterval: '4h',
    indicators: {
      rsi: { period: 21, overbought: 65, oversold: 35 },
      macd: { fast: 12, slow: 26, signal: 9 },
      ema: { short: 9, medium: 21, long: 50 },
      adx: { period: 14, trendThreshold: 25 }
    },
    preferredStrategies: ['trendFollowing', 'momentum', 'breakout', 'meanReversion'],
    holdingPeriod: {
      min: '3d',
      target: '14d',
      max: '30d'
    }
  },

  [TimeHorizon.POSITION]: {
    executionInterval: '1d',
    rebalanceInterval: '1w',
    technicalIntervals: ['1d', '1w'],
    primaryInterval: '1d',
    indicators: {
      sma: { short: 50, long: 200 },
      rsi: { period: 28, overbought: 60, oversold: 40 },
      macd: { fast: 12, slow: 26, signal: 9 },
      fundamentals: { enabled: true }
    },
    preferredStrategies: [
      'trendFollowing',
      'valueInvesting',
      'dollarCostAveraging',
      'portfolioRotation'
    ],
    holdingPeriod: {
      min: '30d',
      target: '90d',
      max: '365d'
    }
  }
};

// ============================================================================
// Risk Appetite Configurations
// ============================================================================

const RISK_APPETITE_CONFIGS: Record<RiskAppetite, RiskAppetiteConfig> = {
  [RiskAppetite.DEFENSIVE]: {
    maxPositionSize: 0.05,
    maxTotalExposure: 0.30,
    kellyMultiplier: 0.10,
    stopLoss: 0.02,
    takeProfit: 0.04,
    trailingStop: {
      enabled: true,
      activation: 0.03,
      distance: 0.015
    },
    minWinRate: 0.65,
    minSharpeRatio: 1.5,
    maxDrawdown: 0.08,
    maxLeverage: 1.0,
    preferredAssets: ['large-cap', 'blue-chip', 'low-volatility', 'dividend-stocks']
  },

  [RiskAppetite.BALANCED]: {
    maxPositionSize: 0.10,
    maxTotalExposure: 0.60,
    kellyMultiplier: 0.25,
    stopLoss: 0.05,
    takeProfit: 0.10,
    trailingStop: {
      enabled: true,
      activation: 0.05,
      distance: 0.025
    },
    minWinRate: 0.55,
    minSharpeRatio: 1.0,
    maxDrawdown: 0.15,
    maxLeverage: 1.5,
    preferredAssets: ['mid-cap', 'growth-stocks', 'sector-etfs', 'moderate-volatility']
  },

  [RiskAppetite.AGGRESSIVE]: {
    maxPositionSize: 0.20,
    maxTotalExposure: 0.90,
    kellyMultiplier: 0.50,
    stopLoss: 0.10,
    takeProfit: 0.25,
    trailingStop: {
      enabled: false,
      activation: null,
      distance: null
    },
    minWinRate: 0.45,
    minSharpeRatio: 0.7,
    maxDrawdown: 0.25,
    maxLeverage: 3.0,
    preferredAssets: [
      'small-cap',
      'high-growth',
      'volatile-stocks',
      'leveraged-etfs',
      'options'
    ]
  }
};

// ============================================================================
// Profile Names and Descriptions
// ============================================================================

const PROFILE_METADATA: Record<string, { name: string; description: string }> = {
  'day-defensive': {
    name: 'Conservative Scalper',
    description: 'Quick profits with minimal risk. Tight stops and small positions for day trading.'
  },
  'day-balanced': {
    name: 'Active Day Trader',
    description: 'Balanced approach to day trading with moderate risk and reward targets.'
  },
  'day-aggressive': {
    name: 'Aggressive Scalper',
    description: 'High-frequency day trading with larger positions and wider targets.'
  },
  'swing-defensive': {
    name: 'Conservative Swinger',
    description: 'Patient swing trading with strict risk controls and blue-chip stocks.'
  },
  'swing-balanced': {
    name: 'Momentum Rider',
    description: 'Capture medium-term trends with balanced risk-reward ratio.'
  },
  'swing-aggressive': {
    name: 'Aggressive Momentum',
    description: 'Chase strong trends with larger positions and higher profit targets.'
  },
  'position-defensive': {
    name: 'Wealth Preserver',
    description: 'Long-term investing with capital preservation focus. Warren Buffett style.'
  },
  'position-balanced': {
    name: 'Growth Investor',
    description: 'Long-term growth investing with diversified portfolio.'
  },
  'position-aggressive': {
    name: 'Growth Hunter',
    description: 'Concentrated bets on high-growth stocks for maximum returns.'
  }
};

// ============================================================================
// Profile Builder Class
// ============================================================================

export class TradingProfileBuilder {
  /**
   * Create a trading profile from time horizon and risk appetite
   */
  static create(input: CreateProfileInput): TradingProfile {
    const { timeHorizon, riskAppetite, customizations } = input;

    // Get base configurations
    const timeConfig = TIME_HORIZON_CONFIGS[timeHorizon];
    const riskConfig = RISK_APPETITE_CONFIGS[riskAppetite];

    // Get metadata
    const key = `${timeHorizon}-${riskAppetite}`;
    const metadata = PROFILE_METADATA[key];

    // Apply time-based adjustments to risk parameters
    const adjustedRiskParams = this.adjustRiskParameters(
      timeHorizon,
      riskAppetite,
      riskConfig
    );

    // Combine strategies
    const strategies = this.combineStrategies(
      timeConfig.preferredStrategies,
      riskConfig.preferredAssets
    );

    // Get special rules
    const specialRules = this.getSpecialRules(timeHorizon, riskAppetite);

    // Build profile
    const profile: TradingProfile = {
      id: key,
      name: metadata.name,
      description: metadata.description,
      timeHorizon,
      riskAppetite,

      // Time horizon parameters
      executionInterval: customizations?.executionInterval || timeConfig.executionInterval,
      rebalanceInterval: timeConfig.rebalanceInterval,
      technicalIntervals: timeConfig.technicalIntervals,
      primaryInterval: timeConfig.primaryInterval,
      indicators: {
        ...timeConfig.indicators,
        ...customizations?.indicators
      },
      holdingPeriod: timeConfig.holdingPeriod,

      // Risk appetite parameters (adjusted)
      maxPositionSize: customizations?.maxPositionSize || adjustedRiskParams.maxPositionSize,
      maxTotalExposure: adjustedRiskParams.maxTotalExposure,
      kellyMultiplier: adjustedRiskParams.kellyMultiplier,
      stopLoss: customizations?.stopLoss || adjustedRiskParams.stopLoss,
      takeProfit: customizations?.takeProfit || adjustedRiskParams.takeProfit,
      trailingStop: adjustedRiskParams.trailingStop,
      maxLeverage: adjustedRiskParams.maxLeverage,
      minWinRate: adjustedRiskParams.minWinRate,
      minSharpeRatio: adjustedRiskParams.minSharpeRatio,
      maxDrawdown: adjustedRiskParams.maxDrawdown,

      // Combined
      strategies,
      preferredAssets: riskConfig.preferredAssets,

      // Special rules
      specialRules
    };

    return profile;
  }

  /**
   * Adjust risk parameters based on time horizon
   */
  private static adjustRiskParameters(
    timeHorizon: TimeHorizon,
    riskAppetite: RiskAppetite,
    baseConfig: RiskAppetiteConfig
  ): RiskAppetiteConfig {
    const timeMultipliers = {
      [TimeHorizon.DAY]: {
        stopLoss: 0.5,      // Tighter stops for day trading
        takeProfit: 0.6,
        positionSize: 0.7,  // Smaller positions
        exposure: 0.8
      },
      [TimeHorizon.SWING]: {
        stopLoss: 1.0,      // Normal
        takeProfit: 1.0,
        positionSize: 1.0,
        exposure: 1.0
      },
      [TimeHorizon.POSITION]: {
        stopLoss: 1.5,      // Wider stops for long-term
        takeProfit: 1.5,
        positionSize: 1.2,  // Larger positions ok
        exposure: 1.1
      }
    };

    const multipliers = timeMultipliers[timeHorizon];

    // Special handling for aggressive day trading
    if (timeHorizon === TimeHorizon.DAY && riskAppetite === RiskAppetite.AGGRESSIVE) {
      multipliers.positionSize = 0.5; // Even smaller for aggressive day trading
    }

    return {
      ...baseConfig,
      stopLoss: baseConfig.stopLoss * multipliers.stopLoss,
      takeProfit: baseConfig.takeProfit * multipliers.takeProfit,
      maxPositionSize: baseConfig.maxPositionSize * multipliers.positionSize,
      maxTotalExposure: baseConfig.maxTotalExposure * multipliers.exposure
    };
  }

  /**
   * Combine strategies based on time and risk
   */
  private static combineStrategies(
    timeStrategies: string[],
    riskAssets: string[]
  ): string[] {
    // Filter strategies that make sense for the asset types
    return timeStrategies.filter(strategy => {
      // All strategies work with large/mid cap
      if (riskAssets.includes('large-cap') || riskAssets.includes('mid-cap')) {
        return true;
      }

      // Some strategies don't work well with small-cap/high-volatility
      if (riskAssets.includes('small-cap') || riskAssets.includes('high-volatility')) {
        return !['valueInvesting', 'dollarCostAveraging'].includes(strategy);
      }

      return true;
    });
  }

  /**
   * Get special rules for combination
   */
  private static getSpecialRules(
    timeHorizon: TimeHorizon,
    riskAppetite: RiskAppetite
  ) {
    const rules: TradingProfile['specialRules'] = {};

    // Day trading rules
    if (timeHorizon === TimeHorizon.DAY) {
      rules.avoidVolatileHours = riskAppetite === RiskAppetite.DEFENSIVE;
      rules.requireHighLiquidity = true;
      rules.maxTradesPerDay = riskAppetite === RiskAppetite.AGGRESSIVE ? 10 : 5;
    }

    // Swing trading rules
    if (timeHorizon === TimeHorizon.SWING) {
      rules.requireTrendConfirmation = riskAppetite !== RiskAppetite.AGGRESSIVE;
      rules.pyramiding = riskAppetite !== RiskAppetite.DEFENSIVE;
      rules.partialProfits = true;
    }

    // Position trading rules
    if (timeHorizon === TimeHorizon.POSITION) {
      rules.sectorRotation = riskAppetite === RiskAppetite.AGGRESSIVE;
      rules.leverageOnDips = riskAppetite === RiskAppetite.AGGRESSIVE;
      rules.optionsHedging = riskAppetite !== RiskAppetite.DEFENSIVE;
    }

    return rules;
  }

  /**
   * Validate profile combination
   */
  static validate(input: ProfileValidationInput): ValidationResult {
    const { timeHorizon, riskAppetite, userExperience, capitalSize, riskTolerance } = input;

    // Experience checks
    if (timeHorizon === TimeHorizon.DAY && userExperience < 2) {
      return {
        valid: false,
        warning: 'Day trading requires at least 2 years of trading experience',
        recommendations: [
          'Consider starting with swing trading',
          'Practice with paper trading first',
          'Learn technical analysis fundamentals'
        ]
      };
    }

    if (riskAppetite === RiskAppetite.AGGRESSIVE && userExperience < 3) {
      return {
        valid: false,
        warning: 'Aggressive trading requires at least 3 years of experience',
        recommendations: [
          'Start with balanced risk appetite',
          'Build track record before increasing risk',
          'Study risk management principles'
        ]
      };
    }

    // Capital checks
    const minCapital = {
      [TimeHorizon.DAY]: {
        [RiskAppetite.DEFENSIVE]: 5000,
        [RiskAppetite.BALANCED]: 10000,
        [RiskAppetite.AGGRESSIVE]: 25000
      },
      [TimeHorizon.SWING]: {
        [RiskAppetite.DEFENSIVE]: 3000,
        [RiskAppetite.BALANCED]: 5000,
        [RiskAppetite.AGGRESSIVE]: 10000
      },
      [TimeHorizon.POSITION]: {
        [RiskAppetite.DEFENSIVE]: 2000,
        [RiskAppetite.BALANCED]: 5000,
        [RiskAppetite.AGGRESSIVE]: 10000
      }
    };

    const requiredCapital = minCapital[timeHorizon][riskAppetite];
    if (capitalSize < requiredCapital) {
      return {
        valid: false,
        warning: `This profile requires minimum $${requiredCapital} capital`,
        recommendations: [
          `You have $${capitalSize}. Consider a less capital-intensive profile`,
          'Build your capital before attempting this strategy',
          'Start with position trading which requires less capital'
        ]
      };
    }

    // Risk tolerance checks
    if (riskTolerance && riskTolerance < 5 && riskAppetite === RiskAppetite.AGGRESSIVE) {
      return {
        valid: true,
        warning: 'Your risk tolerance seems low for aggressive trading',
        note: 'Consider if this profile matches your psychological comfort',
        recommendations: [
          'Aggressive trading can lead to large drawdowns',
          'Make sure you can handle 25%+ portfolio swings',
          'Consider balanced approach instead'
        ]
      };
    }

    // Caution flags
    if (timeHorizon === TimeHorizon.POSITION && riskAppetite === RiskAppetite.AGGRESSIVE) {
      return {
        valid: true,
        note: 'High-risk long-term investing requires strong conviction',
        recommendations: [
          'Ensure you have deep research on your holdings',
          'Be prepared for high volatility over long periods',
          'Have emergency fund separate from trading capital'
        ]
      };
    }

    if (timeHorizon === TimeHorizon.DAY && riskAppetite === RiskAppetite.DEFENSIVE) {
      return {
        valid: true,
        note: 'Conservative day trading has low profit potential due to transaction costs',
        recommendations: [
          'Consider if transaction costs will erode profits',
          'May be better suited for algorithmic execution',
          'Swing trading might be more profitable'
        ]
      };
    }

    return {
      valid: true,
      note: 'Profile combination is suitable for your parameters'
    };
  }

  /**
   * Get all available profiles
   */
  static getAllProfiles(): TradingProfile[] {
    const profiles: TradingProfile[] = [];

    for (const timeHorizon of Object.values(TimeHorizon)) {
      for (const riskAppetite of Object.values(RiskAppetite)) {
        profiles.push(
          this.create({
            timeHorizon,
            riskAppetite
          })
        );
      }
    }

    return profiles;
  }

  /**
   * Get recommended profile based on user parameters
   */
  static recommend(input: ProfileValidationInput): TradingProfile | null {
    const { userExperience, capitalSize, riskTolerance } = input;

    // Determine time horizon based on experience and capital
    let timeHorizon: TimeHorizon;
    if (userExperience >= 3 && capitalSize >= 10000) {
      timeHorizon = TimeHorizon.DAY;
    } else if (userExperience >= 1 && capitalSize >= 5000) {
      timeHorizon = TimeHorizon.SWING;
    } else {
      timeHorizon = TimeHorizon.POSITION;
    }

    // Determine risk appetite based on tolerance
    let riskAppetite: RiskAppetite;
    if (riskTolerance) {
      if (riskTolerance >= 8) {
        riskAppetite = RiskAppetite.AGGRESSIVE;
      } else if (riskTolerance >= 5) {
        riskAppetite = RiskAppetite.BALANCED;
      } else {
        riskAppetite = RiskAppetite.DEFENSIVE;
      }
    } else {
      // Default to balanced
      riskAppetite = RiskAppetite.BALANCED;
    }

    // Validate
    const validation = this.validate({
      ...input,
      timeHorizon,
      riskAppetite
    });

    if (!validation.valid) {
      // Try less risky alternative
      if (riskAppetite === RiskAppetite.AGGRESSIVE) {
        return this.recommend({ ...input, riskTolerance: 5 });
      }
      if (timeHorizon === TimeHorizon.DAY) {
        return this.recommend({ ...input, userExperience: 1 });
      }
      return null;
    }

    return this.create({ timeHorizon, riskAppetite });
  }
}

// ============================================================================
// Profile Adjuster Class
// ============================================================================

export class ProfileAdjuster {
  /**
   * Adjust profile based on market conditions
   */
  static adjustForMarket(
    profile: TradingProfile,
    marketState: MarketState
  ): TradingProfile {
    const adjusted = { ...profile };

    // High volatility adjustments
    if (marketState.volatility > 30) {
      adjusted.stopLoss *= 1.5;
      adjusted.maxPositionSize *= 0.7;
      adjusted.maxTotalExposure *= 0.8;
    }

    // Strong bull market
    if (marketState.trend === 'strong_bull') {
      adjusted.maxTotalExposure *= 1.2;
      adjusted.takeProfit *= 1.3;
      if (adjusted.trailingStop.enabled) {
        adjusted.trailingStop.distance! *= 0.8; // Tighter trailing
      }
    }

    // Strong bear market
    if (marketState.trend === 'strong_bear') {
      adjusted.maxPositionSize *= 0.5;
      adjusted.maxTotalExposure *= 0.5;
      adjusted.stopLoss *= 0.8; // Tighter stop
    }

    return adjusted;
  }

  /**
   * Adjust profile based on performance
   */
  static adjustFromPerformance(
    profile: TradingProfile,
    performance: PerformanceMetrics
  ): TradingProfile {
    const adjusted = { ...profile };

    // Underperforming
    if (performance.winRate < profile.minWinRate * 0.8) {
      adjusted.maxPositionSize *= 0.9;
      adjusted.minWinRate *= 0.95;
      adjusted.stopLoss *= 0.9; // Tighter risk control
    }

    // Outperforming
    if (performance.sharpeRatio > 2.0 && performance.winRate > profile.minWinRate) {
      adjusted.maxPositionSize *= 1.1;
      adjusted.kellyMultiplier *= 1.05;
      adjusted.maxTotalExposure *= 1.1;
    }

    // High drawdown
    if (performance.maxDrawdown > profile.maxDrawdown) {
      adjusted.maxPositionSize *= 0.7;
      adjusted.stopLoss *= 0.8;
    }

    return adjusted;
  }
}
