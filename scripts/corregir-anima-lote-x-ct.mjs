/**
 * Corrige las 16 notas de Anima con estado "LOTE X CT".
 *
 * Dos errores a reparar:
 *
 *  1. AFIRMACIÓN FALSA. La "Nota de corrección" que se agregó el 2026-07-22
 *     decía: "al comprarse por quilate, el costo vive a nivel de lote, no de
 *     ítem". Era una inferencia sin verificar. Verificado el 2026-07-23:
 *     "LOTE X CT" NO es un lote — no aparece en las 98 filas de `Lotes` de
 *     SOT v3 ni en las 68 de SOT v2, y los 16 ítems tienen `loteId` vacío.
 *     Es un valor de la columna ESTADO del inventario legacy (col O del #3)
 *     que describe la modalidad de compra, no una agrupación con ID.
 *
 *  2. DATOS CONGELADOS. Las notas se sincronizaron antes de que se cargaran
 *     los costos, así que muestran costo 0 / precio vacío para ítems que hoy
 *     sí los tienen.
 *
 * Los valores vigentes se leen de SOT v3 en vivo, no se hardcodean.
 *
 * Uso:
 *   node scripts/corregir-anima-lote-x-ct.mjs           # dry-run
 *   node scripts/corregir-anima-lote-x-ct.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const DIR =
  '/Users/kevinp/Movies/coomunity-universe/Obsidian/Anima/Wings/Projects/TierraMadre/inventario';
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const HOY = '2026-07-23';
const ESTADO = 'LOTE X CT';

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const rawKey = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const sheets = new sheets_v4.Sheets({
  auth: new GoogleAuth({
    credentials: JSON.parse(rawKey),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  }),
});

const c = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const num = (v) => {
  const x = c(v)
    .replace(/[$.\s]/g, '')
    .replace(/,/g, '');
  return x && x !== '-' && Number.isFinite(+x) ? +x : null;
};
const cop = (n) => (n === null ? '—' : n.toLocaleString('es-CO'));

// --- Estado vigente en SOT v3 --------------------------------------------
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: `'Inventario'!A:Y`,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const vivos = new Map();
for (const r of (res.data.values || []).slice(1)) {
  if (c(r[16]) !== ESTADO) continue;
  vivos.set(c(r[0]), {
    codigo: c(r[2]),
    costo: num(r[11]),
    precio: num(r[12]),
    loteId: c(r[23]),
  });
}
console.log(`Ítems "${ESTADO}" vivos en SOT v3: ${vivos.size}`);

const NOTA = (d) => `## Nota de corrección (${HOY})

Esta nota tuvo dos errores, ambos corregidos aquí.

**1 · El nombre estaba corrupto en SOT v3** (corregido el 2026-07-22). Figuraba
como una fecha serial de 1900 o como un placeholder \`Gema N.N\` con un código
que no correspondía. No es un registro basura: es una gema real cuyo "nombre" en
el inventario legacy es su **código de posición**, \`${d.codigo}\`. Restaurado
desde SOT v2 · \`Sintesis_Inventario\` (col B), verificado contra Inventario #3 ·
\`INVENTARIO Tierra.Madre\` (col C).

**2 · \`${ESTADO}\` no es un lote.** La versión anterior de esta nota afirmaba que
"el costo vive a nivel de lote, no de ítem". **Eso era falso** — una inferencia
que se escribió sin verificar. Comprobado el ${HOY}: la cadena \`${ESTADO}\` no
aparece en ninguna de las **98 filas de \`Lotes\` de SOT v3** ni en las **68 de
SOT v2**, y este ítem tiene \`loteId\` **${d.loteId || 'vacío'}**. \`${ESTADO}\` es un
valor de la columna ESTADO del inventario legacy (col O del #3) que describe la
**modalidad de compra** (lote adquirido por quilate), no una agrupación con ID.
No existe ningún costo total de lote que prorratear.

**Estado de costos al ${HOY}** (leído de SOT v3 en vivo):
costoBaseCOP **${cop(d.costo)}** · precioFinalCOP **${cop(d.precio)}**${
  d.costo && d.precio ? ' (= costo × 2,6, la regla de SOT v3)' : ''
}${
  !d.costo
    ? '\n\nEste ítem **sigue sin costo**, y tampoco lo tiene en SOT v2 ni en Inventario #3\n(su `precioCOP` legacy está vacío). El dato tiene que venir de la factura física\nde la Colección Madres — no es recuperable desde las hojas.'
    : ''
}
`;

const files = readdirSync(DIR).filter(
  (f) => f.endsWith('.md') && /^item-\d+-/.test(f),
);
const cambios = [];

for (const [item, d] of vivos) {
  const archivo = files.find((f) => f.startsWith(`item-${item}-`));
  if (!archivo) {
    cambios.push({ item, error: 'nota no encontrada' });
    continue;
  }
  const ruta = join(DIR, archivo);
  let md = readFileSync(ruta, 'utf8');
  const antes = md;

  // Reemplazar la nota de corrección completa (o añadirla si no está)
  const i = md.indexOf('## Nota de corrección');
  md = (i === -1 ? md.trimEnd() + '\n\n' : md.slice(0, i)) + NOTA(d);

  // Refrescar los valores de la tabla "Datos (SOT v3)"
  md = md.replace(
    /^(\| costoBaseCOP\s*\|)[^|]*\|/m,
    `$1 ${cop(d.costo).padEnd(29)}|`,
  );
  md = md.replace(
    /^(\| precioFinalCOP\s*\|)[^|]*\|/m,
    `$1 ${cop(d.precio).padEnd(29)}|`,
  );

  // Frontmatter
  md = md.replace(/^updated: .*$/m, `updated: ${HOY}`);
  md = md.replace(/^precioFinalCOP:.*$/m, `precioFinalCOP: ${d.precio ?? ''}`);
  md = md.replace(/^source: "(.*)"$/m, (m, g) =>
    g.includes('costos revisados')
      ? m
      : `source: "${g}; costos revisados ${HOY} contra SOT v3 en vivo"`,
  );

  cambios.push({ item, archivo, md, ruta, d, cambia: md !== antes });
}

// --- Reporte --------------------------------------------------------------
console.log(`\n=== Anima · notas "${ESTADO}" ===`);
console.log(`Modo: ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'}\n`);
for (const x of cambios) {
  if (x.error) {
    console.log(`  ⚠️ item ${x.item}: ${x.error}`);
    continue;
  }
  console.log(
    `  ${x.archivo.padEnd(22)} cód ${x.d.codigo.padEnd(5)} costo ${cop(x.d.costo).padStart(9)} · precio ${cop(x.d.precio).padStart(9)}${x.cambia ? '' : '  (sin cambios)'}`,
  );
}
const aplicables = cambios.filter((x) => !x.error && x.cambia);
console.log(`\nNotas a reescribir: ${aplicables.length}`);
console.log(`  · con costo: ${cambios.filter((x) => x.d?.costo).length}`);
console.log(
  `  · sin costo: ${cambios
    .filter((x) => x.d && !x.d.costo)
    .map((x) => x.d.codigo)
    .join(', ')}`,
);

if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply.');
  process.exit(0);
}

for (const x of aplicables) writeFileSync(x.ruta, x.md);
console.log(`\n✅ ${aplicables.length} notas corregidas`);
