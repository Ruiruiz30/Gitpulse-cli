import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { select, input, password } from '@inquirer/prompts';
import { theme } from '../ui/theme.js';
import type { LLMProviderType } from '@gitpulse/core';

const HOME_DIR = path.join(os.homedir(), '.gitpulse');
const CONFIG_FILE = path.join(HOME_DIR, 'config.yml');

export function isOnboardingNeeded(): boolean {
  return !fs.existsSync(CONFIG_FILE);
}

export async function runOnboarding(): Promise<void> {
  console.log(theme.heading('\n  Welcome to GitPulse!\n'));
  console.log(theme.dim('  Let\'s set up your global configuration.\n'));

  const provider = (await select({
    message: 'Select your LLM provider:',
    choices: [
      { value: 'openai', name: 'OpenAI (GPT-4o, GPT-4o-mini)' },
      { value: 'anthropic', name: 'Anthropic (Claude)' },
      { value: 'google', name: 'Google (Gemini)' },
      { value: 'vertex', name: 'Google Vertex AI (Gemini via Vertex)' },
      { value: 'custom', name: 'Custom (OpenAI-compatible endpoint)' },
    ],
  })) as LLMProviderType;

  const defaultModels: Record<string, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-20250514',
    google: 'gemini-1.5-pro',
    vertex: 'gemini-1.5-pro',
    custom: 'default',
  };

  const model = await input({
    message: 'Model name:',
    default: defaultModels[provider] ?? 'gpt-4o',
  });

  let baseURL: string | undefined;
  if (provider === 'custom') {
    baseURL = await input({
      message: 'Base URL for the API:',
      validate: (v) => {
        try {
          new URL(v);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    });
  }

  const apiKey = await password({
    message: `API Key for ${provider}:`,
    mask: '*',
  });

  // Ensure home directory exists
  fs.mkdirSync(HOME_DIR, { recursive: true });

  // Build and write config
  let yaml = `# GitPulse Global Configuration
provider: ${provider}
model: ${model}
`;

  if (baseURL) {
    yaml += `baseURL: ${baseURL}\n`;
  }

  if (apiKey) {
    yaml += `apiKey: ${apiKey}\n`;
  }

  fs.writeFileSync(CONFIG_FILE, yaml, 'utf-8');

  console.log(theme.success(`\n  Configuration saved to ${CONFIG_FILE}`));
  console.log('');
}
