#!/usr/bin/env npx tsx

/**
 * Bollinger Bands Analysis and Verification Script
 *
 * This script analyzes the Bollinger Bands calculation to identify if there's an issue.
 *
 * Current observed values:
 * - Upper Band: 69.56
 * - Middle Band (SMA): 69.37
 * - Lower Band: 69.18
 * - Current Price: 69.35
 * - Band Width: 0.38 (Upper - Lower)
 * - Standard Deviation: ~0.095 (implied)
 */

// Manual Bollinger Bands calculation for verification
function calculateBollingerBands(prices: number[], period: number = 20, numStdDev: number = 2) {
  if (prices.length < period) {
    throw new Error(`Need at least ${period} prices for calculation`);
  }

  // Get the last 'period' prices
  const relevantPrices = prices.slice(-period);

  // Calculate SMA (Middle Band)
  const sma = relevantPrices.reduce((sum, price) => sum + price, 0) / period;

  // Calculate Standard Deviation
  const squaredDiffs = relevantPrices.map(price => Math.pow(price - sma, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
  const stdDev = Math.sqrt(variance);

  // Calculate bands
  const upperBand = sma + (numStdDev * stdDev);
  const lowerBand = sma - (numStdDev * stdDev);

  return {
    upper: upperBand,
    middle: sma,
    lower: lowerBand,
    stdDev: stdDev,
    bandWidth: upperBand - lowerBand,
    bandWidthPercent: ((upperBand - lowerBand) / sma) * 100
  };
}

// Analyze the observed Bollinger Bands values
function analyzeBollingerBands() {
  console.log('='.repeat(80));
  console.log('BOLLINGER BANDS ANALYSIS');
  console.log('='.repeat(80));

  // Observed values from the trading bot
  const observed = {
    upper: 69.56,
    middle: 69.37,
    lower: 69.18,
    currentPrice: 69.35,
    period: 20
  };

  console.log('\n📊 OBSERVED VALUES:');
  console.log(`   Upper Band:    $${observed.upper.toFixed(2)}`);
  console.log(`   Middle Band:   $${observed.middle.toFixed(2)} (SMA)`);
  console.log(`   Lower Band:    $${observed.lower.toFixed(2)}`);
  console.log(`   Current Price: $${observed.currentPrice.toFixed(2)}`);
  console.log(`   Period:        ${observed.period} days`);

  // Calculate implied standard deviation
  const upperDeviation = observed.upper - observed.middle;
  const lowerDeviation = observed.middle - observed.lower;
  const avgDeviation = (upperDeviation + lowerDeviation) / 2;
  const impliedStdDev = avgDeviation / 2; // Since BB uses 2 std devs

  console.log('\n📈 CALCULATED METRICS:');
  console.log(`   Band Width:           $${(observed.upper - observed.lower).toFixed(2)}`);
  console.log(`   Upper Deviation:      $${upperDeviation.toFixed(2)}`);
  console.log(`   Lower Deviation:      $${lowerDeviation.toFixed(2)}`);
  console.log(`   Implied Std Dev (σ):  $${impliedStdDev.toFixed(4)}`);
  console.log(`   Band Width %:         ${((observed.upper - observed.lower) / observed.middle * 100).toFixed(2)}%`);

  // Volatility Analysis
  console.log('\n🔍 VOLATILITY ANALYSIS:');
  const dailyVolatility = (impliedStdDev / observed.middle) * 100;
  const annualizedVolatility = dailyVolatility * Math.sqrt(252); // 252 trading days

  console.log(`   Daily Volatility:     ${dailyVolatility.toFixed(3)}%`);
  console.log(`   Annualized Volatility: ${annualizedVolatility.toFixed(2)}%`);

  // Check if bands are too narrow
  console.log('\n⚠️  ISSUE DETECTION:');
  const typicalBandWidthPercent = 4.0; // Typical BB width is 2-5%
  const actualBandWidthPercent = ((observed.upper - observed.lower) / observed.middle) * 100;

  if (actualBandWidthPercent < 1.0) {
    console.log(`   ❌ BANDS ARE EXTREMELY NARROW!`);
    console.log(`      Expected: 2-5% width`);
    console.log(`      Actual:   ${actualBandWidthPercent.toFixed(2)}% width`);
    console.log(`      This indicates either:`);
    console.log(`      1. Extremely low volatility period`);
    console.log(`      2. Potential calculation error`);
    console.log(`      3. Stale or incorrect data`);
  } else if (actualBandWidthPercent < 2.0) {
    console.log(`   ⚠️  Bands are narrow (${actualBandWidthPercent.toFixed(2)}%)`);
    console.log(`      Low volatility period detected`);
  } else {
    console.log(`   ✅ Band width appears normal (${actualBandWidthPercent.toFixed(2)}%)`);
  }

  // Test with synthetic data
  console.log('\n🧪 SYNTHETIC DATA TEST:');
  console.log('   Creating test data around $69 with normal volatility...');

  // Generate synthetic prices with 1.5% daily volatility
  const basePrices: number[] = [];
  let price = 69.0;
  const normalVolatility = 0.015; // 1.5% daily volatility

  for (let i = 0; i < 20; i++) {
    // Add some random walk with mean reversion
    const randomReturn = (Math.random() - 0.5) * 2 * normalVolatility;
    price = price * (1 + randomReturn);
    // Mean revert slightly
    price = price * 0.99 + 69 * 0.01;
    basePrices.push(price);
  }

  const testBands = calculateBollingerBands(basePrices);
  console.log('\n   Expected Bollinger Bands with normal volatility:');
  console.log(`   Upper:  $${testBands.upper.toFixed(2)}`);
  console.log(`   Middle: $${testBands.middle.toFixed(2)}`);
  console.log(`   Lower:  $${testBands.lower.toFixed(2)}`);
  console.log(`   Std Dev: $${testBands.stdDev.toFixed(4)}`);
  console.log(`   Width %: ${testBands.bandWidthPercent.toFixed(2)}%`);

  // Reverse engineer what prices would give the observed bands
  console.log('\n🔬 REVERSE ENGINEERING:');
  console.log('   What prices would produce the observed bands?');

  const targetStdDev = impliedStdDev;
  const veryLowVolPrices: number[] = [];

  // Generate prices with very low volatility
  for (let i = 0; i < 20; i++) {
    // Extremely small random variations
    const variation = (Math.random() - 0.5) * 2 * 0.002; // 0.2% volatility
    veryLowVolPrices.push(observed.middle * (1 + variation));
  }

  const lowVolBands = calculateBollingerBands(veryLowVolPrices);
  console.log('\n   With 0.2% daily volatility:');
  console.log(`   Upper:  $${lowVolBands.upper.toFixed(2)}`);
  console.log(`   Middle: $${lowVolBands.middle.toFixed(2)}`);
  console.log(`   Lower:  $${lowVolBands.lower.toFixed(2)}`);
  console.log(`   Width %: ${lowVolBands.bandWidthPercent.toFixed(2)}%`);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('   1. Check if Alpha Vantage is returning real-time data');
  console.log('   2. Verify the interval parameter (daily vs intraday)');
  console.log('   3. Log the raw API response to inspect actual values');
  console.log('   4. Check if data is being cached and not refreshed');
  console.log('   5. Verify the time_period parameter is correctly set to 20');
  console.log('   6. Consider if the stock is in an unusually low volatility period');

  // Debugging suggestions
  console.log('\n🐛 DEBUGGING STEPS:');
  console.log('   1. Add detailed logging in fetchBollingerBands():');
  console.log('      - Log the full API response');
  console.log('      - Log the parsed values before returning');
  console.log('   2. Test with a known volatile stock (e.g., TSLA, NVDA)');
  console.log('   3. Compare with another data source (Yahoo Finance, TradingView)');
  console.log('   4. Check if the issue persists across different time periods');

  console.log('\n' + '='.repeat(80));
}

// Run the analysis
analyzeBollingerBands();

// Export for potential use in other scripts
export { calculateBollingerBands, analyzeBollingerBands };