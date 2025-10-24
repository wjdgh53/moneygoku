/**
 * AI Bot Recommendation Service
 *
 * Analyzes investment opportunities and recommends up to 3 stocks
 * for automated trading bot creation with AI-generated:
 * - Bot names (creative, stock-specific)
 * - Strategy selection (based on stock characteristics)
 * - Fund allocation ($3000-$5000 based on confidence)
 * - Detailed reasoning
 */

import { InvestmentOpportunity } from '@/lib/types/investmentOpportunity';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/config/env';

/**
 * AI Bot Recommendation
 */
export interface BotRecommendation {
  symbol: string;
  botName: string;
  strategyId: string;
  strategyName: string;
  fundAllocation: number;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface BotRecommendationResponse {
  recommendations: BotRecommendation[];
  analysisNotes: string;
  timestamp: string;
}

/**
 * Available Strategy (from database)
 */
interface StrategyOption {
  id: string;
  name: string;
  timeHorizon: string;
  riskAppetite: string;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: BotRecommendationResponse;
  timestamp: Date;
}

class AIBotRecommendationService {
  private chatModel: ChatOpenAI;
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day (24 hours)
  private cache: CacheEntry | null = null;

  constructor() {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    const model = env.OPENAI_MODEL;

    this.chatModel = new ChatOpenAI({
      apiKey,
      model,
      temperature: 0.7,
      maxTokens: 2000,
    });
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    const now = new Date().getTime();
    const cacheTime = this.cache.timestamp.getTime();
    return now - cacheTime < this.CACHE_DURATION_MS;
  }

  /**
   * Check if a stock symbol is an OTC (Over-The-Counter) stock
   * OTC stocks typically:
   * - Have 5+ character symbols (e.g., FRFHF, BKRKF)
   * - Often end with 'F' (foreign OTC stocks)
   * - Trade on Pink Sheets/OTCMKTS, not NYSE/NASDAQ
   */
  private isOTCStock(symbol: string): boolean {
    // Most OTC stocks have 5+ characters
    if (symbol.length >= 5) {
      // Many OTC stocks end with 'F' (e.g., FRFHF, BKRKF)
      if (symbol.endsWith('F')) {
        return true;
      }
      // Other common OTC patterns (5+ chars without exchange suffix)
      return true;
    }
    return false;
  }

