import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { alpacaTradingService } from '@/lib/services/alpacaTradingService';

export interface TradeView {
  id: string;
  botName?: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  executedAt: Date;
  source: 'DATABASE' | 'ALPACA';
  reason?: string;
  orderId?: string;
}

// GET /api/trades/history - Get integrated trade history from database and Alpaca
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'all'; // 'all', 'database', 'alpaca'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const botId = searchParams.get('botId');
    const symbol = searchParams.get('symbol');

    console.log(`📊 Fetching trade history: source=${source}, limit=${limit}, offset=${offset}`);

    const trades: TradeView[] = [];

    // 1. Get database trades if requested
    if (source === 'all' || source === 'database') {
      console.log('🗄️ Fetching database trades...');

      const where: any = {};
      if (botId) where.botId = botId;
      if (symbol) where.symbol = symbol.toUpperCase();

      const dbTrades = await prisma.trade.findMany({
        where,
        include: {
          bot: {
            select: { name: true }
          }
        },
        orderBy: { executedAt: 'desc' },
        take: source === 'database' ? limit : Math.ceil(limit / 2), // Split limit between sources
        skip: source === 'database' ? offset : 0
      });

      const dbTradeViews: TradeView[] = dbTrades.map(trade => ({
        id: `db-${trade.id}`,
        botName: trade.bot.name,
        symbol: trade.symbol,
        side: trade.side as 'BUY' | 'SELL',
        quantity: trade.quantity,
        price: trade.price,
        total: trade.total,
        status: trade.status === 'EXECUTED' ? 'COMPLETED' : 'FAILED',
        executedAt: trade.executedAt,
        source: 'DATABASE',
        reason: trade.reason || undefined
      }));

      trades.push(...dbTradeViews);
      console.log(`📝 Found ${dbTradeViews.length} database trades`);
    }

    // 2. Get Alpaca orders if requested
    if (source === 'all' || source === 'alpaca') {
      try {
        console.log('🦙 Fetching Alpaca orders...');

        const alpacaOrders = await alpacaTradingService.getOrders('all');

        const alpacaTradeViews: TradeView[] = alpacaOrders
          .filter(order => {
            // Filter by symbol if specified
            if (symbol && order.symbol !== symbol.toUpperCase()) return false;
            return true;
          })
          .slice(0, source === 'alpaca' ? limit : Math.ceil(limit / 2))
          .map(order => ({
            id: `alpaca-${order.id}`,
            botName: undefined, // Alpaca orders don't have bot info
            symbol: order.symbol,
            side: order.side.toUpperCase() as 'BUY' | 'SELL',
            quantity: parseFloat(order.qty),
            price: parseFloat(order.filled_avg_price || order.limit_price || '0'),
            total: parseFloat(order.filled_qty) * parseFloat(order.filled_avg_price || '0'),
            status: order.status === 'filled' ? 'COMPLETED' :
                   order.status === 'canceled' || order.status === 'rejected' ? 'FAILED' : 'PENDING',
            executedAt: new Date(order.filled_at || order.created_at),
            source: 'ALPACA',
            orderId: order.id
          }));

        trades.push(...alpacaTradeViews);
        console.log(`🦙 Found ${alpacaTradeViews.length} Alpaca orders`);

      } catch (alpacaError) {
        console.error('❌ Error fetching Alpaca orders:', alpacaError);
        // Continue without Alpaca data
      }
    }

    // 3. Sort all trades by execution time (newest first)
    trades.sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());

    // 4. Apply pagination to combined results
    const paginatedTrades = trades.slice(offset, offset + limit);

    // 5. Calculate summary statistics
    const summary = {
      totalTrades: trades.length,
      totalVolume: trades.reduce((sum, trade) => sum + trade.total, 0),
      completedTrades: trades.filter(t => t.status === 'COMPLETED').length,
      failedTrades: trades.filter(t => t.status === 'FAILED').length,
      pendingTrades: trades.filter(t => t.status === 'PENDING').length,
      buyTrades: trades.filter(t => t.side === 'BUY').length,
      sellTrades: trades.filter(t => t.side === 'SELL').length
    };

    return NextResponse.json({
      trades: paginatedTrades,
      summary,
      pagination: {
        total: trades.length,
        limit,
        offset,
        hasMore: offset + limit < trades.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching trade history:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch trade history',
        message: error.message,
        trades: [],
        summary: {},
        pagination: { total: 0, limit: 0, offset: 0, hasMore: false }
      },
      { status: 500 }
    );
  }
}

// POST /api/trades/history/sync - Sync database trades with Alpaca orders
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Syncing database trades with Alpaca orders...');

    // Get all filled orders from Alpaca
    const alpacaOrders = await alpacaTradingService.getOrders('closed');
    const filledOrders = alpacaOrders.filter(order => order.status === 'filled');

    console.log(`🦙 Found ${filledOrders.length} filled Alpaca orders`);

    // Get all database trades
    const dbTrades = await prisma.trade.findMany({
      select: { id: true, symbol: true, side: true, quantity: true, executedAt: true }
    });

    console.log(`📝 Found ${dbTrades.length} database trades`);

    let syncedCount = 0;
    let skippedCount = 0;

    // Try to match and sync orders that aren't in database
    for (const order of filledOrders) {
      // Look for matching trade in database (same symbol, side, quantity, similar time)
      const orderDate = new Date(order.filled_at);
      const matchingTrade = dbTrades.find(trade =>
        trade.symbol === order.symbol &&
        trade.side === order.side.toUpperCase() &&
        Math.abs(trade.quantity - parseFloat(order.filled_qty)) < 0.01 &&
        Math.abs(trade.executedAt.getTime() - orderDate.getTime()) < 60000 // Within 1 minute
      );

      if (!matchingTrade) {
        // This Alpaca order is not in our database - could be manually executed
        console.log(`⚠️ Alpaca order not in database: ${order.symbol} ${order.side} ${order.filled_qty} @ ${order.filled_at}`);
        // We could optionally add it to database here
        skippedCount++;
      } else {
        syncedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${syncedCount} matched, ${skippedCount} unmatched`,
      synced: syncedCount,
      unmatched: skippedCount,
      totalAlpacaOrders: filledOrders.length,
      totalDbTrades: dbTrades.length
    });

  } catch (error: any) {
    console.error('❌ Error syncing trades:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync trades',
        message: error.message
      },
      { status: 500 }
    );
  }
}