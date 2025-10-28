# Backtesting System - Master Implementation Plan

## Executive Summary

This document provides an overview of the three-phase backtesting system implementation for the MoneyGoku trading bot platform. The system enables historical strategy validation, performance analysis, and production monitoring through virtual portfolio simulation, automated data pipelines, and advanced dashboards.

---

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                              │
│                  (Next.js 15 Dashboard - Phase 5)                    │
│  - Strategy comparison heatmaps                                      │
│  - Interactive equity curves (Recharts)                              │
│  - Risk metrics (VaR, Sharpe, max drawdown)                          │
│  - Real-time WebSocket updates                                       │
│  - Automated alerting (performance degradation)                      │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│                    BACKTEST EXECUTION ENGINE                         │
│                (Backtest Controller - Phase 2)                       │
│  - Chronological bar replay                                          │
│  - Signal generation (reuses Report logic)                           │
│  - Position sizing strategies                                        │
│  - Performance metrics calculation                                   │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
      ┌──────────────────────────┼──────────────────────────┐
      │                          │                          │
┌─────▼──────────────┐  ┌────────▼────────────┐  ┌────────▼──────────┐
│ Virtual Portfolio  │  │ Historical Data      │  │ Performance       │
│ Engine (Phase 2)   │  │ Provider (Phase 2)   │  │ Analytics (Phase 2)│
│                    │  │                      │  │                   │
│ - Order execution  │  │ - Alpha Vantage API  │  │ - Sharpe ratio    │
│ - Slippage sim     │  │ - Cache-first loading│  │ - Max drawdown    │
│ - Position tracking│  │ - Data validation    │  │ - Win rate        │
│ - P&L calculation  │  │ - Incremental updates│  │ - Sortino ratio   │
└─────┬──────────────┘  └────────┬─────────────┘  └────────┬──────────┘
      │                          │                          │
┌─────▼──────────────────────────▼──────────────────────────▼──────────┐
│                        DATABASE (PostgreSQL)                         │
│  - BacktestRun (config, results, metrics)                            │
│  - BacktestTrade (individual buy/sell executions)                    │
│  - BacktestPosition (real-time holdings)                             │
│  - BacktestEquityCurve (equity snapshots per bar)                    │
│  - MarketData (cached OHLCV bars)                                    │
│  - MarketDataStatus (completeness tracking)                          │
│  - BacktestAlert (automated alerts)                                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Three Implementation Plans

### Phase 2: Virtual Portfolio Simulator
**Document:** `PHASE2_VIRTUAL_PORTFOLIO_SIMULATOR.md`

**Purpose:** Core backtesting engine that replays historical market data chronologically and simulates realistic trading with slippage, commissions, and position management.

**Key Components:**
- `BacktestController`: Orchestrates simulation runs, iterates through bars
- `VirtualPortfolioEngine`: Executes orders, tracks positions, calculates P&L
- `PerformanceAnalytics`: Calculates Sharpe, Sortino, max drawdown, VaR

**Database Models:**
- `BacktestRun`: Configuration and final results
- `BacktestTrade`: Trade-level execution records
- `BacktestPosition`: Real-time position tracking
- `BacktestEquityCurve`: Equity curve snapshots

**Estimated LOC:** 1,080 lines (excluding tests)

**Timeline:** 6 weeks (3 sprints)

---

### Phase 2: Historical Data Pipeline
**Document:** `PHASE2_HISTORICAL_DATA_PIPELINE.md`

**Purpose:** Automated market data collection, caching, and validation system that respects Alpha Vantage API limits (25 calls/day) through intelligent caching and incremental updates.

**Key Components:**
- `AlphaVantageClient`: Rate-limited API client (5 calls/min, 25 calls/day)
- `HistoricalDataProvider`: Cache-first data loading with validation
- `MarketDataUpdater`: Daily incremental updates (cron job)
- Batch download scripts for initial setup

**Database Models:**
- `MarketData`: Cached OHLCV bars with validation flags
- `MarketDataStatus`: Completeness and quality tracking
- `AlphaVantageApiLog`: API usage monitoring

**Estimated LOC:** 1,210 lines (excluding tests)

**Timeline:** 5 weeks (3 sprints)

---

### Phase 5: Advanced Dashboard & Monitoring
**Document:** `PHASE5_ADVANCED_DASHBOARD_MONITORING.md`

