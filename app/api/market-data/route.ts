import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/market-data - Get latest market data for symbols
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');

    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'Symbols parameter is required' },
        { status: 400 }
      );
    }

    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());

    const marketData = await prisma.marketData.findMany({
      where: {
        symbol: {
          in: symbols
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      distinct: ['symbol']
    });

    return NextResponse.json({
      data: marketData,
      timestamp: new Date().toISOString(),
      symbols: symbols
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}