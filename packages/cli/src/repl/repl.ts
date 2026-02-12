import * as readline from 'node:readline';
import { select, confirm, input as inputPrompt } from '@inquirer/prompts';
import { HomeManager } from '@gitpulse/core';
import { printLogo } from '../ui/logo.js';
import { theme } from '../ui/theme.js';
import { isOnboardingNeeded, runOnboarding } from '../wizard/onboarding.js';
import { analyzeCommandInner } from '../commands/analyze.js';
import { reportCommandInner } from '../commands/report.js';
import { configCommandInner } from '../commands/config.js';
import { compareCommandInner } from '../commands/compare.js';
import { historyCommandInner } from '../commands/history.js';
import { handleReplError } from '../utils/error-handler.js';
import {
  parseArgs,
  parseAnalyzeArgs,
  parseReportArgs,
  parseConfigArgs,
  parseCompareArgs,
  parseHistoryArgs,
} from './arg-parser.js';

export async function startRepl(): Promise<void> {
  printLogo();

  if (isOnboardingNeeded()) {
    await runOnboarding();
  } else {
    await showWelcomeBack();
  }

  await replLoop();
}

async function showWelcomeBack(): Promise<void> {
  const home = new HomeManager();
  const memory = home.getMemory();

  if (memory.lastRun) {
    const date = new Date(memory.lastRun.timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    console.log(theme.heading('  Welcome back!\n'));
    console.log(`  Last analysis: ${theme.bold(memory.lastRun.repoName)} on ${dateStr}`);
    console.log(`  Commits: ${memory.lastRun.totalCommits} | Avg Score: ${theme.score(memory.lastRun.averageScore)}`);

    if (memory.preferences.preferredProvider) {
      console.log(`  Provider: ${memory.preferences.preferredProvider}/${memory.preferences.preferredModel ?? 'default'}`);
    }

    console.log(`  Total analyses: ${memory.totalAnalysisCount}\n`);

    const continueSettings = await confirm({
      message: 'Continue with current settings?',
      default: true,
    });

    if (!continueSettings) {
      await runOnboarding();
    }
  } else {
    console.log(theme.heading('  Welcome back!\n'));
    console.log(theme.dim('  No previous analysis found. Run `analyze <path>` to get started.\n'));
  }
}

/**
 * Read one line from stdin using a fresh readline interface.
 * The interface is closed immediately after, so it never conflicts with inquirer.
 * Returns null on Ctrl+C / stream close (signals exit).
 */
function promptLine(): Promise<string | null> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    rl.on('SIGINT', () => {
      rl.close();
      resolve(null);
    });

    rl.on('close', () => {
      // If resolved already this is a no-op (promises settle once)
      resolve(null);
    });

    rl.question(theme.prompt('gitpulse> '), (answer) => {
      resolve(answer);
      rl.close();
    });
  });
}

async function replLoop(): Promise<void> {
  console.log(theme.dim('  Type a command, press Enter for quick menu, or type `help` for usage.\n'));

  while (true) {
    const line = await promptLine();

    if (line === null) {
      // Ctrl+C or stdin closed
      console.log(theme.dim('\n  Goodbye!'));
      return;
    }

    const trimmed = line.trim();

    if (trimmed === '') {
      // readline is already closed — safe to use inquirer
      try {
        const shouldExit = await showQuickMenu();
        if (shouldExit) return;
      } catch (error) {
        // Only silently swallow prompt-cancellation errors (Ctrl+C during inquirer)
        if (error instanceof Error && error.name === 'AbortPromptError') {
          // User cancelled — just re-prompt
        } else {
          handleReplError(error);
        }
      }
      continue;
    }

    if (trimmed === 'exit' || trimmed === 'quit') {
      console.log(theme.dim('\n  Goodbye!'));
      return;
    }

    if (trimmed === 'help') {
      printHelp();
      continue;
    }

    // readline is already closed — safe to dispatch (which may use inquirer)
    try {
      await dispatchCommand(trimmed);
    } catch (error) {
      handleReplError(error);
    }
  }
}

