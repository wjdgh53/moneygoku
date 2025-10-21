'use client';

import { StrategyFormData } from '../StepWizard';

interface AssetStepProps {
  formData: StrategyFormData;
  updateFormData: (data: Partial<StrategyFormData>) => void;
}

export default function AssetStep({ formData, updateFormData }: AssetStepProps) {
  const popularAssets = [
    { symbol: 'BTC/USDT', name: 'Bitcoin', icon: '₿' },
    { symbol: 'ETH/USDT', name: 'Ethereum', icon: 'Ξ' },
    { symbol: 'AAPL', name: 'Apple Inc.', icon: '🍎' },
    { symbol: 'TSLA', name: 'Tesla Inc.', icon: '🚗' },
    { symbol: 'GOOGL', name: 'Google', icon: '🔍' },
    { symbol: 'MSFT', name: 'Microsoft', icon: '🖥️' },
  ];

  const exchanges = [
    'Binance',
    'Coinbase Pro',
    'Interactive Brokers',
    'TD Ameritrade',
    'E*TRADE',
    'Charles Schwab'
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Asset</h2>
        <p className="text-gray-600">Choose the asset you want to trade with this strategy</p>
      </div>

      {/* Popular Assets */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Assets</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {popularAssets.map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => updateFormData({ asset: asset.symbol })}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                formData.asset === asset.symbol
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{asset.icon}</div>
              <div className="font-semibold text-gray-900">{asset.symbol}</div>
              <div className="text-sm text-gray-500">{asset.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Asset Input */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Or Enter Custom Asset</h3>
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Symbol
          </label>
          <input
            type="text"
            value={formData.asset}
            onChange={(e) => updateFormData({ asset: e.target.value.toUpperCase() })}
            placeholder="e.g., BTC/USDT, AAPL, NVDA"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the trading pair or stock symbol
          </p>
        </div>
      </div>

      {/* Exchange Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Exchange</h3>
        <div className="max-w-md">
          <select
            value={formData.exchange}
            onChange={(e) => updateFormData({ exchange: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {exchanges.map((exchange) => (
              <option key={exchange} value={exchange}>
                {exchange}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview */}
      {formData.asset && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Selection Preview</h4>
          <div className="text-sm text-gray-600">
            <p>Asset: <span className="font-medium text-gray-900">{formData.asset}</span></p>
            <p>Exchange: <span className="font-medium text-gray-900">{formData.exchange}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}