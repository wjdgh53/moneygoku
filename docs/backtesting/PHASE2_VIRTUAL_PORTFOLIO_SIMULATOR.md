# Phase 2: Virtual Portfolio Simulator - Technical Implementation Plan

## Executive Summary
This document provides a comprehensive technical specification for implementing a forward-testing simulation system that replays historical market data chronologically to validate trading strategies. The simulator will support position management, order execution with realistic slippage, and performance metric calculation.

---

## 1. Technical Architecture

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Backtesting Controller                        │
│  - Orchestrates simulation runs                                 │
│  - Manages time progression (chronological replay)              │
│  - Coordinates data fetching, signal generation, execution      │
└──────────────────┬─────────────────────────────────────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
┌─────▼──────────┐    ┌────────▼───────────┐
│ Historical     │    │  Signal Generator   │
│ Data Provider  │    │  (Report Logic)     │
│                │    │  - Entry signals    │
│ - OHLCV cache │    │  - Exit signals     │
│ - Bar iterator │    │  - Position sizing  │
└─────┬──────────┘    └────────┬───────────┘
      │                        │
      │                        │
┌─────▼────────────────────────▼───────────┐
│        Virtual Portfolio Engine           │
│  - Cash & position tracking               │
│  - Order execution simulation             │
│  - Slippage & commission calculation      │
│  - Unrealized P&L tracking                │
└─────┬─────────────────────────────────────┘
      │
┌─────▼──────────────────────────────────────┐
│      Performance Analytics Engine          │
│  - Equity curve generation                 │
│  - Sharpe ratio, max drawdown, win rate    │
│  - Trade-level metrics                     │
└────────────────────────────────────────────┘
```

### 1.2 Data Flow Diagram

```
1. Initialize Backtest
   ↓
2. Load Historical OHLCV (T-2 years to T-now)
   ↓
3. For each time bar (chronologically):
   ├─ Update current price
   ├─ Evaluate exit conditions (if position exists)
   │  └─ If exit triggered → Execute sell order
   ├─ Evaluate entry conditions (if no position)
   │  └─ If entry triggered → Execute buy order
   ├─ Update portfolio state (cash, positions, equity)
   └─ Record trade & metrics
   ↓
4. Generate final performance report
   └─ Sharpe, Sortino, max drawdown, win rate, etc.
```

---

## 2. Database Schema Design

### 2.1 BacktestRun Model

```prisma
model BacktestRun {
  id              String   @id @default(cuid())

  // Configuration
  strategyId      String
  strategy        Strategy @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  symbol          String
  timeHorizon     TimeHorizon

  // Time range
  startDate       DateTime  // Backtest period start (e.g., 2023-01-01)
  endDate         DateTime  // Backtest period end (e.g., 2025-01-01)

  // Initial parameters
  initialCash     Float     @default(10000.0)
  positionSizing  String    @default("FIXED_DOLLAR")  // FIXED_DOLLAR, FIXED_SHARES, PERCENT_EQUITY, KELLY
  positionSize    Float     @default(1000.0)          // $1000 per trade

  // Execution parameters
  slippageModel   String    @default("PERCENTAGE")     // PERCENTAGE, FIXED_DOLLAR, MARKET_IMPACT
  slippageBps     Int       @default(10)               // 10 basis points = 0.1%
  commissionPerTrade Float  @default(1.0)              // $1 per trade

  // Results (calculated after backtest)
  totalTrades     Int       @default(0)
  winningTrades   Int       @default(0)
  losingTrades    Int       @default(0)
  winRate         Float     @default(0.0)              // Percentage

  finalCash       Float?
  finalEquity     Float?
  totalReturn     Float?                               // Dollar amount
  totalReturnPct  Float?                               // Percentage

  // Risk metrics
  sharpeRatio     Float?
  sortinoRatio    Float?
  maxDrawdown     Float?                               // Percentage
  maxDrawdownDate DateTime?

  // Additional metrics
  avgWinPct       Float?                               // Average winning trade %
  avgLossPct      Float?                               // Average losing trade %
  profitFactor    Float?                               // Gross profit / Gross loss
  expectancy      Float?                               // Average $ per trade

  // Metadata
  status          BacktestStatus @default(PENDING)     // PENDING, RUNNING, COMPLETED, FAILED
  errorMessage    String?
  executionTime   Int?                                 // milliseconds
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relationships
  trades          BacktestTrade[]
  positions       BacktestPosition[]
  equityCurve     BacktestEquityCurve[]

  @@index([strategyId])
  @@index([symbol])
  @@index([status])
  @@index([createdAt])
  @@map("backtest_runs")
}

