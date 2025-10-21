'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { TradeView } from '@/app/api/trades/history/route';
import PositionCard, { Position } from '@/components/trades/PositionCard';
import TradeLogTable from '@/components/trades/TradeLogTable';
import TradeFilters, { TradeFiltersState } from '@/components/trades/TradeFilters';

interface TradeHistoryResponse {
  trades: TradeView[];
  summary: {
    totalTrades: number;
    totalVolume: number;
    completedTrades: number;
    failedTrades: number;
    pendingTrades: number;
    buyTrades: number;
    sellTrades: number;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface PositionsResponse {
  positions: Position[];
  total: number;
  totalMarketValue: number;
  totalUnrealizedPL: number;
}

export default function TradesPage() {
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<TradeView[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = useState<TradeFiltersState>({
    source: 'all'
  });

  // Available bots for filter
  const [availableBots, setAvailableBots] = useState<{ id: string; name: string }[]>([]);

  // Summary stats
  const [positionsSummary, setPositionsSummary] = useState({
    totalMarketValue: 0,
    totalUnrealizedPL: 0
  });

  // Load positions
  const loadPositions = async () => {
    try {
      setIsLoadingPositions(true);
      setError(null);

      const response = await fetch('/api/trades/positions');
      const data: PositionsResponse = await response.json();

      if (!response.ok) {
        throw new Error(('error' in data ? data.error : null) as string || 'Failed to fetch positions');
      }

      setPositions(data.positions);
      setPositionsSummary({
        totalMarketValue: data.totalMarketValue,
        totalUnrealizedPL: data.totalUnrealizedPL
      });

    } catch (error: any) {
      console.error('Error loading positions:', error);
      setError(error.message);
      setPositions([]);
    } finally {
      setIsLoadingPositions(false);
    }
  };

  // Load trade history
  const loadTradeHistory = async () => {
    try {
      setIsLoadingTrades(true);
      setError(null);

      const params = new URLSearchParams({
        source: filters.source,
        limit: '50',
        offset: '0'
      });

      if (filters.botId) params.append('botId', filters.botId);
      if (filters.symbol) params.append('symbol', filters.symbol);

      const response = await fetch(`/api/trades/history?${params}`);
      const data: TradeHistoryResponse = await response.json();

      if (!response.ok) {
        throw new Error(('error' in data ? data.error : null) as string || 'Failed to fetch trade history');
      }

      setTrades(data.trades);
      setSummary(data.summary);

    } catch (error: any) {
      console.error('Error loading trade history:', error);
      setError(error.message);
      setTrades([]);
    } finally {
      setIsLoadingTrades(false);
    }
  };

  // Load available bots for filter
  const loadBots = async () => {
    try {
      const response = await fetch('/api/bots');
      if (response.ok) {
        const data = await response.json();
        setAvailableBots(data.bots?.map((bot: any) => ({ id: bot.id, name: bot.name })) || []);
      }
    } catch (error) {
      console.error('Error loading bots:', error);
    }
  };

  // Close position handler
  const handleClosePosition = async (symbol: string, quantity: number) => {
    try {
      const response = await fetch('/api/trades/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbol, quantity })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to close position');
      }

      alert(`✅ ${result.message}`);

      // Reload positions after successful close
      loadPositions();

    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  // Sync trades handler
  const handleSyncTrades = async () => {
    try {
      const response = await fetch('/api/trades/history', {
        method: 'POST'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync trades');
      }

      alert(`🔄 ${result.message}`);
      loadTradeHistory(); // Reload after sync

    } catch (error: any) {
      alert(`❌ Sync Error: ${error.message}`);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadPositions();
    loadBots();
  }, []);

  // Load trade history when filters change
  useEffect(() => {
    if (activeTab === 'history') {
      loadTradeHistory();
    }
  }, [filters, activeTab]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">거래 관리</h1>
          <p className="text-gray-600">포지션과 거래 내역을 관리합니다</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 font-medium">오류 발생</div>
            <div className="text-red-600 text-sm mt-1">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 text-sm mt-2 underline"
            >
              닫기
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('positions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'positions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                오픈 포지션 ({positions.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                거래 로그 ({summary.totalTrades || 0})
              </button>
            </nav>
          </div>
        </div>

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div>
            {/* Position Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="text-sm font-medium text-gray-600">총 포지션</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{positions.length}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="text-sm font-medium text-gray-600">총 시장 가치</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  ${positionsSummary.totalMarketValue.toFixed(2)}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="text-sm font-medium text-gray-600">미실현 손익</div>
                <div className={`text-2xl font-bold mt-1 ${
                  positionsSummary.totalUnrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${positionsSummary.totalUnrealizedPL.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Positions List */}
            {isLoadingPositions ? (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="animate-pulse p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ) : positions.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                <div className="text-gray-500 text-lg mb-2">현재 오픈된 포지션이 없습니다</div>
                <div className="text-gray-400 text-sm">봇이 거래를 실행하면 포지션이 여기에 표시됩니다</div>
                <button
                  onClick={loadPositions}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  새로 고침
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종목</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수량</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균단가</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">현재가</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시장가치</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">미실현 손익</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수익률</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {positions.map((position) => {
                      const averagePrice = position.entryPrice || 0;
                      const currentPrice = position.currentPrice || 0;
                      const unrealizedPL = currentPrice
                        ? (currentPrice - averagePrice) * position.quantity
                        : 0;
                      const unrealizedPLPercent = averagePrice > 0
                        ? ((currentPrice - averagePrice) / averagePrice) * 100
                        : 0;
                      const marketValue = currentPrice * position.quantity;

                      return (
                        <tr key={position.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{position.symbol}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{position.quantity}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">${averagePrice.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">${currentPrice.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">${marketValue.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${unrealizedPL.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${unrealizedPLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {unrealizedPLPercent >= 0 ? '+' : ''}{unrealizedPLPercent.toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleClosePosition(position.symbol, position.quantity)}
                              className="text-red-600 hover:text-red-900"
                            >
                              청산
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Trade History Tab */}
        {activeTab === 'history' && (
          <div>
            {/* Trade Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="text-xs font-medium text-gray-600">총 거래</div>
                <div className="text-lg font-bold text-gray-900 mt-1">{summary.totalTrades || 0}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="text-xs font-medium text-gray-600">총 거래량</div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  ${(summary.totalVolume || 0).toFixed(0)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="text-xs font-medium text-gray-600">매수/매도</div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {summary.buyTrades || 0}/{summary.sellTrades || 0}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="text-xs font-medium text-gray-600">성공률</div>
                <div className="text-lg font-bold text-green-600 mt-1">
                  {summary.totalTrades > 0
                    ? `${Math.round((summary.completedTrades / summary.totalTrades) * 100)}%`
                    : '0%'
                  }
                </div>
              </div>
            </div>

            {/* Filters */}
            <TradeFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableBots={availableBots}
            />

            {/* Sync Button */}
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleSyncTrades}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>데이터 동기화</span>
              </button>
            </div>

            {/* Trade Log Table */}
            <TradeLogTable trades={trades} isLoading={isLoadingTrades} />
          </div>
        )}
      </div>
    </Layout>
  );
}