import { useState } from 'react';

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  status: 'OPEN';
}

interface PositionCardProps {
  position: Position;
  onClose: (symbol: string, quantity: number) => Promise<void>;
}

export default function PositionCard({ position, onClose }: PositionCardProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClosePosition = async () => {
    setIsClosing(true);
    try {
      await onClose(position.symbol, position.quantity);
    } catch (error) {
      console.error('Failed to close position:', error);
    } finally {
      setIsClosing(false);
    }
  };

  const getProfitColor = () => {
    return position.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getProfitBg = () => {
    return position.unrealizedPL >= 0 ? 'bg-green-50' : 'bg-red-50';
  };

  const getSideColor = () => {
    return position.side === 'long' ? 'text-green-600' : 'text-red-600';
  };

  const getSideBg = () => {
    return position.side === 'long' ? 'bg-green-50' : 'bg-red-50';
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-200">
      {/* Header with Symbol and Side */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{position.symbol.charAt(0)}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{position.symbol}</h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSideBg()} ${getSideColor()}`}>
              {position.side.toUpperCase()}
            </span>
          </div>
        </div>

        <div className={`text-right ${getProfitBg()} px-3 py-2 rounded-lg`}>
          <div className={`text-lg font-bold ${getProfitColor()}`}>
            ${position.unrealizedPL.toFixed(2)}
          </div>
          <div className={`text-sm ${getProfitColor()}`}>
            {position.unrealizedPLPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Position Details */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Quantity</span>
          <span className="text-sm font-semibold text-gray-900">{position.quantity.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Avg Cost</span>
          <span className="text-sm font-semibold text-gray-900">${position.entryPrice.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Current Price</span>
          <span className="text-sm font-semibold text-gray-900">${position.currentPrice.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Market Value</span>
          <span className="text-sm font-semibold text-gray-900">${position.marketValue.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Cost Basis</span>
          <span className="text-sm font-semibold text-gray-900">${position.costBasis.toFixed(2)}</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleClosePosition}
        disabled={isClosing}
        className="w-full bg-red-600 text-white text-sm py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isClosing ? 'Closing Position...' : 'Close Position (Sell All)'}
      </button>
    </div>
  );
}