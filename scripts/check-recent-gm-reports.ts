import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const gmBot = await prisma.bot.findFirst({
    where: { symbol: 'GM' }
  });

  if (!gmBot) {
    console.log('❌ GM 봇 없음');
    return;
  }

  const reports = await prisma.report.findMany({
    where: { botId: gmBot.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      createdAt: true,
      timestamp: true,
      newsSentiment: true,
      newsArticles: true,
      fmpParsedData: true
    }
  });

  console.log('📊 GM 최근 리포트 3개:');
  reports.forEach((r, i) => {
    const articles = r.newsArticles ? JSON.parse(r.newsArticles) : [];
    console.log(`${i+1}. ID: ${r.id}`);
    console.log(`   생성 시간 (createdAt): ${r.createdAt.toISOString()}`);
    console.log(`   타임스탬프 (timestamp): ${r.timestamp.toISOString()}`);
    console.log(`   감성 점수: ${r.newsSentiment}`);
    console.log(`   기사: ${articles.length}개`);
    console.log(`   FMP: ${r.fmpParsedData ? 'O' : 'X'}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
