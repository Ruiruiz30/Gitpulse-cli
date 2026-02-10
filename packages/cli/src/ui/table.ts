import Table from 'cli-table3';
import type { AnalysisReport } from '@gitpulse/core';
import { theme } from './theme.js';

export function renderScoreTable(report: AnalysisReport): void {
  const table = new Table({
    head: [
      theme.bold('Author'),
      theme.bold('Overall'),
      theme.bold('Code Quality'),
      theme.bold('Complexity'),
      theme.bold('Discipline'),
      theme.bold('Collab'),
      theme.bold('Trend'),
      theme.bold('Commits'),
    ],
    style: {
      head: [],
      border: ['dim'],
    },
  });

  for (const author of report.authors) {
    const s = author.score;
    table.push([
      s.authorName,
      theme.score(s.overallScore),
      theme.score(s.dimensionScores.codeQuality.score),
      theme.score(s.dimensionScores.complexityImpact.score),
      theme.score(s.dimensionScores.commitDiscipline.score),
      theme.score(s.dimensionScores.collaboration.score),
      theme.trend(s.trend.direction),
      String(s.scoredCommitCount),
    ]);
  }

  console.log(table.toString());
}

export function renderSummaryTable(report: AnalysisReport): void {
  const table = new Table({
    style: { head: [], border: ['dim'] },
  });

  table.push(
    { [theme.bold('Total Commits')]: String(report.metadata.totalCommits) },
    { [theme.bold('Analyzed')]: String(report.metadata.analyzedCommits) },
    { [theme.bold('Cached')]: String(report.metadata.cachedCommits) },
    { [theme.bold('Skipped')]: String(report.metadata.skippedCommits) },
    { [theme.bold('Authors')]: String(report.summary.totalAuthors) },
    { [theme.bold('Average Score')]: theme.score(report.summary.averageScore) },
    { [theme.bold('Top Performer')]: report.summary.topPerformer },
  );

  console.log(table.toString());
}
