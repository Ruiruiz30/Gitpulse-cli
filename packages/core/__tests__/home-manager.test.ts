import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HomeManager } from '../src/home/home-manager.js';
import type { AnalysisReport } from '../src/types/report.js';

function makeTmpDir(): string {
  // Create a parent tmp dir, then return a non-existent child path
  // so HomeManager.initialize() sees it as a fresh directory.
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'gitpulse-test-'));
  const child = path.join(parent, 'home');
  return child;
}

function fakeReport(overrides?: Partial<AnalysisReport>): AnalysisReport {
  return {
    metadata: {
      generatedAt: new Date(),
      repositoryPath: '/tmp/my-repo',
      scope: {},
      dimensionWeights: { codeQuality: 0.3, complexityImpact: 0.25, commitDiscipline: 0.25, collaboration: 0.2 },
      totalCommits: 10,
      analyzedCommits: 8,
      cachedCommits: 2,
      skippedCommits: 0,
      llmProvider: 'openai',
      llmModel: 'gpt-4o',
    },
    summary: {
      averageScore: 75,
      medianScore: 78,
      topPerformer: 'Alice',
      totalAuthors: 2,
      dateRange: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
    },
    authors: [],
    commitScores: [],
    ...overrides,
  };
}

describe('HomeManager', () => {
  let tmpDir: string;
  let home: HomeManager;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    home = new HomeManager(tmpDir);
  });

  afterEach(() => {
    // tmpDir is <parent>/home, remove the parent
    fs.rmSync(path.dirname(tmpDir), { recursive: true, force: true });
  });

  // ── initialize ──

  describe('initialize', () => {
    it('creates directory structure on first run', () => {
      const result = home.initialize();

      expect(result.created).toBe(true);
      expect(result.homePath).toBe(tmpDir);
      expect(fs.existsSync(path.join(tmpDir, 'rubrics'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'history'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'memory'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'memory', 'agent-memory.json'))).toBe(true);
    });

    it('is idempotent — second run does not recreate', () => {
      const first = home.initialize();
      expect(first.created).toBe(true);

      const second = home.initialize();
      expect(second.created).toBe(false);
    });

    it('initializes agent memory with default values', () => {
      home.initialize();
      const memory = home.getMemory();

      expect(memory.version).toBe(1);
      expect(memory.totalAnalysisCount).toBe(0);
      expect(memory.repos).toEqual({});
      expect(memory.lastRun).toBeNull();
    });
  });

  // ── rubric copy ──

  describe('rubric handling', () => {
    it('does not overwrite existing rubric files', () => {
      home.initialize();

      // Write a custom rubric
      const rubricPath = path.join(tmpDir, 'rubrics', 'code-quality.md');
      // The file may or may not exist depending on built-in rubric resolution
      fs.writeFileSync(rubricPath, 'CUSTOM CONTENT', 'utf-8');

      // Re-initialize
      const result = home.initialize();

      // Should skip the existing rubric
      expect(result.skippedRubrics).toContain('code-quality.md');

      // Content should be preserved
      const content = fs.readFileSync(rubricPath, 'utf-8');
      expect(content).toBe('CUSTOM CONTENT');
    });
  });

  // ── history ──

  describe('recordAnalysis / getHistory', () => {
    it('records analysis and retrieves history', () => {
      home.initialize();

      const report = fakeReport();
      const entry = home.recordAnalysis(report, { path: '/tmp/my-repo' }, 5000, {
        estimatedTokens: 50000,
        estimatedCost: 0.12,
      });

      expect(entry.repoName).toBe('my-repo');
      expect(entry.durationMs).toBe(5000);
      expect(entry.cost.estimatedCost).toBe(0.12);

      const history = home.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]!.id).toBe(entry.id);
    });

    it('filters history by repoPath', () => {
      home.initialize();

      home.recordAnalysis(fakeReport(), {}, 1000);
      home.recordAnalysis(
        fakeReport({
          metadata: {
            ...fakeReport().metadata,
            repositoryPath: '/tmp/other-repo',
          },
        }),
        {},
        2000,
      );

      const all = home.getHistory();
      expect(all).toHaveLength(2);

      const filtered = home.getHistory('/tmp/my-repo');
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.repoPath).toBe('/tmp/my-repo');
    });

    it('returns history sorted by timestamp descending', () => {
      home.initialize();

      home.recordAnalysis(fakeReport(), {}, 1000);
      // Small delay to ensure different timestamps
      home.recordAnalysis(fakeReport(), {}, 2000);

      const history = home.getHistory();
      expect(history).toHaveLength(2);

      const t0 = new Date(history[0]!.timestamp).getTime();
      const t1 = new Date(history[1]!.timestamp).getTime();
      expect(t0).toBeGreaterThanOrEqual(t1);
    });

    it('returns empty array when no history exists', () => {
      // Don't initialize — history dir doesn't exist
      const history = home.getHistory();
      expect(history).toEqual([]);
    });
  });

  // ── memory ──

  describe('getMemory / updateMemory', () => {
    it('returns default memory when not initialized', () => {
      const memory = home.getMemory();
      expect(memory.version).toBe(1);
      expect(memory.totalAnalysisCount).toBe(0);
    });

    it('increments totalAnalysisCount on each update', () => {
      home.initialize();

      home.updateMemory(fakeReport());
      let memory = home.getMemory();
      expect(memory.totalAnalysisCount).toBe(1);

      home.updateMemory(fakeReport());
      memory = home.getMemory();
      expect(memory.totalAnalysisCount).toBe(2);
    });

    it('tracks per-repo memory with rolling average', () => {
      home.initialize();

      home.updateMemory(fakeReport());
      let memory = home.getMemory();

      const repoMem = memory.repos['/tmp/my-repo'];
      expect(repoMem).toBeDefined();
      expect(repoMem!.analysisCount).toBe(1);
      expect(repoMem!.rollingAverageScore).toBe(75);

      // Second analysis with different score
      const report2 = fakeReport({ summary: { ...fakeReport().summary, averageScore: 85 } });
      home.updateMemory(report2);
      memory = home.getMemory();

      const updated = memory.repos['/tmp/my-repo']!;
      expect(updated.analysisCount).toBe(2);
      expect(updated.rollingAverageScore).toBe(80); // (75+85)/2
    });

    it('updates preferences from most recent run', () => {
      home.initialize();

      home.updateMemory(fakeReport());
      const memory = home.getMemory();

      expect(memory.preferences.preferredProvider).toBe('openai');
      expect(memory.preferences.preferredModel).toBe('gpt-4o');
    });

    it('updates lastRun info', () => {
      home.initialize();

      home.updateMemory(fakeReport());
      const memory = home.getMemory();

      expect(memory.lastRun).not.toBeNull();
      expect(memory.lastRun!.repoName).toBe('my-repo');
      expect(memory.lastRun!.averageScore).toBe(75);
      expect(memory.lastRun!.totalCommits).toBe(10);
    });
  });

  // ── ensureInitialized ──

  describe('ensureInitialized', () => {
    it('creates home dir if it does not exist', () => {
      // tmpDir doesn't exist yet (makeTmpDir returns a non-existent child)
      expect(fs.existsSync(tmpDir)).toBe(false);

      home.ensureInitialized();
      expect(fs.existsSync(path.join(tmpDir, 'rubrics'))).toBe(true);
    });

    it('is a no-op if home dir already exists', () => {
      home.initialize();

      // Write custom content
      const marker = path.join(tmpDir, 'marker.txt');
      fs.writeFileSync(marker, 'test');

      home.ensureInitialized();
      expect(fs.existsSync(marker)).toBe(true);
    });
  });
});
