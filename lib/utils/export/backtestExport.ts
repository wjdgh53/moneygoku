/**
 * Backtest Export Utilities
 *
 * Provides functions to export backtest results to:
 * - Excel (.xlsx) format
 * - PDF format (via browser print)
 */

import * as XLSX from 'xlsx';

export interface BacktestExportData {
  // Backtest metadata
  id: string;
  symbol: string;
  strategyName: string;
  timeHorizon: string;
  startDate: string;
  endDate: string;
  initialCash: number;

  // Performance metrics
  totalReturnPct: number | null;
  totalReturn: number | null;
  finalEquity: number | null;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  maxDrawdown: number | null;
  maxDrawdownDate: string | null;
  winRate: number | null;
  profitFactor: number | null;
  expectancy: number | null;
  avgWinPct: number | null;
  avgLossPct: number | null;

  // Trade statistics
  totalTrades: number | null;
  winningTrades: number | null;
  losingTrades: number | null;
  barsProcessed: number | null;
  executionTime: number | null;

  // Trade history
  trades: Array<{
    timestamp: string;
    side: string;
    symbol: string;
    quantity: number;
    entryPrice: number | null;
    executedPrice: number;
    realizedPL: number | null;
    realizedPLPct: number | null;
    holdingPeriod: number | null;
    exitReason: string | null;
    commission: number;
    slippage: number;
  }>;

  // Equity curve
  equityCurve: Array<{
    timestamp: string;
    cash: number;
    stockValue: number;
    totalEquity: number;
    drawdownPct: number;
  }>;
}

/**
 * Export backtest results to Excel (.xlsx)
 */
