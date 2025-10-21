'use client';

import { useState, useEffect } from 'react';
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

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      console.log('📋 Fetching strategies from database...');
      const response = await fetch('/api/strategies');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Received strategies:', data);
        setStrategies(data.strategies || data);
      }
    } catch (error) {
      console.error('💥 Failed to fetch strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStrategy = async (strategyId: string, strategyName: string) => {
    if (!confirm(`Are you sure you want to delete "${strategyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting strategy:', strategyId);
      const response = await fetch(`/api/strategies/${strategyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('✅ Strategy deleted successfully');
        // Remove from UI
        setStrategies(strategies.filter(s => s.id !== strategyId));
      } else {
        const error = await response.json();
        alert(`Failed to delete strategy: ${error.error}`);
      }
    } catch (error) {
      console.error('💥 Error deleting strategy:', error);
      alert('Failed to delete strategy');
    }
  };

  const getStrategyIcon = (name: string) => {
    const firstLetter = name.charAt(0).toUpperCase();
    const colors: { [key: string]: string } = {
      'S': 'bg-purple-500',
      'R': 'bg-blue-500',
      'M': 'bg-green-500',
      'B': 'bg-orange-500',
      'T': 'bg-red-500',
      'V': 'bg-indigo-500',
    };
    return {
      letter: firstLetter,
      color: colors[firstLetter] || 'bg-gray-500'
    };
  };

  const getStrategyMetrics = (strategy: Strategy) => {
    // Mock metrics - in real app these would come from backtesting/performance data
    const winRate = Math.floor(Math.random() * 30) + 50; // 50-80%
    const avgReturn = (Math.random() * 20 - 5).toFixed(2); // -5% to +15%
    const sharpeRatio = (Math.random() * 2 + 0.5).toFixed(2); // 0.5 to 2.5
    const maxDrawdown = (Math.random() * 15 + 5).toFixed(1); // 5% to 20%

    return {
      winRate,
      avgReturn,
      sharpeRatio,
      maxDrawdown,
      botsUsing: strategy.botCount || 0
    };
  };

  const getStrategyType = (entryConditions: any) => {
    if (entryConditions?.indicators) {
      return entryConditions.indicators.join(', ') + ' Strategy';
    }
    if (entryConditions?.type) {
      return entryConditions.type;
    }
    return 'Technical Analysis';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cash</p>
                <p className="text-2xl font-bold text-gray-900">$8,794,560</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Portfolio</p>
                <p className="text-2xl font-bold text-gray-900">$911,340,030</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Returns</p>
                <p className="text-2xl font-bold text-green-600">$2.81</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Strategies</h2>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage your trading strategies
            </p>
          </div>
          <Link href="/strategies/create">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Create New Strategy</span>
            </button>
          </Link>
        </div>



        {/* Database Strategy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))
          ) : strategies.length === 0 ? (
            // Empty state
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies yet</h3>
              <p className="text-gray-500 mb-4">Create your first trading strategy to get started</p>
              <Link href="/strategies/create">
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Create Strategy
                </button>
              </Link>
            </div>
          ) : (
            // Real strategy cards
            strategies.map((strategy) => {
              const icon = getStrategyIcon(strategy.name);
              const metrics = getStrategyMetrics(strategy);
              const strategyType = getStrategyType(strategy.entryConditions);

              return (
                <div key={strategy.id} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${icon.color} shadow-md`}>
                        <span className="text-white font-bold text-xl">{icon.letter}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{strategy.name}</h3>
                        <p className="text-xs text-gray-500">{strategyType}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStrategy(strategy.id, strategy.name);
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                      title="Delete strategy"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      <span className="text-xs text-gray-600 ml-1">Created</span>
                    </div>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-600">{metrics.botsUsing} bot{metrics.botsUsing !== 1 ? 's' : ''} using</span>
                  </div>

                  {/* Risk Management Display */}
                  <div className="space-y-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-600">Risk Management</span>
                        <span className="text-xs text-blue-600 font-medium">
                          {(strategy.takeProfit / strategy.stopLoss).toFixed(1)}:1 R/R
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-red-600">-{strategy.stopLoss}% SL</span>
                        </div>
                        <div>
                          <span className="text-green-600">+{strategy.takeProfit}% TP</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-gray-600">Created</span>
                        <p className="text-sm font-medium text-gray-900">{formatDate(strategy.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Entry Indicators</span>
                        <p className="text-sm font-medium text-blue-600">
                          {strategy.entryConditions?.indicators?.length || 0} active
                        </p>
                      </div>
                    </div>

                    {strategy.description && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                          {strategy.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Link href={`/strategies/${strategy.id}`}>
                      <button className="flex-1 bg-gray-50 text-gray-700 text-sm py-2.5 px-4 rounded-lg hover:bg-gray-100 transition-colors font-medium">
                        View Details
                      </button>
                    </Link>
                    <Link href={`/bots/create?strategyId=${strategy.id}`}>
                      <button className="flex-1 bg-blue-600 text-white text-sm py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-bold">
                        Use Strategy
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}