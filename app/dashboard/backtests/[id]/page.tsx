/**
 * Individual Backtest Detail Page
 *
 * Displays comprehensive results for a specific backtest including:
 * - Performance metrics summary
 * - Equity curve chart
 * - Trade history table
 * - Risk analytics
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { EquityCurveChart } from '@/components/backtest/EquityCurveChart';

interface PageProps {
  params: {
    id: string;
  };
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const styles = {
    COMPLETED: 'bg-green-100 text-green-800',
    RUNNING: 'bg-blue-100 text-blue-800 animate-pulse',
    FAILED: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
  }[status] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${styles}`}>
      {status}
    </span>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  subValue,
  trend
}: {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'positive' | 'negative' | 'neutral';
}) {
  const trendColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const color = trend ? trendColors[trend] : 'text-gray-900';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}

export default async function BacktestDetailPage({ params }: PageProps) {
  const { id } = params;

  // Fetch backtest with all related data
  const backtest = await prisma.backtestRun.findUnique({
    where: { id },
    include: {
      strategy: {
        select: {
          id: true,
          name: true,
          description: true,
          timeHorizon: true,
          entryConditions: true,
          exitConditions: true,
        },
      },
      trades: {
        orderBy: { executionBar: 'asc' },
      },
      positions: {
        orderBy: { openedAt: 'desc' },
      },
      equityCurve: {
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!backtest) {
    notFound();
  }

  // Format data for EquityCurveChart
  const equityCurveData = backtest.equityCurve.map((point) => ({
    timestamp: point.timestamp,
    totalEquity: point.totalEquity,
    cash: point.cash,
    stockValue: point.stockValue,
    highWaterMark: point.highWaterMark,
    drawdownPct: point.drawdownPct,
  }));

  // Calculate trade statistics
  const completedTrades = backtest.trades.filter(t => t.side === 'SELL');
  const avgHoldingPeriod = completedTrades.length > 0
    ? completedTrades.reduce((sum, t) => sum + (t.holdingPeriod || 0), 0) / completedTrades.length
    : 0;

  const avgTradeReturn = completedTrades.length > 0
    ? completedTrades.reduce((sum, t) => sum + (t.realizedPLPct || 0), 0) / completedTrades.length
    : 0;

  // Calculate win/loss statistics
  const winningTrades = completedTrades.filter(t => (t.realizedPL || 0) > 0);
  const losingTrades = completedTrades.filter(t => (t.realizedPL || 0) < 0);

  const largestWin = winningTrades.length > 0
    ? Math.max(...winningTrades.map(t => t.realizedPL || 0))
    : 0;

  const largestLoss = losingTrades.length > 0
    ? Math.min(...losingTrades.map(t => t.realizedPL || 0))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/dashboard/backtests"
              className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
            >
              ← Back to Backtests
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {backtest.symbol} - {backtest.strategy?.name || 'Unknown Strategy'}
              </h1>
              <StatusBadge status={backtest.status} />
            </div>
            <p className="text-gray-600 mt-2">
              {new Date(backtest.startDate).toLocaleDateString()} - {new Date(backtest.endDate).toLocaleDateString()}
              {' • '}
              {backtest.timeHorizon} Strategy
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
              Export PDF
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
              Export Excel
            </button>
          </div>
        </div>

        {/* Performance Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard
            label="Total Return"
            value={backtest.totalReturnPct !== null ? `${backtest.totalReturnPct >= 0 ? '+' : ''}${backtest.totalReturnPct.toFixed(2)}%` : 'N/A'}
            trend={backtest.totalReturnPct !== null ? (backtest.totalReturnPct >= 0 ? 'positive' : 'negative') : undefined}
          />
          <MetricCard
            label="Total Trades"
            value={backtest.totalTrades || 0}
            subValue={`${completedTrades.length} completed`}
          />
          <MetricCard
            label="Win Rate"
            value={backtest.winRate !== null ? `${backtest.winRate.toFixed(1)}%` : 'N/A'}
            subValue={`${backtest.winningTrades || 0}W / ${backtest.losingTrades || 0}L`}
            trend={backtest.winRate !== null ? (backtest.winRate >= 50 ? 'positive' : 'negative') : undefined}
          />
          <MetricCard
            label="Sharpe Ratio"
            value={backtest.sharpeRatio !== null ? backtest.sharpeRatio.toFixed(2) : 'N/A'}
            subValue="Risk-adjusted return"
            trend={backtest.sharpeRatio !== null ? (backtest.sharpeRatio > 1 ? 'positive' : backtest.sharpeRatio < 0 ? 'negative' : 'neutral') : undefined}
          />
          <MetricCard
            label="Sortino Ratio"
            value={backtest.sortinoRatio !== null ? backtest.sortinoRatio.toFixed(2) : 'N/A'}
            subValue="Downside risk-adjusted"
          />
          <MetricCard
            label="Max Drawdown"
            value={backtest.maxDrawdown !== null ? `${backtest.maxDrawdown.toFixed(2)}%` : 'N/A'}
            subValue={backtest.maxDrawdownDate ? new Date(backtest.maxDrawdownDate).toLocaleDateString() : undefined}
            trend="negative"
          />
        </div>

        {/* Additional Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Profit Factor"
            value={backtest.profitFactor !== null ? backtest.profitFactor.toFixed(2) : 'N/A'}
            subValue="Gross profit / loss"
            trend={backtest.profitFactor !== null ? (backtest.profitFactor > 1 ? 'positive' : 'negative') : undefined}
          />
          <MetricCard
            label="Expectancy"
            value={backtest.expectancy !== null ? `$${backtest.expectancy.toFixed(2)}` : 'N/A'}
            subValue="Avg P&L per trade"
          />
          <MetricCard
            label="Avg Holding Period"
            value={avgHoldingPeriod > 0 ? `${avgHoldingPeriod.toFixed(1)} bars` : 'N/A'}
            subValue="Time in position"
          />
          <MetricCard
            label="Avg Trade Return"
            value={`${avgTradeReturn >= 0 ? '+' : ''}${avgTradeReturn.toFixed(2)}%`}
            trend={avgTradeReturn >= 0 ? 'positive' : 'negative'}
          />
        </div>

        {/* Equity Curve Chart */}
        {equityCurveData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Equity Curve</h2>
            <EquityCurveChart
              data={equityCurveData}
              initialCash={backtest.initialCash}
              showDrawdown={true}
              height={400}
            />
          </div>
        )}

        {/* Strategy Details */}
        {backtest.strategy && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Strategy Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">General Settings</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Strategy Name:</dt>
                    <dd className="font-medium text-gray-900">{backtest.strategy.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Time Horizon:</dt>
                    <dd className="font-medium text-gray-900">{backtest.strategy.timeHorizon}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Initial Cash:</dt>
                    <dd className="font-medium text-gray-900">${backtest.initialCash.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Position Sizing:</dt>
                    <dd className="font-medium text-gray-900">{backtest.positionSizing}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Position Size:</dt>
                    <dd className="font-medium text-gray-900">${backtest.positionSize?.toLocaleString() || 'N/A'}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Execution Settings</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Slippage:</dt>
                    <dd className="font-medium text-gray-900">{backtest.slippageBps || 0} bps</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Commission:</dt>
                    <dd className="font-medium text-gray-900">${backtest.commissionPerTrade?.toFixed(2) || '0.00'} per trade</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Bars Processed:</dt>
                    <dd className="font-medium text-gray-900">{backtest.barsProcessed || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Execution Time:</dt>
                    <dd className="font-medium text-gray-900">
                      {backtest.executionTime ? `${backtest.executionTime.toFixed(2)}s` : 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* Trade History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Trade History</h2>
            <p className="text-sm text-gray-600 mt-1">
              {completedTrades.length} completed trades
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Side
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Executed Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Holding Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exit Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backtest.trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(trade.executionBar).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        trade.side === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${trade.entryPrice?.toFixed(2) || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${trade.executedPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {trade.realizedPL !== null ? (
                        <span className={`text-sm font-medium ${
                          trade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {trade.realizedPL >= 0 ? '+' : ''}${trade.realizedPL.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {trade.realizedPLPct !== null ? (
                        <span className={`text-sm font-medium ${
                          trade.realizedPLPct >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {trade.realizedPLPct >= 0 ? '+' : ''}{trade.realizedPLPct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.holdingPeriod || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trade.exitReason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Win/Loss Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Winning Trades</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Count:</dt>
                <dd className="text-sm font-semibold text-green-600">{backtest.winningTrades || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Average Win:</dt>
                <dd className="text-sm font-semibold text-green-600">
                  {backtest.avgWinPct !== null ? `${backtest.avgWinPct.toFixed(2)}%` : 'N/A'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Largest Win:</dt>
                <dd className="text-sm font-semibold text-green-600">${largestWin.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Losing Trades</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Count:</dt>
                <dd className="text-sm font-semibold text-red-600">{backtest.losingTrades || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Average Loss:</dt>
                <dd className="text-sm font-semibold text-red-600">
                  {backtest.avgLossPct !== null ? `${backtest.avgLossPct.toFixed(2)}%` : 'N/A'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Largest Loss:</dt>
                <dd className="text-sm font-semibold text-red-600">${largestLoss.toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
