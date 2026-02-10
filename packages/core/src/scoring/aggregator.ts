import type { CommitScore, AuthorScore, DimensionScores, DimensionWeight, Trend, PeriodScore, ScoreFlag } from '../types/scoring.js';
import type { CommitDiff } from '../types/git.js';
import { computeWeightedScore } from './dimensions.js';

export interface AggregationOptions {
  weights: DimensionWeight;
  timeDecay: boolean;
  timeDecayLambda: number;
}

export function aggregateAuthorScores(
  authorEmail: string,
  authorName: string,
  commitScores: CommitScore[],
  commitDiffs: CommitDiff[],
  options: AggregationOptions,
): AuthorScore {
  if (commitScores.length === 0) {
    return createEmptyAuthorScore(authorEmail, authorName);
  }

  const diffMap = new Map(commitDiffs.map((d) => [d.commit.hash, d]));

  // Compute weights for each commit
  const weightedEntries = commitScores.map((score) => {
    const diff = diffMap.get(score.commitHash);
    const effectiveChanges = diff?.stats.effectiveChanges ?? 1;
    const commitWeight = Math.log2(1 + effectiveChanges);

    let timeWeight = 1;
    if (options.timeDecay && diff) {
      const now = Date.now();
      const daysSince = (now - diff.commit.date.getTime()) / (1000 * 60 * 60 * 24);
      timeWeight = Math.exp(-options.timeDecayLambda * daysSince);
    }

    return { score, commitWeight, timeWeight, totalWeight: commitWeight * timeWeight };
  });

  const totalWeight = weightedEntries.reduce((sum, e) => sum + e.totalWeight, 0);

  // Weighted average for each dimension
  const dimensionScores = computeWeightedDimensionScores(weightedEntries, totalWeight);
  const overallScore = computeWeightedScore(
    {
      codeQuality: dimensionScores.codeQuality.score,
      complexityImpact: dimensionScores.complexityImpact.score,
      commitDiscipline: dimensionScores.commitDiscipline.score,
      collaboration: dimensionScores.collaboration.score,
    },
    options.weights,
  );

  // Outlier detection
  const flags = detectOutliers(commitScores);

  // Trend analysis
  const trend = analyzeTrend(commitScores, commitDiffs);

  // Period scores
  const periodScores = computePeriodScores(commitScores, commitDiffs);

  const skippedCount = commitScores.filter((s) =>
    s.flags.some((f) => f.type === 'skipped'),
  ).length;

  return {
    authorName,
    authorEmail,
    overallScore,
    dimensionScores,
    commitCount: commitScores.length + skippedCount,
    scoredCommitCount: commitScores.length,
    skippedCommitCount: skippedCount,
    trend,
    periodScores,
    flags,
  };
}

function computeWeightedDimensionScores(
  entries: Array<{ score: CommitScore; totalWeight: number }>,
  totalWeight: number,
): DimensionScores {
  const dims = ['codeQuality', 'complexityImpact', 'commitDiscipline', 'collaboration'] as const;
  const result: Record<string, { score: number; subScores: []; reasoning: string }> = {};

  for (const dim of dims) {
    const weightedSum = entries.reduce(
      (sum, e) => sum + e.score.dimensions[dim].score * e.totalWeight,
      0,
    );
    result[dim] = {
      score: totalWeight > 0 ? weightedSum / totalWeight : 0,
      subScores: [],
      reasoning: `Aggregated from ${entries.length} commits`,
    };
  }

  return result as unknown as DimensionScores;
}

