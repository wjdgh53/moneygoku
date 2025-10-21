/**
 * Market Events API Endpoint
 *
 * GET /api/market-events
 *
 * Returns consolidated market events data from multiple sources:
 * - Senate trading (FMP)
 * - Mergers & Acquisitions (FMP)
 * - Analyst ratings (FMP)
 * - Upcoming earnings (FMP)
 * - Stock splits (FMP)
 * - Market movers (Alpha Vantage)
 *
 * Query parameters:
 * - limit: Number of items per category (default: 10)
 * - from: Start date for calendar APIs (YYYY-MM-DD)
 * - to: End date for calendar APIs (YYYY-MM-DD)
 * - forceRefresh: Force cache refresh (boolean)
 * - category: Fetch specific category only (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { marketEventsService } from '@/lib/services/marketEventsService';
import { MarketEventsOptions } from '@/lib/types/marketEvents';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market-events
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '10');
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    const category = searchParams.get('category') || undefined;

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (from && !dateRegex.test(from)) {
      return NextResponse.json(
        { error: 'Invalid from date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }
    if (to && !dateRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid to date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const options: MarketEventsOptions = {
      limit,
      from,
      to,
      forceRefresh,
    };

    // Clear cache if forceRefresh is true
    if (forceRefresh) {
      marketEventsService.clearCache();
    }

    // Fetch specific category if requested
    if (category) {
      let data;
      switch (category) {
        case 'senate-trading':
          data = await marketEventsService.getSenateTrading({ limit });
          break;
        case 'mergers-acquisitions':
          data = await marketEventsService.getMergersAcquisitions({ limit });
          break;
        case 'analyst-ratings':
          data = await marketEventsService.getAnalystRatings({ limit });
          break;
        case 'earnings':
          data = await marketEventsService.getUpcomingEarnings(options);
          break;
        case 'stock-splits':
          data = await marketEventsService.getStockSplits(options);
          break;
        case 'market-movers':
          data = await marketEventsService.getMarketMovers({ limit });
          break;
        default:
          return NextResponse.json(
            { error: `Invalid category: ${category}` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        category,
        data,
        metadata: {
          fetchedAt: new Date().toISOString(),
          count: Array.isArray(data) ? data.length : Object.keys(data).length,
        },
      });
    }

    // Fetch all market events
    const data = await marketEventsService.getAllMarketEvents(options);

    // Return response
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[API] Market events error:', error);

    // Handle specific error types
    if (error.name === 'MarketEventsRateLimitError') {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          message: error.message,
        },
        { status: 429 }
      );
    }

    if (error.name === 'MarketEventsAPIError') {
      return NextResponse.json(
        {
          error: 'API error occurred',
          message: error.message,
        },
        { status: 502 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/market-events/cache-status
 */
export async function HEAD(request: NextRequest) {
  try {
    const cacheStatus = marketEventsService.getCacheStatus();

    return NextResponse.json({
      cacheStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] Cache status error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache status' },
      { status: 500 }
    );
  }
}
