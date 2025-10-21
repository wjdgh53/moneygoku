'use client';

import { StrategyFormData } from '../StepWizard';

interface EntryConditionsStepProps {
  formData: StrategyFormData;
  updateFormData: (data: Partial<StrategyFormData>) => void;
}

export default function EntryConditionsStep({ formData, updateFormData }: EntryConditionsStepProps) {
  const indicators = [
    { id: 'RSI', name: 'RSI (Relative Strength Index)', description: 'Momentum oscillator' },
    { id: 'MACD', name: 'MACD', description: 'Moving Average Convergence Divergence' },
    { id: 'BB', name: 'Bollinger Bands', description: 'Volatility indicator' },
    { id: 'SMA', name: 'Simple Moving Average', description: 'Trend following indicator' },
    { id: 'EMA', name: 'Exponential Moving Average', description: 'Trend following indicator' },
    { id: 'STOCH', name: 'Stochastic Oscillator', description: 'Momentum indicator' },
  ];

  const toggleIndicator = (indicatorId: string) => {
    // Check if indicator is currently selected by looking at entryConditions keys
    const isCurrentlySelected = formData.entryConditions && (
      (indicatorId === 'RSI' && formData.entryConditions.rsi) ||
      (indicatorId === 'MACD' && formData.entryConditions.macd) ||
      (indicatorId === 'SMA' && formData.entryConditions.sma) ||
      (indicatorId === 'EMA' && formData.entryConditions.ema) ||
      (indicatorId === 'BB' && formData.entryConditions.bb) ||
      (indicatorId === 'STOCH' && formData.entryConditions.stochastic)
    );

    // Default parameters for each indicator
    const defaultParams = {
      RSI: {
        period: 14,
        condition: 'below',
        value: 30
      },
      MACD: {
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        signal: 'bullish_crossover'
      },
      SMA: {
        period: 20,
        position: 'above'
      },
      EMA: {
        period: 12,
        position: 'above'
      },
      BB: {
        period: 20,
        stdDev: 2,
        position: 'lower'
      },
      STOCH: {
        fastkperiod: 5,
        slowkperiod: 3,
        slowdperiod: 3,
        operator: 'oversold',
        kValue: 20
      }
    };

    let updatedEntryConditions = { ...formData.entryConditions };

    if (isCurrentlySelected) {
      // Remove indicator parameters when unchecking
      if (indicatorId === 'RSI') {
        delete updatedEntryConditions.rsi;
      } else if (indicatorId === 'MACD') {
        delete updatedEntryConditions.macd;
      } else if (indicatorId === 'SMA') {
        delete updatedEntryConditions.sma;
      } else if (indicatorId === 'EMA') {
        delete updatedEntryConditions.ema;
      } else if (indicatorId === 'BB') {
        delete updatedEntryConditions.bb;
      } else if (indicatorId === 'STOCH') {
        delete updatedEntryConditions.stochastic;
      }
    } else {
      // Add default parameters when selecting indicator
      if (indicatorId === 'RSI') {
        updatedEntryConditions.rsi = defaultParams.RSI;
      } else if (indicatorId === 'MACD') {
        updatedEntryConditions.macd = defaultParams.MACD;
      } else if (indicatorId === 'SMA') {
        updatedEntryConditions.sma = defaultParams.SMA;
      } else if (indicatorId === 'EMA') {
        updatedEntryConditions.ema = defaultParams.EMA;
      } else if (indicatorId === 'BB') {
        updatedEntryConditions.bb = defaultParams.BB;
      } else if (indicatorId === 'STOCH') {
        updatedEntryConditions.stochastic = defaultParams.STOCH;
      }
    }

    updateFormData({
      entryConditions: updatedEntryConditions
    });
  };

  // Helper function to check if an indicator is selected
  const isIndicatorSelected = (indicatorId: string) => {
    if (!formData.entryConditions) return false;
    if (indicatorId === 'RSI') return !!formData.entryConditions.rsi;
    if (indicatorId === 'MACD') return !!formData.entryConditions.macd;
    if (indicatorId === 'SMA') return !!formData.entryConditions.sma;
    if (indicatorId === 'EMA') return !!formData.entryConditions.ema;
    if (indicatorId === 'BB') return !!formData.entryConditions.bb;
    if (indicatorId === 'STOCH') return !!formData.entryConditions.stochastic;
    return false;
  };

  // Helper function to get selected indicators for display
  const getSelectedIndicators = () => {
    if (!formData.entryConditions) return [];
    const selected = [];
    if (formData.entryConditions.rsi) selected.push('RSI');
    if (formData.entryConditions.macd) selected.push('MACD');
    if (formData.entryConditions.sma) selected.push('SMA');
    if (formData.entryConditions.ema) selected.push('EMA');
    if (formData.entryConditions.bb) selected.push('BB');
    if (formData.entryConditions.stochastic) selected.push('STOCH');
    return selected;
  };


  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Entry Conditions</h2>
        <p className="text-gray-600">Set the conditions that will trigger your strategy to enter a trade</p>
      </div>

      {/* Technical Indicators */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Technical Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {indicators.map((indicator) => (
            <button
              key={indicator.id}
              onClick={() => toggleIndicator(indicator.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                isIndicatorSelected(indicator.id)
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900 mb-1">{indicator.name}</div>
              <div className="text-sm text-gray-500">{indicator.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Indicator Settings */}
      {getSelectedIndicators().length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Indicator Settings</h3>
          <div className="space-y-4">

            {/* RSI Settings */}
            {isIndicatorSelected('RSI') && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">RSI Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RSI Period
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.entryConditions?.rsi?.period || 14}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          rsi: { ...formData.entryConditions?.rsi, period: parseInt(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entry Threshold
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={formData.entryConditions?.rsi?.condition || 'below'}
                        onChange={(e) => updateFormData({
                          entryConditions: {
                            ...formData.entryConditions,
                            rsi: { ...formData.entryConditions?.rsi, condition: e.target.value }
                          }
                        })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                      >
                        <option value="below">Below</option>
                        <option value="above">Above</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.entryConditions?.rsi?.value || 30}
                        onChange={(e) => updateFormData({
                          entryConditions: {
                            ...formData.entryConditions,
                            rsi: { ...formData.entryConditions?.rsi, value: parseInt(e.target.value) }
                          }
                        })}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MACD Settings */}
            {isIndicatorSelected('MACD') && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">MACD Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fast Period
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.entryConditions?.macd?.fastPeriod || 12}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          macd: { ...formData.entryConditions?.macd, fastPeriod: parseInt(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slow Period
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.entryConditions?.macd?.slowPeriod || 26}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          macd: { ...formData.entryConditions?.macd, slowPeriod: parseInt(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Signal Period
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.entryConditions?.macd?.signalPeriod || 9}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          macd: { ...formData.entryConditions?.macd, signalPeriod: parseInt(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entry Signal
                  </label>
                  <select
                    value={formData.entryConditions?.macd?.signal || 'bullish_crossover'}
                    onChange={(e) => updateFormData({
                      entryConditions: {
                        ...formData.entryConditions,
                        macd: { ...formData.entryConditions?.macd, signal: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="bullish_crossover">Bullish Crossover</option>
                    <option value="bearish_crossover">Bearish Crossover</option>
                    <option value="above_zero">MACD Above Zero</option>
                    <option value="below_zero">MACD Below Zero</option>
                  </select>
                </div>
              </div>
            )}

            {/* SMA Settings */}
            {isIndicatorSelected('SMA') && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">SMA Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMA Period
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={formData.entryConditions?.sma?.period || 20}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          sma: { ...formData.entryConditions?.sma, period: parseInt(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Position
                    </label>
                    <select
                      value={formData.entryConditions?.sma?.position || 'above'}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          sma: { ...formData.entryConditions?.sma, position: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    >
                      <option value="above">Price Above SMA</option>
                      <option value="below">Price Below SMA</option>
                      <option value="cross_above">Price Cross Above</option>
                      <option value="cross_below">Price Cross Below</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* EMA Settings */}
            {isIndicatorSelected('EMA') && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">EMA Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      EMA Period
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={formData.entryConditions?.ema?.period || 12}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          ema: { ...formData.entryConditions?.ema, period: parseInt(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Position
                    </label>
                    <select
                      value={formData.entryConditions?.ema?.position || 'above'}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          ema: { ...formData.entryConditions?.ema, position: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    >
                      <option value="above">Price Above EMA</option>
                      <option value="below">Price Below EMA</option>
                      <option value="cross_above">Price Cross Above</option>
                      <option value="cross_below">Price Cross Below</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Bollinger Bands Settings */}
            {isIndicatorSelected('BB') && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Bollinger Bands Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Period
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.entryConditions?.bb?.period || 20}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          bb: { ...formData.entryConditions?.bb, period: parseInt(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Standard Deviations
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={formData.entryConditions?.bb?.stdDev || 2}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          bb: { ...formData.entryConditions?.bb, stdDev: parseFloat(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Position
                    </label>
                    <select
                      value={formData.entryConditions?.bb?.position || 'lower'}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          bb: { ...formData.entryConditions?.bb, position: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    >
                      <option value="lower">Touch Lower Band</option>
                      <option value="upper">Touch Upper Band</option>
                      <option value="middle">Cross Middle Band</option>
                      <option value="squeeze">Band Squeeze</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Stochastic Oscillator Settings */}
            {isIndicatorSelected('STOCH') && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Stochastic Oscillator Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fast K Period
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.entryConditions?.stochastic?.fastkperiod || 5}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          stochastic: { ...formData.entryConditions?.stochastic, fastkperiod: parseInt(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slow K Period
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.entryConditions?.stochastic?.slowkperiod || 3}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          stochastic: { ...formData.entryConditions?.stochastic, slowkperiod: parseInt(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slow D Period
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.entryConditions?.stochastic?.slowdperiod || 3}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          stochastic: { ...formData.entryConditions?.stochastic, slowdperiod: parseInt(e.target.value) }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entry Signal
                    </label>
                    <select
                      value={formData.entryConditions?.stochastic?.operator || 'oversold'}
                      onChange={(e) => updateFormData({
                        entryConditions: {
                          ...formData.entryConditions,
                          stochastic: { ...formData.entryConditions?.stochastic, operator: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    >
                      <option value="oversold">Oversold</option>
                      <option value="overbought">Overbought</option>
                      <option value="bullish_cross">Bullish Cross (%K above %D)</option>
                      <option value="bearish_cross">Bearish Cross (%K below %D)</option>
                    </select>
                  </div>
                  {(formData.entryConditions?.stochastic?.operator === 'oversold' || formData.entryConditions?.stochastic?.operator === 'overbought') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        K Value Threshold
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.entryConditions?.stochastic?.kValue || (formData.entryConditions?.stochastic?.operator === 'oversold' ? 20 : 80)}
                        onChange={(e) => updateFormData({
                          entryConditions: {
                            ...formData.entryConditions,
                            stochastic: { ...formData.entryConditions?.stochastic, kValue: parseInt(e.target.value) }
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {getSelectedIndicators().length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Entry Conditions Preview</h4>
          <div className="text-sm text-gray-600">
            <p>Selected indicators: <span className="font-medium text-gray-900">{getSelectedIndicators().join(', ')}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}