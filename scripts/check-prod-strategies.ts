import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.strategy.count();
  console.log(`Total strategies: ${count}`);
  
  const strategies = await prisma.strategy.findMany({
    select: { id: true, name: true, createdAt: true }
  });
  
  console.log('\nStrategies:');
  strategies.forEach(s => {
    console.log(`- ${s.name} (${s.id})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