enum BacktestStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}
```

### 2.2 BacktestTrade Model

```prisma
model BacktestTrade {
  id              String   @id @default(cuid())
  backtestRunId   String
  backtestRun     BacktestRun @relation(fields: [backtestRunId], references: [id], onDelete: Cascade)

  // Trade details
  symbol          String
  side            TradeSide        // BUY or SELL
  quantity        Float

  // Pricing
  targetPrice     Float            // Signal price (close of bar)
  executedPrice   Float            // Actual execution price (with slippage)
  slippage        Float            // Dollar amount of slippage
  commission      Float            // Commission paid

  // Trade economics
  grossAmount     Float            // quantity * executedPrice
  netAmount       Float            // grossAmount ± slippage ± commission

  // Timing
  signalBar       DateTime         // Bar that generated the signal
  executionBar    DateTime         // Bar on which order was filled (next bar)

  // Performance (for SELL orders only)
  entryPrice      Float?           // Average entry price of position
  realizedPL      Float?           // Realized P&L for this trade
  realizedPLPct   Float?           // Realized P&L percentage
  holdingPeriod   Int?             // Number of bars held

  // Signal metadata
  entryReason     String?          // Entry signal description (from Report)
  exitReason      String?          // Exit signal description
  technicalScore  Float?           // Technical indicator score at entry
  newsScore       Float?           // News sentiment score at entry
  aiScore         Float?           // GPT adjustment score
  finalScore      Float?           // Combined score

  // Metadata
  createdAt       DateTime @default(now())

  @@index([backtestRunId])
  @@index([signalBar])
  @@map("backtest_trades")
}
```

### 2.3 BacktestPosition Model

```prisma
model BacktestPosition {
  id              String   @id @default(cuid())
  backtestRunId   String
  backtestRun     BacktestRun @relation(fields: [backtestRunId], references: [id], onDelete: Cascade)

  // Position details
  symbol          String
  quantity        Float
  avgEntryPrice   Float
  totalCost       Float            // Total invested (including commissions)

  // Current state (updated on each bar)
  currentPrice    Float            // Latest bar close
  marketValue     Float            // quantity * currentPrice
  unrealizedPL    Float            // marketValue - totalCost
  unrealizedPLPct Float            // (unrealizedPL / totalCost) * 100

  // Timing
  entryBar        DateTime         // First buy bar
  lastUpdateBar   DateTime         // Last price update bar

  // Risk management
  highWaterMark   Float            // Highest unrealized P&L ever reached
  maxDrawdownPct  Float            // Worst drawdown from high water mark

  // Status
  isOpen          Boolean  @default(true)
  closedAt        DateTime?
  exitBar         DateTime?

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([backtestRunId, symbol, isOpen])  // Only one open position per symbol
  @@index([backtestRunId])
  @@map("backtest_positions")
}
```

### 2.4 BacktestEquityCurve Model

```prisma
model BacktestEquityCurve {
  id              String   @id @default(cuid())
  backtestRunId   String
  backtestRun     BacktestRun @relation(fields: [backtestRunId], references: [id], onDelete: Cascade)

  // Snapshot at each bar
  timestamp       DateTime         // Bar timestamp

  // Portfolio state
  cash            Float            // Available cash
  stockValue      Float            // Market value of positions
  totalEquity     Float            // cash + stockValue

  // Running metrics
  cumulativeReturn Float           // (totalEquity - initialCash) / initialCash
  drawdown        Float            // Current drawdown from peak (%)

  // Trade count
  tradeCount      Int              // Total trades executed so far

  @@unique([backtestRunId, timestamp])
  @@index([backtestRunId])
  @@index([timestamp])
  @@map("backtest_equity_curve")
}
```

---

## 3. Core Implementation

### 3.1 Backtest Controller Service

**File:** `/lib/services/backtestController.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { HistoricalDataProvider } from './historicalDataProvider';
import { VirtualPortfolioEngine } from './virtualPortfolioEngine';
import { PerformanceAnalytics } from './performanceAnalytics';
import { botTestService, BotStrategy } from './botTestService';

