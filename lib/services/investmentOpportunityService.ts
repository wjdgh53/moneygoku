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
import { calculateInsiderBuyingScore } from '@/lib/utils/insiderScoringAlgorithm';
import { generateInvestmentAnalysis } from '@/lib/services/aiInvestmentAnalysis';
import { momentumScreenerService } from '@/lib/services/momentumScreenerService';

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
 * 시그널 타입별 Half-Life (일 단위)
 * 시간이 지남에 따라 시그널의 가치가 감소하는 속도를 정의
 */
const SIGNAL_HALF_LIFE_DAYS: Record<SignalType, number> = {
  insider_buying: 60,         // 2개월 (장기 신호)
  analyst_upgrade: 30,        // 1개월 후 50% 가치
  merger_acquisition: 14,     // 2주 (빠르게 프라이싱됨)
  top_gainer: 3,              // 3일 (단기 모멘텀)
  stock_split: 21,            // 3주
  earnings_upcoming: 7,       // 1주일
  high_volume: 1,             // 당일만 유효
};

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
  async analyzeMarketEvents(
    marketEvents: MarketEventsResponse,
    useCache: boolean = true
  ): Promise<InvestmentOpportunity[]> {
    // 캐시 확인
    if (useCache && opportunityCache && Date.now() < opportunityCache.expiresAt) {
      console.log('[InvestmentOpportunity] Using cached data');
      return opportunityCache.data;
    }

    console.log('[InvestmentOpportunity] Analyzing market events...');

    // 1. 종목별 시그널 수집
    const symbolSignals = await this.collectSignals(marketEvents);

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
  private async collectSignals(marketEvents: MarketEventsResponse): Promise<SymbolSignalsMap> {
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

    // 3. Top Gainers (상위 30개로 확대 - 교집합 확률 증가)
    const topGainers = marketEvents.marketMovers.topGainers.slice(0, 30);
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

    // 6. Most Active (상위 30개로 확대 - 교집합 확률 증가)
    const mostActive = marketEvents.marketMovers.mostActive.slice(0, 30);
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

    // 7. Insider Trading (내부자 매수/매도)
    // 같은 사람이 같은 종목을 여러 번 거래한 경우 중복 제거 (가장 큰 거래량만 선택)
    // 매수와 매도를 별도로 처리
    const insiderBuyingMap = new Map<string, typeof marketEvents.insiderTrading[0]>();
    const insiderSellingMap = new Map<string, typeof marketEvents.insiderTrading[0]>();

    marketEvents.insiderTrading.forEach((insider) => {
      const key = `${insider.reportingName}-${insider.symbol}`;

      if (insider.acquistionOrDisposition === 'A') {
        // 매수 (Acquisition)
        const existing = insiderBuyingMap.get(key);
        if (!existing || insider.securitiesTransacted > existing.securitiesTransacted) {
          insiderBuyingMap.set(key, insider);
        }
      } else if (insider.acquistionOrDisposition === 'D') {
        // 매도 (Disposition)
        const existing = insiderSellingMap.get(key);
        if (!existing || insider.securitiesTransacted > existing.securitiesTransacted) {
          insiderSellingMap.set(key, insider);
        }
      }
    });

    // 7a. Insider Buying (매수)
    insiderBuyingMap.forEach((insider) => {
      const sharesBought = insider.securitiesTransacted.toLocaleString();
      const totalValue = (insider.securitiesTransacted * insider.price).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      });

      // Dynamic scoring based on transaction size, owner role, and conviction
      const dynamicScore = calculateInsiderBuyingScore({
        securitiesTransacted: insider.securitiesTransacted,
        pricePerShare: insider.price,
        typeOfOwner: insider.typeOfOwner,
        securitiesOwned: insider.securitiesOwned,
        transactionDate: insider.transactionDate,
      });

      addSignal(insider.symbol, {
        type: 'insider_buying',
        score: dynamicScore,
        source: 'FMP',
        description: `${insider.reportingName} bought ${sharesBought} shares (${totalValue})`,
        date: insider.transactionDate,
        metadata: {
          reportingName: insider.reportingName,
          typeOfOwner: insider.typeOfOwner,
          securitiesTransacted: insider.securitiesTransacted,
          price: insider.price,
          securitiesOwned: insider.securitiesOwned,
          link: insider.link,
        },
      });
    });

    // 7b. Insider Selling (매도) - 부정적 신호
    insiderSellingMap.forEach((insider) => {
      const sharesSold = insider.securitiesTransacted.toLocaleString();
      const totalValue = (insider.securitiesTransacted * insider.price).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      });

      // Use same scoring algorithm but make it negative
      const buyingScore = calculateInsiderBuyingScore({
        securitiesTransacted: insider.securitiesTransacted,
        pricePerShare: insider.price,
        typeOfOwner: insider.typeOfOwner,
        securitiesOwned: insider.securitiesOwned,
        transactionDate: insider.transactionDate,
      });
      const sellingScore = -buyingScore; // 매도는 음수

      addSignal(insider.symbol, {
        type: 'insider_selling',
        score: sellingScore,
        source: 'FMP',
        description: `${insider.reportingName} sold ${sharesSold} shares (${totalValue})`,
        date: insider.transactionDate,
        metadata: {
          reportingName: insider.reportingName,
          typeOfOwner: insider.typeOfOwner,
          securitiesTransacted: insider.securitiesTransacted,
          price: insider.price,
          securitiesOwned: insider.securitiesOwned,
          link: insider.link,
        },
      });
    });

    // 8. Momentum Stocks (복합 모멘텀 시그널)
    // 거래량 급증 + 가격 상승 + 강한 RSI 조건 충족 종목
    try {
      const momentumStocks = await momentumScreenerService.getMomentumStocks();

      momentumStocks.forEach((symbol) => {
        addSignal(symbol, {
          type: 'momentum',
          score: SIGNAL_SCORES.momentum,
          source: 'Hybrid (AV + FMP)',
          description: 'High momentum: Volume spike + Price surge + Strong fundamentals',
          date: new Date().toISOString(),
          metadata: {
            criteria: 'Volume > 200% avg, Price change > 3%, MarketCap > $1B, RSI < 80',
          },
        });
      });

      if (momentumStocks.length > 0) {
        console.log(`[InvestmentOpportunity] Added ${momentumStocks.length} momentum signals`);
      }
    } catch (error) {
      console.error('[InvestmentOpportunity] Failed to get momentum stocks:', error);
      // Continue without momentum signals
    }

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
      // 총 점수 계산 (시간 감쇠 + 중복 감점 + 다양성 보너스 적용)
      const totalScore = this.calculateTotalScore(signals);

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
   * 총 점수 계산 (중복 시그널 감점 + 시간 감쇠 + 다양성 보너스)
   *
   * 개선 사항:
   * 1. 중복 시그널 감점: 같은 타입 2번째 50%, 3번째 25%
   * 2. 다양성 보너스: 2개 타입 +3점, 3개+ 타입 +5점
   */
  private calculateTotalScore(signals: Signal[]): number {
    // 1. 시그널 타입별로 그룹화
    const signalsByType = new Map<SignalType, Signal[]>();
    signals.forEach(signal => {
      if (!signalsByType.has(signal.type)) {
        signalsByType.set(signal.type, []);
      }
      signalsByType.get(signal.type)!.push(signal);
    });

    // 2. 각 타입별로 점수 계산 (중복 감점 + 시간 감쇠 적용)
    let baseScore = 0;
    signalsByType.forEach((typeSignals, signalType) => {
      // 시그널을 점수 기준 내림차순 정렬 (큰 것부터 처리)
      const sortedSignals = [...typeSignals].sort((a, b) => b.score - a.score);

      sortedSignals.forEach((signal, index) => {
        // 시간 감쇠 적용
        const decayFactor = this.getDecayFactor(signal);
        const decayedScore = signal.score * decayFactor;

        // 중복 감점 적용
        let duplicatePenalty = 1.0;
        if (index === 1) {
          duplicatePenalty = 0.5;  // 2번째: 50%
        } else if (index === 2) {
          duplicatePenalty = 0.25; // 3번째: 25%
        } else if (index >= 3) {
          duplicatePenalty = 0.1;  // 4번째 이상: 10%
        }

        baseScore += decayedScore * duplicatePenalty;
      });
    });

    // 3. 시그널 다양성 보너스
    const uniqueSignalTypes = signalsByType.size;
    let diversityBonus = 0;
    if (uniqueSignalTypes >= 3) {
      diversityBonus = 5;  // 3개 이상 타입: +5점
    } else if (uniqueSignalTypes === 2) {
      diversityBonus = 3;  // 2개 타입: +3점
    }
    // 1개 타입: +0점 (보너스 없음)

    return baseScore + diversityBonus;
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
   * 시그널의 시간 감쇠 계수 계산
   * Exponential decay: e^(-ln(2) * t / t_half)
   */
  private getDecayFactor(signal: Signal): number {
    try {
      const signalDate = new Date(signal.date);
      const now = new Date();
      const daysSince = Math.max(0, (now.getTime() - signalDate.getTime()) / (1000 * 60 * 60 * 24));
      const halfLife = SIGNAL_HALF_LIFE_DAYS[signal.type];

      // Exponential decay function
      const decayFactor = Math.exp(-0.693 * daysSince / halfLife);

      return decayFactor;
    } catch (error) {
      // 날짜 파싱 실패 시 최대 감쇠 적용
      return 0.5;
    }
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
   * AI 요약 생성 (Enhanced with sophisticated analysis)
   *
   * @param opportunity - 투자 기회 객체
   * @returns AI 생성 투자 논리 요약 (3-4문장, 기회+리스크)
   */
  async generateAISummary(
    opportunity: InvestmentOpportunity
  ): Promise<string> {
    try {
      return await generateInvestmentAnalysis(opportunity);
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
