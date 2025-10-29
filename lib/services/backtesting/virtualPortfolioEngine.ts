/**
 * VirtualPortfolioEngine
 *
 * Simulates portfolio management with realistic order execution:
 * - Tracks cash and open positions
 * - Executes buy/sell orders with slippage and commissions
 * - Updates position market values
 * - Records equity curve snapshots
 *
 * Reference: docs/backtesting/PHASE2_VIRTUAL_PORTFOLIO_SIMULATOR.md
 */

import { prisma } from '@/lib/prisma';

interface PortfolioConfig {
  backtestRunId: string;
  initialCash: number;
  slippageBps: number;
  commissionPerTrade: number;
}

interface BuyOrderRequest {
  backtestRunId: string;
  symbol: string;
  quantity: number;
  targetPrice: number;
  signalBar: Date;
  executionBar: Date;
  entryReason: string;
  technicalScore?: number;
  newsScore?: number;
  aiScore?: number;
  finalScore?: number;
}

interface SellOrderRequest {
  backtestRunId: string;
  symbol: string;
  targetPrice: number;
  signalBar: Date;
  executionBar: Date;
  exitReason: string;
  quantity: number;
}

export class VirtualPortfolioEngine {
  private backtestRunId: string = '';
  private cash: number = 0;
  private initialCash: number = 0;
  private positions: Map<string, any> = new Map();
  private slippageBps: number = 10;
  private commissionPerTrade: number = 1.0;
  private portfolioHighWaterMark: number = 0;
  private tradeCount: number = 0;
  private equityCurveSnapshots: Array<{
    timestamp: Date;
    cash: number;
    stockValue: number;
    totalEquity: number;
    cumulativeReturn: number;
    drawdown: number;
    tradeCount: number;
  }> = [];

  /**
   * Initialize portfolio with starting parameters
   */
  initialize(config: PortfolioConfig): void {
    this.backtestRunId = config.backtestRunId;
    this.cash = config.initialCash;
    this.initialCash = config.initialCash;
    this.slippageBps = config.slippageBps;
    this.commissionPerTrade = config.commissionPerTrade;
    this.positions.clear();
    this.portfolioHighWaterMark = config.initialCash;
    this.tradeCount = 0;
    this.equityCurveSnapshots = [];

    console.log(`💰 Portfolio initialized: $${this.cash} cash`);
  }

