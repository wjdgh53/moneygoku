/**
 * FMP News API Types
 *
 * Financial Modeling Prep provides 5 news data sources:
 * 1. Stock News - General news articles about stocks
 * 2. Press Releases - Official company announcements
 * 3. Social Sentiment - Social media sentiment analysis
 * 4. SEC Filings - Official SEC filing documents
 * 5. Insider Trading - Insider trading transactions
 */

/**
 * Stock News Article
 */
export interface FMPStockNews {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

/**
 * Press Release
 */
export interface FMPPressRelease {
  symbol: string;
  date: string;
  title: string;
  text: string;
}

/**
 * Social Sentiment Data
 */
export interface FMPSocialSentiment {
  date: string;
  symbol: string;
  stocktwitsPosts: number;
  twitterPosts: number;
  stocktwitsComments: number;
  twitterComments: number;
  stocktwitsLikes: number;
  twitterLikes: number;
  stocktwitsImpressions: number;
  twitterImpressions: number;
  stocktwitsSentiment: number; // -1 to 1
  twitterSentiment: number; // -1 to 1
}

/**
 * SEC Filing Document
 */
export interface FMPSecFiling {
  symbol: string;
  fillingDate: string;
  acceptedDate: string;
  type: string; // 8-K, 10-K, 10-Q, etc.
  link: string;
  finalLink: string;
}

/**
 * Insider Trading Transaction
 */
export interface FMPInsiderTrade {
  symbol: string;
  transactionDate: string;
  filingDate: string;
  transactionType: string; // e.g., "S-Sale", "P-Purchase"
  securitiesOwned: number;
  securitiesTransacted: number; // Number of shares bought/sold
  price: number;
  acquistionOrDisposition: string; // "A" or "D"
  reportingName: string;
  typeOfOwner: string; // e.g., "Officer", "Director"
}

/**
 * Combined FMP News Data
 */
export interface FMPNewsData {
  stockNews: FMPStockNews[];
  pressReleases: FMPPressRelease[];
  socialSentiment: FMPSocialSentiment[];
  secFilings: FMPSecFiling[];
  insiderTrades: FMPInsiderTrade[];
  fetchedAt: string;
}

/**
 * Options for fetching FMP news
 */
export interface FMPNewsOptions {
  newsLimit?: number; // Limit for stock news (default: 5)
  pressReleaseLimit?: number; // Limit for press releases (default: 5)
  includeSocialSentiment?: boolean; // Include social sentiment (default: true)
  socialSentimentPage?: number; // Page for social sentiment (default: 0)
  secFilingsLimit?: number; // Limit for SEC filings (default: 5)
  secFilingsType?: string; // Filing type filter (default: all types)
  insiderTradesLimit?: number; // Limit for insider trades (default: 5)
}
