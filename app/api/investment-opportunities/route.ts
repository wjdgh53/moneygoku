/**
 * Investment Opportunities API Endpoint
 *
 * GET /api/investment-opportunities
 *
 * 여러 시장 이벤트 시그널을 종합하여 투자 기회를 스코어링하고 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { marketEventsService } from '@/lib/services/marketEventsService';
import { investmentOpportunityService } from '@/lib/services/investmentOpportunityService';
import { InvestmentOpportunityResponse } from '@/lib/types/investmentOpportunity';

/**
 * GET /api/investment-opportunities
 *
 * Query Parameters:
 * - limit: 반환할 종목 수 (기본: 10, 최대: 50)
 * - minScore: 최소 스코어 (기본: 2)
 * - includeAI: AI 요약 포함 여부 (기본: true) - 현재는 미구현
 * - forceRefresh: 캐시 무시 (기본: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Query parameters 파싱
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '10', 10),
      50 // 최대 50개
    );
    const minScore = parseInt(searchParams.get('minScore') || '2', 10);
    const includeAI = searchParams.get('includeAI') !== 'false'; // 기본 true
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    console.log('[API] Investment Opportunities request:', {
      limit,
      minScore,
      includeAI,
      forceRefresh,
    });

    // 1. Market Events 데이터 가져오기
    const marketEvents = await marketEventsService.getAllMarketEvents({
      forceRefresh,
    });

    // 2. 투자 기회 분석
    const useCache = !forceRefresh;
    const allOpportunities = investmentOpportunityService.analyzeMarketEvents(
      marketEvents,
      useCache
    );

    // 3. 필터링 (최소 점수)
    const filteredOpportunities = allOpportunities.filter(
      (opp) => opp.totalScore >= minScore
    );

    // 4. 제한된 개수만 반환
    const limitedOpportunities = filteredOpportunities.slice(0, limit);

    // 5. AI 요약 생성
    if (includeAI) {
      console.log(
        `[API] Generating AI summaries for ${limitedOpportunities.length} opportunities...`
      );

      // 병렬로 AI 요약 생성 (성능 최적화)
      await Promise.all(
        limitedOpportunities.map(async (opportunity) => {
          try {
            opportunity.aiSummary =
              await investmentOpportunityService.generateAISummary(opportunity);
          } catch (error) {
            console.error(
              `[API] Failed to generate AI summary for ${opportunity.symbol}:`,
              error
            );
            // 개별 실패는 무시하고 계속 진행
          }
        })
      );

      console.log('[API] AI summary generation completed');
    }

    // 6. 응답 생성
    const response: InvestmentOpportunityResponse = {
      opportunities: limitedOpportunities,
      metadata: {
        totalOpportunities: filteredOpportunities.length,
        timestamp: new Date().toISOString(),
        cached: investmentOpportunityService.getCacheStatus().isCached,
        dataSources: ['FMP', 'Alpha Vantage'],
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[API] Investment Opportunities error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: 'Failed to fetch investment opportunities',
        message: errorMessage,
        opportunities: [],
        metadata: {
          totalOpportunities: 0,
          timestamp: new Date().toISOString(),
          cached: false,
        },
      },
      { status: 500 }
    );
  }
}