  /**
   * Execute buy order with slippage and commission
   *
   * Steps:
   * 1. Calculate execution price (target + slippage)
   * 2. Calculate total cost (price * quantity + commission)
   * 3. Check sufficient cash
   * 4. Deduct cash
   * 5. Create or update position
   * 6. Record trade
   */
  async executeBuyOrder(request: BuyOrderRequest): Promise<any> {
    // 1. Calculate execution price with slippage
    const slippageAmount = (request.targetPrice * this.slippageBps) / 10000;
    const executedPrice = request.targetPrice + slippageAmount;

    // 2. Calculate costs
    const grossAmount = request.quantity * executedPrice;
    const commission = this.commissionPerTrade;
    const netAmount = grossAmount + commission;

    // 3. Check sufficient cash
    if (netAmount > this.cash) {
      console.warn(`⚠️ Insufficient cash: need $${netAmount.toFixed(2)}, have $${this.cash.toFixed(2)}`);
      return;
    }

    // 4. Deduct cash
    this.cash -= netAmount;

    // 5. Create or update position
    const existingPosition = this.positions.get(request.symbol);

    if (existingPosition && existingPosition.isOpen) {
      // Add to existing position
      const newQuantity = existingPosition.quantity + request.quantity;
      const newTotalCost = existingPosition.totalCost + netAmount;
      const newAvgEntryPrice = newTotalCost / newQuantity;

      existingPosition.quantity = newQuantity;
      existingPosition.totalCost = newTotalCost;
      existingPosition.avgEntryPrice = newAvgEntryPrice;
      existingPosition.currentPrice = executedPrice;
      existingPosition.marketValue = newQuantity * executedPrice;
      existingPosition.unrealizedPL = existingPosition.marketValue - newTotalCost;
      existingPosition.unrealizedPLPct = (existingPosition.unrealizedPL / newTotalCost) * 100;
      existingPosition.lastUpdateBar = request.executionBar;

      // Update position in database
      await prisma.backtestPosition.update({
        where: { id: existingPosition.id },
        data: {
          quantity: newQuantity,
          avgEntryPrice: newAvgEntryPrice,
          totalCost: newTotalCost,
          currentPrice: executedPrice,
          marketValue: existingPosition.marketValue,
          unrealizedPL: existingPosition.unrealizedPL,
          unrealizedPLPct: existingPosition.unrealizedPLPct,
          lastUpdateBar: request.executionBar,
        },
      });

      console.log(`🟡 Added to existing position: ${request.quantity} shares @ $${executedPrice.toFixed(2)}`);
    } else {
      // Create new position
      const newPosition = await prisma.backtestPosition.create({
        data: {
          backtestRunId: request.backtestRunId,
          symbol: request.symbol,
          quantity: request.quantity,
          avgEntryPrice: executedPrice,
          totalCost: netAmount,
          currentPrice: executedPrice,
          marketValue: request.quantity * executedPrice,
          unrealizedPL: 0,
          unrealizedPLPct: 0,
          entryBar: request.executionBar,
          lastUpdateBar: request.executionBar,
          highWaterMark: 0,
          maxDrawdownPct: 0,
          isOpen: true,
        },
      });

      this.positions.set(request.symbol, newPosition);
      console.log(`🟢 NEW position opened: ${request.quantity} shares @ $${executedPrice.toFixed(2)}`);
    }

    // 6. Record trade
    const trade = await prisma.backtestTrade.create({
      data: {
        backtestRunId: request.backtestRunId,
        symbol: request.symbol,
        side: 'BUY',
        quantity: request.quantity,
        targetPrice: request.targetPrice,
        executedPrice,
        slippage: slippageAmount * request.quantity,
        commission,
        grossAmount,
        netAmount,
        signalBar: request.signalBar,
        executionBar: request.executionBar,
        entryReason: request.entryReason,
        technicalScore: request.technicalScore,
        newsScore: request.newsScore,
        aiScore: request.aiScore,
        finalScore: request.finalScore,
      },
    });

    this.tradeCount++;

    console.log(
      `✅ BUY executed: ${request.quantity} shares @ $${executedPrice.toFixed(2)} (slippage: $${slippageAmount.toFixed(4)}, cash remaining: $${this.cash.toFixed(2)})`
    );

    return trade;
  }

