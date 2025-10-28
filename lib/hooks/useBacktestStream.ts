/**
 * useBacktestStream Hook
 *
 * React hook for subscribing to real-time backtest updates via SSE
 *
 * Usage:
 * ```tsx
 * const { progress, trades, status, equity } = useBacktestStream(backtestRunId);
 * ```
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { BacktestEvent } from '@/lib/realtime/backtestEvents';

export interface BacktestStreamState {
  // Connection status
  connected: boolean;
  error: string | null;

  // Progress tracking
  progress: {
    barsProcessed: number;
    totalBars: number;
    progressPct: number;
    currentEquity: number;
    currentTimestamp: Date | null;
  } | null;

  // Latest trades
  latestTrade: {
    tradeId: string;
    side: 'BUY' | 'SELL';
    symbol: string;
    quantity: number;
    executedPrice: number;
    realizedPL?: number;
    realizedPLPct?: number;
    timestamp: Date;
  } | null;

  // Status
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null;

  // Latest equity update
  latestEquity: {
    timestamp: Date;
    cash: number;
    stockValue: number;
    totalEquity: number;
    drawdownPct: number;
  } | null;

  // Completion data
  completionData: {
    finalEquity: number;
    totalReturn: number;
    totalReturnPct: number;
    totalTrades: number;
    executionTime: number;
  } | null;

  // All received events (for debugging/history)
  events: BacktestEvent[];
}

export function useBacktestStream(backtestRunId: string | null): BacktestStreamState {
  const [state, setState] = useState<BacktestStreamState>({
    connected: false,
    error: null,
    progress: null,
    latestTrade: null,
    status: null,
    latestEquity: null,
    completionData: null,
    events: [],
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  const handleEvent = useCallback((event: BacktestEvent) => {
    setState(prev => {
      const newState = { ...prev, events: [...prev.events, event] };

      switch (event.type) {
        case 'backtest:started':
          newState.status = 'RUNNING';
          break;

        case 'backtest:progress':
          newState.progress = {
            barsProcessed: event.data.barsProcessed,
            totalBars: event.data.totalBars,
            progressPct: event.data.progressPct,
            currentEquity: event.data.currentEquity,
            currentTimestamp: new Date(event.data.currentTimestamp),
          };
          break;

        case 'backtest:trade_executed':
          newState.latestTrade = {
            tradeId: event.data.tradeId,
            side: event.data.side,
            symbol: event.data.symbol,
            quantity: event.data.quantity,
            executedPrice: event.data.executedPrice,
            realizedPL: event.data.realizedPL,
            realizedPLPct: event.data.realizedPLPct,
            timestamp: new Date(event.data.timestamp),
          };
          break;

        case 'backtest:equity_update':
          newState.latestEquity = {
            timestamp: new Date(event.data.timestamp),
            cash: event.data.cash,
            stockValue: event.data.stockValue,
            totalEquity: event.data.totalEquity,
            drawdownPct: event.data.drawdownPct,
          };
          break;

        case 'backtest:completed':
          newState.status = 'COMPLETED';
          newState.completionData = {
            finalEquity: event.data.finalEquity,
            totalReturn: event.data.totalReturn,
            totalReturnPct: event.data.totalReturnPct,
            totalTrades: event.data.totalTrades,
            executionTime: event.data.executionTime,
          };
          break;

        case 'backtest:failed':
          newState.status = 'FAILED';
          newState.error = event.data.error;
          break;

        case 'backtest:status_changed':
          newState.status = event.data.newStatus as any;
          break;
      }

      return newState;
    });
  }, []);

  useEffect(() => {
    if (!backtestRunId) return;

    // Create EventSource connection
    const eventSource = new EventSource(`/api/backtests/stream?id=${backtestRunId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setState(prev => ({ ...prev, connected: true, error: null }));
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setState(prev => ({
        ...prev,
        connected: false,
        error: 'Connection lost. Retrying...',
      }));
    };

    eventSource.onmessage = (event) => {
      try {
        const backtestEvent: BacktestEvent = JSON.parse(event.data);
        handleEvent(backtestEvent);
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [backtestRunId, handleEvent]);

  return state;
}

/**
 * Simplified hook that only tracks progress percentage
 */
export function useBacktestProgress(backtestRunId: string | null): number {
  const { progress } = useBacktestStream(backtestRunId);
  return progress?.progressPct || 0;
}

/**
 * Hook that returns only the connection status
 */
export function useBacktestStatus(backtestRunId: string | null) {
  const { status, connected, error } = useBacktestStream(backtestRunId);
  return { status, connected, error };
}
