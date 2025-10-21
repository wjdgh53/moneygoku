/**
 * StockSplitsCard Component
 * Displays upcoming stock split events
 */

import React from 'react';
import CategoryCard from './CategoryCard';
import StockSymbolBadge from './StockSymbolBadge';
import { StockSplit } from '@/lib/types/marketEvents';

interface StockSplitsCardProps {
  splits: StockSplit[];
}

export default function StockSplitsCard({ splits }: StockSplitsCardProps) {
  const formatSplitRatio = (numerator: number, denominator: number) => {
    return `${numerator}:${denominator}`;
  };

  const getSplitType = (numerator: number, denominator: number) => {
    if (numerator > denominator) {
      return { type: 'Forward Split', color: 'text-green-600', icon: '⬆️' };
    } else {
      return { type: 'Reverse Split', color: 'text-red-600', icon: '⬇️' };
    }
  };

  return (
    <CategoryCard
      title="주식 분할"
      icon="🔀"
      gradientFrom="from-teal-600"
      gradientTo="to-cyan-600"
      isEmpty={splits.length === 0}
    >
      <div className="space-y-3">
        {splits.slice(0, 5).map((split, index) => {
          const splitInfo = getSplitType(split.numerator, split.denominator);

          return (
            <div
              key={`${split.symbol}-${split.date}-${index}`}
              className="p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <StockSymbolBadge symbol={split.symbol} size="sm" />
                  {split.label && (
                    <span className="text-xs text-gray-600 truncate max-w-[150px]">
                      {split.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(split.date).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatSplitRatio(split.numerator, split.denominator)}
                  </p>
                  <p className={`text-xs font-medium ${splitInfo.color} flex items-center gap-1 mt-1`}>
                    {splitInfo.icon} {splitInfo.type}
                  </p>
                </div>

                <div className="text-right">
                  <div className="bg-teal-50 px-3 py-2 rounded-lg">
                    <p className="text-xs text-gray-500 mb-0.5">Split Date</p>
                    <p className="text-sm font-semibold text-teal-700">
                      {new Date(split.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {splits.length > 5 && (
          <button className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-medium py-2">
            View all {splits.length} splits →
          </button>
        )}
      </div>
    </CategoryCard>
  );
}
