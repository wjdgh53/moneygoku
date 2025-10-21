'use client';

import { ScreenedStock } from '@/lib/types/autoBotCreator';
import StockCard from './StockCard';

interface StockListProps {
  stocks: ScreenedStock[];
  onUpdateStock: (index: number, updatedStock: ScreenedStock) => void;
  onRemoveStock: (index: number) => void;
  onBulkEdit: (allocation: number) => void;
}

export default function StockList({
  stocks,
  onUpdateStock,
  onRemoveStock,
  onBulkEdit
}: StockListProps) {
  const totalInvestment = stocks.reduce((sum, stock) => sum + (stock.fundAllocation || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            {stocks.length} Stock{stocks.length !== 1 ? 's' : ''} Selected
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Review and customize your bot configurations
          </p>
        </div>

        {/* Bulk Edit Button */}
        <button
          onClick={() => {
            const amount = prompt('Enter fund allocation for all stocks:', '1000');
            if (amount && !isNaN(Number(amount))) {
              onBulkEdit(Number(amount));
            }
          }}
          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          <span>Bulk Edit Allocation</span>
        </button>
      </div>

      {/* Empty State */}
      {stocks.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No stocks selected</h3>
          <p className="text-gray-600">Go back and select stocks to create bots</p>
        </div>
      )}

      {/* Stock Cards Grid */}
      {stocks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stocks.map((stock, index) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              onUpdate={(updatedStock) => onUpdateStock(index, updatedStock)}
              onRemove={() => onRemoveStock(index)}
            />
          ))}
        </div>
      )}

      {/* Summary Bar */}
      {stocks.length > 0 && (
        <div className="sticky bottom-0 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between text-white">
            <div>
              <div className="text-sm font-medium opacity-90">Total Investment</div>
              <div className="text-3xl font-bold">${totalInvestment.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium opacity-90">Average per Bot</div>
              <div className="text-2xl font-bold">
                ${(totalInvestment / stocks.length).toLocaleString()}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
