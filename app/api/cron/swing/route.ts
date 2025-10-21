/**
 * Vercel Cron Job: SWING Bots
 *
 * Executes all active SWING trading bots.
 * Schedule: 9 AM and 3 PM (configured in vercel.json)
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

    console.log('⏰ [Cron] SWING execution triggered');

    // Get base URL
    const baseUrl = process.env.NEXTAUTH_URL ||
                    `https://${request.headers.get('host')}` ||
                    'http://localhost:3000';

    // Execute SWING bots
    const result = await executeBotsForTimeHorizon('SWING', baseUrl);

    return NextResponse.json({
      timeHorizon: 'SWING',
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [Cron] SWING execution failed:', error);
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
