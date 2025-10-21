'use client';

import React from 'react';
import { RiskAppetite, RiskAppetiteOption } from './types';

interface RiskAppetiteStepProps {
  selectedRiskAppetite: RiskAppetite | null;
  onSelect: (riskAppetite: RiskAppetite) => void;
  options: RiskAppetiteOption[];
}

export default function RiskAppetiteStep({
  selectedRiskAppetite,
  onSelect,
  options
}: RiskAppetiteStepProps) {
  const getIcon = (value: RiskAppetite) => {
    switch (value) {
      case 'DEFENSIVE':
        return (
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'BALANCED':
        return (
          <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        );
      case 'AGGRESSIVE':
        return (
          <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
    }
  };

  const getColorClasses = (value: RiskAppetite, isSelected: boolean) => {
    const baseClasses = {
      DEFENSIVE: {
        border: isSelected ? 'border-green-600' : 'border-gray-200 hover:border-green-300',
        bg: isSelected ? 'bg-green-50' : 'bg-white',
        badge: 'bg-green-100 text-green-800'
      },
      BALANCED: {
        border: isSelected ? 'border-blue-600' : 'border-gray-200 hover:border-blue-300',
        bg: isSelected ? 'bg-blue-50' : 'bg-white',
        badge: 'bg-blue-100 text-blue-800'
      },
      AGGRESSIVE: {
        border: isSelected ? 'border-red-600' : 'border-gray-200 hover:border-red-300',
        bg: isSelected ? 'bg-red-50' : 'bg-white',
        badge: 'bg-red-100 text-red-800'
      }
    };

    return baseClasses[value];
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">리스크 성향 선택</h2>
        <p className="text-gray-600">
          손익 관리 및 포지션 크기 전략을 선택하세요
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {options.map((option) => {
          const isSelected = selectedRiskAppetite === option.value;
          const colors = getColorClasses(option.value, isSelected);

          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-200
                ${colors.border} ${colors.bg}
                ${isSelected ? 'shadow-lg transform scale-105' : 'hover:shadow-md'}
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center ${
                  option.value === 'DEFENSIVE' ? 'bg-green-600' :
                  option.value === 'BALANCED' ? 'bg-blue-600' :
                  'bg-red-600'
                }`}>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Icon */}
              <div className="flex justify-center mb-4">
                {getIcon(option.value)}
              </div>

              {/* Title with badge */}
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {option.name}
                </h3>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                  Kelly {option.kellyFraction === 0.125 ? '1/8' : option.kellyFraction === 0.25 ? '1/4' : '1/2'}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">
                {option.description}
              </p>

              {/* Risk Metrics */}
              <div className="space-y-3 text-left">
                <div className="bg-white bg-opacity-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">손절:</span>
                    <span className="font-semibold text-red-600">-{option.stopLoss}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">익절:</span>
                    <span className="font-semibold text-green-600">+{option.takeProfit}%</span>
                  </div>
                </div>

                <div className="bg-white bg-opacity-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">최대 포지션:</span>
                    <span className="font-medium text-gray-900">{(option.maxPositionSize * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">리밸런싱:</span>
                    <span className="font-medium text-gray-900">±{(option.rebalanceThreshold * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Risk/Reward Ratio */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 text-center">
                  Risk/Reward Ratio: 1:{(option.takeProfit / option.stopLoss).toFixed(1)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
