/**
 * Strategy Comparison Page
 *
 * Allows users to select and compare multiple backtest results side-by-side:
 * - Performance metrics comparison table
 * - Synchronized equity curves
 * - Win/loss statistics comparison
 * - Risk-adjusted performance comparison
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface BacktestSummary {
  id: string;
  symbol: string;
  strategyName: string;
  timeHorizon: string;
  startDate: string;
  endDate: string;
  totalReturnPct: number | null;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  maxDrawdown: number | null;
  winRate: number | null;
  totalTrades: number | null;
  profitFactor: number | null;
  expectancy: number | null;
}

const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
];

export default function ComparisonPage() {
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [backtests, setBacktests] = useState<BacktestSummary[]>([]);
  const [availableBacktests, setAvailableBacktests] = useState<BacktestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [equityCurves, setEquityCurves] = useState<Record<string, any[]>>({});

  // Load initial IDs from URL params
  useEffect(() => {
    const idsParam = searchParams.get('ids');
    if (idsParam) {
      setSelectedIds(idsParam.split(','));
    }
  }, [searchParams]);

  // Fetch available backtests
  useEffect(() => {
    async function fetchAvailableBacktests() {
      try {
        const response = await fetch('/api/backtests?status=COMPLETED&limit=100');
        const data = await response.json();

        if (data.success) {
          const summaries: BacktestSummary[] = data.backtests.map((b: any) => ({
            id: b.id,
            symbol: b.symbol,
            strategyName: b.strategy?.name || 'Unknown',
            timeHorizon: b.timeHorizon,
            startDate: b.startDate,
            endDate: b.endDate,
            totalReturnPct: b.totalReturnPct,
            sharpeRatio: b.sharpeRatio,
            sortinoRatio: b.sortinoRatio,
            maxDrawdown: b.maxDrawdown,
            winRate: b.winRate,
            totalTrades: b.totalTrades,
            profitFactor: b.profitFactor,
            expectancy: b.expectancy,
          }));
          setAvailableBacktests(summaries);
        }
      } catch (error) {
        console.error('Failed to fetch backtests:', error);
      }
    }

    fetchAvailableBacktests();
  }, []);

  // Fetch selected backtests data
  useEffect(() => {
    if (selectedIds.length === 0) {
      setBacktests([]);
      setEquityCurves({});
      setLoading(false);
      return;
    }

    async function fetchBacktests() {
      setLoading(true);
      try {
        const promises = selectedIds.map(id =>
          fetch(`/api/backtests/${id}`).then(res => res.json())
        );

        const results = await Promise.all(promises);

        const loadedBacktests: BacktestSummary[] = results
          .filter(r => r.success)
          .map(r => r.backtest)
          .map(b => ({
            id: b.id,
            symbol: b.symbol,
            strategyName: b.strategy?.name || 'Unknown',
            timeHorizon: b.timeHorizon,
            startDate: b.startDate,
            endDate: b.endDate,
            totalReturnPct: b.totalReturnPct,
            sharpeRatio: b.sharpeRatio,
            sortinoRatio: b.sortinoRatio,
            maxDrawdown: b.maxDrawdown,
            winRate: b.winRate,
            totalTrades: b.totalTrades,
            profitFactor: b.profitFactor,
            expectancy: b.expectancy,
          }));

        setBacktests(loadedBacktests);

        // Fetch equity curves
        const equityCurvePromises = selectedIds.map(id =>
          fetch(`/api/backtests/${id}/equity-curve`)
            .then(res => res.json())
            .then(data => ({ id, curve: data.success ? data.equityCurve : [] }))
        );

        const equityCurveResults = await Promise.all(equityCurvePromises);
        const curves: Record<string, any[]> = {};
        equityCurveResults.forEach(({ id, curve }) => {
          curves[id] = curve;
        });
        setEquityCurves(curves);
      } catch (error) {
        console.error('Failed to fetch backtests:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBacktests();
  }, [selectedIds]);

  // Toggle backtest selection
  const toggleBacktest = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Prepare equity curve data for comparison chart
  const prepareEquityCurveData = () => {
    if (Object.keys(equityCurves).length === 0) return [];

    // Find all unique timestamps
    const allTimestamps = new Set<number>();
    Object.values(equityCurves).forEach(curve => {
      curve.forEach(point => {
        allTimestamps.add(new Date(point.timestamp).getTime());
      });
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Build chart data
    return sortedTimestamps.map(ts => {
      const dataPoint: any = {
        timestamp: ts,
        date: new Date(ts).toLocaleDateString(),
      };

      selectedIds.forEach((id, index) => {
        const curve = equityCurves[id] || [];
        const point = curve.find(p => new Date(p.timestamp).getTime() === ts);
        const backtest = backtests.find(b => b.id === id);
        const label = backtest ? `${backtest.symbol} - ${backtest.strategyName}` : id;
        dataPoint[label] = point ? point.totalEquity : null;
      });

      return dataPoint;
    });
  };

  const equityCurveData = prepareEquityCurveData();

  // Prepare metrics comparison data
  const metricsComparisonData = backtests.map((b, index) => ({
    name: `${b.symbol}\n${b.strategyName}`,
    totalReturn: b.totalReturnPct || 0,
    sharpe: b.sharpeRatio || 0,
    sortino: b.sortinoRatio || 0,
    maxDrawdown: b.maxDrawdown || 0,
    winRate: b.winRate || 0,
    profitFactor: b.profitFactor || 0,
  }));

  if (loading && selectedIds.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/backtests"
              className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
            >
              ← Back to Backtests
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">Strategy Comparison</h1>
            <p className="text-gray-600 mt-1">
              Compare multiple backtest results side-by-side
            </p>
          </div>
        </div>

        {/* Backtest Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Backtests to Compare ({selectedIds.length} selected)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableBacktests.map((bt) => (
              <button
                key={bt.id}
                onClick={() => toggleBacktest(bt.id)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  selectedIds.includes(bt.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{bt.symbol}</h3>
                    <p className="text-sm text-gray-600">{bt.strategyName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(bt.startDate).toLocaleDateString()} - {new Date(bt.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedIds.includes(bt.id) && (
                    <span className="text-blue-600 font-bold">✓</span>
                  )}
                </div>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className={`font-semibold ${
                    (bt.totalReturnPct || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(bt.totalReturnPct || 0) >= 0 ? '+' : ''}{(bt.totalReturnPct || 0).toFixed(1)}%
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600">Sharpe: {(bt.sharpeRatio || 0).toFixed(2)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedIds.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Select at least one backtest to start comparison</p>
          </div>
        )}

        {selectedIds.length > 0 && (
          <>
            {/* Performance Metrics Comparison Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Strategy
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Return
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sharpe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sortino
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Max DD
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Win Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profit Factor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Trades
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {backtests.map((bt, index) => (
                      <tr key={bt.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bt.strategyName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bt.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${
                            (bt.totalReturnPct || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(bt.totalReturnPct || 0) >= 0 ? '+' : ''}{(bt.totalReturnPct || 0).toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bt.sharpeRatio !== null ? bt.sharpeRatio.toFixed(2) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bt.sortinoRatio !== null ? bt.sortinoRatio.toFixed(2) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {bt.maxDrawdown !== null ? `${bt.maxDrawdown.toFixed(2)}%` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bt.winRate !== null ? `${bt.winRate.toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bt.profitFactor !== null ? bt.profitFactor.toFixed(2) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bt.totalTrades || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Equity Curves Comparison */}
            {equityCurveData.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Equity Curves Comparison</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={equityCurveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: any) => [`$${value.toFixed(2)}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {backtests.map((bt, index) => {
                      const label = `${bt.symbol} - ${bt.strategyName}`;
                      return (
                        <Line
                          key={bt.id}
                          type="monotone"
                          dataKey={label}
                          stroke={CHART_COLORS[index % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          name={label}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Metrics Bar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Returns Comparison */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Returns</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                    <YAxis tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value: any) => [`${value.toFixed(2)}%`, 'Return']} />
                    <Bar dataKey="totalReturn" fill="#3b82f6" name="Total Return %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Risk-Adjusted Returns */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk-Adjusted Returns</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sharpe" fill="#10b981" name="Sharpe Ratio" />
                    <Bar dataKey="sortino" fill="#8b5cf6" name="Sortino Ratio" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
