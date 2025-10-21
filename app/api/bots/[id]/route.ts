import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteBot } from '@/lib/services/botDeletionService';

// GET /api/bots/[id] - Get bot details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bot = await prisma.bot.findUnique({
      where: { id },
      include: {
        strategy: true,
        trades: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { trades: true }
        }
      }
    });

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    // Transform trades to match frontend interface
    const transformedBot = {
      ...bot,
      trades: bot.trades.map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        price: trade.price,
        totalAmount: trade.total, // Map 'total' to 'totalAmount'
        fees: 0, // Default to 0 since we don't track fees in this model
        status: trade.status,
        executedAt: trade.executedAt,
        reason: trade.reason
      }))
    };

    return NextResponse.json(transformedBot);
  } catch (error) {
    console.error('Error fetching bot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bot' },
      { status: 500 }
    );
  }
}

// PUT /api/bots/[id] - Update bot
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, symbol, status, orderType, fundAllocation } = body;

    const bot = await prisma.bot.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(symbol && { symbol }),
        ...(status && { status }),
        ...(orderType && { orderType }),
        ...(fundAllocation !== undefined && { fundAllocation }),
      },
      include: {
        strategy: true,
        trades: true,
      }
    });

    return NextResponse.json(bot);
  } catch (error) {
    console.error('Error updating bot:', error);
    return NextResponse.json(
      { error: 'Failed to update bot' },
      { status: 500 }
    );
  }
}

// DELETE /api/bots/[id] - Delete bot with position cleanup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Use common deletion service (includes position cleanup)
    const result = await deleteBot(id);

    if (!result.success) {
      const statusCode = result.error?.code === 'BOT_NOT_FOUND' ? 404 : 500;
      return NextResponse.json(
        {
          error: result.error?.message,
          code: result.error?.code
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Bot ${result.botName} deleted successfully`,
      positionsClosed: result.positionsClosed || 0
    });
  } catch (error) {
    console.error('Error deleting bot:', error);
    return NextResponse.json(
      { error: 'Failed to delete bot' },
      { status: 500 }
    );
  }
}