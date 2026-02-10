import * as path from 'node:path';
import {
  Analyzer,
  createProvider,
  loadConfig,
  type AnalysisScope,
} from '@gitpulse/core';
import { theme } from '../ui/theme.js';
import { handleError } from '../utils/error-handler.js';
import { resolveRepoPath } from '../utils/remote-repo.js';

export async function compareCommandInner(author1: string, author2: string, options: { path?: string; since?: string; until?: string }): Promise<void> {
  const { localPath } = await resolveRepoPath(options.path ?? '.');
  const repoPath = path.resolve(localPath);
  const config = await loadConfig(repoPath);

  const model = await createProvider({
    type: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const analyzer = await Analyzer.create(repoPath, { config, model });

  const scope: AnalysisScope = {
    since: options.since,
    until: options.until,
    path: repoPath,
  };

  console.log(theme.heading(`\nComparing: ${author1} vs ${author2}\n`));
  console.log(theme.dim('Running analysis...\n'));

  const report = await analyzer.analyze(scope);

  const a1 = report.authors.find(
    (a) => a.score.authorName.toLowerCase().includes(author1.toLowerCase()) ||
      a.score.authorEmail.toLowerCase().includes(author1.toLowerCase()),
  );
  const a2 = report.authors.find(
    (a) => a.score.authorName.toLowerCase().includes(author2.toLowerCase()) ||
      a.score.authorEmail.toLowerCase().includes(author2.toLowerCase()),
  );

  if (!a1) {
    console.log(theme.error(`Author not found: ${author1}`));
    return;
  }
  if (!a2) {
    console.log(theme.error(`Author not found: ${author2}`));
    return;
  }

  const dims = [
    { label: 'Overall', get: (a: typeof a1) => a.score.overallScore },
    { label: 'Code Quality', get: (a: typeof a1) => a.score.dimensionScores.codeQuality.score },
    { label: 'Complexity', get: (a: typeof a1) => a.score.dimensionScores.complexityImpact.score },
    { label: 'Discipline', get: (a: typeof a1) => a.score.dimensionScores.commitDiscipline.score },
    { label: 'Collaboration', get: (a: typeof a1) => a.score.dimensionScores.collaboration.score },
  ];

  const nameWidth = Math.max(a1.score.authorName.length, a2.score.authorName.length, 15);

  console.log(
    `${'Dimension'.padEnd(20)} ${a1.score.authorName.padEnd(nameWidth)} ${a2.score.authorName.padEnd(nameWidth)} ${'Winner'}`,
  );
  console.log('-'.repeat(20 + nameWidth * 2 + 15));

  for (const dim of dims) {
    const v1 = dim.get(a1);
    const v2 = dim.get(a2);
    const winner = v1 > v2 ? a1.score.authorName : v2 > v1 ? a2.score.authorName : 'Tie';

    console.log(
      `${dim.label.padEnd(20)} ${theme.score(v1).padEnd(nameWidth + 10)} ${theme.score(v2).padEnd(nameWidth + 10)} ${winner}`,
    );
  }

  console.log(`\n${'Commits'.padEnd(20)} ${String(a1.score.scoredCommitCount).padEnd(nameWidth)} ${String(a2.score.scoredCommitCount).padEnd(nameWidth)}`);
  console.log(`${'Trend'.padEnd(20)} ${theme.trend(a1.score.trend.direction).padEnd(nameWidth + 10)} ${theme.trend(a2.score.trend.direction)}`);
  console.log('');
}

export async function compareCommand(author1: string, author2: string, options: { path?: string; since?: string; until?: string }): Promise<void> {
  try {
    await compareCommandInner(author1, author2, options);
  } catch (error) {
    handleError(error);
  }
}
