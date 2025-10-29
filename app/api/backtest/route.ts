import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const botId = searchParams.get('botId');

    console.log('📊 [Backtest API] Fetching data:', { days, botId });

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query filters
    const where: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (botId) {
      where.botId = botId;
    }

    console.log('🔍 [Backtest API] Query where:', JSON.stringify(where, null, 2));

    // Fetch reports with bot information
    const reports = await prisma.report.findMany({
      where,
      include: {
        bot: {
          select: {
            id: true,
            name: true,
            symbol: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary statistics
    const totalReports = reports.length;
    const decisionsCount = {
      BUY: reports.filter(r => r.decision === 'BUY').length,
      SELL: reports.filter(r => r.decision === 'SELL').length,
      HOLD: reports.filter(r => r.decision === 'HOLD').length,
    };

    // Calculate average scores
    const reportsWithScores = reports.filter(r => r.finalScore !== null);
    const avgFinalScore = reportsWithScores.length > 0
      ? reportsWithScores.reduce((sum, r) => sum + (r.finalScore || 0), 0) / reportsWithScores.length
      : 0;

    const reportsWithTechnical = reports.filter(r => r.technicalScore !== null);
    const avgTechnicalScore = reportsWithTechnical.length > 0
      ? reportsWithTechnical.reduce((sum, r) => sum + (r.technicalScore || 0), 0) / reportsWithTechnical.length
      : 0;

    const reportsWithSentiment = reports.filter(r => r.newsSentiment !== null);
    const avgNewsSentiment = reportsWithSentiment.length > 0
      ? reportsWithSentiment.reduce((sum, r) => sum + (r.newsSentiment || 0), 0) / reportsWithSentiment.length
      : 0;

    const reportsWithGptAdj = reports.filter(r => r.gptAdjustment !== null);
    const avgGptAdjustment = reportsWithGptAdj.length > 0
      ? reportsWithGptAdj.reduce((sum, r) => sum + (r.gptAdjustment || 0), 0) / reportsWithGptAdj.length
      : 0;

    // Calculate trade execution stats
    const tradesExecuted = reports.filter(r => r.tradeExecuted).length;
    const successfulTrades = reports.filter(r => r.tradeExecuted && r.tradeSuccess).length;
    const failedTrades = reports.filter(r => r.tradeExecuted && r.tradeSuccess === false).length;
    const winRate = tradesExecuted > 0 ? (successfulTrades / tradesExecuted) * 100 : 0;

    // Score by decision type
    const scoreByDecision = {
      BUY: {
        count: decisionsCount.BUY,
        avgFinalScore: 0,
        avgTechnicalScore: 0,
        avgNewsSentiment: 0,
      },
      SELL: {
        count: decisionsCount.SELL,
        avgFinalScore: 0,
        avgTechnicalScore: 0,
        avgNewsSentiment: 0,
      },
      HOLD: {
        count: decisionsCount.HOLD,
        avgFinalScore: 0,
        avgTechnicalScore: 0,
        avgNewsSentiment: 0,
      },
    };

    // Calculate averages for each decision type
    ['BUY', 'SELL', 'HOLD'].forEach((decision) => {
      const decisionReports = reports.filter(r => r.decision === decision);
      const withFinalScore = decisionReports.filter(r => r.finalScore !== null);
      const withTechnicalScore = decisionReports.filter(r => r.technicalScore !== null);
      const withSentiment = decisionReports.filter(r => r.newsSentiment !== null);

      if (withFinalScore.length > 0) {
        scoreByDecision[decision as keyof typeof scoreByDecision].avgFinalScore =
          withFinalScore.reduce((sum, r) => sum + (r.finalScore || 0), 0) / withFinalScore.length;
      }

      if (withTechnicalScore.length > 0) {
        scoreByDecision[decision as keyof typeof scoreByDecision].avgTechnicalScore =
          withTechnicalScore.reduce((sum, r) => sum + (r.technicalScore || 0), 0) / withTechnicalScore.length;
      }

      if (withSentiment.length > 0) {
        scoreByDecision[decision as keyof typeof scoreByDecision].avgNewsSentiment =
          withSentiment.reduce((sum, r) => sum + (r.newsSentiment || 0), 0) / withSentiment.length;
      }
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [Backtest API] Success - ${reports.length} reports in ${duration}ms`);

    return NextResponse.json({
      reports,
      summary: {
        totalReports,
        dateRange: { days, startDate: startDate.toISOString() },
        decisionsCount,
        avgFinalScore: parseFloat(avgFinalScore.toFixed(2)),
        avgTechnicalScore: parseFloat(avgTechnicalScore.toFixed(2)),
        avgNewsSentiment: parseFloat(avgNewsSentiment.toFixed(2)),
        avgGptAdjustment: parseFloat(avgGptAdjustment.toFixed(2)),
        tradesExecuted,
        successfulTrades,
        failedTrades,
        winRate: parseFloat(winRate.toFixed(2)),
        scoreByDecision,
      },
      meta: {
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [Backtest API] Error:', error);
    console.error('❌ [Backtest API] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch backtest data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
