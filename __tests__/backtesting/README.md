# Backtesting System - Unit Tests

This directory contains comprehensive unit tests for the backtesting system.

## Test Suites

### 1. VirtualPortfolioEngine Tests (`virtualPortfolioEngine.test.ts`)

Tests the core portfolio management and order execution engine:

- ✅ Portfolio initialization
- ✅ Buy order execution with slippage and commission
- ✅ Position averaging (adding to existing positions)
- ✅ Sell order execution with realized P&L calculation
- ✅ Partial position closing
- ✅ Equity curve snapshot recording

**Coverage:**
- Order execution accuracy
- Slippage calculation (10 bps = 0.1%)
- Commission handling ($1 per trade)
- Cost basis tracking
- P&L calculation (realized and unrealized)

### 2. PerformanceAnalytics Tests (`performanceAnalytics.test.ts`)

Tests the performance metrics calculation system:

- ✅ Win rate calculation
- ✅ Profit factor (gross profit / gross loss)
- ✅ Expectancy (average P&L per trade)
- ✅ Average win/loss percentages
- ✅ Sharpe Ratio calculation
- ✅ Sortino Ratio calculation
- ✅ Maximum Drawdown calculation
- ✅ Complete metrics integration

**Coverage:**
- Trade-level metrics
- Risk-adjusted returns (Sharpe, Sortino)
- Drawdown analysis
- Statistical metrics

## Running Tests

### Run All Tests

```bash
npx tsx scripts/run-backtest-tests.ts
```

### Run Individual Test Suite

```bash
# VirtualPortfolioEngine tests
npx tsx __tests__/backtesting/virtualPortfolioEngine.test.ts

# PerformanceAnalytics tests
npx tsx __tests__/backtesting/performanceAnalytics.test.ts
```

## Test Database Setup

Tests automatically:
- Create temporary backtest runs
- Generate test trades and positions
- Clean up all test data after completion

**⚠️ Important:** Tests use the real database with temporary data. Ensure your `DATABASE_URL` is configured in `.env`.

## Expected Output

Successful test run:
```
🧪 Running VirtualPortfolioEngine Unit Tests

Test 1: Initialize portfolio
✅ Test 1 passed

Test 2: Execute buy order with slippage and commission
✅ Test 2 passed

...

============================================================
Test Results: 6 passed, 0 failed
============================================================
```

## Test Coverage

| Component | Tests | Coverage |
|-----------|-------|----------|
| VirtualPortfolioEngine | 6 tests | Core order execution, P&L |
| PerformanceAnalytics | 8 tests | All risk metrics |
| **Total** | **14 tests** | **Core backtesting logic** |

## TODO: Future Tests

- [ ] Integration test: End-to-end backtest workflow
- [ ] Historical data provider tests
- [ ] Backtest controller tests
- [ ] Signal generation validation tests
- [ ] Edge cases: insufficient cash, zero volume bars, data gaps
- [ ] Performance tests: 10k+ bars simulation
- [ ] Concurrency tests: multiple backtests in parallel

## Debugging Failed Tests

If tests fail:

1. **Check database connection:**
   ```bash
   npx prisma studio
   ```

2. **Check for existing test data:**
   ```sql
   SELECT * FROM backtest_runs WHERE "strategyId" = 'test-strategy';
   ```

3. **Run tests with verbose logging:**
   ```bash
   NODE_ENV=test npx tsx __tests__/backtesting/virtualPortfolioEngine.test.ts
   ```

4. **Cleanup orphaned test data:**
   ```bash
   npx tsx scripts/cleanup-test-data.ts
   ```

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Use descriptive test names
3. Add assertion error messages
4. Clean up test data in `finally` blocks
5. Update this README with new test coverage
