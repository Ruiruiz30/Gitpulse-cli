import type { AnalysisReport, AuthorReport } from '../../types/report.js';
import { roundScore } from '../../scoring/normalizer.js';

export function formatMarkdown(report: AnalysisReport): string {
  const lines: string[] = [];

  lines.push('# GitPulse Analysis Report');
  lines.push('');
  lines.push(`**Generated:** ${report.metadata.generatedAt.toISOString()}`);
  lines.push(`**Repository:** ${report.metadata.repositoryPath}`);
  lines.push(`**Model:** ${report.metadata.llmProvider}/${report.metadata.llmModel}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Authors | ${report.summary.totalAuthors} |`);
  lines.push(`| Average Score | ${roundScore(report.summary.averageScore)} |`);
  lines.push(`| Median Score | ${roundScore(report.summary.medianScore)} |`);
  lines.push(`| Top Performer | ${report.summary.topPerformer} |`);
  lines.push(`| Total Commits | ${report.metadata.totalCommits} |`);
  lines.push(`| Analyzed | ${report.metadata.analyzedCommits} |`);
  lines.push(`| Cached | ${report.metadata.cachedCommits} |`);
  lines.push(`| Skipped | ${report.metadata.skippedCommits} |`);
  lines.push('');

  // Dimension weights
  const w = report.metadata.dimensionWeights;
  lines.push('## Dimension Weights');
  lines.push('');
  lines.push(`| Dimension | Weight |`);
  lines.push(`|-----------|--------|`);
  lines.push(`| Code Quality | ${w.codeQuality} |`);
  lines.push(`| Complexity & Impact | ${w.complexityImpact} |`);
  lines.push(`| Commit Discipline | ${w.commitDiscipline} |`);
  lines.push(`| Collaboration | ${w.collaboration} |`);
  lines.push('');

  // Author details
  lines.push('## Author Scores');
  lines.push('');
  lines.push('| Author | Overall | Code Quality | Complexity | Discipline | Collaboration | Trend | Commits |');
  lines.push('|--------|---------|-------------|------------|------------|---------------|-------|---------|');

  for (const author of report.authors) {
    const s = author.score;
    const trendIcon = s.trend.direction === 'improving' ? '↑' : s.trend.direction === 'declining' ? '↓' : '→';
    lines.push(
      `| ${s.authorName} | ${roundScore(s.overallScore)} | ${roundScore(s.dimensionScores.codeQuality.score)} | ${roundScore(s.dimensionScores.complexityImpact.score)} | ${roundScore(s.dimensionScores.commitDiscipline.score)} | ${roundScore(s.dimensionScores.collaboration.score)} | ${trendIcon} | ${s.scoredCommitCount} |`,
    );
  }

  lines.push('');

  // Per-author details
  for (const author of report.authors) {
    lines.push(formatAuthorDetail(author));
  }

  return lines.join('\n');
}

function formatAuthorDetail(author: AuthorReport): string {
  const lines: string[] = [];
  const s = author.score;

  lines.push(`### ${s.authorName}`);
  lines.push('');
  lines.push(`**Overall Score:** ${roundScore(s.overallScore)}/100`);
  lines.push(`**Trend:** ${s.trend.direction} ${s.trend.sparkline.map((v) => roundScore(v)).join(' → ')}`);
  lines.push('');

  if (author.highlights.length > 0) {
    lines.push('**Highlights:**');
    for (const h of author.highlights) {
      lines.push(`- ${h}`);
    }
    lines.push('');
  }

  if (author.recommendations.length > 0) {
    lines.push('**Recommendations:**');
    for (const r of author.recommendations) {
      lines.push(`- ${r}`);
    }
    lines.push('');
  }

  if (s.flags.length > 0) {
    lines.push('**Flags:**');
    for (const f of s.flags) {
      lines.push(`- [${f.type}] ${f.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
