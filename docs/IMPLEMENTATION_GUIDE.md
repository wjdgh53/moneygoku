# Quick Implementation Guide

## 5-Minute Integration

### 1. Update Insider Scoring (2 minutes)

**File**: `/lib/services/investmentOpportunityService.ts`

**Add import** (line ~22):
```typescript
import { calculateInsiderBuyingScore } from '@/lib/utils/insiderScoringAlgorithm';
```

**Replace insider signal creation** (lines ~265-287):
```typescript
// BEFORE:
addSignal(insider.symbol, {
  type: 'insider_buying',
  score: SIGNAL_SCORES.insider_buying,  // ❌ Fixed score
  // ...
});

// AFTER:
const dynamicScore = calculateInsiderBuyingScore({
  securitiesTransacted: insider.securitiesTransacted,
  pricePerShare: insider.price,
  typeOfOwner: insider.typeOfOwner,
  securitiesOwned: insider.securitiesOwned,
  transactionDate: insider.transactionDate,
});

addSignal(insider.symbol, {
  type: 'insider_buying',
  score: dynamicScore,  // ✅ Dynamic score
  // ...
  metadata: {
    // ... existing fields ...
    securitiesOwned: insider.securitiesOwned,  // ✅ Add this
  },
});
```

### 2. Update AI Analysis (3 minutes)

**File**: `/lib/services/investmentOpportunityService.ts`

**Add import** (line ~22):
```typescript
import { generateInvestmentAnalysis } from '@/lib/services/aiInvestmentAnalysis';
```

**Replace method** (lines ~461-508):
```typescript
// BEFORE:
async generateAISummary(opportunity: InvestmentOpportunity): Promise<string> {
  // ... old implementation ...
}

// AFTER:
async generateAISummary(opportunity: InvestmentOpportunity): Promise<string> {
  return generateInvestmentAnalysis(opportunity);
}
```

### 3. Test

```bash
npm test -- insiderScoringAlgorithm
npm run dev
```

That's it! 🎉

---

## Detailed Changes

### Change 1: Dynamic Insider Scoring

**Location**: `/lib/services/investmentOpportunityService.ts:265-287`

**Full Code Block**:
```typescript
// 7. Insider Trading (내부자 매수 - 가장 강력한 신호)
// 같은 사람이 같은 종목을 여러 번 산 경우 중복 제거 (가장 큰 거래량만 선택)
const insiderByPersonAndSymbol = new Map<string, typeof marketEvents.insiderTrading[0]>();

marketEvents.insiderTrading.forEach((insider) => {
  const key = `${insider.reportingName}-${insider.symbol}`;

  // 같은 사람+종목 조합이 이미 있다면, 거래량이 더 큰 것을 선택
  const existing = insiderByPersonAndSymbol.get(key);
  if (!existing || insider.securitiesTransacted > existing.securitiesTransacted) {
    insiderByPersonAndSymbol.set(key, insider);
  }
});

// 각 사람+종목 조합마다 1개 시그널만 생성 (여러 임원이 동시에 사는 경우는 각각 카운트)
insiderByPersonAndSymbol.forEach((insider) => {
  // ✅ ADD: Calculate dynamic score
  const dynamicScore = calculateInsiderBuyingScore({
    securitiesTransacted: insider.securitiesTransacted,
    pricePerShare: insider.price,
    typeOfOwner: insider.typeOfOwner,
    securitiesOwned: insider.securitiesOwned,
    transactionDate: insider.transactionDate,
  });

  const sharesBought = insider.securitiesTransacted.toLocaleString();
  const totalValue = (insider.securitiesTransacted * insider.price).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  addSignal(insider.symbol, {
    type: 'insider_buying',
    score: dynamicScore,  // ✅ CHANGED: was SIGNAL_SCORES.insider_buying
    source: 'FMP',
    description: `${insider.reportingName} bought ${sharesBought} shares (${totalValue})`,
    date: insider.transactionDate,
    metadata: {
      reportingName: insider.reportingName,
      typeOfOwner: insider.typeOfOwner,
      securitiesTransacted: insider.securitiesTransacted,
      price: insider.price,
      securitiesOwned: insider.securitiesOwned,  // ✅ ADD this field
      link: insider.link,
    },
  });
});
```

### Change 2: Enhanced AI Analysis

**Location**: `/lib/services/investmentOpportunityService.ts:461-508`

**Full Method Replacement**:
```typescript
/**
 * AI 요약 생성
 *
 * @param opportunity - 투자 기회 객체
 * @returns AI 생성 투자 논리 요약 (3-4문장, 균형잡힌 분석)
 */
async generateAISummary(
  opportunity: InvestmentOpportunity
): Promise<string> {
  try {
    return await generateInvestmentAnalysis(opportunity);
  } catch (error) {
    console.error(
      `[InvestmentOpportunity] Failed to generate AI summary for ${opportunity.symbol}:`,
      error
    );
    // AI 요약 실패 시 기본 요약 반환
    return this.generateFallbackSummary(opportunity);
  }
}
```

**Note**: Keep the existing `generateFallbackSummary()` method as-is (backup).

---

## Verification Checklist

