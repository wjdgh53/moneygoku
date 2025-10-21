import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { alpacaTradingService } from '@/lib/services/alpacaTradingService';
import { technicalIndicatorService } from '@/lib/services/technicalIndicatorService';

// GET /api/account - 전체 포트폴리오 현황 조회 (모든 봇 합산)
export async function GET() {
  try {
    // 모든 봇 조회
    const bots = await prisma.bot.findMany({
      select: {
        id: true,
        symbol: true,
        fundAllocation: true,
        totalReturns: true
      }
    });

    let totalCash = 0;
    let totalPortfolioValue = 0;
    let totalReturns = 0;

    // 각 봇의 포지션 데이터 조회 및 합산
    for (const bot of bots) {
      const symbol = bot.symbol;

      // 1. 포지션 조회
      const position = await prisma.position.findUnique({
        where: {
          botId_symbol: { botId: bot.id, symbol }
        }
      });

      let stockValue = 0;
      let unrealizedPL = 0;
      let positionTotalCost = 0;

      if (position && position.quantity > 0) {
        // 실시간 시장가 조회 (Alpaca 우선, fallback Alpha Vantage)
        let currentPrice = 0;

        try {
          const alpacaPosition = await alpacaTradingService.getPosition(symbol);
          if (alpacaPosition && alpacaPosition.currentPrice) {
            currentPrice = alpacaPosition.currentPrice;
          }
        } catch {
          // Alpaca 실패 시 Alpha Vantage
          const alphaPrice = await technicalIndicatorService.fetchCurrentPrice(symbol);
          if (alphaPrice) {
            currentPrice = alphaPrice;
          }
        }

        if (currentPrice > 0) {
          stockValue = position.quantity * currentPrice;
          unrealizedPL = stockValue - position.totalCost;
          positionTotalCost = position.totalCost;
        } else {
          // 가격 조회 실패 시 DB 데이터 사용
          stockValue = position.marketValue;
          unrealizedPL = position.unrealizedPL;
          positionTotalCost = position.totalCost;
        }
      }

      // 2. 봇별 계산
      const realizedPL = bot.totalReturns || 0;
      const botTotalReturns = realizedPL + unrealizedPL;
      const availableCash = bot.fundAllocation + realizedPL - positionTotalCost;
      const botTotalValue = bot.fundAllocation + botTotalReturns;

      // 3. 합산
      totalCash += availableCash;
      totalPortfolioValue += botTotalValue;
      totalReturns += botTotalReturns;
    }

    const totalAllocatedFunds = bots.reduce((sum, bot) => sum + bot.fundAllocation, 0);
    const totalReturnsPercent = totalAllocatedFunds > 0
      ? (totalReturns / totalAllocatedFunds) * 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        cash: totalCash,
        portfolioValue: totalPortfolioValue,
        totalReturns: totalReturns,
        totalReturnsPercent: totalReturnsPercent,
        botCount: bots.length,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching account data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account data' },
      { status: 500 }
    );
  }
}
