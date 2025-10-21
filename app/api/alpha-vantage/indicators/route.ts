import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { symbol } = await request.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    console.log(`Fetching data for symbol: ${symbol}`);

    // Sample data for testing - replace with actual MCP calls
    const samplePrices = [
      { date: '2025-09-23', close: 254.43 },
      { date: '2025-09-22', close: 256.08 },
      { date: '2025-09-19', close: 245.50 },
      { date: '2025-09-18', close: 237.88 },
      { date: '2025-09-17', close: 238.99 },
      { date: '2025-09-16', close: 238.15 },
      { date: '2025-09-15', close: 236.70 },
      { date: '2025-09-12', close: 234.07 },
      { date: '2025-09-11', close: 230.03 },
      { date: '2025-09-10', close: 226.79 },
    ];

    const sampleRSI = [
      { date: '2025-09-23', value: 72.33 },
      { date: '2025-09-22', value: 75.00 },
      { date: '2025-09-19', value: 67.93 },
      { date: '2025-09-18', value: 60.45 },
      { date: '2025-09-17', value: 62.42 },
      { date: '2025-09-16', value: 61.54 },
      { date: '2025-09-15', value: 60.03 },
      { date: '2025-09-12', value: 57.22 },
      { date: '2025-09-11', value: 52.45 },
      { date: '2025-09-10', value: 48.13 },
    ];

    const sampleBollinger = [
      { date: '2025-09-23', upper: 252.18, middle: 237.15, lower: 222.12 },
      { date: '2025-09-22', upper: 249.16, middle: 235.79, lower: 222.42 },
      { date: '2025-09-19', upper: 244.44, middle: 234.37, lower: 224.31 },
      { date: '2025-09-18', upper: 242.84, middle: 233.34, lower: 223.84 },
      { date: '2025-09-17', upper: 242.52, middle: 232.75, lower: 222.98 },
      { date: '2025-09-16', upper: 241.70, middle: 232.33, lower: 222.95 },
      { date: '2025-09-15', upper: 240.96, middle: 231.96, lower: 222.96 },
      { date: '2025-09-12', upper: 240.12, middle: 231.45, lower: 222.78 },
      { date: '2025-09-11', upper: 239.55, middle: 230.98, lower: 222.41 },
      { date: '2025-09-10', upper: 238.92, middle: 230.15, lower: 221.38 },
    ];

    console.log(`Using sample data for ${symbol}`);

    const result = {
      symbol,
      prices: samplePrices,
      rsi: sampleRSI,
      bollinger: sampleBollinger,
      timestamp: new Date().toISOString(),
      debug: {
        dataSource: 'sample_data_for_testing',
        pricesCount: samplePrices.length,
        rsiCount: sampleRSI.length,
        bollingerCount: sampleBollinger.length
      }
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Alpha Vantage API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Alpha Vantage data' },
      { status: 500 }
    );
  }
}