import pLimit from 'p-limit';
import type { LanguageModel } from 'ai';
import type { AnalysisScope, CommitDiff, CommitInfo } from '../types/git.js';
import type { CommitScore, AuthorScore } from '../types/scoring.js';
import type { CostEstimate, AnalysisReport, ReportMetadata, ReportSummary, AuthorReport } from '../types/report.js';
import type { GitPulseConfig } from '../types/config.js';
import { Repository } from '../git/repository.js';
import { parseCommits } from '../git/commit-parser.js';
import { analyzeDiff } from '../git/diff-analyzer.js';
import { aggregateByAuthor } from '../git/author-stats.js';
import { ScoringEngine } from '../scoring/engine.js';
import { aggregateAuthorScores } from '../scoring/aggregator.js';
import { CacheManager } from '../cache/cache-manager.js';
import { loadAllRubrics } from '../llm/prompt-builder.js';
import { computeRubricHash } from '../cache/rubric-hash.js';
import { createBatchGroups, estimateLlmCalls, type BatchGroup } from './batch.js';

export interface AnalysisProgress {
  phase: 'extracting' | 'scoring' | 'aggregating';
  current: number;
  total: number;
  message: string;
}

export interface AnalyzerOptions {
  config: GitPulseConfig;
  model: LanguageModel;
  noCache?: boolean;
}

export class Analyzer {
  private repo: Repository;
  private config: GitPulseConfig;
  private model: LanguageModel;
  private cache: CacheManager;
  private rubricHash: string;
  private noCache: boolean;

  private constructor(
    repo: Repository,
    config: GitPulseConfig,
    model: LanguageModel,
    cache: CacheManager,
    rubricHash: string,
    noCache: boolean,
  ) {
    this.repo = repo;
    this.config = config;
    this.model = model;
    this.cache = cache;
    this.rubricHash = rubricHash;
    this.noCache = noCache;
  }

  static async create(repoPath: string, options: AnalyzerOptions): Promise<Analyzer> {
    const repo = await Repository.open(repoPath);
    const cache = new CacheManager(repoPath);
    const rubrics = loadAllRubrics(repoPath);
    const rubricHash = computeRubricHash(rubrics);

    return new Analyzer(repo, options.config, options.model, cache, rubricHash, options.noCache ?? false);
  }

  async estimate(scope: AnalysisScope): Promise<CostEstimate> {
    const log = await this.repo.getLog(scope);
    const commits = await parseCommits(this.repo, log.all);
    const diffs: CommitDiff[] = [];

    for (const commit of commits) {
      const diff = await analyzeDiff(this.repo, commit, this.config.analysis);
      diffs.push(diff);
    }

    const cachedCount = this.noCache
      ? 0
      : diffs.filter((d) => this.cache.has(d.commit.hash, this.rubricHash)).length;

    const toAnalyze = diffs.filter(
      (d) => this.noCache || !this.cache.has(d.commit.hash, this.rubricHash),
    );

    const groups = createBatchGroups(toAnalyze, this.config.analysis);
    const llmCalls = estimateLlmCalls(groups);
    const estimatedTokens = llmCalls * 8500;
    const estimatedCost = (estimatedTokens / 1000000) * 2.5; // rough $/1M tokens

    return {
      totalCommits: commits.length,
      cachedCommits: cachedCount,
      toAnalyze: toAnalyze.length,
      estimatedLlmCalls: llmCalls,
      estimatedTokens,
      estimatedCost,
      costPerCommit: toAnalyze.length > 0 ? estimatedCost / toAnalyze.length : 0,
    };
  }

