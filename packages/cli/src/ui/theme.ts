import chalk from 'chalk';

export const theme = {
  primary: chalk.hex('#6366f1'),
  secondary: chalk.hex('#8b5cf6'),
  success: chalk.hex('#22c55e'),
  warning: chalk.hex('#f59e0b'),
  error: chalk.hex('#ef4444'),
  info: chalk.hex('#3b82f6'),
  dim: chalk.dim,
  bold: chalk.bold,
  heading: chalk.bold.hex('#6366f1'),
  prompt: chalk.hex('#6366f1').bold,

  score: (score: number): string => {
    if (score >= 80) return chalk.hex('#22c55e')(score.toFixed(1));
    if (score >= 60) return chalk.hex('#3b82f6')(score.toFixed(1));
    if (score >= 40) return chalk.hex('#f59e0b')(score.toFixed(1));
    return chalk.hex('#ef4444')(score.toFixed(1));
  },

  trend: (direction: 'improving' | 'stable' | 'declining'): string => {
    switch (direction) {
      case 'improving':
        return chalk.hex('#22c55e')('▲ improving');
      case 'declining':
        return chalk.hex('#ef4444')('▼ declining');
      case 'stable':
        return chalk.hex('#94a3b8')('► stable');
    }
  },
};
