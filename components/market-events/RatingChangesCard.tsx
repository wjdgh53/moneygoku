/**
 * RatingChangesCard Component
 * Displays analyst rating changes (upgrades/downgrades)
 */

import React from 'react';
import CategoryCard from './CategoryCard';
import StockSymbolBadge from './StockSymbolBadge';
import { AnalystRating } from '@/lib/types/marketEvents';

interface RatingChangesCardProps {
  ratings: AnalystRating[];
}

export default function RatingChangesCard({ ratings }: RatingChangesCardProps) {
  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return 'bg-green-100 text-green-700';
      case 'SELL':
        return 'bg-red-100 text-red-700';
      case 'HOLD':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRatingIcon = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return '📈';
      case 'SELL':
        return '📉';
      case 'HOLD':
        return '➡️';
      default:
        return '—';
    }
  };

  return (
    <CategoryCard
      title="애널리스트 평가"
      icon="📈"
      gradientFrom="from-green-600"
      gradientTo="to-emerald-600"
      isEmpty={ratings.length === 0}
    >
      <div className="space-y-3">
        {ratings.slice(0, 5).map((rating, index) => (
          <div
            key={`${rating.symbol}-${rating.publishedDate}-${index}`}
            className="p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <StockSymbolBadge symbol={rating.symbol} size="sm" />
                <span className={`text-xs font-semibold px-2 py-1 rounded ${getSignalColor(rating.signal)}`}>
                  {getRatingIcon(rating.signal)} {rating.signal}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {new Date(rating.publishedDate).toLocaleDateString()}
              </p>
            </div>

            <p className="font-medium text-gray-900 text-sm mb-1">
              {rating.gradingCompany}
            </p>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-500 line-through">
                {rating.previousGrade}
              </span>
              <span className="text-gray-400">→</span>
              <span className="font-semibold text-gray-900">
                {rating.newGrade}
              </span>
            </div>

            {rating.newsTitle && (
              <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                {rating.newsTitle}
              </p>
            )}
          </div>
        ))}
        {ratings.length > 5 && (
          <button className="w-full text-center text-sm text-green-600 hover:text-green-700 font-medium py-2">
            View all {ratings.length} ratings →
          </button>
        )}
      </div>
    </CategoryCard>
  );
}
