import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const report = await prisma.report.findFirst({
    where: {
      id: 'cmh9o8ozy0001jm04nwl15sux'
    },
    select: {
      id: true,
      createdAt: true,
      newsSummary: true,
      newsSentiment: true,
      newsArticles: true
    }
  });

  if (!report) {
    console.log('❌ 리포트 없음');
    return;
  }

  console.log('📊 최신 GM 리포트 뉴스 상세:');
  console.log('ID:', report.id);
  console.log('생성:', report.createdAt.toISOString());
  console.log('');

  console.log('📰 뉴스 요약:');
  console.log(report.newsSummary);
  console.log('');

  console.log(`감성 점수: ${report.newsSentiment}`);
  console.log('');

  if (report.newsArticles) {
    const articles = JSON.parse(report.newsArticles);
    console.log(`📄 기사 ${articles.length}개:`);
    articles.forEach((article: any, i: number) => {
      console.log(`\n${i + 1}. ${article.title}`);
      console.log(`   출처: ${article.source}`);
      console.log(`   URL: ${article.url}`);
      console.log(`   날짜: ${article.publishedDate}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
