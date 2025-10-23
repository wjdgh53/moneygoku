/**
 * InvestmentOpportunityCard Component
 * Displays a single investment opportunity with ranking, signals, and AI summary
 */

'use client';

import React from 'react';
import { InvestmentOpportunity } from '@/lib/types/investmentOpportunity';
import SignalBadge from './SignalBadge';

interface InvestmentOpportunityCardProps {
  opportunity: InvestmentOpportunity;
}

// Rank badge styling based on position
const getRankBadgeStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        gradient: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
        icon: '🥇',
        label: '1st',
      };
    case 2:
      return {
        gradient: 'bg-gradient-to-r from-gray-300 to-gray-500',
        icon: '🥈',
        label: '2nd',
      };
    case 3:
      return {
        gradient: 'bg-gradient-to-r from-orange-400 to-orange-600',
        icon: '🥉',
        label: '3rd',
      };
    default:
      return {
        gradient: 'bg-gradient-to-r from-blue-400 to-blue-600',
        icon: '📌',
        label: `${rank}th`,
      };
  }
};

export default function InvestmentOpportunityCard({
  opportunity,
}: InvestmentOpportunityCardProps) {
  const rankStyle = getRankBadgeStyle(opportunity.rank);

  // Format price
  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  // Format change percent
  const formatChangePercent = (change?: number) => {
    if (change === undefined || change === null) return null;
    const isPositive = change >= 0;
    return (
      <span
        className={`inline-flex items-center font-semibold ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
      </span>
    );
  };

  return (
    <div
      className="bg-white rounded-xl shadow-md overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-gray-100"
      role="article"
      aria-label={`Investment opportunity for ${opportunity.symbol}`}
    >
      {/* Rank Badge */}
      <div className="relative">
        <div className={`${rankStyle.gradient} px-6 py-3 flex items-center justify-between`}>
          <div className="flex items-center space-x-2 text-white">
            <span className="text-2xl">{rankStyle.icon}</span>
            <span className="font-bold text-lg">{rankStyle.label} Place</span>
          </div>
          <div className="text-white text-sm font-medium">
            Score: {opportunity.totalScore.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Symbol and Company Name */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-gray-900">{opportunity.symbol}</h3>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {formatPrice(opportunity.price)}
              </div>
              {opportunity.changePercent !== undefined && (
                <div className="text-sm">{formatChangePercent(opportunity.changePercent)}</div>
              )}
            </div>
          </div>
          {opportunity.companyName && (
            <p className="text-sm text-gray-600">{opportunity.companyName}</p>
          )}
        </div>

        {/* Total Score Display */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-600 font-medium mb-1">Investment Score</div>
          <div className="text-5xl font-extrabold text-green-600">
            {opportunity.totalScore.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Based on {opportunity.signals.length} signal{opportunity.signals.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Signal Badges */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Active Signals</div>
          <div className="flex flex-wrap gap-2">
            {opportunity.signals.map((signal, index) => (
              <SignalBadge key={index} signal={signal} />
            ))}
          </div>
        </div>

        {/* Volume */}
        {opportunity.volume && (
          <div className="text-xs text-gray-500">
            Volume: {new Intl.NumberFormat('en-US').format(opportunity.volume)}
          </div>
        )}
      </div>
    </div>
  );
}