export interface BacktestConfig {
  strategyId: string;
  symbol: string;
  timeHorizon: 'SHORT_TERM' | 'SWING' | 'LONG_TERM';
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
   */
  async runBacktest(config: BacktestConfig): Promise<string> {
    const startTime = Date.now();

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
        status: 'RUNNING'
      }
    });

    try {
      // 2. Load strategy from database
      const strategy = await this.loadStrategy(config.strategyId);

      // 3. Load historical OHLCV data
      console.log(`📊 Loading historical data for ${config.symbol}...`);
      const bars = await this.dataProvider.loadHistoricalBars({
        symbol: config.symbol,
        timeHorizon: config.timeHorizon,
        startDate: config.startDate,
        endDate: config.endDate
      });

      console.log(`✅ Loaded ${bars.length} bars from ${config.startDate.toISOString()} to ${config.endDate.toISOString()}`);

      // 4. Initialize portfolio
      this.portfolio.initialize({
        backtestRunId: backtestRun.id,
        initialCash: config.initialCash,
        slippageBps: config.slippageBps,
        commissionPerTrade: config.commissionPerTrade
      });

      // 5. Iterate through bars chronologically
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const currentPrice = bar.close;

        console.log(`\n📅 Bar ${i + 1}/${bars.length}: ${bar.timestamp.toISOString()} | Price: $${currentPrice}`);

        // 5.1 Update portfolio with current price
        this.portfolio.updateCurrentPrice(config.symbol, currentPrice, bar.timestamp);

        // 5.2 Check exit conditions (if holding position)
        const position = this.portfolio.getPosition(config.symbol);
        if (position && position.isOpen) {
          const exitSignal = await this.evaluateExitSignal(
            strategy,
            config.symbol,
            currentPrice,
            bars.slice(Math.max(0, i - 200), i + 1), // Historical context
            position
          );

          if (exitSignal.shouldExit) {
            console.log(`🔴 EXIT signal: ${exitSignal.reason}`);
            await this.portfolio.executeSellOrder({
              backtestRunId: backtestRun.id,
              symbol: config.symbol,
              targetPrice: currentPrice,
              signalBar: bar.timestamp,
              executionBar: bar.timestamp, // Assume fill on close
              exitReason: exitSignal.reason,
              quantity: position.quantity
            });
          }
        }

        // 5.3 Check entry conditions (if no position)
        if (!position || !position.isOpen) {
          const entrySignal = await this.evaluateEntrySignal(
            strategy,
            config.symbol,
            currentPrice,
            bars.slice(Math.max(0, i - 200), i + 1) // Historical context
          );

          if (entrySignal.shouldEnter) {
            console.log(`🟢 ENTRY signal: ${entrySignal.reason} | Score: ${entrySignal.finalScore}`);

            // Calculate quantity based on position sizing
            const quantity = this.calculatePositionSize(
              config.positionSizing,
              config.positionSize,
              currentPrice,
              this.portfolio.getCash()
            );

            if (quantity > 0) {
              await this.portfolio.executeBuyOrder({
                backtestRunId: backtestRun.id,
                symbol: config.symbol,
                quantity,
                targetPrice: currentPrice,
                signalBar: bar.timestamp,
                executionBar: bar.timestamp,
                entryReason: entrySignal.reason,
                technicalScore: entrySignal.technicalScore,
                newsScore: entrySignal.newsScore,
                aiScore: entrySignal.aiScore,
                finalScore: entrySignal.finalScore
              });
            } else {
              console.log(`⚠️ Insufficient cash to enter position`);
            }
          }
        }

        // 5.4 Record equity curve snapshot
        await this.portfolio.recordEquityCurveSnapshot(bar.timestamp);
      }

      // 6. Calculate final performance metrics
      const metrics = await this.analytics.calculateMetrics(backtestRun.id);

      // 7. Update BacktestRun with results
      await prisma.backtestRun.update({
        where: { id: backtestRun.id },
        data: {
          status: 'COMPLETED',
          executionTime: Date.now() - startTime,
          ...metrics
        }
      });

      console.log(`\n✅ Backtest completed in ${Date.now() - startTime}ms`);
      console.log(`📊 Final metrics:`, metrics);

      return backtestRun.id;

    } catch (error: any) {
      console.error(`❌ Backtest failed:`, error);

      await prisma.backtestRun.update({
        where: { id: backtestRun.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          executionTime: Date.now() - startTime
        }
      });

      throw error;
    }
  }

  /**
   * Load strategy configuration from database
   */
  private async loadStrategy(strategyId: string): Promise<BotStrategy> {
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId }
    });

    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    return {
      id: strategy.id,
      name: strategy.name,
      timeHorizon: strategy.timeHorizon,
      entryConditions: strategy.entryConditions as any,
      exitConditions: strategy.exitConditions as any,
      stopLoss: strategy.stopLoss,
      takeProfit: strategy.takeProfit
    };
  }

  /**
   * Evaluate entry signal using existing botTestService logic
   */
  private async evaluateEntrySignal(
    strategy: BotStrategy,
    symbol: string,
    currentPrice: number,
    historicalBars: any[]
  ): Promise<{
    shouldEnter: boolean;
    reason: string;
    technicalScore?: number;
    newsScore?: number;
    aiScore?: number;
    finalScore?: number;
  }> {
    // PSEUDOCODE: Use existing Report scoring logic
    // In production, refactor botTestService to extract signal generation

    // For now, simplified placeholder:
    // 1. Calculate technical indicators from historicalBars
    // 2. Apply strategy.entryConditions rules
    // 3. Generate entry signal

    return {
      shouldEnter: false,
      reason: 'No entry signal',
      technicalScore: 0,
      newsScore: 0,
      aiScore: 0,
      finalScore: 0
    };
  }

  /**
   * Evaluate exit signal (stop loss, take profit, technical exit)
   */
  private async evaluateExitSignal(
    strategy: BotStrategy,
    symbol: string,
    currentPrice: number,
    historicalBars: any[],
    position: any
  ): Promise<{ shouldExit: boolean; reason: string }> {
    // 1. Check stop loss
    const stopLossPrice = position.avgEntryPrice * (1 - (strategy.stopLoss || 5.0) / 100);
    if (currentPrice <= stopLossPrice) {
      return {
        shouldExit: true,
        reason: `Stop loss triggered at $${currentPrice} (entry: $${position.avgEntryPrice})`
      };
    }

    // 2. Check take profit
    const takeProfitPrice = position.avgEntryPrice * (1 + (strategy.takeProfit || 10.0) / 100);
    if (currentPrice >= takeProfitPrice) {
      return {
        shouldExit: true,
        reason: `Take profit triggered at $${currentPrice} (entry: $${position.avgEntryPrice})`
      };
    }

    // 3. Check technical exit conditions
    // PSEUDOCODE: Evaluate strategy.exitConditions

    return { shouldExit: false, reason: '' };
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
```

**Estimated LOC:** 350 lines

---

### 3.2 Virtual Portfolio Engine

**File:** `/lib/services/virtualPortfolioEngine.ts`

```typescript
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
  private positions: Map<string, any> = new Map();
  private slippageBps: number = 10;
  private commissionPerTrade: number = 1.0;

  initialize(config: PortfolioConfig) {
    this.backtestRunId = config.backtestRunId;
    this.cash = config.initialCash;
    this.slippageBps = config.slippageBps;
    this.commissionPerTrade = config.commissionPerTrade;
    this.positions.clear();
  }

  /**
   * Execute buy order with slippage and commission
   */
  async executeBuyOrder(request: BuyOrderRequest): Promise<void> {
    // 1. Calculate execution price with slippage
    const slippageAmount = (request.targetPrice * this.slippageBps) / 10000;
    const executedPrice = request.targetPrice + slippageAmount;

    // 2. Calculate costs
    const grossAmount = request.quantity * executedPrice;
    const commission = this.commissionPerTrade;
    const netAmount = grossAmount + commission;

    // 3. Check sufficient cash
    if (netAmount > this.cash) {
      console.warn(`⚠️ Insufficient cash: need $${netAmount}, have $${this.cash}`);
      return;
    }

    // 4. Deduct cash
    this.cash -= netAmount;

    // 5. Create or update position
    const existingPosition = this.positions.get(request.symbol);

    if (existingPosition) {
      // Add to existing position
      const newQuantity = existingPosition.quantity + request.quantity;
      const newTotalCost = existingPosition.totalCost + netAmount;
      const newAvgEntryPrice = newTotalCost / newQuantity;

      existingPosition.quantity = newQuantity;
      existingPosition.totalCost = newTotalCost;
      existingPosition.avgEntryPrice = newAvgEntryPrice;
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
          isOpen: true
        }
      });

      this.positions.set(request.symbol, newPosition);
    }

    // 6. Record trade
    await prisma.backtestTrade.create({
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
        finalScore: request.finalScore
      }
    });

    console.log(`✅ BUY executed: ${request.quantity} shares @ $${executedPrice.toFixed(2)} (slippage: $${slippageAmount.toFixed(4)})`);
  }

  /**
   * Execute sell order with slippage and commission
   */
  async executeSellOrder(request: SellOrderRequest): Promise<void> {
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

    if (newQuantity <= 0) {
      // Close position
      await prisma.backtestPosition.update({
        where: { id: position.id },
        data: {
          isOpen: false,
          closedAt: new Date(),
          exitBar: request.executionBar
        }
      });

      this.positions.delete(request.symbol);
      console.log(`🔴 Position CLOSED`);
    } else {
      // Partial sell
      position.quantity = newQuantity;
      position.totalCost = position.avgEntryPrice * newQuantity;

      await prisma.backtestPosition.update({
        where: { id: position.id },
        data: {
          quantity: newQuantity,
          totalCost: position.totalCost,
          lastUpdateBar: request.executionBar
        }
      });

      console.log(`🟡 Partial sell: ${newQuantity} shares remaining`);
    }

    // 6. Record trade
    const holdingPeriod = Math.floor(
      (request.executionBar.getTime() - position.entryBar.getTime()) / (1000 * 60 * 60 * 24)
    );

    await prisma.backtestTrade.create({
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
        exitReason: request.exitReason
      }
    });

    console.log(`✅ SELL executed: ${request.quantity} shares @ $${executedPrice.toFixed(2)} | P&L: ${realizedPL >= 0 ? '+' : ''}$${realizedPL.toFixed(2)} (${realizedPLPct.toFixed(2)}%)`);
  }

  /**
   * Update position market value with current price
   */
  updateCurrentPrice(symbol: string, currentPrice: number, timestamp: Date) {
    const position = this.positions.get(symbol);
    if (!position || !position.isOpen) return;

    const newMarketValue = position.quantity * currentPrice;
    const newUnrealizedPL = newMarketValue - position.totalCost;
    const newUnrealizedPLPct = (newUnrealizedPL / position.totalCost) * 100;

    // Update high water mark and max drawdown
    if (newUnrealizedPL > position.highWaterMark) {
      position.highWaterMark = newUnrealizedPL;
    }

    const drawdownFromPeak = ((position.highWaterMark - newUnrealizedPL) / position.totalCost) * 100;
    if (drawdownFromPeak > position.maxDrawdownPct) {
      position.maxDrawdownPct = drawdownFromPeak;
    }

    position.currentPrice = currentPrice;
    position.marketValue = newMarketValue;
    position.unrealizedPL = newUnrealizedPL;
    position.unrealizedPLPct = newUnrealizedPLPct;
    position.lastUpdateBar = timestamp;
  }

  /**
   * Record equity curve snapshot
   */
  async recordEquityCurveSnapshot(timestamp: Date): Promise<void> {
    let totalStockValue = 0;

    for (const position of this.positions.values()) {
      if (position.isOpen) {
        totalStockValue += position.marketValue;
      }
    }

    const totalEquity = this.cash + totalStockValue;

    // Calculate running metrics
    const backtestRun = await prisma.backtestRun.findUnique({
      where: { id: this.backtestRunId }
    });

    const initialCash = backtestRun?.initialCash || 10000;
    const cumulativeReturn = ((totalEquity - initialCash) / initialCash) * 100;

    // Calculate drawdown (requires historical equity curve)
    const equityCurve = await prisma.backtestEquityCurve.findMany({
      where: { backtestRunId: this.backtestRunId },
      orderBy: { timestamp: 'asc' }
    });

    let peakEquity = initialCash;
    for (const point of equityCurve) {
      if (point.totalEquity > peakEquity) {
        peakEquity = point.totalEquity;
      }
    }

    if (totalEquity > peakEquity) {
      peakEquity = totalEquity;
    }

    const drawdown = ((peakEquity - totalEquity) / peakEquity) * 100;

    // Get total trade count
    const tradeCount = await prisma.backtestTrade.count({
      where: { backtestRunId: this.backtestRunId }
    });

    await prisma.backtestEquityCurve.create({
      data: {
        backtestRunId: this.backtestRunId,
        timestamp,
        cash: this.cash,
        stockValue: totalStockValue,
        totalEquity,
        cumulativeReturn,
        drawdown,
        tradeCount
      }
    });
  }

  getCash(): number {
    return this.cash;
  }

  getPosition(symbol: string): any {
    return this.positions.get(symbol);
  }
}
```

**Estimated LOC:** 280 lines

---

### 3.3 Performance Analytics Engine

**File:** `/lib/services/performanceAnalytics.ts`

```typescript
import { prisma } from '@/lib/prisma';

