/**
 * Trading Profile Examples and Usage
 */

import {
  TimeHorizon,
  RiskAppetite,
  TradingProfile,
  ProfileValidationInput
} from './trading-profile-types';
import { TradingProfileBuilder, ProfileAdjuster } from './trading-profile-builder';

// ============================================================================
// Example 1: Create Specific Profile
// ============================================================================

export function example1_CreateSpecificProfile() {
  console.log('=== Example 1: Create Specific Profile ===\n');

  // Create a swing trading profile with balanced risk
  const profile = TradingProfileBuilder.create({
    timeHorizon: TimeHorizon.SWING,
    riskAppetite: RiskAppetite.BALANCED
  });

  console.log('Profile Created:', profile.name);
  console.log('Description:', profile.description);
  console.log('\nKey Parameters:');
  console.log('- Execution Interval:', profile.executionInterval);
  console.log('- Stop Loss:', (profile.stopLoss * 100).toFixed(1) + '%');
  console.log('- Take Profit:', (profile.takeProfit * 100).toFixed(1) + '%');
  console.log('- Max Position Size:', (profile.maxPositionSize * 100).toFixed(1) + '%');
  console.log('- Strategies:', profile.strategies);
  console.log('- Special Rules:', profile.specialRules);

  return profile;
}

// ============================================================================
// Example 2: Create with Customizations
// ============================================================================

export function example2_CreateWithCustomizations() {
  console.log('\n=== Example 2: Create with Customizations ===\n');

  const profile = TradingProfileBuilder.create({
    timeHorizon: TimeHorizon.DAY,
    riskAppetite: RiskAppetite.AGGRESSIVE,
    customizations: {
      executionInterval: '15m',  // More frequent than default
      stopLoss: 0.05,            // Custom stop loss
      maxPositionSize: 0.15,     // Custom position size
      indicators: {
        rsi: {
          period: 9,             // Faster RSI
          overbought: 75,
          oversold: 25
        }
      }
    }
  });

  console.log('Customized Profile:', profile.name);
  console.log('Execution Interval:', profile.executionInterval, '(customized from 30m)');
  console.log('Stop Loss:', (profile.stopLoss * 100) + '%', '(customized)');
  console.log('RSI Period:', profile.indicators.rsi?.period, '(customized from 14)');

  return profile;
}

// ============================================================================
// Example 3: Validate User Input
// ============================================================================

export function example3_ValidateUserInput() {
  console.log('\n=== Example 3: Validate User Input ===\n');

  // Scenario 1: Beginner trying day trading
  const validation1: ProfileValidationInput = {
    timeHorizon: TimeHorizon.DAY,
    riskAppetite: RiskAppetite.AGGRESSIVE,
    userExperience: 0.5,  // 6 months
    capitalSize: 5000
  };

  const result1 = TradingProfileBuilder.validate(validation1);
  console.log('Scenario 1: Beginner + Day Trading');
  console.log('Valid:', result1.valid);
  console.log('Warning:', result1.warning);
  console.log('Recommendations:', result1.recommendations);

  // Scenario 2: Experienced trader with good capital
  const validation2: ProfileValidationInput = {
    timeHorizon: TimeHorizon.SWING,
    riskAppetite: RiskAppetite.BALANCED,
    userExperience: 3,
    capitalSize: 50000,
    riskTolerance: 6
  };

  const result2 = TradingProfileBuilder.validate(validation2);
  console.log('\nScenario 2: Experienced + Good Capital');
  console.log('Valid:', result2.valid);
  console.log('Note:', result2.note);

  return { result1, result2 };
}

// ============================================================================
// Example 4: Get Recommended Profile
// ============================================================================

export function example4_GetRecommendation() {
  console.log('\n=== Example 4: Get Recommended Profile ===\n');

  const userInput: ProfileValidationInput = {
    timeHorizon: TimeHorizon.DAY, // Will be adjusted if needed
    riskAppetite: RiskAppetite.BALANCED, // Will be adjusted if needed
    userExperience: 2,
    capitalSize: 15000,
    riskTolerance: 7
  };

  const recommended = TradingProfileBuilder.recommend(userInput);

  if (recommended) {
    console.log('Recommended Profile:', recommended.name);
    console.log('Time Horizon:', recommended.timeHorizon);
    console.log('Risk Appetite:', recommended.riskAppetite);
    console.log('Description:', recommended.description);
  } else {
    console.log('No suitable profile found for given parameters');
  }

  return recommended;
}

