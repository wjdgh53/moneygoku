/**
 * Market Events Type Definitions
 *
 * Types for FMP and Alpha Vantage market event APIs:
 * - Senate Trading (Politician trades)
 * - M&A Feed (Mergers & Acquisitions)
 * - Analyst Rating Changes (Upgrades/Downgrades)
 * - Earnings Calendar
 * - Stock Splits Calendar
 * - Market Movers (Top Gainers/Losers/Most Active)
 */

// ========================================
// 1. Senate Trading (정치인 거래)
// ========================================

export interface SenateTrade {
  /** Senator's first name */
  firstName: string;

  /** Senator's last name */
  lastName: string;

  /** Stock symbol */
  symbol: string;

  /** Transaction type */
  transactionType: 'purchase' | 'sale' | 'exchange';

  /** Transaction amount range (e.g., "$15,001 - $50,000") */
  amount: string;

  /** Transaction date (ISO format) */
  transactionDate: string;

  /** Date when transaction was disclosed */
  disclosureDate: string;

  /** Asset type (e.g., "Stock", "Bond") */
  assetType?: string;

  /** Comment or description */
  comment?: string;

  /** Political party */
  party?: string;
}

// ========================================
// 2. M&A Feed (인수합병)
// ========================================

export interface MergerAcquisition {
  /** Title of the M&A announcement */
  title: string;

  /** Symbol of the company involved */
  symbol: string;

  /** Publication date (ISO format) */
  publishedDate: string;

  /** URL to the news article */
  url: string;

  /** Deal value (if available) */
  dealValue?: string;

  /** Type of deal (e.g., "Merger", "Acquisition") */
  dealType?: string;
}

// ========================================
// 3. Analyst Rating Changes (애널리스트 레이팅)
// ========================================

export interface AnalystRating {
  /** Stock symbol */
  symbol: string;

  /** Company that issued the rating */
  gradingCompany: string;

  /** Previous rating */
  previousGrade: string;

  /** New rating */
  newGrade: string;

  /** Publication date (ISO format) */
  publishedDate: string;

  /** News URL */
  newsURL?: string;

  /** News title */
  newsTitle?: string;

  /** Signal interpretation */
  signal: 'BUY' | 'SELL' | 'HOLD';
}

// ========================================
// 4. Earnings Calendar (실적 발표)
// ========================================

export interface UpcomingEarnings {
  /** Stock symbol */
  symbol: string;

  /** Company name */
  name?: string;

  /** Earnings date (ISO format) */
  date: string;

  /** Estimated EPS */
  epsEstimated: number | null;

  /** Actual EPS (null if not yet reported) */
  eps: number | null;

  /** Estimated revenue */
  revenueEstimated: number | null;

  /** Actual revenue (null if not yet reported) */
  revenue: number | null;

  /** Time of announcement (e.g., "bmo" = before market open, "amc" = after market close) */
  time?: string;

  /** Fiscal date ending */
  fiscalDateEnding?: string;
}

// ========================================
// 5. Stock Split Calendar (주식 분할)
// ========================================

export interface StockSplit {
  /** Stock symbol */
  symbol: string;

  /** Split date (ISO format) */
  date: string;

  /** Split ratio (e.g., "2-for-1", "3-for-2") */
  numerator: number;
  denominator: number;

  /** Company name */
  label?: string;
}

// ========================================
// 6. Market Movers (시장 변동)
// ========================================

export interface MarketMover {
  /** Stock symbol */
  symbol: string;

  /** Current price */
  price: number;

  /** Change amount */
  changeAmount: number;

  /** Change percentage */
  changePercent: number;

  /** Trading volume */
  volume: number;
}

export interface MarketMovers {
  topGainers: MarketMover[];
  topLosers: MarketMover[];
  mostActive: MarketMover[];
  error?: string; // Error message if API fails
}

// ========================================
// API Response Types
// ========================================

/** Consolidated market events response */
export interface MarketEventsResponse {
  senateTrading: SenateTrade[];
  mergersAcquisitions: MergerAcquisition[];
  analystRatings: AnalystRating[];
  upcomingEarnings: UpcomingEarnings[];
  stockSplits: StockSplit[];
  marketMovers: MarketMovers;
  metadata: {
    fetchedAt: string;
    categories: number;
    cacheStatus: {
      senateTrading: boolean;
      mergersAcquisitions: boolean;
      ratingChanges: boolean;
      earnings: boolean;
      stockSplits: boolean;
      marketMovers: boolean;
    };
  };
}

/** Options for fetching market events */
export interface MarketEventsOptions {
  /** Limit number of results per category */
  limit?: number;

  /** Start date for calendar-based APIs (ISO format) */
  from?: string;

  /** End date for calendar-based APIs (ISO format) */
  to?: string;

  /** Force refresh cache */
  forceRefresh?: boolean;
}

// ========================================
// Raw API Response Types (FMP)
// ========================================

/** FMP Senate Trading API response */
export interface FMPSenateTradingResponse {
  firstName: string;
  lastName: string;
  office: string;
  link: string;
  dateRecieved: string;
  transactionDate: string;
  owner: string;
  assetDescription: string;
  assetType: string;
  type: string;
  amount: string;
  comment: string;
  symbol: string;
  party?: string;
}

/** FMP M&A RSS Feed response */
export interface FMPMergersAcquisitionsResponse {
  companyName: string;
  cik: string;
  symbol: string;
  targetedCompanyName: string;
  targetedCik: string;
  targetedSymbol: string;
  transactionDate: string;
  acceptanceTime: string;
  url: string;
}

/** FMP Upgrades/Downgrades response */
export interface FMPRatingResponse {
  symbol: string;
  publishedDate: string;
  newsURL: string;
  newsTitle: string;
  newsBaseURL: string;
  newsPublisher: string;
  newGrade: string;
  previousGrade: string;
  gradingCompany: string;
}

/** FMP Earnings Calendar response */
export interface FMPEarningsCalendarResponse {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string;
  revenue: number | null;
  revenueEstimated: number | null;
  fiscalDateEnding: string;
}

/** FMP Stock Split Calendar response */
export interface FMPStockSplitResponse {
  date: string;
  label: string;
  symbol: string;
  numerator: number;
  denominator: number;
}

// ========================================
// Error Types
// ========================================

export class MarketEventsAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketEventsAPIError';
  }
}

export class MarketEventsRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketEventsRateLimitError';
  }
}

export interface MarketEventsError {
  message: string;
  code?: string;
}
