import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/market/fetch-all - Fetch market data for all active watchlist symbols
export async function POST() {
  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    return NextResponse.json(
      { error: 'Alpha Vantage API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Get all active symbols from watchlist
    const activeSymbols = await prisma.watchList.findMany({
      where: { isActive: true },
      select: { symbol: true, name: true }
    });

    if (activeSymbols.length === 0) {
      return NextResponse.json({
        message: 'No active symbols in watchlist',
        results: []
      });
    }

    console.log(`Fetching market data for ${activeSymbols.length} symbols: ${activeSymbols.map(s => s.symbol).join(', ')}`);

    const results = [];
    const errors = [];

    // Fetch data for each symbol with delay to respect API limits
    for (const { symbol } of activeSymbols) {
      try {
        console.log(`Fetching data for ${symbol}...`);

        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data['Error Message'] || data['Note']) {
          console.error(`Alpha Vantage error for ${symbol}:`, data['Error Message'] || data['Note']);
          errors.push({
            symbol,
            error: data['Error Message'] || data['Note']
          });
          continue;
        }

        const quote = data['Global Quote'];
        if (!quote) {
          console.error(`No quote data for ${symbol}`);
          errors.push({
            symbol,
            error: 'No quote data received'
          });
          continue;
        }

        // Save to database
        const marketData = await prisma.marketData.create({
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

        results.push({
          symbol,
          price: marketData.close,
          change: parseFloat(quote['09. change']),
          changePercent: quote['10. change percent'],
          timestamp: marketData.timestamp
        });

        console.log(`✓ Successfully fetched ${symbol}: $${marketData.close}`);

        // Add delay between requests (1 second)
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        errors.push({
          symbol,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Fetched data for ${results.length} out of ${activeSymbols.length} symbols`,
      results,
      errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in fetch-all:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}