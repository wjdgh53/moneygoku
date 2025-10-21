'use client';

import { useState } from 'react';

interface TradingFormProps {
  symbol: string;
}

export default function TradingForm({ symbol }: TradingFormProps) {
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');

  const [balance] = useState({
    BTC: 0.5423,
    USDT: 12450.75,
    ETH: 2.1543
  });

  const currentPrice = 43250.00;
  const baseCurrency = symbol.split('/')[0];
  const quoteCurrency = symbol.split('/')[1] || 'USD';

  const handleSubmitOrder = () => {
    console.log('Submitting order:', {
      symbol,
      side,
      orderType,
      amount,
      price: orderType === 'market' ? currentPrice : price,
      stopPrice: orderType === 'stop' ? stopPrice : undefined
    });

    // Reset form
    setAmount('');
    setPrice('');
    setStopPrice('');
  };

  const calculateTotal = () => {
    const amountNum = parseFloat(amount) || 0;
    const priceNum = orderType === 'market' ? currentPrice : parseFloat(price) || 0;
    return (amountNum * priceNum).toFixed(2);
  };

  return (
    <div className="p-4">
      <div className="space-y-4">
        {/* Order Type Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {(['market', 'limit', 'stop'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded transition-colors ${
                orderType === type
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Buy/Sell Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide('buy')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              side === 'buy'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Buy {baseCurrency}
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`py-3 px-4 rounded-lg font-medium transition-colors ${
              side === 'sell'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sell {baseCurrency}
          </button>
        </div>

        {/* Price Input (for limit/stop orders) */}
        {orderType !== 'market' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price ({quoteCurrency})
            </label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currentPrice.toString()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setPrice(currentPrice.toString())}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
              >
                Market
              </button>
            </div>
          </div>
        )}

        {/* Stop Price (for stop orders) */}
        {orderType === 'stop' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stop Price ({quoteCurrency})
            </label>
            <input
              type="number"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder="Stop price"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Amount ({baseCurrency})
            </label>
            <span className="text-xs text-gray-500">
              Available: {side === 'buy'
                ? `${balance[quoteCurrency as keyof typeof balance]?.toFixed(2) || '0.00'} ${quoteCurrency}`
                : `${balance[baseCurrency as keyof typeof balance]?.toFixed(4) || '0.0000'} ${baseCurrency}`
              }
            </span>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Percentage Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 75, 100].map((percentage) => (
            <button
              key={percentage}
              onClick={() => {
                const availableBalance = side === 'buy'
                  ? (balance[quoteCurrency as keyof typeof balance] || 0) / currentPrice
                  : (balance[baseCurrency as keyof typeof balance] || 0);
                const newAmount = (availableBalance * percentage / 100).toFixed(4);
                setAmount(newAmount);
              }}
              className="py-1 px-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              {percentage}%
            </button>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Order Type:</span>
            <span className="font-medium">{orderType.charAt(0).toUpperCase() + orderType.slice(1)}</span>
          </div>
          {orderType !== 'market' && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Price:</span>
              <span className="font-medium">${price || currentPrice.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium">{amount || '0.0000'} {baseCurrency}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
            <span className="text-gray-600">Total:</span>
            <span className="font-medium">${calculateTotal()} {quoteCurrency}</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmitOrder}
          disabled={!amount || (orderType !== 'market' && !price)}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            side === 'buy'
              ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-300'
              : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-300'
          } text-white disabled:cursor-not-allowed`}
        >
          {side === 'buy' ? 'Buy' : 'Sell'} {baseCurrency}
        </button>
      </div>
    </div>
  );
}