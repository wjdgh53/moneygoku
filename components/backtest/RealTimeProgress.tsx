/**
 * Real-Time Backtest Progress Component
 *
 * Displays live progress updates for a running backtest using SSE
 */

'use client';

import { useBacktestStream } from '@/lib/hooks/useBacktestStream';

interface RealTimeProgressProps {
  backtestRunId: string;
  onComplete?: () => void;
}

export function RealTimeProgress({ backtestRunId, onComplete }: RealTimeProgressProps) {
  const {
    connected,
    error,
    progress,
    status,
    latestTrade,
    latestEquity,
    completionData,
  } = useBacktestStream(backtestRunId);

  // Call onComplete callback when backtest finishes
  if (status === 'COMPLETED' && onComplete) {
    setTimeout(onComplete, 1000);
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-semibold">Connection Error</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (status === 'FAILED') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-semibold">❌ Backtest Failed</p>
        <p className="text-red-600 text-sm mt-1">{error || 'Unknown error occurred'}</p>
      </div>
    );
  }

  if (status === 'COMPLETED' && completionData) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">✅</span>
          <h3 className="text-lg font-semibold text-green-800">Backtest Completed!</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-green-700">Final Equity</p>
            <p className="text-lg font-bold text-green-900">
              ${completionData.finalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-green-700">Total Return</p>
            <p className={`text-lg font-bold ${
              completionData.totalReturnPct >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {completionData.totalReturnPct >= 0 ? '+' : ''}{completionData.totalReturnPct.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-green-700">Total Trades</p>
            <p className="text-lg font-bold text-green-900">{completionData.totalTrades}</p>
          </div>
          <div>
            <p className="text-xs text-green-700">Execution Time</p>
            <p className="text-lg font-bold text-green-900">{completionData.executionTime.toFixed(2)}s</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <h3 className="text-lg font-semibold text-blue-900">
            {status === 'RUNNING' ? 'Running Backtest...' : 'Initializing...'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="text-xs text-gray-600">{connected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-blue-700">Processing bars...</span>
            <span className="font-semibold text-blue-900">
              {progress.barsProcessed} / {progress.totalBars} ({progress.progressPct.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress.progressPct}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-blue-600">
            Current Timestamp: {progress.currentTimestamp?.toLocaleString() || 'N/A'}
          </div>
        </div>
      )}

      {/* Latest Equity */}
      {latestEquity && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white rounded-lg border border-blue-200">
          <div>
            <p className="text-xs text-gray-600">Cash</p>
            <p className="text-sm font-semibold text-gray-900">
              ${latestEquity.cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Stock Value</p>
            <p className="text-sm font-semibold text-gray-900">
              ${latestEquity.stockValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Total Equity</p>
            <p className="text-sm font-bold text-blue-600">
              ${latestEquity.totalEquity.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Drawdown</p>
            <p className={`text-sm font-semibold ${
              latestEquity.drawdownPct < 0 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {latestEquity.drawdownPct.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Latest Trade */}
      {latestTrade && (
        <div className="p-4 bg-white rounded-lg border border-blue-200">
          <p className="text-xs text-gray-600 mb-2">Latest Trade</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                latestTrade.side === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {latestTrade.side}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {latestTrade.quantity} @ ${latestTrade.executedPrice.toFixed(2)}
              </span>
            </div>
            {latestTrade.realizedPL !== undefined && latestTrade.realizedPL !== null && (
              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  latestTrade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {latestTrade.realizedPL >= 0 ? '+' : ''}${latestTrade.realizedPL.toFixed(2)}
                </p>
                {latestTrade.realizedPLPct !== undefined && (
                  <p className="text-xs text-gray-600">
                    ({latestTrade.realizedPLPct >= 0 ? '+' : ''}{latestTrade.realizedPLPct.toFixed(2)}%)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