### Scoring Algorithm
- [ ] Import added: `calculateInsiderBuyingScore`
- [ ] Dynamic score calculation in place of fixed score
- [ ] `securitiesOwned` added to metadata
- [ ] Tests pass: `npm test -- insiderScoringAlgorithm`

### AI Analysis
- [ ] Import added: `generateInvestmentAnalysis`
- [ ] Method replaced with new implementation
- [ ] Fallback still exists for error handling
- [ ] Dev server runs: `npm run dev`

### Integration Testing
- [ ] Navigate to investment opportunities page
- [ ] Check scores vary by transaction size
- [ ] Read AI summaries - should be non-repetitive
- [ ] Verify Korean language output
- [ ] Check for risk mentions in summaries

---

## Expected Behavior Changes

### Before

**VHAI (190M shares @ $0.10)**:
- Score: 5.0 (flat)
- AI: "Multiple positive signals suggest strong investment potential. Insider buying activity indicates confidence..."

**CMC (1,712 shares @ $20)**:
- Score: 5.0 (flat)
- AI: "Multiple positive signals suggest strong investment potential. Insider buying activity indicates confidence..."

### After

**VHAI (190M shares @ $0.10)**:
- Score: ~10.1 (dynamic)
- AI: "VHAI의 Taylor Paul Richard이 190억 주($1,900만)를 매수한 것은 경영진의 강력한 확신을 시사하나, 이례적으로 큰 거래 규모는 구조조정이나 특수 상황과 연관될 가능성이 있습니다..."

**CMC (1,712 shares @ $20)**:
- Score: ~0.9 (dynamic)
- AI: "CMC의 소액 내부자 매수($34k)는 일상적인 포트폴리오 조정일 가능성이 높으며, 단독으로는 강력한 투자 시그널로 보기 어렵습니다..."

---

## Rollback Plan

If issues arise, simply revert these changes:

### Revert Scoring
```typescript
// In collectSignals(), line ~273:
addSignal(insider.symbol, {
  type: 'insider_buying',
  score: SIGNAL_SCORES.insider_buying,  // Back to fixed score
  // ...
});
```

### Revert AI
```typescript
// Restore original generateAISummary() method
// (Keep backup in git history)
```

### Git Commands
```bash
# If you committed changes:
git log --oneline  # Find commit hash
git revert <commit-hash>

# If not committed:
git checkout -- lib/services/investmentOpportunityService.ts
```

---

## Troubleshooting

### Issue: TypeScript errors on `calculateInsiderBuyingScore`

**Solution**: Ensure file exists at correct path:
```bash
ls lib/utils/insiderScoringAlgorithm.ts
```

If missing, the file should have been created. Check file system or re-create.

### Issue: AI summaries still repetitive

**Checklist**:
1. Verify import: `import { generateInvestmentAnalysis } from '@/lib/services/aiInvestmentAnalysis'`
2. Check method actually calls new function
3. Verify OpenAI API key in `.env.local`
4. Check console for API errors

### Issue: Scores are too low/high

**Debug**:
```typescript
import { explainInsiderScore } from '@/lib/utils/insiderScoringAlgorithm';

const explanation = explainInsiderScore({
  securitiesTransacted: /* ... */,
  // ...
});

console.log(explanation.breakdown.explanation);
```

This shows exactly how score is calculated.

### Issue: Tests failing

**Common causes**:
1. Missing test file - ensure `__tests__/utils/insiderScoringAlgorithm.test.ts` exists
2. Jest configuration - check `jest.config.ts` includes new path
3. Module resolution - try `npm install` to refresh

---

## Performance Notes

### Scoring Algorithm
- **Latency**: <1ms per transaction (negligible)
- **Memory**: O(1) per transaction
- **Impact**: None

### AI Analysis
- **Latency**: 2-3 seconds per opportunity
- **Optimization**: Only generate for top 10-20 stocks
- **Rate Limits**: Built-in retry and batching

**Recommended pattern**:
```typescript
// In API route or service:
const opportunities = investmentOpportunityService.analyzeMarketEvents(marketEvents);

// Only generate AI for top opportunities
const top10 = opportunities.slice(0, 10);
for (const opp of top10) {
  opp.aiSummary = await investmentOpportunityService.generateAISummary(opp);
}

return opportunities; // Top 10 have summaries, rest don't
```

---

## Next Steps

1. ✅ **Implement changes** (follow 5-minute guide above)
2. ✅ **Test locally** (verify scores and summaries)
3. 📊 **Monitor in production**:
   - Track score distribution
   - Review AI quality (sample 10-20 summaries)
   - Check for errors in logs
4. 🔬 **Future enhancements**:
   - Add fundamental data (P/E, market cap)
   - Sector-specific analysis
   - Risk scoring
   - Backtesting validation

---

## Support

For questions or issues:
1. Check full documentation: `/docs/INVESTMENT_SCORING_IMPROVEMENTS.md`
2. Review test suite: `__tests__/utils/insiderScoringAlgorithm.test.ts`
3. Check implementation: `lib/utils/insiderScoringAlgorithm.ts`
4. Consult AI service: `lib/services/aiInvestmentAnalysis.ts`
