import { describe, it, expect } from 'vitest';
import { getVersion } from '../src/utils/version.js';

describe('CLI Utils', () => {
  it('should return a version string', () => {
    const version = getVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
