import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'src/**/*.test.ts',
      // Component tests render React, so they are .tsx and run under jsdom
      // (see the environmentMatchGlobs entry below).
      'tests/**/*.test.tsx',
      'src/**/*.test.tsx',
    ],
    environmentMatchGlobs: [
      ['tests/**/*.test.tsx', 'jsdom'],
      ['src/**/*.test.tsx', 'jsdom'],
      ['tests/useDirtyGuard.test.ts', 'jsdom'],
      ['tests/useVitrinaSelection.test.ts', 'jsdom'],
      ['tests/useVaultUnlock.test.ts', 'jsdom'],
      ['tests/useVaultReducedMotion.test.ts', 'jsdom'],
      ['tests/vault-cinematic-sequence.test.ts', 'jsdom'],
      ['tests/useAbonoSequence.test.ts', 'jsdom'],
      ['tests/vault-audio.test.ts', 'jsdom'],
      ['tests/useChromaSamples.test.ts', 'jsdom'],
      ['tests/fotosintesis-phone.test.ts', 'jsdom'],
      ['tests/kardexPreview.test.ts', 'jsdom'],
      ['tests/movimientoKardexPreview.test.ts', 'jsdom'],
      ['tests/precioNoPorCantidad.test.ts', 'jsdom'],
    ],
  },
});
