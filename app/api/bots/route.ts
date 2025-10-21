import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createBot } from '@/lib/services/botCreationService';

// GET /api/bots - List all bots
export async function GET() {
  try {
    const bots = await prisma.bot.findMany({
      include: {
        strategy: true,
        trades: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(bots);
  } catch (error) {
    console.error('Error fetching bots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bots' },
      { status: 500 }
    );
  }
}

// POST /api/bots - Create a new bot with existing strategy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      symbol,
      fundAllocation,
      orderType,
      strategyId
    } = body;

    // Use common bot creation service
    const result = await createBot({
      name,
      symbol,
      strategyId,
      fundAllocation: fundAllocation || 1000.0,
      orderType: orderType || 'MARKET',
      description
    });

    // Handle creation result
    if (!result.success) {
      const statusCode =
        result.error?.code === 'STRATEGY_NOT_FOUND' ? 404 :
        result.error?.code === 'DUPLICATE_BOT' ? 409 :
        400;

      return NextResponse.json(
        { error: result.error?.message || 'Failed to create bot' },
        { status: statusCode }
      );
    }

    // Fetch full bot data with relations for response
    const bot = await prisma.bot.findUnique({
      where: { id: result.bot!.id },
      include: {
        strategy: true,
        trades: true,
      }
    });

    return NextResponse.json(bot, { status: 201 });
  } catch (error) {
    console.error('Error creating bot:', error);
    return NextResponse.json(
      { error: 'Failed to create bot' },
      { status: 500 }
    );
  }
}