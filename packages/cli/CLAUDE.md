# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Build all packages (core must build before cli)
pnpm build

# Build single package
pnpm --filter @gitpulse/core build
pnpm --filter gitpulse-cli build

# Run all tests
pnpm test

# Run tests for a single package
pnpm --filter @gitpulse/core test
pnpm --filter gitpulse-cli test

# Run a single test file
cd packages/core && npx vitest run __tests__/scoring.test.ts

# Lint / typecheck
pnpm lint
pnpm typecheck
```

## Architecture

This is a pnpm monorepo with Turborepo orchestration. Two packages:

- **`@gitpulse/core`** (`packages/core`) — Library: analysis engine, scoring, caching, LLM integration, report generation. No CLI dependencies. Can be used programmatically.
- **`gitpulse-cli`** (`packages/cli`) — CLI tool published to npm. Depends on `@gitpulse/core` via `workspace:*`. Provides Commander.js commands + interactive REPL mode.

### Core Pipeline (packages/core)

The analysis follows a 3-phase pipeline in `Analyzer` (`pipeline/analyzer.ts`):

1. **Extract** — `git/repository.ts` (simple-git wrapper) → `git/commit-parser.ts` → `git/diff-analyzer.ts`
2. **Score** — `pipeline/batch.ts` groups commits by size → `scoring/engine.ts` calls LLM via Vercel AI SDK's `generateObject()` → results validated by Zod schemas in `llm/schemas/scoring.ts`
3. **Aggregate** — `scoring/aggregator.ts` rolls up commit scores into author scores → `report/generator.ts` formats output

Key subsystems:
- **LLM providers** (`llm/provider.ts`): Factory pattern supporting OpenAI, Anthropic, Google, Vertex, custom OpenAI-compatible endpoints
- **Rubrics** (`llm/prompt-builder.ts`): 4 scoring dimensions loaded from Markdown files, searched in order: repo-local → `~/.gitpulse/rubrics/` → built-in defaults
- **Cache** (`cache/cache-manager.ts`): Per-commit score cache at `~/.gitpulse/cache/{repoName}-{hash}/scores/`, invalidated when rubric hash changes
- **Home manager** (`home/home-manager.ts`): Manages `~/.gitpulse/` — rubrics, cache, history, memory, repos, config

### CLI Layer (packages/cli)

- **Entry point** (`index.ts`): No args → REPL mode; with args → Commander.js dispatch
- **Commands** (`commands/`): analyze, report, config, compare, history
- **REPL** (`repl/repl.ts`): Interactive loop with quick menu, onboarding check on startup
- **Wizards** (`wizard/`): `onboarding.ts` for first-run config; `setup.ts` for project-level config
- **UI** (`ui/`): chalk theme, ora spinners, cli-progress bars, cli-table3 tables

### Data Flow for `gitpulse analyze`

```
CLI parse args → resolve repo (clone if remote) → HomeManager.ensureInitialized()
→ interactive time range prompt (if no --since/--until and no -y)
→ Analyzer.create(repoPath) → analyzer.estimate(scope) → show summary
→ confirm → analyzer.run(scope, onProgress) → generateReport() → display
→ home.recordAnalysis() + home.updateMemory()
```

## Key Conventions

- **ESM-only** throughout. All imports use `.js` extension (TypeScript with bundler resolution).
- **Zod validation** for config (`config/schema.ts`) and LLM responses (`llm/schemas/scoring.ts`).
- **All persistent data** lives under `~/.gitpulse/` — never write to analyzed repositories.
- Config resolution via cosmiconfig: project `.gitpulse.yml` > global `~/.gitpulse/config.yml` > built-in defaults.
- Both packages use tsup for bundling and tsc for declaration emit only.
- Prettier: 100 char width, trailing commas, 2-space indent, single quotes.
