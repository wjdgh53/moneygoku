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
  | 'momentum'           // 모멘텀 종목 (+10점) - 거래량+가격+RSI 복합 신호
  | 'insider_buying'     // 내부자 매수 (+5점) - 가장 강력한 신호
  | 'insider_selling'    // 내부자 매도 (-5점) - 부정적 신호
  | 'analyst_upgrade'    // 애널리스트 Buy 추천 (+3점)
  | 'merger_acquisition' // M&A 관련 (+2점)
  | 'top_gainer'         // 급등주 (+2점)
  | 'stock_split'        // 주식 분할 (0점 - 제거 고려)
  | 'earnings_upcoming'  // 실적 발표 임박 (+1점)
  | 'high_volume';       // 거래량 급증 (+0.5점)

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
 * 스코어링 설정 (퀀트 분석 기반 조정)
 * - insider_buying: 5 (신규 추가 - 가장 강력한 예측 시그널)
 * - high_volume: 1 → 0.5 (방향성 없음, 단독 의미 약함)
 * - stock_split: 1 → 0 (정보 가치 없음, cosmetic event)
 */
export const SIGNAL_SCORES: Record<SignalType, number> = {
  momentum: 11,             // 복합 모멘텀 시그널 (거래량+가격+RSI) - 상향 조정
  insider_buying: 5,        // 동적 스코어링으로 대체 (0.9-12.0) - 이 값은 사용 안 됨
  insider_selling: -5,      // 내부자 매도 - 부정적 신호 (동적 스코어링: -0.9~-12.0)
  analyst_upgrade: 9,       // 애널리스트 추천 - 상향 조정 (균형 개선)
  merger_acquisition: 2,    // M&A 활동 - 중간 신호
  top_gainer: 2,            // 단기 모멘텀
  stock_split: 0,           // 정보 가치 낮음
  earnings_upcoming: 1,     // 실적 발표 임박
  high_volume: 0.5,         // 방향성 없음, 단독 의미 약함
};

/**
 * 시그널 타입별 설명
 */
export const SIGNAL_DESCRIPTIONS: Record<SignalType, string> = {
  momentum: 'High Momentum Stock',
  insider_buying: 'Insider Buying Activity',
  insider_selling: 'Insider Selling Activity',
  analyst_upgrade: 'Analyst Buy/Upgrade Recommendation',
  merger_acquisition: 'Merger & Acquisition Activity',
  top_gainer: 'Top Market Gainer',
  stock_split: 'Upcoming Stock Split',
  earnings_upcoming: 'Upcoming Earnings with Positive Outlook',
  high_volume: 'Most Active Trading Volume',
};
