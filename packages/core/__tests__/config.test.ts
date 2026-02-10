import { describe, it, expect } from 'vitest';
import { gitPulseConfigSchema } from '../src/config/schema.js';
import { DEFAULT_CONFIG } from '../src/config/defaults.js';

describe('Config Schema', () => {
  it('should parse empty config with defaults', () => {
    const result = gitPulseConfigSchema.parse({});
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o');
    expect(result.scoring.weights.codeQuality).toBe(0.3);
    expect(result.analysis.maxConcurrency).toBe(3);
  });

  it('should parse valid config overrides', () => {
    const result = gitPulseConfigSchema.parse({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      scoring: {
        weights: { codeQuality: 0.4, complexityImpact: 0.2, commitDiscipline: 0.2, collaboration: 0.2 },
      },
    });
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-sonnet-4-20250514');
    expect(result.scoring.weights.codeQuality).toBe(0.4);
  });

  it('should reject invalid provider', () => {
    expect(() => gitPulseConfigSchema.parse({ provider: 'invalid' })).toThrow();
  });

  it('should reject invalid weight values', () => {
    expect(() =>
      gitPulseConfigSchema.parse({
        scoring: { weights: { codeQuality: 2.0 } },
      }),
    ).toThrow();
  });

  it('DEFAULT_CONFIG should be valid', () => {
    const result = gitPulseConfigSchema.parse(DEFAULT_CONFIG);
    expect(result.provider).toBe(DEFAULT_CONFIG.provider);
    expect(result.model).toBe(DEFAULT_CONFIG.model);
  });
});
