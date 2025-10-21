/**
 * Profile Selector Component
 * Allows users to select Time Horizon and Risk Appetite independently
 */

'use client';

import React, { useState } from 'react';
import { TimeHorizon, RiskAppetite, TradingProfile } from '@/lib/trading-profile-types';

interface ProfileSelectorProps {
  onProfileSelect: (profile: TradingProfile) => void;
}

export default function ProfileSelector({ onProfileSelect }: ProfileSelectorProps) {
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon | null>(null);
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<TradingProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeHorizonOptions = [
    {
      value: TimeHorizon.DAY,
      label: 'Day Trading',
      description: '1-3 days - Quick in and out',
      emoji: '⚡'
    },
    {
      value: TimeHorizon.SWING,
      label: 'Swing Trading',
      description: '3-30 days - Ride the trends',
      emoji: '📈'
    },
    {
      value: TimeHorizon.POSITION,
      label: 'Position Trading',
      description: '30+ days - Long-term holds',
      emoji: '🎯'
    }
  ];

  const riskAppetiteOptions = [
    {
      value: RiskAppetite.DEFENSIVE,
      label: 'Defensive',
      description: 'Capital preservation first',
      emoji: '🛡️'
    },
    {
      value: RiskAppetite.BALANCED,
      label: 'Balanced',
      description: 'Moderate risk and reward',
      emoji: '⚖️'
    },
    {
      value: RiskAppetite.AGGRESSIVE,
      label: 'Aggressive',
      description: 'Maximum growth potential',
      emoji: '🚀'
    }
  ];

  const fetchProfile = async () => {
    if (!timeHorizon || !riskAppetite) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/profiles?timeHorizon=${timeHorizon}&riskAppetite=${riskAppetite}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data.data);
      onProfileSelect(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (timeHorizon && riskAppetite) {
      fetchProfile();
    }
  }, [timeHorizon, riskAppetite]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Choose Your Trading Style</h2>
        <p className="text-gray-600">Select your preferences independently</p>
      </div>

      {/* Time Horizon Selection */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <span>⏱️</span>
          <span>Investment Period</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {timeHorizonOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeHorizon(option.value)}
              className={`p-6 rounded-lg border-2 transition-all ${
                timeHorizon === option.value
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow'
              }`}
            >
              <div className="text-4xl mb-2">{option.emoji}</div>
              <div className="font-semibold text-lg">{option.label}</div>
              <div className="text-sm text-gray-600 mt-1">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Risk Appetite Selection */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <span>🎲</span>
          <span>Risk Tolerance</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {riskAppetiteOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setRiskAppetite(option.value)}
              className={`p-6 rounded-lg border-2 transition-all ${
                riskAppetite === option.value
                  ? 'border-green-500 bg-green-50 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-green-300 hover:shadow'
              }`}
            >
              <div className="text-4xl mb-2">{option.emoji}</div>
              <div className="font-semibold text-lg">{option.label}</div>
              <div className="text-sm text-gray-600 mt-1">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Loading/Error State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Error: {error}</p>
        </div>
      )}

      {/* Profile Display */}
      {profile && !loading && (
        <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-6 space-y-4 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">{profile.name}</h3>
              <p className="text-gray-600">{profile.description}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Profile ID</div>
              <div className="font-mono text-xs bg-white px-2 py-1 rounded">
                {profile.id}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500">Execution</div>
              <div className="text-lg font-semibold">{profile.executionInterval}</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500">Stop Loss</div>
              <div className="text-lg font-semibold text-red-600">
                {(profile.stopLoss * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500">Take Profit</div>
              <div className="text-lg font-semibold text-green-600">
                {(profile.takeProfit * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500">Max Position</div>
              <div className="text-lg font-semibold">
                {(profile.maxPositionSize * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-2">Preferred Strategies</div>
            <div className="flex flex-wrap gap-2">
              {profile.strategies.map((strategy) => (
                <span
                  key={strategy}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {strategy}
                </span>
              ))}
            </div>
          </div>

          {profile.specialRules && Object.keys(profile.specialRules).length > 0 && (
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-2">Special Rules</div>
              <ul className="list-disc list-inside text-sm space-y-1">
                {Object.entries(profile.specialRules).map(([rule, enabled]) => {
                  if (!enabled) return null;
                  return (
                    <li key={rule} className="text-gray-700">
                      {rule.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => onProfileSelect(profile)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Use This Profile
            </button>
          </div>
        </div>
      )}

      {/* Information Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Why Independent Selection?</h4>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• You can be a short-term trader but defensive (quick profits, low risk)</li>
          <li>• Or a long-term investor but aggressive (concentrated bets on growth)</li>
          <li>• Time horizon affects HOW OFTEN you trade</li>
          <li>• Risk appetite affects HOW MUCH you risk per trade</li>
        </ul>
      </div>
    </div>
  );
}
