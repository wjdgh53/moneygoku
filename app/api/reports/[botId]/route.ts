import { NextRequest, NextResponse } from 'next/server';
import { reportStorageService } from '@/lib/services/reportStorageService';

// GET /api/reports/[botId] - Get all reports for a bot
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params;

    const reports = await reportStorageService.getReportsByBotId(botId);

    return NextResponse.json({
      success: true,
      reports
    });

  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error.message },
      { status: 500 }
    );
  }
}
