import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { alpacaTradingService } from '@/lib/services/alpacaTradingService';
import { technicalIndicatorService } from '@/lib/services/technicalIndicatorService';

// GET /api/bots/[id]/position - 특정 봇의 포지션과 자금 현황 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: botId } = await params;

    // 1. 봇 정보 조회
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      select: {
        id: true,
        symbol: true,
        fundAllocation: true,
        totalReturns: true,  // 실현 손익
        realizedCash: true   // 매도로 회수한 현금
      }
    });

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    const symbol = bot.symbol;

    // 2. DB에서 현재 포지션 조회
    let currentPosition = null;
    let stockValue = 0;
    let currentPrice = 0;
    let positionTotalCost = 0;

    try {
      const dbPosition = await prisma.position.findUnique({
        where: {
          botId_symbol: { botId, symbol }
        }
      });

      if (dbPosition && dbPosition.quantity > 0) {
        // 실시간 시장가 조회 (Alpaca 우선, fallback Alpha Vantage)
        let realTimePrice: number | null = null;

        // 1. Alpaca에서 실시간 가격 조회 시도
        try {
          const alpacaPosition = await alpacaTradingService.getPosition(symbol);
          if (alpacaPosition && alpacaPosition.currentPrice) {
            realTimePrice = alpacaPosition.currentPrice;
            console.log(`📊 Alpaca 실시간 가격 사용: $${realTimePrice.toFixed(2)}`);
          }
        } catch (alpacaError) {
          console.warn('⚠️ Alpaca 가격 조회 실패, Alpha Vantage fallback 시도');
        }

        // 2. Alpaca 실패 시 Alpha Vantage fallback
        if (!realTimePrice) {
          try {
            realTimePrice = await technicalIndicatorService.fetchCurrentPrice(symbol);
            if (realTimePrice && realTimePrice > 0) {
              console.log(`✅ Alpha Vantage 실시간 가격: $${realTimePrice.toFixed(2)}`);
            } else {
              console.warn(`⚠️ Alpha Vantage가 유효하지 않은 가격 반환: ${realTimePrice}`);
              realTimePrice = null;
            }
          } catch (avError) {
            console.error(`❌ Alpha Vantage 가격 조회 실패:`, avError);
            realTimePrice = null;
          }
        }

        if (realTimePrice) {
          currentPrice = realTimePrice;
          stockValue = dbPosition.quantity * currentPrice;
          const unrealizedPL = stockValue - dbPosition.totalCost;

          currentPosition = {
            quantity: dbPosition.quantity,
            entryPrice: dbPosition.avgEntryPrice,
            currentValue: stockValue,
            currentPrice: currentPrice,
            unrealizedPL: unrealizedPL,
            unrealizedPLPercent: dbPosition.totalCost > 0
              ? (unrealizedPL / dbPosition.totalCost) * 100
              : 0
          };
          positionTotalCost = dbPosition.totalCost;
        } else {
          // 실시간 가격 조회 완전 실패 시 DB 데이터 사용 (fallback)
          console.warn(`⚠️ 실시간 가격 조회 실패! DB의 오래된 값 사용 (정확하지 않을 수 있음)`);
          console.warn(`   DB marketValue: $${dbPosition.marketValue}, quantity: ${dbPosition.quantity}`);

          const calculatedCurrentPrice = dbPosition.marketValue / dbPosition.quantity;
          console.warn(`   계산된 가격: $${calculatedCurrentPrice.toFixed(2)} (마지막 업데이트: ${dbPosition.updatedAt})`);

          currentPosition = {
            quantity: dbPosition.quantity,
            entryPrice: dbPosition.avgEntryPrice,
            currentValue: dbPosition.marketValue,
            currentPrice: calculatedCurrentPrice,
            unrealizedPL: dbPosition.unrealizedPL,
            unrealizedPLPercent: dbPosition.totalCost > 0
              ? (dbPosition.unrealizedPL / dbPosition.totalCost) * 100
              : 0
          };
          stockValue = dbPosition.marketValue;
          currentPrice = calculatedCurrentPrice;
          positionTotalCost = dbPosition.totalCost;
        }
      }
    } catch (posError) {
      console.log('포지션 조회 실패 (보유 없음으로 간주):', posError);
      currentPosition = null;
    }

    // 3. fundAllocation 결정 (fallback: positionTotalCost 사용)
    let fundAllocation = bot.fundAllocation || 0;
    if (fundAllocation === 0 && positionTotalCost > 0) {
      // fundAllocation이 0이면 포지션의 totalCost를 할당 자금으로 사용
      fundAllocation = positionTotalCost;
    }

    // 4. 자금 현황 계산
    const realizedPL = bot.totalReturns || 0;  // 실현 손익
    const unrealizedPL = currentPosition?.unrealizedPL || 0;  // 미실현 손익
    const totalReturns = realizedPL + unrealizedPL;

    const availableCash = fundAllocation + realizedPL - positionTotalCost; // 할당자금 + 실현손익 - 현재투자금
    const totalValue = fundAllocation + totalReturns; // 할당자금 + 총손익 (실현+미실현)
    const totalReturnsPercent = fundAllocation > 0 ? (totalReturns / fundAllocation) * 100 : 0;

    // 5. 응답 반환
    return NextResponse.json({
      success: true,
      position: currentPosition,
      fundStatus: {
        allocatedFund: fundAllocation,
        stockValue,
        availableCash,
        totalValue,
        totalReturns,
        totalReturnsPercent
      },
      currentPrice,
      symbol
    });

  } catch (error) {
    console.error('Error fetching bot position:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bot position' },
      { status: 500 }
    );
  }
}
