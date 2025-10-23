/**
 * Market Events Dashboard Page
 * Displays 6 categories of real-time market events
 */

'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import InvestmentOpportunitiesSection from '@/components/market-events/InvestmentOpportunitiesSection';
import SenateTradesCard from '@/components/market-events/SenateTradesCard';
import MergersCard from '@/components/market-events/MergersCard';
import RatingChangesCard from '@/components/market-events/RatingChangesCard';
import EarningsCard from '@/components/market-events/EarningsCard';
import StockSplitsCard from '@/components/market-events/StockSplitsCard';
import InsiderTradingCard from '@/components/market-events/InsiderTradingCard';
import MarketMoversCard from '@/components/market-events/MarketMoversCard';
import { MarketEventsResponse } from '@/lib/types/marketEvents';

export default function MarketEventsPage() {
  const [data, setData] = useState<MarketEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchMarketEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/market-events');

      if (!response.ok) {
        throw new Error(`Failed to fetch market events: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching market events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketEvents();
  }, []);

  const handleRefresh = () => {
    fetchMarketEvents();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">시장 이벤트 대시보드</h1>
            <p className="text-gray-600 mt-1">
              실시간 시장 이벤트와 추천 종목
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {!loading && data && (
              <p className="text-sm text-gray-500">
                마지막 업데이트: {lastRefresh.toLocaleTimeString('ko-KR')}
              </p>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{loading ? '새로고침 중...' : '새로고침'}</span>
            </button>
          </div>
        </div>

        {/* Investment Opportunities Section */}
        <InvestmentOpportunitiesSection />

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-red-800 font-medium">시장 이벤트 로딩 실패</p>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse"
              >
                <div className="h-16 bg-gray-300" />
                <div className="p-6 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Market Events Grid */}
        {!loading && data && (
          <>
            <div className="pt-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Market Event Categories</h2>
              <p className="text-gray-600 mb-6">
                Detailed breakdown of market events by category
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SenateTradesCard trades={data.senateTrading} />
              <MergersCard mergers={data.mergersAcquisitions} />
              <RatingChangesCard ratings={data.analystRatings} />
              <EarningsCard earnings={data.upcomingEarnings} />
              <StockSplitsCard splits={data.stockSplits} />
              <InsiderTradingCard trades={data.insiderTrading} />
              <MarketMoversCard movers={data.marketMovers} />
            </div>
          </>
        )}

        {/* Metadata */}
        {!loading && data && data.metadata && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Data Sources: {data.metadata.categories} categories
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Fetched at: {new Date(data.metadata.fetchedAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center space-x-4 text-xs">
                {Object.entries(data.metadata.cacheStatus).map(([key, cached]) => (
                  <div
                    key={key}
                    className="flex items-center space-x-1"
                    title={cached ? 'Cached data' : 'Fresh data'}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        cached ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                    />
                    <span className="text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
