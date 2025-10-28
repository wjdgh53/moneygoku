import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Production Bots Strategy Audit\n');

  const bots = await prisma.bot.findMany({
    include: {
      strategy: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`📊 Total bots found: ${bots.length}\n`);

  for (const bot of bots) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🤖 Bot: ${bot.name} (${bot.id})`);
    console.log(`   Symbol: ${bot.symbol}`);
    console.log(`   Status: ${bot.status}`);
    console.log(`   Mode: ${bot.mode}`);

    if (bot.strategy) {
      console.log(`\n   📋 Strategy: ${bot.strategy.name}`);
      console.log(`   Time Horizon: ${bot.strategy.timeHorizon}`);
      console.log(`   Risk Appetite: ${bot.strategy.riskAppetite}`);
      console.log(`   Stop Loss: ${bot.strategy.stopLoss}%`);
      console.log(`   Take Profit: ${bot.strategy.takeProfit}%`);

      console.log('\n   📥 Entry Conditions:');
      const entryConditions = bot.strategy.entryConditions as any;
      if (entryConditions.indicators) {
        console.log(`      Indicators: ${entryConditions.indicators.join(', ')}`);
      }
      if (entryConditions.rules) {
        console.log('      Rules:');
        for (const rule of entryConditions.rules) {
          console.log(`        - ${rule.indicator} ${rule.operator} ${rule.value} (weight: ${rule.weight})`);
        }
      }

      console.log('\n   📤 Exit Conditions:');
      const exitConditions = bot.strategy.exitConditions as any;
      if (exitConditions.indicators) {
        console.log(`      Indicators: ${exitConditions.indicators.join(', ')}`);
      }
      if (exitConditions.rules) {
        console.log('      Rules:');
        for (const rule of exitConditions.rules) {
          console.log(`        - ${rule.indicator} ${rule.operator} ${rule.value} (weight: ${rule.weight})`);
        }
      }
    } else {
      console.log('   ⚠️  No strategy assigned');
    }

    // Check custom config
    if (bot.config) {
      try {
        const config = JSON.parse(bot.config);
        console.log('\n   ⚙️  Custom Config:');
        console.log(JSON.stringify(config, null, 6));
      } catch (e) {
        console.log('\n   ⚠️  Invalid config JSON');
      }
    }
  }

  console.log(`\n${'='.repeat(80)}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
