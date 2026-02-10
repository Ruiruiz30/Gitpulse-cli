import type { AuthorScore, CommitScore, DimensionWeight } from './scoring.js';
import type { AnalysisScope, AuthorContribution } from './git.js';

export type ReportFormat = 'terminal' | 'json' | 'markdown' | 'html';

export interface AnalysisReport {
  metadata: ReportMetadata;
  summary: ReportSummary;
  authors: AuthorReport[];
  commitScores: CommitScore[];
}

export interface ReportMetadata {
  generatedAt: Date;
  repositoryPath: string;
  scope: AnalysisScope;
  dimensionWeights: DimensionWeight;
  totalCommits: number;
  analyzedCommits: number;
  cachedCommits: number;
  skippedCommits: number;
  llmProvider: string;
  llmModel: string;
}

export interface ReportSummary {
  averageScore: number;
  medianScore: number;
  topPerformer: string;
  totalAuthors: number;
  dateRange: { start: Date; end: Date };
}

export interface AuthorReport {
  score: AuthorScore;
  contribution: AuthorContribution;
  highlights: string[];
  recommendations: string[];
}

export interface CostEstimate {
  totalCommits: number;
  cachedCommits: number;
  toAnalyze: number;
  estimatedLlmCalls: number;
  estimatedTokens: number;
  estimatedCost: number;
  costPerCommit: number;
}
