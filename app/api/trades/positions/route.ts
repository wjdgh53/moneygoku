import { NextRequest, NextResponse } from 'next/server';
import { alpacaTradingService } from '@/lib/services/alpacaTradingService';

// GET /api/trades/positions - Get current open positions from Alpaca
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching current positions from Alpaca...');

    // Get current positions from Alpaca API
    const positions = await alpacaTradingService.getPositions();

    console.log(`📊 Found ${positions.length} open positions`);

    // Transform positions data for frontend
    const transformedPositions = positions.map(position => ({
      id: `${position.symbol}-${Date.now()}`, // Generate unique ID
      symbol: position.symbol,
      quantity: position.qty,
      side: position.side, // 'long' or 'short'
      entryPrice: position.costBasis / position.qty, // Average cost per share
      currentPrice: position.marketValue / position.qty, // Current price per share
      marketValue: position.marketValue,
      costBasis: position.costBasis,
      unrealizedPL: position.unrealizedPl,
      unrealizedPLPercent: position.unrealizedPlpc,
      status: 'OPEN' as const
    }));

    return NextResponse.json({
      positions: transformedPositions,
      total: transformedPositions.length,
      totalMarketValue: transformedPositions.reduce((sum, pos) => sum + pos.marketValue, 0),
      totalUnrealizedPL: transformedPositions.reduce((sum, pos) => sum + pos.unrealizedPL, 0)
    });

  } catch (error: any) {
    console.error('❌ Error fetching positions:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch positions',
        message: error.message,
        positions: [],
        total: 0
      },
      { status: 500 }
    );
  }
}

// POST /api/trades/positions/close - Close a specific position (sell all shares)
export async function POST(request: NextRequest) {
  try {
    const { symbol, quantity } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    console.log(`💰 Closing position for ${symbol}...`);

    // Get current position to verify quantity
    const position = await alpacaTradingService.getPosition(symbol);

    if (!position) {
      return NextResponse.json(
        { error: `No position found for ${symbol}` },
        { status: 404 }
      );
    }

    // Execute sell order for the full position (or specified quantity)
    const sellQuantity = quantity || position.qty;

    const tradeResult = await alpacaTradingService.executeTrade({
      symbol,
      side: 'sell',
      type: 'market',
      qty: sellQuantity,
      timeInForce: 'day'
    });

    if (tradeResult.success) {
      console.log(`✅ Position closed successfully: ${tradeResult.message}`);

      return NextResponse.json({
        success: true,
        message: `Successfully sold ${sellQuantity} shares of ${symbol}`,
        orderId: tradeResult.orderId,
        tradeResult
      });
    } else {
      console.error(`❌ Failed to close position: ${tradeResult.message}`);

      return NextResponse.json({
        success: false,
        error: tradeResult.message
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('💥 Error closing position:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to close position',
        message: error.message
      },
      { status: 500 }
    );
  }
}