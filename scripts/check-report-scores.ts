import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const report = await prisma.report.findUnique({
    where: { id: 'cmh9o8ozy0001jm04nwl15sux' },
    select: {
      id: true,
      createdAt: true,
      technicalScore: true,
      baseScore: true,
      gptAdjustment: true,
      finalScore: true,
      newsSentiment: true,
      newsSummary: true,
      newsArticles: true,
      aiReasoning: true,
      objectiveReasoning: true
    }
  });

  console.log('📊 DB에 저장된 실제 값:');
  console.log('ID:', report?.id);
  console.log('생성 시간:', report?.createdAt);
  console.log('');
  console.log('🔢 점수 필드:');
  console.log('  technicalScore:', report?.technicalScore);
  console.log('  baseScore:', report?.baseScore);
  console.log('  gptAdjustment:', report?.gptAdjustment);
  console.log('  finalScore:', report?.finalScore);
  console.log('');
  console.log('📰 뉴스 데이터:');
  console.log('  newsSentiment:', report?.newsSentiment);
  console.log('  newsSummary:', report?.newsSummary ? '있음' : '없음');
  console.log('  newsArticles:', report?.newsArticles ? 'JSON 있음' : '없음');
  console.log('');
  console.log('🤖 AI 추론:');
  console.log('  objectiveReasoning:', report?.objectiveReasoning ? '있음' : '없음');
  console.log('  aiReasoning:', report?.aiReasoning ? '있음' : '없음');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
