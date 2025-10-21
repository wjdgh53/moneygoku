import { NextResponse } from 'next/server';

// Time Horizon configurations based on quant analyst specifications
const TIME_HORIZON_CONFIGS = {
  SHORT_TERM: {
    name: 'Day Trading',
    description: '단기 데이 트레이딩 전략',
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
    description: '중기 스윙 트레이딩 전략',
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
    description: '장기 포지션 트레이딩 전략',
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

// Risk Appetite configurations based on quant analyst specifications
const RISK_APPETITE_CONFIGS = {
  DEFENSIVE: {
    name: 'Defensive',
    description: '보수적 리스크 관리',
    stopLoss: 2.0,
    takeProfit: 4.0,
    maxPositionSize: 0.20,
    kellyFraction: 0.125, // 1/8 Kelly
    rebalanceThreshold: 0.03 // ±3%
  },
  BALANCED: {
    name: 'Balanced',
    description: '균형잡힌 리스크 관리',
    stopLoss: 5.0,
    takeProfit: 10.0,
    maxPositionSize: 0.40,
    kellyFraction: 0.25, // 1/4 Kelly
    rebalanceThreshold: 0.05 // ±5%
  },
  AGGRESSIVE: {
    name: 'Aggressive',
    description: '공격적 리스크 관리',
    stopLoss: 10.0,
    takeProfit: 25.0,
    maxPositionSize: 0.60,
    kellyFraction: 0.5, // 1/2 Kelly
    rebalanceThreshold: 0.08 // ±8%
  }
};

// Combination matrix with specific recommendations
const COMBINATION_MATRIX = {
  'SHORT_TERM_DEFENSIVE': {
    recommended: false,
    warning: '단기 트레이딩의 높은 거래 비용이 보수적 수익 목표를 상쇄할 수 있습니다',
    suitableFor: 'High-frequency traders with very low commission rates'
  },
  'SHORT_TERM_BALANCED': {
    recommended: true,
    suitableFor: 'Active day traders who can monitor positions frequently'
  },
  'SHORT_TERM_AGGRESSIVE': {
    recommended: true,
    suitableFor: 'Experienced day traders comfortable with high volatility'
  },
  'SWING_DEFENSIVE': {
    recommended: true,
    suitableFor: 'Conservative investors seeking steady medium-term gains'
  },
  'SWING_BALANCED': {
    recommended: true,
    suitableFor: 'Most traders - balanced risk/reward over weeks'
  },
  'SWING_AGGRESSIVE': {
    recommended: true,
    suitableFor: 'Growth-focused traders willing to accept larger drawdowns'
  },
  'LONG_TERM_DEFENSIVE': {
    recommended: true,
    suitableFor: 'Long-term investors prioritizing capital preservation'
  },
  'LONG_TERM_BALANCED': {
    recommended: true,
    suitableFor: 'Buy-and-hold investors seeking steady growth'
  },
  'LONG_TERM_AGGRESSIVE': {
    recommended: true,
    suitableFor: 'Long-term growth investors with high risk tolerance'
  }
};

// Merge configurations for a specific combination
function mergeConfigs(timeHorizon: string, riskAppetite: string) {
  const thConfig = TIME_HORIZON_CONFIGS[timeHorizon as keyof typeof TIME_HORIZON_CONFIGS];
  const raConfig = RISK_APPETITE_CONFIGS[riskAppetite as keyof typeof RISK_APPETITE_CONFIGS];
  const combinationKey = `${timeHorizon}_${riskAppetite}`;
  const matrixInfo = COMBINATION_MATRIX[combinationKey as keyof typeof COMBINATION_MATRIX];

  return {
    timeHorizon: {
      value: timeHorizon,
      ...thConfig
    },
    riskAppetite: {
      value: riskAppetite,
      ...raConfig
    },
    combination: {
      key: combinationKey,
      ...matrixInfo
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

// GET /api/strategy-options - Return all available options and configurations
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      timeHorizons: Object.entries(TIME_HORIZON_CONFIGS).map(([key, config]) => ({
        value: key,
        ...config
      })),
      riskAppetites: Object.entries(RISK_APPETITE_CONFIGS).map(([key, config]) => ({
        value: key,
        ...config
      })),
      combinationMatrix: COMBINATION_MATRIX
    });
  } catch (error) {
    console.error('Error fetching strategy options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategy options' },
      { status: 500 }
    );
  }
}
