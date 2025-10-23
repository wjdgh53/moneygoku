/**
 * Unit tests for Insider Buying Score Algorithm
 */

import {
  calculateInsiderBuyingScore,
  explainInsiderScore,
  InsiderScoringParams,
} from '@/lib/utils/insiderScoringAlgorithm';

describe('Insider Buying Score Algorithm', () => {
  describe('calculateInsiderBuyingScore', () => {
    it('should score large CEO transaction highly', () => {
      const params: InsiderScoringParams = {
        securitiesTransacted: 100000,
        pricePerShare: 50,
        typeOfOwner: 'officer: CEO',
        securitiesOwned: 500000,
        transactionDate: '2025-01-15',
      };

      const score = calculateInsiderBuyingScore(params);

      // $5M transaction, CEO, 25% position increase
      // Expected: 3 * 2.0 (size) * 1.5 (CEO) * 1.1 (conviction) = 9.9
      expect(score).toBeGreaterThan(9.0);
      expect(score).toBeLessThan(12.0);
    });

    it('should penalize below-threshold transactions', () => {
      const params: InsiderScoringParams = {
        securitiesTransacted: 1712,
        pricePerShare: 20,
        typeOfOwner: 'officer: VP',
        securitiesOwned: 10000,
        transactionDate: '2025-01-15',
      };

      const score = calculateInsiderBuyingScore(params);

      // $34k transaction (below $50k threshold)
      // Expected: 3 * 0.3 (penalty) * 1.0 * 1.0 = 0.9
      expect(score).toBeLessThan(1.5);
    });

    it('should score massive insider buy appropriately with logarithmic scaling', () => {
      const params: InsiderScoringParams = {
        securitiesTransacted: 190000000,
        pricePerShare: 0.1,
        typeOfOwner: 'director',
        securitiesOwned: 200000000,
        transactionDate: '2025-01-15',
      };

      const score = calculateInsiderBuyingScore(params);

      // $19M transaction, director, very high conviction
      // Expected: 3 * 2.58 (log scale) * 1.1 (director) * 1.3 (conviction) ≈ 11.0
      expect(score).toBeGreaterThan(10.0);
      expect(score).toBeLessThan(13.0);
    });

    it('should weight CFO transactions highly', () => {
      const params: InsiderScoringParams = {
        securitiesTransacted: 50000,
        pricePerShare: 10,
        typeOfOwner: 'officer: Chief Financial Officer',
        securitiesOwned: 150000,
        transactionDate: '2025-01-15',
      };

      const score = calculateInsiderBuyingScore(params);

      // $500k transaction, CFO (1.4x), 50% increase (1.2x)
      // Expected: 3 * 2.0 * 1.4 * 1.2 ≈ 10.1
      expect(score).toBeGreaterThan(9.0);
      expect(score).toBeLessThan(11.0);
    });

    it('should apply conviction multiplier for doubling position', () => {
      const params: InsiderScoringParams = {
        securitiesTransacted: 100000,
        pricePerShare: 10,
        typeOfOwner: 'officer',
        securitiesOwned: 200000,
        transactionDate: '2025-01-15',
      };

      const score = calculateInsiderBuyingScore(params);

      // $1M transaction, officer, doubling position (1.3x conviction)
      // Expected: 3 * 2.0 * 1.0 * 1.3 ≈ 7.8
      expect(score).toBeGreaterThan(7.0);
      expect(score).toBeLessThan(9.0);
    });

    it('should cap score at maximum of 15', () => {
      const params: InsiderScoringParams = {
        securitiesTransacted: 10000000,
        pricePerShare: 100,
        typeOfOwner: 'officer: CEO',
        securitiesOwned: 15000000,
        transactionDate: '2025-01-15',
      };

      const score = calculateInsiderBuyingScore(params);

      // $1B transaction - would exceed cap without limit
      expect(score).toBeLessThanOrEqual(15);
    });

    it('should handle edge case of new position (0 previous shares)', () => {
      const params: InsiderScoringParams = {
        securitiesTransacted: 100000,
        pricePerShare: 50,
        typeOfOwner: 'director',
        securitiesOwned: 100000, // New position
        transactionDate: '2025-01-15',
      };

      const score = calculateInsiderBuyingScore(params);

      // Should not throw division by zero error
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(15);
    });

    it('should give similar scores for similar economic value despite different share counts', () => {
      const highPriceParams: InsiderScoringParams = {
        securitiesTransacted: 10000,
        pricePerShare: 100,
        typeOfOwner: 'officer',
        securitiesOwned: 30000,
        transactionDate: '2025-01-15',
      };

      const lowPriceParams: InsiderScoringParams = {
        securitiesTransacted: 100000,
        pricePerShare: 10,
        typeOfOwner: 'officer',
        securitiesOwned: 300000,
        transactionDate: '2025-01-15',
      };

      const score1 = calculateInsiderBuyingScore(highPriceParams);
      const score2 = calculateInsiderBuyingScore(lowPriceParams);

      // Both are $1M transactions with 50% position increase
      // Scores should be very close (within 0.5 points)
      expect(Math.abs(score1 - score2)).toBeLessThan(0.5);
    });
  });

  describe('explainInsiderScore', () => {
    it('should provide detailed breakdown', () => {
      const params: InsiderScoringParams = {
        securitiesTransacted: 100000,
        pricePerShare: 50,
        typeOfOwner: 'officer: CEO',
        securitiesOwned: 500000,
        transactionDate: '2025-01-15',
      };

      const explanation = explainInsiderScore(params);

      expect(explanation.finalScore).toBeGreaterThan(0);
      expect(explanation.breakdown.dollarValue).toBe(5000000);
      expect(explanation.breakdown.sizeMultiplier).toBeGreaterThan(1);
      expect(explanation.breakdown.ownerMultiplier).toBe(1.5); // CEO
      expect(explanation.breakdown.convictionMultiplier).toBeGreaterThan(1);
      expect(explanation.breakdown.explanation).toContain('CEO');
      expect(explanation.breakdown.explanation).toContain('$5,000,000');
    });
  });

  describe('Score comparisons - Real world examples', () => {
    it('VHAI massive buy should score higher than CMC small buy', () => {
      const vhaiParams: InsiderScoringParams = {
        securitiesTransacted: 190000000,
        pricePerShare: 0.1,
        typeOfOwner: 'director',
        securitiesOwned: 200000000,
        transactionDate: '2025-01-15',
      };

      const cmcParams: InsiderScoringParams = {
        securitiesTransacted: 1712,
        pricePerShare: 20,
        typeOfOwner: 'officer',
        securitiesOwned: 10000,
        transactionDate: '2025-01-15',
      };

      const vhaiScore = calculateInsiderBuyingScore(vhaiParams);
      const cmcScore = calculateInsiderBuyingScore(cmcParams);

      // VHAI ($19M) should score significantly higher than CMC ($34k)
      expect(vhaiScore).toBeGreaterThan(cmcScore * 5);
    });

    it('CEO buy should score higher than director buy of same size', () => {
      const baseParams = {
        securitiesTransacted: 100000,
        pricePerShare: 50,
        securitiesOwned: 500000,
        transactionDate: '2025-01-15',
      };

      const ceoScore = calculateInsiderBuyingScore({
        ...baseParams,
        typeOfOwner: 'officer: CEO',
      });

      const directorScore = calculateInsiderBuyingScore({
        ...baseParams,
        typeOfOwner: 'director',
      });

      // CEO should score higher (1.5x vs 1.1x multiplier)
      expect(ceoScore).toBeGreaterThan(directorScore);
      expect(ceoScore / directorScore).toBeCloseTo(1.5 / 1.1, 1);
    });

    it('High conviction buy should score higher than low conviction buy', () => {
      const baseParams = {
        securitiesTransacted: 100000,
        pricePerShare: 50,
        typeOfOwner: 'officer',
        transactionDate: '2025-01-15',
      };

      const highConvictionScore = calculateInsiderBuyingScore({
        ...baseParams,
        securitiesOwned: 200000, // Doubling position
      });

      const lowConvictionScore = calculateInsiderBuyingScore({
        ...baseParams,
        securitiesOwned: 1000000, // Small % increase
      });

      // High conviction should score higher (1.3x vs 1.0x)
      expect(highConvictionScore).toBeGreaterThan(lowConvictionScore);
    });
  });

  describe('Logarithmic scaling validation', () => {
    it('should show diminishing returns with transaction size', () => {
      const getScore = (dollarValue: number) => {
        return calculateInsiderBuyingScore({
          securitiesTransacted: dollarValue / 50, // Assume $50/share
          pricePerShare: 50,
          typeOfOwner: 'officer',
          securitiesOwned: dollarValue * 2 / 50, // Same relative position
          transactionDate: '2025-01-15',
        });
      };

      const score100k = getScore(100000);
      const score1M = getScore(1000000);
      const score10M = getScore(10000000);
      const score100M = getScore(100000000);

      // Score increase should slow as size grows
      const increase1 = score1M - score100k;
      const increase2 = score10M - score1M;
      const increase3 = score100M - score10M;

      // Each 10x increase should add less points than previous 10x
      expect(increase2).toBeLessThan(increase1);
      expect(increase3).toBeLessThan(increase2);
    });
  });
});
