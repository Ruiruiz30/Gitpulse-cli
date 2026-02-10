import cliProgress from 'cli-progress';
import { theme } from './theme.js';

export function createProgressBar(total: number): cliProgress.SingleBar {
  const bar = new cliProgress.SingleBar({
    format: `  ${theme.primary('{bar}')} {value}/{total} ({percentage}%) | {message}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });

  bar.start(total, 0, { message: '' });
  return bar;
}
