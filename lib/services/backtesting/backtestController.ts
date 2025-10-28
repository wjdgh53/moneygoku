/**
 * BacktestController
 *
 * Orchestrates backtest simulation runs:
 * - Manages chronological time progression
 * - Coordinates data fetching, signal generation, and order execution
 * - Integrates with HistoricalDataProvider, VirtualPortfolioEngine, and PerformanceAnalytics
 *
 * Reference: docs/backtesting/PHASE2_VIRTUAL_PORTFOLIO_SIMULATOR.md
 */

import { prisma } from '@/lib/prisma';
import { HistoricalDataProvider } from './historicalDataProvider';
import { VirtualPortfolioEngine } from './virtualPortfolioEngine';
import { PerformanceAnalytics } from './performanceAnalytics';
import { TimeHorizon } from '@prisma/client';

export interface BacktestConfig {
  strategyId: string;
  symbol: string;
  timeHorizon: TimeHorizon;
  startDate: Date;
  endDate: Date;
  initialCash: number;
  positionSizing: 'FIXED_DOLLAR' | 'FIXED_SHARES' | 'PERCENT_EQUITY';
  positionSize: number;
  slippageBps: number;
  commissionPerTrade: number;
}

export class BacktestController {
  private dataProvider: HistoricalDataProvider;
  private portfolio: VirtualPortfolioEngine;
  private analytics: PerformanceAnalytics;

  constructor() {
    this.dataProvider = new HistoricalDataProvider();
    this.portfolio = new VirtualPortfolioEngine();
    this.analytics = new PerformanceAnalytics();
  }

