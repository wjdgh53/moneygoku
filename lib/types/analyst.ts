/**
 * Analyst Rating Types
 * Data structure for FMP Analyst Ratings API integration
 */

export type SignalType = 'BUY' | 'SELL' | 'HOLD';

export interface AnalystLatestChange {
  gradingCompany: string;
  previousGrade: string;
  newGrade: string;
  publishedDate: string;
  signal: SignalType;
}

export interface AnalystChangeItem {
  company: string;
  from: string;
  to: string;
  date: string;
}

export interface AnalystRating {
  latestChange: AnalystLatestChange | null;
  consensus: SignalType;
  totalChanges: number;
  changes: AnalystChangeItem[];
  fetchedAt: string;
}

/**
 * Parse analyst rating JSON string from database
 */
export function parseAnalystRating(ratingJson: string | null): AnalystRating | null {
  if (!ratingJson) return null;

  try {
    return JSON.parse(ratingJson) as AnalystRating;
  } catch (error) {
    console.error('Failed to parse analyst rating:', error);
    return null;
  }
}

/**
 * Format date to relative time (e.g., "3일 전")
 */
export function formatDaysAgo(dateString: string): string {
  const days = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  return `${days}일 전`;
}

/**
 * Format date to localized string
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
