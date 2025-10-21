import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TechnicalIndicatorCalculator } from '@/lib/utils/technicalIndicators';
import { technicalIndicatorService } from '@/lib/services/technicalIndicatorService';

interface ComparisonResult {
  manualCalculation: {
    rsi14: number | null;
    sma20: number | null;
    ema12: number | null;
    ema26: number | null;
    macd: {
      macdLine: number | null;
      signalLine: number | null;
      histogram: number | null;
    };
    bollingerBands: {
      upper: number | null;
      middle: number | null;
      lower: number | null;
    };
  };
  alphaVantage: {
    rsi: number | null;
    sma20: number | null;
    ema12: number | null;
    ema26: number | null;
    macd: {
      macdLine: number | null;
      signalLine: number | null;
      histogram: number | null;
    };
    bollingerBands: {
      upper: number | null;
      middle: number | null;
      lower: number | null;
    };
  };
  comparison: {
    rsi: { difference: number | null; accuracy: number | null };
    sma20: { difference: number | null; accuracy: number | null };
    ema12: { difference: number | null; accuracy: number | null };
    ema26: { difference: number | null; accuracy: number | null };
    macdLine: { difference: number | null; accuracy: number | null };
    bollingerUpper: { difference: number | null; accuracy: number | null };
    bollingerMiddle: { difference: number | null; accuracy: number | null };
    bollingerLower: { difference: number | null; accuracy: number | null };
  };
}

function calculateAccuracy(manual: number | null, api: number | null): { difference: number | null; accuracy: number | null } {
  if (manual === null || api === null) {
    return { difference: null, accuracy: null };
  }

  const difference = Math.abs(manual - api);
  const accuracy = api !== 0 ? ((1 - difference / Math.abs(api)) * 100) : 100;

  return {
    difference: parseFloat(difference.toFixed(4)),
    accuracy: parseFloat(accuracy.toFixed(2))
  };
}

// POST /api/indicators/compare - Compare manual calculations with Alpha Vantage indicators for AAPL
export async function POST() {
  try {
    const symbol = 'AAPL';

    // Get historical market data for AAPL (last 50 days for calculations)
    const historicalData = await prisma.marketData.findMany({
      where: { symbol },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    if (historicalData.length < 30) {
      return NextResponse.json(
        { error: 'Not enough historical data for AAPL. Need at least 30 data points.' },
        { status: 400 }
      );
    }

    console.log(`Found ${historicalData.length} data points for ${symbol}`);

    // Convert to format needed for calculations (reverse to oldest first)
    const marketDataPoints = historicalData.reverse().map(data => ({
      close: data.close,
      high: data.high,
      low: data.low,
      volume: data.volume,
      timestamp: data.timestamp
    }));

    // Calculate indicators manually
    console.log('Calculating indicators manually...');
    const manualCalculation = TechnicalIndicatorCalculator.calculateAllIndicators(marketDataPoints);

    // Get indicators from Alpha Vantage
    console.log('Fetching indicators from Alpha Vantage...');
    const alphaVantage = await technicalIndicatorService.fetchAllIndicators(symbol);

    // Calculate comparisons
    const comparison = {
      rsi: calculateAccuracy(manualCalculation.rsi14, alphaVantage.rsi),
      sma20: calculateAccuracy(manualCalculation.sma20, alphaVantage.sma20),
      ema12: calculateAccuracy(manualCalculation.ema12, alphaVantage.ema12),
      ema26: calculateAccuracy(manualCalculation.ema26, alphaVantage.ema26),
      macdLine: calculateAccuracy(manualCalculation.macd.macdLine, alphaVantage.macd.macdLine),
      bollingerUpper: calculateAccuracy(manualCalculation.bollingerBands.upper, alphaVantage.bollingerBands.upper),
      bollingerMiddle: calculateAccuracy(manualCalculation.bollingerBands.middle, alphaVantage.bollingerBands.middle),
      bollingerLower: calculateAccuracy(manualCalculation.bollingerBands.lower, alphaVantage.bollingerBands.lower)
    };

    const result: ComparisonResult = {
      manualCalculation: {
        rsi14: manualCalculation.rsi14,
        sma20: manualCalculation.sma20,
        ema12: manualCalculation.ema12,
        ema26: manualCalculation.ema26,
        macd: manualCalculation.macd,
        bollingerBands: manualCalculation.bollingerBands
      },
      alphaVantage,
      comparison
    };

    return NextResponse.json({
      message: 'Technical indicators comparison completed',
      symbol,
      dataPoints: historicalData.length,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in indicators comparison:', error);
    return NextResponse.json(
      {
        error: 'Failed to compare indicators',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}