import type { AnalyzeOptions } from '../commands/analyze.js';
import type { ReportOptions } from '../commands/report.js';
import type { ConfigOptions } from '../commands/config.js';
import type { HistoryOptions } from '../commands/history.js';

/**
 * Split a raw input string into an argv-like array, respecting quoted strings.
 */
export function parseArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (ch === ' ' && !inSingle && !inDouble) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }

  if (current.length > 0) {
    args.push(current);
  }

  return args;
}

function consumeFlag(args: string[], flag: string, alias?: string): boolean {
  const idx = args.findIndex((a) => a === flag || (alias && a === alias));
  if (idx === -1) return false;
  args.splice(idx, 1);
  return true;
}

function consumeOption(args: string[], flag: string, alias?: string): string | undefined {
  const idx = args.findIndex((a) => a === flag || (alias && a === alias));
  if (idx === -1) return undefined;
  const value = args[idx + 1];
  args.splice(idx, value !== undefined ? 2 : 1);
  return value;
}

function consumeMultiOption(args: string[], flag: string, alias?: string): string[] | undefined {
  const values: string[] = [];
  let found = false;
  while (true) {
    const idx = args.findIndex((a) => a === flag || (alias && a === alias));
    if (idx === -1) break;
    found = true;
    const value = args[idx + 1];
    if (value !== undefined && !value.startsWith('-')) {
      args.splice(idx, 2);
      values.push(value);
    } else {
      args.splice(idx, 1);
    }
  }
  return found ? values : undefined;
}

export function parseAnalyzeArgs(args: string[]): { repoPath: string; options: AnalyzeOptions } {
  // Work on a copy so we don't mutate the original
  const rest = [...args];

  const options: AnalyzeOptions = {};

  options.branch = consumeOption(rest, '--branch', '-b');
  options.since = consumeOption(rest, '--since');
  options.until = consumeOption(rest, '--until');
  options.author = consumeMultiOption(rest, '--author');
  const maxCommits = consumeOption(rest, '--max-commits');
  if (maxCommits) options.maxCommits = parseInt(maxCommits, 10);
  options.format = consumeOption(rest, '--format');
  options.output = consumeOption(rest, '--output', '-o');
  if (consumeFlag(rest, '--no-cache')) options.noCache = true;
  if (consumeFlag(rest, '-y') || consumeFlag(rest, '--yes')) options.yes = true;
  options.provider = consumeOption(rest, '--provider');
  options.model = consumeOption(rest, '--model');

  // Remaining positional is repoPath
  const repoPath = rest.find((a) => !a.startsWith('-')) ?? '.';

  return { repoPath, options };
}

export function parseReportArgs(args: string[]): { repoPath: string; options: ReportOptions } {
  const rest = [...args];

  const options: ReportOptions = {};
  options.format = consumeOption(rest, '--format');
  options.output = consumeOption(rest, '--output', '-o');

  const repoPath = rest.find((a) => !a.startsWith('-')) ?? '.';
  return { repoPath, options };
}

export function parseConfigArgs(args: string[]): { options: ConfigOptions; value?: string } {
  const rest = [...args];

  const options: ConfigOptions = {};
  if (consumeFlag(rest, '--init')) options.init = true;
  if (consumeFlag(rest, '--show')) options.show = true;
  options.set = consumeOption(rest, '--set');

  const value = rest.find((a) => !a.startsWith('-'));
  return { options, value };
}

export function parseCompareArgs(args: string[]): { author1: string; author2: string; options: { path?: string; since?: string; until?: string } } | null {
  const rest = [...args];

  const options: { path?: string; since?: string; until?: string } = {};
  options.path = consumeOption(rest, '--path', '-p');
  options.since = consumeOption(rest, '--since');
  options.until = consumeOption(rest, '--until');

  // Remaining positional args should be author1 and author2
  const positional = rest.filter((a) => !a.startsWith('-'));

  if (positional.length < 2) {
    return null;
  }

  return { author1: positional[0], author2: positional[1], options };
}

export function parseHistoryArgs(args: string[]): { options: HistoryOptions } {
  const rest = [...args];

  const options: HistoryOptions = {};
  options.repo = consumeOption(rest, '--repo');
  const limit = consumeOption(rest, '--limit', '-n');
  if (limit) options.limit = parseInt(limit, 10);

  return { options };
}
