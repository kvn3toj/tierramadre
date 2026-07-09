#!/usr/bin/env node
/**
 * Read-only scan of the Fotosíntesis publish state.
 *
 * Answers: "which lote items are published (visible) vs. en reserva (hidden),
 * and is anything HIDDEN still leaking into the customer catalog through a
 * grouped lote/sublote bundle card?"
 *
 * Pure reads (Convex queries never mutate). Targets the deployment in
 * VITE_CONVEX_URL — pass --prod to read the production URL from
 * .env.production instead of the dev URL in .env.local.
 *
 *   node scripts/scan-fotosintesis-publish.mjs            # dev (.env.local)
 *   node scripts/scan-fotosintesis-publish.mjs --prod     # prod (.env.production)
 */
import { readFileSync } from 'node:fs';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const useProd = process.argv.includes('--prod');
const envFile = useProd ? '.env.production' : '.env.local';

function readEnv(file, key) {
  try {
    const txt = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    const line = txt.split('\n').find((l) => l.startsWith(`${key}=`));
    if (!line) return undefined;
    // Strip surrounding quotes (.env values are often "https://…").
    return line
      .slice(key.length + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  } catch {
    return undefined;
  }
}

const url =
  process.env.VITE_CONVEX_URL ||
  readEnv(envFile, 'VITE_CONVEX_URL') ||
  readEnv('.env.local', 'VITE_CONVEX_URL');

if (!url) {
  console.error(`No VITE_CONVEX_URL found in ${envFile}.`);
  process.exit(1);
}

const c = new ConvexHttpClient(url);
const bool = (v) => (v === true ? 'TRUE ' : v === false ? 'false' : 'unset');

async function main() {
  console.log(`\n🔎 Scanning ${useProd ? 'PRODUCTION' : 'dev'} — ${url}\n`);

  // NOTE: `products.list` projects its return to a bandwidth-optimized field
  // subset (see the SAFE comment in convex/products.ts) that does NOT include
  // `mostrarEnCatalogo` or `tipo` — reading those off `products.list` rows
  // always yields `undefined`, regardless of the real stored value (see
  // Anima 2026-07-09-mostrarEnCatalogo-desfase.md for the false-alarm this
  // caused). Only used here for the total product count.
  const [products, lots, publishedCatalog, publishedGroups] = await Promise.all(
    [
      c.query(api.products.list, {}),
      c.query(api.lots.list, {}),
      c.query(api.products.publishedCatalog, {}),
      c.query(api.products.publishedGroups, {}),
    ],
  );

  // Full, unprojected lote items (includes mostrarEnCatalogo/tipo) — one
  // listByLote call per lot, merged into a single lookup + flat array.
  const byItemId = new Map();
  const loteItems = [];
  for (const lot of lots) {
    const items = await c.query(api.products.listByLote, {
      loteId: lot.loteId,
    });
    for (const p of items) {
      byItemId.set(p.itemId, p);
      loteItems.push(p);
    }
  }
  const shownTrue = loteItems.filter((p) => p.mostrarEnCatalogo === true);
  const hidden = loteItems.filter((p) => p.mostrarEnCatalogo !== true);

  console.log('── Totals ────────────────────────────────────────────');
  console.log(`Productos totales:            ${products.length}`);
  console.log(`Ítems de lote (loteId set):   ${loteItems.length}`);
  console.log(`  · mostrarEnCatalogo TRUE:   ${shownTrue.length}`);
  console.log(`  · oculto (false/unset):     ${hidden.length}`);
  console.log(
    `Cards individuales (publishedCatalog): ${publishedCatalog.length}`,
  );
  console.log(
    `Cards de bundle (publishedGroups):     ${publishedGroups.length}`,
  );

  // ── Per-lote breakdown ──────────────────────────────────────────
  console.log('\n── Lotes ─────────────────────────────────────────────');
  const lotByLoteId = new Map(lots.map((l) => [l.loteId, l]));
  for (const lot of lots) {
    if (lot.estado === 'cancelado') continue;
    const items = loteItems.filter((p) => p.loteId === lot.loteId);
    if (items.length === 0) continue;
    const t = items.filter((p) => p.mostrarEnCatalogo === true).length;
    const grp = lot.mostrarComoLote === true ? ' · mostrarComoLote=TRUE' : '';
    console.log(
      `${lot.loteId.padEnd(10)} [${(lot.estado ?? '').padEnd(9)}]` +
        ` ítems=${items.length} visibles=${t} ocultos=${items.length - t}${grp}`,
    );
  }

  // ── Sub-lotes (enumerate per parent) ────────────────────────────
  console.log('\n── Sub-lotes ─────────────────────────────────────────');
  let anySub = false;
  for (const lot of lots) {
    const subs = await c.query(api.subLotes.listByParent, {
      parentLoteId: lot.loteId,
    });
    for (const sub of subs) {
      anySub = true;
      const memberStates = sub.itemIds.map(
        (id) => byItemId.get(id)?.mostrarEnCatalogo === true,
      );
      const visible = memberStates.filter(Boolean).length;
      const parentEstado = lotByLoteId.get(sub.parentLoteId)?.estado ?? '?';
      const shown =
        sub.estado === 'activa' && sub.mostrarComoLote === true
          ? '  ◀ SHOWN as bundle'
          : '';
      console.log(
        `${sub.subLoteId.padEnd(14)} [${(sub.estado ?? '').padEnd(9)}]` +
          ` parent=${sub.parentLoteId}(${parentEstado})` +
          ` mostrarComoLote=${bool(sub.mostrarComoLote)}` +
          ` miembros=${sub.itemIds.length} visibles=${visible}${shown}`,
      );
    }
  }
  if (!anySub) console.log('(ninguno)');

  // ── Every hidden lote item, and where (if anywhere) it still shows ──
  console.log('\n── Ítems OCULTOS (mostrarEnCatalogo=false/unset) ─────');
  const inCatalog = new Set(publishedCatalog.map((r) => r.itemId));
  const inAnyGroup = new Set();
  for (const g of publishedGroups)
    for (const it of g.items) inAnyGroup.add(it.itemId);
  if (hidden.length === 0) {
    console.log('(ninguno)');
  } else {
    for (const p of hidden) {
      const leaks = [];
      if (inCatalog.has(p.itemId)) leaks.push('publishedCatalog(individual)');
      if (inAnyGroup.has(p.itemId)) leaks.push('bundle');
      const where =
        leaks.length > 0
          ? `⚠️  AÚN VISIBLE vía ${leaks.join(' + ')}`
          : '✓ correctamente oculto';
      console.log(
        `  #${String(p.itemId).padEnd(5)} '${p.nombre ?? ''}' lote=${p.loteId} → ${where}`,
      );
    }
  }

  // ── THE BUG: hidden items still leaking via a bundle card ───────
  console.log('\n── ⚠️  Ítems OCULTOS que igual aparecen en un bundle ──');
  const leaks = [];
  for (const g of publishedGroups) {
    for (const it of g.items) {
      const p = byItemId.get(it.itemId);
      if (p && p.mostrarEnCatalogo !== true) {
        leaks.push({
          group: `${g.groupKind} ${g.groupId}`,
          item: it.itemId,
          nombre: it.nombre,
        });
      }
    }
  }
  if (leaks.length === 0) {
    console.log(
      'Ninguno. (Si ocultaste un ítem y NO está aquí, el bundle ya lo respeta.)',
    );
  } else {
    for (const l of leaks) {
      console.log(
        `  ✗ #${l.item} '${l.nombre}' — oculto pero visible vía ${l.group}`,
      );
    }
  }

  // ── Bundles that would COLLAPSE if we strictly filter members ───
  console.log(
    '\n── Bundles que quedarían vacíos si filtramos por visibilidad ──',
  );
  let anyCollapse = false;
  for (const g of publishedGroups) {
    const anyVisible = g.items.some(
      (it) => byItemId.get(it.itemId)?.mostrarEnCatalogo === true,
    );
    if (!anyVisible) {
      anyCollapse = true;
      console.log(
        `  ! ${g.groupKind} ${g.groupId} '${g.nombre}' — TODOS sus ${g.items.length} ítems están ocultos`,
      );
    }
  }
  if (!anyCollapse)
    console.log('Ninguno. (El fix por visibilidad es 100% seguro.)');

  console.log('');
}

main().catch((e) => {
  console.error('Scan failed:', e.message ?? e);
  process.exit(1);
});
