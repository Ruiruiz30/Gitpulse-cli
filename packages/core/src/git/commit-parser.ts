import type { CommitInfo, AuthorInfo } from '../types/git.js';
import type { DefaultLogFields, ListLogLine } from 'simple-git';
import { Repository } from './repository.js';

export async function parseCommits(
  repo: Repository,
  logEntries: readonly (DefaultLogFields & ListLogLine)[],
): Promise<CommitInfo[]> {
  const commits: CommitInfo[] = [];

  for (const entry of logEntries) {
    const author: AuthorInfo = {
      name: entry.author_name,
      email: entry.author_email,
    };

    let parentHashes: string[] = [];
    try {
      parentHashes = await repo.getParentHashes(entry.hash);
    } catch {
      // First commit has no parents
    }

    const isMergeCommit = parentHashes.length > 1;
    const [subject, ...bodyLines] = entry.message.split('\n');

    commits.push({
      hash: entry.hash,
      abbreviatedHash: entry.hash.substring(0, 7),
      author,
      date: new Date(entry.date),
      message: entry.message,
      subject: subject?.trim() ?? '',
      body: bodyLines.join('\n').trim(),
      refs: entry.refs,
      parentHashes,
      isMergeCommit,
    });
  }

  return commits;
}
