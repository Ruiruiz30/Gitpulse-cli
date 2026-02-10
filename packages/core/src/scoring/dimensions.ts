import type { DimensionWeight } from '../types/scoring.js';

export interface DimensionDefinition {
  key: keyof DimensionWeight;
  name: string;
  description: string;
  defaultWeight: number;
}

export const DIMENSIONS: DimensionDefinition[] = [
  {
    key: 'codeQuality',
    name: 'Code Quality',
    description: 'Readability, maintainability, best practices, and consistency',
    defaultWeight: 0.30,
  },
  {
    key: 'complexityImpact',
    name: 'Complexity & Impact',
    description: 'Scope, technical complexity, business impact, and test coverage',
    defaultWeight: 0.25,
  },
  {
    key: 'commitDiscipline',
    name: 'Commit Discipline',
    description: 'Message quality, commit size, atomicity, and frequency',
    defaultWeight: 0.25,
  },
  {
    key: 'collaboration',
    name: 'Collaboration',
    description: 'Cross-module contributions, documentation, and mentoring',
    defaultWeight: 0.20,
  },
];

export function getDefaultWeights(): DimensionWeight {
  return {
    codeQuality: 0.30,
    complexityImpact: 0.25,
    commitDiscipline: 0.25,
    collaboration: 0.20,
  };
}

export function computeWeightedScore(
  scores: Record<keyof DimensionWeight, number>,
  weights: DimensionWeight,
): number {
  const totalWeight = weights.codeQuality + weights.complexityImpact + weights.commitDiscipline + weights.collaboration;

  const weighted =
    scores.codeQuality * weights.codeQuality +
    scores.complexityImpact * weights.complexityImpact +
    scores.commitDiscipline * weights.commitDiscipline +
    scores.collaboration * weights.collaboration;

  return weighted / totalWeight;
}
