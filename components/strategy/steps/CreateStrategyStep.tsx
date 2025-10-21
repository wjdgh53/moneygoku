'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StrategyFormData } from '../StepWizard';

interface CreateStrategyStepProps {
  formData: StrategyFormData;
  updateFormData: (data: Partial<StrategyFormData>) => void;
}

export default function CreateStrategyStep({ formData, updateFormData }: CreateStrategyStepProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateStrategy = async () => {
    setIsCreating(true);

    try {
      console.log('🔄 Creating strategy with data:', formData);
      console.log('🔍 Entry Conditions:', formData.entryConditions);
      console.log('🔍 Exit Conditions:', formData.exitConditions);

      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          timeHorizon: formData.timeHorizon,
          riskAppetite: formData.riskAppetite,
          entryConditions: formData.entryConditions,
          exitConditions: formData.exitConditions,
          stopLoss: formData.stopLoss,
          takeProfit: formData.takeProfit
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create strategy');
      }

      const result = await response.json();
      console.log('✅ Strategy created successfully:', result);

      // Redirect to strategies page on success
      router.push('/strategies');
    } catch (error) {
      console.error('💥 Error creating strategy:', error);
      alert(`Failed to create strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsCreating(false);
    }
  };

  const strategyTypes = [
    'Technical Analysis',
    'Momentum Trading',
    'Mean Reversion',
    'Trend Following',
    'Scalping',
    'Swing Trading'
  ];

  // Helper function to get selected entry indicators from entryConditions
  const getSelectedEntryIndicators = () => {
    const indicators: string[] = [];
    if (formData.entryConditions?.rsi) indicators.push('RSI');
    if (formData.entryConditions?.macd) indicators.push('MACD');
    if (formData.entryConditions?.sma) indicators.push('SMA');
    if (formData.entryConditions?.ema) indicators.push('EMA');
    if (formData.entryConditions?.bb) indicators.push('Bollinger Bands');
    if (formData.entryConditions?.stochastic) indicators.push('Stochastic Oscillator');
    return indicators;
  };

  // Helper function to get selected exit indicators from exitConditions
  const getSelectedExitIndicators = () => {
    const indicators: string[] = [];
    if (formData.exitConditions?.rsi) indicators.push('RSI');
    if (formData.exitConditions?.macd) indicators.push('MACD');
    if (formData.exitConditions?.sma) indicators.push('SMA');
    if (formData.exitConditions?.ema) indicators.push('EMA');
    if (formData.exitConditions?.bb) indicators.push('Bollinger Bands');
    if (formData.exitConditions?.stochastic) indicators.push('Stochastic Oscillator');
    return indicators;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Strategy</h2>
        <p className="text-gray-600">Review your strategy settings and give it a name</p>
      </div>

      {/* Strategy Info */}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Strategy Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder="e.g., RSI Momentum BTC Strategy"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            placeholder="Describe your strategy, its purpose, and how it works..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Strategy Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => updateFormData({ type: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {strategyTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Strategy Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trade Parameters */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Trade Parameters</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Fund Allocation:</span>
                <span className="font-medium">${formData.fundAllocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Entry Order:</span>
                <span className="font-medium">{formData.entryOrderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Exit Order:</span>
                <span className="font-medium">{formData.exitOrderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trading Frequency:</span>
                <span className="font-medium">{formData.tradingFrequency}m</span>
              </div>
            </div>
          </div>

          {/* Entry Conditions */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Entry Conditions</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Indicators:</span>
                <span className="font-medium">{getSelectedEntryIndicators().length} selected</span>
              </div>
              {getSelectedEntryIndicators().length > 0 && (
                <div className="text-xs text-gray-500">
                  {getSelectedEntryIndicators().join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Exit Conditions */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Exit Conditions</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Exit Indicators:</span>
                <span className="font-medium">{getSelectedExitIndicators().length} selected</span>
              </div>
              {getSelectedExitIndicators().length > 0 && (
                <div className="text-xs text-gray-500">
                  {getSelectedExitIndicators().join(', ')}
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Stop Loss:</span>
                <span className="font-medium text-red-600">-{formData.stopLoss}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Take Profit:</span>
                <span className="font-medium text-green-600">+{formData.takeProfit}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Risk-Reward:</span>
                <span className="font-medium">{(formData.takeProfit / formData.stopLoss).toFixed(1)}:1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Important Notice
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                This strategy will start in paper trading mode for testing. Real money trading can be enabled later after reviewing performance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="flex justify-center pt-6">
        <button
          onClick={handleCreateStrategy}
          disabled={!formData.name || isCreating}
          className={`px-8 py-3 rounded-lg font-medium transition-all ${
            !formData.name || isCreating
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {isCreating ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Strategy...
            </div>
          ) : (
            'Create Strategy'
          )}
        </button>
      </div>
    </div>
  );
}