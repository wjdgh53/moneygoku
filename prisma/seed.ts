import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create strategies first
  const rsiStrategy = await prisma.strategy.create({
    data: {
      name: 'RSI Technical Strategy',
      description: 'RSI-based trading strategy with oversold/overbought signals',
      type: 'TECHNICAL',
      parameters: JSON.stringify({
        rsiPeriod: 14,
        oversoldLevel: 30,
        overboughtLevel: 70,
        positionSize: 0.1
      }),
      indicators: JSON.stringify(['RSI', 'MA']),
      riskLevel: 3,
      performance: JSON.stringify({
        totalTrades: 8,
        winRate: 0.625,
        averageReturn: 0.015
      })
    }
  });

  const macdStrategy = await prisma.strategy.create({
    data: {
      name: 'MACD Momentum Strategy',
      description: 'MACD crossover strategy for momentum trading',
      type: 'TECHNICAL',
      parameters: JSON.stringify({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        positionSize: 0.15
      }),
      indicators: JSON.stringify(['MACD', 'MA']),
      riskLevel: 4,
      performance: JSON.stringify({
        totalTrades: 3,
        winRate: 0.333,
        averageReturn: -0.015
      })
    }
  });

  // Create main portfolio
  const mainPortfolio = await prisma.portfolio.create({
    data: {
      name: 'Main Portfolio',
      cashBalance: 9920.30,
      totalValue: 10080.20,
      totalReturns: 80.20,
      totalReturnsPercent: 0.8,
      dayReturns: 35.10,
      dayReturnsPercent: 0.35,
      positions: JSON.stringify([
        {
          symbol: 'AAPL',
          quantity: 5,
          avgPrice: 148.50,
          currentPrice: 150.25,
          marketValue: 751.25,
          unrealizedPnL: 8.75,
          unrealizedPnLPercent: 1.18
        },
        {
          symbol: 'TSLA',
          quantity: 2,
          avgPrice: 245.80,
          currentPrice: 238.30,
          marketValue: 476.60,
          unrealizedPnL: -15.00,
          unrealizedPnLPercent: -3.05
        }
      ])
    }
  });

  // Create bots
  const rsiBot = await prisma.bot.create({
    data: {
      name: 'RSI Strategy Bot',
      description: 'Automated RSI-based trading bot',
      status: 'ACTIVE',
      mode: 'PAPER',
      strategyId: rsiStrategy.id,
      config: JSON.stringify({
        symbols: ['AAPL', 'MSFT', 'GOOGL'],
        maxPositions: 3,
        stopLoss: 0.05,
        takeProfit: 0.10
      }),
      lastExecutedAt: new Date(),
      portfolio: {
        connect: { id: mainPortfolio.id }
      }
    }
  });

  const macdBot = await prisma.bot.create({
    data: {
      name: 'MACD Momentum',
      description: 'MACD momentum trading bot',
      status: 'PAUSED',
      mode: 'PAPER',
      strategyId: macdStrategy.id,
      config: JSON.stringify({
        symbols: ['TSLA', 'NVDA'],
        maxPositions: 2,
        stopLoss: 0.08,
        takeProfit: 0.15
      }),
      lastExecutedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    }
  });

  // Create sample trades
  const trades = [
    {
      portfolioId: mainPortfolio.id,
      botId: rsiBot.id,
      symbol: 'AAPL',
      side: 'BUY' as const,
      quantity: 5,
      price: 148.50,
      totalAmount: 742.50,
      fees: 1.50,
      status: 'EXECUTED' as const,
      executedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      reason: 'RSI oversold signal'
    },
    {
      portfolioId: mainPortfolio.id,
      botId: macdBot.id,
      symbol: 'TSLA',
      side: 'BUY' as const,
      quantity: 2,
      price: 245.80,
      totalAmount: 491.60,
      fees: 2.00,
      status: 'EXECUTED' as const,
      executedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      reason: 'MACD bullish crossover'
    }
  ];

  for (const trade of trades) {
    await prisma.trade.create({ data: trade });
  }

  // Create sample market data
  const symbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'NVDA'];
  const now = new Date();

  for (const symbol of symbols) {
    await prisma.marketData.create({
      data: {
        symbol,
        timestamp: now,
        open: 150.00,
        high: 152.50,
        low: 148.00,
        close: symbol === 'AAPL' ? 150.25 : symbol === 'TSLA' ? 238.30 : 151.00,
        volume: 1000000,
        source: 'TRADINGVIEW'
      }
    });
  }

  // Create sample technical indicators
  await prisma.technicalIndicator.createMany({
    data: [
      {
        symbol: 'AAPL',
        indicator: 'RSI',
        period: 14,
        value: 65.5,
        timestamp: now,
        metadata: JSON.stringify({ signal: 'neutral' })
      },
      {
        symbol: 'AAPL',
        indicator: 'MACD',
        period: 26,
        value: 2.15,
        timestamp: now,
        metadata: JSON.stringify({ signal: 'bullish', histogram: 0.8 })
      },
      {
        symbol: 'TSLA',
        indicator: 'RSI',
        period: 14,
        value: 32.1,
        timestamp: now,
        metadata: JSON.stringify({ signal: 'oversold' })
      }
    ]
  });

  console.log('✅ Seed completed successfully!');
  console.log(`📊 Created:`);
  console.log(`   - 2 strategies (RSI, MACD)`);
  console.log(`   - 2 bots (1 active, 1 paused)`);
  console.log(`   - 1 portfolio with 2 positions`);
  console.log(`   - 2 executed trades`);
  console.log(`   - Market data for 5 symbols`);
  console.log(`   - Technical indicators`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });