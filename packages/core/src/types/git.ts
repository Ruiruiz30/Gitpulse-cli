export interface CommitInfo {
  hash: string;
  abbreviatedHash: string;
  author: AuthorInfo;
  date: Date;
  message: string;
  subject: string;
  body: string;
  refs: string;
  parentHashes: string[];
  isMergeCommit: boolean;
}

export interface AuthorInfo {
  name: string;
  email: string;
}

export interface CommitDiff {
  commit: CommitInfo;
  files: FileDiff[];
  stats: DiffStats;
}

export interface FileDiff {
  path: string;
  oldPath?: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  content: string;
  isBinary: boolean;
}

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';

export interface DiffStats {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  effectiveChanges: number;
}

export interface AuthorContribution {
  author: AuthorInfo;
  commits: CommitInfo[];
  totalAdditions: number;
  totalDeletions: number;
  filesChanged: number;
  activeDays: number;
  firstCommitDate: Date;
  lastCommitDate: Date;
}

export interface AnalysisScope {
  branch?: string;
  since?: string;
  until?: string;
  authors?: string[];
  maxCommits?: number;
  path?: string;
}
