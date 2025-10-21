/**
 * Investment Opportunity Types
 *
 * 여러 시장 이벤트 시그널을 종합하여 투자 기회를 분석하기 위한 타입 정의
 */

/**
 * 시그널 타입
 * 각 시그널은 특정 점수를 가지며, 여러 시그널의 조합으로 투자 기회를 평가
 */
export type SignalType =
  | 'analyst_upgrade'    // 애널리스트 Buy 추천 (+3점)
  | 'merger_acquisition' // M&A 관련 (+2점)
  | 'top_gainer'         // 급등주 (+2점)
  | 'stock_split'        // 주식 분할 (+1점)
  | 'earnings_upcoming'  // 실적 발표 임박 (+1점)
  | 'high_volume';       // 거래량 급증 (+1점)

/**
 * 개별 시그널 정보
 */
export interface Signal {
  /** 시그널 타입 */
  type: SignalType;

  /** 시그널 점수 */
  score: number;

  /** 시그널 출처 (예: Goldman Sachs, FMP, Alpha Vantage) */
  source: string;

  /** 시그널 설명 */
  description: string;

  /** 시그널 발생 날짜 (ISO 8601 형식) */
  date: string;

  /** 추가 메타데이터 (선택적) */
  metadata?: Record<string, any>;
}

/**
 * 투자 기회
 */
export interface InvestmentOpportunity {
  /** 종목 심볼 */
  symbol: string;

  /** 회사명 */
  companyName?: string;

  /** 총 점수 (모든 시그널의 합) */
  totalScore: number;

  /** 개별 시그널 목록 */
  signals: Signal[];

  /** AI 생성 투자 논리 요약 */
  aiSummary?: string;

  /** 현재 주가 */
  price?: number;

  /** 가격 변동률 (%) */
  changePercent?: number;

  /** 거래량 */
  volume?: number;

  /** 순위 (점수 기준) */
  rank: number;
}

/**
 * API 응답 타입
 */
export interface InvestmentOpportunityResponse {
  /** 투자 기회 목록 */
  opportunities: InvestmentOpportunity[];

  /** 메타데이터 */
  metadata: {
    /** 총 기회 수 */
    totalOpportunities: number;

    /** 데이터 생성 시각 */
    timestamp: string;

    /** 캐시 사용 여부 */
    cached: boolean;

    /** 사용된 데이터 소스 */
    dataSources?: string[];
  };
}

/**
 * 스코어링 설정
 */
export const SIGNAL_SCORES: Record<SignalType, number> = {
  analyst_upgrade: 3,
  merger_acquisition: 2,
  top_gainer: 2,
  stock_split: 1,
  earnings_upcoming: 1,
  high_volume: 1,
};

/**
 * 시그널 타입별 설명
 */
export const SIGNAL_DESCRIPTIONS: Record<SignalType, string> = {
  analyst_upgrade: 'Analyst Buy/Upgrade Recommendation',
  merger_acquisition: 'Merger & Acquisition Activity',
  top_gainer: 'Top Market Gainer',
  stock_split: 'Upcoming Stock Split',
  earnings_upcoming: 'Upcoming Earnings with Positive Outlook',
  high_volume: 'Most Active Trading Volume',
};
