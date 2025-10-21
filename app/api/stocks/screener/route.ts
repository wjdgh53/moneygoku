/**
 * Stock Screener API Endpoint
 *
 * GET /api/stocks/screener
 *
 * Query parameters:
 * - type: 'top_gainers' | 'top_losers' | 'most_active' (required)
 * - limit: number (optional, default: 10)
 * - minVolume: number (optional)
 * - minPrice: number (optional)
 * - maxPrice: number (optional)
 *
 * Returns filtered stock data from Alpha Vantage TOP_GAINERS_LOSERS API
 */

import { NextRequest, NextResponse } from 'next/server';
import { stockScreenerService } from '@/lib/services/stockScreenerService';
import {
  ScreenerType,
  StockScreenerParams,
  InvalidParametersError
} from '@/lib/types/stockScreener';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as ScreenerType;
    const limit = searchParams.get('limit');
    const minVolume = searchParams.get('minVolume');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    // Validate required parameters
    if (!type) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: type',
          message: 'type must be one of: top_gainers, top_losers, most_active'
        },
        { status: 400 }
      );
    }

    // Build params object
    const params: StockScreenerParams = {
      type,
      limit: limit ? parseInt(limit) : 10,
      minVolume: minVolume ? parseFloat(minVolume) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
    };

    // Fetch screened stocks
    const result = await stockScreenerService.getScreenedStocks(params);

    // Get cache status for debugging
    const cacheStatus = stockScreenerService.getCacheStatus();

    return NextResponse.json({
      ...result,
      cache: cacheStatus
    });
  } catch (error) {
    console.error('[API /stocks/screener] Error:', error);

    // Handle parameter validation errors
    if (error instanceof InvalidParametersError) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: error.message,
          code: error.code
        },
        { status: error.statusCode }
      );
    }

    // Generic error (should be rare since Alpha Vantage errors are handled gracefully)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stocks/screener/clear-cache
 * Clear the screener cache (useful for testing or manual refresh)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'clear_cache') {
      stockScreenerService.clearCache();
      return NextResponse.json({
        message: 'Cache cleared successfully'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API /stocks/screener] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
