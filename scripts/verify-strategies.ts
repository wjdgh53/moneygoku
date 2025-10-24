import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const strategies = await prisma.strategy.findMany({
    take: 3,
    select: {
      name: true,
      entryConditions: true,
      exitConditions: true
    }
  });

  console.log('📊 Sample strategies with conditions:\n');
  strategies.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name}`);
    console.log(`   Entry Rules: ${s.entryConditions?.rules?.length || 0} rules`);
    console.log(`   Exit Rules: ${s.exitConditions?.rules?.length || 0} rules`);
    console.log(`   Indicators: ${s.entryConditions?.indicators?.join(', ') || 'none'}`);
    console.log();
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
