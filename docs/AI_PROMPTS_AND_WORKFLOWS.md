# AI Prompts and Investment Workflow Documentation

Complete documentation of stock selection criteria, AI prompts, and automated trading bot recommendation system.

---

## Table of Contents

1. [Stock Selection & Screening Process](#1-stock-selection--screening-process)
2. [Signal Scoring System](#2-signal-scoring-system)
3. [AI Investment Analysis](#3-ai-investment-analysis)
4. [AI Bot Recommendation System](#4-ai-bot-recommendation-system)
5. [Complete Workflow](#5-complete-workflow)

---

## 1. Stock Selection & Screening Process

### 1.1 Momentum Screening Criteria

**Hybrid Approach**: Alpha Vantage + FMP (Financial Modeling Prep)

#### Step-by-Step Filtering Process

```
Step 1: Top Gainers Filter
├── Source: Alpha Vantage Top Gainers API
├── Criteria: Price change > 3%
└── Result: ~50 candidates

Step 2: High Volume Filter
├── Source: Alpha Vantage Most Active API
├── Criteria: High relative volume (proxy for >200% average)
└── Result: ~50 candidates

Step 3: Intersection
├── Process: Find stocks that are BOTH gainers AND most active
└── Result: ~10-20 momentum candidates

Step 4: Market Cap Filter
├── Source: FMP Company Profile API
├── Criteria: Market Cap > $1 Billion
├── Purpose: Ensure liquidity for bot trading
└── Result: ~5-15 qualified candidates

Step 5: RSI Filter
├── Source: FMP Technical Indicators API
├── Criteria: RSI < 80
├── Purpose: Avoid overbought stocks
└── Result: Final momentum stocks (typically 3-10)
```

#### Implementation Details

**Location**: `lib/services/momentumScreenerService.ts`

**Key Parameters**:
- Top Gainers Limit: 50
- Most Active Limit: 50
- Minimum Price Change: +3%
- Minimum Market Cap: $1,000,000,000
- Maximum RSI: 80
- Batch Processing: 5 stocks per batch with 300ms delay (rate limiting)

**Example Console Output**:
```
[MomentumScreener] Starting momentum screening...
[MomentumScreener] Found 32 gainers with >3% change
[MomentumScreener] Found 50 most active stocks
[MomentumScreener] Found 8 momentum candidates (gainers + active)
[MomentumScreener] TSLA: MarketCap=$850.23B, RSI=67.5
[MomentumScreener] NVDA: MarketCap=$2,100.45B, RSI=72.3
[MomentumScreener] Final momentum stocks: 5
[MomentumScreener] Symbols: TSLA, NVDA, AAPL, META, GOOGL
```

---

## 2. Signal Scoring System

### 2.1 Signal Types and Base Scores

| Signal Type | Base Score | Half-Life (Days) | Source |
|------------|-----------|------------------|---------|
| **Insider Buying** | 0.9 - 12.0 (dynamic, capped) | 60 | FMP Insider Trading |
| **Momentum** | 11.0 | N/A | Hybrid Screening |
| **Analyst Upgrade** | 9.0 | 30 | FMP Analyst Ratings |
| **Merger/Acquisition** | 2.0 | 14 | FMP M&A News |
| **Stock Split** | 0.0 | 21 | FMP Stock Splits |
| **Top Gainer** | 2.0 | 3 | Alpha Vantage |
| **Earnings Upcoming** | 1.0 | 7 | FMP Earnings Calendar |
| **High Volume** | 0.5 | 1 | Alpha Vantage |

### 2.2 Dynamic Insider Buying Scoring

**Research-Backed Algorithm**

Insider buying receives **dynamic scores (0.9 - 12.0 points)** based on:

```javascript
calculateInsiderBuyingScore({
  securitiesTransacted: number,    // Number of shares bought
  pricePerShare: number,           // Price per share
  typeOfOwner: string,             // 'officer', 'director', 'beneficial owner'
  securitiesOwned: number,         // Total shares owned after transaction
  transactionDate: string          // ISO date string
})
```

**Scoring Factors**:

1. **Transaction Size** (40% weight)
   - Small: < $100K → 1.0x multiplier
   - Medium: $100K - $1M → 1.5x multiplier
   - Large: $1M - $10M → 2.5x multiplier
   - Very Large: > $10M → 4.0x multiplier

2. **Owner Role** (30% weight)
   - Director: 1.0x multiplier
   - Beneficial Owner: 1.2x multiplier
   - Officer (CEO, CFO, etc.): 1.5x multiplier

3. **Conviction** (30% weight)
   - Based on % increase in position size
   - Measured as: `new_shares / (old_shares + new_shares)`
   - High conviction (>10% increase): 1.5x multiplier
   - Medium conviction (5-10%): 1.2x multiplier
   - Low conviction (<5%): 1.0x multiplier

**Example Calculation**:
```
Officer buys $2.5M worth of stock (mid-large transaction)
Increases position by 8% (medium-high conviction)

Score = BASE_SCORE × size_multiplier × role_multiplier × conviction_multiplier
      = 3.0 × 2.5 × 1.5 × 1.2
      = 13.5 (capped at 12.0)
      = 12.0 points ✓
```

### 2.3 Duplicate Signal Penalties & Diversity Bonuses

**Purpose**: Prevent single-type signal dominance and reward true signal diversity.

#### Duplicate Signal Penalty

When multiple signals of the **same type** appear for a stock, diminishing returns apply:

```
1st signal of type: 100% of score (full value)
2nd signal of type: 50% of score
3rd signal of type: 25% of score
4th+ signal of type: 10% of score
```

**Example - NRC with 3 Insider Buys**:
```
Before penalties:
- Insider buy 1: 7.38 pts
- Insider buy 2: 7.38 pts
- Insider buy 3: 7.38 pts
Total: 22.14 pts

After penalties:
- Insider buy 1: 7.38 × 100% = 7.38 pts
- Insider buy 2: 7.38 × 50% = 3.69 pts
- Insider buy 3: 7.38 × 25% = 1.85 pts
Total: 12.92 pts (43% reduction)
```

#### Signal Diversity Bonus

Stocks with **multiple unique signal TYPES** receive bonus points:

```
1 signal type: +0 points (no bonus)
2 signal types: +3 points
3+ signal types: +5 points
```

**Example - Diverse Stock**:
```
Signals:
- 1× Insider buying (12.0 pts)
- 1× Analyst upgrade (9.0 pts)
- 1× Momentum (11.0 pts)

Base score: 32.0 pts
Diversity bonus: +5 pts (3 types)
Total: 37.0 pts
```

**Why This Matters**:
- **Before**: Stock with 3 insider buys (22 pts) > Stock with diverse signals (32 pts but ranked lower)
- **After**: Diverse stock (37 pts) > Single-type stock (12.92 pts)
- **Result**: AI recommendations favor stocks with multiple confirmation sources for bot trading

### 2.4 Time Decay Function

Signals lose value over time using **exponential decay**:

```
decay_factor = e^(-ln(2) × days_since / half_life)

Example: Analyst upgrade after 15 days (half-life = 30 days)
decay_factor = e^(-0.693 × 15 / 30) = 0.707
effective_score = 8.0 × 0.707 = 5.66 points
```

### 2.5 Total Investment Score Calculation

**Complete Formula** (includes all improvements):

```
Total Score = (Σ signal_with_penalties_and_decay) + diversity_bonus

Where:
- signal_with_penalties_and_decay = base_score × decay_factor × duplicate_penalty
- diversity_bonus = 0 (1 type), 3 (2 types), or 5 (3+ types)
```

**Example: AAPL with diverse signals**:
```
Signals:
- Insider buying: 12.0 × 1.0 (no decay) × 1.0 (1st) = 12.0
- Analyst upgrade: 9.0 × 0.85 (5 days old) × 1.0 (1st) = 7.7
- Momentum: 11.0 × 1.0 (current) × 1.0 (1st) = 11.0
- High volume: 0.5 × 1.0 (today) × 1.0 (1st) = 0.5

Base score: 31.2
Diversity bonus: +5 (4 unique types)
───────────────────────────────────────
Total Score = 36.2 points → Rank #1 ✓
```

**Example: NRC with single-type signals**:
```
Signals (all insider_buying type):
- Insider buy 1: 7.38 × 1.0 × 1.0 = 7.38
- Insider buy 2: 7.38 × 0.95 × 0.5 = 3.50
- Insider buy 3: 7.38 × 0.90 × 0.25 = 1.66

Base score: 12.54
Diversity bonus: +0 (only 1 type)
───────────────────────────────────────
Total Score = 12.54 points → Lower ranking
```

---

## 3. AI Investment Analysis

### 3.1 System Prompt

**Purpose**: Define AI's role and analytical approach

**Location**: `lib/services/aiInvestmentAnalysis.ts` (buildSystemPrompt)

```
You are a professional quantitative analyst specializing in signal-based investment research.

Your analysis should be:
- **Balanced**: Acknowledge both opportunities AND risks
- **Insightful**: Explain WHY signals matter, not just repeat what they are
- **Context-aware**: Different signal combinations require different interpretations
- **Skeptical**: Question assumptions, note limitations
- **Concise**: High information density, no fluff

RED FLAGS to avoid:
❌ Generic phrases like "multiple positive signals"
❌ Repeating signal descriptions verbatim
❌ Pure cheerleading with no risk discussion
❌ Treating all insider buying equally
❌ Ignoring price action context

Write in Korean. Be direct and analytical.
```

### 3.2 User Prompt Template

**Location**: `lib/services/aiInvestmentAnalysis.ts` (buildAnalysisPrompt)

```
Analyze this investment opportunity with depth and balance:

**Stock:** {SYMBOL} ({COMPANY_NAME})
**Score:** {TOTAL_SCORE} points ({SCORE_CATEGORY})
**Current Price: ${PRICE} (+{CHANGE_PERCENT}% today)**

**Market Signals:**

**Insider Activity** (2 transactions):
  • John Doe (CEO) bought 50,000 shares ($2.5M) [Score: 15.0]
  • Jane Smith (CFO) bought 20,000 shares ($1.0M) [Score: 12.0]

**Analyst Ratings** (1 upgrade):
  • Goldman Sachs: Hold → Buy

**Market Action:**
  • +5.2% today
  • Volume: 150M

**Analysis Instructions:**
- Multiple insiders buying suggests strong internal conviction. Analyze WHY multiple executives would commit capital simultaneously.
- Consider: Are these coordinated buys? Different roles (CEO vs CFO)? What does transaction size tell us?

Provide a 3-4 sentence analysis covering:
1. The MOST COMPELLING signal and its significance
2. Supporting confluence of signals (if multiple)
3. Key risk or uncertainty factor (be realistic)
4. Overall assessment (not just bullish cheerleading)

Write in Korean, professionally but concisely. Focus on WHY these signals matter, not just WHAT they are.
```

### 3.3 Example AI Response

**Input Opportunity**:
```json
{
  "symbol": "TSLA",
  "companyName": "Tesla Inc",
  "totalScore": 34.8,
  "price": 248.50,
  "changePercent": 5.2,
  "signals": [
    {
      "type": "insider_buying",
      "score": 15.0,
      "description": "Elon Musk bought 100,000 shares ($24.8M)"
    },
    {
      "type": "analyst_upgrade",
      "score": 8.0,
      "description": "Hold → Buy"
    },
    {
      "type": "momentum",
      "score": 10.0,
      "description": "High momentum: Volume spike + Price surge"
    }
  ]
}
```

**AI Generated Analysis** (Korean):
```
CEO의 대규모 자사주 매입($24.8M)은 회사 전망에 대한 경영진의 강한 확신을 시사하며,
이는 최근 애널리스트 등급 상향과 결합되어 강력한 매수 신호를 형성합니다.
모멘텀 스크리닝 통과(거래량 급증 + 5.2% 상승)는 시장의 긍정적 반응을 확인하지만,
$248 수준에서의 밸류에이션과 과거 변동성을 고려할 때 단기 조정 가능성을 염두에 두어야 합니다.
```

### 3.4 API Configuration

**Model**: GPT-4o-mini (cost-efficient)
**Temperature**: 0.6 (balanced creativity/consistency)
**Max Tokens**: 400 (detailed analysis)
**Max Retries**: 2
**Batch Processing**: 3 concurrent requests with 500ms delays

---

## 4. AI Bot Recommendation System

### 4.1 System Prompt

**Purpose**: Define AI's role as trading bot strategist

**Location**: `lib/services/aiBotRecommendationService.ts`

```
You are an expert trading bot strategist. Analyze investment opportunities and recommend stocks suitable for automated trading bots. Consider:
- Signal strength and diversity
- Market momentum and volatility
- Risk-reward ratio
- Bot trading suitability (avoid highly illiquid or erratic stocks)

Provide recommendations in JSON format.
```

### 4.2 User Prompt Template

**Location**: `lib/services/aiBotRecommendationService.ts` (buildPrompt)

```
# Investment Opportunities Analysis for Bot Creation

## Available Trading Strategies:
[
  {
    "id": "clx123abc...",
    "name": "Balanced Growth",
    "timeHorizon": "medium-term",
    "riskAppetite": "moderate"
  },
  {
    "id": "clx456def...",
    "name": "Aggressive Momentum",
    "timeHorizon": "short-term",
    "riskAppetite": "high"
  },
  {
    "id": "clx789ghi...",
    "name": "Conservative Value",
    "timeHorizon": "long-term",
    "riskAppetite": "low"
  }
]

## Top Investment Opportunities:
[
  {
    "symbol": "AAPL",
    "companyName": "Apple Inc",
    "totalScore": 28.5,
    "signals": [
      {
        "type": "insider_buying",
        "score": 12.0,
        "description": "Tim Cook bought 25,000 shares ($4.3M)"
      },
      {
        "type": "analyst_upgrade",
        "score": 9.0,
        "description": "Hold → Strong Buy"
      },
      {
        "type": "momentum",
        "score": 11.0,
        "description": "High momentum: Volume spike + Price surge + Strong fundamentals"
      }
    ],
    "price": 172.50,
    "changePercent": 3.2,
    "aiSummary": "CEO의 대규모 자사주 매입과 애널리스트 등급 상향이 결합되어..."
  },
  {
    "symbol": "NVDA",
    "companyName": "NVIDIA Corporation",
    "totalScore": 26.0,
    ...
  },
  ...
]

## ⚠️ CRITICAL INSTRUCTIONS:

**DO NOT simply pick the top 3 stocks by score!** High scores don't always mean good bot trading candidates.

### ⚠️ SIGNAL DIVERSITY = DIFFERENT TYPES (NOT SAME TYPE REPEATED):

**CRITICAL DISTINCTION - Read this carefully:**

✅ **TRUE Signal Diversity (GOOD)**:
- Stock has DIFFERENT signal TYPES: insider_buying + analyst_upgrade + momentum
- Example: 1 insider buy (5pts) + 1 analyst upgrade (9pts) + 1 momentum (11pts) = 25pts, 3 TYPES ✓
- This is DIVERSE because it combines fundamental (insider/analyst) + technical (momentum)

❌ **FALSE Diversity (BAD - DO NOT CONFUSE THIS)**:
- Stock has SAME signal type repeated: 3× insider_buying transactions
- Example: 3 insider buys (7pts + 3pts + 2pts) = 12pts, only 1 TYPE ✗
- This is NOT DIVERSE even though there are "multiple signals" - they're all the same TYPE
- Multiple insider transactions from different people = STILL JUST INSIDER BUYING

**Available Signal Types** (from the data):
1. `insider_buying` - Insider transactions
2. `analyst_upgrade` - Analyst recommendations
3. `momentum` - Technical momentum indicators
4. `merger_acquisition` - M&A activity
5. `top_gainer` - Price gainers
6. `earnings_upcoming` - Earnings events
7. `high_volume` - Volume spikes
8. `stock_split` - Stock splits

**When evaluating stocks, COUNT UNIQUE SIGNAL TYPES, not total number of signals!**

### BOT TRADING SUITABILITY REQUIREMENTS:

✅ **What makes a GOOD bot trading stock:**
1. **Signal Diversity**: Multiple signal types (not just one strong signal)
   - Example: Insider buying + Analyst upgrade + Momentum
   - Avoid: Single $50M insider buy with no other signals
2. **High Liquidity**: Volume > 5M shares/day for smooth execution
   - Ensures bots can enter/exit without slippage
3. **Predictable Volatility**: Clear patterns, not erratic chaos
   - Bots need technical patterns to exploit
4. **Clear Entry/Exit Signals**: Automated execution needs clarity
   - Well-defined support/resistance, trend channels
5. **Strategy Alignment**: Match stock characteristics to strategy type

❌ **BAD for bots (even with HIGH scores):**
- Single large insider transaction ($50M+) but no other signals → One-dimensional, no trading pattern
- Illiquid small-cap with great fundamentals → Execution problems for bots
- News-driven spike without technical pattern → Unpredictable, no repeatable strategy
- All signals same-day (top gainer + high volume only) → No sustainability
- Extreme volatility without clear ranges → Too risky for automated systems

✅ **GOOD for bots (even with LOWER scores):**
- Diverse signals (insider + analyst + momentum) → 12 points but multiple confirmation
- High liquidity with clear RSI/MACD patterns → 10 points but bot-friendly technicals
- Moderate volatility with predictable ranges → 8 points but consistent profit opportunity
- Confluence of fundamental + technical signals → More reliable than single factor

### STRATEGY MATCHING LOGIC:

**"Aggressive Momentum"** strategy needs:
- High volatility stocks with clear trends
- Strong momentum signals (price + volume)
- Quick entry/exit capability (high liquidity)

**"Balanced Growth"** strategy needs:
- Diverse signal types (fundamental + technical)
- Moderate risk stocks with steady growth
- Mix of short and medium-term catalysts

**"Conservative Value"** strategy needs:
- Strong fundamentals (insider buying, analyst ratings)
- Lower volatility, established companies
- Long-term catalysts (M&A, strategic shifts)

## Task:
Analyze each stock's BOT SUITABILITY (not just score). Select up to 3 stocks that:
1. Have the RIGHT MIX of signals for automated trading
2. Match the characteristics of available strategies
3. Provide clear, actionable trading opportunities for bots
4. Balance risk with realistic profit potential

For each recommendation, provide:
1. **symbol**: Stock symbol
2. **botName**: Creative, descriptive name reflecting the stock's character (e.g., "Tesla Volatility Rider", "Apple Steady Growth Bot")
3. **strategyId**: ID of the BEST matching strategy (analyze characteristics, not just score)
4. **strategyName**: Name of the chosen strategy
5. **fundAllocation**: $500-$2000 based on confidence AND risk (higher confidence + lower volatility = higher allocation)
6. **reasoning**: 2-3 sentences explaining WHY this specific stock is good for BOT trading (mention UNIQUE signal TYPES count, liquidity, pattern clarity)
7. **confidence**: "high" (diverse signals + clear patterns), "medium" (some gaps), or "low" (experimental)

Return JSON in this exact format:
{
  "recommendations": [
    {
      "symbol": "AAPL",
      "botName": "Apple Momentum Rider",
      "strategyId": "clx123...",
      "strategyName": "Balanced Growth",
      "fundAllocation": 1800,
      "reasoning": "3 unique signal TYPES (insider_buying + analyst_upgrade + momentum) create multiple confirmation points for bot trading. High liquidity (50M+ daily volume) ensures smooth execution. Clear technical patterns with defined support levels make automated decision-making reliable.",
      "confidence": "high"
    }
  ],
  "analysisNotes": "Selected these 3 stocks based on BOT SUITABILITY, not just scores. [Explain why you chose these over higher-ranked stocks, if applicable. Mention specific bot trading advantages.]"
}
```

### 4.3 Example AI Response

**Input**: Top 20 investment opportunities + 3 available strategies

**AI Generated Recommendation** (JSON):
```json
{
  "recommendations": [
    {
      "symbol": "AAPL",
      "botName": "Apple Momentum Rider",
      "strategyId": "clx123abc456",
      "strategyName": "Balanced Growth",
      "fundAllocation": 1800,
      "reasoning": "CEO의 대규모 자사주 매입($4.3M)과 Strong Buy 등급 상향이 결합된 강력한 신호입니다. 모멘텀 스크리닝 통과로 단기 상승 모멘텀이 확인되며, 높은 유동성으로 봇 거래에 최적화되어 있습니다.",
      "confidence": "high"
    },
    {
      "symbol": "NVDA",
      "botName": "NVIDIA AI Wave Catcher",
      "strategyId": "clx456def789",
      "strategyName": "Aggressive Momentum",
      "fundAllocation": 2000,
      "reasoning": "복수의 임원이 동시에 매수한 점은 내부적으로 강한 확신이 있음을 시사합니다. AI 칩 수요 증가 트렌드와 함께 단기 모멘텀이 강하며, 높은 변동성은 적극적 전략에 적합합니다.",
      "confidence": "high"
    },
    {
      "symbol": "TSLA",
      "botName": "Tesla Volatility Trader",
      "strategyId": "clx456def789",
      "strategyName": "Aggressive Momentum",
      "fundAllocation": 1500,
      "reasoning": "CEO의 상징적 자사주 매입과 강한 일일 모멘텀이 결합되었습니다. 높은 변동성은 리스크와 기회를 동시에 제공하며, 단기 트레이딩 전략에 적합합니다.",
      "confidence": "medium"
    }
  ],
  "analysisNotes": "선정된 3종목 모두 내부자 매수와 강한 모멘텀 신호가 결합된 케이스입니다. AAPL과 NVDA는 high confidence로 더 큰 자금($1,800-$2,000) 배분을 권장하며, TSLA는 변동성이 높아 medium confidence로 $1,500 배분을 권장합니다. 모든 종목이 높은 유동성을 보유하여 자동 트레이딩에 적합합니다."
}
```

### 4.4 Bot Creation Flow

**Location**: `components/market-events/InvestmentReportModal.tsx`

```javascript
const handleCreateBot = async (recommendation: BotRecommendation) => {
  setCreatingBotSymbol(recommendation.symbol);

  try {
    const response = await fetch('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: recommendation.botName,           // AI-generated creative name
        symbol: recommendation.symbol,          // Stock symbol
        strategyId: recommendation.strategyId,  // AI-selected strategy
        fundAllocation: recommendation.fundAllocation,  // AI-determined amount
        description: `AI Generated Bot: ${recommendation.reasoning}`,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.json().error?.message);
    }

    alert(`✅ Bot "${recommendation.botName}" created successfully!`);
  } catch (error) {
    alert(`❌ Failed to create bot: ${error.message}`);
  } finally {
    setCreatingBotSymbol(null);
  }
};
```

### 4.5 API Configuration

**Model**: GPT-4o-mini
**Temperature**: 0.7 (more creative for naming)
**Max Tokens**: 2000 (detailed recommendations)
**Response Format**: JSON object (structured output)
**Input Limit**: Top 20 opportunities (token management)

---

## 5. Complete Workflow

### 5.1 End-to-End Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA COLLECTION PHASE                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. Fetch Market Events (FMP + Alpha Vantage)                    │
│    - Insider Trading (FMP)                                       │
│    - Analyst Ratings (FMP)                                       │
│    - M&A News (FMP)                                              │
│    - Stock Splits (FMP)                                          │
│    - Upcoming Earnings (FMP)                                     │
│    - Market Movers: Top Gainers (Alpha Vantage)                 │
│    - Market Movers: Most Active (Alpha Vantage)                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Momentum Screening (Hybrid: AV + FMP)                        │
│    Step 1: Top Gainers (>3% change) → 32 stocks                │
│    Step 2: Most Active (high volume) → 50 stocks               │
│    Step 3: Intersection → 8 candidates                          │
│    Step 4: Market Cap Filter (>$1B) → 6 candidates             │
│    Step 5: RSI Filter (<80) → 5 final momentum stocks          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SIGNAL AGGREGATION PHASE                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Collect Signals by Stock Symbol                              │
│    - Insider buying: Dynamic scoring (0.9-15.0)                 │
│    - Momentum: 10.0 points                                       │
│    - Analyst upgrade: 8.0 points                                 │
│    - M&A: 7.0 points                                             │
│    - Stock split: 6.0 points                                     │
│    - Top gainer: 5.0 points                                      │
│    - Earnings upcoming: 4.0 points                               │
│    - High volume: 3.0 points                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Calculate Total Scores (with time decay)                     │
│    For each stock:                                               │
│    Total = Σ (signal_score × decay_factor)                      │
│                                                                  │
│    Example: AAPL                                                 │
│    - Insider buying: 15.0 × 1.0 = 15.0                          │
│    - Analyst upgrade: 8.0 × 0.85 = 6.8                          │
│    - Momentum: 10.0 × 1.0 = 10.0                                │
│    - High volume: 3.0 × 1.0 = 3.0                               │
│    ─────────────────────────────────                             │
│    Total Score = 34.8 points                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Rank Opportunities                                            │
│    Sort by total score (descending)                              │
│    Assign ranks: 1st, 2nd, 3rd, ...                             │
│                                                                  │
│    Result: 51 investment opportunities                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    AI ANALYSIS PHASE                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Generate AI Investment Analysis (Top 10 opportunities)       │
│    For each top opportunity:                                     │
│    - Build detailed prompt with signals + context               │
│    - Call OpenAI GPT-4o-mini                                    │
│    - Generate balanced 3-4 sentence analysis                    │
│    - Include bull case, bear case, risks                        │
│                                                                  │
│    Processing: 3 concurrent requests, 500ms delay between batches│
│    Total time: ~5-10 seconds for 10 stocks                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  DISPLAY PHASE (UI)                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Display Investment Opportunities                              │
│    - Show top 10 ranked opportunities                            │
│    - Display signals, scores, AI analysis                        │
│    - User clicks "View Full Report" button                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                AI BOT RECOMMENDATION PHASE                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Modal Opens → Fetch Bot Recommendations                      │
│    - Send all opportunities to API                               │
│    - API fetches available strategies from database              │
│    - Call OpenAI with opportunities + strategies                 │
│    - AI analyzes and selects top 3 stocks for bots              │
│    - AI generates creative bot names                             │
│    - AI recommends strategies and fund allocations               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. Display AI Recommendations                                    │
│    Show 3 recommended bots with:                                 │
│    - Creative names (e.g., "Apple Momentum Rider")              │
│    - Selected strategy                                           │
│    - Fund allocation ($500-$2000)                               │
│    - Detailed reasoning                                          │
│    - Confidence level (high/medium/low)                         │
│    - "Create Bot" button                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               AUTOMATED BOT CREATION PHASE                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. User Clicks "Create Bot" Button                             │
│     - Extract AI recommendation parameters                       │
│     - Call POST /api/bots with:                                 │
│       • name: AI-generated bot name                             │
│       • symbol: Stock symbol                                     │
│       • strategyId: AI-selected strategy                        │
│       • fundAllocation: AI-determined amount                    │
│       • description: AI reasoning                                │
│     - Bot created in database                                    │
│     - Success notification shown                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                         🎉 COMPLETE
```

### 5.2 Timing Breakdown

| Phase | Time | Notes |
|-------|------|-------|
| Data Collection | 2-3s | Parallel API calls to FMP + Alpha Vantage |
| Momentum Screening | 3-5s | Batch processing with rate limiting |
| Signal Aggregation | <1s | In-memory processing |
| AI Investment Analysis | 5-10s | 10 stocks, 3 concurrent, 500ms delays |
| Display Opportunities | <1s | Render top 10 cards |
| AI Bot Recommendations | 3-5s | Single API call on modal open |
| Bot Creation | <1s | Database write |
| **Total (first load)** | **14-25s** | Full workflow with AI analysis |
| **Subsequent views** | **<1s** | Cached data (5 min TTL) |

### 5.3 User Interaction Points

1. **Initial Load**: Automatic (on page visit)
2. **Manual Refresh**: Click "새로고침" button
3. **View Report**: Click opportunity card or "통합 리포트" button
4. **Create Bot**: Click "🚀 자동으로 봇 만들기" button in modal

### 5.4 Caching Strategy

**Investment Opportunities Cache**:
- TTL: 5 minutes
- Scope: In-memory (per server instance)
- Invalidation: Manual refresh or cache expiry

**Market Events Cache**:
- TTL: 5 minutes
- Scope: Global (all users)
- Invalidation: Time-based only

**No Cache**:
- AI bot recommendations (always fresh on modal open)
- Bot creation (direct database write)

---

## 6. Key Files Reference

### Core Services

| File | Purpose |
|------|---------|
| `lib/services/momentumScreenerService.ts` | Momentum stock screening (hybrid API) |
| `lib/services/investmentOpportunityService.ts` | Signal aggregation and scoring |
| `lib/services/aiInvestmentAnalysis.ts` | AI investment thesis generation |
| `lib/services/aiBotRecommendationService.ts` | AI bot recommendations |
| `lib/utils/insiderScoringAlgorithm.ts` | Dynamic insider buying scoring |

### API Routes

| Route | Purpose |
|-------|---------|
| `app/api/market-events/route.ts` | Fetch all market events |
| `app/api/investment-opportunities/route.ts` | Get ranked opportunities with AI analysis |
| `app/api/investment-opportunities/recommendations/route.ts` | Generate AI bot recommendations |
| `app/api/bots/route.ts` | Create trading bot |

### UI Components

| Component | Purpose |
|-----------|---------|
| `app/market-events/page.tsx` | Main dashboard page |
| `components/market-events/InvestmentOpportunitiesSection.tsx` | Display top 10 opportunities |
| `components/market-events/InvestmentOpportunityCard.tsx` | Individual opportunity card |
| `components/market-events/InvestmentReportModal.tsx` | Full report with AI bot recommendations |
| `components/market-events/SignalBadge.tsx` | Signal type badge |

---

## 7. Environment Variables

```bash
# Required for AI features
OPENAI_API_KEY=sk-proj-...

# Required for momentum screening and market data
ALPHA_VANTAGE_KEY=...
FMP_API_KEY=...

# Database (Prisma)
DATABASE_URL=postgresql://...
```

---

## 8. Future Enhancements

### Potential Improvements

1. **Multi-Model AI Consensus**
   - Use GPT-4, Claude, and Gemini
   - Aggregate recommendations for higher confidence

2. **Backtesting Integration**
   - Test AI recommendations against historical performance
   - Adjust scoring weights based on outcomes

3. **Sentiment Analysis**
   - Integrate news sentiment from FMP
   - Add social media sentiment (Twitter, Reddit)

4. **Machine Learning Signals**
   - Train ML model on historical signals → outcomes
   - Predict success probability for each opportunity

5. **Real-Time Updates**
   - WebSocket for live signal updates
   - Instant notifications for new high-score opportunities

6. **Portfolio Optimization**
   - AI suggests bot portfolio allocation
   - Risk balancing across multiple bots

---

**Last Updated**: 2025-10-22
**Author**: MoneyGoku AI System
**Version**: 1.0.0