  async analyze(
    scope: AnalysisScope,
    onProgress?: (progress: AnalysisProgress) => void,
  ): Promise<AnalysisReport> {
    // Phase 1: Extract commits
    onProgress?.({ phase: 'extracting', current: 0, total: 0, message: 'Extracting commits...' });

    const log = await this.repo.getLog(scope);
    const commits = await parseCommits(this.repo, log.all);

    onProgress?.({
      phase: 'extracting',
      current: 0,
      total: commits.length,
      message: `Found ${commits.length} commits`,
    });

    const diffs: CommitDiff[] = [];
    for (let i = 0; i < commits.length; i++) {
      const diff = await analyzeDiff(this.repo, commits[i]!, this.config.analysis);
      diffs.push(diff);
      onProgress?.({
        phase: 'extracting',
        current: i + 1,
        total: commits.length,
        message: `Extracted diff for ${commits[i]!.abbreviatedHash}`,
      });
    }

    // Phase 2: Score commits
    const allScores: CommitScore[] = [];
    const cachedScores = this.noCache
      ? new Map<string, CommitScore>()
      : this.cache.getAllCached(this.rubricHash);

    const toScore = diffs.filter((d) => !cachedScores.has(d.commit.hash));
    const cachedDiffs = diffs.filter((d) => cachedScores.has(d.commit.hash));

    // Add cached scores
    for (const diff of cachedDiffs) {
      const cached = cachedScores.get(diff.commit.hash)!;
      allScores.push(cached);
    }

    // Score uncached commits
    const groups = createBatchGroups(toScore, this.config.analysis);
    const scoringEngine = new ScoringEngine({
      model: this.model,
      weights: this.config.scoring.weights,
      maxTokensPerDiff: this.config.scoring.maxTokensPerDiff,
      repoPath: this.repo.path,
      rubricHash: this.rubricHash,
    });

    const limit = pLimit(this.config.analysis.maxConcurrency);
    let scored = 0;
    const totalToScore = groups.filter(
      (g) => g.classification !== 'skipped' && g.classification !== 'mechanical',
    ).length;

    const scorePromises = groups.map((group) =>
      limit(async () => {
        const scores = await scoreGroup(group, scoringEngine);

        // Cache results
        for (const score of scores) {
          this.cache.set(score.commitHash, score, this.rubricHash);
        }

        scored++;
        onProgress?.({
          phase: 'scoring',
          current: scored,
          total: totalToScore,
          message: `Scored ${group.diffs[0]?.commit.abbreviatedHash ?? 'batch'}`,
        });

        return scores;
      }),
    );

    const groupResults = await Promise.all(scorePromises);
    for (const scores of groupResults) {
      allScores.push(...scores);
    }

    // Phase 3: Aggregate
    onProgress?.({ phase: 'aggregating', current: 0, total: 0, message: 'Aggregating scores...' });

    const authorContributions = aggregateByAuthor(commits);
    const authorReports: AuthorReport[] = [];

    for (const [email, contribution] of authorContributions) {
      const authorCommitScores = allScores.filter((s) =>
        contribution.commits.some((c) => c.hash === s.commitHash),
      );
      const authorDiffs = diffs.filter((d) =>
        contribution.commits.some((c) => c.hash === d.commit.hash),
      );

      const authorScore = aggregateAuthorScores(
        email,
        contribution.author.name,
        authorCommitScores,
        authorDiffs,
        {
          weights: this.config.scoring.weights,
          timeDecay: this.config.scoring.timeDecay,
          timeDecayLambda: this.config.scoring.timeDecayLambda,
        },
      );

      authorReports.push({
        score: authorScore,
        contribution,
        highlights: generateHighlights(authorScore, authorCommitScores),
        recommendations: generateRecommendations(authorScore),
      });
    }

    // Sort by overall score descending
    authorReports.sort((a, b) => b.score.overallScore - a.score.overallScore);

    const metadata: ReportMetadata = {
      generatedAt: new Date(),
      repositoryPath: this.repo.path,
      scope,
      dimensionWeights: this.config.scoring.weights,
      totalCommits: commits.length,
      analyzedCommits: allScores.length,
      cachedCommits: cachedDiffs.length,
      skippedCommits: groups.filter(
        (g) => g.classification === 'skipped' || g.classification === 'mechanical',
      ).length,
      llmProvider: this.config.provider,
      llmModel: this.config.model,
    };

    const summary = computeSummary(authorReports, commits);

    return {
      metadata,
      summary,
      authors: authorReports,
      commitScores: allScores,
    };
  }
}

async function scoreGroup(group: BatchGroup, engine: ScoringEngine): Promise<CommitScore[]> {
  if (group.classification === 'skipped' || group.classification === 'mechanical') {
    return group.diffs.map((diff) => ({
      commitHash: diff.commit.hash,
      dimensions: {
        codeQuality: { score: 0, subScores: [], reasoning: 'Skipped' },
        complexityImpact: { score: 0, subScores: [], reasoning: 'Skipped' },
        commitDiscipline: { score: 0, subScores: [], reasoning: 'Skipped' },
        collaboration: { score: 0, subScores: [], reasoning: 'Skipped' },
      },
      overallScore: 0,
      flags: [{ type: 'skipped' as const, message: `Classified as ${group.classification}` }],
      reasoning: `Commit classified as ${group.classification}, not scored`,
      metadata: {
        model: 'none',
        provider: 'none',
        tokensUsed: 0,
        timestamp: Date.now(),
        rubricHash: '',
      },
    }));
  }

  if (group.type === 'batch' && group.diffs.length > 1) {
    return engine.scoreBatch(group.diffs);
  }

  const scores: CommitScore[] = [];
  for (const diff of group.diffs) {
    const score = await engine.scoreCommit(diff);
    scores.push(score);
  }
  return scores;
}

function generateHighlights(score: AuthorScore, _commitScores: CommitScore[]): string[] {
  const highlights: string[] = [];

  if (score.overallScore >= 80) highlights.push('Consistently high-quality contributions');
  if (score.dimensionScores.codeQuality.score >= 85) highlights.push('Excellent code quality');
  if (score.dimensionScores.commitDiscipline.score >= 85) highlights.push('Strong commit discipline');
  if (score.trend.direction === 'improving') highlights.push('Showing improvement over time');
  if (score.scoredCommitCount >= 20) highlights.push('High commit volume');

  return highlights;
}

function generateRecommendations(score: AuthorScore): string[] {
  const recs: string[] = [];

  if (score.dimensionScores.codeQuality.score < 60) recs.push('Focus on code readability and best practices');
  if (score.dimensionScores.commitDiscipline.score < 60) recs.push('Improve commit message quality and commit size');
  if (score.dimensionScores.collaboration.score < 50) recs.push('Increase cross-module contributions and documentation');
  if (score.trend.direction === 'declining') recs.push('Recent trend shows declining quality — consider review');

  return recs;
}

function computeSummary(authorReports: AuthorReport[], commits: CommitInfo[]): ReportSummary {
  const scores = authorReports.map((a) => a.score.overallScore).sort((a, b) => a - b);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const median = scores.length > 0 ? scores[Math.floor(scores.length / 2)]! : 0;
  const topPerformer = authorReports[0]?.score.authorName ?? 'N/A';

  const dates = commits.map((c) => c.date).sort((a, b) => a.getTime() - b.getTime());

  return {
    averageScore: avg,
    medianScore: median,
    topPerformer,
    totalAuthors: authorReports.length,
    dateRange: {
      start: dates[0] ?? new Date(),
      end: dates[dates.length - 1] ?? new Date(),
    },
  };
}
