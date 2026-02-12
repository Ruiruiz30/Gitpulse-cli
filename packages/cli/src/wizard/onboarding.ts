import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { select, input, password } from '@inquirer/prompts';
import { theme } from '../ui/theme.js';
import { HomeManager } from '@gitpulse/core';
import type { LLMProviderType } from '@gitpulse/core';

const HOME_DIR = path.join(os.homedir(), '.gitpulse');
const CONFIG_FILE = path.join(HOME_DIR, 'config.yml');

export function isOnboardingNeeded(): boolean {
  return !fs.existsSync(CONFIG_FILE);
}

interface ExistingConfig {
  provider?: string;
  model?: string;
  baseURL?: string;
  apiKey?: string;
}

function readExistingConfig(): ExistingConfig {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const cfg: ExistingConfig = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (key === 'provider' || key === 'model' || key === 'baseURL' || key === 'apiKey') {
          cfg[key as keyof ExistingConfig] = value.trim();
        }
      }
    }
    return cfg;
  } catch {
    return {};
  }
}

export async function runOnboarding(): Promise<void> {
  const existing = readExistingConfig();
  const isReconfig = Object.keys(existing).length > 0;

  if (isReconfig) {
    console.log(theme.heading('\n  Reconfigure GitPulse\n'));
    console.log(theme.dim('  Current values are shown as defaults. Press Enter to keep them.\n'));
  } else {
    console.log(theme.heading('\n  Welcome to GitPulse!\n'));
    console.log(theme.dim('  Let\'s set up your global configuration.\n'));
  }

  const providerChoices = [
    { value: 'openai', name: 'OpenAI (GPT-4o, GPT-4o-mini)' },
    { value: 'anthropic', name: 'Anthropic (Claude)' },
    { value: 'google', name: 'Google (Gemini)' },
    { value: 'vertex', name: 'Google Vertex AI (Gemini via Vertex)' },
    { value: 'custom', name: 'Custom (OpenAI-compatible endpoint)' },
  ];

  const defaultProviderIndex = providerChoices.findIndex((c) => c.value === existing.provider);

  const provider = (await select({
    message: 'Select your LLM provider:',
    choices: providerChoices,
    default: defaultProviderIndex >= 0 ? existing.provider : undefined,
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
    default: (provider === existing.provider && existing.model) ? existing.model : (defaultModels[provider] ?? 'gpt-4o'),
  });

  let baseURL: string | undefined;
  if (provider === 'custom') {
    baseURL = await input({
      message: 'Base URL for the API:',
      default: existing.baseURL ?? '',
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
    message: isReconfig
      ? `API Key for ${provider} (leave empty to keep current):`
      : `API Key for ${provider}:`,
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

  const finalKey = apiKey || existing.apiKey;
  if (finalKey) {
    yaml += `apiKey: ${finalKey}\n`;
  }

  fs.writeFileSync(CONFIG_FILE, yaml, 'utf-8');

  // Initialize full home directory structure (rubrics, history, memory)
  const home = new HomeManager();
  home.initialize();

  console.log(theme.success(`\n  Configuration saved to ${CONFIG_FILE}`));
  console.log('');
}
