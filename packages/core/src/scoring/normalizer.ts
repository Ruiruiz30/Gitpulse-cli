import type { CommitScore } from '../types/scoring.js';

export function normalizeScores(scores: CommitScore[]): CommitScore[] {
  if (scores.length === 0) return [];

  const allOverall = scores.map((s) => s.overallScore);
  const min = Math.min(...allOverall);
  const max = Math.max(...allOverall);
  const range = max - min;

  if (range === 0) return scores;

  return scores.map((score) => ({
    ...score,
    overallScore: ((score.overallScore - min) / range) * 100,
  }));
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function roundScore(score: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(score * factor) / factor;
}
