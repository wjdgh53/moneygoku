'use client';

import React, { useEffect, useState } from 'react';
import { TimeHorizon, RiskAppetite, MergedConfig } from './types';

interface CombinationPreviewStepProps {
  timeHorizon: TimeHorizon;
  riskAppetite: RiskAppetite;
}

export default function CombinationPreviewStep({
  timeHorizon,
  riskAppetite
}: CombinationPreviewStepProps) {
  const [mergedConfig, setMergedConfig] = useState<MergedConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMergedConfig();
  }, [timeHorizon, riskAppetite]);

  const fetchMergedConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/strategy-options');
      const data = await response.json();

      // Find the selected options
      const thOption = data.timeHorizons.find((th: any) => th.value === timeHorizon);
      const raOption = data.riskAppetites.find((ra: any) => ra.value === riskAppetite);
      const combinationKey = `${timeHorizon}_${riskAppetite}`;
      const combinationInfo = data.combinationMatrix[combinationKey];

      // Merge configurations
      const merged: MergedConfig = {
        timeHorizon: thOption,
        riskAppetite: raOption,
        combination: combinationInfo,
        mergedParams: {
          interval: thOption.interval,
          candleStick: thOption.candleStick,
          executionFrequency: thOption.executionFrequency,
          lookbackPeriod: thOption.lookbackPeriod,
          stopLoss: raOption.stopLoss,
          takeProfit: raOption.takeProfit,
          maxPositionSize: raOption.maxPositionSize,
          kellyFraction: raOption.kellyFraction,
          rebalanceThreshold: raOption.rebalanceThreshold,
          indicators: thOption.indicators
        }
      };

      setMergedConfig(merged);
    } catch (error) {
      console.error('Failed to fetch merged config:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !mergedConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">전략 조합 미리보기</h2>
        <p className="text-gray-600">
          선택하신 조합의 상세 설정을 확인하세요
        </p>
      </div>

      {/* Warning if not recommended */}
      {!mergedConfig.combination.recommended && mergedConfig.combination.warning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">주의:</span> {mergedConfig.combination.warning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected combination summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">투자 기간</h3>
            <div className="text-2xl font-bold text-blue-600">{mergedConfig.timeHorizon.name}</div>
            <p className="text-sm text-gray-600 mt-1">{mergedConfig.timeHorizon.description}</p>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">리스크 성향</h3>
            <div className="text-2xl font-bold text-purple-600">{mergedConfig.riskAppetite.name}</div>
            <p className="text-sm text-gray-600 mt-1">{mergedConfig.riskAppetite.description}</p>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">적합한 투자자</h3>
          <p className="text-gray-900">{mergedConfig.combination.suitableFor}</p>
        </div>
      </div>

      {/* Detailed parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time-based parameters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            시간 기반 설정
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">실행 주기</span>
              <span className="text-sm font-semibold text-gray-900">{mergedConfig.mergedParams.executionFrequency}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">데이터 간격</span>
              <span className="text-sm font-semibold text-gray-900">{mergedConfig.mergedParams.interval}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">캔들 간격</span>
              <span className="text-sm font-semibold text-gray-900">{mergedConfig.mergedParams.candleStick}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">분석 기간</span>
              <span className="text-sm font-semibold text-gray-900">{mergedConfig.mergedParams.lookbackPeriod}</span>
            </div>
          </div>
        </div>

        {/* Risk-based parameters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            리스크 관리 설정
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">손절</span>
              <span className="text-sm font-semibold text-red-600">-{mergedConfig.mergedParams.stopLoss}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">익절</span>
              <span className="text-sm font-semibold text-green-600">+{mergedConfig.mergedParams.takeProfit}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">최대 포지션</span>
              <span className="text-sm font-semibold text-gray-900">{(mergedConfig.mergedParams.maxPositionSize * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Kelly Fraction</span>
              <span className="text-sm font-semibold text-gray-900">
                {mergedConfig.mergedParams.kellyFraction === 0.125 ? '1/8' :
                 mergedConfig.mergedParams.kellyFraction === 0.25 ? '1/4' : '1/2'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">리밸런싱 임계값</span>
              <span className="text-sm font-semibold text-gray-900">±{(mergedConfig.mergedParams.rebalanceThreshold * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Technical indicators */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          기술 지표 설정
        </h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600 mb-1">RSI Period</div>
            <div className="text-2xl font-bold text-indigo-600">{mergedConfig.mergedParams.indicators.rsiPeriod}</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600 mb-1">MA Period</div>
            <div className="text-2xl font-bold text-indigo-600">{mergedConfig.mergedParams.indicators.maPeriod}</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600 mb-1">BB Period</div>
            <div className="text-2xl font-bold text-indigo-600">{mergedConfig.mergedParams.indicators.bbPeriod}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
