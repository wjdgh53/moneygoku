# Phase 5: Advanced Dashboard & Monitoring - Technical Implementation Plan

## Executive Summary
This document specifies a production-grade monitoring and visualization system for backtesting results, strategy performance comparison, and real-time anomaly detection. The dashboard provides actionable insights through interactive charts, risk metrics, and automated alerting.

---

## 1. Technical Architecture

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                 Next.js 15 App Router                       │
│  - Server Components (data fetching)                        │
│  - Client Components (interactivity)                        │
│  - Server Actions (mutations)                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
      ┌────────────┴──────────────┐
      │                           │
┌─────▼──────────┐    ┌───────────▼────────────┐
│ Visualization  │    │  Performance Metrics   │
│ Layer          │    │  Calculator            │
│ - Recharts     │    │  - Sharpe, Sortino     │
│ - D3.js        │    │  - Drawdown analysis   │
│ - TailwindCSS  │    │  - Monte Carlo sim     │
└─────┬──────────┘    └───────────┬────────────┘
      │                           │
      │                           │
┌─────▼───────────────────────────▼──────────┐
│      Real-time Updates (WebSocket)         │
│  - Backtest progress streaming             │
│  - Live equity curve updates               │
│  - Alert notifications                     │
└────────────────────────────────────────────┘
```

### 1.2 Dashboard Pages Architecture

```
/app/dashboard/backtesting/
├── page.tsx                          # Main dashboard (strategy comparison)
├── [id]/
│   ├── page.tsx                      # Individual backtest details
│   ├── equity-curve/
│   │   └── page.tsx                  # Interactive equity curve chart
│   ├── trades/
│   │   └── page.tsx                  # Trade-by-trade analysis
│   ├── risk-metrics/
│   │   └── page.tsx                  # VaR, CVaR, Greeks dashboard
│   └── monte-carlo/
│       └── page.tsx                  # Monte Carlo simulation results
├── compare/
│   └── page.tsx                      # Side-by-side strategy comparison
└── alerts/
    └── page.tsx                      # Performance degradation alerts
```

---

## 2. Feature Specifications

### 2.1 Main Dashboard Overview

**URL:** `/app/dashboard/backtesting/page.tsx`

**Features:**
- Grid view of all backtest runs (sortable table)
- Quick metrics cards (total return, Sharpe, win rate, max drawdown)
- Performance heatmap (strategy × symbol)
- Recent alerts feed
- Quick actions (start new backtest, compare strategies)

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────┐
│  Backtesting Dashboard                   [+ New Backtest]   │
├─────────────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │ Total  │  │ Sharpe │  │ Win    │  │ Max    │           │
│  │ Return │  │ Ratio  │  │ Rate   │  │ DD     │           │
│  │ +15.2% │  │  1.84  │  │ 62.5%  │  │ -8.3%  │           │
│  └────────┘  └────────┘  └────────┘  └────────┘           │
├─────────────────────────────────────────────────────────────┤
│  Strategy Performance Heatmap                               │
│  ┌─────────────────────────────────────────────┐           │
│  │              AAPL   TSLA   NVDA   SPY       │           │
│  │  RSI-MACD    +12%   +8%    +15%   +5%      │  🟢🟢🟢🟡 │
│  │  SMA-Cross   +6%    -2%    +10%   +8%      │  🟡🔴🟢🟢 │
│  │  BB-Mean     +9%    +4%    +7%    +3%      │  🟢🟡🟢🟡 │
│  └─────────────────────────────────────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  Recent Backtests                          [View All]       │
│  ┌─────────────────────────────────────────────────────────┤
│  │ Strategy          Symbol  Period      Return   Status   │
│  ├─────────────────────────────────────────────────────────┤
│  │ RSI-MACD          AAPL    2y         +15.2%   ✅       │
│  │ Golden Cross      TSLA    1y         +8.4%    ✅       │
│  │ BB-Mean Reversion NVDA    2y         +12.1%   🔄 Running│
│  └─────────────────────────────────────────────────────────┘
│                                                             │
│  Recent Alerts                             [View All]       │
│  ┌─────────────────────────────────────────────────────────┤
│  │ ⚠️ Win rate dropped to 45% (RSI-MACD on TSLA)          │
│  │ 🔴 Max drawdown exceeded 15% threshold (SMA-Cross)     │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

**Implementation (Server Component):**

```typescript
// File: /app/dashboard/backtesting/page.tsx

import { prisma } from '@/lib/prisma';
import { BacktestCard } from '@/components/backtest/BacktestCard';
import { PerformanceHeatmap } from '@/components/backtest/PerformanceHeatmap';
import { AlertsFeed } from '@/components/backtest/AlertsFeed';

