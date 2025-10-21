import { NextResponse } from 'next/server';
import { technicalIndicatorService } from '@/lib/services/technicalIndicatorService';

// GET /api/indicators/test-rsi - Test single RSI API call to debug response structure
export async function GET() {
  try {
    if (!process.env.ALPHA_VANTAGE_API_KEY) {
      return NextResponse.json(
        { error: 'Alpha Vantage API key not configured' },
        { status: 500 }
      );
    }

    console.log('🧪 Testing RSI API call for AAPL...');

    // Test just RSI to see the actual response structure
    const rsiValue = await technicalIndicatorService.fetchRSI('AAPL', 'daily', 14);

    return NextResponse.json({
      message: 'RSI test completed',
      symbol: 'AAPL',
      rsi: rsiValue,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in RSI test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a rate limit error
    if (errorMessage.includes('Alpha Vantage Rate Limit')) {
      return NextResponse.json(
        {
          error: 'API Rate Limit Exceeded',
          details: 'Alpha Vantage free tier allows 25 requests per day. Please try tomorrow or upgrade to premium.',
          rateLimit: true
        },
        { status: 429 } // Too Many Requests
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to test RSI',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}