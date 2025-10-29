/**
 * Test Dynamic Historical Data Fetching
 *
 * Tests that the system can fetch data for ANY symbol on demand
 */

import { prisma } from '@/lib/prisma';
import { historicalDataProvider } from '@/lib/services/backtesting/historicalDataProvider';

async function testDynamicDataFetch() {
  console.log('🧪 Testing Dynamic Historical Data Fetching\n');

  try {
    // Test with TSLA (likely not cached)
    const testSymbol = 'TSLA';
    const startDate = new Date('2024-07-01');
    const endDate = new Date('2024-10-01');

    console.log(`📊 Testing data fetch for ${testSymbol}`);
    console.log(`   Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

    // Check if data exists before fetch
    const beforeCount = await prisma.marketData.count({
      where: {
        symbol: testSymbol,
        interval: 'daily',
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    console.log(`📋 Before fetch: ${beforeCount} bars in cache`);

    // Load data (should trigger API fetch if not cached)
    const bars = await historicalDataProvider.loadHistoricalBars({
      symbol: testSymbol,
      timeHorizon: 'SWING',
      startDate,
      endDate,
    });

    console.log(`✅ Successfully loaded ${bars.length} bars`);

    // Check cache after fetch
    const afterCount = await prisma.marketData.count({
      where: {
        symbol: testSymbol,
        interval: 'daily',
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    console.log(`📋 After fetch: ${afterCount} bars in cache\n`);

    if (afterCount > beforeCount) {
      console.log(`🎉 SUCCESS! Fetched and cached ${afterCount - beforeCount} new bars from Alpha Vantage`);
    } else if (beforeCount > 0) {
      console.log(`✅ SUCCESS! Used existing cached data (${beforeCount} bars)`);
    } else {
      console.warn(`⚠️  WARNING: No data was cached`);
    }

    // Show sample data
    if (bars.length > 0) {
      console.log(`\n📈 Sample data (first 3 bars):`);
      bars.slice(0, 3).forEach((bar) => {
        console.log(`   ${bar.timestamp.toISOString().split('T')[0]}: O=${bar.open.toFixed(2)} H=${bar.high.toFixed(2)} L=${bar.low.toFixed(2)} C=${bar.close.toFixed(2)}`);
      });
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testDynamicDataFetch()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