function detectOutliers(scores: CommitScore[]): ScoreFlag[] {
  const flags: ScoreFlag[] = [];
  const overallScores = scores.map((s) => s.overallScore).sort((a, b) => a - b);

  if (overallScores.length < 4) return flags;

  const q1 = overallScores[Math.floor(overallScores.length * 0.25)]!;
  const q3 = overallScores[Math.floor(overallScores.length * 0.75)]!;
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  for (const score of scores) {
    if (score.overallScore < lowerBound) {
      flags.push({
        type: 'outlier-low',
        message: `Commit ${score.commitHash.substring(0, 7)} scored ${score.overallScore.toFixed(1)} (below IQR lower bound ${lowerBound.toFixed(1)})`,
      });
    } else if (score.overallScore > upperBound) {
      flags.push({
        type: 'outlier-high',
        message: `Commit ${score.commitHash.substring(0, 7)} scored ${score.overallScore.toFixed(1)} (above IQR upper bound ${upperBound.toFixed(1)})`,
      });
    }
  }

  return flags;
}

function analyzeTrend(scores: CommitScore[], diffs: CommitDiff[]): Trend {
  if (scores.length < 4) {
    return { direction: 'stable', sparkline: scores.map((s) => s.overallScore) };
  }

  const sorted = [...scores].sort((a, b) => {
    const aDate = diffs.find((d) => d.commit.hash === a.commitHash)?.commit.date ?? new Date();
    const bDate = diffs.find((d) => d.commit.hash === b.commitHash)?.commit.date ?? new Date();
    return aDate.getTime() - bDate.getTime();
  });

  const segmentSize = Math.floor(sorted.length / 4);
  const segments: number[] = [];

  for (let i = 0; i < 4; i++) {
    const start = i * segmentSize;
    const end = i === 3 ? sorted.length : (i + 1) * segmentSize;
    const segment = sorted.slice(start, end);
    const avg = segment.reduce((sum, s) => sum + s.overallScore, 0) / segment.length;
    segments.push(avg);
  }

  const firstHalf = (segments[0]! + segments[1]!) / 2;
  const secondHalf = (segments[2]! + segments[3]!) / 2;
  const diff = secondHalf - firstHalf;

  let direction: Trend['direction'];
  if (diff > 5) direction = 'improving';
  else if (diff < -5) direction = 'declining';
  else direction = 'stable';

  return { direction, sparkline: segments };
}

function computePeriodScores(scores: CommitScore[], diffs: CommitDiff[]): PeriodScore[] {
  if (scores.length < 4) return [];

  const withDates = scores
    .map((s) => ({
      score: s,
      date: diffs.find((d) => d.commit.hash === s.commitHash)?.commit.date ?? new Date(),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const startDate = withDates[0]!.date;
  const endDate = withDates[withDates.length - 1]!.date;
  const totalRange = endDate.getTime() - startDate.getTime();
  const periodLength = totalRange / 4;

  const periods: PeriodScore[] = [];

  for (let i = 0; i < 4; i++) {
    const pStart = new Date(startDate.getTime() + i * periodLength);
    const pEnd = new Date(startDate.getTime() + (i + 1) * periodLength);
    const periodCommits = withDates.filter(
      (w) => w.date >= pStart && (i === 3 ? w.date <= pEnd : w.date < pEnd),
    );

    const avg =
      periodCommits.length > 0
        ? periodCommits.reduce((sum, c) => sum + c.score.overallScore, 0) / periodCommits.length
        : 0;

    periods.push({
      periodIndex: i,
      startDate: pStart,
      endDate: pEnd,
      averageScore: avg,
      commitCount: periodCommits.length,
    });
  }

  return periods;
}

function createEmptyAuthorScore(email: string, name: string): AuthorScore {
  const emptyDimension = { score: 0, subScores: [], reasoning: 'No commits scored' };
  return {
    authorName: name,
    authorEmail: email,
    overallScore: 0,
    dimensionScores: {
      codeQuality: emptyDimension,
      complexityImpact: emptyDimension,
      commitDiscipline: emptyDimension,
      collaboration: emptyDimension,
    },
    commitCount: 0,
    scoredCommitCount: 0,
    skippedCommitCount: 0,
    trend: { direction: 'stable', sparkline: [] },
    periodScores: [],
    flags: [],
  };
}
