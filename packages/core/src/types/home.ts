import type { AnalysisScope } from './git.js';

// ── Analysis History ──

export interface AnalysisHistoryEntry {
  id: string;
  repoPath: string;
  repoName: string;
  timestamp: string;
  scope: AnalysisScope;
  summary: {
    totalCommits: number;
    analyzedCommits: number;
    averageScore: number;
    topPerformer: string;
  };
  cost: {
    estimatedTokens: number;
    estimatedCost: number;
    llmProvider: string;
    llmModel: string;
  };
  durationMs: number;
}

// ── Agent Memory ──

export interface RepoMemory {
  analysisCount: number;
  firstAnalyzedAt: string;
  lastAnalyzedAt: string;
  rollingAverageScore: number;
  observedPatterns: string[];
}

export interface AgentPreferences {
  preferredProvider?: string;
  preferredModel?: string;
  preferredFormat?: string;
}

export interface LastRunInfo {
  repoPath: string;
  repoName: string;
  timestamp: string;
  averageScore: number;
  totalCommits: number;
}

export interface AgentMemory {
  version: number;
  totalAnalysisCount: number;
  repos: Record<string, RepoMemory>;
  preferences: AgentPreferences;
  lastRun: LastRunInfo | null;
  createdAt: string;
  updatedAt: string;
}

// ── Home Init ──

export interface HomeInitResult {
  homePath: string;
  created: boolean;
  copiedRubrics: string[];
  skippedRubrics: string[];
}
