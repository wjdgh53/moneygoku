# Backtesting System Documentation

This directory contains comprehensive technical implementation plans for the MoneyGoku backtesting system.

---

## Quick Navigation

### 📋 Master Plan
**[MASTER_IMPLEMENTATION_PLAN.md](./MASTER_IMPLEMENTATION_PLAN.md)**
- System architecture overview
- Integration points between phases
- 18-week implementation timeline
- Success metrics and risk assessment
- Alpha Vantage API budget management
- **Start here for project overview**

---

## Implementation Plans (3 Documents)

### 🎮 Phase 2: Virtual Portfolio Simulator
**[PHASE2_VIRTUAL_PORTFOLIO_SIMULATOR.md](./PHASE2_VIRTUAL_PORTFOLIO_SIMULATOR.md)**

**What it does:** Core backtesting engine that replays historical market data chronologically and simulates realistic trading.

**Key features:**
- Order execution with slippage and commissions
- Position management (cash, holdings, P&L tracking)
- Performance metrics (Sharpe, Sortino, max drawdown)
- Risk management (stop loss, take profit, position sizing)

**Database models:**
- `BacktestRun`: Configuration and final results
- `BacktestTrade`: Trade-level execution records
- `BacktestPosition`: Real-time position tracking
- `BacktestEquityCurve`: Equity curve snapshots

**Timeline:** 6 weeks (3 sprints)
**LOC:** 1,080 lines

---

### 📊 Phase 2: Historical Data Pipeline
**[PHASE2_HISTORICAL_DATA_PIPELINE.md](./PHASE2_HISTORICAL_DATA_PIPELINE.md)**

**What it does:** Automated market data collection, caching, and validation system that respects Alpha Vantage's strict API limits.

**Key features:**
- Rate-limited API client (5 calls/min, 25 calls/day)
- Intelligent caching (95%+ hit rate)
- Data validation (gap detection, anomaly filtering)
- Automated daily updates (cron job)
- Batch download scripts for initial setup

**Database models:**
- `MarketData`: Cached OHLCV bars with validation flags
- `MarketDataStatus`: Completeness and quality tracking
- `AlphaVantageApiLog`: API usage monitoring

**Timeline:** 5 weeks (3 sprints)
**LOC:** 1,210 lines

---

### 📈 Phase 5: Advanced Dashboard & Monitoring
**[PHASE5_ADVANCED_DASHBOARD_MONITORING.md](./PHASE5_ADVANCED_DASHBOARD_MONITORING.md)**

**What it does:** Production-grade dashboard for visualizing backtest results, comparing strategies, and monitoring performance.

**Key features:**
- Interactive equity curve charts (Recharts)
- Performance heatmap (strategy × symbol)
- Risk metrics dashboard (VaR, CVaR, Sharpe, Sortino)
- Side-by-side strategy comparison
- Automated alerting (win rate drops, drawdown breaches)
- Export to PDF/Excel
- Real-time WebSocket updates

**Technology:**
- Next.js 15 (App Router, Server Components)
- Recharts (charts), D3.js (advanced viz)
- Socket.io (WebSocket), Tailwind CSS

**Timeline:** 7 weeks (4 sprints)
**LOC:** 1,440 lines

---

## Quick Start Guide

### For Developers Starting Implementation

1. **Read the Master Plan first:**
   ```bash
   open docs/backtesting/MASTER_IMPLEMENTATION_PLAN.md
   ```

2. **Review system architecture diagram** (in Master Plan)

3. **Understand constraints:**
   - Alpha Vantage: 25 API calls/day (free tier)
   - Must reuse existing Report scoring logic
   - Paper trading only (no real money)

4. **Start with Phase 2 (Virtual Portfolio Simulator):**
   - Sprint 1: Database schema + VirtualPortfolioEngine
   - Sprint 2: Signal generation integration
   - Sprint 3: Edge cases & testing

5. **Parallel work on Historical Data Pipeline:**
   - Run batch download script (takes 5 days)
   - Set up daily cron job

6. **Finish with Dashboard (Phase 5):**
   - Build after simulator and data pipeline are functional
   - Enables visual validation of backtest results

---

## Key Metrics

### System Overview
- **Total LOC:** 3,730 lines (excluding tests)
- **Total Timeline:** 18 weeks (4.5 months)
- **Database Models:** 11 new tables
- **API Endpoints:** 6 new routes
- **Dashboard Pages:** 5 pages + 10 components

### Performance Targets
- **Backtest Speed:** 500 bars in <30 seconds
- **Cache Hit Rate:** >95%
- **Dashboard Load:** <2 seconds
- **Data Completeness:** >95%

### Success Criteria
- **Signal Parity:** >95% match with production Reports
- **P&L Accuracy:** Within $0.01 of manual calculation
- **API Efficiency:** <20 calls/day for maintenance

---

## Database Schema Changes

