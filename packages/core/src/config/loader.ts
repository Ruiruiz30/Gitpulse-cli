import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { cosmiconfig } from 'cosmiconfig';
import { gitPulseConfigSchema, type GitPulseConfigResolved } from './schema.js';

const MODULE_NAME = 'gitpulse';

const explorer = cosmiconfig(MODULE_NAME, {
  searchPlaces: [
    `.${MODULE_NAME}.yml`,
    `.${MODULE_NAME}.yaml`,
    `.${MODULE_NAME}.json`,
    `.${MODULE_NAME}.config.js`,
    `.${MODULE_NAME}.config.mjs`,
    `.${MODULE_NAME}rc`,
    `.${MODULE_NAME}rc.json`,
    `.${MODULE_NAME}rc.yml`,
    `.${MODULE_NAME}rc.yaml`,
    `${MODULE_NAME}.config.js`,
    `${MODULE_NAME}.config.mjs`,
  ],
});

export async function loadConfig(
  searchFrom?: string,
  overrides?: Record<string, unknown>,
): Promise<GitPulseConfigResolved> {
  const result = await explorer.search(searchFrom);
  let fileConfig = result?.config ?? {};

  // Fall back to global ~/.gitpulse/config.yml if no project-level config found
  if (!result) {
    const globalConfigPath = path.join(os.homedir(), '.gitpulse', 'config.yml');
    if (fs.existsSync(globalConfigPath)) {
      try {
        const globalResult = await explorer.load(globalConfigPath);
        fileConfig = globalResult?.config ?? {};
      } catch {
        // Ignore malformed global config
      }
    }
  }

  const merged = { ...fileConfig, ...overrides };

  return gitPulseConfigSchema.parse(merged);
}

export async function loadConfigFromFile(filePath: string): Promise<GitPulseConfigResolved> {
  const result = await explorer.load(filePath);
  return gitPulseConfigSchema.parse(result?.config ?? {});
}
