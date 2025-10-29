import { prisma } from '@/lib/prisma';

async function checkHCATrade() {
  console.log('🔍 HCA 거래 미실행 원인 분석\n');

  // 최근 HCA 봇 테스트 결과 확인
  const recentTest = await prisma.botTestResult.findFirst({
    where: { symbol: 'HCA' },
    orderBy: { timestamp: 'desc' },
    include: {
      bot: true
    }
  });

  if (recentTest) {
    console.log('📋 최근 HCA 테스트 결과:');
    console.log(`   시간: ${recentTest.timestamp}`);
    console.log(`   봇: ${recentTest.bot.name}`);
    console.log(`   최종 결정: ${recentTest.finalDecision}`);
    console.log(`   최종 점수: ${recentTest.finalScore}`);
    console.log(`   거래 실행: ${recentTest.tradeExecuted ? '✅ 실행됨' : '❌ 실행 안됨'}`);
    console.log(`   수량: ${recentTest.quantity || 0}주`);
    console.log('\n📝 AI 추론:');
    console.log(recentTest.aiReasoning || 'N/A');
    console.log('');
  } else {
    console.log('❌ HCA 테스트 결과를 찾을 수 없습니다.\n');
  }

  // HCA 포지션 확인
  const position = await prisma.position.findFirst({
    where: {
      symbol: 'HCA',
      status: 'OPEN'
    },
    orderBy: { createdAt: 'desc' }
  });

  if (position) {
    const totalValue = position.quantity * (position.currentPrice || position.avgEntryPrice);
    console.log('📊 현재 HCA 포지션:');
    console.log(`   수량: ${position.quantity}주`);
    console.log(`   평균 진입가: $${position.avgEntryPrice.toFixed(2)}`);
    console.log(`   현재가: $${position.currentPrice?.toFixed(2) || 'N/A'}`);
    console.log(`   총 투자: $${position.totalInvested.toFixed(2)}`);
    console.log(`   현재 가치: $${totalValue.toFixed(2)}`);
    console.log('');
  } else {
    console.log('📊 현재 HCA 포지션: 없음\n');
  }

  // 봇의 전체 포트폴리오 확인
  if (recentTest?.botId) {
    const allPositions = await prisma.position.findMany({
      where: {
        botId: recentTest.botId,
        status: 'OPEN'
      }
    });

    const totalPortfolioValue = allPositions.reduce((sum, pos) => {
      return sum + pos.quantity * (pos.currentPrice || pos.avgEntryPrice);
    }, 0);

    console.log('💼 봇 전체 포트폴리오:');
    console.log(`   총 포지션 수: ${allPositions.length}개`);
    console.log(`   총 포트폴리오 가치: $${totalPortfolioValue.toFixed(2)}`);

    if (position && totalPortfolioValue > 0) {
      const hcaValue = position.quantity * (position.currentPrice || position.avgEntryPrice);
      const hcaRatio = (hcaValue / totalPortfolioValue) * 100;
      console.log(`   HCA 비중: ${hcaRatio.toFixed(1)}%`);

      if (hcaRatio >= 80) {
        console.log('\n⚠️  원인: 포지션 집중도 80% 이상 (추가 매수 차단)');
      } else if (hcaRatio >= 70) {
        console.log('\n⚠️  원인: 포지션 집중도가 높아 감쇠 효과 및 델타 임계값 미충족 가능성');
      }
    }
    console.log('');

    // 각 포지션 상세
    console.log('📈 포지션 상세:');
    allPositions.forEach((pos) => {
      const value = pos.quantity * (pos.currentPrice || pos.avgEntryPrice);
      const ratio = totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0;
      console.log(`   ${pos.symbol}: ${pos.quantity}주, $${value.toFixed(2)} (${ratio.toFixed(1)}%)`);
    });
  }

  await prisma.$disconnect();
}

checkHCATrade().catch(console.error);
