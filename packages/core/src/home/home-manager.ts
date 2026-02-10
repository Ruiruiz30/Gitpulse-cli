import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type {
  AnalysisHistoryEntry,
  AgentMemory,
  HomeInitResult,
} from '../types/home.js';
import type { AnalysisReport, CostEstimate } from '../types/report.js';
import type { AnalysisScope } from '../types/git.js';
import { findPackageRoot, findBuiltInRubricsDir } from '../utils/paths.js';

const RUBRIC_FILES = [
  'code-quality.md',
  'complexity-impact.md',
  'commit-discipline.md',
  'collaboration.md',
] as const;

const MEMORY_VERSION = 1;

function defaultMemory(): AgentMemory {
  const now = new Date().toISOString();
  return {
    version: MEMORY_VERSION,
    totalAnalysisCount: 0,
    repos: {},
    preferences: {},
    lastRun: null,
    createdAt: now,
    updatedAt: now,
  };
}

export class HomeManager {
  readonly homePath: string;

  constructor(homePath?: string) {
    this.homePath = homePath ?? path.join(os.homedir(), '.gitpulse');
  }

  // ── Directory paths ──

  private get rubricsDir(): string {
    return path.join(this.homePath, 'rubrics');
  }

  private get historyDir(): string {
    return path.join(this.homePath, 'history');
  }

  private get memoryDir(): string {
    return path.join(this.homePath, 'memory');
  }

  private get memoryFile(): string {
    return path.join(this.memoryDir, 'agent-memory.json');
  }

  get configFile(): string {
    return path.join(this.homePath, 'config.yml');
  }

  // ── Initialization ──

  initialize(): HomeInitResult {
    const alreadyExists = fs.existsSync(this.homePath);

    // Create directories
    for (const dir of [this.homePath, this.rubricsDir, this.historyDir, this.memoryDir]) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Copy rubrics (only if they don't already exist)
    const copiedRubrics: string[] = [];
    const skippedRubrics: string[] = [];

    const builtInDir = this.resolveBuiltInRubricsDir();

    for (const rubric of RUBRIC_FILES) {
      const dest = path.join(this.rubricsDir, rubric);
      if (fs.existsSync(dest)) {
        skippedRubrics.push(rubric);
        continue;
      }

      if (builtInDir) {
        const src = path.join(builtInDir, rubric);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          copiedRubrics.push(rubric);
          continue;
        }
      }

      // If built-in not found, skip silently
      skippedRubrics.push(rubric);
    }

    // Initialize agent memory if not present
    if (!fs.existsSync(this.memoryFile)) {
      fs.writeFileSync(this.memoryFile, JSON.stringify(defaultMemory(), null, 2), 'utf-8');
    }

    return {
      homePath: this.homePath,
      created: !alreadyExists,
      copiedRubrics,
      skippedRubrics,
    };
  }

  ensureInitialized(): void {
    if (!fs.existsSync(this.homePath)) {
      this.initialize();
    }
  }

  // ── Analysis History ──

  recordAnalysis(
    report: AnalysisReport,
    scope: AnalysisScope,
    durationMs: number,
    costInfo?: Partial<CostEstimate>,
  ): AnalysisHistoryEntry {
    this.ensureInitialized();

    const repoName = path.basename(report.metadata.repositoryPath);
    const now = new Date();
    const ts = formatTimestamp(now);

    const entry: AnalysisHistoryEntry = {
      id: randomUUID(),
      repoPath: report.metadata.repositoryPath,
      repoName,
      timestamp: now.toISOString(),
      scope,
      summary: {
        totalCommits: report.metadata.totalCommits,
        analyzedCommits: report.metadata.analyzedCommits,
        averageScore: report.summary.averageScore,
        topPerformer: report.summary.topPerformer,
      },
      cost: {
        estimatedTokens: costInfo?.estimatedTokens ?? 0,
        estimatedCost: costInfo?.estimatedCost ?? 0,
        llmProvider: report.metadata.llmProvider,
        llmModel: report.metadata.llmModel,
      },
      durationMs,
    };

    const filename = `${repoName}_${ts}_${entry.id.slice(0, 8)}.json`;
    fs.writeFileSync(
      path.join(this.historyDir, filename),
      JSON.stringify(entry, null, 2),
      'utf-8',
    );

    return entry;
  }

  getHistory(repoPath?: string): AnalysisHistoryEntry[] {
    if (!fs.existsSync(this.historyDir)) return [];

    const files = fs.readdirSync(this.historyDir).filter((f) => f.endsWith('.json'));
    const entries: AnalysisHistoryEntry[] = [];

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(this.historyDir, file), 'utf-8');
        const entry: AnalysisHistoryEntry = JSON.parse(raw);
        if (!repoPath || entry.repoPath === repoPath) {
          entries.push(entry);
        }
      } catch {
        // Skip corrupt files
      }
    }

    // Sort by timestamp descending
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return entries;
  }

  // ── Agent Memory ──

  getMemory(): AgentMemory {
    if (!fs.existsSync(this.memoryFile)) {
      return defaultMemory();
    }
    try {
      const raw = fs.readFileSync(this.memoryFile, 'utf-8');
      return JSON.parse(raw) as AgentMemory;
    } catch {
      return defaultMemory();
    }
  }

  updateMemory(report: AnalysisReport): AgentMemory {
    this.ensureInitialized();

    const memory = this.getMemory();
    const now = new Date().toISOString();
    const repoPath = report.metadata.repositoryPath;
    const repoName = path.basename(repoPath);

    // Update total count
    memory.totalAnalysisCount += 1;

    // Update repo memory
    const existing = memory.repos[repoPath];
    const avgScore = report.summary.averageScore;

    if (existing) {
      const prevCount = existing.analysisCount;
      existing.analysisCount += 1;
      existing.lastAnalyzedAt = now;
      // Rolling average
      existing.rollingAverageScore =
        (existing.rollingAverageScore * prevCount + avgScore) / existing.analysisCount;
    } else {
      memory.repos[repoPath] = {
        analysisCount: 1,
        firstAnalyzedAt: now,
        lastAnalyzedAt: now,
        rollingAverageScore: avgScore,
        observedPatterns: [],
      };
    }

    // Update preferences from most recent run
    memory.preferences.preferredProvider = report.metadata.llmProvider;
    memory.preferences.preferredModel = report.metadata.llmModel;

    // Update last run info
    memory.lastRun = {
      repoPath,
      repoName,
      timestamp: now,
      averageScore: avgScore,
      totalCommits: report.metadata.totalCommits,
    };

    memory.updatedAt = now;

    fs.writeFileSync(this.memoryFile, JSON.stringify(memory, null, 2), 'utf-8');
    return memory;
  }

  // ── Internals ──

  private resolveBuiltInRubricsDir(): string | null {
    const __filename = fileURLToPath(import.meta.url);
    const pkgRoot = findPackageRoot(path.dirname(__filename));
    return findBuiltInRubricsDir(pkgRoot);
  }
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
