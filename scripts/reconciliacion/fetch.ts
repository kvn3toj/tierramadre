// scripts/reconciliacion/fetch.ts — SOLO LECTURA
//
// Reconciliación Fase 1, Task 1: descarga las 4 fuentes de inventario a JSON
// local bajo out/ (git-ignored). No escribe NADA a Convex, Sheets, ni prod.
//
// Convex: SIEMPRE el deployment de PRODUCCIÓN, nunca el de dev.
//
// El destino sale de `CONVEX_URL` y NO tiene valor por defecto, a propósito.
// Antes había uno hardcodeado, y sobrevivió a dos mudanzas de proyecto: al
// cambiar de deployment este script seguía auditando en silencio la base vieja
// y reportando números de un sistema que ya nadie usaba. Un fallo ruidoso
// —correr sin la variable y que reviente— es preferible a una reconciliación
// que da resultados plausibles sobre datos muertos.
import { ConvexHttpClient } from 'convex/browser';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('scripts/reconciliacion/out', { recursive: true });
const OUT = 'scripts/reconciliacion/out';

const CONVEX_URL = process.env.CONVEX_URL?.trim();
if (!CONVEX_URL) {
  throw new Error(
    'Falta CONVEX_URL. Este script audita producción y no adivina el ' +
      'deployment: un default hardcodeado ya sobrevivió a dos mudanzas ' +
      'reconciliando contra la base equivocada. Exportala explícitamente.',
  );
}

const cx = new ConvexHttpClient(CONVEX_URL);

// lotItems:search queries the `productInventory` table (not a `lotItems`
// table — the name is legacy). minCantidad: 0 skips the handler's quantity
// filter entirely, so this returns ALL productInventory docs including
// sold/zero-qty items — intended for reconciliation.
const items = await cx.query(
  'lotItems:search' as never,
  { minCantidad: 0 } as never,
);
// lots:list returns raw `lots` docs.
const lots = await cx.query('lots:list' as never, {} as never);

writeFileSync(`${OUT}/convex_items.json`, JSON.stringify(items));
writeFileSync(`${OUT}/convex_lotes.json`, JSON.stringify(lots));

console.log(
  'convex items',
  (items as unknown[]).length,
  'lotes',
  (lots as unknown[]).length,
);

for (const [name, url] of [
  ['legacy', 'get-treasure-sheets'],
  ['sot', 'get-inventory-rows'],
] as const) {
  try {
    const res = await fetch(`https://tierramadre.app/api/${url}`);
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = { __nonJson: true, raw: text.slice(0, 500) };
    }
    writeFileSync(`${OUT}/${name}.json`, JSON.stringify(body));
    const keys =
      body && typeof body === 'object' ? Object.keys(body as object) : [];
    console.log(name, res.status, keys);
  } catch (err) {
    console.log(name, 'FETCH_ERROR', String(err));
    writeFileSync(
      `${OUT}/${name}.json`,
      JSON.stringify({ __fetchError: String(err) }),
    );
  }
}
