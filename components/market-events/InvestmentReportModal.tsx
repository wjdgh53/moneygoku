/**
 * InvestmentReportModal Component
 * Displays consolidated report of all investment opportunities with detailed analysis
 * + AI Bot Recommendations Section
 */

'use client';

import React, { useState, useEffect } from 'react';
import { InvestmentOpportunity } from '@/lib/types/investmentOpportunity';
import { BotRecommendation } from '@/lib/services/aiBotRecommendationService';
import SignalBadge from './SignalBadge';

interface InvestmentReportModalProps {
  opportunities: InvestmentOpportunity[];
  isOpen: boolean;
  onClose: () => void;
}

export default function InvestmentReportModal({
  opportunities,
  isOpen,
  onClose,
}: InvestmentReportModalProps) {
  const [recommendations, setRecommendations] = useState<BotRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [creatingBotSymbol, setCreatingBotSymbol] = useState<string | null>(null);

  // Fetch AI recommendations when modal opens
  useEffect(() => {
    if (isOpen && opportunities.length > 0 && recommendations.length === 0) {
      fetchRecommendations();
    }
  }, [isOpen, opportunities]);

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    setRecommendationsError(null);

    try {
      const response = await fetch('/api/investment-opportunities/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunities }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error: any) {
      console.error('Error fetching bot recommendations:', error);
      setRecommendationsError(error.message);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleCreateBot = async (recommendation: BotRecommendation) => {
    setCreatingBotSymbol(recommendation.symbol);

    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recommendation.botName,
          symbol: recommendation.symbol,
          strategyId: recommendation.strategyId,
          fundAllocation: recommendation.fundAllocation,
          description: `AI Generated Bot: ${recommendation.reasoning}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create bot');
      }

      const result = await response.json();
      alert(`✅ Bot "${recommendation.botName}" created successfully!`);
      console.log('Bot created:', result);
    } catch (error: any) {
      console.error('Error creating bot:', error);
      alert(`❌ Failed to create bot: ${error.message}`);
    } finally {
      setCreatingBotSymbol(null);
    }
  };

  if (!isOpen) return null;

  // Rank badge styling
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return { icon: '🥇', label: '1st', color: 'text-yellow-600' };
      case 2:
        return { icon: '🥈', label: '2nd', color: 'text-gray-600' };
      case 3:
        return { icon: '🥉', label: '3rd', color: 'text-orange-600' };
      default:
        return { icon: '📌', label: `${rank}th`, color: 'text-blue-600' };
    }
  };

  // Confidence badge styling
  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return { color: 'bg-green-100 text-green-800 border-green-300', label: 'High Confidence' };
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Medium Confidence' };
      case 'low':
        return { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Low Confidence' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-300', label: confidence };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl transform transition-all">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2
                  id="modal-title"
                  className="text-3xl font-bold text-white flex items-center space-x-3"
                >
                  <span>📊</span>
                  <span>투자 기회 통합 리포트</span>
                </h2>
                <p className="text-blue-100 mt-1">
                  {opportunities.length}개 종목의 상세 분석
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                aria-label="Close modal"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Body - Scrollable */}
          <div className="max-h-[70vh] overflow-y-auto px-8 py-6">
            {/* AI Bot Recommendations Section */}
            <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl">🤖</span>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    AI 추천 자동 트레이딩 봇
                  </h3>
                  <p className="text-gray-600 text-sm">
                    AI가 분석한 봇 생성 추천 종목 (최대 3개)
                  </p>
                </div>
              </div>

              {loadingRecommendations && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600">AI가 최적의 종목을 분석 중...</span>
                </div>
              )}

              {recommendationsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">❌ {recommendationsError}</p>
                </div>
              )}

              {!loadingRecommendations && !recommendationsError && recommendations.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">ℹ️ AI 추천 봇이 없습니다.</p>
                </div>
              )}

              {!loadingRecommendations && recommendations.length > 0 && (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => {
                    const confidenceBadge = getConfidenceBadge(rec.confidence);
                    const isCreating = creatingBotSymbol === rec.symbol;

                    return (
                      <div
                        key={`${rec.symbol}-${index}`}
                        className="bg-white rounded-xl p-5 border-2 border-purple-100 hover:border-purple-300 transition-all shadow-sm"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl font-bold text-purple-600">
                              #{index + 1}
                            </span>
                            <div>
                              <h4 className="text-xl font-bold text-gray-900">{rec.symbol}</h4>
                              <p className="text-sm text-gray-600 font-medium">{rec.botName}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${confidenceBadge.color}`}>
                            {confidenceBadge.label}
                          </span>
                        </div>

                        {/* Strategy & Fund */}
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-gray-600">전략:</span>
                            <span className="ml-2 font-semibold text-gray-900">{rec.strategyName}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">초기 자금:</span>
                            <span className="ml-2 font-semibold text-green-600">
                              ${rec.fundAllocation.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Reasoning */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            💡 {rec.reasoning}
                          </p>
                        </div>

                        {/* Create Bot Button */}
                        <button
                          onClick={() => handleCreateBot(rec)}
                          disabled={isCreating}
                          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {isCreating ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              <span>봇 생성 중...</span>
                            </>
                          ) : (
                            <>
                              <span>🚀</span>
                              <span>자동으로 봇 만들기</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Original Opportunities List */}
            <div className="space-y-8">
              <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-xl font-bold text-gray-900">전체 투자 기회</h3>
                <span className="text-gray-500">({opportunities.length}개)</span>
              </div>

              {opportunities.map((opportunity, index) => {
                const rankBadge = getRankBadge(opportunity.rank);

                return (
                  <div
                    key={`${opportunity.symbol}-${index}`}
                    className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    {/* Header: Rank + Symbol + Score */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-300">
                      <div className="flex items-center space-x-4">
                        <span className="text-4xl">{rankBadge.icon}</span>
                        <div>
                          <div className="flex items-baseline space-x-3">
                            <h3 className="text-3xl font-bold text-gray-900">
                              {opportunity.symbol}
                            </h3>
                            <span className={`text-lg font-semibold ${rankBadge.color}`}>
                              {rankBadge.label} Place
                            </span>
                          </div>
                          {opportunity.companyName && (
                            <p className="text-gray-600 mt-1">{opportunity.companyName}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 font-medium">Investment Score</div>
                        <div className="text-4xl font-extrabold text-green-600">
                          {opportunity.totalScore.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Active Signals */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Active Signals ({opportunity.signals.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {opportunity.signals.map((signal, signalIndex) => (
                          <SignalBadge
                            key={`${opportunity.symbol}-signal-${signalIndex}`}
                            signal={signal}
                          />
                        ))}
                      </div>
                    </div>

                    {/* AI Investment Thesis */}
                    {opportunity.aiSummary && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xl">🤖</span>
                          <h4 className="text-sm font-semibold text-blue-900">
                            AI Investment Thesis
                          </h4>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {opportunity.aiSummary}
                        </p>
                      </div>
                    )}

                    {/* Price & Volume */}
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                      {opportunity.price && (
                        <div>
                          <span className="font-medium">Price: </span>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(opportunity.price)}
                        </div>
                      )}
                      {opportunity.volume && (
                        <div>
                          <span className="font-medium">Volume: </span>
                          {new Intl.NumberFormat('en-US').format(opportunity.volume)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-100 px-8 py-4 rounded-b-2xl flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
