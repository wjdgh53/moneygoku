/**
 * Backtesting Dashboard - Main Overview Page
 *
 * Displays aggregate metrics and recent backtest runs from the new
 * backtesting simulation system (VirtualPortfolioEngine + BacktestController)
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trendValue && trend && (
          <span className={`text-sm font-medium ${trendColors[trend]}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// Backtest Status Badge
function StatusBadge({ status }: { status: string }) {
  const styles = {
    COMPLETED: 'bg-green-100 text-green-800',
    RUNNING: 'bg-blue-100 text-blue-800 animate-pulse',
    FAILED: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
  }[status] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles}`}>
      {status}
    </span>
  );
}

// Backtests Table Component
function BacktestsTable({ backtests }: { backtests: any[] }) {
  if (backtests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No backtests found. Start a new backtest to see results here.</p>
        <Link href="/dashboard/backtests/new">
          <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            New Backtest
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Symbol
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Strategy
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Period
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Return
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sharpe
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Win Rate
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Max DD
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {backtests.map((backtest) => (
            <tr key={backtest.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{backtest.symbol}</div>
                <div className="text-xs text-gray-500">{backtest.timeHorizon}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{backtest.strategy?.name || 'N/A'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(backtest.startDate).toLocaleDateString()} -<br />
                {new Date(backtest.endDate).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={backtest.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {backtest.totalReturnPct !== null ? (
                  <span className={`text-sm font-medium ${
                    backtest.totalReturnPct >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {backtest.totalReturnPct >= 0 ? '+' : ''}{backtest.totalReturnPct.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {backtest.sharpeRatio !== null ? backtest.sharpeRatio.toFixed(2) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {backtest.winRate !== null ? `${backtest.winRate.toFixed(1)}%` : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {backtest.maxDrawdown !== null ? (
                  <span className="text-sm text-red-600">
                    {backtest.maxDrawdown.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <Link
                  href={`/dashboard/backtests/${backtest.id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Details →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Main Page Component
export default async function BacktestsDashboard() {
  // Fetch recent backtests
  const backtests = await prisma.backtestRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      strategy: {
        select: {
          id: true,
          name: true,
          timeHorizon: true,
        },
      },
    },
  });

  // Calculate aggregate metrics (only from completed backtests)
  const completedBacktests = backtests.filter(b => b.status === 'COMPLETED');

  const avgReturn = completedBacktests.length > 0
    ? completedBacktests.reduce((sum, b) => sum + (b.totalReturnPct || 0), 0) / completedBacktests.length
    : 0;

  const avgSharpe = completedBacktests.length > 0
    ? completedBacktests
        .filter(b => b.sharpeRatio !== null)
        .reduce((sum, b) => sum + (b.sharpeRatio || 0), 0) / completedBacktests.filter(b => b.sharpeRatio !== null).length
    : 0;

  const avgWinRate = completedBacktests.length > 0
    ? completedBacktests
        .filter(b => b.winRate !== null)
        .reduce((sum, b) => sum + (b.winRate || 0), 0) / completedBacktests.filter(b => b.winRate !== null).length
    : 0;

  const worstDrawdown = completedBacktests.length > 0
    ? Math.min(...completedBacktests.filter(b => b.maxDrawdown !== null).map(b => b.maxDrawdown || 0))
    : 0;

  // Count by status
  const runningCount = backtests.filter(b => b.status === 'RUNNING').length;
  const completedCount = backtests.filter(b => b.status === 'COMPLETED').length;
  const failedCount = backtests.filter(b => b.status === 'FAILED').length;

  // Fetch recent alerts
  const alerts = await prisma.backtestAlert.findMany({
    orderBy: { timestamp: 'desc' },
    take: 5,
    include: {
      backtestRun: {
        select: {
          id: true,
          symbol: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Backtesting Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Monitor and analyze strategy performance with historical data
            </p>
          </div>
          <Link href="/dashboard/backtests/new">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
              + New Backtest
            </button>
          </Link>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Average Return"
            value={`${avgReturn >= 0 ? '+' : ''}${avgReturn.toFixed(2)}%`}
            subtitle={`From ${completedCount} completed backtests`}
            trend={avgReturn > 0 ? 'up' : avgReturn < 0 ? 'down' : 'neutral'}
          />
          <MetricCard
            title="Average Sharpe Ratio"
            value={avgSharpe.toFixed(2)}
            subtitle="Risk-adjusted return"
            trend={avgSharpe > 1 ? 'up' : avgSharpe < 0.5 ? 'down' : 'neutral'}
          />
          <MetricCard
            title="Average Win Rate"
            value={`${avgWinRate.toFixed(1)}%`}
            subtitle="Percentage of profitable trades"
            trend={avgWinRate > 50 ? 'up' : 'down'}
          />
          <MetricCard
            title="Worst Drawdown"
            value={`${worstDrawdown.toFixed(2)}%`}
            subtitle="Maximum peak-to-trough decline"
            trend="down"
          />
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Running</span>
              <span className="text-2xl font-bold text-blue-600">{runningCount}</span>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="text-2xl font-bold text-green-600">{completedCount}</span>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Failed</span>
              <span className="text-2xl font-bold text-red-600">{failedCount}</span>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => {
                const severityColors = {
                  HIGH: 'text-red-600 bg-red-50',
                  MEDIUM: 'text-yellow-600 bg-yellow-50',
                  LOW: 'text-blue-600 bg-blue-50',
                }[alert.severity] || 'text-gray-600 bg-gray-50';

                return (
                  <div key={alert.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${severityColors}`}>
                            {alert.severity}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mt-2">{alert.message}</p>
                        {alert.backtestRun && (
                          <Link
                            href={`/dashboard/backtests/${alert.backtestRun.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                          >
                            View Backtest: {alert.backtestRun.symbol}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Backtests Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Backtests</h2>
          </div>
          <BacktestsTable backtests={backtests} />
        </div>
      </div>
    </div>
  );
}
