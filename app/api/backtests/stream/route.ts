/**
 * Backtest Real-Time Streaming API (Server-Sent Events)
 *
 * GET /api/backtests/stream?id=backtestRunId
 *
 * Opens an SSE connection to stream real-time backtest updates
 */

import { NextRequest } from 'next/server';
import { backtestEvents, BacktestEvent } from '@/lib/realtime/backtestEvents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const backtestRunId = searchParams.get('id');

  if (!backtestRunId) {
    return new Response('Missing backtest ID', { status: 400 });
  }

  // Create a TransformStream to handle SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection message
  const sendEvent = async (event: BacktestEvent) => {
    try {
      const data = JSON.stringify(event);
      await writer.write(
        encoder.encode(`data: ${data}\n\n`)
      );
    } catch (error) {
      console.error('Error sending SSE event:', error);
    }
  };

  // Send heartbeat to keep connection alive
  const heartbeatInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(': heartbeat\n\n'));
    } catch (error) {
      clearInterval(heartbeatInterval);
    }
  }, 30000); // Every 30 seconds

  // Subscribe to backtest events
  const unsubscribe = backtestEvents.onBacktestEvents(backtestRunId, (event) => {
    sendEvent(event);

    // Auto-close connection when backtest completes or fails
    if (event.type === 'backtest:completed' || event.type === 'backtest:failed') {
      setTimeout(() => {
        clearInterval(heartbeatInterval);
        writer.close();
      }, 1000); // Give time for final message to be sent
    }
  });

  // Cleanup on connection close
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
    writer.close();
  });

  // Return SSE response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
