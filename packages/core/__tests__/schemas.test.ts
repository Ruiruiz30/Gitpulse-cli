import { describe, it, expect } from 'vitest';
import { commitScoringResponseSchema, batchScoringResponseSchema } from '../src/llm/schemas/scoring.js';

describe('Scoring Schemas', () => {
  it('should validate a valid commit scoring response', () => {
    const valid = {
      codeQuality: {
        score: 75,
        subScores: [
          { name: 'Readability', score: 80, weight: 0.3 },
          { name: 'Maintainability', score: 70, weight: 0.25 },
        ],
        reasoning: 'Good overall quality',
      },
      complexityImpact: {
        score: 60,
        subScores: [],
        reasoning: 'Moderate complexity',
      },
      commitDiscipline: {
        score: 85,
        subScores: [],
        reasoning: 'Clean commit message',
      },
      collaboration: {
        score: 50,
        subScores: [],
        reasoning: 'Standard individual work',
      },
      overallReasoning: 'A solid contribution',
    };

    const result = commitScoringResponseSchema.parse(valid);
    expect(result.codeQuality.score).toBe(75);
  });

  it('should reject scores out of range', () => {
    const invalid = {
      codeQuality: { score: 150, subScores: [], reasoning: 'test' },
      complexityImpact: { score: 50, subScores: [], reasoning: 'test' },
      commitDiscipline: { score: 50, subScores: [], reasoning: 'test' },
      collaboration: { score: 50, subScores: [], reasoning: 'test' },
      overallReasoning: 'test',
    };

    expect(() => commitScoringResponseSchema.parse(invalid)).toThrow();
  });

  it('should validate batch scoring response', () => {
    const valid = {
      scores: [
        {
          commitHash: 'abc123',
          codeQuality: { score: 70, subScores: [], reasoning: 'ok' },
          complexityImpact: { score: 60, subScores: [], reasoning: 'ok' },
          commitDiscipline: { score: 80, subScores: [], reasoning: 'ok' },
          collaboration: { score: 50, subScores: [], reasoning: 'ok' },
          overallReasoning: 'ok',
        },
      ],
    };

    const result = batchScoringResponseSchema.parse(valid);
    expect(result.scores).toHaveLength(1);
  });
});