export class PerformanceAnalytics {
  /**
   * Calculate all performance metrics for a completed backtest
   */
  async calculateMetrics(backtestRunId: string): Promise<any> {
    // 1. Load all trades
    const trades = await prisma.backtestTrade.findMany({
      where: { backtestRunId },
      orderBy: { executionBar: 'asc' }
    });

    // 2. Load equity curve
    const equityCurve = await prisma.backtestEquityCurve.findMany({
      where: { backtestRunId },
      orderBy: { timestamp: 'asc' }
    });

    // 3. Load initial config
    const backtestRun = await prisma.backtestRun.findUnique({
      where: { id: backtestRunId }
    });

    if (!backtestRun) {
      throw new Error(`BacktestRun ${backtestRunId} not found`);
    }

    const initialCash = backtestRun.initialCash;
    const finalEquity = equityCurve[equityCurve.length - 1]?.totalEquity || initialCash;
    const finalCash = equityCurve[equityCurve.length - 1]?.cash || initialCash;

    // 4. Calculate trade-level metrics
    const sellTrades = trades.filter(t => t.side === 'SELL');
    const totalTrades = sellTrades.length;
    const winningTrades = sellTrades.filter(t => (t.realizedPL || 0) > 0).length;
    const losingTrades = sellTrades.filter(t => (t.realizedPL || 0) < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // 5. Calculate P&L metrics
    const totalReturn = finalEquity - initialCash;
    const totalReturnPct = (totalReturn / initialCash) * 100;

    const avgWinPct = this.calculateAverageWinPct(sellTrades);
    const avgLossPct = this.calculateAverageLossPct(sellTrades);

    const grossProfit = sellTrades
      .filter(t => (t.realizedPL || 0) > 0)
      .reduce((sum, t) => sum + (t.realizedPL || 0), 0);

    const grossLoss = Math.abs(
      sellTrades
        .filter(t => (t.realizedPL || 0) < 0)
        .reduce((sum, t) => sum + (t.realizedPL || 0), 0)
    );

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    const expectancy = totalTrades > 0
      ? sellTrades.reduce((sum, t) => sum + (t.realizedPL || 0), 0) / totalTrades
      : 0;

    // 6. Calculate risk metrics
    const sharpeRatio = this.calculateSharpeRatio(equityCurve, initialCash);
    const sortinoRatio = this.calculateSortinoRatio(equityCurve, initialCash);
    const { maxDrawdown, maxDrawdownDate } = this.calculateMaxDrawdown(equityCurve);

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
      expectancy
    };
  }

