'use client';

import { StrategyFormData } from '../StepWizard';

interface TradeParametersStepProps {
  formData: StrategyFormData;
  updateFormData: (data: Partial<StrategyFormData>) => void;
}

export default function TradeParametersStep({ formData, updateFormData }: TradeParametersStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Trade Parameters</h2>
        <p className="text-gray-600">Configure your trading parameters and risk management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Fund Allocation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Fund Allocation
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">{formData.fundAllocation}</span>
                <span className="text-sm text-gray-500">USD</span>
              </div>
              <input
                type="range"
                min="0"
                max="100000"
                step="1000"
                value={formData.fundAllocation}
                onChange={(e) => updateFormData({ fundAllocation: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>$0</span>
                <span>Available: 8794.05 USD</span>
              </div>
            </div>
          </div>

          {/* Entry Order Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Entry Order Type
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => updateFormData({ entryOrderType: 'MARKET' })}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.entryOrderType === 'MARKET'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                MARKET
              </button>
              <button
                onClick={() => updateFormData({ entryOrderType: 'LIMIT' })}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.entryOrderType === 'LIMIT'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                LIMIT
              </button>
            </div>
          </div>

          {/* Exit Order Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Exit Order Type
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => updateFormData({ exitOrderType: 'MARKET' })}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.exitOrderType === 'MARKET'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                MARKET
              </button>
              <button
                onClick={() => updateFormData({ exitOrderType: 'LIMIT' })}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.exitOrderType === 'LIMIT'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                LIMIT
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Base Order Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Base Order Limit
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">{formData.baseOrderLimit}</span>
                <span className="text-sm text-gray-500">%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={formData.baseOrderLimit}
                onChange={(e) => updateFormData({ baseOrderLimit: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-gray-500">
                0.0000 USD (50%)
              </div>
            </div>
          </div>

          {/* Base Order Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Base Order Type
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => updateFormData({ baseOrderType: 'STATIC' })}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.baseOrderType === 'STATIC'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                STATIC
              </button>
              <button
                onClick={() => updateFormData({ baseOrderType: 'DYNAMIC' })}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.baseOrderType === 'DYNAMIC'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                DYNAMIC
              </button>
            </div>
          </div>

          {/* Extra Orders */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Extra Orders
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">{formData.extraOrders}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={formData.extraOrders}
                onChange={(e) => updateFormData({ extraOrders: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-gray-500">
                2 (25%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Minimum Price Gap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Minimum price gap between Extra Orders
            </label>
            <div className="space-y-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={formData.minPriceGap}
                onChange={(e) => updateFormData({ minPriceGap: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>{formData.minPriceGap}%</span>
              </div>
            </div>
          </div>

          {/* Trading Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Trading Frequency
            </label>
            <div className="space-y-3">
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={formData.tradingFrequency}
                onChange={(e) => updateFormData({ tradingFrequency: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-center text-sm text-gray-600">
                {formData.tradingFrequency}m
              </div>
            </div>
          </div>
        </div>

        {/* Email Notification */}
        <div className="mt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.sendOrderFilledEmail}
              onChange={(e) => updateFormData({ sendOrderFilledEmail: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Send Order Filled Email</span>
          </label>
        </div>
      </div>
    </div>
  );
}