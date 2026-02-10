import type { LanguageModel } from 'ai';
import type { LLMProviderType } from '../types/config.js';

export interface ProviderOptions {
  type: LLMProviderType;
  model: string;
  apiKey?: string;
  baseURL?: string;
}

export async function createProvider(options: ProviderOptions): Promise<LanguageModel> {
  switch (options.type) {
    case 'openai':
      return createOpenAIProvider(options);
    case 'anthropic':
      return createAnthropicProvider(options);
    case 'google':
      return createGoogleProvider(options);
    case 'vertex':
      return createVertexProvider(options);
    case 'custom':
      return createCustomProvider(options);
    default:
      throw new Error(`Unknown provider type: ${options.type}`);
  }
}

async function createOpenAIProvider(options: ProviderOptions): Promise<LanguageModel> {
  const { createOpenAI } = await import('@ai-sdk/openai');
  const provider = createOpenAI({
    apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
    ...(options.baseURL && { baseURL: options.baseURL }),
  });
  return provider(options.model);
}

async function createAnthropicProvider(options: ProviderOptions): Promise<LanguageModel> {
  const { createAnthropic } = await import('@ai-sdk/anthropic');
  const provider = createAnthropic({
    apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY,
    ...(options.baseURL && { baseURL: options.baseURL }),
  });
  return provider(options.model);
}

async function createGoogleProvider(options: ProviderOptions): Promise<LanguageModel> {
  const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
  const provider = createGoogleGenerativeAI({
    apiKey: options.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    ...(options.baseURL && { baseURL: options.baseURL }),
  });
  return provider(options.model);
}

async function createVertexProvider(options: ProviderOptions): Promise<LanguageModel> {
  const { createVertex } = await import('@ai-sdk/google-vertex');
  const provider = createVertex({
    apiKey: options.apiKey ?? process.env.GOOGLE_VERTEX_API_KEY,
    ...(options.baseURL && { baseURL: options.baseURL }),
  });
  return provider(options.model);
}

async function createCustomProvider(options: ProviderOptions): Promise<LanguageModel> {
  if (!options.baseURL) {
    throw new Error('Custom provider requires a baseURL');
  }
  const { createOpenAI } = await import('@ai-sdk/openai');
  const provider = createOpenAI({
    apiKey: options.apiKey ?? 'no-key',
    baseURL: options.baseURL,
  });
  return provider(options.model);
}
