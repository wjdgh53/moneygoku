// Test script to verify strategy conversion logic
import { BotTestService } from '../lib/services/botTestService';

const testService = new BotTestService();

async function main() {
  console.log('🧪 Testing Strategy Conversion & Evaluation Logic\n');

  // Test Case 1: Bollinger Bands - GM Momentum Breakout
  console.log('='.repeat(80));
  console.log('Test 1: Bollinger Bands String Value Conversion');
  console.log('='.repeat(80));

  const bbStrategy = {
    indicators: ['BBANDS'],
    rules: [
      { indicator: 'PRICE', operator: '>', value: 'BB_UPPER', weight: 0.8 }
    ]
  };

  // @ts-ignore - accessing private method for testing
  const bbConverted = testService.convertDBConditionsToStrategyCondition(bbStrategy, 'ENTRY');
  console.log('Input:', JSON.stringify(bbStrategy, null, 2));
  console.log('Converted:', JSON.stringify(bbConverted, null, 2));
  console.log('✅ Expected bollinger.operator: price_above_upper');
  console.log(`✓ Actual: ${bbConverted.bollinger?.operator}\n`);

  // Test Case 2: SMA Crossover - Golden Cross
  console.log('='.repeat(80));
  console.log('Test 2: SMA Crossover Conversion (Golden Cross)');
  console.log('='.repeat(80));

  const smaStrategy = {
    indicators: ['SMA'],
    rules: [
      { indicator: 'SMA_50', operator: 'CROSS_ABOVE', value: 'SMA_200', weight: 1.0 }
    ]
  };

  // @ts-ignore
  const smaConverted = testService.convertDBConditionsToStrategyCondition(smaStrategy, 'ENTRY');
  console.log('Input:', JSON.stringify(smaStrategy, null, 2));
  console.log('Converted:', JSON.stringify(smaConverted, null, 2));
  console.log('✅ Expected smaCrossover.operator: golden_cross');
  console.log(`✓ Actual: ${smaConverted.smaCrossover?.operator}`);
  console.log(`✓ Fast Period: ${smaConverted.smaCrossover?.fastPeriod}`);
  console.log(`✓ Slow Period: ${smaConverted.smaCrossover?.slowPeriod}\n`);

  // Test Case 3: SMA Death Cross
  console.log('='.repeat(80));
  console.log('Test 3: SMA Death Cross Conversion');
  console.log('='.repeat(80));

  const deathCrossStrategy = {
    indicators: ['SMA'],
    rules: [
      { indicator: 'SMA_50', operator: 'CROSS_BELOW', value: 'SMA_200', weight: 1.0 }
    ]
  };

  // @ts-ignore
  const deathConverted = testService.convertDBConditionsToStrategyCondition(deathCrossStrategy, 'EXIT');
  console.log('Input:', JSON.stringify(deathCrossStrategy, null, 2));
  console.log('Converted:', JSON.stringify(deathConverted, null, 2));
  console.log('✅ Expected smaCrossover.operator: death_cross');
  console.log(`✓ Actual: ${deathConverted.smaCrossover?.operator}\n`);

  // Test Case 4: EMA Crossover
  console.log('='.repeat(80));
  console.log('Test 4: EMA Crossover Conversion');
  console.log('='.repeat(80));

  const emaStrategy = {
    indicators: ['EMA'],
    rules: [
      { indicator: 'EMA_50', operator: 'CROSS_ABOVE', value: 'EMA_200', weight: 1.0 }
    ]
  };

  // @ts-ignore
  const emaConverted = testService.convertDBConditionsToStrategyCondition(emaStrategy, 'ENTRY');
  console.log('Input:', JSON.stringify(emaStrategy, null, 2));
  console.log('Converted:', JSON.stringify(emaConverted, null, 2));
  console.log('✅ Expected emaCrossover.operator: bullish_cross');
  console.log(`✓ Actual: ${emaConverted.emaCrossover?.operator}\n`);

  // Test Case 5: Bollinger Bands - All operators
  console.log('='.repeat(80));
  console.log('Test 5: Bollinger Bands - Extended Operators');
  console.log('='.repeat(80));

  const operators = [
    { op: '>', value: 'BB_UPPER', expected: 'price_above_upper' },
    { op: '<', value: 'BB_UPPER', expected: 'price_below_upper' },
    { op: '<', value: 'BB_LOWER', expected: 'price_below_lower' },
    { op: '>', value: 'BB_LOWER', expected: 'price_above_lower' },
    { op: '>', value: 'BB_MIDDLE', expected: 'price_above_middle' },
    { op: '<', value: 'BB_MIDDLE', expected: 'price_below_middle' },
  ];

  for (const test of operators) {
    const strategy = {
      indicators: ['BBANDS'],
      rules: [{ indicator: 'PRICE', operator: test.op, value: test.value, weight: 1.0 }]
    };
    // @ts-ignore
    const converted = testService.convertDBConditionsToStrategyCondition(strategy, 'ENTRY');
    const actual = converted.bollinger?.operator;
    const status = actual === test.expected ? '✅' : '❌';
    console.log(`${status} PRICE ${test.op} ${test.value} → ${actual} (expected: ${test.expected})`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ All conversion tests completed!');
  console.log('='.repeat(80));
}

main().catch(console.error);