**Purpose:** Production-grade dashboard for visualizing backtest results, comparing strategies, monitoring performance, and receiving automated alerts.

**Key Features:**
- **Main Dashboard:** Strategy performance heatmap, metrics cards, recent backtests
- **Detail View:** Interactive equity curve, drawdown analysis, trade-by-trade breakdown
- **Risk Metrics:** VaR (95%, 99%), CVaR, Sharpe, Sortino, max consecutive losses
- **Comparison:** Side-by-side strategy comparison with aligned equity curves
- **Alerts:** Automated alerts for win rate drops, drawdown breaches, Sharpe decline
- **Export:** PDF reports, Excel spreadsheets
- **Real-time:** WebSocket streaming of backtest progress

**Technology Stack:**
- Next.js 15 (App Router, Server Components)
- Recharts (charts), D3.js (advanced viz)
- Socket.io (WebSocket)
- Tailwind CSS (styling)

**Estimated LOC:** 1,440 lines

**Timeline:** 7 weeks (4 sprints)

---

## Integration Points

### 1. Signal Generation (Reusing Report Logic)

The backtesting system **must reuse** the existing `Report` scoring logic to ensure signals match production behavior:

```typescript
// In BacktestController.evaluateEntrySignal()

// Current production logic (from Report model):
// - technicalScore: 0.5 or -0.5 (technical indicators)
// - baseScore: newsScore * 0.7 + technicalScore * 0.3
// - gptAdjustment: ±0.5 (AI interpretation)
// - finalScore: baseScore + gptAdjustment

// Backtest must replicate this exact calculation:
const technicalScore = evaluateTechnicalConditions(strategy.entryConditions);
const newsScore = await newsAnalysisService.analyzeNews(symbol);
const baseScore = newsScore * 0.7 + technicalScore * 0.3;
const aiDecision = await aiTradingService.makeUnifiedDecision({
  symbol,
  currentPrice,
  technicalSignal: technicalScore > 0,
  newsAnalysis: newsScore,
  ...
});

const finalScore = baseScore + aiDecision.gptAdjustment;

if (finalScore > ENTRY_THRESHOLD) {
  return { shouldEnter: true, finalScore };
}
```

### 2. Data Flow

```
User starts backtest
  ↓
BacktestController.runBacktest()
  ↓
HistoricalDataProvider.loadHistoricalBars()
  ├─ Check MarketData cache
  ├─ If missing → AlphaVantageClient.fetchTimeSeries()
  └─ Return chronologically ordered bars
  ↓
For each bar:
  ├─ VirtualPortfolioEngine.updateCurrentPrice()
  ├─ Evaluate exit conditions (if holding position)
  │  └─ If exit → VirtualPortfolioEngine.executeSellOrder()
  ├─ Evaluate entry conditions (if no position)
  │  └─ If entry → VirtualPortfolioEngine.executeBuyOrder()
  └─ VirtualPortfolioEngine.recordEquityCurveSnapshot()
  ↓
PerformanceAnalytics.calculateMetrics()
  ↓
BacktestAlertService.checkForAlerts()
  ↓
Dashboard displays results
```

### 3. API Endpoints

```typescript
// Start backtest
POST /api/backtests
Body: {
  strategyId: string;
  symbol: string;
  timeHorizon: 'SHORT_TERM' | 'SWING' | 'LONG_TERM';
  startDate: string;
  endDate: string;
  initialCash: number;
  positionSizing: string;
  slippageBps: number;
}
Response: { backtestRunId: string }

// Get backtest results
GET /api/backtests/:id
Response: BacktestRun (with trades, positions, equity curve)

// Get equity curve data
GET /api/backtests/:id/equity-curve
Response: BacktestEquityCurve[]

// Compare multiple backtests
GET /api/backtests/compare?ids=id1,id2,id3
Response: BacktestRun[]

// Export to PDF
GET /api/backtests/:id/export/pdf
Response: PDF file download

// Export to Excel
GET /api/backtests/:id/export/excel
Response: Excel file download
```

---

## Alpha Vantage API Budget Management

### Free Tier Constraints
- **25 calls/day** (resets at midnight ET)
- **5 calls/minute** (rate limiting)

### Optimizations

