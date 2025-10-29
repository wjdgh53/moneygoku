/**
 * Export Buttons Component
 *
 * Provides buttons to export backtest results to PDF and Excel formats
 */

'use client';

import { useState } from 'react';
import { exportToExcel, exportToPDF, BacktestExportData } from '@/lib/utils/export/backtestExport';

interface ExportButtonsProps {
  backtestId: string;
}

export function ExportButtons({ backtestId }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(format);

    try {
      // Fetch complete backtest data
      const response = await fetch(`/api/backtests/${backtestId}`);
      if (!response.ok) throw new Error('Failed to fetch backtest data');

      const { backtest } = await response.json();

      // Fetch equity curve
      const equityResponse = await fetch(`/api/backtests/${backtestId}/equity-curve`);
      const equityData = await equityResponse.json();

      // Fetch trades
      const tradesResponse = await fetch(`/api/backtests/${backtestId}/trades`);
      const tradesData = await tradesResponse.json();

      // Prepare export data
      const exportData: BacktestExportData = {
        id: backtest.id,
        symbol: backtest.symbol,
        strategyName: backtest.strategy?.name || 'Unknown Strategy',
        timeHorizon: backtest.timeHorizon,
        startDate: backtest.startDate,
        endDate: backtest.endDate,
        initialCash: backtest.initialCash,
        totalReturnPct: backtest.totalReturnPct,
        totalReturn: backtest.totalReturn,
        finalEquity: backtest.finalEquity,
        sharpeRatio: backtest.sharpeRatio,
        sortinoRatio: backtest.sortinoRatio,
        maxDrawdown: backtest.maxDrawdown,
        maxDrawdownDate: backtest.maxDrawdownDate,
        winRate: backtest.winRate,
        profitFactor: backtest.profitFactor,
        expectancy: backtest.expectancy,
        avgWinPct: backtest.avgWinPct,
        avgLossPct: backtest.avgLossPct,
        totalTrades: backtest.totalTrades,
        winningTrades: backtest.winningTrades,
        losingTrades: backtest.losingTrades,
        barsProcessed: backtest.barsProcessed,
        executionTime: backtest.executionTime,
        trades: tradesData.success ? tradesData.trades.map((t: any) => ({
          timestamp: t.executionBar,
          side: t.side,
          symbol: t.symbol,
          quantity: t.quantity,
          entryPrice: t.entryPrice,
          executedPrice: t.executedPrice,
          realizedPL: t.realizedPL,
          realizedPLPct: t.realizedPLPct,
          holdingPeriod: t.holdingPeriod,
          exitReason: t.exitReason,
          commission: t.commission,
          slippage: t.slippage,
        })) : [],
        equityCurve: equityData.success ? equityData.equityCurve.map((e: any) => ({
          timestamp: e.timestamp,
          cash: e.cash,
          stockValue: e.stockValue,
          totalEquity: e.totalEquity,
          drawdownPct: e.drawdownPct,
        })) : [],
      };

      // Perform export
      if (format === 'excel') {
        exportToExcel(exportData);
      } else {
        exportToPDF(exportData);
      }
    } catch (error) {
      console.error(`Export failed:`, error);
      alert(`Failed to export to ${format.toUpperCase()}. Please try again.`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleExport('pdf')}
        disabled={exporting !== null}
        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {exporting === 'pdf' ? (
          <>
            <span className="animate-spin">⏳</span>
            Exporting...
          </>
        ) : (
          <>
            <span>📄</span>
            Export PDF
          </>
        )}
      </button>
      <button
        onClick={() => handleExport('excel')}
        disabled={exporting !== null}
        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {exporting === 'excel' ? (
          <>
            <span className="animate-spin">⏳</span>
            Exporting...
          </>
        ) : (
          <>
            <span>📊</span>
            Export Excel
          </>
        )}
      </button>
    </div>
  );
}
