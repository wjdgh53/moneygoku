/**
 * Strategy Configuration Utilities
 *
 * Helper functions for merging time horizon and risk appetite configurations.
 */

// Time Horizon configurations
const TIME_HORIZON_CONFIGS = {
  SHORT_TERM: {
    name: 'Day Trading',
    interval: '30min',
    candleStick: '15min',
    executionFrequency: 'Every 30 minutes during market hours',
    lookbackPeriod: '5 days',
    indicators: {
      rsiPeriod: 14,
      maPeriod: 20,
      bbPeriod: 20
    }
  },
  SWING: {
    name: 'Swing Trading',
    interval: '4hour',
    candleStick: '1hour',
    executionFrequency: '2-3 times per day',
    lookbackPeriod: '60 days',
    indicators: {
      rsiPeriod: 14,
      maPeriod: 50,
      bbPeriod: 20
    }
  },
  LONG_TERM: {
    name: 'Position Trading',
    interval: 'daily',
    candleStick: 'daily',
    executionFrequency: 'Once per day',
    lookbackPeriod: '252 days',
    indicators: {
      rsiPeriod: 14,
      maPeriod: 200,
      bbPeriod: 20
    }
  }
};

// Risk Appetite configurations
const RISK_APPETITE_CONFIGS = {
  DEFENSIVE: {
    name: 'Defensive',
    stopLoss: 2.0,
    takeProfit: 4.0,
    maxPositionSize: 0.20,
    kellyFraction: 0.125,
    rebalanceThreshold: 0.03
  },
  BALANCED: {
    name: 'Balanced',
    stopLoss: 5.0,
    takeProfit: 10.0,
    maxPositionSize: 0.40,
    kellyFraction: 0.25,
    rebalanceThreshold: 0.05
  },
  AGGRESSIVE: {
    name: 'Aggressive',
    stopLoss: 10.0,
    takeProfit: 25.0,
    maxPositionSize: 0.60,
    kellyFraction: 0.5,
    rebalanceThreshold: 0.08
  }
};

/**
 * Merge time horizon and risk appetite configurations
 */
export function mergeConfigs(timeHorizon: string, riskAppetite: string) {
  const thConfig = TIME_HORIZON_CONFIGS[timeHorizon as keyof typeof TIME_HORIZON_CONFIGS];
  const raConfig = RISK_APPETITE_CONFIGS[riskAppetite as keyof typeof RISK_APPETITE_CONFIGS];

  if (!thConfig || !raConfig) {
    throw new Error(`Invalid configuration: ${timeHorizon} / ${riskAppetite}`);
  }

  return {
    timeHorizon: {
      value: timeHorizon,
      ...thConfig
    },
    riskAppetite: {
      value: riskAppetite,
      ...raConfig
    },
    mergedParams: {
      // Time-based params
      interval: thConfig.interval,
      candleStick: thConfig.candleStick,
      executionFrequency: thConfig.executionFrequency,
      lookbackPeriod: thConfig.lookbackPeriod,

      // Risk-based params
      stopLoss: raConfig.stopLoss,
      takeProfit: raConfig.takeProfit,
      maxPositionSize: raConfig.maxPositionSize,
      kellyFraction: raConfig.kellyFraction,
      rebalanceThreshold: raConfig.rebalanceThreshold,

      // Technical indicators
      indicators: thConfig.indicators
    }
  };
}
