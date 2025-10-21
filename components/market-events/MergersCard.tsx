/**
 * MergersCard Component
 * Displays M&A announcements and deals
 */

import React from 'react';
import CategoryCard from './CategoryCard';
import StockSymbolBadge from './StockSymbolBadge';
import { MergerAcquisition } from '@/lib/types/marketEvents';

interface MergersCardProps {
  mergers: MergerAcquisition[];
}

export default function MergersCard({ mergers }: MergersCardProps) {
  return (
    <CategoryCard
      title="인수합병"
      icon="🤝"
      gradientFrom="from-blue-600"
      gradientTo="to-indigo-600"
      isEmpty={mergers.length === 0}
    >
      <div className="space-y-3">
        {mergers.slice(0, 5).map((merger, index) => (
          <div
            key={`${merger.symbol}-${merger.publishedDate}-${index}`}
            className="p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <StockSymbolBadge symbol={merger.symbol} size="sm" />
                {merger.dealType && (
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700">
                    {merger.dealType}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {new Date(merger.publishedDate).toLocaleDateString()}
              </p>
            </div>
            <p className="font-medium text-gray-900 text-sm mb-1">
              {merger.title}
            </p>
            {merger.dealValue && (
              <p className="text-sm font-bold text-blue-600">
                {merger.dealValue}
              </p>
            )}
            {merger.url && (
              <a
                href={merger.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline mt-1 inline-block"
              >
                Read more →
              </a>
            )}
          </div>
        ))}
        {mergers.length > 5 && (
          <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2">
            View all {mergers.length} deals →
          </button>
        )}
      </div>
    </CategoryCard>
  );
}
