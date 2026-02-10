import { describe, it, expect } from 'vitest';
import { aggregateByAuthor, getAuthorList } from '../src/git/author-stats.js';
import type { CommitInfo } from '../src/types/git.js';

function makeCommit(name: string, email: string, dateStr: string): CommitInfo {
  return {
    hash: `hash-${name}-${dateStr}`,
    abbreviatedHash: `hash-${name}`.substring(0, 7),
    author: { name, email },
    date: new Date(dateStr),
    message: `commit by ${name}`,
    subject: `commit by ${name}`,
    body: '',
    refs: '',
    parentHashes: ['parent'],
    isMergeCommit: false,
  };
}

describe('aggregateByAuthor', () => {
  it('should group commits by author email', () => {
    const commits = [
      makeCommit('Alice', 'alice@test.com', '2025-01-01'),
      makeCommit('Alice', 'alice@test.com', '2025-01-02'),
      makeCommit('Bob', 'bob@test.com', '2025-01-01'),
    ];

    const result = aggregateByAuthor(commits);
    expect(result.size).toBe(2);
    expect(result.get('alice@test.com')!.commits).toHaveLength(2);
    expect(result.get('bob@test.com')!.commits).toHaveLength(1);
  });

  it('should calculate active days', () => {
    const commits = [
      makeCommit('Alice', 'alice@test.com', '2025-01-01'),
      makeCommit('Alice', 'alice@test.com', '2025-01-01'),
      makeCommit('Alice', 'alice@test.com', '2025-01-03'),
    ];

    const result = aggregateByAuthor(commits);
    expect(result.get('alice@test.com')!.activeDays).toBe(2);
  });

  it('should track date range', () => {
    const commits = [
      makeCommit('Alice', 'alice@test.com', '2025-01-05'),
      makeCommit('Alice', 'alice@test.com', '2025-01-01'),
      makeCommit('Alice', 'alice@test.com', '2025-01-10'),
    ];

    const result = aggregateByAuthor(commits);
    const alice = result.get('alice@test.com')!;
    expect(alice.firstCommitDate).toEqual(new Date('2025-01-01'));
    expect(alice.lastCommitDate).toEqual(new Date('2025-01-10'));
  });
});

describe('getAuthorList', () => {
  it('should return unique authors', () => {
    const commits = [
      makeCommit('Alice', 'alice@test.com', '2025-01-01'),
      makeCommit('Alice', 'alice@test.com', '2025-01-02'),
      makeCommit('Bob', 'bob@test.com', '2025-01-01'),
    ];

    const authors = getAuthorList(commits);
    expect(authors).toHaveLength(2);
    expect(authors.map((a) => a.name)).toEqual(['Alice', 'Bob']);
  });
});
