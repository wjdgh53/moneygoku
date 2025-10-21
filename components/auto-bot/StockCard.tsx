'use client';

import { useState } from 'react';
import { ScreenedStock } from '@/lib/types/autoBotCreator';

interface StockCardProps {
  stock: ScreenedStock;
  onUpdate: (updatedStock: ScreenedStock) => void;
  onRemove: () => void;
}

export default function StockCard({ stock, onUpdate, onRemove }: StockCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAllocation, setEditedAllocation] = useState(stock.fundAllocation || 1000);

  const handleSave = () => {
    onUpdate({ ...stock, fundAllocation: editedAllocation });
    setIsEditing(false);
  };

  const getChangeColor = () => {
    return stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeBg = () => {
    return stock.changePercent >= 0 ? 'bg-green-50' : 'bg-red-50';
  };

  const getRiskBadgeColor = () => {
    if (!stock.suggestedStrategy) return 'bg-gray-100 text-gray-700';
    switch (stock.suggestedStrategy.riskLevel) {
      case 'DEFENSIVE':
        return 'bg-blue-100 text-blue-700';
      case 'BALANCED':
        return 'bg-purple-100 text-purple-700';
      case 'AGGRESSIVE':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTimeHorizonIcon = () => {
    if (!stock.suggestedStrategy) return '📊';
    switch (stock.suggestedStrategy.timeHorizon) {
      case 'SHORT_TERM':
        return '⚡';
      case 'SWING':
        return '📊';
      case 'LONG_TERM':
        return '🎯';
      default:
        return '📊';
    }
  };

  // Determine strategy based on volatility if not provided
  const getAutoStrategy = () => {
    if (stock.suggestedStrategy) return stock.suggestedStrategy;

    // Auto-determine based on volatility
    if (stock.volatility > 50) {
      return {
        id: 'auto-aggressive',
        name: 'High Volatility - Aggressive',
        timeHorizon: 'SHORT_TERM' as const,
        riskLevel: 'AGGRESSIVE' as const
      };
    } else if (stock.volatility > 20) {
      return {
        id: 'auto-balanced',
        name: 'Medium Volatility - Balanced',
        timeHorizon: 'SWING' as const,
        riskLevel: 'BALANCED' as const
      };
    } else {
      return {
        id: 'auto-defensive',
        name: 'Low Volatility - Conservative',
        timeHorizon: 'LONG_TERM' as const,
        riskLevel: 'DEFENSIVE' as const
      };
    }
  };

  const strategy = getAutoStrategy();

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 group">
      {/* Header: Symbol and Price */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{stock.symbol.charAt(0)}</span>
          </div>

          {/* Symbol */}
          <div>
            <h3 className="text-xl font-bold text-gray-900">{stock.symbol}</h3>
            <p className="text-sm text-gray-500">Vol: {stock.volatility.toFixed(1)}%</p>
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg"
          title="Remove from list"
        >
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Price and Change */}
      <div className="mb-4">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-gray-900">${stock.price.toFixed(2)}</span>
          <span className={`text-sm font-semibold ${getChangeColor()}`}>
            {stock.changePercent >= 0 ? '+' : ''}
            {stock.changePercent.toFixed(2)}%
          </span>
        </div>
        <div className={`inline-block px-2 py-1 rounded-lg text-xs font-medium mt-1 ${getChangeBg()} ${getChangeColor()}`}>
          {stock.changeAmount >= 0 ? '+' : ''}${stock.changeAmount.toFixed(2)}
        </div>
      </div>

      {/* Suggested Strategy */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700 flex items-center">
            {getTimeHorizonIcon()} Strategy
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskBadgeColor()}`}>
            {strategy.riskLevel}
          </span>
        </div>
        <p className="text-sm text-gray-900 font-medium">{strategy.name}</p>
        <p className="text-xs text-gray-600 mt-1">{strategy.timeHorizon.replace('_', ' ')}</p>
      </div>

      {/* Volume Info */}
      <div className="mb-4 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Volume:</span>
          <span className="font-semibold">{stock.volume.toLocaleString()}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Momentum:</span>
          <span className={`font-semibold ${stock.momentum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stock.momentum.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Fund Allocation */}
      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Fund Allocation
        </label>

        {isEditing ? (
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">$</span>
            <input
              type="number"
              value={editedAllocation}
              onChange={(e) => setEditedAllocation(Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="100"
              step="100"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setEditedAllocation(stock.fundAllocation || 1000);
                setIsEditing(false);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group/edit"
          >
            <span className="text-lg font-bold text-gray-900">
              ${(stock.fundAllocation || 1000).toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 group-hover/edit:text-blue-600">
              Click to edit
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