export default async function BacktestingDashboard() {
  // Fetch all backtest runs (latest 20)
  const backtests = await prisma.backtestRun.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      strategy: true
    }
  });

  // Calculate aggregate metrics
  const avgReturn = backtests.reduce((sum, bt) => sum + (bt.totalReturnPct || 0), 0) / backtests.length;
  const avgSharpe = backtests.reduce((sum, bt) => sum + (bt.sharpeRatio || 0), 0) / backtests.length;
  const avgWinRate = backtests.reduce((sum, bt) => sum + bt.winRate, 0) / backtests.length;
  const worstDrawdown = Math.min(...backtests.map(bt => bt.maxDrawdown || 0));

  // Load recent alerts
  const alerts = await prisma.backtestAlert.findMany({
    where: { dismissed: false },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Backtesting Dashboard</h1>
        <a href="/dashboard/backtesting/new" className="btn btn-primary">
          + New Backtest
        </a>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Avg Return"
          value={`${avgReturn >= 0 ? '+' : ''}${avgReturn.toFixed(1)}%`}
          trend={avgReturn >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Avg Sharpe"
          value={avgSharpe.toFixed(2)}
          trend={avgSharpe >= 1 ? 'up' : 'neutral'}
        />
        <MetricCard
          title="Avg Win Rate"
          value={`${avgWinRate.toFixed(1)}%`}
          trend={avgWinRate >= 50 ? 'up' : 'down'}
        />
        <MetricCard
          title="Worst Drawdown"
          value={`${worstDrawdown.toFixed(1)}%`}
          trend={worstDrawdown > -10 ? 'up' : 'down'}
        />
      </div>

      {/* Performance Heatmap */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Strategy Performance Heatmap</h2>
        <PerformanceHeatmap backtests={backtests} />
      </section>

      {/* Recent Backtests Table */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Recent Backtests</h2>
        <BacktestTable backtests={backtests} />
      </section>

      {/* Alerts Feed */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Recent Alerts</h2>
        <AlertsFeed alerts={alerts} />
      </section>
    </div>
  );
}
```

**Estimated LOC:** 150 lines

---

### 2.2 Individual Backtest Detail Page

**URL:** `/app/dashboard/backtesting/[id]/page.tsx`

**Features:**
- Executive summary (key metrics)
- Interactive equity curve chart (Recharts)
- Trade list with filtering
- Risk metrics dashboard
- Drawdown analysis chart
- Performance breakdown (monthly returns calendar)

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard        Backtest: RSI-MACD on AAPL     │
├─────────────────────────────────────────────────────────────┤
│  Period: 2023-01-01 to 2025-01-01 (2 years)                │
│  Status: ✅ Completed (12.3s)                               │
├─────────────────────────────────────────────────────────────┤
│  Executive Summary                                          │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │ Return │  │ Trades │  │ Win    │  │ Sharpe │           │
│  │ +15.2% │  │   48   │  │ Rate   │  │  1.84  │           │
│  │        │  │        │  │ 62.5%  │  │        │           │
│  └────────┘  └────────┘  └────────┘  └────────┘           │
├─────────────────────────────────────────────────────────────┤
│  Equity Curve                          [1M][3M][6M][1Y][All]│
│  ┌─────────────────────────────────────────────────────────┤
│  │ $12,000                              ╱────────           │
│  │                                  ╱───╯                   │
│  │ $11,000                      ╱───                        │
│  │                          ╱───                            │
│  │ $10,000  ───────────────╯                                │
│  │ Jan 2023              Jan 2024              Jan 2025     │
│  └─────────────────────────────────────────────────────────┘
├─────────────────────────────────────────────────────────────┤
│  Drawdown Analysis                                          │
│  ┌─────────────────────────────────────────────────────────┤
│  │   0%  ─────╲                    ╱─────                  │
│  │  -5%        ╲                  ╱                         │
│  │ -10%         ╲────────────────╱                          │
│  │              ⬇️ Max DD: -8.3%                            │
│  └─────────────────────────────────────────────────────────┘
├─────────────────────────────────────────────────────────────┤
│  Trade History                         [Filter] [Export]    │
│  ┌─────────────────────────────────────────────────────────┤
│  │ Date       Side  Qty  Entry   Exit    P&L     Return    │
│  ├─────────────────────────────────────────────────────────┤
│  │ 2024-12-15 BUY   10   $150.20  -      -       -         │
│  │ 2024-11-20 SELL  8    $145.00  $152  +$56    +4.8%  🟢 │
│  │ 2024-10-10 BUY   8    $145.00  -      -       -         │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// File: /app/dashboard/backtesting/[id]/page.tsx

import { prisma } from '@/lib/prisma';
import { EquityCurveChart } from '@/components/backtest/EquityCurveChart';
import { DrawdownChart } from '@/components/backtest/DrawdownChart';
import { TradeTable } from '@/components/backtest/TradeTable';
import { MonthlyReturnsCalendar } from '@/components/backtest/MonthlyReturnsCalendar';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

export default async function BacktestDetailPage({ params }: PageProps) {
  // Load backtest data
  const backtest = await prisma.backtestRun.findUnique({
    where: { id: params.id },
    include: {
      strategy: true,
      trades: {
        orderBy: { executionBar: 'desc' }
      },
      equityCurve: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  if (!backtest) {
    notFound();
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <header>
        <a href="/dashboard/backtesting" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </a>
        <h1 className="text-3xl font-bold mt-2">
          {backtest.strategy.name} on {backtest.symbol}
        </h1>
        <p className="text-gray-600">
          {backtest.startDate.toLocaleDateString()} - {backtest.endDate.toLocaleDateString()}
        </p>
      </header>

      {/* Executive Summary */}
      <section className="grid grid-cols-4 gap-4">
        <MetricCard title="Total Return" value={`${backtest.totalReturnPct?.toFixed(1)}%`} />
        <MetricCard title="Total Trades" value={backtest.totalTrades.toString()} />
        <MetricCard title="Win Rate" value={`${backtest.winRate.toFixed(1)}%`} />
        <MetricCard title="Sharpe Ratio" value={backtest.sharpeRatio?.toFixed(2) || 'N/A'} />
      </section>

      {/* Equity Curve */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Equity Curve</h2>
        <EquityCurveChart data={backtest.equityCurve} />
      </section>

      {/* Drawdown Analysis */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Drawdown Analysis</h2>
        <DrawdownChart data={backtest.equityCurve} maxDrawdown={backtest.maxDrawdown || 0} />
      </section>

      {/* Monthly Returns Calendar */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Monthly Returns</h2>
        <MonthlyReturnsCalendar trades={backtest.trades} />
      </section>

      {/* Trade History */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Trade History</h2>
        <TradeTable trades={backtest.trades} />
      </section>

      {/* Risk Metrics */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Risk Metrics</h2>
        <RiskMetricsGrid backtest={backtest} />
      </section>
    </div>
  );
}
```

**Estimated LOC:** 120 lines

---

### 2.3 Interactive Equity Curve Chart (Recharts)

**File:** `/components/backtest/EquityCurveChart.tsx`

```typescript
'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EquityCurveChartProps {
  data: Array<{
    timestamp: Date;
    totalEquity: number;
    cash: number;
    stockValue: number;
  }>;
}

export function EquityCurveChart({ data }: EquityCurveChartProps) {
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('ALL');

  // Filter data based on time range
  const filteredData = filterByTimeRange(data, timeRange);

  // Format data for Recharts
  const chartData = filteredData.map(point => ({
    date: point.timestamp.toLocaleDateString(),
    equity: point.totalEquity,
    cash: point.cash,
    stocks: point.stockValue
  }));

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      {/* Time Range Selector */}
      <div className="flex justify-end gap-2 mb-4">
        {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            formatter={(value: number) => `$${value.toLocaleString()}`}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="equity"
            stroke="#2563eb"
            strokeWidth={2}
            name="Total Equity"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="cash"
            stroke="#10b981"
            strokeWidth={1}
            name="Cash"
            dot={false}
            strokeDasharray="5 5"
          />
          <Line
            type="monotone"
            dataKey="stocks"
            stroke="#f59e0b"
            strokeWidth={1}
            name="Stock Value"
            dot={false}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function filterByTimeRange(data: any[], range: string): any[] {
  if (range === 'ALL') return data;

  const now = new Date();
  const cutoff = new Date();

  switch (range) {
    case '1M':
      cutoff.setMonth(now.getMonth() - 1);
      break;
    case '3M':
      cutoff.setMonth(now.getMonth() - 3);
      break;
    case '6M':
      cutoff.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
      cutoff.setFullYear(now.getFullYear() - 1);
      break;
  }

  return data.filter(point => point.timestamp >= cutoff);
}
```

**Estimated LOC:** 100 lines

---

### 2.4 Performance Heatmap (Strategy × Symbol)

**File:** `/components/backtest/PerformanceHeatmap.tsx`

```typescript
'use client';

interface PerformanceHeatmapProps {
  backtests: Array<{
    id: string;
    strategy: { name: string };
    symbol: string;
    totalReturnPct: number | null;
  }>;
}

export function PerformanceHeatmap({ backtests }: PerformanceHeatmapProps) {
  // Group by strategy and symbol
  const matrix: Record<string, Record<string, number>> = {};

  for (const bt of backtests) {
    if (!matrix[bt.strategy.name]) {
      matrix[bt.strategy.name] = {};
    }
    matrix[bt.strategy.name][bt.symbol] = bt.totalReturnPct || 0;
  }

  // Get unique strategies and symbols
  const strategies = Object.keys(matrix);
  const symbols = Array.from(new Set(backtests.map(bt => bt.symbol)));

  // Color scale function
  const getColor = (returnPct: number): string => {
    if (returnPct > 15) return 'bg-green-600 text-white';
    if (returnPct > 10) return 'bg-green-500 text-white';
    if (returnPct > 5) return 'bg-green-400 text-black';
    if (returnPct > 0) return 'bg-green-300 text-black';
    if (returnPct > -5) return 'bg-red-300 text-black';
    if (returnPct > -10) return 'bg-red-400 text-white';
    return 'bg-red-600 text-white';
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="text-left p-2 border-b">Strategy</th>
            {symbols.map(symbol => (
              <th key={symbol} className="text-center p-2 border-b">
                {symbol}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {strategies.map(strategy => (
            <tr key={strategy}>
              <td className="p-2 border-b font-semibold">{strategy}</td>
              {symbols.map(symbol => {
                const returnPct = matrix[strategy][symbol];
                return (
                  <td
                    key={symbol}
                    className={`text-center p-2 border-b ${
                      returnPct !== undefined ? getColor(returnPct) : 'bg-gray-100'
                    }`}
                  >
                    {returnPct !== undefined ? `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(1)}%` : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Estimated LOC:** 80 lines

---

### 2.5 Risk Metrics Dashboard

**File:** `/components/backtest/RiskMetricsGrid.tsx`

**Features:**
- Value at Risk (VaR) - 95% and 99% confidence levels
- Conditional Value at Risk (CVaR) / Expected Shortfall
- Greeks (Delta, Gamma, Vega for options strategies)
- Beta vs SPY (market correlation)
- Max consecutive losses

```typescript
'use client';

interface RiskMetricsGridProps {
  backtest: {
    sharpeRatio: number | null;
    sortinoRatio: number | null;
    maxDrawdown: number | null;
    profitFactor: number | null;
  };
  trades: Array<{
    realizedPLPct: number | null;
  }>;
}

export function RiskMetricsGrid({ backtest, trades }: RiskMetricsGridProps) {
  // Calculate VaR (Value at Risk) - 95% confidence
  const returns = trades
    .filter(t => t.realizedPLPct !== null)
    .map(t => t.realizedPLPct!);

  const var95 = calculateVaR(returns, 0.95);
  const var99 = calculateVaR(returns, 0.99);

  // Calculate CVaR (Conditional VaR / Expected Shortfall)
  const cvar95 = calculateCVaR(returns, 0.95);

  // Max consecutive losses
  const maxConsecutiveLosses = calculateMaxConsecutiveLosses(returns);

  return (
    <div className="grid grid-cols-3 gap-4">
      <RiskMetricCard
        title="Value at Risk (95%)"
        value={`${var95.toFixed(2)}%`}
        description="Maximum expected loss with 95% confidence"
        severity={var95 < -10 ? 'high' : var95 < -5 ? 'medium' : 'low'}
      />
      <RiskMetricCard
        title="Value at Risk (99%)"
        value={`${var99.toFixed(2)}%`}
        description="Maximum expected loss with 99% confidence"
        severity={var99 < -15 ? 'high' : var99 < -10 ? 'medium' : 'low'}
      />
      <RiskMetricCard
        title="CVaR (Expected Shortfall)"
        value={`${cvar95.toFixed(2)}%`}
        description="Average loss beyond VaR threshold"
        severity={cvar95 < -15 ? 'high' : cvar95 < -10 ? 'medium' : 'low'}
      />
      <RiskMetricCard
        title="Sharpe Ratio"
        value={backtest.sharpeRatio?.toFixed(2) || 'N/A'}
        description="Risk-adjusted return"
        severity={
          !backtest.sharpeRatio ? 'low' :
          backtest.sharpeRatio > 2 ? 'low' :
          backtest.sharpeRatio > 1 ? 'medium' : 'high'
        }
      />
      <RiskMetricCard
        title="Sortino Ratio"
        value={backtest.sortinoRatio?.toFixed(2) || 'N/A'}
        description="Downside risk-adjusted return"
        severity={
          !backtest.sortinoRatio ? 'low' :
          backtest.sortinoRatio > 2 ? 'low' :
          backtest.sortinoRatio > 1 ? 'medium' : 'high'
        }
      />
      <RiskMetricCard
        title="Max Consecutive Losses"
        value={maxConsecutiveLosses.toString()}
        description="Longest losing streak"
        severity={maxConsecutiveLosses > 5 ? 'high' : maxConsecutiveLosses > 3 ? 'medium' : 'low'}
      />
      <RiskMetricCard
        title="Profit Factor"
        value={backtest.profitFactor?.toFixed(2) || 'N/A'}
        description="Gross profit / Gross loss"
        severity={
          !backtest.profitFactor ? 'low' :
          backtest.profitFactor > 2 ? 'low' :
          backtest.profitFactor > 1.5 ? 'medium' : 'high'
        }
      />
      <RiskMetricCard
        title="Max Drawdown"
        value={`${backtest.maxDrawdown?.toFixed(2)}%`}
        description="Largest peak-to-trough decline"
        severity={
          !backtest.maxDrawdown ? 'low' :
          backtest.maxDrawdown < -20 ? 'high' :
          backtest.maxDrawdown < -10 ? 'medium' : 'low'
        }
      />
    </div>
  );
}

// Helper: Calculate Value at Risk
function calculateVaR(returns: number[], confidence: number): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);
  return sorted[index];
}

// Helper: Calculate Conditional VaR (Expected Shortfall)
function calculateCVaR(returns: number[], confidence: number): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const cutoffIndex = Math.floor((1 - confidence) * sorted.length);
  const tailReturns = sorted.slice(0, cutoffIndex);

  return tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
}

