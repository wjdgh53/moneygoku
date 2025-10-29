/**
 * PerformanceAnalytics
 *
 * Calculates comprehensive performance metrics for completed backtests:
 * - Trade-level metrics (win rate, profit factor, expectancy)
 * - Risk metrics (Sharpe ratio, Sortino ratio, max drawdown)
 * - Statistical analysis (VaR, CVaR)
 *
 * Reference: docs/backtesting/PHASE2_VIRTUAL_PORTFOLIO_SIMULATOR.md
 */

import { prisma } from '@/lib/prisma';

export class PerformanceAnalytics {
  /**
   * Calculate all performance metrics for a completed backtest
   *
   * Returns:
   * - totalTrades, winningTrades, losingTrades, winRate
   * - finalCash, finalEquity, totalReturn, totalReturnPct
   * - sharpeRatio, sortinoRatio, maxDrawdown
   * - avgWinPct, avgLossPct, profitFactor, expectancy
   */
  async calculateMetrics(backtestRunId: string): Promise<any> {
    // 1. Load all trades
    const trades = await prisma.backtestTrade.findMany({
      where: { backtestRunId },
      orderBy: { executionBar: 'asc' },
    });

    // 2. Load equity curve
    const equityCurve = await prisma.backtestEquityCurve.findMany({
      where: { backtestRunId },
      orderBy: { timestamp: 'asc' },
    });

    // 3. Load backtest config
    const backtestRun = await prisma.backtestRun.findUnique({
      where: { id: backtestRunId },
    });

    if (!backtestRun) {
      throw new Error(`BacktestRun ${backtestRunId} not found`);
    }

    const initialCash = backtestRun.initialCash;
    const finalEquity = equityCurve[equityCurve.length - 1]?.totalEquity || initialCash;
    const finalCash = equityCurve[equityCurve.length - 1]?.cash || initialCash;

    // 4. Calculate trade-level metrics
    const sellTrades = trades.filter((t) => t.side === 'SELL');
    const totalTrades = sellTrades.length;
    const winningTrades = sellTrades.filter((t) => (t.realizedPL || 0) > 0).length;
    const losingTrades = sellTrades.filter((t) => (t.realizedPL || 0) < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // 5. Calculate P&L metrics
    const totalReturn = finalEquity - initialCash;
    const totalReturnPct = (totalReturn / initialCash) * 100;

    // 6. Calculate risk-adjusted metrics
    const sharpeRatio = this.calculateSharpeRatio(equityCurve, initialCash);
    const sortinoRatio = this.calculateSortinoRatio(equityCurve, initialCash);
    const { maxDrawdown, maxDrawdownDate } = this.calculateMaxDrawdown(equityCurve);

    // 7. Calculate win/loss statistics
    const winningReturnPcts = sellTrades
      .filter((t) => (t.realizedPLPct || 0) > 0)
      .map((t) => t.realizedPLPct || 0);
    const losingReturnPcts = sellTrades
      .filter((t) => (t.realizedPLPct || 0) < 0)
      .map((t) => t.realizedPLPct || 0);

    const avgWinPct = winningReturnPcts.length > 0
      ? winningReturnPcts.reduce((sum, pct) => sum + pct, 0) / winningReturnPcts.length
      : 0;

    const avgLossPct = losingReturnPcts.length > 0
      ? losingReturnPcts.reduce((sum, pct) => sum + pct, 0) / losingReturnPcts.length
      : 0;

    // 8. Calculate profit factor (gross profit / gross loss)
    const grossProfit = sellTrades
      .filter((t) => (t.realizedPL || 0) > 0)
      .reduce((sum, t) => sum + (t.realizedPL || 0), 0);

    const grossLoss = Math.abs(
      sellTrades
        .filter((t) => (t.realizedPL || 0) < 0)
        .reduce((sum, t) => sum + (t.realizedPL || 0), 0)
    );

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // 9. Calculate expectancy (average P&L per trade)
    const expectancy = totalTrades > 0
      ? sellTrades.reduce((sum, t) => sum + (t.realizedPL || 0), 0) / totalTrades
      : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      finalCash,
      finalEquity,
      totalReturn,
      totalReturnPct,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownDate,
      avgWinPct,
      avgLossPct,
      profitFactor,
      expectancy,
    };
  }

