# Quick Start: Diagnosing Bollinger Bands Strategy Issues

## Problem
Your trading bot shows:
- ✗ "Bollinger price above upper" = FALSE
- Price is actually BELOW lower band (oversold condition)
- Bot is missing buy signals

## Quick Diagnosis

### Step 1: Check Your Bot's Strategy

#### Option A: Via API (Recommended)
```bash
# Fetch bot configuration
curl https://moneygoku.vercel.app/api/bots/cmh575nia0006jm04ptqcsxb6

# Look for strategy.entryConditions
# Should contain something like:
{
  "rules": [
    { "indicator": "PRICE", "operator": "<", "value": "BB_LOWER" }  // Mean Reversion
    // OR
    { "indicator": "PRICE", "operator": ">", "value": "BB_UPPER" }  // Momentum
  ]
}
```

#### Option B: Via Diagnostic Script
```bash
cd /Users/jeonghonoh/Documents/newnomad/moneygoku
npx tsx scripts/diagnose-bot-strategy.ts <your-bot-id>
```

### Step 2: Identify Your Strategy Type

| Your Bot Checks | Strategy Type | What It Does | When It Buys |
|----------------|---------------|--------------|--------------|
| PRICE > BB_UPPER | Momentum Breakout | Follows strong trends | Price breaks above upper band |
| PRICE < BB_LOWER | Mean Reversion | Buys oversold dips | Price drops below lower band |
| Both conditions | Hybrid | Adapts to market | Either condition met |

### Step 3: Match Strategy to Market Condition

**Your Current Situation:**
- Price: $69.35
- Lower Band: $69.43
- **Price < Lower Band** ✅ (Oversold)

**Correct Strategy:** Mean Reversion
```json
{
  "rules": [
    { "indicator": "PRICE", "operator": "<", "value": "BB_LOWER", "weight": 0.8 }
  ]
}
```

**Wrong Strategy:** Momentum (what you likely have)
```json
{
  "rules": [
    { "indicator": "PRICE", "operator": ">", "value": "BB_UPPER", "weight": 0.8 }
  ]
}
```

## Quick Fix

### Solution 1: Change Strategy (Immediate)

1. Go to bot settings
2. Change strategy to "⚖️ 볼린저밴드 평균회귀" (Mean Reversion)
3. Save and test

### Solution 2: Create Hybrid Strategy (Better)

Create a new strategy with both conditions:
```json
{
  "name": "Bollinger Hybrid",
  "entryConditions": {
    "indicators": ["BBANDS", "RSI"],
    "rules": [
      { "indicator": "PRICE", "operator": "<", "value": "BB_LOWER", "weight": 0.8 },
      { "indicator": "RSI", "operator": "<", "value": 35, "weight": 0.4 }
    ]
  },
  "exitConditions": {
    "rules": [
      { "indicator": "PRICE", "operator": ">", "value": "BB_UPPER", "weight": 1.0 }
    ]
  }
}
```

## Verify Fix

### Test Your Bot
```bash
# Via API
curl -X POST https://moneygoku.vercel.app/api/bots/<bot-id>/test

# Check response
# Should show:
{
  "conditions": [
    {
      "condition": "Bollinger price_below_lower",
      "result": true,  // ✅ Should be true now!
      "actual": "Price=69.35, Upper=69.77, Lower=69.43"
    }
  ],
  "finalDecision": "BUY"  // ✅ Should be BUY!
}
```

## Common Patterns

### When to Use Each Strategy

**Use Mean Reversion** when:
- ✅ Asset trades in range (support/resistance levels)
- ✅ Market is choppy, not trending strongly
- ✅ You want to buy dips and sell rallies
- Example: Mature stocks, ETFs, range-bound crypto

**Use Momentum** when:
- ✅ Strong trending market (up or down)
- ✅ High volume breakouts
- ✅ You want to ride trends
- Example: Growth stocks, leveraged ETFs, trending crypto

**Use Hybrid** when:
- ✅ Market conditions change frequently
- ✅ You want to capture both dips and breakouts
- ✅ You prefer balanced risk/reward
- Example: Most volatile assets, crypto, tech stocks

## Cheat Sheet

### Bollinger Bands Quick Reference

```
Price Position          | Signal        | Strategy Type
-----------------------|---------------|------------------
Price > Upper Band     | Overbought    | Momentum BUY / MR SELL
Upper > Price > Middle | Uptrend       | Hold Long
Price ≈ Middle Band    | Neutral       | Wait
Middle > Price > Lower | Downtrend     | Caution
Price < Lower Band     | Oversold      | MR BUY / Momentum Avoid
```

### RSI + Bollinger Bands Combo (Recommended)

| BB Condition | RSI Condition | Action | Confidence |
|--------------|---------------|--------|------------|
| Price < Lower | RSI < 30 | STRONG BUY | ⭐⭐⭐⭐⭐ |
| Price < Lower | RSI 30-50 | BUY | ⭐⭐⭐⭐ |
| Price < Lower | RSI > 50 | WEAK BUY | ⭐⭐⭐ |
| Price > Upper | RSI > 70 | STRONG SELL | ⭐⭐⭐⭐⭐ |
| Price > Upper | RSI 50-70 | SELL | ⭐⭐⭐⭐ |

## Troubleshooting

### Issue: Bot still not buying on oversold
**Check:**
1. ✅ Strategy has `PRICE < BB_LOWER` in entry conditions
2. ✅ Bot is ACTIVE (not paused)
3. ✅ Sufficient funds allocated
4. ✅ No conflicting conditions (e.g., volume too low)

### Issue: Too many false signals
**Solution:**
Add confirmation indicators:
```json
{
  "rules": [
    { "indicator": "PRICE", "operator": "<", "value": "BB_LOWER", "weight": 0.6 },
    { "indicator": "RSI", "operator": "<", "value": 30, "weight": 0.4 },
    { "indicator": "VOLUME", "operator": ">", "value": "AVG_VOLUME", "weight": 0.2 }
  ]
}
```

### Issue: Bot buying too late
**Solution:**
1. Change threshold: `PRICE < BB_LOWER * 0.995` (buy 0.5% before hitting exact lower band)
2. Use faster time period: Change BB period from 20 to 10 for more responsive bands
3. Add volume confirmation: Only buy if volume is increasing

## Next Steps

1. **Read Full Analysis**: See `ANALYSIS_SUMMARY.md` for complete details
2. **Review Fix Proposal**: See `BOLLINGER_BANDS_FIX_PROPOSAL.md` for enhancements
3. **Run Diagnostic**: Use `scripts/diagnose-bot-strategy.ts` for your bot
4. **Test Strategy**: Paper trade before going live
5. **Monitor Performance**: Review bot reports after 10+ trades

## Resources

### Key Files
- `/lib/services/botTestService.ts` - Condition evaluation logic
- `/lib/services/technicalIndicatorService.ts` - BB data fetching
- `/scripts/seed-strategies.ts` - Strategy templates

### Testing Endpoints
- `GET /api/bots/[id]` - Get bot configuration
- `POST /api/bots/[id]/test` - Test strategy execution
- `GET /api/reports/[botId]` - View test reports

### Documentation
- Alpha Vantage BB: https://www.alphavantage.co/documentation/#bbands
- Bollinger Bands Strategy: https://www.investopedia.com/articles/trading/07/bollinger.asp

---

**Need Help?**
1. Run diagnostic script first
2. Review generated report
3. Compare with this quick reference
4. Adjust strategy configuration
5. Test and monitor results

**Remember**: Bollinger Bands work best with confirmation from other indicators (RSI, Volume, MACD)!
