import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      ['tests/useVaultUnlock.test.ts', 'jsdom'],
      ['tests/useVaultReducedMotion.test.ts', 'jsdom'],
      ['tests/vault-cinematic-sequence.test.ts', 'jsdom'],
      ['tests/vault-audio.test.ts', 'jsdom'],
    ],
  },
});
