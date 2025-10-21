/**
 * Order Execution Strategy for SWING Trading Bot
 * Optimized for 1-hour execution intervals with RSI-based signals
 */

import { Order, Position, Candle, OrderRequest, OrderSide, OrderType, TimeInForce } from '@alpacahq/alpaca-trade-api';

export interface MarketConditions {
  volatility: number;      // ATR/Price ratio
  spread: number;          // Estimated bid-ask spread percentage
  momentum: number;        // RSI value
  timeInPosition: number;  // Hours since entry
}

export interface OrderExecutionParams {
  action: 'BUY' | 'SELL';
  symbol: string;
  currentPrice: number;
  position?: Position;
  rsi: number;
  candles: Candle[];
  finalScore: number;      // AI confidence score (0-100)
  bidPrice?: number;        // Optional real bid price
  askPrice?: number;        // Optional real ask price
}

export interface ExecutionMetrics {
  fillRate: number;
  avgSlippage: number;
  avgFillTime: number;
  priceImprovement: number;
  missedEntries: number;
  emergencyExits: number;
}

export class SwingOrderExecutionStrategy {
  // Risk parameters
  private readonly STOP_LOSS_PERCENTAGE = 0.05;      // 5%
  private readonly TAKE_PROFIT_PERCENTAGE = 0.10;    // 10%

  // Order configuration
  private readonly MAX_LIMIT_ATTEMPTS = 3;
  private readonly ENTRY_RETRY_INTERVAL = 3600000;   // 1 hour
  private readonly EXIT_LIMIT_TIMEOUT = 300000;      // 5 minutes

  // Base offsets (in decimal form, not percentage)
  private readonly BASE_BUY_OFFSET = 0.0010;         // 0.10%
  private readonly BASE_SELL_OFFSET = -0.0005;       // -0.05%
  private readonly MAX_DYNAMIC_ADJUSTMENT = 0.0020;  // 0.20%

  // Volatility thresholds
  private readonly HIGH_VOLATILITY_THRESHOLD = 0.03;  // 3% ATR/Price
  private readonly LOW_VOLATILITY_THRESHOLD = 0.01;   // 1% ATR/Price

  private metrics: ExecutionMetrics = {
    fillRate: 0,
    avgSlippage: 0,
    avgFillTime: 0,
    priceImprovement: 0,
    missedEntries: 0,
    emergencyExits: 0
  };

