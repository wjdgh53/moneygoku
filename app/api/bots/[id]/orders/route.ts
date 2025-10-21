import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { alpacaTradingService } from '@/lib/services/alpacaTradingService';

// Order with fill status from Alpaca
export interface OrderWithFillStatus {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalAmount: number;
  status: string;
  executedAt: string;
  reason?: string;
  alpacaOrderId?: string;
  // Fill status from Alpaca
  fillStatus?: {
    status: string; // filled, partially_filled, pending_new, accepted, canceled, rejected, etc.
    filledQty: number;
    remainingQty: number;
    fillRate: number; // percentage 0-100
    averageFillPrice?: number;
  };
}

// GET /api/bots/[id]/orders - Get bot orders with fill status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch trades for this bot
    const trades = await prisma.trade.findMany({
      where: { botId: id },
      orderBy: { createdAt: 'desc' },
      take: 20 // Get latest 20 orders
    });

    // Transform trades and enrich with Alpaca fill status
    const ordersWithStatus: OrderWithFillStatus[] = await Promise.all(
      trades.map(async (trade) => {
        const baseOrder: OrderWithFillStatus = {
          id: trade.id,
          symbol: trade.symbol,
          side: trade.side,
          quantity: trade.quantity,
          price: trade.price,
          totalAmount: trade.total,
          status: trade.status,
          executedAt: trade.executedAt.toISOString(),
          reason: trade.reason || undefined,
          alpacaOrderId: trade.alpacaOrderId || undefined
        };

        // If we have Alpaca order ID, fetch fill status
        if (trade.alpacaOrderId) {
          try {
            const alpacaOrder = await alpacaTradingService.getOrder(trade.alpacaOrderId);

            const filledQty = parseFloat(alpacaOrder.filled_qty || '0');
            const orderQty = parseFloat(alpacaOrder.qty || trade.quantity.toString());
            const remainingQty = orderQty - filledQty;
            const fillRate = orderQty > 0 ? (filledQty / orderQty) * 100 : 0;

            baseOrder.fillStatus = {
              status: alpacaOrder.status,
              filledQty,
              remainingQty,
              fillRate: Math.round(fillRate),
              averageFillPrice: alpacaOrder.filled_avg_price ? parseFloat(alpacaOrder.filled_avg_price) : undefined
            };

            console.log(`✅ Order ${trade.alpacaOrderId} fill status:`, baseOrder.fillStatus);
          } catch (error) {
            console.error(`⚠️ Failed to fetch fill status for order ${trade.alpacaOrderId}:`, error);
            // Continue without fill status - order is still valid
            baseOrder.fillStatus = {
              status: 'unknown',
              filledQty: 0,
              remainingQty: trade.quantity,
              fillRate: 0
            };
          }
        }

        return baseOrder;
      })
    );

    return NextResponse.json({
      orders: ordersWithStatus,
      count: ordersWithStatus.length
    });

  } catch (error) {
    console.error('Error fetching bot orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bot orders' },
      { status: 500 }
    );
  }
}
