/**
 * Update Analyst Ratings for Existing Bots
 *
 * This script fetches FMP analyst ratings for all bots that don't have them yet
 * and updates the database.
 */

import { prisma } from '../lib/prisma';
import { fmpAnalystService } from '../lib/services/fmpAnalystService';

async function updateAnalystRatings() {
  try {
    console.log('🔄 Starting analyst ratings update for existing bots...\n');

    // Get all bots without analyst ratings
    const bots = await prisma.bot.findMany({
      where: {
        analystRating: null
      },
      select: {
        id: true,
        name: true,
        symbol: true
      }
    });

    if (bots.length === 0) {
      console.log('✅ All bots already have analyst ratings!');
      return;
    }

    console.log(`📊 Found ${bots.length} bot(s) without analyst ratings\n`);

    let updated = 0;
    let failed = 0;

    for (const bot of bots) {
      console.log(`\n🔄 [${bots.indexOf(bot) + 1}/${bots.length}] Processing: ${bot.name} (${bot.symbol})`);

      try {
        // Fetch analyst rating from FMP
        const rating = await fmpAnalystService.getUpgradesDowngrades(bot.symbol);

        if (rating) {
          // Update bot with rating data
          await prisma.bot.update({
            where: { id: bot.id },
            data: {
              analystRating: JSON.stringify(rating)
            }
          });

          console.log(`✅ Updated ${bot.name} with analyst rating`);
          console.log(`   Latest: ${rating.latestChange?.gradingCompany} - ${rating.latestChange?.previousGrade} → ${rating.latestChange?.newGrade}`);
          console.log(`   Consensus: ${rating.consensus}`);
          updated++;
        } else {
          console.log(`ℹ️  No analyst rating available for ${bot.symbol}`);
          failed++;
        }

        // Rate limit: wait 1 second between API calls
        if (bots.indexOf(bot) < bots.length - 1) {
          console.log('⏳ Waiting 1s before next API call...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error: any) {
        console.error(`❌ Failed to update ${bot.name}:`, error.message);
        failed++;

        // Continue with next bot
        if (bots.indexOf(bot) < bots.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total bots: ${bots.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed/No data: ${failed}`);
    console.log('\n✅ Analyst ratings update complete!');

  } catch (error) {
    console.error('❌ Error updating analyst ratings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateAnalystRatings()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