export function exportToExcel(data: BacktestExportData) {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ['Backtest Summary'],
    [],
    ['Backtest ID', data.id],
    ['Symbol', data.symbol],
    ['Strategy', data.strategyName],
    ['Time Horizon', data.timeHorizon],
    ['Period', `${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}`],
    ['Initial Cash', `$${data.initialCash.toLocaleString()}`],
    [],
    ['Performance Metrics'],
    [],
    ['Total Return', data.totalReturnPct !== null ? `${data.totalReturnPct.toFixed(2)}%` : 'N/A'],
    ['Total Return ($)', data.totalReturn !== null ? `$${data.totalReturn.toFixed(2)}` : 'N/A'],
    ['Final Equity', data.finalEquity !== null ? `$${data.finalEquity.toFixed(2)}` : 'N/A'],
    ['Sharpe Ratio', data.sharpeRatio !== null ? data.sharpeRatio.toFixed(3) : 'N/A'],
    ['Sortino Ratio', data.sortinoRatio !== null ? data.sortinoRatio.toFixed(3) : 'N/A'],
    ['Max Drawdown', data.maxDrawdown !== null ? `${data.maxDrawdown.toFixed(2)}%` : 'N/A'],
    ['Max Drawdown Date', data.maxDrawdownDate ? new Date(data.maxDrawdownDate).toLocaleDateString() : 'N/A'],
    ['Win Rate', data.winRate !== null ? `${data.winRate.toFixed(2)}%` : 'N/A'],
    ['Profit Factor', data.profitFactor !== null ? data.profitFactor.toFixed(2) : 'N/A'],
    ['Expectancy', data.expectancy !== null ? `$${data.expectancy.toFixed(2)}` : 'N/A'],
    ['Avg Win %', data.avgWinPct !== null ? `${data.avgWinPct.toFixed(2)}%` : 'N/A'],
    ['Avg Loss %', data.avgLossPct !== null ? `${data.avgLossPct.toFixed(2)}%` : 'N/A'],
    [],
    ['Trade Statistics'],
    [],
    ['Total Trades', data.totalTrades || 0],
    ['Winning Trades', data.winningTrades || 0],
    ['Losing Trades', data.losingTrades || 0],
    ['Bars Processed', data.barsProcessed || 0],
    ['Execution Time', data.executionTime ? `${data.executionTime.toFixed(2)}s` : 'N/A'],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Sheet 2: Trade History
  if (data.trades.length > 0) {
    const tradesData = [
      ['Trade History'],
      [],
      [
        'Timestamp',
        'Side',
        'Symbol',
        'Quantity',
        'Entry Price',
        'Executed Price',
        'Realized P&L',
        'Realized P&L %',
        'Holding Period',
        'Exit Reason',
        'Commission',
        'Slippage',
      ],
      ...data.trades.map(t => [
        new Date(t.timestamp).toLocaleString(),
        t.side,
        t.symbol,
        t.quantity,
        t.entryPrice !== null ? `$${t.entryPrice.toFixed(2)}` : 'N/A',
        `$${t.executedPrice.toFixed(2)}`,
        t.realizedPL !== null ? `$${t.realizedPL.toFixed(2)}` : 'N/A',
        t.realizedPLPct !== null ? `${t.realizedPLPct.toFixed(2)}%` : 'N/A',
        t.holdingPeriod || 'N/A',
        t.exitReason || 'N/A',
        `$${t.commission.toFixed(2)}`,
        `$${t.slippage.toFixed(2)}`,
      ]),
    ];

    const tradesSheet = XLSX.utils.aoa_to_sheet(tradesData);
    XLSX.utils.book_append_sheet(wb, tradesSheet, 'Trades');
  }

  // Sheet 3: Equity Curve
  if (data.equityCurve.length > 0) {
    const equityData = [
      ['Equity Curve'],
      [],
      ['Timestamp', 'Cash', 'Stock Value', 'Total Equity', 'Drawdown %'],
      ...data.equityCurve.map(e => [
        new Date(e.timestamp).toLocaleString(),
        `$${e.cash.toFixed(2)}`,
        `$${e.stockValue.toFixed(2)}`,
        `$${e.totalEquity.toFixed(2)}`,
        `${e.drawdownPct.toFixed(2)}%`,
      ]),
    ];

    const equitySheet = XLSX.utils.aoa_to_sheet(equityData);
    XLSX.utils.book_append_sheet(wb, equitySheet, 'Equity Curve');
  }

  // Generate filename
  const filename = `backtest_${data.symbol}_${data.strategyName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);
}

/**
 * Prepare print-friendly view for PDF export
 * Opens a new window with formatted content for browser print
 */
export function exportToPDF(data: BacktestExportData) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Backtest Report - ${data.symbol} - ${data.strategyName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      max-width: 210mm;
      margin: 0 auto;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      color: #1a1a1a;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
    }
    h2 {
      font-size: 18px;
      margin-top: 30px;
      margin-bottom: 15px;
      color: #1a1a1a;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      padding: 15px;
      background: #f9fafb;
      border-left: 4px solid #3b82f6;
    }
    .metric-label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #6b7280;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>Backtest Report</h1>

  <h2>Backtest Information</h2>
  <table>
    <tr><td><strong>Backtest ID:</strong></td><td>${data.id}</td></tr>
    <tr><td><strong>Symbol:</strong></td><td>${data.symbol}</td></tr>
    <tr><td><strong>Strategy:</strong></td><td>${data.strategyName}</td></tr>
    <tr><td><strong>Time Horizon:</strong></td><td>${data.timeHorizon}</td></tr>
    <tr><td><strong>Period:</strong></td><td>${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}</td></tr>
    <tr><td><strong>Initial Cash:</strong></td><td>$${data.initialCash.toLocaleString()}</td></tr>
  </table>

  <h2>Performance Metrics</h2>
  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-label">Total Return</div>
      <div class="metric-value ${(data.totalReturnPct || 0) >= 0 ? 'positive' : 'negative'}">
        ${data.totalReturnPct !== null ? `${data.totalReturnPct >= 0 ? '+' : ''}${data.totalReturnPct.toFixed(2)}%` : 'N/A'}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Sharpe Ratio</div>
      <div class="metric-value">${data.sharpeRatio !== null ? data.sharpeRatio.toFixed(3) : 'N/A'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Win Rate</div>
      <div class="metric-value">${data.winRate !== null ? `${data.winRate.toFixed(2)}%` : 'N/A'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Max Drawdown</div>
      <div class="metric-value negative">${data.maxDrawdown !== null ? `${data.maxDrawdown.toFixed(2)}%` : 'N/A'}</div>
    </div>
  </div>

  <table>
    <tr><td><strong>Sortino Ratio:</strong></td><td>${data.sortinoRatio !== null ? data.sortinoRatio.toFixed(3) : 'N/A'}</td></tr>
    <tr><td><strong>Profit Factor:</strong></td><td>${data.profitFactor !== null ? data.profitFactor.toFixed(2) : 'N/A'}</td></tr>
    <tr><td><strong>Expectancy:</strong></td><td>${data.expectancy !== null ? `$${data.expectancy.toFixed(2)}` : 'N/A'}</td></tr>
    <tr><td><strong>Average Win %:</strong></td><td>${data.avgWinPct !== null ? `${data.avgWinPct.toFixed(2)}%` : 'N/A'}</td></tr>
    <tr><td><strong>Average Loss %:</strong></td><td>${data.avgLossPct !== null ? `${data.avgLossPct.toFixed(2)}%` : 'N/A'}</td></tr>
  </table>

  <h2>Trade Statistics</h2>
  <table>
    <tr><td><strong>Total Trades:</strong></td><td>${data.totalTrades || 0}</td></tr>
    <tr><td><strong>Winning Trades:</strong></td><td>${data.winningTrades || 0}</td></tr>
    <tr><td><strong>Losing Trades:</strong></td><td>${data.losingTrades || 0}</td></tr>
    <tr><td><strong>Bars Processed:</strong></td><td>${data.barsProcessed || 0}</td></tr>
    <tr><td><strong>Execution Time:</strong></td><td>${data.executionTime ? `${data.executionTime.toFixed(2)}s` : 'N/A'}</td></tr>
  </table>

  ${data.trades.length > 0 ? `
    <h2>Trade History (First 50 Trades)</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Side</th>
          <th>Quantity</th>
          <th>Entry</th>
          <th>Exit</th>
          <th>P&L</th>
          <th>P&L %</th>
          <th>Hold</th>
        </tr>
      </thead>
      <tbody>
        ${data.trades.slice(0, 50).map(t => `
          <tr>
            <td>${new Date(t.timestamp).toLocaleDateString()}</td>
            <td>${t.side}</td>
            <td>${t.quantity}</td>
            <td>${t.entryPrice !== null ? `$${t.entryPrice.toFixed(2)}` : 'N/A'}</td>
            <td>$${t.executedPrice.toFixed(2)}</td>
            <td class="${(t.realizedPL || 0) >= 0 ? 'positive' : 'negative'}">
              ${t.realizedPL !== null ? `$${t.realizedPL.toFixed(2)}` : 'N/A'}
            </td>
            <td class="${(t.realizedPLPct || 0) >= 0 ? 'positive' : 'negative'}">
              ${t.realizedPLPct !== null ? `${t.realizedPLPct.toFixed(2)}%` : 'N/A'}
            </td>
            <td>${t.holdingPeriod || 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <div class="footer">
    Generated on ${new Date().toLocaleString()} | Backtest ID: ${data.id}
  </div>

  <div class="no-print" style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
      Print / Save as PDF
    </button>
    <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-left: 10px;">
      Close
    </button>
  </div>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
