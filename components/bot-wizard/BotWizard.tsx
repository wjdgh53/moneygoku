'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import StrategySelectionStep from './StrategySelectionStep';

interface BotWizardProps {
  isEdit?: boolean;
  botId?: string;
  initialValues?: {
    name: string;
    symbol: string;
    fundAllocation: number;
    strategyId?: string;
  };
}

export default function BotWizard({ isEdit = false, botId, initialValues }: BotWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Wizard state
  const [strategyId, setStrategyId] = useState<string | null>(
    initialValues?.strategyId || null
  );
  const [botName, setBotName] = useState(initialValues?.name || '');
  const [symbol, setSymbol] = useState(initialValues?.symbol || '');
  const [fundAllocation, setFundAllocation] = useState(initialValues?.fundAllocation || 1000);
  const [isETF, setIsETF] = useState(false);
  const [underlyingAsset, setUnderlyingAsset] = useState('');
  const [extendedHours, setExtendedHours] = useState(false);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!strategyId || !botName || !symbol) {
      alert('모든 필드를 입력해주세요');
      return;
    }

    try {
      setLoading(true);

      const endpoint = isEdit ? `/api/bots/${botId}` : '/api/bots';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: botName,
          symbol,
          fundAllocation,
          strategyId,
          underlyingAsset: isETF ? underlyingAsset : null,
          extendedHours
        })
      });

      if (response.ok) {
        const bot = await response.json();
        router.push(`/bots/${bot.id}`);
      } else {
        throw new Error('Failed to save bot');
      }
    } catch (error) {
      console.error('Error saving bot:', error);
      alert('봇 저장에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return strategyId !== null;
      case 2:
        return botName && symbol;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step labels */}
        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>전략 선택</span>
          <span>봇 설정</span>
          <span>최종 확인</span>
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        {currentStep === 1 && (
          <StrategySelectionStep
            selectedStrategyId={strategyId}
            onSelect={setStrategyId}
          />
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">봇 설정</h2>
              <p className="text-gray-600">봇 이름, 거래 종목 및 할당 자금을 설정하세요</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  봇 이름 *
                </label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: My AAPL Trading Bot"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  거래 종목 (Symbol) *
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: AAPL, TSLA, SPY"
                />
                <p className="text-xs text-gray-500 mt-1">
                  미국 주식 심볼을 입력하세요
                </p>
              </div>

              {/* ETF 체크박스 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isETF}
                    onChange={(e) => {
                      setIsETF(e.target.checked);
                      if (!e.target.checked) {
                        setUnderlyingAsset('');
                      }
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">
                      레버리지 ETF인가요?
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      2x/3x 레버리지 ETF (예: BITX, TSLL, TQQQ)를 거래하는 경우 체크하세요
                    </p>
                  </div>
                </label>
              </div>

              {/* 조건부 기초자산 입력 */}
              {isETF && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    기초 자산 심볼 *
                  </label>
                  <input
                    type="text"
                    value={underlyingAsset}
                    onChange={(e) => setUnderlyingAsset(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: BTC (BITX의 경우), TSLA (TSLL의 경우)"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    뉴스 분석에 사용할 기초 자산의 심볼을 입력하세요
                  </p>
                  <div className="mt-2 text-xs text-gray-700">
                    <div className="font-semibold mb-1">예시:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>BITX (2x Bitcoin) → BTC</li>
                      <li>TSLL (2x Tesla) → TSLA</li>
                      <li>TQQQ (3x Nasdaq) → QQQ</li>
                      <li>SOXL (3x Semiconductor) → SOXX</li>
                    </ul>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  할당 자금
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-600">$</span>
                  <input
                    type="number"
                    value={fundAllocation}
                    onChange={(e) => setFundAllocation(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1000"
                    min="100"
                    step="100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  이 봇에 할당할 초기 자금을 설정하세요
                </p>
              </div>

              {/* 시간외 거래 체크박스 */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={extendedHours}
                    onChange={(e) => setExtendedHours(e.target.checked)}
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">
                      시간외 거래 활성화 (Pre-market & After-hours)
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      장 시작 전(4:00 AM - 9:30 AM ET) 및 장 마감 후(4:00 PM - 8:00 PM ET) 거래 허용
                    </p>
                    <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 rounded p-2">
                      ⚠️ 주의: 시간외 거래는 유동성이 낮아 슬리피지가 클 수 있습니다.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">최종 확인</h2>
              <p className="text-gray-600">모든 설정을 확인하고 봇을 생성하세요</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">봇 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">봇 이름</div>
                    <div className="font-semibold text-gray-900">{botName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">거래 종목</div>
                    <div className="font-semibold text-gray-900">{symbol}</div>
                  </div>
                  {isETF && underlyingAsset && (
                    <div>
                      <div className="text-sm text-gray-600">기초 자산</div>
                      <div className="font-semibold text-gray-900">{underlyingAsset}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-600">할당 자금</div>
                    <div className="font-semibold text-gray-900">${fundAllocation.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">초기 상태</div>
                    <div className="font-semibold text-gray-900">STOPPED</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">시간외 거래</div>
                    <div className="font-semibold text-gray-900">
                      {extendedHours ? '✅ 활성화' : '⏸️ 비활성화'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      페이퍼 트레이딩 모드
                    </h3>
                    <div className="mt-1 text-sm text-green-700">
                      봇은 페이퍼 트레이딩 모드로 시작됩니다. 실제 거래는 활성화 후 가능합니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          이전
        </button>

        {currentStep < 3 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !canProceed()}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>생성 중...</span>
              </>
            ) : (
              <span>{isEdit ? '업데이트' : '봇 생성'}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
