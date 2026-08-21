/**
 * Estampa el PRECIO DE LISTA de las 9 piedras del Lote Origen / Lote 170 que
 * quedaron con costo cargado y sin precio desde la corrida del 2026-08-20.
 *
 * POR QUÉ ESTABAN SIN PRECIO. `scripts/aplicar-costos-lote-origen.mjs` escribió
 * el costo en la columna L, pero `precioFinalCOP` (M) no se deriva desde la
 * hoja: lo deriva Convex al capturar, y estas filas ya existían. Resultado: 9
 * piedras extrafinas con costo y sin precio. Peor — hasta el arreglo de
 * api/get-treasure-sheets.ts (mismo día), la cadena de respaldo del catálogo
 * caía en getByIndex(11) = columna L y las ofertaba A PRECIO DE COSTO.
 *
 * REGLA APLICADA: modelo de niveles del 2026-08-20, calibrado con 189 ventas
 * reales (Anima → decisions/2026-08-20-modelo-niveles-piso-lista-calibrado.md).
 *   Nivel A (FINA SUBLIME · FINA ESENCIAL · F1) → lista costo × 4.5 · piso × 3.5
 *   Nivel B (… · NO OIL · …)                    → lista costo × 3.5 · piso × 2.8
 * Ocho son F1 → A. #482 "Destino" es NO OIL → B.
 *
 * NO se usa el ×2.6 de _lib/pricing.ts a propósito: esa semilla es justo el
 * markup plano que el modelo de niveles existe para romper ("el 92% del costo
 * vendido salió a ~2.60×"). La nota del 20-ago separa los dos usos — el remate
 * de agosto rige para COTIZAR hasta el 31; los niveles son la referencia de
 * PRECIO DE LISTA del catálogo, que es lo que vive en la columna M.
 *
 * El piso NO se escribe en ninguna parte: es cifra interna y nunca se anuncia.
 * Queda en la observación para que el que negocie sepa hasta dónde puede bajar.
 *
 * Confirmado por el dueño el 2026-08-21.
 *
 * Uso:  node scripts/precios-lote-origen-170-2026-08-21.mjs            # dry-run
 *       node scripts/precios-lote-origen-170-2026-08-21.mjs --apply    # escribe
 * Después:  node scripts/sync-sot-convex.mjs --prod   (estampa precioFinalManual)
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const TAB = 'Inventario';
const STAMP = '2026-08-21';

const NIVEL = { A: { lista: 4.5, piso: 3.5 }, B: { lista: 3.5, piso: 2.8 } };

// itemId, nivel, lote de origen. El costo se LEE de la hoja, no se hardcodea:
// la columna L es propiedad de la hoja y es la única cifra que manda.
const PIEZAS = [
  { item: 544, nivel: 'A', lote: 'Lote Origen · 00-4' },
  { item: 546, nivel: 'A', lote: 'Lote Origen · 00-5' },
  { item: 549, nivel: 'A', lote: 'Lote Origen · 00-2' },
  { item: 545, nivel: 'A', lote: 'Lote Origen · 00-3' },
  { item: 482, nivel: 'B', lote: 'Lote Origen · 00-1' }, // NO OIL
  { item: 551, nivel: 'A', lote: 'Lote 170' },
  { item: 550, nivel: 'A', lote: 'Lote 170' },
  { item: 554, nivel: 'A', lote: 'Lote 170' },
  { item: 553, nivel: 'A', lote: 'Lote 170' },
];

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) {
  console.error('Falta GOOGLE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}
const rawKey = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const auth = new GoogleAuth({
  credentials: JSON.parse(rawKey),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = new sheets_v4.Sheets({ auth });

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const values = res.data.values;
const H = values[0];
const colLetter = (i) => {
  let s = '',
    n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const C_ITEM = H.indexOf('Item');
const C_NOMBRE = H.indexOf('Nombre');
const C_CALIDAD = H.indexOf('Calidad');
const C_COSTO = H.indexOf('costoBaseCOP');
const C_PRECIO = H.indexOf('precioFinalCOP');
const C_OBS = H.indexOf('observacion');
for (const [n, i] of [
  ['Item', C_ITEM],
  ['costoBaseCOP', C_COSTO],
  ['precioFinalCOP', C_PRECIO],
  ['observacion', C_OBS],
])
  if (i < 0) {
    console.error(`No encuentro la cabecera "${n}"`);
    process.exit(1);
  }
console.log(
  `Cabeceras: Item=${colLetter(C_ITEM)} costoBaseCOP=${colLetter(C_COSTO)} precioFinalCOP=${colLetter(C_PRECIO)} observacion=${colLetter(C_OBS)}\n`,
);

const byItem = new Map();
values.forEach((r, i) => {
  if (i && r && r[C_ITEM] !== '' && r[C_ITEM] != null)
    byItem.set(String(r[C_ITEM]).trim(), { fila: i + 1, r });
});

const updates = [],
  backup = [],
  problemas = [];
const append = (prev, nota) =>
  (prev && String(prev).trim() ? String(prev).trim() + ' · ' : '') + nota;

let totalCosto = 0,
  totalLista = 0,
  totalPiso = 0;

for (const p of PIEZAS) {
  const hit = byItem.get(String(p.item));
  if (!hit) {
    problemas.push(`#${p.item} no existe en la hoja`);
    continue;
  }
  const { fila, r } = hit;
  const costo = Number(r[C_COSTO]);
  if (!costo || costo <= 0) {
    problemas.push(
      `#${p.item} no tiene costo en la hoja — NO se le pone precio`,
    );
    continue;
  }
  const actual = r[C_PRECIO];
  if (actual !== '' && actual != null && Number(actual) !== 0) {
    problemas.push(
      `#${p.item} YA tiene precio ${actual} — no se toca (regla "nunca bajar")`,
    );
    continue;
  }
  const m = NIVEL[p.nivel];
  const lista = Math.round(costo * m.lista);
  const piso = Math.round(costo * m.piso);
  totalCosto += costo;
  totalLista += lista;
  totalPiso += piso;

  const nombre = String(r[C_NOMBRE] ?? '')
    .replace(/\n/g, ' ')
    .trim();
  console.log(
    `#${String(p.item).padEnd(4)} ${nombre.padEnd(22)} fila ${String(fila).padEnd(4)} ${String(r[C_CALIDAD] ?? '—').padEnd(8)} nivel ${p.nivel}  costo $${costo.toLocaleString('es-CO').padStart(12)}  →  lista $${lista.toLocaleString('es-CO').padStart(12)}  (piso $${piso.toLocaleString('es-CO')})`,
  );

  backup.push({
    item: p.item,
    fila,
    nombre,
    calidad: r[C_CALIDAD] ?? '',
    costo,
    precioAntes: actual ?? '',
    obsAntes: r[C_OBS] ?? '',
    listaEscrita: lista,
    piso,
  });
  updates.push({
    range: `${TAB}!${colLetter(C_PRECIO)}${fila}`,
    values: [[lista]],
  });
  updates.push({
    range: `${TAB}!${colLetter(C_OBS)}${fila}`,
    values: [
      [
        append(
          r[C_OBS],
          `Precio de lista ${STAMP}: $${lista.toLocaleString('es-CO')} = costo × ${m.lista} (Nivel ${p.nivel}, modelo calibrado 2026-08-20). Piso de negociación $${piso.toLocaleString('es-CO')} (× ${m.piso}) — INTERNO, no se anuncia. ${p.lote}.`,
        ),
      ],
    ],
  });
}

console.log(
  `\nCosto total  $${totalCosto.toLocaleString('es-CO')}\nLista total  $${totalLista.toLocaleString('es-CO')}\nPiso total   $${totalPiso.toLocaleString('es-CO')}  (interno)\n${updates.length} celdas en ${updates.length / 2} ítems`,
);
if (problemas.length) {
  console.log('\n⚠ Problemas:');
  problemas.forEach((p) => console.log('  - ' + p));
}
if (updates.length === 0) {
  console.log('\nNada que escribir.');
  process.exit(0);
}

if (!APPLY) {
  console.log('\nDRY-RUN. Correr con --apply para escribir.');
  process.exit(0);
}

mkdirSync('scripts/.backups', { recursive: true });
const bpath = `scripts/.backups/precios-lote-origen-170-ANTES-${STAMP}.json`;
writeFileSync(bpath, JSON.stringify(backup, null, 2));
console.log('\nBackup →', bpath);

const w = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { valueInputOption: 'RAW', data: updates },
});
console.log('Celdas actualizadas:', w.data.totalUpdatedCells);

// VERIFICACIÓN: releer y localizar por cabecera nombrada. `totalUpdatedCells`
// dice que la API respondió, no que la fila quedó donde debe (CLAUDE.md).
const check = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const H2 = check.data.values[0];
const P2 = H2.indexOf('precioFinalCOP');
const I2 = H2.indexOf('Item');
let ok = 0;
console.log('\n── VERIFICACIÓN (releyendo la hoja) ──');
for (const b of backup) {
  const fila = check.data.values.find(
    (r, i) => i && String(r?.[I2] ?? '').trim() === String(b.item),
  );
  const leido = fila ? Number(fila[P2]) : null;
  const bien = leido === b.listaEscrita;
  if (bien) ok++;
  console.log(
    `  ${bien ? '✅' : '❌'} #${b.item} → $${(leido ?? 0).toLocaleString('es-CO')} (esperado $${b.listaEscrita.toLocaleString('es-CO')})`,
  );
}
console.log(`\n${ok}/${backup.length} verificados en la hoja.`);
console.log(
  `\nAhora el pull, que además estampa precioFinalManual y los blinda:\n  node scripts/sync-sot-convex.mjs --prod\n`,
);
if (ok !== backup.length) process.exit(1);