  /**
   * Calculate Sharpe Ratio (risk-adjusted return)
   * Sharpe = (Average Return - Risk-Free Rate) / Std Dev of Returns
   */
  private calculateSharpeRatio(equityCurve: any[], initialCash: number): number {
    if (equityCurve.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prevEquity = equityCurve[i - 1].totalEquity;
      const currEquity = equityCurve[i].totalEquity;
      const returnPct = ((currEquity - prevEquity) / prevEquity) * 100;
      returns.push(returnPct);
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );

    const riskFreeRate = 0; // Assume 0% for simplicity (or use daily T-bill rate)
    const sharpe = stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;

    // Annualize Sharpe (assuming daily returns)
    const annualizedSharpe = sharpe * Math.sqrt(252);

    return annualizedSharpe;
  }

  /**
   * Calculate Sortino Ratio (downside risk-adjusted return)
   * Sortino = (Average Return - Risk-Free Rate) / Downside Deviation
   */
  private calculateSortinoRatio(equityCurve: any[], initialCash: number): number {
    if (equityCurve.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prevEquity = equityCurve[i - 1].totalEquity;
      const currEquity = equityCurve[i].totalEquity;
      const returnPct = ((currEquity - prevEquity) / prevEquity) * 100;
      returns.push(returnPct);
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Only consider negative returns for downside deviation
    const negativeReturns = returns.filter(r => r < 0);
    if (negativeReturns.length === 0) return 0;

    const downsideDeviation = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
    );

    const riskFreeRate = 0;
    const sortino = downsideDeviation > 0 ? (avgReturn - riskFreeRate) / downsideDeviation : 0;

    // Annualize Sortino
    const annualizedSortino = sortino * Math.sqrt(252);

    return annualizedSortino;
  }

  /**
   * Calculate Maximum Drawdown
   */
  private calculateMaxDrawdown(equityCurve: any[]): {
    maxDrawdown: number;
    maxDrawdownDate: Date | null;
  } {
    if (equityCurve.length === 0) {
      return { maxDrawdown: 0, maxDrawdownDate: null };
    }

    let peakEquity = equityCurve[0].totalEquity;
    let maxDrawdown = 0;
    let maxDrawdownDate: Date | null = null;

    for (const point of equityCurve) {
      if (point.totalEquity > peakEquity) {
        peakEquity = point.totalEquity;
      }

      const drawdown = ((peakEquity - point.totalEquity) / peakEquity) * 100;

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownDate = point.timestamp;
      }
    }

