/**
 * Vite para Renacer en localhost: igual que `vite.config.ts`, pero el proxy de `/api`
 * apunta al servidor local de `scripts/renacer-dev.mjs` en vez de a producción.
 * Se usa solo desde ese script: `npx tsx scripts/renacer-dev.mjs`.
 */
import { mergeConfig } from 'vite';
import base from './vite.config';

const puertoApi = process.env.RENACER_API_PORT ?? '3999';

export default mergeConfig(base, {
  server: {
    open: false,
    proxy: {
      '/api/': {
        target: `http://localhost:${puertoApi}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
