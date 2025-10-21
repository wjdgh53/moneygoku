import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { botTestService } from '@/lib/services/botTestService';
import { alphaVantageService } from '@/lib/services/alphaVantageService';

// GET /api/reports?botId=xxx - Get reports for a bot
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const botId = searchParams.get('botId');

    if (!botId) {
      return NextResponse.json(
        { error: 'botId is required' },
        { status: 400 }
      );
    }

    const dbReports = await prisma.report.findMany({
      where: { botId },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Convert database reports to TestReport format
    const testReports = dbReports.map(dbReport => {
      // Parse stored JSON data
      const apiCalls = dbReport.apiCalls ? JSON.parse(dbReport.apiCalls) : [];
      const conditions = dbReport.conditions ? JSON.parse(dbReport.conditions) : [];
      const strategyParams = dbReport.strategyParams ? JSON.parse(dbReport.strategyParams) : {};

      return {
        symbol: dbReport.symbol,
        timestamp: dbReport.timestamp ? dbReport.timestamp.toISOString() : dbReport.createdAt.toISOString(),
        executionTime: dbReport.executionTime || 200,
        currentPrice: dbReport.currentPrice,
        apiCalls,
        conditions,
        finalDecision: dbReport.decision as 'BUY' | 'SELL' | 'HOLD',
        reason: dbReport.decisionReason,
        ...strategyParams
      };
    });

    return NextResponse.json(testReports);
  } catch (error) {
    console.error('Error loading reports:', error);
    return NextResponse.json(
      { error: 'Failed to load reports' },
      { status: 500 }
    );
  }
}

// POST /api/reports - Run bot test and save report
export async function POST(request: NextRequest) {
  try {
    const { botId, symbol } = await request.json();

    if (!botId || !symbol) {
      return NextResponse.json(
        { error: 'botId and symbol are required' },
        { status: 400 }
      );
    }

    console.log(`🔥 API: Running bot test for ${symbol} with botId ${botId}`);

    // Get bot and strategy details
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: { strategy: true }
    });

    if (!bot || !bot.strategy) {
      return NextResponse.json(
        { error: 'Bot or strategy not found' },
        { status: 404 }
      );
    }

    // Get current price (using a mock price for now)
    const currentPrice = 181.85; // Mock price for NVDA

    console.log(`💰 Current price for ${symbol}: $${currentPrice}`);
    console.log(`💼 Bot fund allocation: $${bot.fundAllocation || 'not set'}`);

    // Run the actual bot test
    const report = await botTestService.runTest(bot.strategy as any, symbol, currentPrice, bot.fundAllocation, botId);

    const dbReport = await prisma.report.create({
      data: {
        botId,
        symbol: report.symbol,
        currentPrice: report.currentPrice || 0,
        decision: report.finalDecision,
        decisionReason: report.reason,
        executionTime: report.executionTime || 200,
        apiCalls: JSON.stringify(report.apiCalls || []),
        conditions: JSON.stringify(report.conditions || []),
        strategyParams: JSON.stringify({
          timestamp: report.timestamp,
          tradeExecuted: report.tradeExecuted,
          tradeResult: report.tradeResult
        }),
        timestamp: new Date(report.timestamp)
      }
    });

    console.log(`✅ API: Test completed and report saved with ID ${dbReport.id}`);

    return NextResponse.json({
      success: true,
      reportId: dbReport.id,
      report: report // 실제 테스트 결과 반환
    });
  } catch (error) {
    console.error('Error saving report:', error);
    return NextResponse.json(
      { error: 'Failed to save report' },
      { status: 500 }
    );
  }
}