  /**
   * Calculate Average True Range for volatility measurement
   */
  private calculateATR(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) {
      return 0;
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].h;
      const low = candles[i].l;
      const prevClose = candles[i - 1].c;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      trueRanges.push(tr);
    }

    // Calculate SMA of true ranges for the period
    const recentTRs = trueRanges.slice(-period);
    const atr = recentTRs.reduce((a, b) => a + b, 0) / recentTRs.length;

    return atr;
  }

  /**
   * Calculate current market volatility as ATR/Price ratio
   */
  private calculateVolatility(candles: Candle[], period: number = 14): number {
    const atr = this.calculateATR(candles, period);
    const currentPrice = candles[candles.length - 1].c;

    return currentPrice > 0 ? atr / currentPrice : 0;
  }

  /**
   * Estimate bid-ask spread from candle data
   */
  private estimateSpread(candle: Candle, bidPrice?: number, askPrice?: number): number {
    // Use actual bid-ask if available
    if (bidPrice && askPrice && askPrice > bidPrice) {
      return (askPrice - bidPrice) / ((askPrice + bidPrice) / 2);
    }

    // Otherwise estimate from high-low range
    const range = (candle.h - candle.l) / candle.c;
    return Math.min(range * 0.1, 0.001); // Cap at 0.1%
  }

  /**
   * Calculate market conditions for dynamic adjustments
   */
  private calculateMarketConditions(
    candles: Candle[],
    rsi: number,
    position?: Position,
    bidPrice?: number,
    askPrice?: number
  ): MarketConditions {
    const volatility = this.calculateVolatility(candles, 14);
    const spread = this.estimateSpread(candles[candles.length - 1], bidPrice, askPrice);
    const momentum = rsi;
    const timeInPosition = position
      ? (Date.now() - new Date(position.created_at).getTime()) / (1000 * 60 * 60) // Hours
      : 0;

    return { volatility, spread, momentum, timeInPosition };
  }

  /**
   * Map AI confidence score to base price offset
   */
  private mapScoreToOffset(score: number, action: 'BUY' | 'SELL'): number {
    if (action === 'BUY') {
      // Higher confidence = willing to pay more for entry
      if (score >= 80) return 0.0015;  // 0.15% - aggressive
      if (score >= 60) return 0.0010;  // 0.10% - moderate
      if (score >= 40) return 0.0005;  // 0.05% - conservative
      return 0.0003;                   // 0.03% - very conservative
    } else {
      // Higher urgency = more aggressive exit pricing
      if (score >= 80) return -0.0010; // 0.10% below - aggressive
      if (score >= 60) return -0.0005; // 0.05% below - moderate
      if (score >= 40) return -0.0003; // 0.03% below - conservative
      return 0.0000;                   // At market - patient
    }
  }

  /**
   * Calculate dynamic offset based on market conditions
   */
  public calculateDynamicOffset(
    baseOffset: number,
    conditions: MarketConditions,
    orderType: 'BUY' | 'SELL'
  ): number {
    // Volatility Adjustment (0 to 0.2%)
    const volatilityAdjustment = Math.min(conditions.volatility * 0.1, 0.002);

    // Spread Adjustment (half of spread to stay competitive)
    const spreadAdjustment = conditions.spread * 0.5;

    // Momentum Adjustment (-0.1% to +0.1%)
    const momentumAdjustment = orderType === 'BUY'
      ? (50 - conditions.momentum) / 500  // More aggressive on oversold (low RSI)
      : (conditions.momentum - 50) / 500;  // More aggressive on overbought (high RSI)

    // Time Urgency (for exits only, increases with time in position)
    const timeUrgency = orderType === 'SELL'
      ? Math.min(conditions.timeInPosition / 168, 0.002) // Max 0.2% after 7 days
      : 0;

    // Calculate total offset with bounds
    let totalOffset = baseOffset + volatilityAdjustment + spreadAdjustment + momentumAdjustment + timeUrgency;

    // Apply maximum adjustment limits
    if (orderType === 'BUY') {
      totalOffset = Math.min(totalOffset, this.MAX_DYNAMIC_ADJUSTMENT);
      totalOffset = Math.max(totalOffset, 0); // Don't go negative for buys
    } else {
      totalOffset = Math.max(totalOffset, -this.MAX_DYNAMIC_ADJUSTMENT);
      totalOffset = Math.min(totalOffset, 0); // Don't go positive for sells
    }

    return totalOffset;
  }

  /**
   * Determine exit reason based on position P&L
   */
  private determineExitReason(position: Position, currentPrice: number): 'STOP_LOSS' | 'TAKE_PROFIT' | 'NORMAL' {
    const entryPrice = parseFloat(position.avg_entry_price);
    const currentReturn = (currentPrice - entryPrice) / entryPrice;

    if (currentReturn <= -this.STOP_LOSS_PERCENTAGE) {
      return 'STOP_LOSS';
    }

    if (currentReturn >= this.TAKE_PROFIT_PERCENTAGE) {
      return 'TAKE_PROFIT';
    }

    return 'NORMAL';
  }

  /**
   * Calculate position size based on allocation
   */
  private calculatePositionSize(allocation: number, price: number): number {
    const shares = Math.floor(allocation / price);
    return Math.max(shares, 1); // At least 1 share
  }

  /**
   * Generate BUY order with optimal pricing
   */
  public generateBuyOrder(params: OrderExecutionParams): OrderRequest {
    const { symbol, currentPrice, rsi, candles, finalScore, bidPrice, askPrice } = params;

    // Calculate market conditions
    const conditions = this.calculateMarketConditions(candles, rsi, undefined, bidPrice, askPrice);

    // Get base offset from AI confidence score
    const baseOffset = this.mapScoreToOffset(finalScore, 'BUY');

    // Calculate dynamic offset
    const dynamicOffset = this.calculateDynamicOffset(baseOffset, conditions, 'BUY');

    // Use ask price if available, otherwise current price
    const referencePrice = askPrice || currentPrice;

    // Set limit price with offset
    const limitPrice = referencePrice * (1 + dynamicOffset);

    // Calculate position size (assuming $1000 allocation)
    const positionSize = this.calculatePositionSize(1000, limitPrice);

    console.log(`[BUY ORDER] Symbol: ${symbol}, Current: $${currentPrice.toFixed(2)}, ` +
                `Limit: $${limitPrice.toFixed(2)}, Offset: ${(dynamicOffset * 100).toFixed(3)}%, ` +
                `RSI: ${rsi.toFixed(1)}, Volatility: ${(conditions.volatility * 100).toFixed(2)}%`);

    return {
      symbol,
      qty: positionSize,
      side: 'buy' as OrderSide,
      type: 'limit' as OrderType,
      time_in_force: 'day' as TimeInForce,
      limit_price: Number(limitPrice.toFixed(2)),
      client_order_id: `swing_buy_${Date.now()}`
    };
  }

  /**
   * Generate SELL order with optimal pricing
   */
  public generateSellOrder(params: OrderExecutionParams): OrderRequest {
    const { symbol, currentPrice, position, rsi, candles, finalScore, bidPrice } = params;

    if (!position) {
      throw new Error('Position required for sell orders');
    }

    // Determine exit reason
    const exitReason = this.determineExitReason(position, currentPrice);

    // STOP LOSS: Use market order for immediate execution
    if (exitReason === 'STOP_LOSS') {
      console.log(`[STOP LOSS] Symbol: ${symbol}, Current: $${currentPrice.toFixed(2)}, ` +
                  `Entry: $${position.avg_entry_price}, Loss: ${((currentPrice / parseFloat(position.avg_entry_price) - 1) * 100).toFixed(2)}%`);

      this.metrics.emergencyExits++;

      return {
        symbol,
        qty: parseFloat(position.qty),
        side: 'sell' as OrderSide,
        type: 'market' as OrderType,
        time_in_force: 'day' as TimeInForce,
        client_order_id: `stop_loss_${Date.now()}`
      };
    }

    // TAKE PROFIT: Use limit order at target price
    if (exitReason === 'TAKE_PROFIT') {
      const takeProfitPrice = parseFloat(position.avg_entry_price) * (1 + this.TAKE_PROFIT_PERCENTAGE);

      console.log(`[TAKE PROFIT] Symbol: ${symbol}, Current: $${currentPrice.toFixed(2)}, ` +
                  `Target: $${takeProfitPrice.toFixed(2)}, Entry: $${position.avg_entry_price}`);

      return {
        symbol,
        qty: parseFloat(position.qty),
        side: 'sell' as OrderSide,
        type: 'limit' as OrderType,
        time_in_force: 'gtc' as TimeInForce, // Good till cancelled for take profit
        limit_price: Number(takeProfitPrice.toFixed(2)),
        client_order_id: `take_profit_${Date.now()}`
      };
    }

    // NORMAL EXIT: Use limit order with competitive pricing
    const conditions = this.calculateMarketConditions(
      candles,
      rsi,
      position,
      bidPrice,
      currentPrice
    );

    // Get base offset (negative for sells)
    const baseOffset = this.mapScoreToOffset(finalScore, 'SELL');

    // Calculate dynamic offset
    const dynamicOffset = this.calculateDynamicOffset(baseOffset, conditions, 'SELL');

    // Use bid price if available, otherwise current price
    const referencePrice = bidPrice || currentPrice;

    // Set limit price with offset (offset is negative, so this reduces the price)
    const limitPrice = referencePrice * (1 + dynamicOffset);

    console.log(`[SELL ORDER] Symbol: ${symbol}, Current: $${currentPrice.toFixed(2)}, ` +
                `Limit: $${limitPrice.toFixed(2)}, Offset: ${(dynamicOffset * 100).toFixed(3)}%, ` +
                `RSI: ${rsi.toFixed(1)}, Time in Position: ${conditions.timeInPosition.toFixed(1)}h`);

    // Use IOC for normal exits to ensure quick execution or cancellation
    return {
      symbol,
      qty: parseFloat(position.qty),
      side: 'sell' as OrderSide,
      type: 'limit' as OrderType,
      time_in_force: 'ioc' as TimeInForce, // Immediate or cancel
      limit_price: Number(limitPrice.toFixed(2)),
      client_order_id: `swing_sell_${Date.now()}`
    };
  }

  /**
   * Generate fallback market order for failed limit orders
   */
  public generateFallbackMarketOrder(
    symbol: string,
    qty: number,
    side: 'BUY' | 'SELL'
  ): OrderRequest {
    console.log(`[FALLBACK MARKET] Symbol: ${symbol}, Side: ${side}, Qty: ${qty}`);

    if (side === 'SELL') {
      this.metrics.emergencyExits++;
    } else {
      this.metrics.missedEntries++;
    }

    return {
      symbol,
      qty,
      side: side.toLowerCase() as OrderSide,
      type: 'market' as OrderType,
      time_in_force: 'day' as TimeInForce,
      client_order_id: `fallback_${side.toLowerCase()}_${Date.now()}`
    };
  }

  /**
   * Get current execution metrics
   */
  public getMetrics(): ExecutionMetrics {
    return { ...this.metrics };
  }

  /**
   * Update metrics after order execution
   */
  public updateMetrics(
    orderType: 'BUY' | 'SELL',
    success: boolean,
    fillTime?: number,
    slippage?: number
  ): void {
    // Update fill rate
    const totalOrders = this.metrics.fillRate * 100 + 1; // Approximate total orders
    this.metrics.fillRate = ((this.metrics.fillRate * (totalOrders - 1)) + (success ? 1 : 0)) / totalOrders;

    // Update average fill time
    if (fillTime !== undefined && success) {
      const totalFills = Math.floor(this.metrics.fillRate * totalOrders);
      this.metrics.avgFillTime = ((this.metrics.avgFillTime * (totalFills - 1)) + fillTime) / totalFills;
    }

    // Update average slippage
    if (slippage !== undefined) {
      const totalSlippageEvents = this.metrics.emergencyExits + 10; // Approximate
      this.metrics.avgSlippage = ((this.metrics.avgSlippage * (totalSlippageEvents - 1)) + slippage) / totalSlippageEvents;
    }
  }
}

// Export singleton instance for consistent metrics tracking
export const swingOrderStrategy = new SwingOrderExecutionStrategy();