// ============================================================================
// Example 5: Adjust for Market Conditions
// ============================================================================

export function example5_AdjustForMarket() {
  console.log('\n=== Example 5: Adjust for Market Conditions ===\n');

  // Create base profile
  const baseProfile = TradingProfileBuilder.create({
    timeHorizon: TimeHorizon.SWING,
    riskAppetite: RiskAppetite.BALANCED
  });

  console.log('Base Profile:');
  console.log('- Stop Loss:', (baseProfile.stopLoss * 100).toFixed(1) + '%');
  console.log('- Max Position:', (baseProfile.maxPositionSize * 100).toFixed(1) + '%');

  // High volatility market
  const highVolMarket = {
    volatility: 35,
    trend: 'weak_bear' as const,
    volume: 'high' as const,
    correlations: {}
  };

  const adjustedProfile = ProfileAdjuster.adjustForMarket(baseProfile, highVolMarket);

  console.log('\nAdjusted for High Volatility:');
  console.log('- Stop Loss:', (adjustedProfile.stopLoss * 100).toFixed(1) + '%');
  console.log('- Max Position:', (adjustedProfile.maxPositionSize * 100).toFixed(1) + '%');

  return { baseProfile, adjustedProfile };
}

// ============================================================================
// Example 6: Adjust Based on Performance
// ============================================================================

export function example6_AdjustForPerformance() {
  console.log('\n=== Example 6: Adjust Based on Performance ===\n');

  const profile = TradingProfileBuilder.create({
    timeHorizon: TimeHorizon.DAY,
    riskAppetite: RiskAppetite.BALANCED
  });

  console.log('Original Profile:');
  console.log('- Max Position:', (profile.maxPositionSize * 100).toFixed(1) + '%');
  console.log('- Kelly Multiplier:', profile.kellyMultiplier);

  // Scenario 1: Underperforming
  const poorPerformance = {
    winRate: 0.35,           // Below target
    sharpeRatio: 0.5,
    maxDrawdown: 0.18,
    avgReturn: -0.02,
    totalReturn: -0.05,
    profitFactor: 0.8,
    avgHoldingPeriod: '12h'
  };

  const adjusted1 = ProfileAdjuster.adjustFromPerformance(profile, poorPerformance);
  console.log('\nAdjusted for Poor Performance:');
  console.log('- Max Position:', (adjusted1.maxPositionSize * 100).toFixed(1) + '%', '(reduced)');
  console.log('- Stop Loss:', (adjusted1.stopLoss * 100).toFixed(1) + '%', '(tightened)');

  // Scenario 2: Outperforming
  const goodPerformance = {
    winRate: 0.68,           // Above target
    sharpeRatio: 2.3,
    maxDrawdown: 0.08,
    avgReturn: 0.03,
    totalReturn: 0.15,
    profitFactor: 2.1,
    avgHoldingPeriod: '18h'
  };

  const adjusted2 = ProfileAdjuster.adjustFromPerformance(profile, goodPerformance);
  console.log('\nAdjusted for Good Performance:');
  console.log('- Max Position:', (adjusted2.maxPositionSize * 100).toFixed(1) + '%', '(increased)');
  console.log('- Kelly Multiplier:', adjusted2.kellyMultiplier.toFixed(2), '(increased)');

  return { profile, adjusted1, adjusted2 };
}

// ============================================================================
// Example 7: Get All Available Profiles
// ============================================================================

export function example7_GetAllProfiles() {
  console.log('\n=== Example 7: All Available Profiles ===\n');

  const allProfiles = TradingProfileBuilder.getAllProfiles();

  console.log(`Total Profiles: ${allProfiles.length}\n`);

  // Group by time horizon
  const grouped = allProfiles.reduce((acc, profile) => {
    if (!acc[profile.timeHorizon]) {
      acc[profile.timeHorizon] = [];
    }
    acc[profile.timeHorizon].push(profile);
    return acc;
  }, {} as Record<string, TradingProfile[]>);

  Object.entries(grouped).forEach(([horizon, profiles]) => {
    console.log(`\n${horizon.toUpperCase()}:`);
    profiles.forEach(p => {
      console.log(`  - ${p.name} (${p.riskAppetite})`);
      console.log(`    ${p.description}`);
    });
  });

  return allProfiles;
}

// ============================================================================
// Example 8: Compare Profiles
// ============================================================================

