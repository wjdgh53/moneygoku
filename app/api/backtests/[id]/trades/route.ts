/**
 * Backtest Trades API Route
 *
 * GET /api/backtests/:id/trades - Get trade history
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/backtests/:id/trades
 * Get all trades for a backtest
 *
 * Query params:
 * - side?: 'BUY' | 'SELL'
 * - limit?: number (default: 100)
 * - offset?: number (default: 0)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url);

    const side = searchParams.get('side');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = { backtestRunId: params.id };
    if (side) where.side = side;

    const [trades, totalCount] = await Promise.all([
      prisma.backtestTrade.findMany({
        where,
        orderBy: { executionBar: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.backtestTrade.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      count: trades.length,
      totalCount,
      offset,
      limit,
      trades,
    });

  } catch (error: any) {
    console.error(`GET /api/backtests/${params.id}/trades error:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
