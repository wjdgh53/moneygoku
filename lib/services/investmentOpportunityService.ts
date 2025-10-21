/**
 * Investment Opportunity Service
 *
 * 여러 시장 이벤트 시그널을 종합하여 투자 기회를 분석하고 스코어링하는 서비스
 */

import {
  InvestmentOpportunity,
  Signal,
  SignalType,
  SIGNAL_SCORES,
  SIGNAL_DESCRIPTIONS,
} from '@/lib/types/investmentOpportunity';
import {
  MarketEventsResponse,
  AnalystRating,
  MergerAcquisition,
  MarketMover,
  StockSplit,
  UpcomingEarnings,
} from '@/lib/types/marketEvents';
import { generateText, GPT_MODELS } from '@/lib/utils/openai';

/**
 * 캐시 인터페이스
 */
interface OpportunityCache {
  data: InvestmentOpportunity[];
  timestamp: number;
  expiresAt: number;
}

/**
 * 캐시 TTL (5분)
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 인메모리 캐시
 */
let opportunityCache: OpportunityCache | null = null;

/**
 * 종목별 시그널을 그룹화하기 위한 맵
 */
type SymbolSignalsMap = Map<string, Signal[]>;

/**
 * 종목별 가격 정보를 저장하기 위한 맵
 */
interface StockInfo {
  companyName?: string;
  price?: number;
  changePercent?: number;
  volume?: number;
}
type SymbolInfoMap = Map<string, StockInfo>;

/**
 * Investment Opportunity Service Class
 */
