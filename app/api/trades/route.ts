import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/trades - List trades with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const botId = searchParams.get('botId');
    const symbol = searchParams.get('symbol');
    const status = searchParams.get('status');

    const where: any = {};
    if (botId) where.botId = botId;
    if (symbol) where.symbol = symbol.toUpperCase();
    if (status) where.status = status;

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          bot: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.trade.count({ where })
    ]);

    return NextResponse.json({
      trades,
      total,
      hasMore: total > offset + limit
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}