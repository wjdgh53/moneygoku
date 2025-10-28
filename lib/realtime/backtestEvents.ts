/**
 * Backtest Real-Time Event System
 *
 * Provides event emitters and types for real-time backtest updates.
 * Used by BacktestController to broadcast progress to connected clients.
 */

import { EventEmitter } from 'events';

// Event types
export type BacktestEventType =
  | 'backtest:started'
  | 'backtest:progress'
  | 'backtest:trade_executed'
  | 'backtest:equity_update'
  | 'backtest:completed'
  | 'backtest:failed'
  | 'backtest:status_changed';

// Event payloads
export interface BacktestStartedEvent {
  backtestRunId: string;
  symbol: string;
  strategyId: string;
  startDate: Date;
  endDate: Date;
}

export interface BacktestProgressEvent {
  backtestRunId: string;
  barsProcessed: number;
  totalBars: number;
  progressPct: number;
  currentEquity: number;
  currentTimestamp: Date;
}

export interface BacktestTradeExecutedEvent {
  backtestRunId: string;
  tradeId: string;
  side: 'BUY' | 'SELL';
  symbol: string;
  quantity: number;
  executedPrice: number;
  realizedPL?: number;
  realizedPLPct?: number;
  timestamp: Date;
}

export interface BacktestEquityUpdateEvent {
  backtestRunId: string;
  timestamp: Date;
  cash: number;
  stockValue: number;
  totalEquity: number;
  drawdownPct: number;
}

export interface BacktestCompletedEvent {
  backtestRunId: string;
  finalEquity: number;
  totalReturn: number;
  totalReturnPct: number;
  totalTrades: number;
  executionTime: number;
}

export interface BacktestFailedEvent {
  backtestRunId: string;
  error: string;
  errorDetails?: any;
}

export interface BacktestStatusChangedEvent {
  backtestRunId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: Date;
}

// Union type for all events
export type BacktestEvent =
  | { type: 'backtest:started'; data: BacktestStartedEvent }
  | { type: 'backtest:progress'; data: BacktestProgressEvent }
  | { type: 'backtest:trade_executed'; data: BacktestTradeExecutedEvent }
  | { type: 'backtest:equity_update'; data: BacktestEquityUpdateEvent }
  | { type: 'backtest:completed'; data: BacktestCompletedEvent }
  | { type: 'backtest:failed'; data: BacktestFailedEvent }
  | { type: 'backtest:status_changed'; data: BacktestStatusChangedEvent };

/**
 * Global event emitter for backtest events
 * This is used server-side to broadcast events
 */
class BacktestEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Support many simultaneous backtests
  }

  emitBacktestEvent(event: BacktestEvent) {
    // Emit to global listeners
    this.emit('backtest:event', event);

    // Emit to specific backtest listeners
    this.emit(`backtest:${event.data.backtestRunId}`, event);

    // Emit to event type listeners
    this.emit(event.type, event.data);
  }

  /**
   * Subscribe to all backtest events
   */
  onBacktestEvent(callback: (event: BacktestEvent) => void): () => void {
    this.on('backtest:event', callback);
    return () => this.off('backtest:event', callback);
  }

  /**
   * Subscribe to events for a specific backtest
   */
  onBacktestEvents(backtestRunId: string, callback: (event: BacktestEvent) => void): () => void {
    const eventName = `backtest:${backtestRunId}`;
    this.on(eventName, callback);
    return () => this.off(eventName, callback);
  }

  /**
   * Subscribe to specific event type
   */
  onEventType<T extends BacktestEventType>(
    eventType: T,
    callback: (data: any) => void
  ): () => void {
    this.on(eventType, callback);
    return () => this.off(eventType, callback);
  }
}

// Export singleton instance
export const backtestEvents = new BacktestEventEmitter();

/**
 * Helper functions for emitting events
 * These are used by BacktestController
 */
export const emitBacktestStarted = (data: BacktestStartedEvent) => {
  backtestEvents.emitBacktestEvent({ type: 'backtest:started', data });
};

export const emitBacktestProgress = (data: BacktestProgressEvent) => {
  backtestEvents.emitBacktestEvent({ type: 'backtest:progress', data });
};

export const emitBacktestTradeExecuted = (data: BacktestTradeExecutedEvent) => {
  backtestEvents.emitBacktestEvent({ type: 'backtest:trade_executed', data });
};

export const emitBacktestEquityUpdate = (data: BacktestEquityUpdateEvent) => {
  backtestEvents.emitBacktestEvent({ type: 'backtest:equity_update', data });
};

export const emitBacktestCompleted = (data: BacktestCompletedEvent) => {
  backtestEvents.emitBacktestEvent({ type: 'backtest:completed', data });
};

export const emitBacktestFailed = (data: BacktestFailedEvent) => {
  backtestEvents.emitBacktestEvent({ type: 'backtest:failed', data });
};

export const emitBacktestStatusChanged = (data: BacktestStatusChangedEvent) => {
  backtestEvents.emitBacktestEvent({ type: 'backtest:status_changed', data });
};
