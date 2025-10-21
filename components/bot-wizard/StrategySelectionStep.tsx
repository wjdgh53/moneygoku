'use client';

import React, { useEffect, useState } from 'react';

interface Strategy {
  id: string;
  name: string;
  description: string;
  timeHorizon: string;
  riskAppetite: string;
  entryConditions: any;
  exitConditions: any;
  stopLoss: number;
  takeProfit: number;
}

interface StrategySelectionStepProps {
  selectedStrategyId: string | null;
  onSelect: (strategyId: string) => void;
}

export default function StrategySelectionStep({
  selectedStrategyId,
  onSelect
}: StrategySelectionStepProps) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/strategies');
      const data = await response.json();
      setStrategies(data);
    } catch (error) {
      console.error('Failed to fetch strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">생성된 전략이 없습니다</h3>
        <p className="text-gray-600 mb-4">먼저 전략을 생성해주세요</p>
        <a
          href="/strategies"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          전략 생성하기
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">전략 선택</h2>
        <p className="text-gray-600">
          사용할 트레이딩 전략을 선택하세요
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {strategies.map((strategy) => {
          const isSelected = selectedStrategyId === strategy.id;
          const entryConditions = strategy.entryConditions || {};
          const exitConditions = strategy.exitConditions || {};

          return (
            <button
              key={strategy.id}
              onClick={() => onSelect(strategy.id)}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-200 text-left
                ${isSelected
                  ? 'border-blue-600 bg-blue-50 shadow-lg transform scale-105'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                }
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Strategy Info */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {strategy.name}
                </h3>
                {strategy.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {strategy.description}
                  </p>
                )}
              </div>

              {/* Profile Badges */}
              <div className="flex gap-2 mb-4">
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  {strategy.timeHorizon === 'SHORT_TERM' ? '단기' :
                   strategy.timeHorizon === 'SWING' ? '중기' : '장기'}
                </span>
                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                  {strategy.riskAppetite === 'DEFENSIVE' ? '보수적' :
                   strategy.riskAppetite === 'BALANCED' ? '균형' : '공격적'}
                </span>
              </div>

              {/* Risk Management */}
              <div className="bg-white bg-opacity-50 rounded-lg p-3 mb-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">손절:</span>
                  <span className="font-semibold text-red-600">-{strategy.stopLoss}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">익절:</span>
                  <span className="font-semibold text-green-600">+{strategy.takeProfit}%</span>
                </div>
              </div>

              {/* Technical Indicators */}
              {entryConditions.indicators && (
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs text-gray-500 mb-2">기술 지표</p>
                  <div className="flex justify-around text-xs">
                    <div>
                      <div className="text-gray-500">RSI</div>
                      <div className="font-semibold">{entryConditions.indicators.rsiPeriod || 14}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">MA</div>
                      <div className="font-semibold">{entryConditions.indicators.maPeriod || 50}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">BB</div>
                      <div className="font-semibold">{entryConditions.indicators.bbPeriod || 20}</div>
                    </div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
