/**
 * Analyze signal diversity of investment opportunities
 * to understand why AI picks certain stocks over higher-ranked ones
 */

import { marketEventsService } from '@/lib/services/marketEventsService';

async function main() {
  console.log('📊 Analyzing signal diversity of investment opportunities...\n');

  // Get investment opportunities
  const opportunities = await marketEventsService.getInvestmentOpportunities();

  // Focus on top 15 by score + the AI-recommended ones
  const aiRecommended = ['AMZN', 'POOL', 'VC'];
  const targetSymbols = new Set([
    ...opportunities.slice(0, 15).map(o => o.symbol),
    ...aiRecommended
  ]);

  const analysisData = opportunities
    .filter(opp => targetSymbols.has(opp.symbol))
    .map(opp => {
      // Count unique signal TYPES (not total signals)
      const signalTypes = new Set(opp.signals.map(s => s.type));
      const signalTypeCount = signalTypes.size;

      // Group signals by type
      const signalsByType: Record<string, number> = {};
      for (const signal of opp.signals) {
        signalsByType[signal.type] = (signalsByType[signal.type] || 0) + 1;
      }

      return {
        symbol: opp.symbol,
        companyName: opp.companyName,
        totalScore: opp.totalScore,
        totalSignals: opp.signals.length,
        uniqueSignalTypes: signalTypeCount,
        signalTypes: Array.from(signalTypes).sort(),
        signalsByType,
        isAIRecommended: aiRecommended.includes(opp.symbol),
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('📈 순위 vs 🤖 AI 추천 비교:\n');

  for (const data of analysisData) {
    const marker = data.isAIRecommended ? '🤖 AI 선택' : '  ';
    console.log(`${marker} ${data.symbol.padEnd(6)} | 점수: ${data.totalScore.toFixed(2)} | 총 시그널: ${data.totalSignals}개 | ✨ 유니크 타입: ${data.uniqueSignalTypes}개`);
    console.log(`        ${data.companyName}`);
    console.log(`        타입: ${data.signalTypes.join(', ')}`);

    // Show signal type breakdown
    const breakdown = Object.entries(data.signalsByType)
      .map(([type, count]) => `${type}(${count})`)
      .join(', ');
    console.log(`        상세: ${breakdown}`);
    console.log();
  }

  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('💡 AI 선택 기준 설명:\n');
  console.log('  ✅ 시그널 타입 다양성 = 서로 DIFFERENT한 시그널 종류 개수');
  console.log('     예: insider_buying(3개) + analyst_upgrade(1개) = 2 TYPES ✓');
  console.log('  ❌ 같은 타입 반복은 1 TYPE으로 카운트');
  console.log('     예: insider_buying(5개) = 1 TYPE만 (점수는 높아도)');
  console.log();
  console.log('  🎯 봇 트레이딩 적합성:');
  console.log('     - 여러 타입의 시그널 = 다각도 확인 (신뢰도 ↑)');
  console.log('     - 높은 유동성 (거래량) = 자동 매매 원활');
  console.log('     - 명확한 기술적 패턴 = 봇 진입/청산 용이');
  console.log();
}

main()
  .catch(console.error)
  .finally(() => process.exit());
