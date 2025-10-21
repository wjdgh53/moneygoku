/**
 * Strategy Matcher Service
 *
 * Analyzes stock characteristics and matches them with appropriate trading strategies.
 * This service uses rule-based logic to determine which strategy best fits a given stock.
 *
 * NOTE: The matching logic is a placeholder framework.
 * The quant-analyst agent will provide specific rules and thresholds.
 *
 * Matching Factors:
 * - Stock volatility vs strategy risk appetite
 * - Stock momentum vs strategy time horizon
 * - Stock liquidity requirements
 * - Strategy entry/exit conditions compatibility
 */

import { prisma } from '@/lib/prisma';
import { ScreenedStock, StrategyMatch } from '@/lib/types/stockScreener';

/**
 * Strategy matching configuration
 * These thresholds will be refined by the quant-analyst
 */
interface MatchingThresholds {
  volatility: {
    low: number;    // < 2%
    medium: number; // 2-5%
    high: number;   // > 5%
  };
  momentum: {
    strong_positive: number; // > 3%
    positive: number;        // 1-3%
    neutral: number;         // -1 to 1%
    negative: number;        // < -1%
  };
  liquidity: {
    high: number;   // > 10M volume
    medium: number; // 1-10M volume
    low: number;    // < 1M volume
  };
}

const DEFAULT_THRESHOLDS: MatchingThresholds = {
  volatility: {
    low: 2,
    medium: 5,
    high: 10
  },
  momentum: {
    strong_positive: 3,
    positive: 1,
    neutral: -1,
    negative: -3
  },
  liquidity: {
    high: 10000000,
    medium: 1000000,
    low: 500000
  }
};

class StrategyMatcherService {
  private thresholds: MatchingThresholds;

  constructor(thresholds: MatchingThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  /**
   * Categorize stock volatility
   */
  private categorizeVolatility(volatility: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (volatility < this.thresholds.volatility.low) return 'LOW';
    if (volatility < this.thresholds.volatility.medium) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Categorize stock momentum
   */
  private categorizeMomentum(
    momentum: number
  ): 'STRONG_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
    if (momentum > this.thresholds.momentum.strong_positive) return 'STRONG_POSITIVE';
    if (momentum > this.thresholds.momentum.positive) return 'POSITIVE';
    if (momentum > this.thresholds.momentum.neutral) return 'NEUTRAL';
    return 'NEGATIVE';
  }

  /**
   * Categorize stock liquidity
   */
  private categorizeLiquidity(volume: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (volume > this.thresholds.liquidity.high) return 'HIGH';
    if (volume > this.thresholds.liquidity.medium) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate match score between stock characteristics and strategy
   * Returns score 0-100 and matched factors
   *
   * NOTE: This is a simplified scoring system.
   * Quant-analyst will provide detailed scoring algorithm.
   */
  private calculateMatchScore(
    stock: ScreenedStock,
    strategy: any
  ): {
    score: number;
    matchedFactors: StrategyMatch['matchedFactors'];
    reasoning: string[];
  } {
    let score = 0;
    const maxScore = 100;
    const matchedFactors: StrategyMatch['matchedFactors'] = {};
    const reasoning: string[] = [];

    const volatilityCategory = this.categorizeVolatility(stock.volatility || 0);
    const momentumCategory = this.categorizeMomentum(stock.momentum || 0);
    const liquidityCategory = this.categorizeLiquidity(stock.volume);

    // Match 1: Risk Appetite vs Volatility (30 points)
    const riskAppetite = strategy.riskAppetite as 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE';

    if (
      (riskAppetite === 'DEFENSIVE' && volatilityCategory === 'LOW') ||
      (riskAppetite === 'BALANCED' && volatilityCategory === 'MEDIUM') ||
      (riskAppetite === 'AGGRESSIVE' && volatilityCategory === 'HIGH')
    ) {
      score += 30;
      matchedFactors.riskAppetite = true;
      reasoning.push(
        `Risk profile matches: ${riskAppetite} strategy with ${volatilityCategory} volatility (${stock.volatility?.toFixed(2)}%)`
      );
    } else {
      reasoning.push(
        `Risk mismatch: ${riskAppetite} strategy with ${volatilityCategory} volatility`
      );
    }

    // Match 2: Time Horizon vs Momentum (30 points)
    const timeHorizon = strategy.timeHorizon as 'SHORT_TERM' | 'SWING' | 'LONG_TERM';

    if (
      (timeHorizon === 'SHORT_TERM' && momentumCategory === 'STRONG_POSITIVE') ||
      (timeHorizon === 'SWING' && (momentumCategory === 'POSITIVE' || momentumCategory === 'NEGATIVE')) ||
      (timeHorizon === 'LONG_TERM' && momentumCategory !== 'STRONG_POSITIVE')
    ) {
      score += 30;
      matchedFactors.timeHorizon = true;
      reasoning.push(
        `Time horizon matches: ${timeHorizon} with ${momentumCategory} momentum (${stock.momentum?.toFixed(2)}%)`
      );
    } else {
      reasoning.push(
        `Time horizon mismatch: ${timeHorizon} with ${momentumCategory} momentum`
      );
    }

    // Match 3: Liquidity Requirements (20 points)
    if (liquidityCategory === 'HIGH' || liquidityCategory === 'MEDIUM') {
      score += 20;
      matchedFactors.liquidity = true;
      reasoning.push(
        `Sufficient liquidity: ${liquidityCategory} (${stock.volume.toLocaleString()} volume)`
      );
    } else {
      reasoning.push(
        `Low liquidity warning: ${stock.volume.toLocaleString()} volume`
      );
    }

    // Match 4: Volatility suitability (20 points)
    if (stock.volatility && stock.volatility >= 1 && stock.volatility <= 15) {
      score += 20;
      matchedFactors.volatility = true;
      reasoning.push(`Volatility within tradable range (${stock.volatility.toFixed(2)}%)`);
    } else {
      reasoning.push(`Volatility outside typical range`);
    }

    return {
      score: Math.min(score, maxScore),
      matchedFactors,
      reasoning
    };
  }

  /**
   * Find the best matching strategy for a stock
   */
  async findBestMatch(stock: ScreenedStock): Promise<StrategyMatch | null> {
    // Fetch all available strategies
    const strategies = await prisma.strategy.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        timeHorizon: true,
        riskAppetite: true,
        stopLoss: true,
        takeProfit: true
      }
    });