// Helper: Calculate max consecutive losses
function calculateMaxConsecutiveLosses(returns: number[]): number {
  let maxStreak = 0;
  let currentStreak = 0;

  for (const ret of returns) {
    if (ret < 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

interface RiskMetricCardProps {
  title: string;
  value: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

function RiskMetricCard({ title, value, description, severity }: RiskMetricCardProps) {
  const severityColors = {
    low: 'border-green-500',
    medium: 'border-yellow-500',
    high: 'border-red-500'
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${severityColors[severity]}`}>
      <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}
```

**Estimated LOC:** 150 lines

---

### 2.6 Strategy Comparison View

**URL:** `/app/dashboard/backtesting/compare/page.tsx`

**Features:**
- Side-by-side comparison of 2-4 backtests
- Aligned equity curves on single chart
- Metrics comparison table
- Statistical significance testing (t-test for returns)

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────┐
│  Compare Backtests               [Select Backtests to Compare]│
├─────────────────────────────────────────────────────────────┤
│  Selected: [RSI-MACD] [Golden Cross] [BB-Mean] [+ Add]     │
├─────────────────────────────────────────────────────────────┤
│  Equity Curve Comparison                                    │
│  ┌─────────────────────────────────────────────────────────┤
│  │ $12,000  ─────────  (RSI-MACD)                          │
│  │                ╱─────────  (Golden Cross)               │
│  │ $11,000    ╱───                                          │
│  │        ───╯        ───────  (BB-Mean)                   │
│  │ $10,000                                                  │
│  └─────────────────────────────────────────────────────────┘
├─────────────────────────────────────────────────────────────┤
│  Metrics Comparison                                         │
│  ┌─────────────────────────────────────────────────────────┤
│  │ Metric        RSI-MACD   Golden Cross   BB-Mean         │
│  ├─────────────────────────────────────────────────────────┤
│  │ Total Return  +15.2% 🥇   +12.1% 🥈      +10.5% 🥉     │
│  │ Sharpe Ratio  1.84       1.62           1.45            │
│  │ Win Rate      62.5%      58.3%          54.2%           │
│  │ Max Drawdown  -8.3%      -12.1%         -9.8%           │
│  │ Total Trades  48         36             52              │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// File: /app/dashboard/backtesting/compare/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ComparisonChart } from '@/components/backtest/ComparisonChart';
import { ComparisonTable } from '@/components/backtest/ComparisonTable';

export default function CompareBacktestsPage() {
  const searchParams = useSearchParams();
  const ids = searchParams.get('ids')?.split(',') || [];

  const [backtests, setBacktests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBacktests() {
      const promises = ids.map(id =>
        fetch(`/api/backtests/${id}`).then(res => res.json())
      );

      const results = await Promise.all(promises);
      setBacktests(results);
      setLoading(false);
    }

    if (ids.length > 0) {
      loadBacktests();
    }
  }, [ids]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Compare Backtests</h1>

      {/* Selected Backtests */}
      <div className="flex gap-2">
        {backtests.map(bt => (
          <div key={bt.id} className="bg-blue-100 px-3 py-1 rounded">
            {bt.strategy.name} on {bt.symbol}
          </div>
        ))}
      </div>

      {/* Comparison Chart */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Equity Curve Comparison</h2>
        <ComparisonChart backtests={backtests} />
      </section>

      {/* Comparison Table */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Metrics Comparison</h2>
        <ComparisonTable backtests={backtests} />
      </section>
    </div>
  );
}
```

**Estimated LOC:** 80 lines

---

### 2.7 Automated Alerting System

**Database Model:**

```prisma
model BacktestAlert {
  id            String   @id @default(cuid())

  backtestRunId String
  backtestRun   BacktestRun @relation(fields: [backtestRunId], references: [id], onDelete: Cascade)

  // Alert details
  alertType     String   // WIN_RATE_DROP, MAX_DRAWDOWN_BREACH, SHARPE_DECLINE
  severity      String   // LOW, MEDIUM, HIGH
  message       String
  threshold     Float?   // Threshold value that triggered alert

  // Metadata
  dismissed     Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@index([backtestRunId])
  @@index([dismissed])
  @@map("backtest_alerts")
}
```

**Alert Generator Service:**

```typescript
// File: /lib/services/backtestAlertService.ts

import { prisma } from '@/lib/prisma';

export class BacktestAlertService {
  /**
   * Check backtest for performance degradation and create alerts
   */
  async checkForAlerts(backtestRunId: string): Promise<void> {
    const backtest = await prisma.backtestRun.findUnique({
      where: { id: backtestRunId },
      include: { strategy: true }
    });

    if (!backtest) return;

    // 1. Check win rate drop
    if (backtest.winRate < 50) {
      await this.createAlert({
        backtestRunId,
        alertType: 'WIN_RATE_DROP',
        severity: backtest.winRate < 45 ? 'HIGH' : 'MEDIUM',
        message: `Win rate dropped to ${backtest.winRate.toFixed(1)}% (strategy: ${backtest.strategy.name})`,
        threshold: 50
      });
    }

    // 2. Check max drawdown breach
    if (backtest.maxDrawdown && backtest.maxDrawdown < -15) {
      await this.createAlert({
        backtestRunId,
        alertType: 'MAX_DRAWDOWN_BREACH',
        severity: 'HIGH',
        message: `Max drawdown exceeded -15% threshold (${backtest.maxDrawdown.toFixed(2)}%)`,
        threshold: -15
      });
    }

    // 3. Check Sharpe ratio decline
    if (backtest.sharpeRatio && backtest.sharpeRatio < 1.0) {
      await this.createAlert({
        backtestRunId,
        alertType: 'SHARPE_DECLINE',
        severity: 'MEDIUM',
        message: `Sharpe ratio below 1.0 (${backtest.sharpeRatio.toFixed(2)})`,
        threshold: 1.0
      });
    }

    // 4. Check profit factor
    if (backtest.profitFactor && backtest.profitFactor < 1.5) {
      await this.createAlert({
        backtestRunId,
        alertType: 'PROFIT_FACTOR_LOW',
        severity: 'MEDIUM',
        message: `Profit factor below 1.5 (${backtest.profitFactor.toFixed(2)})`,
        threshold: 1.5
      });
    }
  }

  private async createAlert(params: {
    backtestRunId: string;
    alertType: string;
    severity: string;
    message: string;
    threshold: number;
  }): Promise<void> {
    await prisma.backtestAlert.create({
      data: params
    });

    console.log(`⚠️ Alert created: ${params.message}`);
  }
}

export const backtestAlertService = new BacktestAlertService();
```

**Estimated LOC:** 100 lines

---

### 2.8 Monthly Returns Calendar

**File:** `/components/backtest/MonthlyReturnsCalendar.tsx`

```typescript
'use client';

interface MonthlyReturnsCalendarProps {
  trades: Array<{
    executionBar: Date;
    realizedPL: number | null;
  }>;
}

export function MonthlyReturnsCalendar({ trades }: MonthlyReturnsCalendarProps) {
  // Group trades by month
  const monthlyReturns: Record<string, number> = {};

  for (const trade of trades) {
    if (trade.realizedPL === null) continue;

    const monthKey = `${trade.executionBar.getFullYear()}-${String(trade.executionBar.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyReturns[monthKey]) {
      monthlyReturns[monthKey] = 0;
    }

    monthlyReturns[monthKey] += trade.realizedPL;
  }

  // Get years
  const years = Array.from(new Set(Object.keys(monthlyReturns).map(k => k.split('-')[0]))).sort();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getColor = (value: number): string => {
    if (value > 5) return 'bg-green-600 text-white';
    if (value > 2) return 'bg-green-400 text-black';
    if (value > 0) return 'bg-green-200 text-black';
    if (value > -2) return 'bg-red-200 text-black';
    if (value > -5) return 'bg-red-400 text-white';
    return 'bg-red-600 text-white';
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="text-left p-2 border-b">Year</th>
            {months.map(month => (
              <th key={month} className="text-center p-2 border-b text-xs">
                {month}
              </th>
            ))}
            <th className="text-center p-2 border-b font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {years.map(year => {
            let yearTotal = 0;

            return (
              <tr key={year}>
                <td className="p-2 border-b font-semibold">{year}</td>
                {months.map((month, idx) => {
                  const monthKey = `${year}-${String(idx + 1).padStart(2, '0')}`;
                  const value = monthlyReturns[monthKey] || 0;
                  yearTotal += value;

                  return (
                    <td
                      key={month}
                      className={`text-center p-2 border-b text-xs ${
                        value !== 0 ? getColor(value) : 'bg-gray-50'
                      }`}
                    >
                      {value !== 0 ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}%` : '-'}
                    </td>
                  );
                })}
                <td className={`text-center p-2 border-b font-bold ${getColor(yearTotal)}`}>
                  {yearTotal >= 0 ? '+' : ''}{yearTotal.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

**Estimated LOC:** 90 lines

---

## 3. Real-Time Features (WebSocket)

### 3.1 Streaming Backtest Progress

**File:** `/lib/services/backtestStreamService.ts`

```typescript
import { Server as SocketIOServer } from 'socket.io';

export class BacktestStreamService {
  private io: SocketIOServer | null = null;

  initialize(io: SocketIOServer) {
    this.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('subscribe', (backtestRunId: string) => {
        socket.join(`backtest:${backtestRunId}`);
        console.log(`Client subscribed to backtest ${backtestRunId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  // Emit progress updates
  emitProgress(backtestRunId: string, data: {
    barIndex: number;
    totalBars: number;
    currentEquity: number;
    currentPrice: number;
  }) {
    if (!this.io) return;

    this.io.to(`backtest:${backtestRunId}`).emit('progress', data);
  }

  // Emit completion
  emitComplete(backtestRunId: string, metrics: any) {
    if (!this.io) return;

    this.io.to(`backtest:${backtestRunId}`).emit('complete', metrics);
  }
}

export const backtestStreamService = new BacktestStreamService();
```

**Estimated LOC:** 50 lines

---

## 4. Export Features

### 4.1 PDF Report Generation

```typescript
// File: /app/api/backtests/[id]/export/pdf/route.ts

import { prisma } from '@/lib/prisma';
import { generatePDF } from '@/lib/utils/pdfGenerator';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const backtest = await prisma.backtestRun.findUnique({
    where: { id: params.id },
    include: {
      strategy: true,
      trades: true,
      equityCurve: true
    }
  });

  if (!backtest) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Generate PDF
  const pdfBuffer = await generatePDF(backtest);

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="backtest-${backtest.id}.pdf"`
    }
  });
}
```

### 4.2 Excel Export

```typescript
// File: /app/api/backtests/[id]/export/excel/route.ts

import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const backtest = await prisma.backtestRun.findUnique({
    where: { id: params.id },
    include: { trades: true }
  });

  if (!backtest) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Return', `${backtest.totalReturnPct}%`],
    ['Sharpe Ratio', backtest.sharpeRatio],
    ['Win Rate', `${backtest.winRate}%`],
    ['Max Drawdown', `${backtest.maxDrawdown}%`]
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Sheet 2: Trades
  const tradesData = backtest.trades.map(t => ({
    Date: t.executionBar.toISOString(),
    Side: t.side,
    Quantity: t.quantity,
    Price: t.executedPrice,
    'P&L': t.realizedPL,
    'P&L %': t.realizedPLPct
  }));
  const tradesSheet = XLSX.utils.json_to_sheet(tradesData);
  XLSX.utils.book_append_sheet(wb, tradesSheet, 'Trades');

  // Generate buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="backtest-${backtest.id}.xlsx"`
    }
  });
}
```

**Estimated LOC:** 80 lines

---

## 5. Implementation Roadmap

### Sprint 1 (2 weeks): Core Dashboard
- **Days 1-4:** Main dashboard page (overview, metrics cards)
- **Days 5-8:** Individual backtest detail page
- **Days 9-10:** Interactive equity curve chart (Recharts)
- **Deliverable:** Functional dashboard with basic visualization

### Sprint 2 (2 weeks): Advanced Visualizations
- **Days 1-3:** Performance heatmap (strategy × symbol)
- **Days 4-6:** Risk metrics dashboard (VaR, CVaR, Sharpe)
- **Days 7-8:** Monthly returns calendar
- **Days 9-10:** Drawdown analysis chart
- **Deliverable:** Complete visualization suite

### Sprint 3 (2 weeks): Comparison & Alerts
- **Days 1-4:** Strategy comparison view
- **Days 5-7:** Automated alerting system
- **Days 8-10:** Real-time WebSocket updates
- **Deliverable:** Full monitoring and alerting system

### Sprint 4 (1 week): Export & Polish
- **Days 1-3:** PDF/Excel export
- **Days 4-5:** UI polish and responsive design
- **Days 6-7:** Performance optimization
- **Deliverable:** Production-ready dashboard

---

## 6. Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Chart rendering performance (10k+ points) | Medium | Medium | Data downsampling, lazy loading, virtualization |
| Real-time updates causing UI lag | Low | Low | Debounce WebSocket events, batch updates |
| Large dataset exports (PDF/Excel) | Low | Low | Streaming exports, pagination |

### Mitigation Strategies

1. **Performance:** Implement data downsampling for charts (max 1000 points visible)
2. **Scalability:** Use React.memo and useMemo for expensive calculations
3. **UX:** Add loading skeletons and progressive loading

---

## 7. Success Metrics

### User Experience
- **Page Load:** <2 seconds for dashboard
- **Chart Rendering:** <1 second for equity curve (500 points)
- **Export Generation:** <5 seconds for PDF, <3 seconds for Excel

### Data Accuracy
- **Metrics Consistency:** 100% match with database calculations
- **Chart Accuracy:** Visual representation matches raw data
- **Alert Precision:** <5% false positive rate

### Adoption Metrics
- **Dashboard Usage:** >80% of users view backtests via dashboard (not raw API)
- **Alert Engagement:** >50% of alerts result in user action (view details, adjust strategy)
- **Export Usage:** >30% of backtests exported to PDF/Excel

---

## 8. Code Structure

```
/app/dashboard/backtesting/
├── page.tsx                    (150 LOC)
├── [id]/
│   ├── page.tsx                (120 LOC)
│   └── compare/
│       └── page.tsx            (80 LOC)
└── new/
    └── page.tsx                (100 LOC)

/components/backtest/
├── EquityCurveChart.tsx        (100 LOC)
├── DrawdownChart.tsx           (80 LOC)
├── PerformanceHeatmap.tsx      (80 LOC)
├── RiskMetricsGrid.tsx         (150 LOC)
├── MonthlyReturnsCalendar.tsx  (90 LOC)
├── TradeTable.tsx              (60 LOC)
├── ComparisonChart.tsx         (100 LOC)
└── AlertsFeed.tsx              (50 LOC)

/lib/services/
├── backtestAlertService.ts     (100 LOC)
└── backtestStreamService.ts    (50 LOC)

/lib/utils/
├── pdfGenerator.ts             (150 LOC)
└── excelGenerator.ts           (80 LOC)
```

**Total Estimated LOC:** 1,440 lines

---

## 9. Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router, Server Components)
- **UI Library:** Tailwind CSS, shadcn/ui
- **Charts:** Recharts (primary), D3.js (advanced)
- **State Management:** React Context API, Zustand (for client state)

### Backend
- **Real-time:** Socket.io (WebSocket)
- **Export:** jsPDF, xlsx (Excel generation)
- **API:** Next.js App Router API routes

### Database
- **ORM:** Prisma
- **Queries:** Server Components (direct Prisma calls)
- **Caching:** React Server Component caching

---

## Conclusion

This Advanced Dashboard & Monitoring system provides a comprehensive, production-ready interface for analyzing backtesting results, comparing strategies, and monitoring performance degradation. The dashboard leverages Next.js 15's latest features (Server Components, Server Actions) for optimal performance and developer experience.

**Key Features:**
- ✅ Interactive equity curve visualization (Recharts)
- ✅ Risk metrics dashboard (VaR, CVaR, Sharpe, Sortino)
- ✅ Strategy comparison (side-by-side)
- ✅ Automated alerting (win rate drops, drawdown breaches)
- ✅ Real-time updates (WebSocket streaming)
- ✅ Export to PDF/Excel
- ✅ Monthly returns calendar heatmap
- ✅ Performance heatmap (strategy × symbol)

**Next Steps:**
1. Review UI/UX mockups
2. Begin Sprint 1: Core dashboard pages
3. Parallel development with Phase 2 (simulator + data pipeline)