class InvestmentOpportunityService {
  /**
   * Market Events 데이터를 분석하여 투자 기회 목록 생성
   *
   * @param marketEvents - Market Events 데이터
   * @param useCache - 캐시 사용 여부 (기본: true)
   * @returns 투자 기회 목록
   */
  analyzeMarketEvents(
    marketEvents: MarketEventsResponse,
    useCache: boolean = true
  ): InvestmentOpportunity[] {
    // 캐시 확인
    if (useCache && opportunityCache && Date.now() < opportunityCache.expiresAt) {
      console.log('[InvestmentOpportunity] Using cached data');
      return opportunityCache.data;
    }

    console.log('[InvestmentOpportunity] Analyzing market events...');

    // 1. 종목별 시그널 수집
    const symbolSignals = this.collectSignals(marketEvents);

    // 2. 종목별 가격 정보 수집
    const symbolInfo = this.collectStockInfo(marketEvents);

    // 3. 투자 기회 객체 생성
    const opportunities = this.createOpportunities(symbolSignals, symbolInfo);

    // 4. 점수 기준으로 정렬 및 순위 부여
    const sortedOpportunities = this.rankOpportunities(opportunities);

    // 5. 캐시 저장
    opportunityCache = {
      data: sortedOpportunities,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    console.log(
      `[InvestmentOpportunity] Found ${sortedOpportunities.length} opportunities`
    );

    return sortedOpportunities;
  }

  /**
   * Market Events에서 종목별 시그널 수집
   */
  private collectSignals(marketEvents: MarketEventsResponse): SymbolSignalsMap {
    const signalsMap: SymbolSignalsMap = new Map();

    // Helper: 시그널 추가
    const addSignal = (symbol: string, signal: Signal) => {
      if (!signalsMap.has(symbol)) {
        signalsMap.set(symbol, []);
      }
      signalsMap.get(symbol)!.push(signal);
    };

    // 1. Analyst Ratings (Buy/Upgrade)
    marketEvents.analystRatings.forEach((rating) => {
      if (this.isBuySignal(rating)) {
        addSignal(rating.symbol, {
          type: 'analyst_upgrade',
          score: SIGNAL_SCORES.analyst_upgrade,
          source: rating.gradingCompany,
          description: `${rating.previousGrade} → ${rating.newGrade}`,
          date: rating.publishedDate,
          metadata: {
            newsURL: rating.newsURL,
            newsTitle: rating.newsTitle,
          },
        });
      }
    });

    // 2. Mergers & Acquisitions
    marketEvents.mergersAcquisitions.forEach((ma) => {
      addSignal(ma.symbol, {
        type: 'merger_acquisition',
        score: SIGNAL_SCORES.merger_acquisition,
        source: 'FMP',
        description: ma.title,
        date: ma.publishedDate,
        metadata: {
          url: ma.url,
          dealType: ma.dealType,
          dealValue: ma.dealValue,
        },
      });
    });

    // 3. Top Gainers (상위 10개)
    const topGainers = marketEvents.marketMovers.topGainers.slice(0, 10);
    topGainers.forEach((gainer) => {
      addSignal(gainer.symbol, {
        type: 'top_gainer',
        score: SIGNAL_SCORES.top_gainer,
        source: 'Alpha Vantage',
        description: `+${gainer.changePercent.toFixed(2)}% today`,
        date: new Date().toISOString(),
        metadata: {
          price: gainer.price,
          changeAmount: gainer.changeAmount,
        },
      });
    });

    // 4. Stock Splits (향후 30일 이내)
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    marketEvents.stockSplits.forEach((split) => {
      const splitDate = new Date(split.date);
      if (splitDate >= now && splitDate <= thirtyDaysLater) {
        addSignal(split.symbol, {
          type: 'stock_split',
          score: SIGNAL_SCORES.stock_split,
          source: 'FMP',
          description: `${split.numerator}-for-${split.denominator} split on ${split.date}`,
          date: split.date,
          metadata: {
            numerator: split.numerator,
            denominator: split.denominator,
            label: split.label,
          },
        });
      }
    });

    // 5. Upcoming Earnings (긍정적 전망 - EPS 추정치가 있는 경우)
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    marketEvents.upcomingEarnings.forEach((earnings) => {
      const earningsDate = new Date(earnings.date);
      // 향후 7일 이내 + EPS 추정치가 긍정적인 경우
      if (
        earningsDate >= now &&
        earningsDate <= sevenDaysLater &&
        earnings.epsEstimated &&
        earnings.epsEstimated > 0
      ) {
        addSignal(earnings.symbol, {
          type: 'earnings_upcoming',
          score: SIGNAL_SCORES.earnings_upcoming,
          source: 'FMP',
          description: `Earnings on ${earnings.date} (EPS est: $${earnings.epsEstimated?.toFixed(2)})`,
          date: earnings.date,
          metadata: {
            epsEstimated: earnings.epsEstimated,
            revenueEstimated: earnings.revenueEstimated,
            time: earnings.time,
          },
        });
      }
    });

    // 6. Most Active (상위 10개)
    const mostActive = marketEvents.marketMovers.mostActive.slice(0, 10);
    mostActive.forEach((active) => {
      addSignal(active.symbol, {
        type: 'high_volume',
        score: SIGNAL_SCORES.high_volume,
        source: 'Alpha Vantage',
        description: `Volume: ${this.formatVolume(active.volume)}`,
        date: new Date().toISOString(),
        metadata: {
          volume: active.volume,
          price: active.price,
        },
      });
    });

    return signalsMap;
  }

  /**
   * Market Events에서 종목별 가격 정보 수집
   */
  private collectStockInfo(marketEvents: MarketEventsResponse): SymbolInfoMap {
    const infoMap: SymbolInfoMap = new Map();

    // Market Movers에서 가격 정보 수집
    const allMovers = [
      ...marketEvents.marketMovers.topGainers,
      ...marketEvents.marketMovers.topLosers,
      ...marketEvents.marketMovers.mostActive,
    ];

    allMovers.forEach((mover) => {
      if (!infoMap.has(mover.symbol)) {
        infoMap.set(mover.symbol, {
          price: mover.price,
          changePercent: mover.changePercent,
          volume: mover.volume,
        });
      }
    });

    // Upcoming Earnings에서 회사명 수집
    marketEvents.upcomingEarnings.forEach((earnings) => {
      const existing = infoMap.get(earnings.symbol);
      if (existing && earnings.name) {
        existing.companyName = earnings.name;
      } else if (earnings.name) {
        infoMap.set(earnings.symbol, {
          companyName: earnings.name,
        });
      }
    });

    // Stock Splits에서 회사명 수집
    marketEvents.stockSplits.forEach((split) => {
      const existing = infoMap.get(split.symbol);
      if (existing && split.label) {
        existing.companyName = split.label;
      } else if (split.label) {
        infoMap.set(split.symbol, {
          companyName: split.label,
        });
      }
    });

    return infoMap;
  }

  /**
   * 종목별 시그널과 가격 정보를 결합하여 투자 기회 객체 생성
   */
  private createOpportunities(
    symbolSignals: SymbolSignalsMap,
    symbolInfo: SymbolInfoMap
  ): InvestmentOpportunity[] {
    const opportunities: InvestmentOpportunity[] = [];

    symbolSignals.forEach((signals, symbol) => {
      // 총 점수 계산
      const totalScore = signals.reduce((sum, signal) => sum + signal.score, 0);

      // 가격 정보 가져오기
      const info = symbolInfo.get(symbol);

      // 투자 기회 객체 생성
      opportunities.push({
        symbol,
        companyName: info?.companyName,
        totalScore,
        signals,
        price: info?.price,
        changePercent: info?.changePercent,
        volume: info?.volume,
        rank: 0, // 나중에 설정
      });
    });

    return opportunities;
  }

  /**
   * 투자 기회를 점수 기준으로 정렬하고 순위 부여
   */
  private rankOpportunities(
    opportunities: InvestmentOpportunity[]
  ): InvestmentOpportunity[] {
    // 1. 점수 기준 내림차순 정렬
    const sorted = opportunities.sort((a, b) => b.totalScore - a.totalScore);

    // 2. 순위 부여
    sorted.forEach((opportunity, index) => {
      opportunity.rank = index + 1;
    });

    return sorted;
  }

  /**
   * Analyst Rating이 Buy 시그널인지 확인
   */
  private isBuySignal(rating: AnalystRating): boolean {
    const buyKeywords = ['buy', 'outperform', 'overweight', 'strong buy'];
    const newGradeLower = rating.newGrade?.toLowerCase() || '';

    // 새 등급이 Buy 계열인지 확인
    const isNewGradeBuy = buyKeywords.some((keyword) =>
      newGradeLower.includes(keyword)
    );

    // 업그레이드인지 확인 (Hold → Buy, Sell → Hold 등)
    const ratingOrder = ['sell', 'underperform', 'hold', 'neutral', 'buy', 'outperform'];
    const previousGradeLower = rating.previousGrade?.toLowerCase() || '';
    const previousIndex = previousGradeLower ? ratingOrder.findIndex((r) =>
      previousGradeLower.includes(r)
    ) : -1;
    const newIndex = ratingOrder.findIndex((r) =>
      newGradeLower.includes(r)
    );
    const isUpgrade = newIndex > previousIndex && previousIndex !== -1;

    return isNewGradeBuy || isUpgrade;
  }

  /**
   * 거래량을 읽기 쉬운 형식으로 변환
   */
  private formatVolume(volume: number): string {
    if (volume >= 1_000_000_000) {
      return `${(volume / 1_000_000_000).toFixed(2)}B`;
    } else if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(2)}M`;
    } else if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toString();
  }

  /**
   * AI 요약 생성
   *
   * @param opportunity - 투자 기회 객체
   * @returns AI 생성 투자 논리 요약 (2-3문장)
   */
  async generateAISummary(
    opportunity: InvestmentOpportunity
  ): Promise<string> {
    try {
      // 시그널 정보를 텍스트로 변환
      const signalsDescription = opportunity.signals
        .map((signal) => {
          const typeDesc = SIGNAL_DESCRIPTIONS[signal.type];
          return `- ${typeDesc}: ${signal.description} (Source: ${signal.source})`;
        })
        .join('\n');

      // 가격 정보
      const priceInfo = opportunity.price
        ? `Current price: $${opportunity.price.toFixed(2)}, Change: ${opportunity.changePercent?.toFixed(2)}%`
        : 'Price information not available';

      // 프롬프트 생성 (한국어)
      const prompt = `이 투자 기회를 분석하고, 왜 이 주식이 투자할 가치가 있는지 2-3문장으로 간결하게 요약해주세요. 시그널을 기반으로 한 투자 논리에 집중하세요.

종목: ${opportunity.symbol}${opportunity.companyName ? ` (${opportunity.companyName})` : ''}
점수: ${opportunity.totalScore}점
${priceInfo}

시그널:
${signalsDescription}

전문적이고 객관적인 요약을 작성하되, 이 주식이 유망한 핵심 이유를 강조하세요. 불릿 포인트를 사용하지 말고, 100단어 이내로 작성하세요. 반드시 한국어로 답변하세요.`;

      const systemPrompt = `당신은 전문 투자 애널리스트입니다. 시장 시그널을 기반으로 명확하고 간결한 투자 요약을 한국어로 제공하세요. 객관적이고 사실에 기반해야 합니다.`;

      const summary = await generateText(prompt, {
        model: GPT_MODELS.GPT4_O_MINI,
        temperature: 0.5, // 더 일관된 결과를 위해 낮은 temperature
        maxTokens: 200,
        systemPrompt,
      });

      return summary.trim();
    } catch (error) {
      console.error(
        `[InvestmentOpportunity] Failed to generate AI summary for ${opportunity.symbol}:`,
        error
      );
      // AI 요약 실패 시 기본 요약 반환
      return this.generateFallbackSummary(opportunity);
    }
  }

  /**
   * AI 요약 실패 시 기본 요약 생성
   */
  private generateFallbackSummary(opportunity: InvestmentOpportunity): string {
    const signalTypes = opportunity.signals.map((s) => SIGNAL_DESCRIPTIONS[s.type]);
    const uniqueTypes = Array.from(new Set(signalTypes)).slice(0, 3).join(', ');

    return `${opportunity.symbol}은(는) ${uniqueTypes} 등 ${opportunity.signals.length}개의 시그널에서 총 ${opportunity.totalScore}점을 기록했습니다. ${
      opportunity.price
        ? `현재 $${opportunity.price.toFixed(2)}에 거래되고 있으며, ${opportunity.changePercent! > 0 ? '+' : ''}${opportunity.changePercent?.toFixed(2)}% 변동했습니다.`
        : ''
    }`;
  }

  /**
   * 캐시 강제 초기화
   */
  clearCache(): void {
    opportunityCache = null;
    console.log('[InvestmentOpportunity] Cache cleared');
  }

  /**
   * 캐시 상태 확인
   */
  getCacheStatus(): {
    isCached: boolean;
    expiresAt: string | null;
    remainingMs: number | null;
  } {
    if (!opportunityCache || Date.now() >= opportunityCache.expiresAt) {
      return {
        isCached: false,
        expiresAt: null,
        remainingMs: null,
      };
    }

    return {
      isCached: true,
      expiresAt: new Date(opportunityCache.expiresAt).toISOString(),
      remainingMs: opportunityCache.expiresAt - Date.now(),
    };
  }
}

// 싱글톤 인스턴스 export
export const investmentOpportunityService = new InvestmentOpportunityService();