### New Tables (11 total)
1. `backtest_runs` - Backtest configuration and results
2. `backtest_trades` - Trade-level executions
3. `backtest_positions` - Real-time position tracking
4. `backtest_equity_curve` - Equity snapshots per bar
5. `market_data` (enhanced) - Cached OHLCV bars
6. `market_data_status` - Data completeness tracking
7. `alpha_vantage_api_logs` - API usage monitoring
8. `backtest_alerts` - Automated alerts

### Migration Scripts
Located in each phase document:
- Phase 2 Simulator: `YYYYMMDD_add_backtest_models.sql`
- Phase 2 Data Pipeline: `YYYYMMDD_add_market_data_pipeline.sql`

---

## API Endpoints

### Backtest Execution
```
POST   /api/backtests              - Start new backtest
GET    /api/backtests/:id          - Get backtest results
GET    /api/backtests/:id/equity-curve - Get equity curve data
GET    /api/backtests/compare      - Compare multiple backtests
```

### Export
```
GET    /api/backtests/:id/export/pdf   - Export to PDF
GET    /api/backtests/:id/export/excel - Export to Excel
```

### WebSocket
```
socket.io namespace: /backtesting
Events:
  - subscribe(backtestRunId)
  - progress(data)
  - complete(metrics)
```

---

## Alpha Vantage API Budget

### Free Tier Limits
- **25 calls/day** (resets midnight ET)
- **5 calls/minute** (rate limiting)

### Optimization Strategy
```
Initial Download (5 days):
  Day 1: Daily data for all symbols (10 calls)
  Day 2-3: 60min data (20 calls/day)
  Day 4-5: 15min data (24 calls/day)

Daily Maintenance:
  6:30 PM ET: Update all symbols (15 calls)
  Reserve 10 calls for on-demand gaps
```

### Cache Strategy
- Store all fetched data in `market_data` table
- 95%+ of backtests should hit cache
- Only fetch if data missing or >24 hours old

---

## Testing Strategy

### Unit Tests
- VirtualPortfolioEngine (order execution, P&L)
- PerformanceAnalytics (Sharpe, Sortino, VaR)
- Data validation (gap detection, anomalies)

### Integration Tests
- End-to-end backtest (AAPL, 2 years)
- API rate limiting enforcement
- Database transaction integrity

### Manual Validation
- Compare backtest signals to production Reports
- Validate equity curve calculations
- Test dashboard on mobile

---

## Risk Assessment

### Critical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Signal generation differs from production | **HIGH** | Extract exact Report logic, unit test parity |
| API limit exhaustion | High | Aggressive caching (95%+ hit rate), priority queue |
| Data quality issues | High | Validation pipeline, anomaly detection |

### Mitigation Strategies
1. **Signal Accuracy:** Reuse production Report logic exactly
2. **API Limits:** Cache-first, priority queue, circuit breaker
3. **Data Quality:** Validation checks, weekly reports

---

## Deployment Checklist

### Pre-Launch
- [ ] Run initial batch data download (5 days)
- [ ] Validate data completeness (>95%)
- [ ] Execute test backtests for all strategies
- [ ] Compare to historical Reports (spot check)
- [ ] Set up daily cron job
- [ ] Configure monitoring alerts

### Launch
- [ ] Deploy database migrations
- [ ] Deploy backend services
- [ ] Deploy frontend dashboard
- [ ] Enable WebSocket server
- [ ] Test alert notifications

### Post-Launch
- [ ] Monitor API usage (<20 calls/day)
- [ ] Review data quality reports
- [ ] Track success metrics

---

## Future Enhancements

### Short-term (3-6 months)
- Monte Carlo simulation
- Walk-forward optimization
- Parameter sensitivity analysis
- Multi-symbol portfolio backtests

### Medium-term (6-12 months)
- Multiple data sources (Polygon.io, FMP)
- Greeks calculation (options)
- Regime detection
- ML integration

### Long-term (12+ months)
- Paper trading integration
- Live trading transition
- Community strategy sharing

---

## Support & Questions

### Documentation
- **Architecture:** See Master Plan
- **Database Schema:** See individual phase docs
- **API Specs:** See Phase 5 (Dashboard)

### Common Issues
- **API limit reached:** Wait until next day, check cache hit rate
- **Data gaps:** Run validation script, check MarketDataStatus
- **Slow backtests:** Check bar count, optimize queries

---

## Version History

- **v1.0** (2025-01-28): Initial comprehensive technical design
  - Virtual Portfolio Simulator
  - Historical Data Pipeline
  - Advanced Dashboard & Monitoring

---

**Next Steps:**
1. Review all three phase documents
2. Approve schema designs
3. Set up project tracking
4. Begin Phase 2 Sprint 1 (Virtual Portfolio Simulator)

**Questions?** Review the Master Implementation Plan for integration details and risk mitigation strategies.
