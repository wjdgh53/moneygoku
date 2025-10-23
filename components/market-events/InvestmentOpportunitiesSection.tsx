/**
 * InvestmentOpportunitiesSection Component
 * Main section displaying top investment opportunities with filtering and auto-refresh
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { InvestmentOpportunity, InvestmentOpportunityResponse } from '@/lib/types/investmentOpportunity';
import InvestmentOpportunityCard from './InvestmentOpportunityCard';
import InvestmentReportModal from './InvestmentReportModal';

interface FilterOptions {
  minScore: number;
  limit: number;
}

export default function InvestmentOpportunitiesSection() {
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    minScore: 2,
    limit: 12,
  });

  // Fetch opportunities
  const fetchOpportunities = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: filters.limit.toString(),
        minScore: filters.minScore.toString(),
        includeAI: 'true',
        ...(forceRefresh && { forceRefresh: 'true' }),
      });

      const response = await fetch(`/api/investment-opportunities?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch opportunities: ${response.statusText}`);
      }

      const data: InvestmentOpportunityResponse = await response.json();
      setOpportunities(data.opportunities);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load investment opportunities');
      console.error('Error fetching investment opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.limit, filters.minScore]);

  // Initial fetch
  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Manual refresh
  const handleRefresh = () => {
    fetchOpportunities(true);
  };

  // Filter handlers
  const handleMinScoreChange = (newScore: number) => {
    setFilters(prev => ({ ...prev, minScore: newScore }));
  };

  const handleLimitChange = (newLimit: number) => {
    setFilters(prev => ({ ...prev, limit: newLimit }));
  };

  return (
    <div className="bg-gradient-to-r from-yellow-50 via-green-50 to-blue-50 rounded-2xl p-8 shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <span>🎯</span>
              <span>AI 추천 종목</span>
            </h2>
            <p className="text-gray-600 mt-1">
              여러 시장 시그널을 종합한 AI 기반 투자 기회
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {!loading && (
              <p className="text-sm text-gray-500">
                업데이트: {lastRefresh.toLocaleTimeString('ko-KR')}
              </p>
            )}

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
              aria-label="필터 토글"
              aria-expanded={showFilters}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span>필터</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
              aria-label="새로고침"
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

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4 animate-slide-down">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Min Score Filter */}
              <div>
                <label
                  htmlFor="minScore"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  최소 점수: {filters.minScore}점
                </label>
                <input
                  id="minScore"
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={filters.minScore}
                  onChange={(e) => handleMinScoreChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  aria-label="최소 투자 점수"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2점</span>
                  <span>10점</span>
                </div>
              </div>

              {/* Limit Filter */}
              <div>
                <label
                  htmlFor="limit"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  표시 개수: {filters.limit}개
                </label>
                <select
                  id="limit"
                  value={filters.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="표시할 결과 개수"
                >
                  <option value="6">6개</option>
                  <option value="12">12개</option>
                  <option value="24">24개</option>
                  <option value="50">50개</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
          role="alert"
          aria-live="polite"
        >
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
            <p className="text-red-800 font-medium">투자 기회 로딩 실패</p>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && opportunities.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse"
            >
              <div className="h-16 bg-gradient-to-r from-gray-200 to-gray-300" />
              <div className="p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2" />
                <div className="h-20 bg-gray-100 rounded" />
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded w-20" />
                  <div className="h-6 bg-gray-200 rounded w-24" />
                  <div className="h-6 bg-gray-200 rounded w-16" />
                </div>
                <div className="h-16 bg-gray-100 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && opportunities.length === 0 && (
        <div className="text-center py-16" role="status" aria-live="polite">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            투자 기회를 찾을 수 없습니다
          </h3>
          <p className="text-gray-500 mb-4">
            필터를 조정하거나 나중에 다시 확인해주세요
          </p>
          <button
            onClick={handleRefresh}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            데이터 새로고침
          </button>
        </div>
      )}

      {/* Opportunities Grid */}
      {!loading && !error && opportunities.length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          role="list"
          aria-label="Investment opportunities"
        >
          {opportunities.map((opportunity, index) => (
            <div
              key={`${opportunity.symbol}-${index}`}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
              role="listitem"
            >
              <InvestmentOpportunityCard opportunity={opportunity} />
            </div>
          ))}
        </div>
      )}

      {/* Results Count & Report Button */}
      {!loading && !error && opportunities.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="text-center">
            <button
              onClick={() => setIsReportOpen(true)}
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-lg hover:shadow-xl"
              aria-label="통합 리포트 보기"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>📊 통합 리포트 보기</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {opportunities.length}개 종목
              </span>
            </button>
          </div>
          <div className="text-center text-sm text-gray-600">
            Showing {opportunities.length} investment opportunit{opportunities.length === 1 ? 'y' : 'ies'}
          </div>
        </div>
      )}

      {/* Investment Report Modal */}
      <InvestmentReportModal
        opportunities={opportunities}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
