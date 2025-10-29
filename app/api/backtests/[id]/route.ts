/**
 * Single Backtest API Routes
 *
 * GET    /api/backtests/:id     - Get backtest details
 * DELETE /api/backtests/:id     - Delete backtest
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/backtests/:id
 * Get backtest details including summary metrics
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const backtest = await prisma.backtestRun.findUnique({
      where: { id: params.id },
      include: {
        strategy: {
          select: {
            id: true,
            name: true,
            description: true,
            timeHorizon: true,
            stopLoss: true,
            takeProfit: true,
          },
        },
        _count: {
          select: {
            trades: true,
            positions: true,
            equityCurve: true,
            alerts: true,
          },
        },
      },
    });

    if (!backtest) {
      return NextResponse.json(
        { error: 'Backtest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      backtest,
    });

  } catch (error: any) {
    console.error(`GET /api/backtests/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backtests/:id
 * Delete backtest and all related data (cascade)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await prisma.backtestRun.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: `Backtest ${params.id} deleted`,
    });

  } catch (error: any) {
    console.error(`DELETE /api/backtests/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