  /**
   * Execute sell order with slippage and commission
   *
   * Steps:
   * 1. Calculate execution price (target - slippage)
   * 2. Calculate proceeds (price * quantity - commission)
   * 3. Calculate realized P&L
   * 4. Add cash back
   * 5. Update or close position
   * 6. Record trade
   */
  async executeSellOrder(request: SellOrderRequest): Promise<any> {
    const position = this.positions.get(request.symbol);
    if (!position || !position.isOpen) {
      console.warn(`⚠️ No open position for ${request.symbol}`);
      return;
    }

    // 1. Calculate execution price with slippage (negative for sells)
    const slippageAmount = (request.targetPrice * this.slippageBps) / 10000;
    const executedPrice = request.targetPrice - slippageAmount;

    // 2. Calculate proceeds
    const grossAmount = request.quantity * executedPrice;
    const commission = this.commissionPerTrade;
    const netAmount = grossAmount - commission;

    // 3. Calculate realized P&L
    const costBasis = position.avgEntryPrice * request.quantity;
    const realizedPL = netAmount - costBasis;
    const realizedPLPct = (realizedPL / costBasis) * 100;

    // 4. Add cash back
    this.cash += netAmount;

    // 5. Update or close position
    const newQuantity = position.quantity - request.quantity;

    if (newQuantity <= 0.001) {
      // Close position (allow small rounding errors)
      await prisma.backtestPosition.update({
        where: { id: position.id },
        data: {
          isOpen: false,
          quantity: 0,
          closedAt: new Date(),
          exitBar: request.executionBar,
        },
      });

      this.positions.delete(request.symbol);
      console.log(`🔴 Position CLOSED: realized P&L ${realizedPL >= 0 ? '+' : ''}$${realizedPL.toFixed(2)} (${realizedPLPct.toFixed(2)}%)`);
    } else {
      // Partial sell
      const newTotalCost = position.avgEntryPrice * newQuantity;
      const newMarketValue = newQuantity * request.targetPrice;
      const newUnrealizedPL = newMarketValue - newTotalCost;
      const newUnrealizedPLPct = (newUnrealizedPL / newTotalCost) * 100;

      position.quantity = newQuantity;
      position.totalCost = newTotalCost;
      position.currentPrice = request.targetPrice;
      position.marketValue = newMarketValue;
      position.unrealizedPL = newUnrealizedPL;
      position.unrealizedPLPct = newUnrealizedPLPct;
      position.lastUpdateBar = request.executionBar;

      await prisma.backtestPosition.update({
        where: { id: position.id },
        data: {
          quantity: newQuantity,
          totalCost: newTotalCost,
          currentPrice: request.targetPrice,
          marketValue: newMarketValue,
          unrealizedPL: newUnrealizedPL,
          unrealizedPLPct: newUnrealizedPLPct,
          lastUpdateBar: request.executionBar,
        },
      });

      console.log(`🟡 Partial sell: ${newQuantity.toFixed(2)} shares remaining, realized P&L: ${realizedPL >= 0 ? '+' : ''}$${realizedPL.toFixed(2)}`);
    }

    // 6. Record trade
    const holdingPeriod = Math.floor(
      (request.executionBar.getTime() - position.entryBar.getTime()) / (1000 * 60 * 60 * 24)
    );

    const trade = await prisma.backtestTrade.create({
      data: {
        backtestRunId: request.backtestRunId,
        symbol: request.symbol,
        side: 'SELL',
        quantity: request.quantity,
        targetPrice: request.targetPrice,
        executedPrice,
        slippage: slippageAmount * request.quantity,
        commission,
        grossAmount,
        netAmount,
        signalBar: request.signalBar,
        executionBar: request.executionBar,
        entryPrice: position.avgEntryPrice,
        realizedPL,
        realizedPLPct,
        holdingPeriod,
        exitReason: request.exitReason,
      },
    });

    this.tradeCount++;

    console.log(
      `✅ SELL executed: ${request.quantity} shares @ $${executedPrice.toFixed(2)} | P&L: ${realizedPL >= 0 ? '+' : ''}$${realizedPL.toFixed(2)} (${realizedPLPct.toFixed(2)}%) | Cash: $${this.cash.toFixed(2)}`
    );

    return trade;
  }

  /**
   * Update position market value with current price
   *
   * Called on each bar to mark-to-market the position.
   * Updates:
   * - Current price
   * - Market value
   * - Unrealized P&L and percentage
   * - High water mark (peak unrealized P&L)
   * - Max drawdown percentage from high water mark
   */
  async updateCurrentPrice(symbol: string, currentPrice: number, timestamp: Date): Promise<void> {
    const position = this.positions.get(symbol);
    if (!position || !position.isOpen) return;

    // Calculate new market value and unrealized P&L
    const newMarketValue = position.quantity * currentPrice;
    const newUnrealizedPL = newMarketValue - position.totalCost;
    const newUnrealizedPLPct = (newUnrealizedPL / position.totalCost) * 100;

    // Update high water mark (peak unrealized P&L)
    const newHighWaterMark = Math.max(position.highWaterMark || 0, newUnrealizedPL);

    // Calculate drawdown from high water mark
    let newMaxDrawdownPct = position.maxDrawdownPct || 0;
    if (newHighWaterMark > 0) {
      const currentDrawdown = ((newUnrealizedPL - newHighWaterMark) / position.totalCost) * 100;
      newMaxDrawdownPct = Math.min(newMaxDrawdownPct, currentDrawdown);
    }

    // Update in-memory position
    position.currentPrice = currentPrice;
    position.marketValue = newMarketValue;
    position.unrealizedPL = newUnrealizedPL;
    position.unrealizedPLPct = newUnrealizedPLPct;
    position.highWaterMark = newHighWaterMark;
    position.maxDrawdownPct = newMaxDrawdownPct;
    position.lastUpdateBar = timestamp;

    // Update database
    await prisma.backtestPosition.update({
      where: { id: position.id },
      data: {
        currentPrice,
        marketValue: newMarketValue,
        unrealizedPL: newUnrealizedPL,
        unrealizedPLPct: newUnrealizedPLPct,
        highWaterMark: newHighWaterMark,
        maxDrawdownPct: newMaxDrawdownPct,
        lastUpdateBar: timestamp,
      },
    });
  }

