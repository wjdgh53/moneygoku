/**
 * Unit Tests for VirtualPortfolioEngine
 *
 * Tests:
 * 1. Order execution with slippage
 * 2. Commission calculation
 * 3. Position averaging
 * 4. P&L calculation
 * 5. Partial position closing
 * 6. Equity curve tracking
 */

import { VirtualPortfolioEngine } from '@/lib/services/backtesting/virtualPortfolioEngine';
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
async function setupTestBacktestRun() {
  // Create a test backtest run
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

  return backtestRun.id;
}

// Test cleanup
async function cleanupTest(backtestRunId: string) {
  // Delete test data
  await prisma.backtestTrade.deleteMany({ where: { backtestRunId } });
  await prisma.backtestPosition.deleteMany({ where: { backtestRunId } });
  await prisma.backtestEquityCurve.deleteMany({ where: { backtestRunId } });
  await prisma.backtestRun.delete({ where: { id: backtestRunId } });
}

// ============================================================================
// Test Suite
// ============================================================================

async function runTests() {
  console.log('🧪 Running VirtualPortfolioEngine Unit Tests\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Initialize portfolio
  try {
    console.log('Test 1: Initialize portfolio');
    const backtestRunId = await setupTestBacktestRun();
    const engine = new VirtualPortfolioEngine();

    engine.initialize({
      backtestRunId,
      initialCash: 10000,
      slippageBps: 10, // 0.1%
      commissionPerTrade: 1.0,
    });

    assertAlmostEqual(engine.getCash(), 10000, 0.01, 'Initial cash');
    assert(engine.getPosition('TEST') === undefined, 'No initial position');

    await cleanupTest(backtestRunId);
    console.log('✅ Test 1 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 1 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 2: Execute buy order with slippage and commission
  try {
    console.log('Test 2: Execute buy order with slippage and commission');
    const backtestRunId = await setupTestBacktestRun();
    const engine = new VirtualPortfolioEngine();

    engine.initialize({
      backtestRunId,
      initialCash: 10000,
      slippageBps: 10, // 0.1%
      commissionPerTrade: 1.0,
    });

    // Buy 10 shares @ $100
    await engine.executeBuyOrder({
      backtestRunId,
      symbol: 'TEST',
      quantity: 10,
      targetPrice: 100,
      signalBar: new Date('2024-01-01'),
      executionBar: new Date('2024-01-01'),
      entryReason: 'TEST',
    });

    // Expected:
    // Execution price = 100 + (100 * 0.001) = 100.10
    // Gross amount = 10 * 100.10 = 1001.00
    // Commission = 1.00
    // Net amount = 1002.00
    // Cash remaining = 10000 - 1002 = 8998.00

    assertAlmostEqual(engine.getCash(), 8998, 0.01, 'Cash after buy');

    const position = engine.getPosition('TEST');
    assert(position !== undefined, 'Position should exist');
    assertAlmostEqual(position.quantity, 10, 0.01, 'Position quantity');
    assertAlmostEqual(position.avgEntryPrice, 100.10, 0.01, 'Average entry price');
    assertAlmostEqual(position.totalCost, 1002, 0.01, 'Total cost');

    await cleanupTest(backtestRunId);
    console.log('✅ Test 2 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 2 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 3: Position averaging (add to existing position)
  try {
    console.log('Test 3: Position averaging');
    const backtestRunId = await setupTestBacktestRun();
    const engine = new VirtualPortfolioEngine();

    engine.initialize({
      backtestRunId,
      initialCash: 10000,
      slippageBps: 10,
      commissionPerTrade: 1.0,
    });

    // First buy: 10 shares @ $100
    await engine.executeBuyOrder({
      backtestRunId,
      symbol: 'TEST',
      quantity: 10,
      targetPrice: 100,
      signalBar: new Date('2024-01-01'),
      executionBar: new Date('2024-01-01'),
      entryReason: 'TEST',
    });

    // Second buy: 10 shares @ $110
    await engine.executeBuyOrder({
      backtestRunId,
      symbol: 'TEST',
      quantity: 10,
      targetPrice: 110,
      signalBar: new Date('2024-01-02'),
      executionBar: new Date('2024-01-02'),
      entryReason: 'TEST',
    });

    // Expected:
    // First: 10 shares @ 100.10 = 1002.00 (including commission)
    // Second: 10 shares @ 110.11 = 1102.10 (including commission)
    // Total cost: 2104.10
    // Average price: 2104.10 / 20 = 105.205

    const position = engine.getPosition('TEST');
    assertAlmostEqual(position.quantity, 20, 0.01, 'Total position quantity');
    assertAlmostEqual(position.avgEntryPrice, 105.205, 0.01, 'Average entry price');
    assertAlmostEqual(position.totalCost, 2104.10, 0.10, 'Total cost');

    await cleanupTest(backtestRunId);
    console.log('✅ Test 3 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 3 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 4: Execute sell order with realized P&L
  try {
    console.log('Test 4: Execute sell order with realized P&L');
    const backtestRunId = await setupTestBacktestRun();
    const engine = new VirtualPortfolioEngine();

    engine.initialize({
      backtestRunId,
      initialCash: 10000,
      slippageBps: 10,
      commissionPerTrade: 1.0,
    });

    // Buy 10 shares @ $100
    await engine.executeBuyOrder({
      backtestRunId,
      symbol: 'TEST',
      quantity: 10,
      targetPrice: 100,
      signalBar: new Date('2024-01-01'),
      executionBar: new Date('2024-01-01'),
      entryReason: 'TEST',
    });

    // Sell 10 shares @ $110 (10% profit)
    await engine.executeSellOrder({
      backtestRunId,
      symbol: 'TEST',
      targetPrice: 110,
      signalBar: new Date('2024-01-05'),
      executionBar: new Date('2024-01-05'),
      exitReason: 'TEST',
      quantity: 10,
    });

    // Expected:
    // Entry: 10 @ 100.10 = 1002.00 (cost)
    // Exit price = 110 - (110 * 0.001) = 109.89
    // Exit proceeds = 10 * 109.89 - 1 = 1097.90
    // Realized P&L = 1097.90 - 1002.00 = 95.90
    // Cash = 8998 + 1097.90 = 10095.90

    assertAlmostEqual(engine.getCash(), 10095.90, 0.10, 'Cash after sell');

    const position = engine.getPosition('TEST');
    assert(position === undefined || !position.isOpen, 'Position should be closed');

    await cleanupTest(backtestRunId);
    console.log('✅ Test 4 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 4 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 5: Partial position close
  try {
    console.log('Test 5: Partial position close');
    const backtestRunId = await setupTestBacktestRun();
    const engine = new VirtualPortfolioEngine();

    engine.initialize({
      backtestRunId,
      initialCash: 10000,
      slippageBps: 10,
      commissionPerTrade: 1.0,
    });

    // Buy 20 shares @ $100
    await engine.executeBuyOrder({
      backtestRunId,
      symbol: 'TEST',
      quantity: 20,
      targetPrice: 100,
      signalBar: new Date('2024-01-01'),
      executionBar: new Date('2024-01-01'),
      entryReason: 'TEST',
    });

    // Sell only 10 shares @ $110
    await engine.executeSellOrder({
      backtestRunId,
      symbol: 'TEST',
      targetPrice: 110,
      signalBar: new Date('2024-01-05'),
      executionBar: new Date('2024-01-05'),
      exitReason: 'TEST',
      quantity: 10,
    });

    const position = engine.getPosition('TEST');
    assert(position !== undefined && position.isOpen, 'Position should still be open');
    assertAlmostEqual(position.quantity, 10, 0.01, 'Remaining position quantity');

    await cleanupTest(backtestRunId);
    console.log('✅ Test 5 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 5 failed:', error.message, '\n');
    testsFailed++;
  }

  // Test 6: Equity curve snapshot
  try {
    console.log('Test 6: Equity curve snapshot');
    const backtestRunId = await setupTestBacktestRun();
    const engine = new VirtualPortfolioEngine();

    engine.initialize({
      backtestRunId,
      initialCash: 10000,
      slippageBps: 10,
      commissionPerTrade: 1.0,
    });

    // Buy 10 shares @ $100
    await engine.executeBuyOrder({
      backtestRunId,
      symbol: 'TEST',
      quantity: 10,
      targetPrice: 100,
      signalBar: new Date('2024-01-01'),
      executionBar: new Date('2024-01-01'),
      entryReason: 'TEST',
    });

    // Update price to $110
    await engine.updateCurrentPrice('TEST', 110, new Date('2024-01-02'));

    // Record equity snapshot
    await engine.recordEquityCurveSnapshot(new Date('2024-01-02'));

    // Expected:
    // Cash: 8998
    // Stock value: 10 * 110 = 1100
    // Total equity: 10098

    const snapshot = await prisma.backtestEquityCurve.findFirst({
      where: { backtestRunId },
      orderBy: { timestamp: 'desc' },
    });

    assert(snapshot !== null, 'Snapshot should exist');
    assertAlmostEqual(snapshot.cash, 8998, 0.10, 'Snapshot cash');
    assertAlmostEqual(snapshot.stockValue, 1100, 0.10, 'Snapshot stock value');
    assertAlmostEqual(snapshot.totalEquity, 10098, 0.10, 'Snapshot total equity');

    await cleanupTest(backtestRunId);
    console.log('✅ Test 6 passed\n');
    testsPassed++;
  } catch (error: any) {
    console.error('❌ Test 6 failed:', error.message, '\n');
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
