// Types
export type {
  CommitInfo,
  AuthorInfo,
  CommitDiff,
  FileDiff,
  FileStatus,
  DiffStats,
  AuthorContribution,
  AnalysisScope,
} from './types/git.js';

export type {
  CommitScore,
  DimensionScores,
  DimensionScore,
  SubScore,
  ScoreFlag,
  ScoreMetadata,
  DimensionWeight,
  AuthorScore,
  Trend,
  PeriodScore,
  CommitClassification,
} from './types/scoring.js';

export type {
  ReportFormat,
  AnalysisReport,
  ReportMetadata,
  ReportSummary,
  AuthorReport,
  CostEstimate,
} from './types/report.js';

export type {
  LLMProviderType,
  GitPulseConfig,
  ScoringConfig,
  AnalysisConfig,
  OutputConfig,
  PrivacyConfig,
} from './types/config.js';

// Config
export { gitPulseConfigSchema, type GitPulseConfigInput, type GitPulseConfigResolved } from './config/schema.js';
export { loadConfig, loadConfigFromFile } from './config/loader.js';
export { DEFAULT_CONFIG } from './config/defaults.js';

// Git
export { Repository } from './git/repository.js';
export { parseCommits } from './git/commit-parser.js';
export { analyzeDiff } from './git/diff-analyzer.js';
export { aggregateByAuthor, getAuthorList } from './git/author-stats.js';

// LLM
export { createProvider, type ProviderOptions } from './llm/provider.js';
export { loadRubric, loadAllRubrics, buildCommitPrompt, buildBatchPrompt } from './llm/prompt-builder.js';
export { commitScoringResponseSchema, batchScoringResponseSchema } from './llm/schemas/scoring.js';

// Scoring
export { ScoringEngine, type ScoringEngineOptions } from './scoring/engine.js';
export { DIMENSIONS, getDefaultWeights, computeWeightedScore } from './scoring/dimensions.js';
export { aggregateAuthorScores, type AggregationOptions } from './scoring/aggregator.js';
export { normalizeScores, clampScore, roundScore } from './scoring/normalizer.js';

// Cache
export { CacheManager } from './cache/cache-manager.js';
export { computeRubricHash } from './cache/rubric-hash.js';

// Pipeline
export { Analyzer, type AnalysisProgress, type AnalyzerOptions } from './pipeline/analyzer.js';
export { createBatchGroups, classifyCommit, estimateLlmCalls, type BatchGroup } from './pipeline/batch.js';

// Report
export { generateReport } from './report/generator.js';

// Home
export type {
  AnalysisHistoryEntry,
  AgentMemory,
  RepoMemory,
  AgentPreferences,
  LastRunInfo,
  HomeInitResult,
} from './types/home.js';
export { HomeManager } from './home/home-manager.js';
