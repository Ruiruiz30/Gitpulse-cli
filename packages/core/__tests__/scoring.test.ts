import { describe, it, expect } from 'vitest';
import { computeWeightedScore, getDefaultWeights, DIMENSIONS } from '../src/scoring/dimensions.js';

describe('Dimensions', () => {
  it('should have 4 dimensions', () => {
    expect(DIMENSIONS).toHaveLength(4);
  });

  it('default weights should sum to 1.0', () => {
    const weights = getDefaultWeights();
    const sum =
      weights.codeQuality +
      weights.complexityImpact +
      weights.commitDiscipline +
      weights.collaboration;
    expect(sum).toBeCloseTo(1.0);
  });

  it('should compute weighted score correctly', () => {
    const scores = {
      codeQuality: 80,
      complexityImpact: 70,
      commitDiscipline: 90,
      collaboration: 60,
    };
    const weights = getDefaultWeights();
    const result = computeWeightedScore(scores, weights);

    const expected =
      (80 * 0.3 + 70 * 0.25 + 90 * 0.25 + 60 * 0.2) /
      (0.3 + 0.25 + 0.25 + 0.2);
    expect(result).toBeCloseTo(expected);
  });

  it('should handle zero weights gracefully', () => {
    const scores = { codeQuality: 80, complexityImpact: 70, commitDiscipline: 90, collaboration: 60 };
    const weights = { codeQuality: 1, complexityImpact: 0, commitDiscipline: 0, collaboration: 0 };
    const result = computeWeightedScore(scores, weights);
    expect(result).toBeCloseTo(80);
  });
});
