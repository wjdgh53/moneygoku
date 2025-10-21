import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/watchlist - Get all watchlist symbols
export async function GET() {
  try {
    const watchlist = await prisma.watchList.findMany({
      orderBy: { addedAt: 'desc' }
    });

    return NextResponse.json(watchlist);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

// POST /api/watchlist - Add symbol to watchlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, name } = body;

    if (!symbol || !name) {
      return NextResponse.json(
        { error: 'Symbol and name are required' },
        { status: 400 }
      );
    }

    const watchlistItem = await prisma.watchList.create({
      data: {
        symbol: symbol.toUpperCase(),
        name,
        isActive: true
      }
    });

    return NextResponse.json(watchlistItem, { status: 201 });
  } catch (error: any) {
    console.error('Error adding to watchlist:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Symbol already exists in watchlist' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 }
    );
  }
}