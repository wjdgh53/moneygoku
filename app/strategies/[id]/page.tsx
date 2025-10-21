'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';

interface Strategy {
  id: string;
  name: string;
  description: string;
  entryConditions: any;
  exitConditions: any;
  stopLoss: number;
  takeProfit: number;
  botCount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function StrategyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchStrategy(params.id as string);
    }
  }, [params.id]);

  const fetchStrategy = async (strategyId: string) => {
    try {
      console.log('📋 Fetching strategy details for:', strategyId);
      const response = await fetch(`/api/strategies/${strategyId}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Received strategy:', data);
        console.log('🔍 Entry conditions structure:', data.entryConditions);
        console.log('🔍 Exit conditions structure:', data.exitConditions);
        const strategyData = data.strategy || data;
        // Add botCount from bots array length if available
        if (strategyData.bots && Array.isArray(strategyData.bots)) {
          strategyData.botCount = strategyData.bots.length;
        }
        setStrategy(strategyData);
      } else if (response.status === 404) {
        setError('Strategy not found');
      } else {
        setError('Failed to load strategy');
      }
    } catch (error) {
      console.error('💥 Error fetching strategy:', error);
      setError('Failed to load strategy');
    } finally {
      setLoading(false);
    }
  };

  const getStrategyIcon = (name: string) => {
    const firstLetter = name.charAt(0).toUpperCase();
    const colors: { [key: string]: string } = {
      'S': 'from-purple-500 to-purple-700',
      'R': 'from-blue-500 to-blue-700',
      'M': 'from-green-500 to-green-700',
      'B': 'from-orange-500 to-orange-700',
      'T': 'from-red-500 to-red-700',
      'V': 'from-indigo-500 to-indigo-700',
    };
    return {
      letter: firstLetter,
      color: colors[firstLetter] || 'from-gray-500 to-gray-700'
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderConditionValue = (conditions: any, type: 'entry' | 'exit') => {
    if (!conditions || (typeof conditions === 'object' && Object.keys(conditions).length === 0)) {
      return `⚠️ No ${type} conditions configured - please create a new strategy with proper conditions`;
    }

    const parts: string[] = [];

    // Handle different possible data structures
    console.log(`${type} conditions:`, conditions);

    // Handle array of indicators (common format)
    if (Array.isArray(conditions)) {
      parts.push(`${conditions.length} indicators: ${conditions.join(', ')}`);
    }
    // Handle object with indicators array
    else if (conditions.indicators && conditions.indicators.length > 0) {
      parts.push(`${conditions.indicators.join(', ')} indicators`);
    }
    // Handle conditions object
    else if (conditions.conditions) {
      Object.keys(conditions.conditions).forEach(key => {
        if (conditions.conditions[key]) {
          parts.push(`${key.toUpperCase()}`);
        }
      });
    }
    // Handle direct object keys (RSI, MACD, etc.)
    else if (typeof conditions === 'object') {
      Object.keys(conditions).forEach(key => {
        if (conditions[key] && typeof conditions[key] === 'object') {
          if (conditions[key].enabled || conditions[key].threshold !== undefined || conditions[key].period !== undefined) {
            parts.push(key.toUpperCase());
          }
        } else if (conditions[key] === true) {
          parts.push(key.toUpperCase());
        }
      });
    }

    // Handle exit-specific conditions
    if (type === 'exit') {
      if (conditions.stopLoss?.enabled) {
        parts.push('Stop Loss');
      }
      if (conditions.takeProfit?.enabled) {
        parts.push('Take Profit');
      }
      if (conditions.indicators && conditions.indicators.length > 0) {
        parts.push(`${conditions.indicators.length} technical signals`);
      }
    }

    return parts.length > 0 ? parts.join(', ') : `⚠️ No ${type} conditions configured - please create a new strategy with proper conditions`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !strategy) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Strategy Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The requested strategy could not be found.'}</p>
          <Link href="/strategies">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Back to Strategies
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  const icon = getStrategyIcon(strategy.name);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br ${icon.color} shadow-lg`}>
              <span className="text-white font-bold text-2xl">{icon.letter}</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{strategy.name}</h1>
              <p className="text-gray-600 mt-1">
                Created {formatDate(strategy.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <Link href={`/bots/create?strategyId=${strategy.id}`}>
              <button className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all font-bold text-lg flex items-center space-x-3 border-2 border-blue-600 hover:border-blue-700 shadow-md">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>Use Strategy</span>
              </button>
            </Link>
            <button className="bg-gray-100 text-gray-700 px-6 py-4 rounded-xl hover:bg-gray-200 transition-colors font-medium flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Description */}
        {strategy.description && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">{strategy.description}</p>
          </div>
        )}

        {/* Strategy Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Risk Management */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Risk Management</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Stop Loss</span>
                <span className="text-lg font-bold text-red-600">-{strategy.stopLoss}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Take Profit</span>
                <span className="text-lg font-bold text-green-600">+{strategy.takeProfit}%</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-600">Risk-Reward Ratio</span>
                <span className={`text-lg font-bold ${(strategy.takeProfit / strategy.stopLoss) >= 2 ? 'text-green-600' : (strategy.takeProfit / strategy.stopLoss) >= 1.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {(strategy.takeProfit / strategy.stopLoss).toFixed(1)}:1
                </span>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Usage Stats</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Bots</span>
                <span className="text-lg font-bold text-gray-900">{strategy.botCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm font-medium text-gray-600">{formatDate(strategy.createdAt).split(' at ')[0]}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm font-medium text-gray-600">{formatDate(strategy.updatedAt).split(' at ')[0]}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <Link href={`/bots/create?strategyId=${strategy.id}`}>
                <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                  Create Bot
                </button>
              </Link>
              <button className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm">
                Backtest Strategy
              </button>
              <button className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm">
                Export Configuration
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Entry Conditions */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Entry Conditions</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Entry Configuration Summary</h4>
                <p className="text-sm text-blue-700 font-medium">{renderConditionValue(strategy.entryConditions, 'entry')}</p>
              </div>

              {/* Handle different entry condition formats */}
              {Array.isArray(strategy.entryConditions) && strategy.entryConditions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Active Indicators</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {strategy.entryConditions.map((indicator: string, index: number) => (
                      <div key={index} className="bg-green-50 text-green-800 px-3 py-2 rounded-lg text-sm font-medium">
                        {indicator}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {strategy.entryConditions?.indicators && strategy.entryConditions.indicators.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Active Indicators</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {strategy.entryConditions.indicators.map((indicator: string, index: number) => (
                      <div key={index} className="bg-green-50 text-green-800 px-3 py-2 rounded-lg text-sm font-medium">
                        {indicator}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show individual indicator configurations */}
              {strategy.entryConditions && typeof strategy.entryConditions === 'object' && !Array.isArray(strategy.entryConditions) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">📊 Detailed Indicator Parameters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(strategy.entryConditions).filter(key =>
                      strategy.entryConditions[key] &&
                      typeof strategy.entryConditions[key] === 'object' &&
                      key !== 'indicators'
                    ).map((indicator, index) => {
                      const config = strategy.entryConditions[indicator];
                      return (
                        <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-xs">{indicator.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="font-bold text-green-800 text-lg">{indicator.toUpperCase()}</div>
                          </div>
                          <div className="space-y-2">
                            {Object.entries(config).map(([key, value], i) => (
                              <div key={i} className="flex justify-between items-center py-1 px-2 bg-white rounded border">
                                <span className="text-sm font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span className="text-sm font-bold text-green-700">
                                  {typeof value === 'number' ? value.toFixed(2) : String(value)}
                                  {key.includes('period') && ' days'}
                                  {key.includes('threshold') && key.includes('rsi') && '%'}
                                  {key.includes('percentage') && '%'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Raw Configuration</h4>
                <pre className="text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(strategy.entryConditions, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Exit Conditions */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Exit Conditions</h3>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Configuration</h4>
                <p className="text-sm text-gray-600 mb-3">{renderConditionValue(strategy.exitConditions, 'exit')}</p>
              </div>

              {strategy.exitConditions?.indicators && strategy.exitConditions.indicators.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Active Indicators</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {strategy.exitConditions.indicators.map((indicator: string, index: number) => (
                      <div key={index} className="bg-red-50 text-red-800 px-3 py-2 rounded-lg text-sm font-medium">
                        {indicator}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exit Indicator Parameters */}
              {strategy.exitConditions && typeof strategy.exitConditions === 'object' && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">📈 Exit Indicator Parameters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(strategy.exitConditions).filter(key =>
                      strategy.exitConditions[key] &&
                      typeof strategy.exitConditions[key] === 'object' &&
                      !['stopLoss', 'takeProfit', 'indicators'].includes(key)
                    ).map((indicator, index) => {
                      const config = strategy.exitConditions[indicator];
                      return (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-xs">{indicator.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="font-bold text-red-800 text-lg">{indicator.toUpperCase()}</div>
                          </div>
                          <div className="space-y-2">
                            {Object.entries(config).map(([key, value], i) => (
                              <div key={i} className="flex justify-between items-center py-1 px-2 bg-white rounded border">
                                <span className="text-sm font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span className="text-sm font-bold text-red-700">
                                  {typeof value === 'number' ? value.toFixed(2) : String(value)}
                                  {key.includes('period') && ' days'}
                                  {key.includes('threshold') && key.includes('rsi') && '%'}
                                  {key.includes('percentage') && '%'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Risk Management Display */}
              {(strategy.exitConditions?.stopLoss?.enabled || strategy.exitConditions?.takeProfit?.enabled) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">🛡️ Risk Management Parameters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {strategy.exitConditions.stopLoss?.enabled && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xs">SL</span>
                          </div>
                          <div className="font-bold text-red-800 text-lg">STOP LOSS</div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-1 px-2 bg-white rounded border">
                            <span className="text-sm font-medium text-gray-700">Percentage</span>
                            <span className="text-sm font-bold text-red-700">{strategy.stopLoss}%</span>
                          </div>
                          <div className="flex justify-between items-center py-1 px-2 bg-white rounded border">
                            <span className="text-sm font-medium text-gray-700">Type</span>
                            <span className="text-sm font-bold text-red-700">
                              {strategy.exitConditions.stopLoss.trailingEnabled ? 'Trailing' : 'Fixed'}
                            </span>
                          </div>
                          {strategy.exitConditions.stopLoss.trailingEnabled && strategy.exitConditions.stopLoss.trailingDeviation && (
                            <div className="flex justify-between items-center py-1 px-2 bg-white rounded border">
                              <span className="text-sm font-medium text-gray-700">Trailing Deviation</span>
                              <span className="text-sm font-bold text-red-700">{strategy.exitConditions.stopLoss.trailingDeviation}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {strategy.exitConditions.takeProfit?.enabled && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xs">TP</span>
                          </div>
                          <div className="font-bold text-green-800 text-lg">TAKE PROFIT</div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-1 px-2 bg-white rounded border">
                            <span className="text-sm font-medium text-gray-700">Percentage</span>
                            <span className="text-sm font-bold text-green-700">{strategy.takeProfit}%</span>
                          </div>
                          <div className="flex justify-between items-center py-1 px-2 bg-white rounded border">
                            <span className="text-sm font-medium text-gray-700">Type</span>
                            <span className="text-sm font-bold text-green-700">
                              {strategy.exitConditions.takeProfit.partialTakingEnabled ? 'Partial' : 'Full'}
                            </span>
                          </div>
                          {strategy.exitConditions.takeProfit.partialTakingEnabled && (
                            <>
                              {strategy.exitConditions.takeProfit.firstTarget && (
                                <div className="flex justify-between items-center py-1 px-2 bg-white rounded border">
                                  <span className="text-sm font-medium text-gray-700">First Target</span>
                                  <span className="text-sm font-bold text-green-700">{strategy.exitConditions.takeProfit.firstTarget}%</span>
                                </div>
                              )}
                              {strategy.exitConditions.takeProfit.firstTargetPercentage && (
                                <div className="flex justify-between items-center py-1 px-2 bg-white rounded border">
                                  <span className="text-sm font-medium text-gray-700">First Sell Amount</span>
                                  <span className="text-sm font-bold text-green-700">{strategy.exitConditions.takeProfit.firstTargetPercentage}%</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Raw Configuration</h4>
                <pre className="text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(strategy.exitConditions, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}