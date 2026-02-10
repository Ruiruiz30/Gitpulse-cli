import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Walk up from the given directory to find the nearest package.json,
 * returning its parent directory (the package root).
 */
export function findPackageRoot(fromDir: string): string | null {
  let dir = fromDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Resolve the built-in rubrics directory shipped with the monorepo.
 * The rubrics live at `<monorepo-root>/rubrics/` which is two levels
 * above `@gitpulse/core`'s package root.
 */
export function findBuiltInRubricsDir(packageRoot: string | null): string | null {
  if (!packageRoot) return null;
  const candidate = path.join(packageRoot, '..', '..', 'rubrics');
  return fs.existsSync(candidate) ? path.resolve(candidate) : null;
}