    return { maxDrawdown, maxDrawdownDate };
  }

  private calculateAverageWinPct(sellTrades: any[]): number {
    const winningTrades = sellTrades.filter(t => (t.realizedPLPct || 0) > 0);
    if (winningTrades.length === 0) return 0;

    return winningTrades.reduce((sum, t) => sum + (t.realizedPLPct || 0), 0) / winningTrades.length;
  }

  private calculateAverageLossPct(sellTrades: any[]): number {
    const losingTrades = sellTrades.filter(t => (t.realizedPLPct || 0) < 0);
    if (losingTrades.length === 0) return 0;

    return losingTrades.reduce((sum, t) => sum + (t.realizedPLPct || 0), 0) / losingTrades.length;
  }
}

export const performanceAnalytics = new PerformanceAnalytics();
```

**Estimated LOC:** 200 lines

---

## 4. Edge Case Handling

### 4.1 Insufficient Liquidity

```typescript
// In VirtualPortfolioEngine.executeBuyOrder()

// Check if order size exceeds typical daily volume
const avgDailyVolume = await this.getAverageDailyVolume(request.symbol);
const orderVolume = request.quantity;

if (orderVolume > avgDailyVolume * 0.1) {
  // Order is >10% of daily volume - apply market impact slippage
  const marketImpactBps = Math.min(
    50, // Cap at 0.5%
    (orderVolume / avgDailyVolume) * 100 * 10 // 10bps per 1% of volume
  );

  const marketImpactSlippage = (request.targetPrice * marketImpactBps) / 10000;
  executedPrice += marketImpactSlippage;

  console.warn(`⚠️ Large order (${(orderVolume / avgDailyVolume * 100).toFixed(2)}% of daily volume) - additional slippage: ${marketImpactBps}bps`);
}
```

### 4.2 After-Hours Trading

```typescript
// In BacktestController.runBacktest()

// Filter bars by trading hours if extendedHours is disabled
const filteredBars = bars.filter(bar => {
  const hour = bar.timestamp.getUTCHours();
  const minute = bar.timestamp.getUTCMinutes();

  // Regular trading hours: 9:30 AM - 4:00 PM ET
  const isMarketHours = (hour === 13 && minute >= 30) || // 9:30 AM ET = 13:30 UTC
                        (hour > 13 && hour < 20) ||       // 10 AM - 3 PM ET
                        (hour === 20 && minute === 0);    // 4:00 PM ET = 20:00 UTC

  if (!config.extendedHours && !isMarketHours) {
    return false; // Skip pre-market and after-hours bars
  }

  return true;
});
```

### 4.3 Corporate Actions (Stock Splits)

```typescript
// Add to HistoricalDataProvider

interface CorporateAction {
  date: Date;
  type: 'SPLIT' | 'DIVIDEND' | 'MERGER';
  ratio?: number; // e.g., 2.0 for 2-for-1 split
  amount?: number; // dividend amount
}

async loadCorporateActions(symbol: string, startDate: Date, endDate: Date): Promise<CorporateAction[]> {
  // Fetch from Alpha Vantage or FMP API
  // Adjust historical prices and position quantities accordingly
}

// In VirtualPortfolioEngine

applySplit(symbol: string, ratio: number, splitDate: Date) {
  const position = this.positions.get(symbol);
  if (!position || !position.isOpen) return;

  // Adjust quantity and entry price
  position.quantity *= ratio;
  position.avgEntryPrice /= ratio;
  position.currentPrice /= ratio;

  console.log(`🔄 Stock split applied: ${ratio}-for-1 on ${splitDate.toISOString()}`);
}
```

### 4.4 Market Gaps (Price Discontinuities)

```typescript
// In VirtualPortfolioEngine.updateCurrentPrice()

