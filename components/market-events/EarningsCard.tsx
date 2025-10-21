/**
 * EarningsCard Component
 * Displays upcoming earnings announcements
 */

import React from 'react';
import CategoryCard from './CategoryCard';
import StockSymbolBadge from './StockSymbolBadge';
import { UpcomingEarnings } from '@/lib/types/marketEvents';

interface EarningsCardProps {
  earnings: UpcomingEarnings[];
}

export default function EarningsCard({ earnings }: EarningsCardProps) {
  const formatTime = (time?: string) => {
    if (!time) return 'TBD';
    switch (time.toLowerCase()) {
      case 'bmo':
        return 'Before Market Open';
      case 'amc':
        return 'After Market Close';
      default:
        return time.toUpperCase();
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <CategoryCard
      title="실적 발표 예정"
      icon="📅"
      gradientFrom="from-orange-600"
      gradientTo="to-red-600"
      isEmpty={earnings.length === 0}
    >
      <div className="space-y-3">
        {earnings.slice(0, 5).map((earning, index) => (
          <div
            key={`${earning.symbol}-${earning.date}-${index}`}
            className="p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <StockSymbolBadge symbol={earning.symbol} size="sm" />
                {earning.name && (
                  <span className="text-xs text-gray-600 truncate max-w-[150px]">
                    {earning.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {new Date(earning.date).toLocaleDateString()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-500">EPS Est.</p>
                <p className="font-semibold text-gray-900">
                  {earning.epsEstimated !== null ? `$${earning.epsEstimated.toFixed(2)}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Revenue Est.</p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(earning.revenueEstimated)}
                </p>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Time:</span> {formatTime(earning.time)}
              </p>
              {earning.fiscalDateEnding && (
                <p className="text-xs text-gray-600 mt-0.5">
                  <span className="font-medium">Fiscal Period:</span> {earning.fiscalDateEnding}
                </p>
              )}
            </div>
          </div>
        ))}
        {earnings.length > 5 && (
          <button className="w-full text-center text-sm text-orange-600 hover:text-orange-700 font-medium py-2">
            View all {earnings.length} earnings →
          </button>
        )}
      </div>
    </CategoryCard>
  );
}
