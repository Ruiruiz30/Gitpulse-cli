import * as path from 'node:path';
import * as fs from 'node:fs';
import { confirm, select, input } from '@inquirer/prompts';
import {
  Analyzer,
  createProvider,
  generateReport,
  loadConfig,
  HomeManager,
  type AnalysisScope,
  type ReportFormat,
  type AnalysisProgress,
} from '@gitpulse/core';
import { theme } from '../ui/theme.js';
import { phaseSpinner } from '../ui/spinner.js';
import { renderScoreTable, renderSummaryTable } from '../ui/table.js';
import cliProgress from 'cli-progress';
import { createProgressBar } from '../ui/progress.js';
import { handleError } from '../utils/error-handler.js';
import { resolveRepoPath } from '../utils/remote-repo.js';

export interface AnalyzeOptions {
  branch?: string;
  since?: string;
  until?: string;
  author?: string[];
  maxCommits?: number;
  format?: string;
  output?: string;
  noCache?: boolean;
  yes?: boolean;
  provider?: string;
  model?: string;
}

export async function analyzeCommandInner(repoPath: string, options: AnalyzeOptions): Promise<void> {
  const { localPath } = await resolveRepoPath(repoPath);
  const absolutePath = path.resolve(localPath);

  // Initialize home directory silently
  const home = new HomeManager();
  home.ensureInitialized();

  // Load config with CLI overrides
  const overrides: Record<string, unknown> = {};
  if (options.provider) overrides.provider = options.provider;
  if (options.model) overrides.model = options.model;

  const config = await loadConfig(absolutePath, overrides);
  const format = (options.format ?? config.output.format) as ReportFormat;

  // Create LLM provider
  const model = await createProvider({
    type: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const analyzer = await Analyzer.create(absolutePath, {
    config,
    model,
    noCache: options.noCache,
  });

  const scope: AnalysisScope = {
    branch: options.branch,
    since: options.since,
    until: options.until,
    authors: options.author,
    maxCommits: options.maxCommits,
    path: absolutePath,
  };

  // Interactive time range selection (only when no CLI date filters and not in -y mode)
  if (!options.since && !options.until && !options.yes) {
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const ago = (months: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - months);
      return fmt(d);
    };

    const range = await select({
      message: 'Select time range for analysis:',
      choices: [
        { name: 'Last month', value: 'last-1' },
        { name: 'Last 3 months', value: 'last-3' },
        { name: 'Last 6 months', value: 'last-6' },
        { name: 'Last year', value: 'last-12' },
        { name: 'All time (no filter)', value: 'all' },
        { name: 'Custom range...', value: 'custom' },
      ],
    });

    if (range === 'custom') {
      const customSince = await input({ message: 'Since (YYYY-MM-DD, leave empty for none):' });
      const customUntil = await input({ message: 'Until (YYYY-MM-DD, leave empty for none):' });
      if (customSince) scope.since = customSince;
      if (customUntil) scope.until = customUntil;
    } else if (range !== 'all') {
      const months = parseInt(range.split('-')[1], 10);
      scope.since = ago(months);
    }
  }

  // Cost estimation
  const estimate = await analyzer.estimate(scope);

  console.log(theme.heading('\nAnalysis Summary:'));
  console.log(`   Total commits:     ${estimate.totalCommits}`);
  console.log(`   Cached (skip):     ${estimate.cachedCommits}`);
  console.log(`   To analyze:        ${estimate.toAnalyze}`);
  console.log(`   Est. LLM calls:    ~${estimate.estimatedLlmCalls}`);
  console.log(`   Est. tokens:       ~${(estimate.estimatedTokens / 1000).toFixed(0)}K`);
  console.log(`   Est. cost:         ~$${estimate.estimatedCost.toFixed(2)}`);
  console.log('');

  if (estimate.toAnalyze === 0) {
    console.log(theme.success('All commits are cached. Generating report from cache.\n'));
  } else if (!options.yes) {
    const proceed = await confirm({ message: 'Proceed with analysis?', default: true });
    if (!proceed) {
      console.log(theme.dim('Analysis cancelled.'));
      return;
    }
  }

  // Run analysis with progress tracking
  const startTime = Date.now();
  let currentSpinner = phaseSpinner(1, 3, 'Extracting commits');
  currentSpinner.start();
  const state: { progressBar: cliProgress.SingleBar | null } = { progressBar: null };

  const onProgress = (progress: AnalysisProgress) => {
    if (progress.phase === 'extracting') {
      currentSpinner.text = theme.dim(
        `[Phase 1/3] ${progress.message}`,
      );
    } else if (progress.phase === 'scoring') {
      if (currentSpinner.isSpinning) {
        currentSpinner.succeed(theme.dim('Commits extracted'));
      }
      if (!state.progressBar && progress.total > 0) {
        console.log(theme.dim(`\n  Scoring commits [Phase 2/3]:`));
        state.progressBar = createProgressBar(progress.total);
      }
      if (state.progressBar) {
        state.progressBar.update(progress.current, { message: progress.message });
      }
    } else if (progress.phase === 'aggregating') {
      if (state.progressBar) {
        state.progressBar.stop();
        state.progressBar = null;
      }
      if (currentSpinner.isSpinning) {
        currentSpinner.succeed(theme.dim('Scoring complete'));
      }
      currentSpinner = phaseSpinner(3, 3, 'Aggregating results');
      currentSpinner.start();
    }
  };

  const report = await analyzer.analyze(scope, onProgress);

  if (state.progressBar) state.progressBar.stop();
  if (currentSpinner.isSpinning) {
    currentSpinner.succeed(theme.dim('Report generated'));
  }

  // Record analysis history and update agent memory
  const durationMs = Date.now() - startTime;
  try {
    home.recordAnalysis(report, scope, durationMs, estimate);
    home.updateMemory(report);
  } catch {
    // Non-critical — don't fail the command if home recording fails
  }

  // Output
  if (format === 'terminal') {
    console.log(theme.heading('\nResults:\n'));
    renderSummaryTable(report);
    console.log('');
    renderScoreTable(report);

    // Show author details
    for (const author of report.authors) {
      console.log(`\n${theme.bold(author.score.authorName)}`);
      console.log(`  Score: ${theme.score(author.score.overallScore)}/100 | Trend: ${theme.trend(author.score.trend.direction)}`);
      if (author.highlights.length > 0) {
        console.log(`  Highlights: ${author.highlights.join(', ')}`);
      }
      if (author.recommendations.length > 0) {
        console.log(`  Recommendations: ${author.recommendations.join(', ')}`);
      }
    }
  } else {
    const output = generateReport(report, format);

    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, output, 'utf-8');
      console.log(theme.success(`\nReport saved to ${outputPath}`));
    } else {
      console.log(output);
    }
  }

  console.log('');
}

export async function analyzeCommand(repoPath: string, options: AnalyzeOptions): Promise<void> {
  try {
    await analyzeCommandInner(repoPath, options);
  } catch (error) {
    handleError(error);
  }
}
