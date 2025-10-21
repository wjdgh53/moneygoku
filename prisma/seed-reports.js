const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedReports() {
  try {
    // Create a bot first
    const strategy = await prisma.strategy.create({
      data: {
        name: 'RSI 과매매 전략',
        description: 'RSI 기반 과매수/과매도 매매 전략',
        entryConditions: {
          rsi: { period: 14, operator: '<', value: 30 },
          sma: { period: 20, operator: 'price_above' }
        },
        exitConditions: {
          rsi: { period: 14, operator: '>', value: 70 }
        },
        stopLoss: 5.0,
        takeProfit: 15.0
      }
    });

    const bot = await prisma.bot.create({
      data: {
        name: 'Apple 거래 봇',
        symbol: 'AAPL',
        strategyId: strategy.id,
        status: 'STOPPED',
        mode: 'PAPER',
        fundAllocation: 1000.0
      }
    });

    // Create sample reports
    const reports = [
      {
        symbol: 'AAPL',
        currentPrice: 178.50,
        decision: 'HOLD',
        decisionReason: 'RSI shows neutral momentum, price above SMA indicates uptrend but waiting for better entry',
        strategyParams: {
          entryConditions: {
            rsi: { period: 14, operator: '<', value: 30 },
            sma: { period: 20, operator: 'price_above' }
          },
          exitConditions: {
            rsi: { period: 14, operator: '>', value: 70 }
          }
        },
        indicators: [
          { indicator: 'RSI', params: { period: 14 }, value: 42.5 },
          { indicator: 'SMA', params: { period: 20 }, value: 175.32 }
        ]
      },
      {
        symbol: 'AAPL',
        currentPrice: 172.30,
        decision: 'BUY',
        decisionReason: 'Strong oversold signal on RSI, good entry point despite MACD not confirming yet',
        strategyParams: {
          entryConditions: {
            rsi: { period: 14, operator: '<', value: 30 },
            sma: { period: 20, operator: 'price_above' }
          },
          exitConditions: {
            rsi: { period: 14, operator: '>', value: 70 }
          }
        },
        indicators: [
          { indicator: 'RSI', params: { period: 14 }, value: 28.3 },
          { indicator: 'MACD', params: {}, value: { macdLine: -1.2, signalLine: -0.8, histogram: -0.4 } }
        ]
      },
      {
        symbol: 'AAPL',
        currentPrice: 185.20,
        decision: 'SELL',
        decisionReason: 'RSI indicates overbought condition, consider taking profits',
        strategyParams: {
          entryConditions: {
            rsi: { period: 14, operator: '<', value: 30 },
            sma: { period: 20, operator: 'price_above' }
          },
          exitConditions: {
            rsi: { period: 14, operator: '>', value: 70 }
          }
        },
        indicators: [
          { indicator: 'RSI', params: { period: 14 }, value: 72.8 }
        ]
      }
    ];

    for (const reportData of reports) {
      const report = await prisma.report.create({
        data: {
          botId: bot.id,
          symbol: reportData.symbol,
          currentPrice: reportData.currentPrice,
          decision: reportData.decision,
          decisionReason: reportData.decisionReason,
          strategyParams: reportData.strategyParams,
          timestamp: new Date(Date.now() - Math.random() * 86400000) // Random time within last day
        }
      });

      // Create indicators for this report
      for (const indicatorData of reportData.indicators) {
        await prisma.reportIndicator.create({
          data: {
            reportId: report.id,
            indicator: indicatorData.indicator,
            params: indicatorData.params,
            value: indicatorData.value
          }
        });
      }
    }

    console.log('✅ Sample reports seeded successfully');
  } catch (error) {
    console.error('Error seeding reports:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedReports();