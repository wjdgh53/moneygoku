/**
 * AnalystRatingCard Component
 * Displays FMP Analyst Ratings for a bot's symbol
 */

import React from 'react';
import {
  AnalystRating,
  parseAnalystRating,
  formatDaysAgo,
  formatDateTime,
  type SignalType
} from '@/lib/types/analyst';

interface AnalystRatingCardProps {
  analystRatingJson: string | null;
}

/**
 * Signal Badge Component
 * Displays BUY/SELL/HOLD with appropriate colors
 */
function SignalBadge({ signal }: { signal: SignalType }) {
  const styles = {
    BUY: 'bg-green-100 text-green-800 border-green-300',
    SELL: 'bg-red-100 text-red-800 border-red-300',
    HOLD: 'bg-gray-100 text-gray-800 border-gray-300'
  };

  const icons = {
    BUY: '📈',
    SELL: '📉',
    HOLD: '➖'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${styles[signal]}`}>
      <span>{icons[signal]}</span>
      <span>{signal}</span>
    </span>
  );
}

/**
 * Rating Arrow Component
 * Shows grade change direction with arrow
 */
function RatingArrow({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">{from}</span>
      <span className="text-gray-400">→</span>
      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">{to}</span>
    </div>
  );
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          애널리스트 레이팅 정보 없음
        </h3>
        <p className="text-sm text-gray-500">
          이 종목에 대한 애널리스트 레이팅 정보가 제공되지 않습니다.
        </p>
      </div>
    </div>
  );
}

/**
 * Main AnalystRatingCard Component
 */
export default function AnalystRatingCard({ analystRatingJson }: AnalystRatingCardProps) {
  const rating = parseAnalystRating(analystRatingJson);

  if (!rating) {
    return <EmptyState />;
  }

  const { latestChange, consensus, totalChanges, changes, fetchedAt } = rating;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>📊</span>
          <span>애널리스트 레이팅</span>
        </h2>
        <SignalBadge signal={consensus} />
      </div>

      {/* Latest Change Section */}
      {latestChange && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="text-2xl mt-1">🏦</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">최신 변경</h3>
                <span className="text-xs text-gray-500">
                  {formatDaysAgo(latestChange.publishedDate)}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                {latestChange.gradingCompany}
              </p>
              <div className="flex items-center justify-between">
                <RatingArrow
                  from={latestChange.previousGrade}
                  to={latestChange.newGrade}
                />
                <SignalBadge signal={latestChange.signal} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consensus and Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">합의 신호</div>
          <div className="flex items-center gap-2">
            <SignalBadge signal={consensus} />
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">최근 30일 변경</div>
          <div className="text-2xl font-bold text-gray-900">
            {totalChanges}건
          </div>
        </div>
      </div>

      {/* Recent Changes List */}
      {changes.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            최근 변경 내역
          </h3>
          <div className="space-y-2">
            {changes.map((change, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm mb-1">
                    {change.company}
                  </div>
                  <RatingArrow from={change.from} to={change.to} />
                </div>
                <div className="text-xs text-gray-500 ml-4">
                  {formatDaysAgo(change.date)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer - Last Updated */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>⏰</span>
          <span>업데이트: {formatDateTime(fetchedAt)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Usage Example:
 *
 * ```tsx
 * import AnalystRatingCard from '@/components/bot/AnalystRatingCard';
 *
 * <AnalystRatingCard analystRatingJson={bot.analystRating} />
 * ```
 *
 * Accessibility:
 * - Signal badges use color + text + icon for clarity
 * - Hover states on interactive elements
 * - Semantic HTML structure
 * - Readable font sizes (minimum 12px)
 *
 * Performance:
 * - Memoized parsing with utility function
 * - No external API calls (uses cached data)
 * - Efficient re-renders with React
 * - Lazy loading compatible
 */
