'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import InvestmentProfileStep from './steps/InvestmentProfileStep';
import EntryConditionsStep from './steps/EntryConditionsStep';
import ExitConditionsStep from './steps/ExitConditionsStep';
import CreateStrategyStep from './steps/CreateStrategyStep';

export interface StrategyFormData {
  // Investment Profile
  timeHorizon?: 'SHORT_TERM' | 'SWING' | 'LONG_TERM';
  riskAppetite?: 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE';

  // Asset Step
  asset: string;
  exchange: string;

  // Trade Parameters Step
  fundAllocation: number;
  entryOrderType: 'MARKET' | 'LIMIT';
  exitOrderType: 'MARKET' | 'LIMIT';
  baseOrderLimit: number;
  baseOrderType: 'STATIC' | 'DYNAMIC';
  extraOrders: number;
  minPriceGap: number;
  tradingFrequency: number;
  sendOrderFilledEmail: boolean;

  // Entry Conditions Step
  entryConditions: any;

  // Exit Conditions Step
  exitConditions: {
    // Risk Management
    stopLoss?: {
      enabled: boolean;
      type: 'percentage' | 'fixed_price' | 'atr_based';
      value: number;
      trailingEnabled?: boolean;
      trailingDistance?: number;
    };
    takeProfit?: {
      enabled: boolean;
      type: 'percentage' | 'fixed_price' | 'risk_reward_ratio';
      value: number;
      partialTakingEnabled?: boolean;
      partialLevels?: { percentage: number; exitPercent: number }[];
    };

    // Technical Indicators
    indicators?: string[];
    rsi?: {
      period: number;
      exitSignal: 'overbought' | 'momentum_reversal' | 'divergence';
      overboughtThreshold?: number;
      momentumThreshold?: number;
    };
    macd?: {
      exitSignal: 'bearish_crossover' | 'histogram_negative' | 'divergence';
      fastPeriod?: number;
      slowPeriod?: number;
      signalPeriod?: number;
    };
    sma?: {
      period: number;
      exitSignal: 'price_below' | 'slope_negative' | 'cross_below';
    };
    ema?: {
      period: number;
      exitSignal: 'price_below' | 'slope_negative' | 'cross_below';
    };
    bb?: {
      period: number;
      stdDev: number;
      exitSignal: 'touch_upper' | 'break_middle_down' | 'squeeze_release';
    };
    stochastic?: {
      fastkperiod: number;
      slowkperiod: number;
      slowdperiod: number;
      exitSignal: 'overbought' | 'bearish_cross' | 'divergence';
      overboughtThreshold?: number;
    };

    // Time-Based
    timeBasedExit?: {
      enabled: boolean;
      maxHoldTime?: number; // minutes
      endOfDayExit?: boolean;
      weekendExit?: boolean;
    };

    // Advanced
    riskRewardRatio?: number;
    maxDrawdown?: number;
    volatilityExit?: {
      enabled: boolean;
      threshold: number;
      period: number;
    };
  };
  stopLoss: number; // Keep for backward compatibility
  takeProfit: number; // Keep for backward compatibility

  // Strategy Info
  name: string;
  description: string;
  type: string;
}

const STEP_TITLES = [
  'Investment Profile',
  'Entry Conditions',
  'Exit Conditions',
  'Create Strategy'
];

export default function StepWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StrategyFormData>({
    // Asset Step
    asset: '',
    exchange: 'Binance',

    // Trade Parameters Step
    fundAllocation: 0,
    entryOrderType: 'MARKET',
    exitOrderType: 'MARKET',
    baseOrderLimit: 50,
    baseOrderType: 'STATIC',
    extraOrders: 2,
    minPriceGap: 0,
    tradingFrequency: 15,
    sendOrderFilledEmail: true,

    // Entry Conditions Step
    entryConditions: {},

    // Exit Conditions Step
    exitConditions: {},
    stopLoss: 5,
    takeProfit: 10,

    // Strategy Info
    name: '',
    description: '',
    type: 'Technical Analysis'
  });

  const updateFormData = (data: Partial<StrategyFormData>) => {
    console.log('🔄 Updating form data with:', data);
    setFormData(prev => {
      const updated = { ...prev, ...data };
      console.log('📋 Updated form data:', updated);
      return updated;
    });
  };

  const nextStep = () => {
    if (currentStep < STEP_TITLES.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    router.push('/strategies');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <InvestmentProfileStep formData={formData} updateFormData={updateFormData} />;
      case 1:
        return <EntryConditionsStep formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <ExitConditionsStep formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <CreateStrategyStep formData={formData} updateFormData={updateFormData} />;
      default:
        return null;
    }
  };

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return (
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    } else if (stepIndex === currentStep) {
      return (
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">{stepIndex + 1}</span>
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-600 text-sm font-bold">{stepIndex + 1}</span>
        </div>
      );
    }
  };

  const isLastStep = currentStep === STEP_TITLES.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header with Cancel Button */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Create New Strategy</h1>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {STEP_TITLES.map((title, index) => (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                {getStepIcon(index)}
                <span className={`mt-2 text-sm font-medium ${
                  index === currentStep ? 'text-blue-600' :
                  index < currentStep ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {title}
                </span>
              </div>
              {index < STEP_TITLES.length - 1 && (
                <div className={`w-24 h-1 mx-4 ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
        <button
          onClick={prevStep}
          disabled={isFirstStep}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isFirstStep
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          Previous
        </button>

        <button
          onClick={nextStep}
          disabled={isLastStep}
          className={`px-8 py-2 rounded-lg font-medium transition-colors ${
            isLastStep
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLastStep ? 'Create Strategy' : 'Next'}
        </button>
      </div>
    </div>
  );
}