import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/market/last-fetch - Get the most recent market data fetch results
export async function GET() {
  try {
    // Find the most recent timestamp
    const latestRecord = await prisma.marketData.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true }
    });

    if (!latestRecord) {
      return NextResponse.json({
        message: 'No market data found',
        data: []
      });
    }

    // Get all records from the latest fetch (within 2 minutes of the latest timestamp)
    const latestTime = new Date(latestRecord.timestamp);
    const twoMinutesEarlier = new Date(latestTime.getTime() - 2 * 60 * 1000);

    const lastFetchResults = await prisma.marketData.findMany({
      where: {
        timestamp: {
          gte: twoMinutesEarlier,
          lte: latestTime
        }
      },
      orderBy: [
        { timestamp: 'desc' },
        { symbol: 'asc' }
      ]
    });

    return NextResponse.json({
      message: `Found ${lastFetchResults.length} records from last fetch`,
      fetchTimestamp: latestTime,
      data: lastFetchResults
    });

  } catch (error) {
    console.error('Error retrieving last fetch results:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve last fetch results' },
      { status: 500 }
    );
  }
}