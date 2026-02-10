import { Command } from 'commander';
import { printLogo } from './ui/logo.js';
import { getVersion } from './utils/version.js';
import { analyzeCommand } from './commands/analyze.js';
import { reportCommand } from './commands/report.js';
import { configCommand } from './commands/config.js';
import { compareCommand } from './commands/compare.js';
import { handleError } from './utils/error-handler.js';
import { startRepl } from './repl/repl.js';

const args = process.argv.slice(2);

if (args.length === 0) {
  // No arguments → interactive REPL mode
  startRepl().catch(handleError);
} else {
  // Has arguments → one-shot Commander.js mode
  const program = new Command();

  program
    .name('gitpulse')
    .description('AI-powered Git contribution analyzer')
    .version(getVersion())
    .hook('preAction', () => {
      printLogo();
    });

  program
    .command('analyze')
    .description('Analyze repository contributions')
    .argument('[path]', 'Path or URL to git repository', '.')
    .option('-b, --branch <branch>', 'Branch to analyze')
    .option('--since <date>', 'Start date (e.g., 2025-01-01)')
    .option('--until <date>', 'End date')
    .option('--author <names...>', 'Filter by author name(s)')
    .option('--max-commits <n>', 'Maximum number of commits', parseInt)
    .option('--format <type>', 'Output format: terminal, json, markdown, html')
    .option('-o, --output <path>', 'Output file path')
    .option('--no-cache', 'Ignore cache, force re-scoring')
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('--provider <type>', 'LLM provider override')
    .option('--model <name>', 'LLM model override')
    .action(async (repoPath: string, options) => {
      await analyzeCommand(repoPath, options);
    });

  program
    .command('report')
    .description('Generate report from cached scores')
    .argument('[path]', 'Path or URL to git repository', '.')
    .option('--format <type>', 'Output format: terminal, json, markdown, html')
    .option('-o, --output <path>', 'Output file path')
    .action(async (repoPath: string, options) => {
      await reportCommand(repoPath, options);
    });

  program
    .command('config')
    .description('Manage configuration')
    .option('--init', 'Run interactive setup wizard')
    .option('--show', 'Show current configuration')
    .option('--set <key>', 'Set a config value')
    .argument('[value]', 'Value to set')
    .action(async (value: string | undefined, options) => {
      await configCommand(options, value);
    });

  program
    .command('compare')
    .description('Compare two developers')
    .argument('<author1>', 'First author name or email')
    .argument('<author2>', 'Second author name or email')
    .option('-p, --path <path>', 'Path or URL to git repository', '.')
    .option('--since <date>', 'Start date')
    .option('--until <date>', 'End date')
    .action(async (author1: string, author2: string, options) => {
      await compareCommand(author1, author2, options);
    });

  program.parseAsync(process.argv).catch(handleError);
}
