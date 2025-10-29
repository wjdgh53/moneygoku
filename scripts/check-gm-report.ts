import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // GM 봇 찾기
  const gmBot = await prisma.bot.findFirst({
    where: { symbol: 'GM' }
  });

  if (!gmBot) {
    console.log('❌ GM 봇 없음');
    return;
  }

  // 최근 리포트 가져오기
  const report = await prisma.report.findFirst({
    where: { botId: gmBot.id },
    orderBy: { timestamp: 'desc' }
  });

  if (!report) {
    console.log('❌ GM 리포트 없음');
    return;
  }

  console.log('📊 GM 최근 리포트 (ID:', report.id + ')');
  console.log('📅 생성 시간:', report.timestamp);
  console.log('');
  console.log('📰 뉴스 분석:');
  console.log('  - 감성 점수:', report.newsSentiment);
  console.log('  - 감성 라벨:', report.sentimentLabel);
  console.log('  - 뉴스 요약:', report.newsSummary?.substring(0, 100) || '없음');

  if (report.newsArticles) {
    const articles = JSON.parse(report.newsArticles);
    console.log('  - 기사 수:', articles.length);

    console.log('\n📰 기사 목록:');
    articles.slice(0, 3).forEach((article: any, i: number) => {
      console.log(`  ${i+1}. ${article.title}`);
      console.log(`     ${article.url}`);
    });
  } else {
    console.log('  - ❌ newsArticles 필드 비어있음!');
  }

  if (report.fmpParsedData) {
    const fmpData = JSON.parse(report.fmpParsedData);
    console.log('');
    console.log('📊 FMP 데이터:');
    console.log('  - 뉴스:', fmpData.news?.length || 0);
    console.log('  - 보도자료:', fmpData.pressReleases?.length || 0);
    console.log('  - SEC 서류:', fmpData.secFilings?.length || 0);
    console.log('  - 내부자 거래:', fmpData.insiderTrades?.length || 0);
  } else {
    console.log('  - ❌ fmpParsedData 필드 비어있음!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
