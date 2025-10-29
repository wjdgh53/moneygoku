/**
 * Performance Heatmap Component
 *
 * Displays a visual heatmap of backtest returns organized by:
 * - Rows: Different strategies or symbols
 * - Columns: Time periods (months, quarters, or years)
 * - Color intensity: Return performance (green for positive, red for negative)
 */

'use client';

import { useState } from 'react';

export interface HeatmapDataPoint {
  id: string;
  label: string; // Strategy name or symbol
  periods: {
    period: string; // '2024-01', '2024-Q1', or '2024'
    return: number; // Percentage return
    trades: number; // Number of trades in period
  }[];
}

interface PerformanceHeatmapProps {
  data: HeatmapDataPoint[];
  periodType?: 'month' | 'quarter' | 'year';
  title?: string;
}

export function PerformanceHeatmap({
  data,
  periodType = 'month',
  title = 'Strategy Performance Heatmap'
}: PerformanceHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    label: string;
    period: string;
    return: number;
    trades: number;
  } | null>(null);

  // Extract all unique periods and sort them
  const allPeriods = Array.from(
    new Set(data.flatMap(item => item.periods.map(p => p.period)))
  ).sort();

  // Color scale function: maps return percentage to color
  const getColor = (returnPct: number): string => {
    if (returnPct === 0) return 'bg-gray-100';

    // Positive returns: green scale
    if (returnPct > 0) {
      if (returnPct >= 20) return 'bg-green-600';
      if (returnPct >= 15) return 'bg-green-500';
      if (returnPct >= 10) return 'bg-green-400';
      if (returnPct >= 5) return 'bg-green-300';
      return 'bg-green-200';
    }

    // Negative returns: red scale
    if (returnPct <= -20) return 'bg-red-600';
    if (returnPct <= -15) return 'bg-red-500';
    if (returnPct <= -10) return 'bg-red-400';
    if (returnPct <= -5) return 'bg-red-300';
    return 'bg-red-200';
  };

  // Format period label based on type
  const formatPeriodLabel = (period: string): string => {
    if (periodType === 'month') {
      const [year, month] = period.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
    }
    if (periodType === 'quarter') {
      return period; // Already formatted like '2024-Q1'
    }
    return period; // Year
  };

  // Calculate summary statistics
  const overallStats = {
    avgReturn: data.length > 0
      ? data.reduce((sum, item) => {
          const itemAvg = item.periods.reduce((s, p) => s + p.return, 0) / item.periods.length;
          return sum + itemAvg;
        }, 0) / data.length
      : 0,
    bestReturn: Math.max(...data.flatMap(item => item.periods.map(p => p.return))),
    worstReturn: Math.min(...data.flatMap(item => item.periods.map(p => p.return))),
    totalTrades: data.reduce((sum, item) => sum + item.periods.reduce((s, p) => s + p.trades, 0), 0),
  };

  if (data.length === 0 || allPeriods.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <div className="text-center text-gray-500 py-12">
          No performance data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Color intensity indicates return magnitude • Hover for details
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-600">Positive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 rounded border border-gray-300"></div>
            <span className="text-gray-600">Neutral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-600">Negative</span>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-600">Average Return</p>
          <p className={`text-lg font-semibold ${
            overallStats.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {overallStats.avgReturn >= 0 ? '+' : ''}{overallStats.avgReturn.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Best Period</p>
          <p className="text-lg font-semibold text-green-600">
            +{overallStats.bestReturn.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Worst Period</p>
          <p className="text-lg font-semibold text-red-600">
            {overallStats.worstReturn.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Total Trades</p>
          <p className="text-lg font-semibold text-gray-900">
            {overallStats.totalTrades}
          </p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b-2 border-gray-200">
                  Strategy
                </th>
                {allPeriods.map((period) => (
                  <th
                    key={period}
                    className="px-2 py-2 text-center text-xs font-medium text-gray-600 uppercase tracking-wider border-b-2 border-gray-200"
                  >
                    {formatPeriodLabel(period)}
                  </th>
                ))}
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase tracking-wider border-b-2 border-gray-200">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, rowIndex) => {
                const rowAvg = item.periods.reduce((sum, p) => sum + p.return, 0) / item.periods.length;

                return (
                  <tr key={item.id} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {item.label}
                    </td>
                    {allPeriods.map((period) => {
                      const periodData = item.periods.find(p => p.period === period);

                      if (!periodData) {
                        return (
                          <td key={period} className="px-2 py-3 text-center border-r border-gray-100">
                            <div className="w-full h-12 bg-gray-50 rounded"></div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={period}
                          className="px-2 py-3 text-center border-r border-gray-100 relative"
                          onMouseEnter={() => setHoveredCell({
                            label: item.label,
                            period,
                            return: periodData.return,
                            trades: periodData.trades,
                          })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <div
                            className={`w-full h-12 rounded flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:shadow-md ${getColor(periodData.return)}`}
                          >
                            <span className={`text-xs font-semibold ${
                              Math.abs(periodData.return) > 10 ? 'text-white' : 'text-gray-900'
                            }`}>
                              {periodData.return >= 0 ? '+' : ''}{periodData.return.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center border-l-2 border-gray-200">
                      <span className={`text-sm font-semibold ${
                        rowAvg >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {rowAvg >= 0 ? '+' : ''}{rowAvg.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredCell && (
        <div className="fixed z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="font-semibold mb-1">{hoveredCell.label}</div>
          <div className="text-xs space-y-1">
            <div>Period: {formatPeriodLabel(hoveredCell.period)}</div>
            <div className={hoveredCell.return >= 0 ? 'text-green-300' : 'text-red-300'}>
              Return: {hoveredCell.return >= 0 ? '+' : ''}{hoveredCell.return.toFixed(2)}%
            </div>
            <div className="text-gray-300">Trades: {hoveredCell.trades}</div>
          </div>
        </div>
      )}

      {/* Color Scale Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs text-gray-600 mr-2">Return Scale:</span>
          <div className="flex items-center gap-1">
            <div className="w-8 h-4 bg-red-600 rounded-l"></div>
            <div className="w-8 h-4 bg-red-500"></div>
            <div className="w-8 h-4 bg-red-400"></div>
            <div className="w-8 h-4 bg-red-300"></div>
            <div className="w-8 h-4 bg-red-200"></div>
            <div className="w-8 h-4 bg-gray-100 border border-gray-300"></div>
            <div className="w-8 h-4 bg-green-200"></div>
            <div className="w-8 h-4 bg-green-300"></div>
            <div className="w-8 h-4 bg-green-400"></div>
            <div className="w-8 h-4 bg-green-500"></div>
            <div className="w-8 h-4 bg-green-600 rounded-r"></div>
          </div>
          <div className="ml-2 flex gap-4 text-xs text-gray-600">
            <span>&lt; -20%</span>
            <span>0%</span>
            <span>&gt; +20%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
