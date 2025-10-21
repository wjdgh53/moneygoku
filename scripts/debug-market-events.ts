/**
 * Debug Market Events Service
 * Check why data is not loading
 */

import { marketEventsService } from '../lib/services/marketEventsService';

async function debugMarketEvents() {
  console.log('🔍 Debugging Market Events Service...\n');

  try {
    // Test each endpoint individually
    console.log('1️⃣ Testing Mergers & Acquisitions...');
    const mergers = await marketEventsService.getMergersAcquisitions({ limit: 5 });
    console.log(`   ✅ Mergers: ${mergers.length} items`);
    if (mergers.length > 0) {
      console.log(`   First item:`, mergers[0]);
    }
  } catch (error) {
    console.error(`   ❌ Mergers error:`, error);
  }

  try {
    console.log('\n2️⃣ Testing Analyst Ratings...');
    const ratings = await marketEventsService.getAnalystRatings({ limit: 5 });
    console.log(`   ✅ Ratings: ${ratings.length} items`);
    if (ratings.length > 0) {
      console.log(`   First item:`, ratings[0]);
    }
  } catch (error) {
    console.error(`   ❌ Ratings error:`, error);
  }

  try {
    console.log('\n3️⃣ Testing Upcoming Earnings...');
    const earnings = await marketEventsService.getUpcomingEarnings({ limit: 5 });
    console.log(`   ✅ Earnings: ${earnings.length} items`);
    if (earnings.length > 0) {
      console.log(`   First item:`, earnings[0]);
    }
  } catch (error) {
    console.error(`   ❌ Earnings error:`, error);
  }

  try {
    console.log('\n4️⃣ Testing Stock Splits...');
    const splits = await marketEventsService.getStockSplits({ limit: 5 });
    console.log(`   ✅ Splits: ${splits.length} items`);
    if (splits.length > 0) {
      console.log(`   First item:`, splits[0]);
    }
  } catch (error) {
    console.error(`   ❌ Splits error:`, error);
  }

  console.log('\n✅ Debug complete!');
}

debugMarketEvents().catch(console.error);