    if (strategies.length === 0) {
      console.warn('[StrategyMatcher] No strategies available in database');
      return null;
    }

    // Calculate match scores for all strategies
    const matches = strategies.map(strategy => {
      const { score, matchedFactors, reasoning } = this.calculateMatchScore(
        stock,
        strategy
      );

      return {
        strategy,
        score,
        matchedFactors,
        reasoning
      };
    });

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    // Get the best match
    const bestMatch = matches[0];

    // Only return match if confidence is above minimum threshold (50%)
    if (bestMatch.score < 50) {
      console.warn(
        `[StrategyMatcher] No suitable strategy found for ${stock.symbol} (best score: ${bestMatch.score})`
      );
      return null;
    }

    return {
      symbol: stock.symbol,
      strategyId: bestMatch.strategy.id,
      strategyName: bestMatch.strategy.name,
      confidence: bestMatch.score,
      reasoning: bestMatch.reasoning.join('; '),
      matchedFactors: bestMatch.matchedFactors
    };
  }

  /**
   * Match multiple stocks to strategies
   * Returns matches sorted by confidence
   */
  async matchMultipleStocks(
    stocks: ScreenedStock[]
  ): Promise<StrategyMatch[]> {
    const matches: StrategyMatch[] = [];

    for (const stock of stocks) {
      try {
        const match = await this.findBestMatch(stock);
        if (match) {
          matches.push(match);
        }
      } catch (error) {
        console.error(
          `[StrategyMatcher] Error matching strategy for ${stock.symbol}:`,
          error
        );
      }
    }

    // Sort by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
  }

  /**
   * Get strategy statistics
   * Useful for understanding strategy distribution and usage
   */
  async getStrategyStats(): Promise<{
    totalStrategies: number;
    byRiskAppetite: Record<string, number>;
    byTimeHorizon: Record<string, number>;
  }> {
    const strategies = await prisma.strategy.findMany({
      select: {
        riskAppetite: true,
        timeHorizon: true
      }
    });

    const byRiskAppetite: Record<string, number> = {};
    const byTimeHorizon: Record<string, number> = {};

    strategies.forEach(strategy => {
      byRiskAppetite[strategy.riskAppetite] =
        (byRiskAppetite[strategy.riskAppetite] || 0) + 1;
      byTimeHorizon[strategy.timeHorizon] =
        (byTimeHorizon[strategy.timeHorizon] || 0) + 1;
    });

    return {
      totalStrategies: strategies.length,
      byRiskAppetite,
      byTimeHorizon
    };
  }

  /**
   * Update matching thresholds
   * Allows dynamic adjustment based on market conditions
   */
  updateThresholds(newThresholds: Partial<MatchingThresholds>): void {
    this.thresholds = {
      ...this.thresholds,
      ...newThresholds
    };
    console.log('[StrategyMatcher] Thresholds updated:', this.thresholds);
  }
}

// Export singleton instance
export const strategyMatcherService = new StrategyMatcherService();
