/**
 * SenateTradesCard Component
 * Displays political insider trading data
 */

import React from 'react';
import CategoryCard from './CategoryCard';
import StockSymbolBadge from './StockSymbolBadge';
import { SenateTrade } from '@/lib/types/marketEvents';

interface SenateTradesCardProps {
  trades: SenateTrade[];
}

export default function SenateTradesCard({ trades }: SenateTradesCardProps) {
  return (
    <CategoryCard
      title="Senate Trading"
      icon="🏛️"
      gradientFrom="from-purple-600"
      gradientTo="to-pink-600"
      isEmpty={trades.length === 0}
    >
      <div className="space-y-3">
        {trades.slice(0, 5).map((trade, index) => {
          const tradeType = trade.transactionType.toUpperCase();
          const isPurchase = trade.transactionType === 'purchase';

          return (
            <div
              key={`${trade.symbol}-${trade.transactionDate}-${index}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
            >
              <div className="flex items-center space-x-3 flex-1">
                <StockSymbolBadge
                  symbol={trade.symbol}
                  variant={isPurchase ? 'success' : 'danger'}
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">
                    {trade.firstName} {trade.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {trade.party && `${trade.party} • `}
                    {trade.amount}
                  </p>
                </div>
              </div>
              <div className="text-right ml-4">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    isPurchase
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {tradeType}
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(trade.transactionDate).toLocaleDateString()}
                </p>
              </div>
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
