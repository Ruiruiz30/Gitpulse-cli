import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  CacheManager,
  loadConfig,
  generateReport,
  loadAllRubrics,
  computeRubricHash,
  type ReportFormat,
  type AnalysisReport,
  type CommitScore,
} from '@gitpulse/core';
import { theme } from '../ui/theme.js';
import { renderScoreTable, renderSummaryTable } from '../ui/table.js';
import { handleError } from '../utils/error-handler.js';
import { resolveRepoPath } from '../utils/remote-repo.js';

export interface ReportOptions {
  format?: string;
  output?: string;
}

export async function reportCommandInner(repoPath: string, options: ReportOptions): Promise<void> {
  const { localPath } = await resolveRepoPath(repoPath);
  const absolutePath = path.resolve(localPath);
  const config = await loadConfig(absolutePath);
  const format = (options.format ?? config.output.format) as ReportFormat;

  const rubrics = loadAllRubrics(absolutePath);
  const rubricHash = computeRubricHash(rubrics);
  const cache = new CacheManager(absolutePath);
  const cached = cache.getAllCached(rubricHash);

  if (cached.size === 0) {
    console.log(theme.warning('No cached scores found. Run `gitpulse analyze` first.'));
    return;
  }

  console.log(theme.dim(`Found ${cached.size} cached commit scores.\n`));

  // Build a minimal report from cache
  const commitScores = Array.from(cached.values());
  const report = buildReportFromCache(commitScores, absolutePath, config.provider, config.model, config.scoring.weights);

  if (format === 'terminal') {
    renderSummaryTable(report);
    console.log('');
    renderScoreTable(report);
  } else {
    const output = generateReport(report, format);
    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, output, 'utf-8');
      console.log(theme.success(`Report saved to ${outputPath}`));
    } else {
      console.log(output);
    }
  }
}

export async function reportCommand(repoPath: string, options: ReportOptions): Promise<void> {
  try {
    await reportCommandInner(repoPath, options);
  } catch (error) {
    handleError(error);
  }
}

function buildReportFromCache(
  scores: CommitScore[],
  repoPath: string,
  provider: string,
  model: string,
  weights: { codeQuality: number; complexityImpact: number; commitDiscipline: number; collaboration: number },
): AnalysisReport {
  return {
    metadata: {
      generatedAt: new Date(),
      repositoryPath: repoPath,
      scope: {},
      dimensionWeights: weights,
      totalCommits: scores.length,
      analyzedCommits: scores.length,
      cachedCommits: scores.length,
      skippedCommits: 0,
      llmProvider: provider,
      llmModel: model,
    },
    summary: {
      averageScore: scores.reduce((s, c) => s + c.overallScore, 0) / scores.length,
      medianScore: [...scores].sort((a, b) => a.overallScore - b.overallScore)[Math.floor(scores.length / 2)]?.overallScore ?? 0,
      topPerformer: 'N/A (from cache)',
      totalAuthors: 0,
      dateRange: { start: new Date(), end: new Date() },
    },
    authors: [],
    commitScores: scores,
  };
}
