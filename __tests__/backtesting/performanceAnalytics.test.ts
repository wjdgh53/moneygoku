/**
 * Unit Tests for PerformanceAnalytics
 *
 * Tests:
 * 1. Sharpe Ratio calculation
 * 2. Sortino Ratio calculation
 * 3. Max Drawdown calculation
 * 4. Win rate calculation
 * 5. Profit factor calculation
 * 6. Complete metrics integration
 */

import { PerformanceAnalytics } from '@/lib/services/backtesting/performanceAnalytics';
import { prisma } from '@/lib/prisma';

// Test utilities
function assertAlmostEqual(actual: number, expected: number, tolerance: number = 0.01, label: string = '') {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(`${label} Assertion failed: expected ${expected}, got ${actual} (diff: ${diff})`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test data setup
async function setupTestBacktestWithTrades() {
  // Create backtest run
  const backtestRun = await prisma.backtestRun.create({
    data: {
      strategyId: 'test-strategy',
      symbol: 'TEST',
      timeHorizon: 'SWING',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      initialCash: 10000,
      status: 'RUNNING',
    },
  });

  // Create sample trades (3 wins, 2 losses)
  await prisma.backtestTrade.createMany({
    data: [
      // Trade 1: Win (+5%)
      {
        backtestRunId: backtestRun.id,
        symbol: 'TEST',
        side: 'SELL',
        quantity: 10,
        targetPrice: 105,
        executedPrice: 104.895,
        slippage: 0.105,
        commission: 1.0,
        grossAmount: 1048.95,
        netAmount: 1047.95,
        entryPrice: 100,
        realizedPL: 47.95,
        realizedPLPct: 4.795,
        holdingPeriod: 5,
        signalBar: new Date('2024-01-05'),
        executionBar: new Date('2024-01-05'),
        exitReason: 'TAKE_PROFIT',
      },
      // Trade 2: Win (+10%)
      {
        backtestRunId: backtestRun.id,
        symbol: 'TEST',
        side: 'SELL',
        quantity: 10,
        targetPrice: 110,
        executedPrice: 109.89,
        slippage: 0.11,
        commission: 1.0,
        grossAmount: 1098.9,
        netAmount: 1097.9,
        entryPrice: 100,
        realizedPL: 97.9,
        realizedPLPct: 9.79,
        holdingPeriod: 10,
        signalBar: new Date('2024-01-10'),
        executionBar: new Date('2024-01-10'),
        exitReason: 'TAKE_PROFIT',
      },
      // Trade 3: Loss (-3%)
      {
        backtestRunId: backtestRun.id,
        symbol: 'TEST',
        side: 'SELL',
        quantity: 10,
        targetPrice: 97,
        executedPrice: 96.903,
        slippage: 0.097,
        commission: 1.0,
        grossAmount: 969.03,
        netAmount: 968.03,
        entryPrice: 100,
        realizedPL: -31.97,
        realizedPLPct: -3.197,
        holdingPeriod: 3,
        signalBar: new Date('2024-01-12'),
        executionBar: new Date('2024-01-12'),
        exitReason: 'STOP_LOSS',
      },
      // Trade 4: Win (+7%)
      {
        backtestRunId: backtestRun.id,
        symbol: 'TEST',
        side: 'SELL',
        quantity: 10,
        targetPrice: 107,
        executedPrice: 106.893,
        slippage: 0.107,
        commission: 1.0,
        grossAmount: 1068.93,
        netAmount: 1067.93,
        entryPrice: 100,
        realizedPL: 67.93,
        realizedPLPct: 6.793,
        holdingPeriod: 7,
        signalBar: new Date('2024-01-15'),
        executionBar: new Date('2024-01-15'),
        exitReason: 'TAKE_PROFIT',
      },
      // Trade 5: Loss (-2%)
      {
        backtestRunId: backtestRun.id,
        symbol: 'TEST',
        side: 'SELL',
        quantity: 10,
        targetPrice: 98,
        executedPrice: 97.902,
        slippage: 0.098,
        commission: 1.0,
        grossAmount: 979.02,
        netAmount: 978.02,
        entryPrice: 100,
        realizedPL: -21.98,
        realizedPLPct: -2.198,
        holdingPeriod: 2,
        signalBar: new Date('2024-01-17'),
        executionBar: new Date('2024-01-17'),
        exitReason: 'STOP_LOSS',
      },
    ],
  });

  // Create equity curve (simulating 10 days with varying returns)
  const baseEquity = 10000;
  const returns = [0, 0.02, 0.03, -0.01, 0.01, 0.04, -0.02, 0.02, 0.01, -0.03];

  let cumulativeEquity = baseEquity;
  for (let i = 0; i < returns.length; i++) {
    cumulativeEquity *= (1 + returns[i]);

    await prisma.backtestEquityCurve.create({
      data: {
        backtestRunId: backtestRun.id,
        timestamp: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        cash: cumulativeEquity * 0.3, // 30% cash, 70% stocks (simplified)
        stockValue: cumulativeEquity * 0.7,
        totalEquity: cumulativeEquity,
        highWaterMark: Math.max(...returns.slice(0, i + 1).map((r, idx) => {
          let eq = baseEquity;
          for (let j = 0; j <= idx; j++) eq *= (1 + returns[j]);
          return eq;
        })),
        drawdown: 0, // Will be calculated
        drawdownPct: 0, // Will be calculated
      },
    });
  }

  return backtestRun.id;
}

// Test cleanup
async function cleanupTest(backtestRunId: string) {
  await prisma.backtestTrade.deleteMany({ where: { backtestRunId } });
  await prisma.backtestPosition.deleteMany({ where: { backtestRunId } });
  await prisma.backtestEquityCurve.deleteMany({ where: { backtestRunId } });
  await prisma.backtestRun.delete({ where: { id: backtestRunId } });
}

// ============================================================================
// Test Suite
// ============================================================================

async function runTests() {
  console.log('🧪 Running PerformanceAnalytics Unit Tests\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Calculate win rate
  try {
    console.log('Test 1: Calculate win rate');
    const backtestRunId = await setupTestBacktestWithTrades();
    const analytics = new PerformanceAnalytics();

    const metrics = await analytics.calculateMetrics(backtestRunId);

    // Expected: 3 wins out of 5 trades = 60%
    assertAlmostEqual(metrics.totalTrades, 5, 0.01, 'Total trades');
    assertAlmostEqual(metrics.winningTrades, 3, 0.01, 'Winning trades');
    assertAlmostEqual(metrics.losingTrades, 2, 0.01, 'Losing trades');
    assertAlmostEqual(metrics.winRate, 60, 0.01, 'Win rate');

    await cleanupTest(backtestRunId);
    console.log('✅ Test 1 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 1 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 2: Calculate profit factor
  try {
    console.log('Test 2: Calculate profit factor');
    const backtestRunId = await setupTestBacktestWithTrades();
    const analytics = new PerformanceAnalytics();

    const metrics = await analytics.calculateMetrics(backtestRunId);

    // Expected:
    // Gross profit = 47.95 + 97.9 + 67.93 = 213.78
    // Gross loss = 31.97 + 21.98 = 53.95
    // Profit factor = 213.78 / 53.95 = 3.96

    assertAlmostEqual(metrics.profitFactor, 3.96, 0.10, 'Profit factor');

    await cleanupTest(backtestRunId);
    console.log('✅ Test 2 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 2 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 3: Calculate expectancy
  try {
    console.log('Test 3: Calculate expectancy');
    const backtestRunId = await setupTestBacktestWithTrades();
    const analytics = new PerformanceAnalytics();

    const metrics = await analytics.calculateMetrics(backtestRunId);

    // Expected:
    // Total P&L = 47.95 + 97.9 - 31.97 + 67.93 - 21.98 = 159.83
    // Expectancy = 159.83 / 5 = 31.966

    assertAlmostEqual(metrics.expectancy, 31.97, 0.10, 'Expectancy');

    await cleanupTest(backtestRunId);
    console.log('✅ Test 3 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 3 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 4: Calculate average win/loss percentages
  try {
    console.log('Test 4: Calculate average win/loss percentages');
    const backtestRunId = await setupTestBacktestWithTrades();
    const analytics = new PerformanceAnalytics();

    const metrics = await analytics.calculateMetrics(backtestRunId);

    // Expected:
    // Avg Win% = (4.795 + 9.79 + 6.793) / 3 = 7.126%
    // Avg Loss% = (-3.197 + -2.198) / 2 = -2.6975%

    assertAlmostEqual(metrics.avgWinPct, 7.13, 0.10, 'Average win %');
    assertAlmostEqual(metrics.avgLossPct, -2.70, 0.10, 'Average loss %');

    await cleanupTest(backtestRunId);
    console.log('✅ Test 4 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 4 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 5: Calculate Sharpe Ratio
  try {
    console.log('Test 5: Calculate Sharpe Ratio');
    const backtestRunId = await setupTestBacktestWithTrades();
    const analytics = new PerformanceAnalytics();

    const metrics = await analytics.calculateMetrics(backtestRunId);

    // Sharpe ratio should be calculated from equity curve
    // With positive returns and some volatility, should be > 0
    assert(metrics.sharpeRatio !== null, 'Sharpe ratio should be calculated');
    assert(metrics.sharpeRatio > 0, 'Sharpe ratio should be positive for profitable strategy');

    console.log(`   Sharpe Ratio: ${metrics.sharpeRatio.toFixed(4)}`);

    await cleanupTest(backtestRunId);
    console.log('✅ Test 5 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 5 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 6: Calculate Sortino Ratio
  try {
    console.log('Test 6: Calculate Sortino Ratio');
    const backtestRunId = await setupTestBacktestWithTrades();
    const analytics = new PerformanceAnalytics();

    const metrics = await analytics.calculateMetrics(backtestRunId);

    // Sortino should be calculated and typically higher than Sharpe
    // (since it only penalizes downside volatility)
    assert(metrics.sortinoRatio !== null, 'Sortino ratio should be calculated');
    assert(metrics.sortinoRatio > 0, 'Sortino ratio should be positive for profitable strategy');

    console.log(`   Sortino Ratio: ${metrics.sortinoRatio.toFixed(4)}`);

    await cleanupTest(backtestRunId);
    console.log('✅ Test 6 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 6 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 7: Calculate Max Drawdown
  try {
    console.log('Test 7: Calculate Max Drawdown');
    const backtestRunId = await setupTestBacktestWithTrades();
    const analytics = new PerformanceAnalytics();

    const metrics = await analytics.calculateMetrics(backtestRunId);

    // Max drawdown should be negative (loss from peak)
    assert(metrics.maxDrawdown !== null, 'Max drawdown should be calculated');
    assert(metrics.maxDrawdown < 0, 'Max drawdown should be negative');
    assert(metrics.maxDrawdownDate !== null, 'Max drawdown date should be set');

    console.log(`   Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}%`);
    console.log(`   Drawdown Date: ${metrics.maxDrawdownDate.toISOString().split('T')[0]}`);

    await cleanupTest(backtestRunId);
    console.log('✅ Test 7 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 7 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 8: Complete metrics integration
  try {
    console.log('Test 8: Complete metrics integration');
    const backtestRunId = await setupTestBacktestWithTrades();
    const analytics = new PerformanceAnalytics();

    const metrics = await analytics.calculateMetrics(backtestRunId);

    // Verify all metrics are present
    assert(metrics.totalTrades !== undefined, 'totalTrades should be defined');
    assert(metrics.winRate !== undefined, 'winRate should be defined');
    assert(metrics.finalEquity !== undefined, 'finalEquity should be defined');
    assert(metrics.totalReturn !== undefined, 'totalReturn should be defined');
    assert(metrics.totalReturnPct !== undefined, 'totalReturnPct should be defined');
    assert(metrics.sharpeRatio !== undefined, 'sharpeRatio should be defined');
    assert(metrics.sortinoRatio !== undefined, 'sortinoRatio should be defined');
    assert(metrics.maxDrawdown !== undefined, 'maxDrawdown should be defined');
    assert(metrics.profitFactor !== undefined, 'profitFactor should be defined');
    assert(metrics.expectancy !== undefined, 'expectancy should be defined');

    console.log('\n   Complete Metrics Summary:');
    console.log(`   - Total Trades: ${metrics.totalTrades}`);
    console.log(`   - Win Rate: ${metrics.winRate.toFixed(2)}%`);
    console.log(`   - Total Return: ${metrics.totalReturnPct.toFixed(2)}%`);
    console.log(`   - Sharpe Ratio: ${metrics.sharpeRatio.toFixed(4)}`);
    console.log(`   - Sortino Ratio: ${metrics.sortinoRatio.toFixed(4)}`);
    console.log(`   - Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}%`);
    console.log(`   - Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
    console.log(`   - Expectancy: $${metrics.expectancy.toFixed(2)}`);

    await cleanupTest(backtestRunId);
    console.log('\n✅ Test 8 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 8 failed:', error.message, '\n');
    testsFailed++;
  }

  // Summary
  console.log('='.repeat(60));
  console.log(`Test Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('='.repeat(60));

  return { testsPassed, testsFailed };
}

// Run tests
if (require.main === module) {
  runTests()
    .then(({ testsPassed, testsFailed }) => {
      process.exit(testsFailed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test runner failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { runTests };
