/**
 * Insider Buying Score Algorithm
 *
 * Sophisticated scoring system for insider trading signals based on:
 * - Transaction size (logarithmic scaling)
 * - Insider position/role (C-suite weighted higher)
 * - Conviction signal (position size increase)
 * - Time decay (handled separately)
 *
 * Research Foundation:
 * - Cohen et al. (2012): "Decoding Inside Information"
 * - Seyhun (1986): "Insiders' Profits, Costs of Trading"
 * - Jeng, Metrick & Zeckhauser (2003): "Estimating the Returns to Insider Trading"
 */

/**
 * Insider transaction scoring parameters
 */
export interface InsiderScoringParams {
  /** Number of shares transacted */
  securitiesTransacted: number;

  /** Price per share at transaction */
  pricePerShare: number;

  /** Type of owner (e.g., "officer: CEO", "director") */
  typeOfOwner: string;

  /** Total securities owned after transaction */
  securitiesOwned: number;

  /** Transaction date (for time decay, handled separately) */
  transactionDate: string;
}

/**
 * Scoring configuration constants
 */
const SCORING_CONFIG = {
  /** Base score before multipliers */
  BASE_SCORE: 3,

  /** Minimum dollar value to qualify as significant ($50k) */
  SIZE_THRESHOLD: 50000,

  /** Maximum size multiplier (caps at 3x) */
  MAX_SIZE_MULTIPLIER: 3.0,

  /** Penalty multiplier for below-threshold transactions */
  BELOW_THRESHOLD_PENALTY: 0.3,

  /** Maximum total score (before time decay) */
  MAX_SCORE: 12,

  /** Owner type multipliers */
  OWNER_MULTIPLIERS: {
    CEO: 1.5,              // Chief Executive Officer
    CFO: 1.4,              // Chief Financial Officer
    PRESIDENT: 1.3,        // President / COO
    LARGE_SHAREHOLDER: 1.2, // Director with 10%+ ownership
    DIRECTOR: 1.1,         // Board member
    OFFICER: 1.0,          // Other officers
  },

  /** Conviction thresholds (position increase %) */
  CONVICTION_THRESHOLDS: {
    VERY_HIGH: { threshold: 1.0, multiplier: 1.3 },   // Doubling position
    HIGH: { threshold: 0.5, multiplier: 1.2 },        // 50%+ increase
    MODERATE: { threshold: 0.25, multiplier: 1.1 },   // 25%+ increase
    LOW: { threshold: 0, multiplier: 1.0 },           // Any increase
  },
} as const;

/**
 * Calculate insider buying score with sophisticated weighting
 *
 * @param params - Insider transaction parameters
 * @returns Calculated score (0-15 range, before time decay)
 *
 * @example
 * ```typescript
 * const score = calculateInsiderBuyingScore({
 *   securitiesTransacted: 100000,
 *   pricePerShare: 50,
 *   typeOfOwner: "officer: CEO",
 *   securitiesOwned: 500000,
 *   transactionDate: "2025-01-15"
 * });
 * // Returns ~11.7 (high conviction CEO purchase)
 * ```
 */
