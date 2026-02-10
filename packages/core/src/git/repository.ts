import simpleGit, { type SimpleGit } from 'simple-git';
import type { AnalysisScope } from '../types/git.js';

export class Repository {
  private git: SimpleGit;
  readonly path: string;

  private constructor(path: string, git: SimpleGit) {
    this.path = path;
    this.git = git;
  }

  static async open(path: string): Promise<Repository> {
    const git = simpleGit(path);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error(`Not a git repository: ${path}`);
    }
    return new Repository(path, git);
  }

  async getLog(scope: AnalysisScope) {
    const args: string[] = [];
    if (scope.branch) args.push(scope.branch);
    if (scope.since) args.push(`--since=${scope.since}`);
    if (scope.until) args.push(`--until=${scope.until}`);
    if (scope.authors?.length) {
      for (const author of scope.authors) {
        args.push(`--author=${author}`);
      }
    }
    if (scope.maxCommits) args.push(`-n`, String(scope.maxCommits));

    const log = await this.git.log(args);
    return log;
  }

  async getDiff(hash: string): Promise<string> {
    const diff = await this.git.diff([`${hash}~1`, hash, '--', '.']);
    return diff;
  }

  async getDiffForFirstCommit(hash: string): Promise<string> {
    const emptyTree = (await this.git.raw(['hash-object', '-t', 'tree', '/dev/null'])).trim();
    const diff = await this.git.diff([
      '--diff-filter=A',
      emptyTree,
      hash,
    ]);
    return diff;
  }

  async getCommitBody(hash: string): Promise<string> {
    const result = await this.git.show([hash, '--format=%B', '--no-patch']);
    return result.trim();
  }

  async getParentHashes(hash: string): Promise<string[]> {
    const result = await this.git.raw(['rev-parse', `${hash}^@`]);
    return result
      .trim()
      .split('\n')
      .filter((h) => h.length > 0);
  }

  async getCurrentBranch(): Promise<string> {
    const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  }

  get simpleGit(): SimpleGit {
    return this.git;
  }
}
