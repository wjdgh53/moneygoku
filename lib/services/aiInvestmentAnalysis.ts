/**
 * AI Investment Analysis Service
 *
 * Generates sophisticated investment analysis by combining:
 * - Market signals (insider buying, analyst ratings, etc.)
 * - Fundamental metrics (if available)
 * - Industry context
 * - Risk factors
 *
 * Produces balanced, insightful analysis rather than generic bullish summaries
 */

import { InvestmentOpportunity } from '@/lib/types/investmentOpportunity';
import { generateText, GPT_MODELS } from '@/lib/utils/openai';

/**
 * Configuration for AI analysis generation
 */
const AI_ANALYSIS_CONFIG = {
  model: GPT_MODELS.GPT4_O_MINI,
  temperature: 0.6, // Balanced between creativity and consistency
  maxTokens: 400, // Allow for more detailed analysis
  maxRetries: 2,
} as const;

/**
 * Generate comprehensive investment analysis using AI
 *
 * Produces balanced analysis covering:
 * - Bull case (why signals suggest opportunity)
 * - Bear case (what could go wrong)
 * - Key catalysts and risks
 * - Context-appropriate insights
 */
export async function generateInvestmentAnalysis(
  opportunity: InvestmentOpportunity
): Promise<string> {
  try {
    const prompt = buildAnalysisPrompt(opportunity);
    const systemPrompt = buildSystemPrompt();

    const analysis = await generateText(prompt, {
      model: AI_ANALYSIS_CONFIG.model,
      temperature: AI_ANALYSIS_CONFIG.temperature,
      maxTokens: AI_ANALYSIS_CONFIG.maxTokens,
      systemPrompt,
    });

    return analysis.trim();
  } catch (error) {
    console.error(
      `[AI Analysis] Failed to generate analysis for ${opportunity.symbol}:`,
      error
    );
    return generateFallbackAnalysis(opportunity);
  }
}

/**
 * Build sophisticated analysis prompt with multi-dimensional context
 */
function buildAnalysisPrompt(opportunity: InvestmentOpportunity): string {
  const { symbol, companyName, totalScore, signals, price, changePercent } = opportunity;

  // Categorize signals by type
  const signalsByType = categorizeSignals(signals);

  // Build signal context with depth
  const signalContext = buildSignalContext(signalsByType);

  // Determine analysis focus based on signal composition
  const analysisFocus = determineAnalysisFocus(signalsByType);

  // Build price context
  const priceContext = price
    ? `Current Price: $${price.toFixed(2)} (${changePercent && changePercent > 0 ? '+' : ''}${changePercent?.toFixed(2)}% today)`
    : 'Price data not available';

  return `Analyze this investment opportunity with depth and balance:

**Stock:** ${symbol}${companyName ? ` (${companyName})` : ''}
**Score:** ${totalScore.toFixed(2)} points (${getScoreCategory(totalScore)})
**${priceContext}**

**Market Signals:**
${signalContext}

**Analysis Instructions:**
${analysisFocus}

Provide a 3-4 sentence analysis covering:
1. The MOST COMPELLING signal and its significance
2. Supporting confluence of signals (if multiple)
3. Key risk or uncertainty factor (be realistic)
4. Overall assessment (not just bullish cheerleading)

Write in Korean, professionally but concisely. Focus on WHY these signals matter, not just WHAT they are.`;
}

/**
 * Build system prompt with role definition
 */
function buildSystemPrompt(): string {
  return `You are a professional quantitative analyst specializing in signal-based investment research.

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

Write in Korean. Be direct and analytical.`;
}

/**
 * Categorize signals into meaningful groups
 */
function categorizeSignals(signals: InvestmentOpportunity['signals']) {
  return {
    insider: signals.filter((s) => s.type === 'insider_buying'),
    analyst: signals.filter((s) => s.type === 'analyst_upgrade'),
    corporate: signals.filter((s) =>
      ['merger_acquisition', 'stock_split'].includes(s.type)
    ),
    momentum: signals.filter((s) =>
      ['top_gainer', 'high_volume'].includes(s.type)
    ),
    fundamental: signals.filter((s) => s.type === 'earnings_upcoming'),
  };
}

/**
 * Build rich signal context with transaction details
 */
function buildSignalContext(signalsByType: ReturnType<typeof categorizeSignals>): string {
  const sections: string[] = [];

  // Insider buying (most detailed since it's most predictive)
  if (signalsByType.insider.length > 0) {
    const insiderDetails = signalsByType.insider
      .map((signal) => {
        const { metadata } = signal;
        const dollarValue = metadata?.securitiesTransacted * metadata?.price;
        const dollarStr = dollarValue
          ? ` (${formatCurrency(dollarValue)})`
          : '';
        return `  • ${signal.description}${dollarStr} [Score: ${signal.score.toFixed(1)}]`;
      })
      .join('\n');

    sections.push(`**Insider Activity** (${signalsByType.insider.length} transaction${signalsByType.insider.length > 1 ? 's' : ''}):\n${insiderDetails}`);
  }

  // Analyst ratings
  if (signalsByType.analyst.length > 0) {
    const analystDetails = signalsByType.analyst
      .map((signal) => `  • ${signal.source}: ${signal.description}`)
      .join('\n');

    sections.push(`**Analyst Ratings** (${signalsByType.analyst.length} upgrade${signalsByType.analyst.length > 1 ? 's' : ''}):\n${analystDetails}`);
  }

  // Corporate events
  if (signalsByType.corporate.length > 0) {
    const corporateDetails = signalsByType.corporate
      .map((signal) => `  • ${signal.type === 'merger_acquisition' ? 'M&A' : 'Stock Split'}: ${signal.description}`)
      .join('\n');

    sections.push(`**Corporate Events:**\n${corporateDetails}`);
  }

  // Market momentum
  if (signalsByType.momentum.length > 0) {
    const momentumDetails = signalsByType.momentum
      .map((signal) => `  • ${signal.description}`)
      .join('\n');

    sections.push(`**Market Action:**\n${momentumDetails}`);
  }

  // Earnings
  if (signalsByType.fundamental.length > 0) {
    const earningsDetails = signalsByType.fundamental
      .map((signal) => `  • ${signal.description}`)
      .join('\n');

    sections.push(`**Upcoming Events:**\n${earningsDetails}`);
  }

  return sections.join('\n\n');
}

