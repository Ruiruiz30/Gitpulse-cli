import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RubricName } from '../llm/prompt-builder.js';

export function computeRubricHash(rubrics: Map<RubricName, string>): string {
  const hash = crypto.createHash('sha256');
  const sortedEntries = Array.from(rubrics.entries()).sort(([a], [b]) => a.localeCompare(b));

  for (const [name, content] of sortedEntries) {
    hash.update(`${name}:${content}`);
  }

  return hash.digest('hex').substring(0, 16);
}

export function computeRubricHashFromPath(rubricsDir: string): string {
  const hash = crypto.createHash('sha256');

  const files = fs
    .readdirSync(rubricsDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(rubricsDir, file), 'utf-8');
    hash.update(`${file}:${content}`);
  }

  return hash.digest('hex').substring(0, 16);
}
