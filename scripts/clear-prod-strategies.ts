import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting all strategies from production...');
  const result = await prisma.strategy.deleteMany({});
  console.log(`✅ Deleted ${result.count} strategies`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
