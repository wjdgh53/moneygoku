'use client';

import React from 'react';
import { TimeHorizon, TimeHorizonOption } from './types';

interface TimeHorizonStepProps {
  selectedTimeHorizon: TimeHorizon | null;
  onSelect: (timeHorizon: TimeHorizon) => void;
  options: TimeHorizonOption[];
}

export default function TimeHorizonStep({
  selectedTimeHorizon,
  onSelect,
  options
}: TimeHorizonStepProps) {
  const getIcon = (value: TimeHorizon) => {
    switch (value) {
      case 'SHORT_TERM':
        return (
          <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'SWING':
        return (
          <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        );
      case 'LONG_TERM':
        return (
          <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">투자 기간 선택</h2>
        <p className="text-gray-600">
          봇의 트레이딩 시간 범위를 선택하세요
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {options.map((option) => {
          const isSelected = selectedTimeHorizon === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-200
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

              {/* Icon */}
              <div className="flex justify-center mb-4">
                {getIcon(option.value)}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {option.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">
                {option.description}
              </p>

              {/* Details */}
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">실행 주기:</span>
                  <span className="font-medium text-gray-900">{option.executionFrequency}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">캔들 간격:</span>
                  <span className="font-medium text-gray-900">{option.candleStick}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">분석 기간:</span>
                  <span className="font-medium text-gray-900">{option.lookbackPeriod}</span>
                </div>
              </div>

              {/* Technical Indicators */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">기술 지표</p>
                <div className="flex justify-around text-xs">
                  <div>
                    <div className="text-gray-500">RSI</div>
                    <div className="font-semibold">{option.indicators.rsiPeriod}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">MA</div>
                    <div className="font-semibold">{option.indicators.maPeriod}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">BB</div>
                    <div className="font-semibold">{option.indicators.bbPeriod}</div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