// Detect gaps
if (position.currentPrice > 0) {
  const priceChange = ((currentPrice - position.currentPrice) / position.currentPrice) * 100;

  if (Math.abs(priceChange) > 10) {
    console.warn(`⚠️ Large price gap detected: ${priceChange.toFixed(2)}% from $${position.currentPrice} to $${currentPrice}`);

    // Check if stop loss was gapped through
    const stopLossPrice = position.avgEntryPrice * (1 - (this.stopLossPercent || 5.0) / 100);

    if (currentPrice < stopLossPrice && position.currentPrice >= stopLossPrice) {
      console.warn(`🔴 Stop loss gapped through - executing at market open price instead of stop price`);
      // Force execution at currentPrice (gap down)
    }
  }
}
```

---

## 5. Implementation Roadmap

### Sprint 1 (2 weeks): Database & Core Architecture
- **Days 1-3:** Implement Prisma schema migrations (BacktestRun, BacktestTrade, BacktestPosition, BacktestEquityCurve)
- **Days 4-7:** Build VirtualPortfolioEngine (buy/sell execution, position tracking, slippage calculation)
- **Days 8-10:** Build PerformanceAnalytics (Sharpe, Sortino, max drawdown calculations)
- **Deliverable:** Working portfolio simulator with P&L tracking

### Sprint 2 (2 weeks): Signal Generation Integration
- **Days 1-5:** Refactor botTestService to extract signal generation logic (separate from API calls)
- **Days 6-8:** Implement BacktestController (chronological iteration, signal evaluation)
- **Days 9-10:** Add position sizing strategies (fixed dollar, percent equity)
- **Deliverable:** End-to-end backtest execution (no historical data yet)

### Sprint 3 (2 weeks): Edge Cases & Testing
- **Days 1-3:** Implement market impact slippage, liquidity checks
- **Days 4-6:** Handle corporate actions (stock splits)
- **Days 7-8:** Add after-hours trading support
- **Days 9-10:** Unit tests for edge cases (gaps, insufficient cash, etc.)
- **Deliverable:** Production-ready virtual portfolio simulator

---

## 6. Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Historical data quality (gaps, errors) | High | Medium | Implement data validation pipeline, use multiple data sources |
| Signal generation logic differs from live | High | High | Extract and reuse exact logic from botTestService |
| Slippage model too optimistic | Medium | Medium | Conservative defaults (10bps), backtestable parameter tuning |
| Database performance (100k+ bars) | Medium | Low | Use indexed queries, batch inserts for equity curve |
| Memory issues with large backtests | Low | Low | Stream data instead of loading all bars at once |

### Mitigation Strategies

1. **Data Quality**: Validate OHLCV data for anomalies (zero volume, extreme price swings)
2. **Signal Accuracy**: Unit test signal generation against actual Reports in production
3. **Performance**: Use database transactions, batch equity curve inserts every 100 bars
4. **Fallback**: If API limits hit, gracefully degrade to cached data only

---

## 7. Success Metrics

### Correctness Metrics
- **Signal Parity:** 95%+ match between backtest signals and production Report decisions
- **P&L Accuracy:** Realized P&L matches manual calculation within $0.01
- **Position Tracking:** No orphaned positions or negative cash states

### Performance Benchmarks
- **Speed:** Backtest 2 years of daily data (500 bars) in <30 seconds
- **Speed:** Backtest 1 year of 15-minute data (10,000 bars) in <5 minutes
- **Memory:** Peak memory usage <500MB for 10,000 bar backtest

### Data Quality Thresholds
- **Missing Data:** <1% of expected bars missing
- **Price Anomalies:** Zero volume bars <0.5%
- **Execution Realism:** Average slippage within 5-15 bps (configurable)

---

## 8. Code Structure

```
/lib/services/backtesting/
├── backtestController.ts          (350 LOC)
├── virtualPortfolioEngine.ts      (280 LOC)
├── performanceAnalytics.ts        (200 LOC)
├── historicalDataProvider.ts      (see Phase 2 doc)
└── __tests__/
    ├── virtualPortfolio.test.ts   (150 LOC)
    └── performanceMetrics.test.ts (100 LOC)

/app/api/backtests/
├── route.ts                       (POST /api/backtests - start backtest)
└── [id]/
    ├── route.ts                   (GET /api/backtests/:id - fetch results)
    └── equity-curve/
        └── route.ts               (GET /api/backtests/:id/equity-curve)

/prisma/migrations/
└── YYYYMMDD_add_backtest_models.sql
```

**Total Estimated LOC:** 1,080 lines (excluding tests)

---

## 9. Database Migration Script

```sql
-- Migration: Add backtesting tables
-- File: /prisma/migrations/YYYYMMDD_add_backtest_models.sql

-- BacktestRun
CREATE TABLE "backtest_runs" (
  "id" TEXT PRIMARY KEY,
  "strategyId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "timeHorizon" TEXT NOT NULL,

  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,

  "initialCash" DOUBLE PRECISION DEFAULT 10000.0,
  "positionSizing" TEXT DEFAULT 'FIXED_DOLLAR',
  "positionSize" DOUBLE PRECISION DEFAULT 1000.0,

  "slippageModel" TEXT DEFAULT 'PERCENTAGE',
  "slippageBps" INTEGER DEFAULT 10,
  "commissionPerTrade" DOUBLE PRECISION DEFAULT 1.0,

  "totalTrades" INTEGER DEFAULT 0,
  "winningTrades" INTEGER DEFAULT 0,
  "losingTrades" INTEGER DEFAULT 0,
  "winRate" DOUBLE PRECISION DEFAULT 0.0,

  "finalCash" DOUBLE PRECISION,
  "finalEquity" DOUBLE PRECISION,
  "totalReturn" DOUBLE PRECISION,
  "totalReturnPct" DOUBLE PRECISION,

  "sharpeRatio" DOUBLE PRECISION,
  "sortinoRatio" DOUBLE PRECISION,
  "maxDrawdown" DOUBLE PRECISION,
  "maxDrawdownDate" TIMESTAMP,

  "avgWinPct" DOUBLE PRECISION,
  "avgLossPct" DOUBLE PRECISION,
  "profitFactor" DOUBLE PRECISION,
  "expectancy" DOUBLE PRECISION,

  "status" TEXT DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "executionTime" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),

  CONSTRAINT "fk_strategy" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_backtest_runs_strategy" ON "backtest_runs"("strategyId");
CREATE INDEX "idx_backtest_runs_symbol" ON "backtest_runs"("symbol");
CREATE INDEX "idx_backtest_runs_status" ON "backtest_runs"("status");