  /**
   * Record equity curve snapshot for current bar
   *
   * Calculates and accumulates (in memory):
   * - Total stock value (sum of all open positions)
   * - Total equity (cash + stock value)
   * - Portfolio high water mark (peak equity)
   * - Current drawdown from peak (absolute and percentage)
   *
   * Snapshots are stored in memory and batch-inserted at the end via finalizeEquityCurve()
   */
  recordEquityCurveSnapshot(timestamp: Date): void {
    // 1. Calculate total stock value from all open positions
    let totalStockValue = 0;
    for (const [symbol, position] of this.positions) {
      if (position.isOpen) {
        totalStockValue += position.marketValue;
      }
    }

    // 2. Calculate total portfolio equity
    const totalEquity = this.cash + totalStockValue;

    // 3. Update portfolio high water mark
    this.portfolioHighWaterMark = Math.max(this.portfolioHighWaterMark, totalEquity);

    // 4. Calculate current drawdown (as percentage from peak)
    const drawdownAmount = totalEquity - this.portfolioHighWaterMark;
    const drawdown = this.portfolioHighWaterMark > 0
      ? (drawdownAmount / this.portfolioHighWaterMark) * 100
      : 0;

    // 5. Calculate cumulative return (as percentage)
    const cumulativeReturn = this.initialCash > 0
      ? ((totalEquity - this.initialCash) / this.initialCash) * 100
      : 0;

    // 6. Accumulate snapshot in memory (no DB query needed)
    this.equityCurveSnapshots.push({
      timestamp,
      cash: this.cash,
      stockValue: totalStockValue,
      totalEquity,
      cumulativeReturn,
      drawdown,
      tradeCount: this.tradeCount,
    });

    // Log snapshot (every 10th to avoid spam)
    const randomLog = Math.random() < 0.1;
    if (randomLog) {
      console.log(
        `📈 Equity snapshot: $${totalEquity.toFixed(2)} (cash: $${this.cash.toFixed(2)}, stocks: $${totalStockValue.toFixed(2)}, drawdown: ${drawdown.toFixed(2)}%)`
      );
    }
  }

  /**
   * Batch insert all equity curve snapshots to database
   *
   * Call this ONCE at the end of backtest simulation to save all snapshots
   * in a single batch operation (much faster than individual inserts).
   */
  async finalizeEquityCurve(): Promise<void> {
    if (this.equityCurveSnapshots.length === 0) {
      console.log('⚠️ No equity curve snapshots to save');
      return;
    }

    const startTime = Date.now();
    console.log(`💾 Saving ${this.equityCurveSnapshots.length} equity curve snapshots...`);

    await prisma.backtestEquityCurve.createMany({
      data: this.equityCurveSnapshots.map(snapshot => ({
        backtestRunId: this.backtestRunId,
        ...snapshot,
      })),
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Equity curve saved in ${duration}ms (${this.equityCurveSnapshots.length} snapshots)`);
  }

  getCash(): number {
    return this.cash;
  }

  getPosition(symbol: string): any {
    return this.positions.get(symbol);
  }
}
