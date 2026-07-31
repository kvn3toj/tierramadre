/**
 * Vite config for the headless certificate render harness.
 *
 * The harness exists so `scripts/generar-certificados.mjs` can produce
 * certificates from the terminal WITHOUT reimplementing any of the artwork
 * logic. It imports the production components directly out of `src/`
 * (CertPreview, certTemplates, photoAutoFit, exportCert), so a certificate
 * rendered here is the same pixels an operator gets from the admin page.
 *
 * `publicDir` points at the repo's real `public/` so the template background
 * (`/assets/certificados/bg_origen.jpg`) resolves exactly as it does in the app.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');

export default defineConfig({
  root: here,
  publicDir: resolve(repoRoot, 'public'),
  plugins: [react()],
  // The harness is driven by Playwright, never a human — no need to open a browser.
  server: { host: '127.0.0.1', open: false },
  logLevel: 'warn',
});
