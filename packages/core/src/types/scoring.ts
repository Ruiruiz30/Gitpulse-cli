export interface CommitScore {
  commitHash: string;
  dimensions: DimensionScores;
  overallScore: number;
  flags: ScoreFlag[];
  reasoning: string;
  metadata: ScoreMetadata;
}

export interface DimensionScores {
  codeQuality: DimensionScore;
  complexityImpact: DimensionScore;
  commitDiscipline: DimensionScore;
  collaboration: DimensionScore;
}

export interface DimensionScore {
  score: number;
  subScores: SubScore[];
  reasoning: string;
}

export interface SubScore {
  name: string;
  score: number;
  weight: number;
}

export interface ScoreFlag {
  type: 'outlier-high' | 'outlier-low' | 'skipped' | 'batched' | 'truncated';
  message: string;
}

export interface ScoreMetadata {
  model: string;
  provider: string;
  tokensUsed: number;
  timestamp: number;
  rubricHash: string;
}

export interface DimensionWeight {
  codeQuality: number;
  complexityImpact: number;
  commitDiscipline: number;
  collaboration: number;
}

export interface AuthorScore {
  authorName: string;
  authorEmail: string;
  overallScore: number;
  dimensionScores: DimensionScores;
  commitCount: number;
  scoredCommitCount: number;
  skippedCommitCount: number;
  trend: Trend;
  periodScores: PeriodScore[];
  flags: ScoreFlag[];
}

export interface Trend {
  direction: 'improving' | 'stable' | 'declining';
  sparkline: number[];
}

export interface PeriodScore {
  periodIndex: number;
  startDate: Date;
  endDate: Date;
  averageScore: number;
  commitCount: number;
}

export type CommitClassification = 'normal' | 'small' | 'large' | 'mechanical' | 'skipped';