#### 1. Initial Data Download Strategy
```
Day 1: Download daily data for all symbols (1 call per symbol × 10 symbols = 10 calls)
Day 2: Download 60min data for priority symbols (2 calls per symbol × 10 symbols = 20 calls)
Day 3: Download 60min data continued (5 more symbols)
Day 4: Download 15min data for day trading symbols (3 calls per symbol × 8 symbols = 24 calls)
Day 5: Complete remaining 15min downloads

Total: 5 days to complete initial download for 10-15 symbols
```

#### 2. Daily Maintenance Updates
```
Daily (6:30 PM ET after market close):
- Update all symbols with "compact" mode (last 100 bars)
- 1 API call per symbol
- 15 symbols × 1 call = 15 calls/day
- Remaining 10 calls reserved for on-demand backtest data gaps
```

#### 3. Cache Hit Rate Target
- **>95%** of backtest queries should hit cache
- Only fetch from API if data missing or outdated (>24 hours)

#### 4. Priority Queue
```typescript
// Prioritize symbols by importance
const priority = [
  ...activeBots.map(b => b.symbol),        // Highest: Bots currently trading
  ...recentTrades.map(t => t.symbol),      // Medium: Recently traded symbols
  ...watchlist.map(w => w.symbol)          // Low: Watchlist symbols
];

// Update in priority order until API limit reached
```

---

## Data Quality Thresholds

### Completeness Targets
- **Daily bars:** >98% complete (expect 252 bars/year)
- **Intraday bars:** >95% complete (market hours only)
- **Gap tolerance:** <1% of expected bars missing

### Validation Rules
```typescript
// Flag as anomaly if:
- volume === 0 (zero volume bar)
- high / low > 1.5 (>50% intraday move - likely error)
- timestamp gap > 3× expected interval (missing data)
- price === 0 (data quality issue)

// Action: Mark isAnomaly = true, exclude from backtests
```

### Data Freshness
- **Latest bar:** Within 24 hours of market close
- **Historical backfill:** Complete 2 years minimum
- **Update frequency:** Daily at 6:30 PM ET

---

## Performance Benchmarks

### Backtest Execution Speed
- **Daily data (500 bars):** <30 seconds
- **60min data (2,500 bars):** <2 minutes
- **15min data (10,000 bars):** <5 minutes

### Dashboard Load Times
- **Main dashboard:** <2 seconds (20 backtests)
- **Detail page:** <1 second (1 backtest with 500 trades)
- **Equity curve chart:** <1 second (500 points)
- **Export PDF:** <5 seconds
- **Export Excel:** <3 seconds

### Database Query Optimization
```sql
-- Critical indexes
CREATE INDEX idx_backtest_runs_strategy ON backtest_runs(strategyId);
CREATE INDEX idx_backtest_runs_status ON backtest_runs(status);
CREATE INDEX idx_backtest_trades_run ON backtest_trades(backtestRunId);
CREATE INDEX idx_market_data_symbol_interval ON market_data(symbol, interval);
CREATE INDEX idx_equity_curve_run_timestamp ON backtest_equity_curve(backtestRunId, timestamp);
```

---

## Risk Management

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Signal generation differs from production | **HIGH** | High | Extract and reuse exact Report logic, unit test parity |
| Alpha Vantage API limit exhaustion | High | High | Priority queue, aggressive caching, 95%+ cache hit rate |
| Historical data quality issues | High | Medium | Validation pipeline, manual data review, multiple sources (future) |
| Backtest performance (large datasets) | Medium | Medium | Optimize queries, batch processing, streaming data |
| Dashboard rendering lag (10k+ points) | Medium | Low | Data downsampling, lazy loading, virtualization |

### Mitigation Strategies

1. **Signal Accuracy:**
   - Extract signal generation into standalone service
   - Unit test against actual Reports in production
   - Manual validation: Compare backtest signals to historical Reports

2. **API Limits:**
   - Implement circuit breaker (stop fetching if limit hit)
   - Daily usage dashboard
   - Automated email alerts at 80% quota usage

3. **Data Quality:**
   - Run validation checks after each fetch
   - Flag anomalous bars (zero volume, extreme moves)
   - Weekly data quality report

4. **Performance:**
   - Use database transactions for batch inserts
   - Implement equity curve snapshots every N bars (not every bar)
   - Cache expensive calculations (Sharpe, Sortino)