  /**
   * Run a complete backtest simulation
   *
   * Steps:
   * 1. Create BacktestRun record (status: RUNNING)
   * 2. Load strategy configuration
   * 3. Load historical OHLCV data
   * 4. Initialize portfolio with starting cash
   * 5. Iterate chronologically through bars:
   *    - Update current price
   *    - Check exit conditions (if position exists)
   *    - Check entry conditions (if no position)
   *    - Record equity curve snapshot
   * 6. Calculate final performance metrics
   * 7. Update BacktestRun with results (status: COMPLETED)
   */
  async runBacktest(config: BacktestConfig): Promise<string> {
    const startTime = Date.now();
    let backtestRunId: string | null = null;

    try {
      // 1. Create BacktestRun record
      const backtestRun = await prisma.backtestRun.create({
        data: {
          strategyId: config.strategyId,
          symbol: config.symbol,
          timeHorizon: config.timeHorizon,
          startDate: config.startDate,
          endDate: config.endDate,
          initialCash: config.initialCash,
          positionSizing: config.positionSizing,
          positionSize: config.positionSize,
          slippageBps: config.slippageBps,
          commissionPerTrade: config.commissionPerTrade,
          status: 'RUNNING',
        },
      });

      backtestRunId = backtestRun.id;
      console.log(`📊 Starting backtest: ${backtestRunId}`);
      console.log(`   Symbol: ${config.symbol}`);
      console.log(`   Period: ${config.startDate.toISOString().split('T')[0]} to ${config.endDate.toISOString().split('T')[0]}`);
      console.log(`   Initial Cash: $${config.initialCash.toFixed(2)}`);

      // 2. Load strategy configuration
      console.log(`\n🔍 Loading strategy: ${config.strategyId}`);
      const strategy = await prisma.strategy.findUnique({
        where: { id: config.strategyId },
      });

      if (!strategy) {
        throw new Error(`Strategy not found: ${config.strategyId}`);
      }

      console.log(`✅ Strategy loaded: ${strategy.name}`);

      // 3. Load historical OHLCV data
      console.log(`\n📊 Loading historical data...`);
      const historicalBars = await this.dataProvider.loadHistoricalBars({
        symbol: config.symbol,
        timeHorizon: config.timeHorizon,
        startDate: config.startDate,
        endDate: config.endDate,
      });

      if (historicalBars.length === 0) {
        throw new Error(`No historical data found for ${config.symbol}`);
      }

      console.log(`✅ Loaded ${historicalBars.length} bars`);

      // 4. Initialize portfolio
      console.log(`\n💰 Initializing portfolio...`);
      this.portfolio.initialize({
        backtestRunId: backtestRun.id,
        initialCash: config.initialCash,
        slippageBps: config.slippageBps,
        commissionPerTrade: config.commissionPerTrade,
      });

      // 5. Iterate through bars chronologically
      console.log(`\n🔄 Running simulation...`);
      let barsProcessed = 0;
      const totalBars = historicalBars.length;

      for (let i = 0; i < historicalBars.length; i++) {
        const bar = historicalBars[i];
        const currentPrice = bar.close;
        const currentTimestamp = bar.timestamp;

        // Update position prices for all open positions
        const openPosition = this.portfolio.getPosition(config.symbol);
        if (openPosition?.isOpen) {
          await this.portfolio.updateCurrentPrice(
            config.symbol,
            currentPrice,
            currentTimestamp
          );
        }

        // Check exit conditions (if we have an open position)
        if (openPosition?.isOpen) {
          const shouldExit = await this.evaluateExitSignal(
            strategy,
            bar,
            historicalBars.slice(0, i + 1),
            openPosition
          );

          if (shouldExit) {
            // Exit position
            await this.portfolio.executeSellOrder({
              backtestRunId: backtestRun.id,
              symbol: config.symbol,
              targetPrice: currentPrice,
              signalBar: currentTimestamp,
              executionBar: currentTimestamp,
              exitReason: 'STRATEGY_EXIT',
              quantity: openPosition.quantity,
            });
          }
        }

        // Check entry conditions (if we have no position)
        if (!openPosition || !openPosition.isOpen) {
          const shouldEnter = await this.evaluateEntrySignal(
            strategy,
            bar,
            historicalBars.slice(0, i + 1)
          );

          if (shouldEnter) {
            // Calculate position size
            const quantity = this.calculatePositionSize(
              config.positionSizing,
              config.positionSize,
              currentPrice,
              this.portfolio.getCash()
            );

            if (quantity > 0) {
              // Enter position
              await this.portfolio.executeBuyOrder({
                backtestRunId: backtestRun.id,
                symbol: config.symbol,
                quantity,
                targetPrice: currentPrice,
                signalBar: currentTimestamp,
                executionBar: currentTimestamp,
                entryReason: 'STRATEGY_ENTRY',
              });
            }
          }
        }

        // Record equity curve snapshot (every bar)
        await this.portfolio.recordEquityCurveSnapshot(currentTimestamp);

        // Progress logging (every 10%)
        barsProcessed++;
        const progress = (barsProcessed / totalBars) * 100;
        if (barsProcessed % Math.ceil(totalBars / 10) === 0) {
          console.log(`   Progress: ${progress.toFixed(0)}% (${barsProcessed}/${totalBars} bars)`);
        }
      }

      console.log(`✅ Simulation complete: ${barsProcessed} bars processed`);

      // 6. Calculate final performance metrics
      console.log(`\n📈 Calculating performance metrics...`);
      const metrics = await this.analytics.calculateMetrics(backtestRun.id);

      // 7. Update BacktestRun with results
      await prisma.backtestRun.update({
        where: { id: backtestRun.id },
        data: {
          status: 'COMPLETED',
          executionTime: Date.now() - startTime,
          totalTrades: metrics.totalTrades,
          winningTrades: metrics.winningTrades,
          losingTrades: metrics.losingTrades,
          winRate: metrics.winRate,
          finalCash: metrics.finalCash,
          finalEquity: metrics.finalEquity,
          totalReturn: metrics.totalReturn,
          totalReturnPct: metrics.totalReturnPct,
          sharpeRatio: metrics.sharpeRatio,
          sortinoRatio: metrics.sortinoRatio,
          maxDrawdown: metrics.maxDrawdown,
          maxDrawdownDate: metrics.maxDrawdownDate,
          avgWinPct: metrics.avgWinPct,
          avgLossPct: metrics.avgLossPct,
          profitFactor: metrics.profitFactor,
          expectancy: metrics.expectancy,
          completedAt: new Date(),
        },
      });

      console.log(`\n✅ Backtest completed: ${backtestRun.id}`);
      console.log(`   Total Trades: ${metrics.totalTrades}`);
      console.log(`   Win Rate: ${metrics.winRate.toFixed(2)}%`);
      console.log(`   Total Return: ${metrics.totalReturnPct.toFixed(2)}%`);
      console.log(`   Sharpe Ratio: ${metrics.sharpeRatio?.toFixed(2) || 'N/A'}`);
      console.log(`   Max Drawdown: ${metrics.maxDrawdown?.toFixed(2) || 0}%`);
      console.log(`   Execution Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

      return backtestRun.id;

    } catch (error: any) {
      console.error(`\n❌ Backtest failed:`, error);

      // Mark backtest as failed
      if (backtestRunId) {
        await prisma.backtestRun.update({
          where: { id: backtestRunId },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
            executionTime: Date.now() - startTime,
          },
        });
      }

      throw error;
    }
  }

  /**
   * Evaluate entry signal based on strategy conditions
   *
   * TODO: This is a simplified implementation. In a full system, this should:
   * 1. Extract exact logic from botTestService.ts
   * 2. Calculate technical indicators from historical bars
   * 3. Evaluate all strategy conditions
   * 4. Return true if all entry conditions are met
   *
   * For now, this is a placeholder that always returns false.
   */
  private async evaluateEntrySignal(
    strategy: any,
    currentBar: any,
    historicalBars: any[]
  ): Promise<boolean> {
    // Placeholder: Simple price-based entry
    // In real implementation, this would evaluate strategy.entryConditions
    // using technical indicators (RSI, SMA, MACD, etc.) from historicalBars

    // For testing: enter on every 50th bar (to generate some trades)
    if (historicalBars.length % 50 === 0) {
      return true;
    }

    return false;
  }

  /**
   * Evaluate exit signal based on strategy conditions and position state
   *
   * TODO: This is a simplified implementation. In a full system, this should:
   * 1. Check stop loss / take profit levels
   * 2. Evaluate exit conditions from strategy
   * 3. Calculate technical indicators
   * 4. Return true if any exit condition is met
   *
   * For now, this is a placeholder that exits after 10 bars or based on simple price movement.
   */
  private async evaluateExitSignal(
    strategy: any,
    currentBar: any,
    historicalBars: any[],
    position: any
  ): Promise<boolean> {
    // Placeholder: Simple holding period exit
    // In real implementation, this would:
    // - Check stop loss: currentBar.close < position.avgEntryPrice * (1 - stopLossPercent/100)
    // - Check take profit: currentBar.close > position.avgEntryPrice * (1 + takeProfitPercent/100)
    // - Evaluate strategy exit conditions

    // Simple holding period: exit after 10 bars
    const holdingPeriod = historicalBars.length - historicalBars.findIndex(
      (b) => b.timestamp.getTime() === position.entryBar.getTime()
    );

    if (holdingPeriod >= 10) {
      return true;
    }

    // Simple profit target: exit if 5% profit
    const profitPct = ((currentBar.close - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    if (profitPct >= 5) {
      return true;
    }

    // Simple stop loss: exit if 2% loss
    if (profitPct <= -2) {
      return true;
    }

    return false;
  }

  /**
   * Calculate position size based on strategy
   */
  private calculatePositionSize(
    positionSizing: string,
    positionSize: number,
    currentPrice: number,
    availableCash: number
  ): number {
    switch (positionSizing) {
      case 'FIXED_DOLLAR':
        return Math.floor(Math.min(positionSize, availableCash) / currentPrice);

      case 'FIXED_SHARES':
        return Math.min(positionSize, Math.floor(availableCash / currentPrice));

      case 'PERCENT_EQUITY':
        const targetAmount = availableCash * (positionSize / 100);
        return Math.floor(targetAmount / currentPrice);

      default:
        return Math.floor(positionSize / currentPrice);
    }
  }
}

export const backtestController = new BacktestController();
