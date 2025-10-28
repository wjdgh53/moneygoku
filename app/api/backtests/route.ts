/**
 * Backtests API Routes
 *
 * POST   /api/backtests         - Start a new backtest
 * GET    /api/backtests         - List all backtests
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { backtestController, BacktestConfig } from '@/lib/services/backtesting';

/**
 * POST /api/backtests
 * Start a new backtest execution
 *
 * Body:
 * {
 *   strategyId: string,
 *   symbol: string,
 *   timeHorizon: 'SHORT_TERM' | 'SWING' | 'LONG_TERM',
 *   startDate: string (ISO),
 *   endDate: string (ISO),
 *   initialCash?: number,
 *   positionSizing?: 'FIXED_DOLLAR' | 'FIXED_SHARES' | 'PERCENT_EQUITY',
 *   positionSize?: number,
 *   slippageBps?: number,
 *   commissionPerTrade?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.strategyId || !body.symbol || !body.timeHorizon || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: strategyId, symbol, timeHorizon, startDate, endDate' },
        { status: 400 }
      );
    }

    // Verify strategy exists
    const strategy = await prisma.strategy.findUnique({
      where: { id: body.strategyId },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: `Strategy ${body.strategyId} not found` },
        { status: 404 }
      );
    }

    // Build backtest config
    const config: BacktestConfig = {
      strategyId: body.strategyId,
      symbol: body.symbol,
      timeHorizon: body.timeHorizon,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      initialCash: body.initialCash || 10000.0,
      positionSizing: body.positionSizing || 'FIXED_DOLLAR',
      positionSize: body.positionSize || 1000.0,
      slippageBps: body.slippageBps || 10,
      commissionPerTrade: body.commissionPerTrade || 1.0,
    };

    // Start backtest (async)
    const backtestRunId = await backtestController.runBacktest(config);

    return NextResponse.json({
      success: true,
      backtestRunId,
      message: 'Backtest started',
    });

  } catch (error: any) {
    console.error('POST /api/backtests error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/backtests
 * List all backtests with optional filtering
 *
 * Query params:
 * - strategyId?: string
 * - symbol?: string
 * - status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
 * - limit?: number (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const strategyId = searchParams.get('strategyId');
    const symbol = searchParams.get('symbol');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (strategyId) where.strategyId = strategyId;
    if (symbol) where.symbol = symbol;
    if (status) where.status = status;

    const backtests = await prisma.backtestRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        strategy: {
          select: {
            id: true,
            name: true,
            timeHorizon: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: backtests.length,
      backtests,
    });

  } catch (error: any) {
    console.error('GET /api/backtests error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
