'use client';

import { useState } from 'react';

interface MarketDataProps {
  symbol: string;
  data: {
    price: number;
    change: number;
    changePercent: number;
    volume24h: number;
    high24h: number;
    low24h: number;
  };
  onSymbolChange: (symbol: string) => void;
}

export default function MarketData({ symbol, data, onSymbolChange }: MarketDataProps) {
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);

  const popularSymbols = [
    'BTC/USDT',
    'ETH/USDT',
    'AAPL',
    'TSLA',
    'GOOGL',
    'MSFT',
    'AMZN',
    'NVDA'
  ];

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const isPositive = data.change >= 0;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Symbol Selector */}
        <div className="relative">
          <button
            onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="font-bold text-xl text-gray-900">{symbol}</span>
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isSymbolDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search symbol..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {popularSymbols.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => {
                      onSymbolChange(sym);
                      setIsSymbolDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium">{sym}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Market Data */}
        <div className="flex items-center space-x-8">
          {/* Price */}
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              ${data.price.toLocaleString()}
            </div>
            <div className={`text-sm flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '↗' : '↘'}
              <span className="ml-1">
                {isPositive ? '+' : ''}{data.change.toFixed(2)}
                ({isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* 24h High */}
          <div className="text-right">
            <div className="text-xs text-gray-500">24h High</div>
            <div className="font-semibold text-gray-900">${data.high24h.toLocaleString()}</div>
          </div>

          {/* 24h Low */}
          <div className="text-right">
            <div className="text-xs text-gray-500">24h Low</div>
            <div className="font-semibold text-gray-900">${data.low24h.toLocaleString()}</div>
          </div>

          {/* 24h Volume */}
          <div className="text-right">
            <div className="text-xs text-gray-500">24h Volume</div>
            <div className="font-semibold text-gray-900">${formatNumber(data.volume24h)}</div>
          </div>
        </div>

        {/* Market Status */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Market Open</span>
        </div>
      </div>
    </div>
  );
}