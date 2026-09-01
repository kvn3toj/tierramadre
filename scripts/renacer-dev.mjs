#!/usr/bin/env node
/**
 * Renacer en localhost, de punta a punta, SIN Vercel.
 *
 *   npx tsx scripts/renacer-dev.mjs        →  app en http://localhost:3000, API en :3999
 *
 * `vercel dev` no arranca en este repo (su compilador de rutas rechaza los patrones del
 * preset de Vite, medido 2026-09-01 con las CLI 54 y 59), así que este script hace lo
 * mínimo: levanta un `http.createServer` que monta los handlers reales de
 * `api/renacer-*.ts` con la forma de `(req, res)` que espera `withApiHandler`, y lanza
 * Vite con `vite.local.config.ts`, cuyo proxy `/api` apunta acá en vez de a producción.
 *
 * Solo sirve `api/renacer-*`: el resto del `api/` sigue yendo a producción como siempre.
 * Las variables salen de `.env.local` (RENACER_CONVEX_URL, RENACER_APP_TOKEN — el dev
 * deployment `savory-malamute-505`), nunca de Vercel.
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const PUERTO_API = Number(process.env.RENACER_API_PORT ?? 3999);
const PUERTO_APP = Number(process.env.PORT ?? 3000);

// .env.local a mano: sin dependencia de dotenv y sin pisar lo que ya venga en el entorno.
for (const archivo of ['.env', '.env.local']) {
  const ruta = join(raiz, archivo);
  if (!existsSync(ruta)) continue;
  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
if (!process.env.RENACER_CONVEX_URL || !process.env.RENACER_APP_TOKEN) {
  console.error('Faltan RENACER_CONVEX_URL / RENACER_APP_TOKEN en .env.local. Sin ellas la API responde 503.');
}

function leerBody(req) {
  return new Promise((resolve) => {
    let datos = '';
    req.on('data', (c) => (datos += c));
    req.on('end', () => {
      if (!datos) return resolve(undefined);
      try { resolve(JSON.parse(datos)); } catch { resolve(datos); }
    });
  });
}

const cache = new Map();
async function handlerDe(nombre) {
  if (!/^renacer-[a-z-]+$/.test(nombre)) return null;
  const ruta = join(raiz, 'api', `${nombre}.ts`);
  if (!existsSync(ruta)) return null;
  if (!cache.has(nombre)) cache.set(nombre, import(pathToFileURL(ruta).href).then((m) => m.default));
  return cache.get(nombre);
}

const api = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO_API}`);
  const nombre = url.pathname.replace(/^\/api\//, '');
  const handler = await handlerDe(nombre);

  // La forma de VercelResponse que usan `sendSuccess`/`sendError`: `res.status(n).json(x)`.
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); return res; };
  res.send = (cuerpo) => { res.end(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)); return res; };

  if (!handler) return res.status(404).json({ success: false, error: `Solo api/renacer-* se sirve acá (${nombre})` });

  req.query = Object.fromEntries(url.searchParams.entries());
  req.body = await leerBody(req);
  try {
    await handler(req, res);
  } catch (e) {
    console.error(`[renacer-dev] ${nombre}:`, e);
    if (!res.headersSent) res.status(500).json({ success: false, error: 'Error local' });
  }
});

api.listen(PUERTO_API, () => {
  console.log(`[renacer-dev] API local en http://localhost:${PUERTO_API}/api/renacer-*  (Convex: ${process.env.RENACER_CONVEX_URL ?? '—'})`);
  const vite = spawn(
    join(raiz, 'node_modules', '.bin', 'vite'),
    ['--config', 'vite.local.config.ts', '--port', String(PUERTO_APP), '--strictPort'],
    { cwd: raiz, stdio: 'inherit', env: { ...process.env, RENACER_API_PORT: String(PUERTO_API) } },
  );
  vite.on('exit', (code) => { api.close(); process.exit(code ?? 0); });
  process.on('SIGINT', () => vite.kill('SIGINT'));
  process.on('SIGTERM', () => vite.kill('SIGTERM'));
});
