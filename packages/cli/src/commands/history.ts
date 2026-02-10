import Table from 'cli-table3';
import { HomeManager } from '@gitpulse/core';
import { theme } from '../ui/theme.js';

export interface HistoryOptions {
  repo?: string;
  limit?: number;
}

export async function historyCommandInner(options?: HistoryOptions): Promise<void> {
  const home = new HomeManager();
  const entries = home.getHistory(options?.repo);

  if (entries.length === 0) {
    console.log(theme.dim('\n  No analysis history found. Run `analyze` to get started.\n'));
    return;
  }

  const limit = options?.limit ?? 20;
  const shown = entries.slice(0, limit);

  const table = new Table({
    head: [
      theme.bold('Date'),
      theme.bold('Repository'),
      theme.bold('Commits'),
      theme.bold('Avg Score'),
      theme.bold('Provider'),
      theme.bold('Cost'),
    ],
    style: {
      head: [],
      border: ['dim'],
    },
  });

  for (const entry of shown) {
    const date = new Date(entry.timestamp);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    table.push([
      dateStr,
      entry.repoName,
      String(entry.summary.analyzedCommits),
      theme.score(entry.summary.averageScore),
      `${entry.cost.llmProvider}/${entry.cost.llmModel}`,
      `$${entry.cost.estimatedCost.toFixed(2)}`,
    ]);
  }

  console.log(theme.heading('\n  Analysis History\n'));
  console.log(table.toString());

  if (entries.length > limit) {
    console.log(theme.dim(`\n  Showing ${limit} of ${entries.length} entries.`));
  }
  console.log('');
}
