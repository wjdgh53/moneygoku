import { NextRequest, NextResponse } from 'next/server';
import { reportStorageService } from '@/lib/services/reportStorageService';

// GET /api/reports/detail/[reportId] - Get report detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;

    const report = await reportStorageService.getReportById(reportId);

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report
    });

  } catch (error: any) {
    console.error('Error fetching report detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report detail', details: error.message },
      { status: 500 }
    );
  }
}