  /**
   * Calculate Sharpe Ratio (risk-adjusted return)
   * Sharpe = (Average Return - Risk-Free Rate) / Std Dev of Returns
   *
   * Steps:
   * 1. Calculate daily returns from equity curve
   * 2. Calculate average daily return
   * 3. Calculate standard deviation of returns
   * 4. Annualize both metrics (252 trading days/year)
   * 5. Apply Sharpe formula with risk-free rate (default 0%)
   */
  private calculateSharpeRatio(equityCurve: any[], initialCash: number): number {
    if (equityCurve.length < 2) return 0;

    // 1. Calculate daily returns (percentage change)
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prevEquity = equityCurve[i - 1].totalEquity;
      const currEquity = equityCurve[i].totalEquity;
      const dailyReturn = (currEquity - prevEquity) / prevEquity;
      returns.push(dailyReturn);
    }

    if (returns.length === 0) return 0;

    // 2. Calculate average daily return
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // 3. Calculate standard deviation of returns
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Handle zero volatility case
    if (stdDev === 0) return 0;

    // 4. Annualize metrics (252 trading days per year)
    const annualizedReturn = avgReturn * 252;
    const annualizedStdDev = stdDev * Math.sqrt(252);

    // 5. Calculate Sharpe Ratio (assuming 0% risk-free rate)
    const riskFreeRate = 0;
    const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedStdDev;

    return sharpeRatio;
  }

  /**
   * Calculate Sortino Ratio (downside risk-adjusted return)
   * Sortino = (Average Return - Risk-Free Rate) / Downside Deviation
   *
   * Unlike Sharpe, Sortino only penalizes downside volatility (negative returns),
   * making it more suitable for asymmetric return distributions.
   *
   * Steps:
   * 1. Calculate daily returns from equity curve
   * 2. Calculate average daily return
   * 3. Calculate downside deviation (only negative returns)
   * 4. Annualize both metrics (252 trading days/year)
   * 5. Apply Sortino formula
   */
  private calculateSortinoRatio(equityCurve: any[], initialCash: number): number {
    if (equityCurve.length < 2) return 0;

    // 1. Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prevEquity = equityCurve[i - 1].totalEquity;
      const currEquity = equityCurve[i].totalEquity;
      const dailyReturn = (currEquity - prevEquity) / prevEquity;
      returns.push(dailyReturn);
    }

    if (returns.length === 0) return 0;

    // 2. Calculate average daily return
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // 3. Calculate downside deviation (only consider negative returns)
    const downsideReturns = returns.filter((r) => r < 0);

    if (downsideReturns.length === 0) {
      // No negative returns - perfect scenario
      return avgReturn > 0 ? Infinity : 0;
    }

    const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);

    // Handle zero downside deviation
    if (downsideDeviation === 0) return 0;

    // 4. Annualize metrics
    const annualizedReturn = avgReturn * 252;
    const annualizedDownsideDeviation = downsideDeviation * Math.sqrt(252);

    // 5. Calculate Sortino Ratio (assuming 0% risk-free rate)
    const riskFreeRate = 0;
    const sortinoRatio = (annualizedReturn - riskFreeRate) / annualizedDownsideDeviation;

    return sortinoRatio;
  }

  /**
   * Calculate Maximum Drawdown
   *
   * Maximum drawdown is the largest peak-to-trough decline in the equity curve.
   * It represents the worst possible loss an investor would have experienced.
   *
   * Steps:
   * 1. Track running peak equity
   * 2. Calculate drawdown at each point (current - peak)
   * 3. Find the maximum drawdown and its date
   * 4. Convert to percentage
   */
  private calculateMaxDrawdown(equityCurve: any[]): {
    maxDrawdown: number;
    maxDrawdownDate: Date | null;
  } {
    if (equityCurve.length === 0) {
      return { maxDrawdown: 0, maxDrawdownDate: null };
    }

    let runningPeak = equityCurve[0].totalEquity;
    let maxDrawdown = 0;
    let maxDrawdownDate: Date | null = null;

    for (const point of equityCurve) {
      const equity = point.totalEquity;

      // Update running peak
      if (equity > runningPeak) {
        runningPeak = equity;
      }

      // Calculate current drawdown percentage
      const drawdown = runningPeak > 0 ? ((equity - runningPeak) / runningPeak) * 100 : 0;

      // Track maximum drawdown
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownDate = point.timestamp;
      }
    }

    return { maxDrawdown, maxDrawdownDate };
  }
}

export const performanceAnalytics = new PerformanceAnalytics();
