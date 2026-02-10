import { describe, it, expect } from 'vitest';
import { normalizeScores, clampScore, roundScore } from '../src/scoring/normalizer.js';
import type { CommitScore } from '../src/types/scoring.js';

function makeScore(overallScore: number): CommitScore {
  const dim = { score: overallScore, subScores: [], reasoning: 'test' };
  return {
    commitHash: `hash-${overallScore}`,
    dimensions: {
      codeQuality: dim,
      complexityImpact: dim,
      commitDiscipline: dim,
      collaboration: dim,
    },
    overallScore,
    flags: [],
    reasoning: 'test',
    metadata: {
      model: 'test',
      provider: 'test',
      tokensUsed: 0,
      timestamp: Date.now(),
      rubricHash: 'test',
    },
  };
}

describe('normalizeScores', () => {
  it('should normalize scores to 0-100 range', () => {
    const scores = [makeScore(30), makeScore(50), makeScore(70)];
    const normalized = normalizeScores(scores);
    expect(normalized[0]!.overallScore).toBeCloseTo(0);
    expect(normalized[1]!.overallScore).toBeCloseTo(50);
    expect(normalized[2]!.overallScore).toBeCloseTo(100);
  });

  it('should handle empty array', () => {
    expect(normalizeScores([])).toEqual([]);
  });

  it('should handle all same scores', () => {
    const scores = [makeScore(50), makeScore(50)];
    const normalized = normalizeScores(scores);
    expect(normalized[0]!.overallScore).toBe(50);
  });
});

describe('clampScore', () => {
  it('should clamp to 0-100', () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(105)).toBe(100);
    expect(clampScore(50)).toBe(50);
  });
});

describe('roundScore', () => {
  it('should round to specified decimals', () => {
    expect(roundScore(75.456, 1)).toBe(75.5);
    expect(roundScore(75.456, 2)).toBe(75.46);
    expect(roundScore(75.456, 0)).toBe(75);
  });
});
