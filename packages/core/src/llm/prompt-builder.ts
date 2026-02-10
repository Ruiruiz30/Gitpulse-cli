import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import type { CommitDiff } from '../types/git.js';
import { findPackageRoot } from '../utils/paths.js';

const RUBRIC_FILES = [
  'code-quality.md',
  'complexity-impact.md',
  'commit-discipline.md',
  'collaboration.md',
] as const;

export type RubricName = (typeof RUBRIC_FILES)[number];

export interface BuiltPrompt {
  system: string;
  user: string;
}

export function loadRubric(rubricFile: RubricName, repoPath?: string): string {
  const searchPaths = buildSearchPaths(rubricFile, repoPath);

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      return fs.readFileSync(searchPath, 'utf-8');
    }
  }

  throw new Error(`Rubric file not found: ${rubricFile}`);
}

export function loadAllRubrics(repoPath?: string): Map<RubricName, string> {
  const rubrics = new Map<RubricName, string>();
  for (const file of RUBRIC_FILES) {
    rubrics.set(file, loadRubric(file, repoPath));
  }
  return rubrics;
}

export function buildCommitPrompt(
  diff: CommitDiff,
  rubrics: Map<RubricName, string>,
  maxTokens: number = 8000,
): BuiltPrompt {
  const system = buildSystemPrompt(rubrics);
  const user = buildUserPrompt(diff, maxTokens);

  return { system, user };
}

export function buildBatchPrompt(
  diffs: CommitDiff[],
  rubrics: Map<RubricName, string>,
  maxTokens: number = 8000,
): BuiltPrompt {
  const system = buildSystemPrompt(rubrics);
  const user = buildBatchUserPrompt(diffs, maxTokens);

  return { system, user };
}

function buildSystemPrompt(rubrics: Map<RubricName, string>): string {
  const rubricContent = Array.from(rubrics.entries())
    .map(([name, content]) => `---\n## Rubric: ${name}\n\n${content}`)
    .join('\n\n');

  return `You are a senior software engineering evaluator. Your task is to analyze git commit diffs and provide structured scoring based on the rubrics provided below.

You must evaluate each commit objectively based on the actual code changes shown in the diff. Focus on what the code does, not assumptions about the developer.

Score each dimension from 0 to 100, where:
- 90-100: Exceptional
- 70-89: Good
- 50-69: Acceptable
- 30-49: Below average
- 0-29: Poor

${rubricContent}

---

Important guidelines:
- Only evaluate what you can see in the diff
- Be fair and consistent across all commits
- Consider the context and purpose of the change
- Small but well-crafted changes can score highly
- Large but sloppy changes should score lower`;
}

function buildUserPrompt(diff: CommitDiff, maxTokens: number): string {
  const truncatedDiff = truncateDiffContent(diff, maxTokens);

  return `## Commit to Evaluate

**Hash:** ${diff.commit.abbreviatedHash}
**Author:** ${diff.commit.author.name}
**Date:** ${diff.commit.date.toISOString()}
**Message:** ${diff.commit.message}

**Stats:** ${diff.stats.totalFiles} files changed, +${diff.stats.totalAdditions} -${diff.stats.totalDeletions}

### Diff Content

${truncatedDiff}

Please evaluate this commit according to all four rubric dimensions.`;
}

function buildBatchUserPrompt(diffs: CommitDiff[], maxTokens: number): string {
  const perCommitTokenBudget = Math.floor(maxTokens / diffs.length);

  const commitsText = diffs
    .map((diff, i) => {
      const truncatedDiff = truncateDiffContent(diff, perCommitTokenBudget);
      return `### Commit ${i + 1}: ${diff.commit.abbreviatedHash}
**Author:** ${diff.commit.author.name}
**Date:** ${diff.commit.date.toISOString()}
**Message:** ${diff.commit.message}
**Stats:** ${diff.stats.totalFiles} files changed, +${diff.stats.totalAdditions} -${diff.stats.totalDeletions}

\`\`\`diff
${truncatedDiff}
\`\`\``;
    })
    .join('\n\n---\n\n');

  return `## Batch of ${diffs.length} Commits to Evaluate

${commitsText}

Please evaluate each commit individually according to all four rubric dimensions. Return scores for each commit identified by its hash.`;
}

function truncateDiffContent(diff: CommitDiff, maxChars: number): string {
  const approxCharsPerToken = 4;
  const maxContentChars = maxChars * approxCharsPerToken;

  const fullContent = diff.files.map((f) => `--- ${f.path} (${f.status})\n${f.content}`).join('\n\n');

  if (fullContent.length <= maxContentChars) {
    return fullContent;
  }

  return fullContent.substring(0, maxContentChars) + '\n\n[... diff truncated due to size ...]';
}

function buildSearchPaths(rubricFile: string, repoPath?: string): string[] {
  const paths: string[] = [];

  // 1. Project-level
  if (repoPath) {
    paths.push(path.join(repoPath, '.gitpulse', 'rubrics', rubricFile));
  }

  // 2. Global user-level
  paths.push(path.join(os.homedir(), '.gitpulse', 'rubrics', rubricFile));

  // 3. Built-in defaults (relative to this package)
  const __filename = fileURLToPath(import.meta.url);
  const packageRoot = findPackageRoot(path.dirname(__filename));
  if (packageRoot) {
    paths.push(path.join(packageRoot, '..', '..', 'rubrics', rubricFile));
  }

  // 4. Also check CWD-relative rubrics directory
  paths.push(path.join(process.cwd(), 'rubrics', rubricFile));

  return paths;
}
