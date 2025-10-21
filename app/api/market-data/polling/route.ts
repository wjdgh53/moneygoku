import { NextRequest, NextResponse } from 'next/server';
import { alphaVantageService } from '@/lib/services/alphaVantageService';

// GET /api/market-data/polling - Get polling status
export async function GET() {
  try {
    const status = alphaVantageService.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting polling status:', error);
    return NextResponse.json(
      { error: 'Failed to get polling status' },
      { status: 500 }
    );
  }
}

// POST /api/market-data/polling - Control polling (start/stop)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      alphaVantageService.startPolling();
      return NextResponse.json({
        message: 'Market data polling started',
        status: alphaVantageService.getStatus()
      });
    } else if (action === 'stop') {
      alphaVantageService.stopPolling();
      return NextResponse.json({
        message: 'Market data polling stopped',
        status: alphaVantageService.getStatus()
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error controlling market data polling:', error);
    return NextResponse.json(
      { error: 'Failed to control polling' },
      { status: 500 }
    );
  }
}