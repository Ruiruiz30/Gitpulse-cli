import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CommitScore } from '../types/scoring.js';

export interface CachedScore {
  commitHash: string;
  score: CommitScore;
  rubricHash: string;
  timestamp: number;
}

export class CacheManager {
  private cacheDir: string;

  constructor(repoPath: string) {
    this.cacheDir = path.join(repoPath, '.gitpulse', 'cache', 'scores');
  }

  ensureCacheDir(): void {
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  get(commitHash: string, rubricHash: string): CommitScore | null {
    const filePath = this.getCachePath(commitHash);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const cached: CachedScore = JSON.parse(raw);

      // Invalidate if rubric has changed
      if (cached.rubricHash !== rubricHash) {
        return null;
      }

      return cached.score;
    } catch {
      return null;
    }
  }

  set(commitHash: string, score: CommitScore, rubricHash: string): void {
    this.ensureCacheDir();

    const cached: CachedScore = {
      commitHash,
      score,
      rubricHash,
      timestamp: Date.now(),
    };

    const filePath = this.getCachePath(commitHash);
    fs.writeFileSync(filePath, JSON.stringify(cached, null, 2), 'utf-8');
  }

  has(commitHash: string, rubricHash: string): boolean {
    return this.get(commitHash, rubricHash) !== null;
  }

  getAllCached(rubricHash: string): Map<string, CommitScore> {
    const result = new Map<string, CommitScore>();

    if (!fs.existsSync(this.cacheDir)) {
      return result;
    }

    const files = fs.readdirSync(this.cacheDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(this.cacheDir, file), 'utf-8');
        const cached: CachedScore = JSON.parse(raw);
        if (cached.rubricHash === rubricHash) {
          result.set(cached.commitHash, cached.score);
        }
      } catch {
        // Skip corrupt cache entries
      }
    }

    return result;
  }

  clear(): void {
    if (fs.existsSync(this.cacheDir)) {
      fs.rmSync(this.cacheDir, { recursive: true });
    }
  }

  private getCachePath(commitHash: string): string {
    return path.join(this.cacheDir, `${commitHash.substring(0, 12)}.json`);
  }
}