/**
 * Determine analysis focus based on signal composition
 */
function determineAnalysisFocus(
  signalsByType: ReturnType<typeof categorizeSignals>
): string {
  const hasInsider = signalsByType.insider.length > 0;
  const hasAnalyst = signalsByType.analyst.length > 0;
  const hasMomentum = signalsByType.momentum.length > 0;
  const hasMultipleInsiders = signalsByType.insider.length > 1;

  // Multiple insider buys - focus on pattern
  if (hasMultipleInsiders) {
    return `- Multiple insiders buying suggests strong internal conviction. Analyze WHY multiple executives would commit capital simultaneously.
- Consider: Are these coordinated buys? Different roles (CEO vs CFO)? What does transaction size tell us?`;
  }

  // Insider + Analyst confluence
  if (hasInsider && hasAnalyst) {
    return `- Insider buying + analyst upgrade creates powerful confluence. Analyze the TIMING and MAGNITUDE.
- Consider: Is insider buy size significant relative to company? Is analyst call contrarian or consensus?`;
  }

  // Insider + Momentum
  if (hasInsider && hasMomentum) {
    return `- Insider buying during price strength suggests conviction amidst rally. Analyze if this is chasing or strategic.
- Consider: Is insider buying AFTER price surge (concerning) or BEFORE (prescient)?`;
  }

  // Pure insider signal
  if (hasInsider) {
    const insiderSignal = signalsByType.insider[0];
    const dollarValue = insiderSignal.metadata?.securitiesTransacted * insiderSignal.metadata?.price;
    const isLarge = dollarValue && dollarValue > 1000000;

    if (isLarge) {
      return `- Large insider purchase (${formatCurrency(dollarValue)}) demands serious attention. Analyze transaction CONTEXT.
- Consider: Position relative to officer's wealth? Timing vs company events? Historical pattern?`;
    } else {
      return `- Modest insider buying. Analyze if this is routine accumulation or meaningful signal.
- Consider: Size relative to officer's existing position? Company fundamentals supporting conviction?`;
    }
  }

  // Analyst-driven
  if (hasAnalyst) {
    return `- Analyst upgrades can drive price action short-term. Analyze credibility and catalysts cited.
- Consider: Is this a leading firm or follower? What's the price target vs current price? New information or reassessment?`;
  }

  // Momentum-driven
  if (hasMomentum) {
    return `- Pure momentum signal lacks fundamental catalyst. Analyze if this is sustainable trend or noise.
- Consider: Volume patterns? Sector rotation? News catalyst? Risk of mean reversion?`;
  }

  // Default
  return `- Mixed signals require nuanced interpretation. Analyze strongest signal and how others support/contradict.
- Consider: Signal quality over quantity. Time decay. Contextual factors.`;
}

/**
 * Get score category label
 */
function getScoreCategory(score: number): string {
  if (score >= 12) return 'Very High Conviction';
  if (score >= 8) return 'High Conviction';
  if (score >= 5) return 'Moderate Interest';
  if (score >= 3) return 'Speculative';
  return 'Low Quality';
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Generate fallback analysis when AI fails
 */
function generateFallbackAnalysis(opportunity: InvestmentOpportunity): string {
  const { symbol, signals, totalScore } = opportunity;

  const insiderSignals = signals.filter((s) => s.type === 'insider_buying');
  const hasInsider = insiderSignals.length > 0;

  if (hasInsider && insiderSignals[0].metadata) {
    const dollarValue =
      insiderSignals[0].metadata.securitiesTransacted *
      insiderSignals[0].metadata.price;

    return `${symbol}은(는) ${insiderSignals[0].metadata.reportingName}의 ${formatCurrency(dollarValue)} 규모 내부자 매수를 포함하여 ${signals.length}개 시그널에서 ${totalScore.toFixed(1)}점을 기록했습니다. 내부자 거래는 회사 전망에 대한 경영진의 확신을 시사하지만, 추가적인 펀더멘털 분석이 필요합니다.`;
  }

  return `${symbol}은(는) ${signals.length}개의 긍정적 시그널에서 총 ${totalScore.toFixed(1)}점을 기록했습니다. 이러한 시그널들은 단기적 관심을 정당화하지만, 투자 결정 전 회사의 펀더멘털과 업종 동향을 면밀히 검토해야 합니다.`;
}

/**
 * Batch generate analysis for multiple opportunities
 */
export async function generateBatchAnalysis(
  opportunities: InvestmentOpportunity[],
  concurrency: number = 3
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Process in batches to avoid rate limits
  for (let i = 0; i < opportunities.length; i += concurrency) {
    const batch = opportunities.slice(i, i + concurrency);

    const batchPromises = batch.map(async (opp) => {
      const analysis = await generateInvestmentAnalysis(opp);
      return { symbol: opp.symbol, analysis };
    });

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach(({ symbol, analysis }) => {
      results.set(symbol, analysis);
    });

    // Small delay between batches
    if (i + concurrency < opportunities.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}
