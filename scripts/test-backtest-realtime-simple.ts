/**
 * Simple Backtest Real-Time Test with Seeded Data
 *
 * This script:
 * 1. Seeds test historical data
 * 2. Runs a backtest
 * 3. Monitors real-time events
 * 4. Validates event emissions
 */

import { prisma } from '@/lib/prisma';
import { backtestController } from '@/lib/services/backtesting';
import { backtestEvents } from '@/lib/realtime/backtestEvents';

async function seedTestData() {
  console.log('🌱 Seeding test historical data...');

  // Create 100 days of test data for AAPL
  const bars = [];
  const startDate = new Date('2024-01-01');
  let basePrice = 180.0;

  for (let i = 0; i < 100; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Random price movement
    const change = (Math.random() - 0.5) * 4; // +/- $2
    const open = basePrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    const volume = 50000000 + Math.random() * 20000000;

    bars.push({
      symbol: 'AAPL',
      interval: 'daily',
      timestamp: date,
      open,
      high,
      low,
      close,
      volume,
      isValidated: true,
      hasGap: false,
      isAnomaly: false,
      source: 'TEST_SEED',
    });

    basePrice = close;
  }

  // Insert all bars
  await prisma.marketData.createMany({
    data: bars,
    skipDuplicates: true,
  });

  console.log(`   ✅ Created ${bars.length} test bars\n`);
}

async function runTest() {
  console.log('🧪 Starting Simple Backtest Real-Time Test\n');

  try {
    // 1. Clean up old test data
    await prisma.marketData.deleteMany({
      where: { source: 'TEST_SEED' },
    });

    // 2. Seed new test data
    await seedTestData();

    // 3. Find or create test strategy
    let strategy = await prisma.strategy.findFirst({
      where: { name: { contains: 'Test' } },
    });

    if (!strategy) {
      strategy = await prisma.strategy.create({
        data: {
          name: 'Test Strategy - Simple',
          description: 'Test strategy for real-time streaming',
          timeHorizon: 'SWING',
          riskAppetite: 'BALANCED',
          entryConditions: {},
          exitConditions: {},
          stopLoss: 5.0,
          takeProfit: 10.0,
        },
      });
    }

    console.log(`✅ Strategy: ${strategy.name} (${strategy.id})\n`);

    // 4. Set up event listener
    console.log('🎧 Setting up event listener...\n');

    const receivedEvents: any[] = [];

    const unsubscribe = backtestEvents.onBacktestEvent((event) => {
      receivedEvents.push(event);

      switch (event.type) {
        case 'backtest:started':
          console.log(`📡 STARTED: ${event.data.symbol}`);
          break;

        case 'backtest:progress':
          console.log(
            `📡 PROGRESS: ${event.data.progressPct.toFixed(1)}% (${event.data.barsProcessed}/${event.data.totalBars})`
          );
          break;

        case 'backtest:trade_executed':
          const pl = event.data.realizedPL !== undefined
            ? ` | P/L: $${event.data.realizedPL.toFixed(2)}`
            : '';
          console.log(
            `📡 TRADE: ${event.data.side} ${event.data.quantity} @ $${event.data.executedPrice.toFixed(2)}${pl}`
          );
          break;

        case 'backtest:equity_update':
          console.log(
            `📡 EQUITY: $${event.data.totalEquity.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          );
          break;

        case 'backtest:completed':
          console.log(
            `📡 COMPLETED: ${event.data.totalTrades} trades, ${event.data.totalReturnPct.toFixed(2)}% return\n`
          );
          break;

        case 'backtest:failed':
          console.log(`📡 FAILED: ${event.data.error}\n`);
          break;
      }
    });

    // 5. Run backtest
    console.log('🚀 Running backtest...\n');

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-04-10');

    const backtestRunId = await backtestController.runBacktest({
      strategyId: strategy.id,
      symbol: 'AAPL',
      timeHorizon: 'SWING',
      startDate,
      endDate,
      initialCash: 10000,
      positionSizing: 'FIXED_DOLLAR',
      positionSize: 2000,
      slippageBps: 10,
      commissionPerTrade: 1.0,
    });

    // 6. Wait for events to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 7. Cleanup
    unsubscribe();

    // 8. Validate results
    console.log('📊 Test Results:');
    console.log(`   Backtest Run ID: ${backtestRunId}`);
    console.log(`   Events Received: ${receivedEvents.length}`);

    // Count event types
    const eventCounts: Record<string, number> = {};
    receivedEvents.forEach((event) => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });

    console.log('\n📈 Event Breakdown:');
    Object.entries(eventCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Validate expected events
    const hasStarted = receivedEvents.some((e) => e.type === 'backtest:started');
    const hasProgress = receivedEvents.some((e) => e.type === 'backtest:progress');
    const hasCompleted = receivedEvents.some((e) => e.type === 'backtest:completed');
    const hasTrades = receivedEvents.some((e) => e.type === 'backtest:trade_executed');
    const hasEquity = receivedEvents.some((e) => e.type === 'backtest:equity_update');

    console.log('\n✅ Event Validation:');
    console.log(`   Started Event: ${hasStarted ? '✅' : '❌'}`);
    console.log(`   Progress Events: ${hasProgress ? '✅' : '❌'}`);
    console.log(`   Trade Events: ${hasTrades ? '✅' : '❌'}`);
    console.log(`   Equity Events: ${hasEquity ? '✅' : '❌'}`);
    console.log(`   Completion Event: ${hasCompleted ? '✅' : '❌'}`);

    // 9. Fetch final backtest details
    const finalBacktest = await prisma.backtestRun.findUnique({
      where: { id: backtestRunId },
    });

    if (finalBacktest) {
      console.log('\n📋 Final Backtest Results:');
      console.log(`   Status: ${finalBacktest.status}`);
      console.log(`   Total Trades: ${finalBacktest.totalTrades || 0}`);
      console.log(`   Win Rate: ${finalBacktest.winRate?.toFixed(2) || 0}%`);
      console.log(`   Total Return: ${finalBacktest.totalReturnPct?.toFixed(2) || 0}%`);
      console.log(`   Final Equity: $${finalBacktest.finalEquity?.toFixed(2) || 0}`);
      console.log(`   Execution Time: ${finalBacktest.executionTime}ms\n`);
    }

    // Final result
    if (hasStarted && hasProgress && hasCompleted) {
      console.log('🎉 Test PASSED! Real-time events working correctly.\n');
    } else {
      console.log('⚠️  Test INCOMPLETE - Some events missing.\n');
    }
  } catch (error: any) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
runTest()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
