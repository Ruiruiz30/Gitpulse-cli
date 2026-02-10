import type { CommitDiff } from '../types/git.js';
import type { CommitClassification } from '../types/scoring.js';
import type { AnalysisConfig } from '../types/config.js';

export interface BatchGroup {
  type: 'single' | 'batch' | 'split';
  diffs: CommitDiff[];
  classification: CommitClassification;
}

export function classifyCommit(diff: CommitDiff, config: AnalysisConfig): CommitClassification {
  if (diff.commit.isMergeCommit && config.skipMergeCommits) {
    return 'skipped';
  }

  if (isMechanicalCommit(diff)) {
    return 'mechanical';
  }

  const effectiveChanges = diff.stats.effectiveChanges;

  if (effectiveChanges < config.smallCommitThreshold) {
    return 'small';
  }

  if (effectiveChanges > config.largeCommitThreshold) {
    return 'large';
  }

  return 'normal';
}

export function createBatchGroups(diffs: CommitDiff[], config: AnalysisConfig): BatchGroup[] {
  const groups: BatchGroup[] = [];
  let smallBatch: CommitDiff[] = [];

  for (const diff of diffs) {
    const classification = classifyCommit(diff, config);

    switch (classification) {
      case 'skipped':
      case 'mechanical':
        groups.push({ type: 'single', diffs: [diff], classification });
        break;

      case 'small':
        smallBatch.push(diff);
        // Batch up to 5 small commits together
        if (smallBatch.length >= 5) {
          groups.push({ type: 'batch', diffs: [...smallBatch], classification: 'small' });
          smallBatch = [];
        }
        break;

      case 'large':
        groups.push({ type: 'split', diffs: [diff], classification: 'large' });
        break;

      case 'normal':
        groups.push({ type: 'single', diffs: [diff], classification: 'normal' });
        break;
    }
  }

  // Flush remaining small commits
  if (smallBatch.length > 0) {
    if (smallBatch.length === 1) {
      groups.push({ type: 'single', diffs: smallBatch, classification: 'normal' });
    } else {
      groups.push({ type: 'batch', diffs: smallBatch, classification: 'small' });
    }
  }

  return groups;
}

function isMechanicalCommit(diff: CommitDiff): boolean {
  // All files are lock files or auto-generated
  if (diff.files.length === 0) return true;

  const message = diff.commit.message.toLowerCase();

  // Common mechanical commit patterns
  const mechanicalPatterns = [
    /^merge (branch|pull request|remote)/i,
    /^revert "/i,
    /^bump version/i,
    /^auto-?generated/i,
    /^\[skip ci\]/i,
    /^chore\(deps\)/i,
    /^chore\(release\)/i,
  ];

  if (mechanicalPatterns.some((p) => p.test(message))) {
    return true;
  }

  return false;
}

export function estimateLlmCalls(groups: BatchGroup[]): number {
  let calls = 0;
  for (const group of groups) {
    if (group.classification === 'skipped' || group.classification === 'mechanical') {
      continue;
    }
    if (group.type === 'batch') {
      calls += 1;
    } else if (group.type === 'split') {
      // Estimate: split large commits into ~3 calls on average
      calls += Math.ceil(group.diffs[0]!.files.length / 5);
    } else {
      calls += 1;
    }
  }
  return calls;
}