---

## Success Metrics

### Correctness
- **Signal Parity:** >95% match between backtest and production Reports
- **P&L Accuracy:** Realized P&L matches manual calculation within $0.01
- **Metrics Validation:** Sharpe/Sortino calculations match published formulas

### Performance
- **Cache Hit Rate:** >95% for backtest data queries
- **Backtest Speed:** 500 bars in <30 seconds
- **Dashboard Load:** <2 seconds for main page

### Data Quality
- **Completeness:** >95% of expected bars present
- **Freshness:** Latest bar within 24 hours
- **Anomaly Rate:** <0.5% flagged bars

### User Adoption
- **Dashboard Usage:** >80% of backtests viewed via dashboard
- **Alert Engagement:** >50% of alerts result in user action
- **Export Usage:** >30% of backtests exported

---

## Implementation Timeline

### Overall Schedule: 18 weeks (4.5 months)

```
Week 1-6: Phase 2 - Virtual Portfolio Simulator
  ├─ Sprint 1 (W1-2): Database & core architecture
  ├─ Sprint 2 (W3-4): Signal generation integration
  └─ Sprint 3 (W5-6): Edge cases & testing

Week 7-11: Phase 2 - Historical Data Pipeline
  ├─ Sprint 1 (W7-8): Core infrastructure
  ├─ Sprint 2 (W9-10): Batch downloads & validation
  └─ Sprint 3 (W11): Daily updates & monitoring

Week 12-18: Phase 5 - Advanced Dashboard & Monitoring
  ├─ Sprint 1 (W12-13): Core dashboard pages
  ├─ Sprint 2 (W14-15): Advanced visualizations
  ├─ Sprint 3 (W16-17): Comparison & alerts
  └─ Sprint 4 (W18): Export & polish
```

### Parallel Development Opportunities

- **Weeks 7-11:** Dashboard mockups and UI design (while data pipeline is building)
- **Weeks 3-6:** Initial data download scripts (while simulator is building)
- **Weeks 1-18:** Documentation and testing (continuous)

---

## Code Organization

```
/docs/backtesting/
├── MASTER_IMPLEMENTATION_PLAN.md          (this file)
├── PHASE2_VIRTUAL_PORTFOLIO_SIMULATOR.md  (1,080 LOC)
├── PHASE2_HISTORICAL_DATA_PIPELINE.md     (1,210 LOC)
└── PHASE5_ADVANCED_DASHBOARD_MONITORING.md (1,440 LOC)

/lib/services/backtesting/
├── backtestController.ts                   (350 LOC)
├── virtualPortfolioEngine.ts               (280 LOC)
├── performanceAnalytics.ts                 (200 LOC)
├── historicalDataProvider.ts               (380 LOC)
├── alphaVantageClient.ts                   (250 LOC)
├── marketDataUpdater.ts                    (100 LOC)
├── backtestAlertService.ts                 (100 LOC)
└── backtestStreamService.ts                (50 LOC)

/app/dashboard/backtesting/
├── page.tsx                                (150 LOC)
├── [id]/page.tsx                           (120 LOC)
├── [id]/compare/page.tsx                   (80 LOC)
└── new/page.tsx                            (100 LOC)

/components/backtest/
├── EquityCurveChart.tsx                    (100 LOC)
├── DrawdownChart.tsx                       (80 LOC)
├── PerformanceHeatmap.tsx                  (80 LOC)
├── RiskMetricsGrid.tsx                     (150 LOC)
├── MonthlyReturnsCalendar.tsx              (90 LOC)
└── ... (8 more components)

/scripts/
├── backtest-data-download.ts               (150 LOC)
├── validate-data-quality.ts                (100 LOC)
└── compress-old-data.ts                    (50 LOC)

/prisma/migrations/
├── YYYYMMDD_add_backtest_models.sql
└── YYYYMMDD_add_market_data_pipeline.sql

/__tests__/
├── virtualPortfolio.test.ts                (150 LOC)
├── performanceMetrics.test.ts              (100 LOC)
├── dataValidation.test.ts                  (80 LOC)
└── ... (more test files)
```

**Total Estimated LOC:** 3,730 lines (excluding tests)

---

## Dependencies

