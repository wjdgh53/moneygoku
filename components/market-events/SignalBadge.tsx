/**
 * SignalBadge Component
 * Displays individual signal types as colored badges with tooltips
 */

'use client';

import React, { useState } from 'react';
import { Signal, SignalType } from '@/lib/types/investmentOpportunity';

interface SignalBadgeProps {
  signal: Signal;
}

// Color mapping for each signal type
const SIGNAL_COLORS: Record<SignalType, { bg: string; text: string; border: string }> = {
  momentum: {
    bg: 'bg-pink-100',
    text: 'text-pink-700',
    border: 'border-pink-300',
  },
  insider_buying: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-300',
  },
  analyst_upgrade: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
  },
  merger_acquisition: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
  },
  top_gainer: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
  },
  stock_split: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
  },
  earnings_upcoming: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
  },
  high_volume: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
  },
};

// Icon mapping for each signal type
const SIGNAL_ICONS: Record<SignalType, string> = {
  momentum: '🚀',
  insider_buying: '💼',
  analyst_upgrade: '📈',
  merger_acquisition: '🤝',
  top_gainer: '⬆️',
  stock_split: '✂️',
  earnings_upcoming: '📊',
  high_volume: '📢',
};

// Display names for signal types
const SIGNAL_NAMES: Record<SignalType, string> = {
  momentum: 'Momentum',
  insider_buying: 'Insider Buying',
  analyst_upgrade: 'Analyst Upgrade',
  merger_acquisition: 'M&A',
  top_gainer: 'Top Gainer',
  stock_split: 'Stock Split',
  earnings_upcoming: 'Earnings',
  high_volume: 'High Volume',
};

export default function SignalBadge({ signal }: SignalBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = SIGNAL_COLORS[signal.type];
  const icon = SIGNAL_ICONS[signal.type];
  const name = SIGNAL_NAMES[signal.type];

  return (
    <div className="relative inline-block">
      <div
        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full ${colors.bg} ${colors.text} ${colors.border} border text-xs font-semibold cursor-help transition-all duration-200 hover:scale-105 hover:shadow-md`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        role="button"
        tabIndex={0}
        aria-label={`${name}: ${signal.description}`}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        <span>{icon}</span>
        <span>{name}</span>
        <span className="font-bold">+{signal.score}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64"
          role="tooltip"
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
            <div className="font-semibold mb-1">{signal.description}</div>
            <div className="text-gray-300 text-xs space-y-1">
              <div>Source: {signal.source}</div>
              <div>Date: {new Date(signal.date).toLocaleDateString()}</div>
              <div>Score: +{signal.score} points</div>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