async function dispatchCommand(input: string): Promise<void> {
  const argv = parseArgs(input);
  if (argv.length === 0) return;

  const command = argv[0].toLowerCase();
  const args = argv.slice(1);

  switch (command) {
    case 'analyze': {
      const { repoPath, options } = parseAnalyzeArgs(args);
      await analyzeCommandInner(repoPath, options);
      break;
    }
    case 'report': {
      const { repoPath, options } = parseReportArgs(args);
      await reportCommandInner(repoPath, options);
      break;
    }
    case 'config': {
      const { options, value } = parseConfigArgs(args);
      await configCommandInner(options, value);
      break;
    }
    case 'compare': {
      const parsed = parseCompareArgs(args);
      if (!parsed) {
        console.log(theme.error('Usage: compare <author1> <author2> [--path <path>] [--since <date>] [--until <date>]'));
        break;
      }
      await compareCommandInner(parsed.author1, parsed.author2, parsed.options);
      break;
    }
    case 'history': {
      const { options } = parseHistoryArgs(args);
      await historyCommandInner(options);
      break;
    }
    case 'help': {
      printHelp();
      break;
    }
    default: {
      console.log(theme.warning(`Unknown command: ${command}`));
      console.log(theme.dim('Type `help` for available commands.\n'));
    }
  }
}

/**
 * Returns true if the user chose to exit.
 */
async function showQuickMenu(): Promise<boolean> {
  const action = await select({
    message: 'What would you like to do?',
    choices: [
      { value: 'analyze', name: 'Analyze a repository' },
      { value: 'report', name: 'Generate a report from cache' },
      { value: 'compare', name: 'Compare two developers' },
      { value: 'history', name: 'View analysis history' },
      { value: 'config', name: 'Manage configuration' },
      { value: 'help', name: 'Show help' },
      { value: 'exit', name: 'Exit' },
    ],
  });

  switch (action) {
    case 'analyze': {
      const repoPath = await inputPrompt({
        message: 'Repository path or URL:',
        default: '.',
      });
      await analyzeCommandInner(repoPath, {});
      break;
    }
    case 'report': {
      const repoPath = await inputPrompt({
        message: 'Repository path or URL:',
        default: '.',
      });
      await reportCommandInner(repoPath, {});
      break;
    }
    case 'compare': {
      const author1 = await inputPrompt({ message: 'First author name or email:' });
      const author2 = await inputPrompt({ message: 'Second author name or email:' });
      await compareCommandInner(author1, author2, {});
      break;
    }
    case 'history': {
      await historyCommandInner();
      break;
    }
    case 'config': {
      const configAction = await select({
        message: 'Configuration:',
        choices: [
          { value: 'show', name: 'Show current configuration' },
          { value: 'reconfigure', name: 'Reconfigure (change provider, model, API key)' },
        ],
      });
      if (configAction === 'reconfigure') {
        await runOnboarding();
      } else {
        await configCommandInner({ show: true });
      }
      break;
    }
    case 'help': {
      printHelp();
      break;
    }
    case 'exit': {
      console.log(theme.dim('\n  Goodbye!'));
      return true;
    }
  }

  return false;
}

function printHelp(): void {
  console.log(theme.heading('\n  Available Commands:\n'));
  console.log('  analyze [path]          Analyze a repository');
  console.log('    --branch, -b <name>   Branch to analyze');
  console.log('    --since <date>        Start date');
  console.log('    --until <date>        End date');
  console.log('    --author <names...>   Filter by author');
  console.log('    --max-commits <n>     Max commits to analyze');
  console.log('    --format <type>       Output: terminal, json, markdown, html');
  console.log('    -o, --output <path>   Output file path');
  console.log('    --no-cache            Force re-scoring');
  console.log('    -y, --yes             Skip confirmation');
  console.log('    --provider <type>     LLM provider override');
  console.log('    --model <name>        LLM model override');
  console.log('');
  console.log('  report [path]           Generate report from cached scores');
  console.log('    --format <type>       Output format');
  console.log('    -o, --output <path>   Output file path');
  console.log('');
  console.log('  compare <a1> <a2>       Compare two developers');
  console.log('    -p, --path <path>     Repository path');
  console.log('    --since <date>        Start date');
  console.log('    --until <date>        End date');
  console.log('');
  console.log('  history                 View analysis history');
  console.log('    --repo <path>         Filter by repository');
  console.log('    -n, --limit <n>       Limit entries');
  console.log('');
  console.log('  config                  Show current configuration');
  console.log('    --init                Run setup wizard');
  console.log('    --show                Show configuration');
  console.log('');
  console.log('  help                    Show this help');
  console.log('  exit / quit             Exit REPL');
  console.log('');
  console.log(theme.dim('  Press Enter (empty input) for quick menu.'));
  console.log('');
}