export function example8_CompareProfiles() {
  console.log('\n=== Example 8: Compare Profiles ===\n');

  const profiles = [
    TradingProfileBuilder.create({
      timeHorizon: TimeHorizon.DAY,
      riskAppetite: RiskAppetite.DEFENSIVE
    }),
    TradingProfileBuilder.create({
      timeHorizon: TimeHorizon.DAY,
      riskAppetite: RiskAppetite.AGGRESSIVE
    }),
    TradingProfileBuilder.create({
      timeHorizon: TimeHorizon.POSITION,
      riskAppetite: RiskAppetite.BALANCED
    })
  ];

  console.log('Profile Comparison:\n');
  console.log('Parameter'.padEnd(20), profiles.map(p => p.name.substring(0, 18).padEnd(20)).join(''));
  console.log('-'.repeat(80));

  const params = [
    { key: 'executionInterval', label: 'Exec Interval' },
    { key: 'stopLoss', label: 'Stop Loss %', format: (v: number) => (v * 100).toFixed(1) },
    { key: 'takeProfit', label: 'Take Profit %', format: (v: number) => (v * 100).toFixed(1) },
    { key: 'maxPositionSize', label: 'Max Position %', format: (v: number) => (v * 100).toFixed(1) },
    { key: 'maxLeverage', label: 'Max Leverage' }
  ];

  params.forEach(({ key, label, format }) => {
    const values = profiles.map(p => {
      const value = (p as any)[key];
      return format ? format(value) : value;
    });
    console.log(label.padEnd(20), values.map(v => String(v).padEnd(20)).join(''));
  });

  return profiles;
}

// ============================================================================
// Example 9: Real-world Scenario
// ============================================================================

export function example9_RealWorldScenario() {
  console.log('\n=== Example 9: Real-world Scenario ===\n');

  // User profile
  const user = {
    name: 'John Doe',
    experience: 2.5,
    capital: 25000,
    riskTolerance: 6,
    availableTimePerDay: 2, // hours
    goals: 'Supplement income with trading'
  };

  console.log('User Profile:');
  console.log('- Experience:', user.experience, 'years');
  console.log('- Capital: $' + user.capital.toLocaleString());
  console.log('- Risk Tolerance:', user.riskTolerance + '/10');
  console.log('- Available Time:', user.availableTimePerDay, 'hours/day');

  // Get recommendation
  const recommended = TradingProfileBuilder.recommend({
    timeHorizon: TimeHorizon.SWING, // Placeholder
    riskAppetite: RiskAppetite.BALANCED, // Placeholder
    userExperience: user.experience,
    capitalSize: user.capital,
    riskTolerance: user.riskTolerance
  });

  if (recommended) {
    console.log('\n✓ Recommended Profile:', recommended.name);
    console.log('  Description:', recommended.description);
    console.log('\nKey Parameters:');
    console.log('  - Check positions every:', recommended.executionInterval);
    console.log('  - Risk per trade:', (recommended.stopLoss * 100).toFixed(1) + '%');
    console.log('  - Max portfolio exposure:', (recommended.maxTotalExposure * 100).toFixed(0) + '%');
    console.log('  - Expected holding period:', recommended.holdingPeriod.target);

    // Simulate market adjustment
    const marketState = {
      volatility: 22, // Moderate
      trend: 'weak_bull' as const,
      volume: 'normal' as const,
      correlations: {}
    };

    const adjusted = ProfileAdjuster.adjustForMarket(recommended, marketState);
    console.log('\nAdjusted for Current Market:');
    console.log('  - Stop Loss:', (adjusted.stopLoss * 100).toFixed(1) + '%',
                '(original:', (recommended.stopLoss * 100).toFixed(1) + '%)');
    console.log('  - Max Position:', (adjusted.maxPositionSize * 100).toFixed(1) + '%',
                '(original:', (recommended.maxPositionSize * 100).toFixed(1) + '%)');
  }

  return recommended;
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runAllExamples() {
  example1_CreateSpecificProfile();
  example2_CreateWithCustomizations();
  example3_ValidateUserInput();
  example4_GetRecommendation();
  example5_AdjustForMarket();
  example6_AdjustForPerformance();
  example7_GetAllProfiles();
  example8_CompareProfiles();
  example9_RealWorldScenario();

  console.log('\n=== All Examples Completed ===\n');
}

// For direct execution
if (require.main === module) {
  runAllExamples();
}
