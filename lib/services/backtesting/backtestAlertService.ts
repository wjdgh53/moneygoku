/**
 * BacktestAlertService
 *
 * Monitors backtest performance and generates alerts:
 * - Win rate drops
 * - Max drawdown breaches
 * - Sharpe/Sortino ratio degradation
 * - Profit factor warnings
 *
 * Reference: docs/backtesting/PHASE5_ADVANCED_DASHBOARD_MONITORING.md
 */

import { prisma } from '@/lib/prisma';

export class BacktestAlertService {
  /**
   * Check backtest for performance degradation and create alerts
   *
   * Alert types:
   * - WIN_RATE_DROP: Win rate < 50%
   * - MAX_DRAWDOWN_BREACH: Max drawdown > -15%
   * - SHARPE_DECLINE: Sharpe ratio < 1.0
   * - PROFIT_FACTOR_LOW: Profit factor < 1.5
   */
  async checkForAlerts(backtestRunId: string): Promise<void> {
    const backtest = await prisma.backtestRun.findUnique({
      where: { id: backtestRunId },
      include: { strategy: true },
    });

    if (!backtest) return;

    // 1. Check win rate drop
    if (backtest.winRate < 50) {
      await this.createAlert({
        backtestRunId,
        alertType: 'WIN_RATE_DROP',
        severity: backtest.winRate < 45 ? 'HIGH' : 'MEDIUM',
        message: `Win rate dropped to ${backtest.winRate.toFixed(1)}% (strategy: ${backtest.strategy.name})`,
        threshold: 50,
      });
    }

    // 2. Check max drawdown breach
    if (backtest.maxDrawdown && backtest.maxDrawdown < -15) {
      await this.createAlert({
        backtestRunId,
        alertType: 'MAX_DRAWDOWN_BREACH',
        severity: 'HIGH',
        message: `Max drawdown exceeded -15% threshold (${backtest.maxDrawdown.toFixed(2)}%)`,
        threshold: -15,
      });
    }

    // 3. Check Sharpe ratio decline
    if (backtest.sharpeRatio && backtest.sharpeRatio < 1.0) {
      await this.createAlert({
        backtestRunId,
        alertType: 'SHARPE_DECLINE',
        severity: 'MEDIUM',
        message: `Sharpe ratio below 1.0 (${backtest.sharpeRatio.toFixed(2)})`,
        threshold: 1.0,
      });
    }

    // 4. Check profit factor
    if (backtest.profitFactor && backtest.profitFactor < 1.5) {
      await this.createAlert({
        backtestRunId,
        alertType: 'PROFIT_FACTOR_LOW',
        severity: 'MEDIUM',
        message: `Profit factor below 1.5 (${backtest.profitFactor.toFixed(2)})`,
        threshold: 1.5,
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
      data: params,
    });

    console.log(`⚠️ Alert created: ${params.message}`);
  }
}

export const backtestAlertService = new BacktestAlertService();
