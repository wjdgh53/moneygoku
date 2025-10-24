import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing cached bot recommendations...');
  const result = await prisma.botRecommendationReport.deleteMany({});
  console.log(`✅ Deleted ${result.count} cached recommendations`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
