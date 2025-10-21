/**
 * Strategy Matching API Endpoint
 *
 * POST /api/stocks/match-strategies
 *
 * Analyzes stock characteristics and matches them with appropriate strategies.
 *
 * Request Body:
 * {
 *   stocks: ScreenedStock[]
 * }
 *
 * Response:
 * {
 *   matches: StrategyMatch[],
 *   stats: {
 *     totalStocks: number,
 *     matched: number,
 *     unmatched: number
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { strategyMatcherService } from '@/lib/services/strategyMatcherService';
import { ScreenedStock } from '@/lib/types/stockScreener';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body.stocks || !Array.isArray(body.stocks)) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          message: 'stocks must be an array of ScreenedStock objects'
        },
        { status: 400 }
      );
    }

    if (body.stocks.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          message: 'stocks array cannot be empty'
        },
        { status: 400 }
      );
    }

    // Limit to prevent abuse
    if (body.stocks.length > 100) {
      return NextResponse.json(
        {
          error: 'Too many stocks',
          message: 'Maximum 100 stocks can be matched in a single request'
        },
        { status: 400 }
      );
    }

    console.log(`[StrategyMatcher API] Matching ${body.stocks.length} stocks`);

    // Match stocks to strategies
    const matches = await strategyMatcherService.matchMultipleStocks(body.stocks);

    // Calculate stats
    const stats = {
      totalStocks: body.stocks.length,
      matched: matches.length,
      unmatched: body.stocks.length - matches.length
    };

    console.log(`[StrategyMatcher API] Matched ${stats.matched}/${stats.totalStocks} stocks`);

    return NextResponse.json({
      matches,
      stats
    });
  } catch (error) {
    console.error('[StrategyMatcher API] Error:', error);

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
 * GET handler - Get strategy statistics and matching configuration
 */
export async function GET() {
  try {
    const stats = await strategyMatcherService.getStrategyStats();

    return NextResponse.json({
      strategyStats: stats,
      matchingInfo: {
        minimumConfidence: 50,
        factors: [
          {
            name: 'riskAppetite',
            weight: 30,
            description: 'Matches strategy risk appetite with stock volatility'
          },
          {
            name: 'timeHorizon',
            weight: 30,
            description: 'Matches strategy time horizon with stock momentum'
          },
          {
            name: 'liquidity',
            weight: 20,
            description: 'Ensures stock has sufficient trading volume'
          },
          {
            name: 'volatility',
            weight: 20,
            description: 'Checks if volatility is within tradable range'
          }
        ]
      }
    });
  } catch (error) {
    console.error('[StrategyMatcher API] GET Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch strategy stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
