'use client';

import { StrategyFormData } from '../StepWizard';

interface ExitConditionsStepProps {
  formData: StrategyFormData;
  updateFormData: (data: Partial<StrategyFormData>) => void;
}

export default function ExitConditionsStep({ formData, updateFormData }: ExitConditionsStepProps) {
  const exitIndicators = [
    { id: 'RSI', name: 'RSI (Relative Strength Index)', description: 'Momentum reversal and overbought signals' },
    { id: 'MACD', name: 'MACD', description: 'Trend reversal and momentum exhaustion' },
    { id: 'BB', name: 'Bollinger Bands', description: 'Volatility breakouts and mean reversion' },
    { id: 'SMA', name: 'Simple Moving Average', description: 'Trend reversal and support/resistance' },
    { id: 'EMA', name: 'Exponential Moving Average', description: 'Dynamic trend following exits' },
    { id: 'STOCH', name: 'Stochastic Oscillator', description: 'Overbought conditions and momentum shifts' },
  ];

  // Helper function to check if an indicator is selected
  const isIndicatorSelected = (indicatorId: string): boolean => {
    return !!(formData.exitConditions && (
      (indicatorId === 'RSI' && formData.exitConditions.rsi) ||
      (indicatorId === 'MACD' && formData.exitConditions.macd) ||
      (indicatorId === 'SMA' && formData.exitConditions.sma) ||
      (indicatorId === 'EMA' && formData.exitConditions.ema) ||
      (indicatorId === 'BB' && formData.exitConditions.bb) ||
      (indicatorId === 'STOCH' && formData.exitConditions.stochastic)
    ));
  };

  // Helper function to get selected indicators
  const getSelectedIndicators = (): string[] => {
    const indicators: string[] = [];
    if (formData.exitConditions?.rsi) indicators.push('RSI');
    if (formData.exitConditions?.macd) indicators.push('MACD');
    if (formData.exitConditions?.sma) indicators.push('SMA');
    if (formData.exitConditions?.ema) indicators.push('EMA');
    if (formData.exitConditions?.bb) indicators.push('BB');
    if (formData.exitConditions?.stochastic) indicators.push('STOCH');
    return indicators;
  };

  const toggleExitIndicator = (indicatorId: string) => {
    const isCurrentlySelected = isIndicatorSelected(indicatorId);

    // Default parameters for each indicator
    const defaultParams = {
      RSI: {
        period: 14,
        exitSignal: 'overbought',
        overboughtThreshold: 70
      },
      MACD: {
        exitSignal: 'bearish_crossover',
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9
      },
      SMA: {
        period: 20,
        exitSignal: 'price_below'
      },
      EMA: {
        period: 12,
        exitSignal: 'price_below'
      },
      BB: {
        period: 20,
        stdDev: 2,
        exitSignal: 'touch_upper'
      },
      STOCH: {
        fastkperiod: 5,
        slowkperiod: 3,
        slowdperiod: 3,
        exitSignal: 'overbought',
        overboughtThreshold: 80
      }
    };

    // Map indicator IDs to their keys in exitConditions
    const indicatorKeys = {
      RSI: 'rsi',
      MACD: 'macd',
      SMA: 'sma',
      EMA: 'ema',
      BB: 'bb',
      STOCH: 'stochastic'
    };

    const indicatorKey = indicatorKeys[indicatorId as keyof typeof indicatorKeys];
    let updatedExitConditions = { ...formData.exitConditions };

    if (isCurrentlySelected) {
      // Remove the indicator
      delete (updatedExitConditions as any)[indicatorKey];
    } else {
      // Add the indicator with default parameters
      (updatedExitConditions as any)[indicatorKey] = defaultParams[indicatorId as keyof typeof defaultParams];
    }

    updateFormData({
      exitConditions: updatedExitConditions
    });
  };

  const updateExitCondition = (key: string, value: any) => {
    updateFormData({
      exitConditions: {
        ...formData.exitConditions,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Exit Conditions</h2>
        <p className="text-gray-600">Define comprehensive exit strategies to protect profits and limit losses</p>
      </div>

      {/* Risk Management Section */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Risk Management (Priority 1)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stop Loss Configuration */}
          <div className="bg-white rounded-lg p-5 border border-red-200">
            <h4 className="font-semibold text-gray-900 mb-4">Stop Loss Protection</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-red-600">{formData.stopLoss}%</span>
                <span className="text-sm text-gray-500">Maximum Loss</span>
              </div>

              <input
                type="range"
                min="0.5"
                max="25"
                step="0.5"
                value={formData.stopLoss}
                onChange={(e) => updateFormData({ stopLoss: parseFloat(e.target.value) })}
                className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0.5%</span>
                <span>25%</span>
              </div>

              <div className="mt-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.exitConditions?.stopLoss?.trailingEnabled || false}
                    onChange={(e) => updateExitCondition('stopLoss', {
                      ...formData.exitConditions?.stopLoss,
                      enabled: true,
                      type: 'percentage',
                      value: formData.stopLoss,
                      trailingEnabled: e.target.checked,
                      trailingDistance: formData.exitConditions?.stopLoss?.trailingDistance || 2
                    })}
                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Trailing Stop</span>
                </label>

                {formData.exitConditions?.stopLoss?.trailingEnabled && (
                  <div className="mt-3 ml-7">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trailing Distance: {formData.exitConditions?.stopLoss?.trailingDistance || 2}%
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={formData.exitConditions?.stopLoss?.trailingDistance || 2}
                      onChange={(e) => updateExitCondition('stopLoss', {
                        ...formData.exitConditions?.stopLoss,
                        trailingDistance: parseFloat(e.target.value)
                      })}
                      className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Take Profit Configuration */}
          <div className="bg-white rounded-lg p-5 border border-green-200">
            <h4 className="font-semibold text-gray-900 mb-4">Take Profit Targets</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-green-600">+{formData.takeProfit}%</span>
                <span className="text-sm text-gray-500">Target Profit</span>
              </div>

              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={formData.takeProfit}
                onChange={(e) => updateFormData({ takeProfit: parseFloat(e.target.value) })}
                className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1%</span>
                <span>100%</span>
              </div>

              <div className="mt-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.exitConditions?.takeProfit?.partialTakingEnabled || false}
                    onChange={(e) => updateExitCondition('takeProfit', {
                      ...formData.exitConditions?.takeProfit,
                      enabled: true,
                      type: 'percentage',
                      value: formData.takeProfit,
                      partialTakingEnabled: e.target.checked,
                      partialLevels: e.target.checked ? [
                        { percentage: Math.floor(formData.takeProfit * 0.5), exitPercent: 50 },
                        { percentage: formData.takeProfit, exitPercent: 100 }
                      ] : undefined
                    })}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Partial Profits</span>
                </label>

                {formData.exitConditions?.takeProfit?.partialTakingEnabled && (
                  <div className="mt-3 ml-7 space-y-2">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>• Take 50% profit at {Math.floor(formData.takeProfit * 0.5)}%</div>
                      <div>• Take remaining 50% at {formData.takeProfit}%</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Risk-Reward Summary */}
        <div className="mt-6 bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Risk-Reward Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-red-600 font-bold text-lg">-{formData.stopLoss}%</div>
              <div className="text-gray-600">Max Loss</div>
            </div>
            <div className="text-center">
              <div className="text-green-600 font-bold text-lg">+{formData.takeProfit}%</div>
              <div className="text-gray-600">Target Profit</div>
            </div>
            <div className="text-center">
              <div className="text-blue-600 font-bold text-lg">{(formData.takeProfit / formData.stopLoss).toFixed(1)}:1</div>
              <div className="text-gray-600">Risk-Reward Ratio</div>
            </div>
            <div className="text-center">
              <div className={`font-bold text-lg ${(formData.takeProfit / formData.stopLoss) >= 2 ? 'text-green-600' : (formData.takeProfit / formData.stopLoss) >= 1.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                {(formData.takeProfit / formData.stopLoss) >= 2 ? 'Excellent' : (formData.takeProfit / formData.stopLoss) >= 1.5 ? 'Good' : 'Risky'}
              </div>
              <div className="text-gray-600">Risk Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Exit Indicators */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Technical Exit Signals (Priority 2)
        </h3>
        <p className="text-gray-600 mb-6">Select technical indicators that will trigger exits when conditions reverse</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exitIndicators.map((indicator) => (
            <button
              key={indicator.id}
              onClick={() => toggleExitIndicator(indicator.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                isIndicatorSelected(indicator.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900 mb-1">{indicator.name}</div>
              <div className="text-sm text-gray-500">{indicator.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Technical Indicator Settings */}
      {getSelectedIndicators().length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Exit Settings</h3>
          <div className="space-y-6">

            {/* RSI Exit Settings */}
            {isIndicatorSelected('RSI') && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h4 className="font-medium text-gray-900 mb-4">RSI Exit Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RSI Period</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.exitConditions?.rsi?.period || 14}
                      onChange={(e) => updateExitCondition('rsi', {
                        ...formData.exitConditions?.rsi,
                        period: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Exit Signal Type</label>
                    <select
                      value={formData.exitConditions?.rsi?.exitSignal || 'overbought'}
                      onChange={(e) => updateExitCondition('rsi', {
                        ...formData.exitConditions?.rsi,
                        period: formData.exitConditions?.rsi?.period || 14,
                        exitSignal: e.target.value as 'overbought' | 'momentum_reversal' | 'divergence'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="overbought">Overbought Exit (&gt;70)</option>
                      <option value="momentum_reversal">Momentum Reversal (&lt;50)</option>
                      <option value="divergence">Price-RSI Divergence</option>
                    </select>
                  </div>
                  {formData.exitConditions?.rsi?.exitSignal === 'overbought' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Overbought Threshold</label>
                      <input
                        type="number"
                        min="50"
                        max="95"
                        value={formData.exitConditions?.rsi?.overboughtThreshold || 70}
                        onChange={(e) => updateExitCondition('rsi', {
                          ...formData.exitConditions?.rsi,
                          overboughtThreshold: parseInt(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  )}
                  {formData.exitConditions?.rsi?.exitSignal === 'momentum_reversal' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Momentum Threshold</label>
                      <input
                        type="number"
                        min="30"
                        max="70"
                        value={formData.exitConditions?.rsi?.momentumThreshold || 50}
                        onChange={(e) => updateExitCondition('rsi', {
                          ...formData.exitConditions?.rsi,
                          momentumThreshold: parseInt(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MACD Exit Settings */}
            {isIndicatorSelected('MACD') && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <h4 className="font-medium text-gray-900 mb-4">MACD Exit Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Exit Signal Type</label>
                    <select
                      value={formData.exitConditions?.macd?.exitSignal || 'bearish_crossover'}
                      onChange={(e) => updateExitCondition('macd', {
                        ...formData.exitConditions?.macd,
                        exitSignal: e.target.value as 'bearish_crossover' | 'histogram_negative' | 'divergence'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                    >
                      <option value="bearish_crossover">Bearish Crossover</option>
                      <option value="histogram_negative">Histogram Turns Negative</option>
                      <option value="divergence">Price-MACD Divergence</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Signal Description</label>
                    <div className="text-sm text-gray-600 p-3 bg-white rounded-lg border">
                      {formData.exitConditions?.macd?.exitSignal === 'bearish_crossover' && 'Exit when MACD line crosses below signal line'}
                      {formData.exitConditions?.macd?.exitSignal === 'histogram_negative' && 'Exit when MACD histogram turns negative'}
                      {formData.exitConditions?.macd?.exitSignal === 'divergence' && 'Exit when price makes higher highs but MACD makes lower highs'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Moving Average Exit Settings */}
            {(isIndicatorSelected('SMA') || isIndicatorSelected('EMA')) && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                <h4 className="font-medium text-gray-900 mb-4">Moving Average Exit Configuration</h4>
                <div className="space-y-4">
                  {isIndicatorSelected('SMA') && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">SMA Period</label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={formData.exitConditions?.sma?.period || 20}
                          onChange={(e) => updateExitCondition('sma', {
                            ...formData.exitConditions?.sma,
                            period: parseInt(e.target.value)
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">SMA Exit Signal</label>
                        <select
                          value={formData.exitConditions?.sma?.exitSignal || 'price_below'}
                          onChange={(e) => updateExitCondition('sma', {
                            ...formData.exitConditions?.sma,
                            period: formData.exitConditions?.sma?.period || 20,
                            exitSignal: e.target.value as 'price_below' | 'slope_negative' | 'cross_below'
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                        >
                          <option value="price_below">Price Below SMA</option>
                          <option value="cross_below">Price Crosses Below</option>
                          <option value="slope_negative">SMA Slope Turns Down</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {isIndicatorSelected('EMA') && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">EMA Period</label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={formData.exitConditions?.ema?.period || 12}
                          onChange={(e) => updateExitCondition('ema', {
                            ...formData.exitConditions?.ema,
                            period: parseInt(e.target.value)
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">EMA Exit Signal</label>
                        <select
                          value={formData.exitConditions?.ema?.exitSignal || 'price_below'}
                          onChange={(e) => updateExitCondition('ema', {
                            ...formData.exitConditions?.ema,
                            period: formData.exitConditions?.ema?.period || 12,
                            exitSignal: e.target.value as 'price_below' | 'slope_negative' | 'cross_below'
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                        >
                          <option value="price_below">Price Below EMA</option>
                          <option value="cross_below">Price Crosses Below</option>
                          <option value="slope_negative">EMA Slope Turns Down</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bollinger Bands Exit Settings */}
            {isIndicatorSelected('BB') && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-6 border border-yellow-200">
                <h4 className="font-medium text-gray-900 mb-4">Bollinger Bands Exit Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">BB Period</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.exitConditions?.bb?.period || 20}
                      onChange={(e) => updateExitCondition('bb', {
                        ...formData.exitConditions?.bb,
                        period: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Standard Deviations</label>
                    <input
                      type="number"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={formData.exitConditions?.bb?.stdDev || 2}
                      onChange={(e) => updateExitCondition('bb', {
                        ...formData.exitConditions?.bb,
                        stdDev: parseFloat(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Exit Signal</label>
                    <select
                      value={formData.exitConditions?.bb?.exitSignal || 'touch_upper'}
                      onChange={(e) => updateExitCondition('bb', {
                        ...formData.exitConditions?.bb,
                        period: formData.exitConditions?.bb?.period || 20,
                        stdDev: formData.exitConditions?.bb?.stdDev || 2,
                        exitSignal: e.target.value as 'touch_upper' | 'break_middle_down' | 'squeeze_release'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-gray-900"
                    >
                      <option value="touch_upper">Touch Upper Band</option>
                      <option value="break_middle_down">Break Middle Band Down</option>
                      <option value="squeeze_release">Squeeze Release</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Stochastic Exit Settings */}
            {isIndicatorSelected('STOCH') && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-6 border border-teal-200">
                <h4 className="font-medium text-gray-900 mb-4">Stochastic Oscillator Exit Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fast K</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.exitConditions?.stochastic?.fastkperiod || 5}
                        onChange={(e) => updateExitCondition('stochastic', {
                          ...formData.exitConditions?.stochastic,
                          fastkperiod: parseInt(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Slow K</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.exitConditions?.stochastic?.slowkperiod || 3}
                        onChange={(e) => updateExitCondition('stochastic', {
                          ...formData.exitConditions?.stochastic,
                          slowkperiod: parseInt(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Slow D</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.exitConditions?.stochastic?.slowdperiod || 3}
                        onChange={(e) => updateExitCondition('stochastic', {
                          ...formData.exitConditions?.stochastic,
                          slowdperiod: parseInt(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Exit Signal</label>
                    <select
                      value={formData.exitConditions?.stochastic?.exitSignal || 'overbought'}
                      onChange={(e) => updateExitCondition('stochastic', {
                        ...formData.exitConditions?.stochastic,
                        fastkperiod: formData.exitConditions?.stochastic?.fastkperiod || 5,
                        slowkperiod: formData.exitConditions?.stochastic?.slowkperiod || 3,
                        slowdperiod: formData.exitConditions?.stochastic?.slowdperiod || 3,
                        exitSignal: e.target.value as 'overbought' | 'bearish_cross' | 'divergence'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900"
                    >
                      <option value="overbought">Overbought Exit (&gt;80)</option>
                      <option value="bearish_cross">Bearish Cross (%K below %D)</option>
                      <option value="divergence">Price-Stochastic Divergence</option>
                    </select>
                    {formData.exitConditions?.stochastic?.exitSignal === 'overbought' && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Overbought Threshold: {formData.exitConditions?.stochastic?.overboughtThreshold || 80}
                        </label>
                        <input
                          type="range"
                          min="60"
                          max="95"
                          value={formData.exitConditions?.stochastic?.overboughtThreshold || 80}
                          onChange={(e) => updateExitCondition('stochastic', {
                            ...formData.exitConditions?.stochastic,
                            overboughtThreshold: parseInt(e.target.value)
                          })}
                          className="w-full h-2 bg-teal-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Exit Options */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          Advanced Exit Options (Priority 3)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.exitConditions?.timeBasedExit?.enabled || false}
                onChange={(e) => updateExitCondition('timeBasedExit', {
                  ...formData.exitConditions?.timeBasedExit,
                  enabled: e.target.checked,
                  maxHoldTime: formData.exitConditions?.timeBasedExit?.maxHoldTime || 1440, // 24 hours default
                  endOfDayExit: formData.exitConditions?.timeBasedExit?.endOfDayExit || false
                })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable Time-Based Exits</span>
            </label>

            {formData.exitConditions?.timeBasedExit?.enabled && (
              <div className="mt-4 ml-7 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Hold Time: {Math.floor((formData.exitConditions?.timeBasedExit?.maxHoldTime || 1440) / 60)}h {(formData.exitConditions?.timeBasedExit?.maxHoldTime || 1440) % 60}m
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="10080"
                    step="30"
                    value={formData.exitConditions?.timeBasedExit?.maxHoldTime || 1440}
                    onChange={(e) => updateExitCondition('timeBasedExit', {
                      ...formData.exitConditions?.timeBasedExit,
                      maxHoldTime: parseInt(e.target.value)
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>30m</span>
                    <span>7 days</span>
                  </div>
                </div>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.exitConditions?.timeBasedExit?.endOfDayExit || false}
                    onChange={(e) => updateExitCondition('timeBasedExit', {
                      ...formData.exitConditions?.timeBasedExit,
                      endOfDayExit: e.target.checked
                    })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Exit all positions at market close</span>
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.exitConditions?.volatilityExit?.enabled || false}
                onChange={(e) => updateExitCondition('volatilityExit', {
                  ...formData.exitConditions?.volatilityExit,
                  enabled: e.target.checked,
                  threshold: formData.exitConditions?.volatilityExit?.threshold || 20,
                  period: formData.exitConditions?.volatilityExit?.period || 14
                })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable Volatility-Based Exits</span>
            </label>

            {formData.exitConditions?.volatilityExit?.enabled && (
              <div className="mt-4 ml-7 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Volatility Threshold: {formData.exitConditions?.volatilityExit?.threshold || 20}%
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={formData.exitConditions?.volatilityExit?.threshold || 20}
                    onChange={(e) => updateExitCondition('volatilityExit', {
                      ...formData.exitConditions?.volatilityExit,
                      threshold: parseInt(e.target.value)
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Volatility Period: {formData.exitConditions?.volatilityExit?.period || 14} days
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={formData.exitConditions?.volatilityExit?.period || 14}
                    onChange={(e) => updateExitCondition('volatilityExit', {
                      ...formData.exitConditions?.volatilityExit,
                      period: parseInt(e.target.value)
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exit Strategy Summary */}
      {((formData.exitConditions?.indicators?.length || 0) > 0 || formData.exitConditions?.stopLoss?.enabled || formData.exitConditions?.takeProfit?.enabled || formData.exitConditions?.timeBasedExit?.enabled) && (
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h4 className="font-medium text-gray-900 mb-4">Exit Strategy Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Risk Management:</span>
              <div className="flex space-x-4">
                {formData.exitConditions?.stopLoss?.trailingEnabled ? (
                  <span className="text-red-600 font-medium">Trailing Stop ({formData.stopLoss}%)</span>
                ) : (
                  <span className="text-red-600 font-medium">Stop Loss ({formData.stopLoss}%)</span>
                )}
                {formData.exitConditions?.takeProfit?.partialTakingEnabled ? (
                  <span className="text-green-600 font-medium">Partial Profits</span>
                ) : (
                  <span className="text-green-600 font-medium">Take Profit ({formData.takeProfit}%)</span>
                )}
              </div>
            </div>

            {getSelectedIndicators().length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Technical Signals:</span>
                <span className="text-blue-600 font-medium">
                  {getSelectedIndicators().length} indicator{getSelectedIndicators().length > 1 ? 's' : ''} active
                </span>
              </div>
            )}

            {formData.exitConditions?.timeBasedExit?.enabled && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Time-Based:</span>
                <span className="text-purple-600 font-medium">
                  Max hold {Math.floor((formData.exitConditions.timeBasedExit.maxHoldTime || 1440) / 60)}h
                </span>
              </div>
            )}

            {formData.exitConditions?.volatilityExit?.enabled && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Volatility:</span>
                <span className="text-orange-600 font-medium">
                  Exit if volatility &gt; {formData.exitConditions.volatilityExit.threshold}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}