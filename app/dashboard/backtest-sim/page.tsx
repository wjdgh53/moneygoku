/**
 * Backtest Simulation Dashboard
 *
 * Creates and monitors backtests with real-time streaming updates
 */

'use client';

import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { RealTimeProgress } from '@/components/backtest/RealTimeProgress';

interface QuickStartTemplate {
  name: string;
  description: string;
  symbol: string;
  months: number;
  initialCash: number;
  positionSize: number;
  risk: 'low' | 'medium' | 'high';
}

const templates: QuickStartTemplate[] = [
  {
    name: '보수적',
    description: 'AAPL • 3개월 • 낮은 위험',
    symbol: 'AAPL',
    months: 3,
    initialCash: 10000,
    positionSize: 2000,
    risk: 'low',
  },
  {
    name: '균형잡힌',
    description: 'MSFT • 6개월 • 중간 위험',
    symbol: 'MSFT',
    months: 6,
    initialCash: 10000,
    positionSize: 3000,
    risk: 'medium',
  },
  {
    name: '공격적',
    description: 'NVDA • 12개월 • 높은 위험',
    symbol: 'NVDA',
    months: 12,
    initialCash: 10000,
    positionSize: 4000,
    risk: 'high',
  },
];

export default function BacktestSimPage() {
  const [backtestRunId, setBacktestRunId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    symbol: 'AAPL',
    startDate: '2024-01-01',
    endDate: '2024-04-10',
    initialCash: 10000,
    positionSizing: 'FIXED_DOLLAR',
    positionSize: 2000,
    slippageBps: 10,
    commissionPerTrade: 1.0,
  });

  const applyTemplate = (template: QuickStartTemplate) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - template.months);

    setFormData({
      ...formData,
      symbol: template.symbol,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      initialCash: template.initialCash,
      positionSize: template.positionSize,
    });
  };

  const startBacktest = async () => {
    setError(null);
    setIsRunning(true);

    try {
      const response = await fetch('/api/backtests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: 'cmhb3y7n800008ot07qsc587b', // Test strategy from our script
          symbol: formData.symbol,
          timeHorizon: 'SWING',
          startDate: formData.startDate,
          endDate: formData.endDate,
          initialCash: formData.initialCash,
          positionSizing: formData.positionSizing,
          positionSize: formData.positionSize,
          slippageBps: formData.slippageBps,
          commissionPerTrade: formData.commissionPerTrade,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start backtest');
      }

      const result = await response.json();
      setBacktestRunId(result.backtestRunId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsRunning(false);
    }
  };

  const handleComplete = () => {
    setIsRunning(false);
  };

  const resetForm = () => {
    setBacktestRunId(null);
    setIsRunning(false);
    setError(null);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">백테스트 시뮬레이터</h1>
          <p className="text-gray-600 mt-2">
            실제 투자 전에 과거 데이터로 전략을 테스트해보세요
          </p>
        </div>

        {/* Explanation Section */}
        {!backtestRunId && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              💡 실제 돈 없이 전략을 테스트하세요
            </h2>
            <p className="text-gray-700 mb-4">
              백테스트는 과거 시장 데이터로 거래 전략을 시뮬레이션합니다.
              실제 돈을 투자하기 전에 수익률, 승률, 위험도를 미리 확인할 수 있습니다.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl mb-1">📊</div>
                <div className="text-sm font-medium text-gray-900">과거 성과 분석</div>
                <div className="text-xs text-gray-500 mt-1">수익률과 승률 확인</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl mb-1">⚠️</div>
                <div className="text-sm font-medium text-gray-900">리스크 측정</div>
                <div className="text-xs text-gray-500 mt-1">최대 손실폭 파악</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl mb-1">✅</div>
                <div className="text-sm font-medium text-gray-900">전략 검증</div>
                <div className="text-xs text-gray-500 mt-1">실전 전 확신 확보</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Start Templates */}
        {!backtestRunId && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">🚀 빠른 시작 템플릿</h3>
            <p className="text-sm text-gray-600 mb-4">
              초보자라면 템플릿으로 시작해보세요. 한 번의 클릭으로 설정이 자동 입력됩니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.name}
                  onClick={() => applyTemplate(template)}
                  className={`p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all ${
                    formData.symbol === template.symbol &&
                    formData.initialCash === template.initialCash
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">{template.name}</div>
                  <div className="text-xs text-gray-500 mb-2">{template.description}</div>
                  <div className="flex items-center justify-center space-x-1">
                    {template.risk === 'low' && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                      </>
                    )}
                    {template.risk === 'medium' && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                      </>
                    )}
                    {template.risk === 'high' && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Configuration Form */}
        {!backtestRunId && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">백테스트 설정</h2>

            {/* Basic Settings */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                기본 설정
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종목 심볼
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="AAPL"
                  />
                  <p className="text-xs text-gray-500 mt-1">예: AAPL, MSFT, TSLA</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    초기 자금
                  </label>
                  <input
                    type="number"
                    value={formData.initialCash}
                    onChange={(e) =>
                      setFormData({ ...formData, initialCash: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">시뮬레이션 시작 금액 (USD)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작 날짜
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료 날짜
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Settings (Collapsible) */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-left text-sm font-semibold text-gray-700 uppercase tracking-wide"
              >
                <span>고급 설정</span>
                <svg
                  className={`w-5 h-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      포지션 크기 방식
                      <span className="ml-1 text-xs text-gray-500">
                        ℹ️ 각 거래의 투자 금액 결정 방법
                      </span>
                    </label>
                    <select
                      value={formData.positionSizing}
                      onChange={(e) =>
                        setFormData({ ...formData, positionSizing: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="FIXED_DOLLAR">고정 금액 (Fixed Dollar)</option>
                      <option value="FIXED_SHARES">고정 주식 수 (Fixed Shares)</option>
                      <option value="PERCENT_EQUITY">자본 비율 (% of Equity)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.positionSizing === 'FIXED_DOLLAR' &&
                        '매 거래마다 같은 금액을 투자합니다'}
                      {formData.positionSizing === 'FIXED_SHARES' &&
                        '매 거래마다 같은 주식 수를 매수합니다'}
                      {formData.positionSizing === 'PERCENT_EQUITY' &&
                        '총 자본의 일정 비율을 투자합니다'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      포지션 크기
                      <span className="ml-1 text-xs text-gray-500">
                        ℹ️ 각 거래의 투자 규모
                      </span>
                    </label>
                    <input
                      type="number"
                      value={formData.positionSize}
                      onChange={(e) =>
                        setFormData({ ...formData, positionSize: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.positionSizing === 'FIXED_DOLLAR' &&
                        `거래당 $${formData.positionSize.toLocaleString()} 투자`}
                      {formData.positionSizing === 'FIXED_SHARES' &&
                        `거래당 ${formData.positionSize}주 매수`}
                      {formData.positionSizing === 'PERCENT_EQUITY' &&
                        `자본의 ${formData.positionSize}% 투자`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      슬리피지 (Slippage)
                      <span className="ml-1 text-xs text-gray-500">
                        ℹ️ 예상 가격과 실제 체결 가격의 차이 (Basis Points)
                      </span>
                    </label>
                    <input
                      type="number"
                      value={formData.slippageBps}
                      onChange={(e) =>
                        setFormData({ ...formData, slippageBps: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      기본값: 10 bps (0.1%). 높을수록 더 현실적
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      거래 수수료
                      <span className="ml-1 text-xs text-gray-500">
                        ℹ️ 거래당 수수료 (USD)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.commissionPerTrade}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          commissionPerTrade: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      기본값: $1.00 (대부분 브로커의 평균)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm font-semibold mb-1">⚠️ 오류 발생</p>
                <p className="text-red-700 text-sm">{error}</p>
                {error.includes('No historical data') && (
                  <p className="text-red-600 text-xs mt-2">
                    💡 시스템이 자동으로 데이터를 불러오려 했으나 실패했습니다.
                    다른 종목을 시도하거나 날짜 범위를 조정해보세요.
                  </p>
                )}
              </div>
            )}

            {isRunning && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <div>
                    <p className="text-blue-800 text-sm font-semibold">
                      백테스트 준비 중...
                    </p>
                    <p className="text-blue-600 text-xs mt-1">
                      데이터가 캐시되지 않은 경우 API에서 자동으로 불러옵니다 (최대 30초 소요)
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={startBacktest}
                disabled={isRunning}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRunning ? '⏳ 데이터 준비 및 실행 중...' : '🚀 백테스트 시작'}
              </button>
            </div>
          </div>
        )}

        {/* Results Preview Info */}
        {!backtestRunId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              📊 백테스트 결과로 알 수 있는 것
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
              <div className="flex items-center space-x-2">
                <span>✓</span>
                <span>총 수익률과 손익 금액</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>✓</span>
                <span>승률과 평균 수익/손실</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>✓</span>
                <span>샤프 비율 (위험 대비 수익)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>✓</span>
                <span>최대 낙폭 (Max Drawdown)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>✓</span>
                <span>자산 변화 그래프</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>✓</span>
                <span>거래별 상세 내역</span>
              </div>
            </div>
          </div>
        )}

        {/* Real-Time Progress */}
        {backtestRunId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">백테스트 진행 중</h2>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                새 백테스트
              </button>
            </div>

            <RealTimeProgress
              backtestRunId={backtestRunId}
              onComplete={handleComplete}
            />

            {/* View Results Button */}
            {!isRunning && (
              <div className="flex justify-center">
                <a
                  href={`/dashboard/backtests/${backtestRunId}`}
                  className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  📈 상세 결과 보기 →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
