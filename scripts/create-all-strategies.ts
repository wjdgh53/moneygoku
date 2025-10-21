import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creating all strategy combinations...\n');

  const strategies = [
    // SHORT_TERM strategies
    {
      name: 'Day Trading - Conservative',
      description: '단기 보수 전략: 낮은 위험, 빠른 매매',
      timeHorizon: 'SHORT_TERM',
      riskAppetite: 'DEFENSIVE',
      entryConditions: {
        rsi: { period: 14, condition: 'below', value: 35 },
        macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, signal: 'bullish_crossover' }
      },
      exitConditions: {
        rsi: { period: 14, exitSignal: 'overbought', overboughtThreshold: 65 }
      },
      stopLoss: 3,
      takeProfit: 8
    },
    {
      name: 'Day Trading - Balanced',
      description: '단기 균형 전략: 중간 위험, 빠른 매매',
      timeHorizon: 'SHORT_TERM',
      riskAppetite: 'BALANCED',
      entryConditions: {
        rsi: { period: 14, condition: 'below', value: 32 },
        macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, signal: 'bullish_crossover' }
      },
      exitConditions: {
        rsi: { period: 14, exitSignal: 'overbought', overboughtThreshold: 68 }
      },
      stopLoss: 5,
      takeProfit: 15
    },
    {
      name: 'Day Trading - Aggressive',
      description: '단기 공격 전략: 높은 위험, 빠른 매매',
      timeHorizon: 'SHORT_TERM',
      riskAppetite: 'AGGRESSIVE',
      entryConditions: {
        rsi: { period: 14, condition: 'below', value: 30 },
        macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, signal: 'bullish_crossover' }
      },
      exitConditions: {
        rsi: { period: 14, exitSignal: 'overbought', overboughtThreshold: 70 }
      },
      stopLoss: 10,
      takeProfit: 25
    },

    // SWING strategies
    {
      name: 'Swing Trading - Conservative',
      description: '스윙 보수 전략: 낮은 위험, 중기 보유',
      timeHorizon: 'SWING',
      riskAppetite: 'DEFENSIVE',
      entryConditions: {
        rsi: { period: 14, condition: 'below', value: 35 },
        macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, signal: 'bullish_crossover' }
      },
      exitConditions: {
        rsi: { period: 14, exitSignal: 'overbought', overboughtThreshold: 65 }
      },
      stopLoss: 4,
      takeProfit: 10
    },
    {
      name: 'Swing Trading - Balanced',
      description: '스윙 균형 전략: 중간 위험, 중기 보유',
      timeHorizon: 'SWING',
      riskAppetite: 'BALANCED',
      entryConditions: {
        rsi: { period: 14, condition: 'below', value: 30 },
        macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, signal: 'bullish_crossover' }
      },
      exitConditions: {},
      stopLoss: 5,
      takeProfit: 10
    },
    {
      name: 'Swing Trading - Aggressive',
      description: '스윙 공격 전략: 높은 위험, 중기 보유',
      timeHorizon: 'SWING',
      riskAppetite: 'AGGRESSIVE',
      entryConditions: {
        rsi: { period: 14, condition: 'below', value: 28 },
        macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, signal: 'bullish_crossover' }
      },
      exitConditions: {
        rsi: { period: 14, exitSignal: 'overbought', overboughtThreshold: 72 }
      },
      stopLoss: 8,
      takeProfit: 20
    },

    // LONG_TERM strategies
    {
      name: 'Position Trading - Conservative',
      description: '장기 보수 전략: 낮은 위험, 장기 보유',
      timeHorizon: 'LONG_TERM',
      riskAppetite: 'DEFENSIVE',
      entryConditions: {
        rsi: { period: 14, condition: 'below', value: 40 },
        macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, signal: 'bullish_crossover' }
      },
      exitConditions: {
        rsi: { period: 14, exitSignal: 'overbought', overboughtThreshold: 60 }
      },
      stopLoss: 5,
      takeProfit: 15
    },
    {
      name: 'Position Trading - Balanced',
      description: '장기 균형 전략: 중간 위험, 장기 보유',
      timeHorizon: 'LONG_TERM',
      riskAppetite: 'BALANCED',
      entryConditions: {
        rsi: { period: 14, condition: 'below', value: 35 },
        macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, signal: 'bullish_crossover' }
      },
      exitConditions: {
        rsi: { period: 14, exitSignal: 'overbought', overboughtThreshold: 65 }
      },
      stopLoss: 7,
      takeProfit: 20
    },
    {
      name: 'Position Trading - Aggressive',
      description: '장기 공격 전략: 높은 위험, 장기 보유',
      timeHorizon: 'LONG_TERM',
      riskAppetite: 'AGGRESSIVE',
      entryConditions: {
        rsi: { period: 14, condition: 'below', value: 30 },
        macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, signal: 'bullish_crossover' }
      },
      exitConditions: {
        rsi: { period: 14, exitSignal: 'overbought', overboughtThreshold: 70 }
      },
      stopLoss: 10,
      takeProfit: 30
    }
  ];

  let created = 0;
  let skipped = 0;

  for (const strategyData of strategies) {
    try {
      // Check if strategy already exists
      const existing = await prisma.strategy.findFirst({
        where: {
          timeHorizon: strategyData.timeHorizon as any,
          riskAppetite: strategyData.riskAppetite as any
        }
      });

      if (existing) {
        console.log(`⏭️  Skipped: ${strategyData.name} (already exists)`);
        skipped++;
        continue;
      }

      const strategy = await prisma.strategy.create({
        data: strategyData as any
      });

      console.log(`✅ Created: ${strategy.name} (${strategy.timeHorizon} + ${strategy.riskAppetite})`);
      created++;
    } catch (error) {
      console.error(`❌ Failed to create ${strategyData.name}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📦 Total: ${created + skipped} strategies`);
}

main()
  .catch((e) => {
    console.error('💥 Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