export function calculateInsiderBuyingScore(
  params: InsiderScoringParams
): number {
  const {
    securitiesTransacted,
    pricePerShare,
    typeOfOwner,
    securitiesOwned,
  } = params;

  // 1. Calculate total transaction value
  const dollarValue = securitiesTransacted * pricePerShare;

  // 2. Size-based multiplier (logarithmic scaling)
  const sizeMultiplier = calculateSizeMultiplier(dollarValue);

  // 3. Owner type multiplier (C-suite trades more informative)
  const ownerMultiplier = calculateOwnerMultiplier(typeOfOwner);

  // 4. Conviction multiplier (position size increase)
  const convictionMultiplier = calculateConvictionMultiplier(
    securitiesTransacted,
    securitiesOwned
  );

  // 5. Combine multipliers
  const rawScore =
    SCORING_CONFIG.BASE_SCORE *
    sizeMultiplier *
    ownerMultiplier *
    convictionMultiplier;

  // 6. Apply cap
  const finalScore = Math.min(rawScore, SCORING_CONFIG.MAX_SCORE);

  return Math.round(finalScore * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate size multiplier using logarithmic scaling
 *
 * Rationale: Diminishing returns - $1M→$10M is more significant than $100M→$110M
 * Formula: 1 + log10(value / threshold) for values above threshold
 */
function calculateSizeMultiplier(dollarValue: number): number {
  const { SIZE_THRESHOLD, MAX_SIZE_MULTIPLIER, BELOW_THRESHOLD_PENALTY } = SCORING_CONFIG;

  if (dollarValue < SIZE_THRESHOLD) {
    // Below threshold - apply penalty (small trades less informative)
    return BELOW_THRESHOLD_PENALTY;
  }

  // Logarithmic scaling
  // $50k → 1.0x, $500k → 2.0x, $5M → 2.0x, $50M → 3.0x (capped)
  const logValue = Math.log10(dollarValue / SIZE_THRESHOLD);
  const multiplier = 1 + logValue;

  return Math.min(multiplier, MAX_SIZE_MULTIPLIER);
}

/**
 * Calculate owner type multiplier
 *
 * Research shows C-suite trades (especially CEO/CFO) have stronger predictive power
 * than lower-level officers or outside directors
 */
function calculateOwnerMultiplier(typeOfOwner: string): number {
  const ownerLower = typeOfOwner.toLowerCase();
  const { OWNER_MULTIPLIERS } = SCORING_CONFIG;

  // Check in order of priority
  if (ownerLower.includes('ceo') || ownerLower.includes('chief executive')) {
    return OWNER_MULTIPLIERS.CEO;
  }

  if (ownerLower.includes('cfo') || ownerLower.includes('chief financial')) {
    return OWNER_MULTIPLIERS.CFO;
  }

  if (ownerLower.includes('president') || ownerLower.includes('coo') ||
      ownerLower.includes('chief operating')) {
    return OWNER_MULTIPLIERS.PRESIDENT;
  }

  // Director with 10%+ ownership
  if (ownerLower.includes('director') && ownerLower.includes('10%')) {
    return OWNER_MULTIPLIERS.LARGE_SHAREHOLDER;
  }

  // Regular director
  if (ownerLower.includes('director')) {
    return OWNER_MULTIPLIERS.DIRECTOR;
  }

  // Default for officers
  return OWNER_MULTIPLIERS.OFFICER;
}

/**
 * Calculate conviction multiplier based on position increase
 *
 * Larger percentage increases signal stronger conviction
 */
function calculateConvictionMultiplier(
  securitiesTransacted: number,
  securitiesOwned: number
): number {
  // Avoid division by zero - if owned is 0, this is a new position (high conviction)
  const previouslyOwned = Math.max(securitiesOwned - securitiesTransacted, 1);
  const percentageIncrease = securitiesTransacted / previouslyOwned;

  const { CONVICTION_THRESHOLDS } = SCORING_CONFIG;

  if (percentageIncrease >= CONVICTION_THRESHOLDS.VERY_HIGH.threshold) {
    return CONVICTION_THRESHOLDS.VERY_HIGH.multiplier;
  }

  if (percentageIncrease >= CONVICTION_THRESHOLDS.HIGH.threshold) {
    return CONVICTION_THRESHOLDS.HIGH.multiplier;
  }

  if (percentageIncrease >= CONVICTION_THRESHOLDS.MODERATE.threshold) {
    return CONVICTION_THRESHOLDS.MODERATE.multiplier;
  }

  return CONVICTION_THRESHOLDS.LOW.multiplier;
}

/**
 * Get human-readable explanation of score components
 * Useful for debugging and transparency
 */
export function explainInsiderScore(
  params: InsiderScoringParams
): {
  finalScore: number;
  breakdown: {
    dollarValue: number;
    sizeMultiplier: number;
    ownerMultiplier: number;
    convictionMultiplier: number;
    explanation: string;
  };
} {
  const dollarValue = params.securitiesTransacted * params.pricePerShare;
  const sizeMultiplier = calculateSizeMultiplier(dollarValue);
  const ownerMultiplier = calculateOwnerMultiplier(params.typeOfOwner);
  const convictionMultiplier = calculateConvictionMultiplier(
    params.securitiesTransacted,
    params.securitiesOwned
  );

  const finalScore = calculateInsiderBuyingScore(params);

  const explanation = `
Transaction Value: ${formatCurrency(dollarValue)}
Size Multiplier: ${sizeMultiplier.toFixed(2)}x (${getSizeCategory(dollarValue)})
Owner Multiplier: ${ownerMultiplier.toFixed(2)}x (${getOwnerCategory(params.typeOfOwner)})
Conviction Multiplier: ${convictionMultiplier.toFixed(2)}x (${getConvictionCategory(params.securitiesTransacted, params.securitiesOwned)})
Final Score: ${finalScore.toFixed(2)} points
  `.trim();

  return {
    finalScore,
    breakdown: {
      dollarValue,
      sizeMultiplier,
      ownerMultiplier,
      convictionMultiplier,
      explanation,
    },
  };
}

// Helper formatting functions
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function getSizeCategory(dollarValue: number): string {
  if (dollarValue < SCORING_CONFIG.SIZE_THRESHOLD) return 'Below threshold';
  if (dollarValue < 250000) return 'Small';
  if (dollarValue < 1000000) return 'Medium';
  if (dollarValue < 10000000) return 'Large';
  return 'Very Large';
}

function getOwnerCategory(typeOfOwner: string): string {
  const ownerLower = typeOfOwner.toLowerCase();
  if (ownerLower.includes('ceo')) return 'CEO';
  if (ownerLower.includes('cfo')) return 'CFO';
  if (ownerLower.includes('president')) return 'President/COO';
  if (ownerLower.includes('10%')) return 'Large Shareholder';
  if (ownerLower.includes('director')) return 'Director';
  return 'Officer';
}

function getConvictionCategory(transacted: number, owned: number): string {
  const previouslyOwned = Math.max(owned - transacted, 1);
  const pct = transacted / previouslyOwned;
  if (pct >= 1.0) return 'Very High (100%+ increase)';
  if (pct >= 0.5) return 'High (50%+ increase)';
  if (pct >= 0.25) return 'Moderate (25%+ increase)';
  return 'Low (<25% increase)';
}
