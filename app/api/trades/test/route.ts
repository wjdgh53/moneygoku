import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/trades/test - Add test trade data
export async function POST(request: NextRequest) {
  try {
    // Get the first bot for testing
    const bot = await prisma.bot.findFirst();

    if (!bot) {
      return NextResponse.json(
        { error: 'No bot found for testing' },
        { status: 404 }
      );
    }

    // Create test trades
    const testTrades = [
      {
        botId: bot.id,
        symbol: bot.symbol,
        side: 'BUY' as const,
        quantity: 10,
        price: 150.00,
        total: 1500.00,
        status: 'EXECUTED' as const,
        reason: 'RSI oversold signal'
      },
      {
        botId: bot.id,
        symbol: bot.symbol,
        side: 'SELL' as const,
        quantity: 5,
        price: 155.00,
        total: 775.00,
        status: 'EXECUTED' as const,
        reason: 'Take profit target reached'
      },
      {
        botId: bot.id,
        symbol: bot.symbol,
        side: 'BUY' as const,
        quantity: 20,
        price: 148.50,
        total: 2970.00,
        status: 'EXECUTED' as const,
        reason: 'MACD bullish crossover'
      }
    ];

    const createdTrades = await Promise.all(
      testTrades.map(trade =>
        prisma.trade.create({
          data: trade
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Created ${createdTrades.length} test trades for bot ${bot.name}`,
      trades: createdTrades
    });

  } catch (error) {
    console.error('Error creating test trades:', error);
    return NextResponse.json(
      { error: 'Failed to create test trades', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}