import type { CommitInfo, AuthorContribution, AuthorInfo } from '../types/git.js';

export function aggregateByAuthor(commits: CommitInfo[]): Map<string, AuthorContribution> {
  const authorMap = new Map<string, AuthorContribution>();

  for (const commit of commits) {
    const key = commit.author.email;
    const existing = authorMap.get(key);

    if (existing) {
      existing.commits.push(commit);
      if (commit.date < existing.firstCommitDate) {
        existing.firstCommitDate = commit.date;
      }
      if (commit.date > existing.lastCommitDate) {
        existing.lastCommitDate = commit.date;
      }
    } else {
      authorMap.set(key, {
        author: { ...commit.author },
        commits: [commit],
        totalAdditions: 0,
        totalDeletions: 0,
        filesChanged: 0,
        activeDays: 0,
        firstCommitDate: commit.date,
        lastCommitDate: commit.date,
      });
    }
  }

  // Calculate active days
  for (const contribution of authorMap.values()) {
    const days = new Set<string>();
    for (const commit of contribution.commits) {
      days.add(commit.date.toISOString().split('T')[0]!);
    }
    contribution.activeDays = days.size;
  }

  return authorMap;
}

export function getAuthorList(commits: CommitInfo[]): AuthorInfo[] {
  const seen = new Set<string>();
  const authors: AuthorInfo[] = [];

  for (const commit of commits) {
    if (!seen.has(commit.author.email)) {
      seen.add(commit.author.email);
      authors.push(commit.author);
    }
  }

  return authors;
}