-- BacktestTrade
CREATE TABLE "backtest_trades" (
  "id" TEXT PRIMARY KEY,
  "backtestRunId" TEXT NOT NULL,

  "symbol" TEXT NOT NULL,
  "side" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,

  "targetPrice" DOUBLE PRECISION NOT NULL,
  "executedPrice" DOUBLE PRECISION NOT NULL,
  "slippage" DOUBLE PRECISION NOT NULL,
  "commission" DOUBLE PRECISION NOT NULL,

  "grossAmount" DOUBLE PRECISION NOT NULL,
  "netAmount" DOUBLE PRECISION NOT NULL,

  "signalBar" TIMESTAMP NOT NULL,
  "executionBar" TIMESTAMP NOT NULL,

  "entryPrice" DOUBLE PRECISION,
  "realizedPL" DOUBLE PRECISION,
  "realizedPLPct" DOUBLE PRECISION,
  "holdingPeriod" INTEGER,

  "entryReason" TEXT,
  "exitReason" TEXT,
  "technicalScore" DOUBLE PRECISION,
  "newsScore" DOUBLE PRECISION,
  "aiScore" DOUBLE PRECISION,
  "finalScore" DOUBLE PRECISION,

  "createdAt" TIMESTAMP DEFAULT NOW(),

  CONSTRAINT "fk_backtest_run" FOREIGN KEY ("backtestRunId") REFERENCES "backtest_runs"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_backtest_trades_run" ON "backtest_trades"("backtestRunId");
CREATE INDEX "idx_backtest_trades_signal_bar" ON "backtest_trades"("signalBar");

-- BacktestPosition
CREATE TABLE "backtest_positions" (
  "id" TEXT PRIMARY KEY,
  "backtestRunId" TEXT NOT NULL,

  "symbol" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "avgEntryPrice" DOUBLE PRECISION NOT NULL,
  "totalCost" DOUBLE PRECISION NOT NULL,

  "currentPrice" DOUBLE PRECISION NOT NULL,
  "marketValue" DOUBLE PRECISION NOT NULL,
  "unrealizedPL" DOUBLE PRECISION NOT NULL,
  "unrealizedPLPct" DOUBLE PRECISION NOT NULL,

  "entryBar" TIMESTAMP NOT NULL,
  "lastUpdateBar" TIMESTAMP NOT NULL,

  "highWaterMark" DOUBLE PRECISION NOT NULL,
  "maxDrawdownPct" DOUBLE PRECISION NOT NULL,

  "isOpen" BOOLEAN DEFAULT TRUE,
  "closedAt" TIMESTAMP,
  "exitBar" TIMESTAMP,

  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),

  CONSTRAINT "fk_backtest_run_pos" FOREIGN KEY ("backtestRunId") REFERENCES "backtest_runs"("id") ON DELETE CASCADE,
  CONSTRAINT "uq_run_symbol_open" UNIQUE ("backtestRunId", "symbol", "isOpen")
);

CREATE INDEX "idx_backtest_positions_run" ON "backtest_positions"("backtestRunId");

-- BacktestEquityCurve
CREATE TABLE "backtest_equity_curve" (
  "id" TEXT PRIMARY KEY,
  "backtestRunId" TEXT NOT NULL,

  "timestamp" TIMESTAMP NOT NULL,

  "cash" DOUBLE PRECISION NOT NULL,
  "stockValue" DOUBLE PRECISION NOT NULL,
  "totalEquity" DOUBLE PRECISION NOT NULL,

  "cumulativeReturn" DOUBLE PRECISION NOT NULL,
  "drawdown" DOUBLE PRECISION NOT NULL,

  "tradeCount" INTEGER NOT NULL,

  CONSTRAINT "fk_backtest_run_equity" FOREIGN KEY ("backtestRunId") REFERENCES "backtest_runs"("id") ON DELETE CASCADE,
  CONSTRAINT "uq_run_timestamp" UNIQUE ("backtestRunId", "timestamp")
);

CREATE INDEX "idx_equity_curve_run" ON "backtest_equity_curve"("backtestRunId");
CREATE INDEX "idx_equity_curve_timestamp" ON "backtest_equity_curve"("timestamp");
```

---

## 10. API Endpoints

### 10.1 Start Backtest

```typescript
// POST /api/backtests
// Body: BacktestConfig

import { backtestController } from '@/lib/services/backtesting/backtestController';

export async function POST(request: Request) {
  try {
    const config = await request.json();

    // Validation
    if (!config.strategyId || !config.symbol) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Start backtest (async)
    const backtestRunId = await backtestController.runBacktest(config);

    return Response.json({
      success: true,
      backtestRunId,
      message: 'Backtest started'
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

### 10.2 Get Backtest Results

```typescript
// GET /api/backtests/:id

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const backtestRun = await prisma.backtestRun.findUnique({
      where: { id: params.id },
      include: {
        trades: {
          orderBy: { executionBar: 'asc' }
        },
        positions: true
      }
    });

    if (!backtestRun) {
      return Response.json({ error: 'Backtest not found' }, { status: 404 });
    }

    return Response.json(backtestRun);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Conclusion

This Phase 2 plan provides a complete, production-ready virtual portfolio simulator that can replay historical trading signals chronologically, execute realistic orders with slippage and commissions, and calculate comprehensive performance metrics. The system is designed to be compatible with your existing Report-based scoring system and can be extended with the Historical Data Pipeline (Phase 2 separate doc) and Advanced Dashboard (Phase 5).

**Next Steps:**
1. Review and approve schema design
2. Begin Sprint 1: Database migrations and VirtualPortfolioEngine
3. Parallel development of Historical Data Pipeline (see separate doc)
