/**
 * MarketMoversCard Component
 * Displays top gainers, losers, and most active stocks
 */

import React, { useState } from 'react';
import CategoryCard from './CategoryCard';
import StockSymbolBadge from './StockSymbolBadge';
import { MarketMovers, MarketMover } from '@/lib/types/marketEvents';

interface MarketMoversCardProps {
  movers: MarketMovers;
}

type TabType = 'gainers' | 'losers' | 'active';

export default function MarketMoversCard({ movers }: MarketMoversCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('gainers');

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000_000) {
      return `${(volume / 1_000_000_000).toFixed(2)}B`;
    } else if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(2)}M`;
    } else if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toString();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const renderMoverItem = (mover: MarketMover, index: number) => {
    const isPositive = mover.changePercent > 0;

    return (
      <div
        key={`${mover.symbol}-${index}`}
        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
      >
        <div className="flex items-center space-x-3 flex-1">
          <span className="text-gray-400 font-semibold text-sm w-6">
            {index + 1}
          </span>
          <StockSymbolBadge symbol={mover.symbol} size="sm" />
          <div className="flex-1">
            <p className="text-xs text-gray-600">{formatPrice(mover.price)}</p>
          </div>
        </div>

        <div className="text-right ml-4">
          <p
            className={`text-sm font-bold ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? '+' : ''}
            {mover.changePercent.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500">
            Vol: {formatVolume(mover.volume)}
          </p>
        </div>
      </div>
    );
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'gainers':
        return movers.topGainers;
      case 'losers':
        return movers.topLosers;
      case 'active':
        return movers.mostActive;
      default:
        return [];
    }
  };

  const currentData = getCurrentData();
  const isEmpty =
    movers.topGainers.length === 0 &&
    movers.topLosers.length === 0 &&
    movers.mostActive.length === 0;

  return (
    <CategoryCard
      title="시장 동향"
      icon="🔥"
      gradientFrom="from-yellow-600"
      gradientTo="to-orange-600"
      isEmpty={isEmpty}
    >
      {/* Error Display */}
      {movers.error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700">{movers.error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('gainers')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'gainers'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Top Gainers
          {movers.topGainers.length > 0 && (
            <span className="ml-1 text-xs">({movers.topGainers.length})</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('losers')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'losers'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Top Losers
          {movers.topLosers.length > 0 && (
            <span className="ml-1 text-xs">({movers.topLosers.length})</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Most Active
          {movers.mostActive.length > 0 && (
            <span className="ml-1 text-xs">({movers.mostActive.length})</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {currentData.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No data available</p>
          </div>
        ) : (
          currentData.slice(0, 5).map((mover, index) => renderMoverItem(mover, index))
        )}
      </div>
    </CategoryCard>
  );
}