  /**
   * Generate bot recommendations from investment opportunities
   * - Excludes OTC stocks (limited API support, lower liquidity)
   * - Returns only "high" confidence recommendations
   * - Caches results for 24 hours to reduce API calls
   * - Checks database first, then memory cache, then generates new
   */
  async generateRecommendations(
    opportunities: InvestmentOpportunity[],
    availableStrategies: StrategyOption[]
  ): Promise<BotRecommendationResponse> {
    try {
      // 1️⃣ Check database first (persistent across server restarts)
      try {
        const latestReport = await prisma.botRecommendationReport.findFirst({
          orderBy: { timestamp: 'desc' },
        });

        if (latestReport) {
          const now = new Date().getTime();
          const reportTime = new Date(latestReport.timestamp).getTime();
          const ageInHours = (now - reportTime) / (1000 * 60 * 60);

          if (ageInHours < 24) {
            console.log(`[AIBotRecommendation] ✅ Using DB cached recommendations (${ageInHours.toFixed(1)} hours old)`);

            const recommendations = JSON.parse(latestReport.recommendations);
            const response: BotRecommendationResponse = {
              recommendations,
              analysisNotes: latestReport.analysisNotes || 'No analysis notes available',
              timestamp: latestReport.timestamp.toISOString(),
            };

            // Update memory cache for faster subsequent access
            this.cache = {
              data: response,
              timestamp: new Date(latestReport.timestamp),
            };

            return response;
          } else {
            console.log(`[AIBotRecommendation] DB cache expired (${ageInHours.toFixed(1)} hours old), regenerating...`);
          }
        }
      } catch (dbError) {
        console.warn('[AIBotRecommendation] ⚠️ Failed to check DB cache:', dbError);
        // Continue to memory cache check
      }

      // 2️⃣ Check memory cache (faster than DB)
      if (this.isCacheValid()) {
        console.log('[AIBotRecommendation] ✅ Using memory cached recommendations (24-hour cache)');
        return this.cache!.data;
      }

      console.log('[AIBotRecommendation] Analyzing opportunities for bot creation...');
      console.log(`[AIBotRecommendation] Total opportunities: ${opportunities.length}`);

      // ✅ FILTER 1: Exclude OTC stocks before AI analysis
      const nonOTCOpportunities = opportunities.filter(opp => {
        const isOTC = this.isOTCStock(opp.symbol);
        if (isOTC) {
          console.log(`[AIBotRecommendation] 🚫 Filtered out OTC stock: ${opp.symbol} (${opp.companyName})`);
        }
        return !isOTC;
      });

      console.log(`[AIBotRecommendation] After OTC filter: ${nonOTCOpportunities.length} opportunities`);
      console.log(`[AIBotRecommendation] Available strategies: ${availableStrategies.length}`);

      const prompt = this.buildPrompt(nonOTCOpportunities, availableStrategies);

      const aiResponse = await this.chatModel.invoke([
        new SystemMessage(`You are an expert trading bot strategist. Analyze investment opportunities and recommend stocks suitable for automated trading bots. Consider:
- Signal strength and diversity
- Market momentum and volatility
- Risk-reward ratio
- Bot trading suitability (avoid highly illiquid or erratic stocks)

IMPORTANT: Only provide "high" confidence recommendations. Do not include medium or low confidence stocks.

Provide recommendations in JSON format.`),
        new HumanMessage(prompt)
      ], {
        response_format: { type: "json_object" }
      });

      const rawContent = aiResponse.content as string;
      if (!rawContent) {
        throw new Error('OpenAI returned empty response');
      }

      const result = JSON.parse(rawContent);

      // ✅ FILTER 2: Post-filter to only "high" confidence (safety net)
      const highConfidenceRecommendations = (result.recommendations || []).filter(
        (rec: BotRecommendation) => {
          const isHighConfidence = rec.confidence === 'high';
          if (!isHighConfidence) {
            console.log(`[AIBotRecommendation] 🚫 Filtered out ${rec.confidence} confidence: ${rec.symbol}`);
          }
          return isHighConfidence;
        }
      );

      console.log(`[AIBotRecommendation] Generated ${result.recommendations?.length || 0} recommendations`);
      console.log(`[AIBotRecommendation] After confidence filter: ${highConfidenceRecommendations.length} high-confidence recommendations`);

      const botResponse: BotRecommendationResponse = {
        recommendations: highConfidenceRecommendations,
        analysisNotes: result.analysisNotes || 'No analysis notes provided',
        timestamp: new Date().toISOString(),
      };

      // Update cache
      this.cache = {
        data: botResponse,
        timestamp: new Date(),
      };
      console.log('[AIBotRecommendation] ✅ Cached recommendations for 24 hours');

      // Save to database
      try {
        await prisma.botRecommendationReport.create({
          data: {
            recommendations: JSON.stringify(highConfidenceRecommendations),
            analysisNotes: result.analysisNotes || null,
            totalOpportunities: opportunities.length,
            filteredOTCCount: opportunities.length - nonOTCOpportunities.length,
            highConfidenceCount: highConfidenceRecommendations.length,
            timestamp: new Date(),
          },
        });
        console.log('[AIBotRecommendation] ✅ Saved recommendation report to database');
      } catch (dbError) {
        console.error('[AIBotRecommendation] ⚠️ Failed to save to database:', dbError);
        // Continue anyway - don't fail the entire request
      }

      return botResponse;
    } catch (error) {
      console.error('[AIBotRecommendation] Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Build comprehensive prompt for AI
   */
  private buildPrompt(
    opportunities: InvestmentOpportunity[],
    strategies: StrategyOption[]
  ): string {
    // Limit to top 20 opportunities to avoid token limits
    const topOpportunities = opportunities.slice(0, 20);

    const opportunitiesData = topOpportunities.map(opp => ({
      symbol: opp.symbol,
      companyName: opp.companyName,
      totalScore: opp.totalScore,
      signals: opp.signals.map(s => ({
        type: s.type,
        score: s.score,
        description: s.description
      })),
      price: opp.price,
      changePercent: opp.changePercent,
      aiSummary: opp.aiSummary,
    }));

    const strategiesData = strategies.map(s => ({
      id: s.id,
      name: s.name,
      timeHorizon: s.timeHorizon,
      riskAppetite: s.riskAppetite,
    }));

    return `# Investment Opportunities Analysis for Bot Creation

## Available Trading Strategies:
${JSON.stringify(strategiesData, null, 2)}

## Top Investment Opportunities:
${JSON.stringify(opportunitiesData, null, 2)}

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
1. insider_buying - Insider buying transactions (POSITIVE signal, +점수)
2. insider_selling - Insider selling transactions (NEGATIVE signal, -점수)
3. analyst_upgrade - Analyst recommendations
4. momentum - Technical momentum indicators
5. merger_acquisition - M&A activity
6. top_gainer - Price gainers
7. earnings_upcoming - Earnings events
8. high_volume - Volume spikes
9. stock_split - Stock splits

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
- **Insider selling signals (negative scores)** → Indicates lack of confidence from insiders
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

⚠️ **CRITICAL FILTERING**:
- **OTC stocks have already been removed** from the list (e.g., FRFHF, BKRKF) - you'll only see major exchange stocks
- **ONLY recommend "high" confidence stocks** - do NOT include medium or low confidence recommendations
- If fewer than 3 stocks meet "high" confidence criteria, return fewer recommendations (quality > quantity)

For each recommendation, provide:
1. **symbol**: Stock symbol
2. **botName**: Creative, descriptive name reflecting the stock's character (e.g., "Tesla Volatility Rider", "Apple Steady Growth Bot")
3. **strategyId**: ID of the BEST matching strategy (analyze characteristics, not just score)
4. **strategyName**: Name of the chosen strategy
5. **fundAllocation**: $3000-$5000 based on confidence AND risk (higher confidence + lower volatility = higher allocation)
6. **reasoning**: 2-3 sentences explaining WHY this specific stock is good for BOT trading (mention UNIQUE signal TYPES count, liquidity, pattern clarity)
7. **confidence**: "high" ONLY (diverse signals + clear patterns + high liquidity + predictable volatility)

Return JSON in this exact format:
{
  "recommendations": [
    {
      "symbol": "AAPL",
      "botName": "Apple Momentum Rider",
      "strategyId": "clx123...",
      "strategyName": "Balanced Growth",
      "fundAllocation": 4500,
      "reasoning": "3 unique signal TYPES (insider_buying + analyst_upgrade + momentum) create multiple confirmation points for bot trading. High liquidity (50M+ daily volume) ensures smooth execution. Clear technical patterns with defined support levels make automated decision-making reliable.",
      "confidence": "high"
    }
  ],
  "analysisNotes": "Selected these 3 stocks based on BOT SUITABILITY, not just scores. [Explain why you chose these over higher-ranked stocks, if applicable. Mention specific bot trading advantages.]"
}`;
  }
}

// Export singleton instance
export const aiBotRecommendationService = new AIBotRecommendationService();
