import { NextResponse } from 'next/server';
import { getSchedulerStatus, triggerManualExecution } from '@/lib/services/botScheduler';

// GET /api/cron/status - Get scheduler status
export async function GET() {
  try {
    const status = getSchedulerStatus();

    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduler status' },
      { status: 500 }
    );
  }
}

// POST /api/cron/status - Manually trigger execution
export async function POST() {
  try {
    console.log('🔧 [API] Manual execution requested');

    await triggerManualExecution();

    return NextResponse.json({
      success: true,
      message: 'Manual execution triggered for all active bots'
    });
  } catch (error) {
    console.error('Error triggering manual execution:', error);
    return NextResponse.json(
      { error: 'Failed to trigger manual execution' },
      { status: 500 }
    );
  }
}
