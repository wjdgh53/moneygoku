/**
 * Backtesting Test Runner
 *
 * Runs all backtesting unit tests in sequence
 *
 * Usage:
 *   npx tsx scripts/run-backtest-tests.ts
 */

import { runTests as runPortfolioTests } from '../__tests__/backtesting/virtualPortfolioEngine.test';
import { runTests as runAnalyticsTests } from '../__tests__/backtesting/performanceAnalytics.test';

async function main() {
  console.log('🚀 Running Backtesting Test Suite\n');
  console.log('='.repeat(60));
  console.log('\n');

  let totalPassed = 0;
  let totalFailed = 0;

  // Run VirtualPortfolioEngine tests
  try {
    const { testsPassed, testsFailed } = await runPortfolioTests();
    totalPassed += testsPassed;
    totalFailed += testsFailed;
  } catch (error) {
    console.error('❌ VirtualPortfolioEngine test suite failed:', error);
    totalFailed++;
  }

  console.log('\n');

  // Run PerformanceAnalytics tests
  try {
    const { testsPassed, testsFailed } = await runAnalyticsTests();
    totalPassed += testsPassed;
    totalFailed += testsFailed;
  } catch (error) {
    console.error('❌ PerformanceAnalytics test suite failed:', error);
    totalFailed++;
  }

  // Final summary
  console.log('\n');
  console.log('='.repeat(60));
  console.log('FINAL TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests Passed: ${totalPassed}`);
  console.log(`Total Tests Failed: ${totalFailed}`);
  console.log('='.repeat(60));

  if (totalFailed > 0) {
    console.log('\n❌ Some tests failed. Please review the output above.\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Test runner crashed:', error);
  process.exit(1);
});
