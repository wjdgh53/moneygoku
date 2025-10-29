/**
 * Diagnostic Script: Analyze Bot Strategy Configuration
 *
 * This script helps diagnose potential issues with Bollinger Bands strategy evaluation
 * for a specific bot.
 *
 * Usage:
 *   npx tsx scripts/diagnose-bot-strategy.ts <bot-id>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BollingerBandsCondition {
  indicator?: string;
  operator?: string;
  value?: string | number;
  weight?: number;
}

interface StrategyRules {
  indicators?: string[];
  rules?: BollingerBandsCondition[];
  description?: string;
}

async function diagnoseBotStrategy(botId: string) {
  console.log(`\n🔍 Diagnosing Bot Strategy for ID: ${botId}\n`);
  console.log('='.repeat(80));

  try {
    // Fetch bot with strategy
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: {
        strategy: true,
        trades: {
          take: 5,
          orderBy: { executedAt: 'desc' }
        }
      }
    });

    if (!bot) {
      console.error(`❌ Bot not found with ID: ${botId}`);
      return;
    }

    console.log(`\n📋 Bot Information:`);
    console.log(`   Name: ${bot.name}`);
    console.log(`   Symbol: ${bot.symbol}`);
    console.log(`   Status: ${bot.status}`);
    console.log(`   Mode: ${bot.mode}`);
    console.log(`   Fund Allocation: $${bot.fundAllocation}`);
    console.log(`   Total Returns: $${bot.totalReturns}`);

    if (!bot.strategy) {
      console.error(`\n❌ No strategy found for this bot!`);
      return;
    }

    console.log(`\n📊 Strategy Information:`);
    console.log(`   Name: ${bot.strategy.name}`);
    console.log(`   Time Horizon: ${bot.strategy.timeHorizon}`);
    console.log(`   Risk Appetite: ${bot.strategy.riskAppetite}`);
    console.log(`   Stop Loss: ${bot.strategy.stopLoss}%`);
    console.log(`   Take Profit: ${bot.strategy.takeProfit}%`);

    // Parse entry conditions
    const entryConditions = bot.strategy.entryConditions as StrategyRules;
    console.log(`\n📈 Entry Conditions:`);
    console.log(JSON.stringify(entryConditions, null, 2));

    // Parse exit conditions
    const exitConditions = bot.strategy.exitConditions as StrategyRules;
    console.log(`\n📉 Exit Conditions:`);
    console.log(JSON.stringify(exitConditions, null, 2));

    // Analyze Bollinger Bands conditions
    console.log(`\n🔍 Bollinger Bands Analysis:`);
    console.log('='.repeat(80));

    const bbEntryRules = entryConditions.rules?.filter((rule: BollingerBandsCondition) =>
      rule.indicator === 'PRICE' &&
      typeof rule.value === 'string' &&
      (rule.value === 'BB_UPPER' || rule.value === 'BB_LOWER')
    );

    const bbExitRules = exitConditions.rules?.filter((rule: BollingerBandsCondition) =>
      rule.indicator === 'PRICE' &&
      typeof rule.value === 'string' &&
      (rule.value === 'BB_UPPER' || rule.value === 'BB_LOWER' || rule.value === 'BB_MIDDLE')
    );

    if (bbEntryRules && bbEntryRules.length > 0) {
      console.log(`\n✅ Found ${bbEntryRules.length} Bollinger Bands entry rule(s):`);
      bbEntryRules.forEach((rule: BollingerBandsCondition, index: number) => {
        console.log(`\n   Rule ${index + 1}:`);
        console.log(`      Condition: PRICE ${rule.operator} ${rule.value}`);
        console.log(`      Weight: ${rule.weight}`);

        // Determine strategy type
        if (rule.operator === '<' && rule.value === 'BB_LOWER') {
          console.log(`      🎯 Strategy Type: MEAN REVERSION (Buy on Oversold)`);
          console.log(`      📖 Logic: Price below lower band signals oversold condition`);
          console.log(`      ✅ Expected Behavior: BUY when Price < Lower Band`);
        } else if (rule.operator === '>' && rule.value === 'BB_UPPER') {
          console.log(`      🎯 Strategy Type: MOMENTUM BREAKOUT (Buy on Breakout)`);
          console.log(`      📖 Logic: Price above upper band signals strong momentum`);
          console.log(`      ✅ Expected Behavior: BUY when Price > Upper Band`);
        } else {
          console.log(`      ⚠️  Unusual Bollinger Bands Configuration!`);
          console.log(`      This combination might not follow standard trading practices.`);
        }
      });
    } else {
      console.log(`\n⚠️  No Bollinger Bands conditions found in entry rules.`);
    }

    if (bbExitRules && bbExitRules.length > 0) {
      console.log(`\n✅ Found ${bbExitRules.length} Bollinger Bands exit rule(s):`);
      bbExitRules.forEach((rule: BollingerBandsCondition, index: number) => {
        console.log(`\n   Exit Rule ${index + 1}:`);
        console.log(`      Condition: PRICE ${rule.operator} ${rule.value}`);
        console.log(`      Weight: ${rule.weight}`);
      });
    }

    // Check for potential issues
    console.log(`\n\n⚠️  Potential Issues:`);
    console.log('='.repeat(80));

    let issuesFound = false;

    // Issue 1: Missing lower band buy check
    const hasUpperBandBuy = bbEntryRules?.some((rule: BollingerBandsCondition) =>
      rule.operator === '>' && rule.value === 'BB_UPPER'
    );
    const hasLowerBandBuy = bbEntryRules?.some((rule: BollingerBandsCondition) =>
      rule.operator === '<' && rule.value === 'BB_LOWER'
    );

    if (hasUpperBandBuy && !hasLowerBandBuy) {
      issuesFound = true;
      console.log(`\n❌ Issue 1: Momentum-only Strategy`);
      console.log(`   Problem: Strategy only checks for upper band breakout`);
      console.log(`   Impact: Will miss oversold buy opportunities when price drops below lower band`);
      console.log(`   Example: If Price=$69.35 and Lower Band=$69.43, bot won't buy`);
      console.log(`   Recommendation: Consider adding lower band buy condition for mean reversion`);
    }

    if (hasLowerBandBuy && !hasUpperBandBuy) {
      console.log(`\n✅ Mean Reversion Strategy Detected`);
      console.log(`   Strategy buys on oversold conditions (price < lower band)`);
    }

    // Issue 2: Check for conflicting conditions
    if (hasUpperBandBuy && hasLowerBandBuy) {
      console.log(`\n⚠️  Warning: Hybrid Strategy`);
      console.log(`   Strategy has both momentum and mean reversion signals`);
      console.log(`   Ensure weights are balanced appropriately`);
    }

    if (!issuesFound && bbEntryRules && bbEntryRules.length > 0) {
      console.log(`\n✅ No obvious issues detected in strategy configuration.`);
    }

    // Recent trades analysis
    if (bot.trades && bot.trades.length > 0) {
      console.log(`\n\n📊 Recent Trades (Last 5):`);
      console.log('='.repeat(80));
      bot.trades.forEach((trade, index) => {
        console.log(`\n${index + 1}. ${trade.side} ${trade.quantity} ${trade.symbol} @ $${trade.price}`);
        console.log(`   Total: $${trade.total}`);
        console.log(`   Status: ${trade.status}`);
        console.log(`   Reason: ${trade.reason || 'N/A'}`);
        console.log(`   Date: ${trade.executedAt}`);
      });
    } else {
      console.log(`\n\nℹ️  No trades executed yet.`);
    }

    // Recommendations
    console.log(`\n\n💡 Recommendations:`);
    console.log('='.repeat(80));
    console.log(`
1. Test Strategy with Current Market Data:
   - Run a test execution to see current indicator values
   - Verify that conditions match intended trading logic

2. Standard Bollinger Bands Strategies:

   A. Mean Reversion (Conservative):
      Entry: PRICE < BB_LOWER (oversold)
      Exit: PRICE > BB_UPPER (overbought)

   B. Momentum Breakout (Aggressive):
      Entry: PRICE > BB_UPPER (breakout)
      Exit: PRICE < BB_MIDDLE (trend weakening)

   C. Hybrid (Balanced):
      Entry: (PRICE < BB_LOWER) OR (PRICE > BB_UPPER with high volume)
      Exit: Based on opposite band touch

3. Verify Time Horizon Alignment:
   - SHORT_TERM: Use 15min-1hr candles, tight bands (period=10-15)
   - SWING: Use 1hr-daily candles, standard bands (period=20)
   - LONG_TERM: Use daily-weekly candles, wider bands (period=50)

4. Consider Market Conditions:
   - Ranging Market: Mean reversion works better
   - Trending Market: Momentum breakout works better
   - Monitor Bollinger Band width (volatility indicator)
`);

    console.log(`\n✅ Diagnosis Complete!\n`);

  } catch (error) {
    console.error(`\n💥 Error during diagnosis:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const botId = process.argv[2];

if (!botId) {
  console.error(`\n❌ Usage: npx tsx scripts/diagnose-bot-strategy.ts <bot-id>\n`);
  console.error(`Example: npx tsx scripts/diagnose-bot-strategy.ts cmh575nia0006jm04ptqcsxb6\n`);
  process.exit(1);
}

diagnoseBotStrategy(botId);