### Required npm Packages
```json
{
  "dependencies": {
    "recharts": "^2.10.0",              // Charts
    "socket.io": "^4.7.0",              // WebSocket
    "socket.io-client": "^4.7.0",       // WebSocket client
    "xlsx": "^0.18.5",                  // Excel export
    "jspdf": "^2.5.0",                  // PDF generation
    "node-cron": "^3.0.3"               // Cron jobs
  }
}
```

### Environment Variables
```env
# Alpha Vantage API
ALPHA_VANTAGE_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/moneygoku

# Optional: Upgrade to premium tier for more API calls
ALPHA_VANTAGE_TIER=free  # or premium
```

---

## Testing Strategy

### Unit Tests
- Virtual portfolio execution logic (buy/sell, P&L calculation)
- Performance metrics calculations (Sharpe, Sortino, VaR)
- Data validation rules (gap detection, anomaly filtering)

### Integration Tests
- End-to-end backtest execution (sample strategy on AAPL)
- API rate limiting enforcement
- Database transaction integrity

### Manual Testing
- Compare backtest signals to production Reports (10 symbols, 1 month)
- Validate equity curve matches manual calculation
- Test dashboard on mobile devices

### Performance Testing
- Benchmark backtest speed (500, 2500, 10000 bars)
- Load test dashboard (50 concurrent users)
- Memory profiling (large datasets)

---

## Deployment Checklist

### Pre-Launch
- [ ] Run initial batch data download (5 days)
- [ ] Validate data completeness (>95% for all symbols)
- [ ] Execute test backtests for all strategies
- [ ] Compare backtest results to historical Reports (manual spot check)
- [ ] Set up cron job for daily data updates
- [ ] Configure monitoring alerts (API quota, data freshness)

### Launch
- [ ] Deploy database migrations
- [ ] Deploy backend services
- [ ] Deploy frontend dashboard
- [ ] Enable WebSocket server
- [ ] Test alert notifications

### Post-Launch
- [ ] Monitor API usage (should stay <20 calls/day for maintenance)
- [ ] Review data quality reports weekly
- [ ] Collect user feedback on dashboard
- [ ] Track success metrics (cache hit rate, dashboard usage)

---

## Future Enhancements

### Short-term (3-6 months)
1. **Monte Carlo Simulation:** Run 1000+ randomized backtests to estimate confidence intervals
2. **Walk-Forward Optimization:** Optimize strategy parameters on rolling windows
3. **Parameter Sensitivity Analysis:** Heatmap of strategy performance vs parameter values
4. **Multi-symbol Backtests:** Test portfolio strategies (e.g., pairs trading, sector rotation)

### Medium-term (6-12 months)
1. **Multiple Data Sources:** Add Polygon.io, FMP as fallback data providers
2. **Greeks Calculation:** Delta, Gamma, Vega for options strategies
3. **Regime Detection:** Identify market regimes (bull, bear, sideways) and adapt strategies
4. **Machine Learning Integration:** Train ML models on backtest results

### Long-term (12+ months)
1. **Paper Trading Backtests:** Run strategies on paper trading account for forward validation
2. **Live Trading Integration:** Seamlessly transition from backtest → paper → live
3. **Community Strategies:** Share and compare strategies with other users
4. **Advanced Order Types:** Limit orders, stop-limit, trailing stops in backtests

---

## Conclusion

This comprehensive backtesting system provides a production-ready platform for:

1. **Strategy Validation:** Test trading strategies on 2+ years of historical data
2. **Performance Analysis:** Calculate risk-adjusted returns (Sharpe, Sortino, VaR)
3. **Strategy Comparison:** Compare multiple strategies side-by-side
4. **Production Monitoring:** Automated alerts for performance degradation
5. **Data Management:** Efficient caching with 95%+ hit rate despite API limits

**Total Implementation Time:** 18 weeks (4.5 months)
**Total Lines of Code:** ~3,730 LOC (excluding tests)
**Key Constraint:** Alpha Vantage free tier (25 calls/day) - mitigated through aggressive caching

**Next Steps:**
1. Review and approve all three phase documents
2. Set up project tracking (GitHub Projects, Jira)
3. Begin Phase 2 Sprint 1: Virtual Portfolio Simulator database schema
4. Run initial batch data download (parallel with simulator development)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-28
**Author:** MoneyGoku Development Team
