/**
 * Dispara el pull Hoja → Convex BAJO DEMANDA (sin cron, sin esperar 24 h).
 *
 * Contexto: el pull periódico está deliberadamente apagado/limitado por el
 * ahorro de bandwidth (ver convex/crons.ts, "FREE-TIER POLICY"). La ruta
 * event-driven es el Apps Script + el botón "🔄 Convex Sync" → POST /sync/foto.
 * Este script es la misma llamada desde la terminal.
 *
 * Prefiere el CLI de Convex (`npx convex run`), que se autentica solo y NO
 * necesita SHEET_SYNC_TOKEN — ese token sólo vive en el deployment. Si pasas
 * --http usa el endpoint HTTP y entonces sí requiere SHEET_SYNC_TOKEN.
 *
 * Uso:
 *   node scripts/sync-sot-convex.mjs                      # dev, sólo inventario
 *   node scripts/sync-sot-convex.mjs --prod               # deployment de producción
 *   node scripts/sync-sot-convex.mjs --tables inventory,lots
 *   node scripts/sync-sot-convex.mjs --all                # las 6 tablas del SOT
 *   node scripts/sync-sot-convex.mjs --http               # vía /sync/foto + token
 */
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valOf = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};

const ALL = ['inventory', 'providers', 'lots', 'clients', 'sales', 'subLotes'];
const tables = has('--all')
  ? ALL
  : (valOf('--tables') ?? 'inventory')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

const bad = tables.filter((t) => !ALL.includes(t));
if (bad.length) {
  console.error(
    `Tablas desconocidas: ${bad.join(', ')}\nVálidas: ${ALL.join(', ')}`,
  );
  process.exit(1);
}

const isProd = has('--prod');
console.log(
  `\n🔄 Pull Hoja → Convex  ·  deployment: ${isProd ? 'PROD' : 'dev'}  ·  tablas: ${tables.join(', ')}\n`,
);

function viaCli() {
  const args = ['convex', 'run'];
  if (isProd) args.push('--prod');
  args.push('fotoSync:runFull', JSON.stringify({ tables }));
  const r = spawnSync('npx', args, { stdio: 'inherit', encoding: 'utf8' });
  return r.status === 0;
}

async function viaHttp() {
  const site =
    process.env.CONVEX_SITE_URL ?? process.env.VITE_CONVEX_SITE_URL ?? '';
  const token = process.env.SHEET_SYNC_TOKEN;
  if (!site) throw new Error('Falta CONVEX_SITE_URL / VITE_CONVEX_SITE_URL');
  if (!token)
    throw new Error(
      'Falta SHEET_SYNC_TOKEN (sólo vive en el deployment). Usa el modo CLI —' +
        ' corre este script sin --http.',
    );
  const res = await fetch(`${site.replace(/\/$/, '')}/sync/foto`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sheet-sync-token': token,
    },
    body: JSON.stringify({ mode: 'full', tables }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(JSON.stringify(body, null, 2));
  return res.ok && body.ok !== false;
}

const ok = has('--http') ? await viaHttp() : viaCli();

if (!ok) {
  console.error('\n❌ El pull falló. Revisa el output de arriba.');
  process.exit(1);
}
console.log(
  `\n✅ Pull disparado. Los cambios de la hoja ya están en Convex.\n` +
    `   Verifica un ítem:  npx convex run${isProd ? ' --prod' : ''} products:list '{}' | head\n`,
);
