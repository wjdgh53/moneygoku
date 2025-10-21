/**
 * Vercel Cron Job: LONG_TERM Bots
 *
 * Executes all active LONG_TERM trading bots.
 * Schedule: 10 AM daily (configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeBotsForTimeHorizon } from '@/lib/services/cronExecutor';

export async function GET(request: NextRequest) {
  try {
    // Verify request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('⏰ [Cron] LONG_TERM execution triggered');

    // Get base URL
    const baseUrl = process.env.NEXTAUTH_URL ||
                    `https://${request.headers.get('host')}` ||
                    'http://localhost:3000';

    // Execute LONG_TERM bots
    const result = await executeBotsForTimeHorizon('LONG_TERM', baseUrl);

    return NextResponse.json({
      timeHorizon: 'LONG_TERM',
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [Cron] LONG_TERM execution failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Allow POST as well for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}
