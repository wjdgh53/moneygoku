import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/market/[symbol] - Get market data for specific symbol
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: rawSymbol } = await params;
    const symbol = rawSymbol.toUpperCase();

    // Get the latest market data for this symbol
    const marketData = await prisma.marketData.findFirst({
      where: {
        symbol: symbol
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    if (!marketData) {
      // If no data exists, try to fetch from Alpha Vantage
      if (!process.env.ALPHA_VANTAGE_API_KEY) {
        return NextResponse.json(
          { error: 'No market data available and Alpha Vantage API key not configured' },
          { status: 404 }
        );
      }

      try {
        const alphaUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
        const response = await fetch(alphaUrl);
        const data = await response.json();

        if (data['Error Message'] || data['Note']) {
          return NextResponse.json(
            { error: 'Failed to fetch market data from Alpha Vantage' },
            { status: 404 }
          );
        }

        const quote = data['Global Quote'];
        if (!quote) {
          return NextResponse.json(
            { error: 'Symbol not found' },
            { status: 404 }
          );
        }

        // Save to database
        const newMarketData = await prisma.marketData.create({
          data: {
            symbol: symbol,
            open: parseFloat(quote['02. open']),
            high: parseFloat(quote['03. high']),
            low: parseFloat(quote['04. low']),
            close: parseFloat(quote['05. price']),
            volume: parseFloat(quote['06. volume']),
            timestamp: new Date(),
            source: 'ALPHA_VANTAGE'
          }
        });

        return NextResponse.json(newMarketData);
      } catch (error) {
        console.error('Error fetching from Alpha Vantage:', error);
        return NextResponse.json(
          { error: 'Failed to fetch market data' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(marketData);
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}