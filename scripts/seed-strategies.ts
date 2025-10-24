/**
 * Seed diverse trading strategies to production database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const strategies = [
  {
    name: '🚀 RSI 역발 전략',
    description: 'RSI 과매도/과매수 구간에서 역발 매매. 단타에 적합한 공격적 전략',
    timeHorizon: 'SHORT_TERM',
    riskAppetite: 'AGGRESSIVE',
    stopLoss: 3.0,
    takeProfit: 6.0,
    entryConditions: {
      indicators: ['RSI'],
      rules: [
        { indicator: 'RSI', operator: '<', value: 30, weight: 1.0 },
        { indicator: 'VOLUME', operator: '>', value: 'AVG_VOLUME * 1.5', weight: 0.3 }
      ],
      description: 'RSI < 30 (과매도) + 거래량 증가'
    },
    exitConditions: {
      indicators: ['RSI'],
      rules: [
        { indicator: 'RSI', operator: '>', value: 70, weight: 1.0 }
      ],
      description: 'RSI > 70 (과매수) 도달 시 매도'
    }
  },
  {
    name: '📈 골든크로스 전략',
    description: '50일/200일 이동평균선 교차 신호 활용. 중기 투자에 최적',
    timeHorizon: 'SWING',
    riskAppetite: 'BALANCED',
    stopLoss: 5.0,
    takeProfit: 12.0,
    entryConditions: {
      indicators: ['SMA'],
      rules: [
        { indicator: 'SMA_50', operator: 'CROSS_ABOVE', value: 'SMA_200', weight: 1.0 },
        { indicator: 'VOLUME', operator: '>', value: 'AVG_VOLUME', weight: 0.2 }
      ],
      description: '50일선이 200일선을 상향 돌파 (골든크로스)'
    },
    exitConditions: {
      indicators: ['SMA'],
      rules: [
        { indicator: 'SMA_50', operator: 'CROSS_BELOW', value: 'SMA_200', weight: 1.0 }
      ],
      description: '50일선이 200일선을 하향 돌파 (데드크로스)'
    }
  },
  {
    name: '💥 모멘텀 브레이크아웃',
    description: '볼린저밴드 돌파 + 거래량 급증 포착. 강한 상승 모멘텀 추종',
    timeHorizon: 'SHORT_TERM',
    riskAppetite: 'AGGRESSIVE',
    stopLoss: 4.0,
    takeProfit: 10.0,
    entryConditions: {
      indicators: ['BBANDS', 'VOLUME'],
      rules: [
        { indicator: 'PRICE', operator: '>', value: 'BB_UPPER', weight: 0.8 },
        { indicator: 'VOLUME', operator: '>', value: 'AVG_VOLUME * 2', weight: 0.5 },
        { indicator: 'CHANGE_PERCENT', operator: '>', value: 3, weight: 0.3 }
      ],
      description: '볼린저밴드 상단 돌파 + 거래량 2배 이상 + 3% 이상 상승'
    },
    exitConditions: {
      indicators: ['BBANDS'],
      rules: [
        { indicator: 'PRICE', operator: '<', value: 'BB_MIDDLE', weight: 1.0 }
      ],
      description: '볼린저밴드 중심선 하향 돌파'
    }
  },
  {
    name: '🏛️ 배당 성장 장기투자',
    description: '안정적 배당 + 실적 성장주 장기 보유. 보수적 투자자 적합',
    timeHorizon: 'LONG_TERM',
    riskAppetite: 'DEFENSIVE',
    stopLoss: 15.0,
    takeProfit: 30.0,
    entryConditions: {
      indicators: ['FUNDAMENTALS'],
      rules: [
        { indicator: 'DIVIDEND_YIELD', operator: '>', value: 2.5, weight: 0.5 },
        { indicator: 'PE_RATIO', operator: '<', value: 25, weight: 0.3 },
        { indicator: 'MARKET_CAP', operator: '>', value: 10000000000, weight: 0.4 }
      ],
      description: '배당률 2.5% 이상 + PER 25 미만 + 시가총액 100억 달러 이상'
    },
    exitConditions: {
      indicators: ['FUNDAMENTALS', 'NEWS'],
      rules: [
        { indicator: 'DIVIDEND_CUT', operator: '==', value: true, weight: 1.0 },
        { indicator: 'ANALYST_DOWNGRADE', operator: '==', value: true, weight: 0.6 }
      ],
      description: '배당 삭감 또는 애널리스트 대규모 하향 조정'
    }
  },
  {
    name: '🌊 MACD 추세 추종',
    description: 'MACD 신호선 교차로 추세 전환 포착. 스윙 트레이딩 표준 전략',
    timeHorizon: 'SWING',
    riskAppetite: 'BALANCED',
    stopLoss: 5.0,
    takeProfit: 11.0,
    entryConditions: {
      indicators: ['MACD'],
      rules: [
        { indicator: 'MACD', operator: 'CROSS_ABOVE', value: 'MACD_SIGNAL', weight: 1.0 },
        { indicator: 'MACD_HISTOGRAM', operator: '>', value: 0, weight: 0.3 }
      ],
      description: 'MACD가 시그널선을 상향 돌파 + 히스토그램 양수'
    },
    exitConditions: {
      indicators: ['MACD'],
      rules: [
        { indicator: 'MACD', operator: 'CROSS_BELOW', value: 'MACD_SIGNAL', weight: 1.0 }
      ],
      description: 'MACD가 시그널선을 하향 돌파'
    }
  },
  {
    name: '⚖️ 볼린저밴드 평균회귀',
    description: '볼린저밴드 하단/상단 터치 시 평균 회귀 베팅. 박스권 장세에 유리',
    timeHorizon: 'SHORT_TERM',
    riskAppetite: 'BALANCED',
    stopLoss: 4.0,
    takeProfit: 8.0,
    entryConditions: {
      indicators: ['BBANDS', 'RSI'],
      rules: [
        { indicator: 'PRICE', operator: '<', value: 'BB_LOWER', weight: 0.8 },
        { indicator: 'RSI', operator: '<', value: 35, weight: 0.4 }
      ],
      description: '볼린저밴드 하단 터치 + RSI 과매도'
    },
    exitConditions: {
      indicators: ['BBANDS'],
      rules: [
        { indicator: 'PRICE', operator: '>', value: 'BB_UPPER', weight: 1.0 }
      ],
      description: '볼린저밴드 상단 도달'
    }
  },
  {
    name: '📰 뉴스 센티먼트 AI 전략',
    description: 'AI 뉴스 분석 + 센티먼트 스코어 기반 단타. 이벤트 드리븐 매매',
    timeHorizon: 'SHORT_TERM',
    riskAppetite: 'AGGRESSIVE',
    stopLoss: 3.5,
    takeProfit: 7.0,
    entryConditions: {
      indicators: ['NEWS', 'SENTIMENT'],
      rules: [
        { indicator: 'NEWS_SENTIMENT', operator: '>', value: 0.7, weight: 0.9 },
        { indicator: 'NEWS_COUNT', operator: '>', value: 5, weight: 0.3 },
        { indicator: 'ANALYST_UPGRADE', operator: '==', value: true, weight: 0.5 }
      ],
      description: '긍정 뉴스 센티먼트 70% 이상 + 뉴스 5개 이상 + 애널리스트 업그레이드'
    },
    exitConditions: {
      indicators: ['NEWS', 'TIME'],
      rules: [
        { indicator: 'NEWS_SENTIMENT', operator: '<', value: 0.3, weight: 1.0 },
        { indicator: 'HOLDING_DAYS', operator: '>', value: 3, weight: 0.4 }
      ],
      description: '부정 뉴스 또는 3일 이상 보유 시 익절'
    }
  },
  {
    name: '🎯 삼중 지표 컨펌 전략',
    description: 'RSI + MACD + 볼린저밴드 동시 신호 확인. 높은 승률 추구',
    timeHorizon: 'SWING',
    riskAppetite: 'BALANCED',
    stopLoss: 5.0,
    takeProfit: 12.0,
    entryConditions: {
      indicators: ['RSI', 'MACD', 'BBANDS'],
      rules: [
        { indicator: 'RSI', operator: '<', value: 35, weight: 0.33 },
        { indicator: 'MACD', operator: 'CROSS_ABOVE', value: 'MACD_SIGNAL', weight: 0.33 },
        { indicator: 'PRICE', operator: '<', value: 'BB_LOWER', weight: 0.34 }
      ],
      description: 'RSI 과매도 + MACD 골든크로스 + 볼밴 하단 터치 (3중 컨펌)'
    },
    exitConditions: {
      indicators: ['RSI', 'MACD'],
      rules: [
        { indicator: 'RSI', operator: '>', value: 70, weight: 0.5 },
        { indicator: 'MACD', operator: 'CROSS_BELOW', value: 'MACD_SIGNAL', weight: 0.5 }
      ],
      description: 'RSI 과매수 또는 MACD 데드크로스'
    }
  },
  {
    name: '📊 애널리스트 컨센서스 추종',
    description: '애널리스트 대규모 상향/하향 조정 추종. 전문가 의견 반영',
    timeHorizon: 'SWING',
    riskAppetite: 'BALANCED',
    stopLoss: 6.0,
    takeProfit: 14.0,
    entryConditions: {
      indicators: ['ANALYST', 'FUNDAMENTALS'],
      rules: [
        { indicator: 'ANALYST_UPGRADES', operator: '>', value: 3, weight: 0.7 },
        { indicator: 'CONSENSUS', operator: '==', value: 'BUY', weight: 0.5 },
        { indicator: 'PRICE_TARGET_UPSIDE', operator: '>', value: 15, weight: 0.4 }
      ],
      description: '3개 이상 업그레이드 + BUY 컨센서스 + 목표가 상승여력 15% 이상'
    },
    exitConditions: {
      indicators: ['ANALYST'],
      rules: [
        { indicator: 'ANALYST_DOWNGRADES', operator: '>', value: 2, weight: 1.0 },
        { indicator: 'CONSENSUS', operator: '==', value: 'SELL', weight: 0.8 }
      ],
      description: '2개 이상 다운그레이드 또는 SELL 컨센서스 전환'
    }
  },
  {
    name: '🔥 모멘텀 스크리너 자동매수',
    description: '거래량 급증 + 가격 상승 + RSI 정상범위 종목 자동 포착',
    timeHorizon: 'SHORT_TERM',
    riskAppetite: 'AGGRESSIVE',
    stopLoss: 4.5,
    takeProfit: 9.0,
    entryConditions: {
      indicators: ['VOLUME', 'PRICE', 'RSI'],
      rules: [
        { indicator: 'VOLUME', operator: '>', value: 'AVG_VOLUME * 2', weight: 0.5 },
        { indicator: 'CHANGE_PERCENT', operator: '>', value: 3, weight: 0.4 },
        { indicator: 'RSI', operator: 'BETWEEN', value: [40, 70], weight: 0.3 },
        { indicator: 'MARKET_CAP', operator: '>', value: 1000000000, weight: 0.2 }
      ],
      description: '거래량 2배 이상 + 3% 상승 + RSI 40-70 + 시총 10억 이상'
    },
    exitConditions: {
      indicators: ['RSI', 'CHANGE_PERCENT'],
      rules: [
        { indicator: 'RSI', operator: '>', value: 75, weight: 0.6 },
        { indicator: 'CHANGE_PERCENT_FROM_ENTRY', operator: '<', value: -3, weight: 0.4 }
      ],
      description: 'RSI 75 이상 과열 또는 진입가 대비 -3% 손실'
    }
  },
  {
    name: '💎 가치주 장기 보유',
    description: '저PER + 고ROE + 안정적 재무구조 우량주 장기투자',
    timeHorizon: 'LONG_TERM',
    riskAppetite: 'DEFENSIVE',
    stopLoss: 20.0,
    takeProfit: 40.0,
    entryConditions: {
      indicators: ['FUNDAMENTALS'],
      rules: [
        { indicator: 'PE_RATIO', operator: '<', value: 15, weight: 0.4 },
        { indicator: 'ROE', operator: '>', value: 15, weight: 0.3 },
        { indicator: 'DEBT_TO_EQUITY', operator: '<', value: 0.5, weight: 0.3 },
        { indicator: 'REVENUE_GROWTH_YOY', operator: '>', value: 5, weight: 0.2 }
      ],
      description: 'PER 15 미만 + ROE 15% 이상 + 부채비율 50% 이하 + 매출 성장'
    },
    exitConditions: {
      indicators: ['FUNDAMENTALS'],
      rules: [
        { indicator: 'DEBT_TO_EQUITY', operator: '>', value: 1.5, weight: 0.6 },
        { indicator: 'REVENUE_DECLINE', operator: '>', value: 20, weight: 0.7 }
      ],
      description: '부채비율 150% 초과 또는 매출 20% 이상 감소'
    }
  },
  {
    name: '⚡ 인사이더 매수 추종',
    description: '임원/대주주 대규모 매수 시 추종 매매. 내부자 정보 활용',
    timeHorizon: 'SWING',
    riskAppetite: 'BALANCED',
    stopLoss: 6.0,
    takeProfit: 13.0,
    entryConditions: {
      indicators: ['INSIDER', 'FUNDAMENTALS'],
      rules: [
        { indicator: 'INSIDER_BUY_VOLUME', operator: '>', value: 100000, weight: 0.8 },
        { indicator: 'INSIDER_BUY_COUNT', operator: '>', value: 3, weight: 0.4 },
        { indicator: 'MARKET_CAP', operator: '>', value: 500000000, weight: 0.2 }
      ],
      description: '임원 10만주 이상 매수 + 3명 이상 매수 + 시총 5억 이상'
    },
    exitConditions: {
      indicators: ['INSIDER', 'TIME'],
      rules: [
        { indicator: 'INSIDER_SELL_VOLUME', operator: '>', value: 50000, weight: 1.0 },
        { indicator: 'HOLDING_DAYS', operator: '>', value: 60, weight: 0.3 }
      ],
      description: '임원 대규모 매도 또는 60일 이상 보유'
    }
  }
];

async function main() {
  console.log('🌱 Starting strategy seeding...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const strategy of strategies) {
    try {
      const created = await prisma.strategy.create({
        data: strategy
      });
      console.log(`✅ Created: ${strategy.name} (${created.id})`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed to create ${strategy.name}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Seeding completed!`);
  console.log(`✅ Success: ${successCount} strategies`);
  console.log(`❌ Errors: ${errorCount} strategies`);
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
