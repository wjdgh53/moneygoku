/**
 * Equity Curve Chart Component
 *
 * Displays the portfolio equity curve over time with:
 * - Total equity (cash + stock value)
 * - Drawdown visualization
 * - High water mark tracking
 * - Interactive tooltips
 */

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
} from 'recharts';

export interface EquityCurveDataPoint {
  timestamp: Date | string;
  totalEquity: number;
  cash: number;
  stockValue: number;
  highWaterMark: number;
  drawdownPct: number;
}

interface EquityCurveChartProps {
  data: EquityCurveDataPoint[];
  initialCash?: number;
  showDrawdown?: boolean;
  height?: number;
}

export function EquityCurveChart({
  data,
  initialCash = 10000,
  showDrawdown = true,
  height = 400,
}: EquityCurveChartProps) {
  // Transform data for Recharts
  const chartData = data.map((point) => ({
    timestamp: new Date(point.timestamp).getTime(),
    date: new Date(point.timestamp).toLocaleDateString(),
    totalEquity: point.totalEquity,
    cash: point.cash,
    stockValue: point.stockValue,
    highWaterMark: point.highWaterMark,
    drawdownPct: point.drawdownPct,
    returnPct: ((point.totalEquity - initialCash) / initialCash) * 100,
  }));

  // Calculate statistics
  const finalEquity = chartData.length > 0 ? chartData[chartData.length - 1].totalEquity : initialCash;
  const totalReturn = ((finalEquity - initialCash) / initialCash) * 100;
  const maxDrawdown = Math.min(...chartData.map(d => d.drawdownPct));
  const maxEquity = Math.max(...chartData.map(d => d.totalEquity));
  const minEquity = Math.min(...chartData.map(d => d.totalEquity));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4">
        <p className="text-sm font-semibold text-gray-900 mb-2">{data.date}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Total Equity:</span>
            <span className="font-semibold text-gray-900">
              ${data.totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Cash:</span>
            <span className="text-gray-700">
              ${data.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Stock Value:</span>
            <span className="text-gray-700">
              ${data.stockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-gray-200">
            <span className="text-gray-600">Return:</span>
            <span className={`font-semibold ${data.returnPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.returnPct >= 0 ? '+' : ''}{data.returnPct.toFixed(2)}%
            </span>
          </div>
          {showDrawdown && data.drawdownPct < 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Drawdown:</span>
              <span className="text-red-600 font-semibold">
                {data.drawdownPct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No equity curve data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">Initial Capital</p>
          <p className="text-lg font-semibold text-gray-900">
            ${initialCash.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">Final Equity</p>
          <p className="text-lg font-semibold text-gray-900">
            ${finalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">Total Return</p>
          <p className={`text-lg font-semibold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">Max Drawdown</p>
          <p className="text-lg font-semibold text-red-600">
            {maxDrawdown.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Main Equity Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Portfolio Value Over Time</h3>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData}>
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
              yAxisId="equity"
              domain={[Math.floor(minEquity * 0.95), Math.ceil(maxEquity * 1.05)]}
              tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            {showDrawdown && (
              <YAxis
                yAxisId="drawdown"
                orientation="right"
                domain={[Math.floor(maxDrawdown * 1.2), 0]}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                stroke="#ef4444"
                style={{ fontSize: '12px' }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />

            {/* Initial capital reference line */}
            <ReferenceLine
              yAxisId="equity"
              y={initialCash}
              stroke="#9ca3af"
              strokeDasharray="5 5"
              label={{ value: 'Initial', position: 'right', fontSize: 11, fill: '#6b7280' }}
            />

            {/* High water mark */}
            <Line
              yAxisId="equity"
              type="monotone"
              dataKey="highWaterMark"
              stroke="#10b981"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              name="High Water Mark"
              opacity={0.5}
            />

            {/* Total Equity - Main line */}
            <Line
              yAxisId="equity"
              type="monotone"
              dataKey="totalEquity"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Total Equity"
            />

            {/* Drawdown area (if enabled) */}
            {showDrawdown && (
              <Area
                yAxisId="drawdown"
                type="monotone"
                dataKey="drawdownPct"
                fill="#fee2e2"
                stroke="#ef4444"
                strokeWidth={1}
                name="Drawdown %"
                opacity={0.6}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Cash vs Stock Value Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Cash vs Stock Allocation</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
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
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="cash"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="Cash"
            />
            <Line
              type="monotone"
              dataKey="stockValue"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="Stock Value"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
