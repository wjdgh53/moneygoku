/**
 * Market Events Cache Status API Endpoint
 *
 * GET /api/market-events/cache-status
 *
 * Returns cache status for all market event categories
 */

import { NextResponse } from 'next/server';
import { marketEventsService } from '@/lib/services/marketEventsService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market-events/cache-status
 */
export async function GET() {
  try {
    const cacheStatus = marketEventsService.getCacheStatus();

    return NextResponse.json({
      cacheStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] Cache status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get cache status',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/market-events/cache-status
 *
 * Clears all caches
 */
export async function DELETE() {
  try {
    marketEventsService.clearCache();

    return NextResponse.json({
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] Cache clear error:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear caches',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
