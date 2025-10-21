import { prisma } from '@/lib/prisma';

const defaultSymbols = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.' },
];

export async function seedDefaultWatchlist() {
  console.log('🌱 Seeding default watchlist...');

  for (const { symbol, name } of defaultSymbols) {
    try {
      const existing = await prisma.watchList.findUnique({
        where: { symbol }
      });

      if (!existing) {
        await prisma.watchList.create({
          data: {
            symbol,
            name,
            isActive: true
          }
        });
        console.log(`✓ Added ${symbol} - ${name}`);
      } else {
        console.log(`- ${symbol} already exists`);
      }
    } catch (error) {
      console.error(`✗ Failed to add ${symbol}:`, error);
    }
  }

  console.log('🌱 Default watchlist seeding completed');
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDefaultWatchlist()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}