import { NextRequest, NextResponse } from 'next/server';
import { historicalDataService } from '@/lib/services/historicalDataService';

// POST /api/historical/fetch - Fetch historical data for a specific symbol or all watchlist symbols
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, outputSize = 'full', allWatchlist = false } = body;

    if (!process.env.ALPHA_VANTAGE_API_KEY) {
      return NextResponse.json(
        { error: 'Alpha Vantage API key not configured' },
        { status: 500 }
      );
    }

    if (allWatchlist) {
      // Fetch historical data for all active watchlist symbols
      console.log('Fetching historical data for all active watchlist symbols...');

      const result = await historicalDataService.fetchHistoricalDataForAllWatchlistSymbols();

      return NextResponse.json({
        message: `Historical data fetch completed for ${result.results.length} symbols`,
        results: result.results,
        summary: {
          totalSymbols: result.results.length,
          totalFetched: result.totalFetched,
          totalSaved: result.totalSaved,
          errors: result.results.filter(r => r.error).length
        },
        timestamp: new Date().toISOString()
      });

    } else {
      // Fetch historical data for a specific symbol
      if (!symbol) {
        return NextResponse.json(
          { error: 'Symbol is required when allWatchlist is false' },
          { status: 400 }
        );
      }

      console.log(`Fetching historical data for ${symbol}...`);

      const result = await historicalDataService.fetchAndStoreHistoricalData(symbol, outputSize);

      return NextResponse.json({
        message: `Historical data fetch completed for ${result.symbol}`,
        result: {
          symbol: result.symbol,
          fetched: result.fetched,
          saved: result.saved
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error in historical data fetch:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch historical data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/historical/fetch - Get stored data count for symbols
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (symbol) {
      const count = await historicalDataService.getStoredDataCount(symbol);
      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        storedDataPoints: count
      });
    }

    // Get counts for all watchlist symbols
    const { prisma } = await import('@/lib/prisma');
    const activeSymbols = await prisma.watchList.findMany({
      where: { isActive: true },
      select: { symbol: true }
    });

    const results = [];
    for (const { symbol: sym } of activeSymbols) {
      const count = await historicalDataService.getStoredDataCount(sym);
      results.push({
        symbol: sym,
        storedDataPoints: count
      });
    }

    return NextResponse.json({
      message: 'Stored data counts for all watchlist symbols',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting stored data counts:', error);
    return NextResponse.json(
      { error: 'Failed to get stored data counts' },
      { status: 500 }
    );
  }
}