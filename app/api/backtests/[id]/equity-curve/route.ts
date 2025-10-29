/**
 * Equity Curve API Route
 *
 * GET /api/backtests/:id/equity-curve - Get equity curve data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/backtests/:id/equity-curve
 * Get equity curve snapshots for charting
 *
 * Query params:
 * - resolution?: 'full' | 'hourly' | 'daily' (default: 'full')
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url);
    const resolution = searchParams.get('resolution') || 'full';

    const equityCurve = await prisma.backtestEquityCurve.findMany({
      where: { backtestRunId: params.id },
      orderBy: { timestamp: 'asc' },
    });

    if (equityCurve.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No equity curve data available',
      });
    }

    // TODO: Implement data downsampling for 'hourly' and 'daily' resolutions
    // For now, return full data

    return NextResponse.json({
      success: true,
      count: equityCurve.length,
      data: equityCurve,
    });

  } catch (error: any) {
    console.error(`GET /api/backtests/${params.id}/equity-curve error:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
