import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const report = await prisma.report.findUnique({
    where: { id: 'cmh58mv1k0001k104rgrq5urq' },
    select: {
      id: true,
      createdAt: true,
      newsArticles: true,
      newsSummary: true,
      newsSentiment: true,
      fmpParsedData: true
    }
  });

  if (!report) {
    console.log('❌ 리포트 없음');
    return;
  }

  console.log('📊 최신 GM 리포트 상세:');
  console.log('ID:', report.id);
  console.log('생성:', report.createdAt.toISOString());
  console.log('');

  console.log('📰 뉴스 기사 필드:');
  console.log('  newsArticles:', report.newsArticles ? `길이 ${report.newsArticles.length}자` : 'null');
  console.log('  newsSummary:', report.newsSummary ? `길이 ${report.newsSummary.length}자` : 'null');
  console.log('  newsSentiment:', report.newsSentiment);
  console.log('');

  console.log('📊 FMP 데이터 필드:');
  if (report.fmpParsedData) {
    const fmpData = JSON.parse(report.fmpParsedData);
    console.log('  FMP keys:', Object.keys(fmpData));
    console.log('  뉴스:', fmpData.news?.length || 0);
    console.log('  보도자료:', fmpData.pressReleases?.length || 0);
    console.log('  SEC:', fmpData.secFilings?.length || 0);
    console.log('  내부자:', fmpData.insiderTrades?.length || 0);
  } else {
    console.log('  fmpParsedData: null');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
