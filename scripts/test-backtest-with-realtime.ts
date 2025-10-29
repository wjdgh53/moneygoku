/**
 * Test Backtest Execution with Real-Time Streaming
 *
 * This script:
 * 1. Finds or creates a test strategy
 * 2. Runs a backtest with real historical data
 * 3. Monitors the SSE stream for real-time updates
 * 4. Validates all events are received correctly
 */

import { prisma } from '@/lib/prisma';
import { backtestController } from '@/lib/services/backtesting';
import { backtestEvents } from '@/lib/realtime/backtestEvents';

async function runTest() {
  console.log('🧪 Starting Backtest Real-Time Streaming Test\n');

  try {
    // 1. Find or create a test strategy
    console.log('📝 Finding test strategy...');

    let strategy = await prisma.strategy.findFirst({
      where: {
        name: { contains: 'Test' },
      },
    });

    if (!strategy) {
      console.log('   Creating test strategy...');
      strategy = await prisma.strategy.create({
        data: {
          name: 'Test Strategy - Simple MA',
          description: 'Simple moving average strategy for testing',
          timeHorizon: 'SWING',
          riskAppetite: 'BALANCED',
          entryConditions: {},
          exitConditions: {},
          stopLoss: 5.0,
          takeProfit: 10.0,
        },
      });
      console.log(`   ✅ Created strategy: ${strategy.id}`);
    } else {
      console.log(`   ✅ Found strategy: ${strategy.id} (${strategy.name})`);
    }

    // 2. Check for historical data
    console.log('\n📊 Checking for historical data...');

    const historicalData = await prisma.marketData.findMany({
      where: {
        symbol: 'AAPL',
        interval: 'daily', // SWING timeHorizon uses daily data
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 1,
    });

    if (historicalData.length === 0) {
      console.error('   ❌ No historical data found for AAPL (daily interval)');
      console.log('   Please run data fetching for AAPL');
      return;
    }

    const latestBar = historicalData[0];
    console.log(`   ✅ Found historical data (latest: ${latestBar.timestamp.toISOString().split('T')[0]})`);

    // 3. Set up event listener for real-time updates
    console.log('\n🎧 Setting up event listener...');

    const receivedEvents: any[] = [];

    const unsubscribe = backtestEvents.onBacktestEvents('*', (event) => {
      receivedEvents.push(event);

      switch (event.type) {
        case 'backtest:started':
          console.log(`   📡 STARTED: ${event.data.symbol} (${event.data.backtestRunId})`);
          break;

        case 'backtest:progress':
          console.log(`   📡 PROGRESS: ${event.data.progressPct.toFixed(1)}% (${event.data.barsProcessed}/${event.data.totalBars})`);
          break;

        case 'backtest:trade_executed':
          console.log(`   📡 TRADE: ${event.data.side} ${event.data.quantity} @ $${event.data.executedPrice.toFixed(2)}`);
          if (event.data.realizedPL !== undefined) {
            console.log(`        P/L: $${event.data.realizedPL.toFixed(2)} (${event.data.realizedPLPct?.toFixed(2)}%)`);
          }
          break;

        case 'backtest:equity_update':
          console.log(`   📡 EQUITY: $${event.data.totalEquity.toLocaleString()} (Cash: $${event.data.cash.toLocaleString()})`);
          break;

        case 'backtest:completed':
          console.log(`   📡 COMPLETED: ${event.data.totalTrades} trades, ${event.data.totalReturnPct.toFixed(2)}% return`);
          break;

        case 'backtest:failed':
          console.log(`   📡 FAILED: ${event.data.error}`);
          break;
      }
    });

    // 4. Run the backtest
    console.log('\n🚀 Starting backtest...');

    const endDate = new Date(latestBar.timestamp);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 6); // 6 months of data

    console.log(`   Symbol: AAPL`);
    console.log(`   Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`   Initial Cash: $10,000`);
    console.log('');

    const backtestRunId = await backtestController.runBacktest({
      strategyId: strategy.id,
      symbol: 'AAPL',
      timeHorizon: 'SWING',
      startDate,
      endDate,
      initialCash: 10000,
      positionSizing: 'FIXED_DOLLAR',
      positionSize: 1000,
      slippageBps: 10,
      commissionPerTrade: 1.0,
    });

    // 5. Wait a moment for events to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. Cleanup
    unsubscribe();

    // 7. Validate results
    console.log('\n📊 Test Results:');
    console.log(`   Backtest Run ID: ${backtestRunId}`);
    console.log(`   Events Received: ${receivedEvents.length}`);

    // Count event types
    const eventCounts: Record<string, number> = {};
    receivedEvents.forEach(event => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });

    console.log('\n📈 Event Breakdown:');
    Object.entries(eventCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Check if we got expected events
    const hasStarted = receivedEvents.some(e => e.type === 'backtest:started');
    const hasProgress = receivedEvents.some(e => e.type === 'backtest:progress');
    const hasCompleted = receivedEvents.some(e => e.type === 'backtest:completed');

    console.log('\n✅ Event Validation:');
    console.log(`   Started Event: ${hasStarted ? '✅' : '❌'}`);
    console.log(`   Progress Events: ${hasProgress ? '✅' : '❌'}`);
    console.log(`   Completion Event: ${hasCompleted ? '✅' : '❌'}`);

    if (hasStarted && hasProgress && hasCompleted) {
      console.log('\n🎉 Test PASSED! All real-time events working correctly.\n');
    } else {
      console.log('\n⚠️  Test INCOMPLETE - Some events missing.\n');
    }

    // 8. Fetch final backtest details
    const finalBacktest = await prisma.backtestRun.findUnique({
      where: { id: backtestRunId },
    });

    if (finalBacktest) {
      console.log('📋 Final Backtest Results:');
      console.log(`   Status: ${finalBacktest.status}`);
      console.log(`   Total Trades: ${finalBacktest.totalTrades || 0}`);
      console.log(`   Win Rate: ${finalBacktest.winRate?.toFixed(2) || 0}%`);
      console.log(`   Total Return: ${finalBacktest.totalReturnPct?.toFixed(2) || 0}%`);
      console.log(`   Final Equity: $${finalBacktest.finalEquity?.toFixed(2) || 0}`);
      console.log(`   Execution Time: ${finalBacktest.executionTime}ms\n`);
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
