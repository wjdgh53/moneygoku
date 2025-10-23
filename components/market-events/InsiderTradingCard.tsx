/**
 * InsiderTradingCard Component
 * Displays insider trading activities (buying transactions)
 */

import React from 'react';
import CategoryCard from './CategoryCard';
import StockSymbolBadge from './StockSymbolBadge';
import { InsiderTrading } from '@/lib/types/marketEvents';

interface InsiderTradingCardProps {
  trades: InsiderTrading[];
}

export default function InsiderTradingCard({ trades }: InsiderTradingCardProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const getOwnerTitle = (typeOfOwner: string) => {
    if (typeOfOwner.toLowerCase().includes('ceo')) return 'CEO';
    if (typeOfOwner.toLowerCase().includes('cfo')) return 'CFO';
    if (typeOfOwner.toLowerCase().includes('director')) return 'Director';
    if (typeOfOwner.toLowerCase().includes('officer')) return 'Officer';
    return typeOfOwner.split(':')[0] || typeOfOwner;
  };

  return (
    <CategoryCard
      title="내부자 거래"
      icon="💼"
      gradientFrom="from-purple-600"
      gradientTo="to-indigo-600"
      isEmpty={trades.length === 0}
    >
      <div className="space-y-3">
        {trades.slice(0, 5).map((trade, index) => {
          const totalValue = trade.securitiesTransacted * trade.price;
          const ownerTitle = getOwnerTitle(trade.typeOfOwner);

          return (
            <div
              key={`${trade.symbol}-${trade.transactionDate}-${index}`}
              className="p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <StockSymbolBadge symbol={trade.symbol} size="sm" />
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700">
                    💰 BUY
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(trade.transactionDate).toLocaleDateString()}
                </p>
              </div>

              <p className="font-medium text-gray-900 text-sm mb-1">
                {trade.reportingName}
              </p>
              <p className="text-xs text-gray-600 mb-2">{ownerTitle}</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Shares Bought</p>
                  <p className="font-semibold text-gray-900">
                    {formatNumber(trade.securitiesTransacted)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Value</p>
                  <p className="font-semibold text-purple-700">
                    {formatCurrency(totalValue)}
                  </p>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Price per share:</span> ${trade.price.toFixed(4)}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  <span className="font-medium">Owns:</span>{' '}
                  {formatNumber(trade.securitiesOwned)} shares
                </p>
              </div>

              {trade.link && (
                <a
                  href={trade.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-500 hover:underline mt-2 inline-block"
                >
                  View SEC Filing →
                </a>
              )}
            </div>
          );
        })}
        {trades.length > 5 && (
          <button className="w-full text-center text-sm text-purple-600 hover:text-purple-700 font-medium py-2">
            View all {trades.length} trades →
          </button>
        )}
      </div>
    </CategoryCard>
  );
}
