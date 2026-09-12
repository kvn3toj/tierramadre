/**
 * Carga el costo de los tres lotes del "Lote Origen" en el SOT v3.
 *
 * Fuente: tablas Extrafine / Fine (18 certificados) + tabla de costos por lote
 * (Lote Origen $155M / Lote 170 $125M / Lote piedra Lágrima $65M), contrastadas
 * contra la presentación "Ver lote Origen" de Drive
 * (1tw2TSJ3tg6J79suh0eVUcldjMTwCDgZ8QU6hiw-M_ss), que trae los mismos 18 reports
 * con sus códigos de lote (00-1…00-5, 170-2).
 *
 * Regla de costo confirmada 2026-08-20: costoBaseCOP = ct × COP/ct lapidado del lote.
 *   Lote Origen  $10.058.404 /ct   (155.000.000 / 15,41)
 *   Lote 170     $ 3.723.563 /ct   (125.000.000 / 33,57)
 *
 * Solo se escriben los 8 cruces de confianza alta. Quedan fuera a propósito:
 *   #484 Magia  — 4,44 ct: no se sabe si es el Lote piedra Lágrima ($65M) o del 170 ($16,5M)
 *   #545 Sentir de la Montaña — dos reports de 2,15 ct compiten por el mismo ítem
 *   #483 Gratitud — cruce probable con el report 028564, falta confirmar el corte
 * A esos tres solo se les anexa una observación.
 *
 * No se toca loteId, ni precioFinalCOP, ni la columna J.
 *
 * Uso:  node scripts/aplicar-costos-lote-origen.mjs            # dry-run
 *       node scripts/aplicar-costos-lote-origen.mjs --apply    # escribe
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const TAB = 'Inventario';
const STAMP = '2026-08-20';

const RATE = { origen: 155000000 / 15.41, l170: 125000000 / 33.57 };

// itemId, report, ct del certificado, lote, costo
const COSTOS = [
  [546, '025893', 3.87, 'origen', 'Lote Origen · 00-5'],
  [544, '025890', 4.11, 'origen', 'Lote Origen · 00-4'],
  [549, '025892', 2.31, 'origen', 'Lote Origen · 00-2'],
  [482, '025887', 0.92, 'origen', 'Lote Origen · 00-1'],
  [551, '028563', 1.48, 'l170',   'Lote 170'],
  [550, '028565', 1.00, 'l170',   'Lote 170'],
  [553, '028562', 0.84, 'l170',   'Lote 170'],
  [554, '028613', 0.89, 'l170',   'Lote 170'],
].map(([item, report, ct, lote, etiqueta]) => ({
  item, report, ct, lote, etiqueta,
  costo: Math.round(ct * RATE[lote]),
  nota: `Costo cargado ${STAMP}: report ${report} (${etiqueta}), ${ct.toFixed(2)} ct × $${Math.round(RATE[lote]).toLocaleString('es-CO')}/ct lapidado. Fuente: tablas Extrafine/Fine + presentación "Ver lote Origen". loteId sin tocar.`,
}));

const PENDIENTES = [
  { item: 484, nota: `Revisión ${STAMP}: cruza con el report 028619 (4,44 ct, corte lágrima). SIN COSTAR a propósito: 4,44 ct es también el rendimiento íntegro del "Lote piedra Lágrima" ($65.000.000 = $14.639.640/ct), pero si la piedra sale del Lote 170 el costo es $16.532.620. Resolver contra la factura antes de costear.` },
  { item: 545, nota: `Revisión ${STAMP}: dos certificados de 2,15 ct compiten por este ítem — 025891 (Extrafine, lote 00-3, costo $21.625.569) y 028617 (Fine, costo $8.005.660). SIN COSTAR hasta identificar la piedra por foto o medida (10,09 × 5,59 mm).` },
  { item: 483, nota: `Revisión ${STAMP}: cruce probable con el report 028564 (0,89 ct, corazón, No-Oil) → costo $3.313.971 por el Lote 170. SIN COSTAR hasta confirmar el corte; el ítem no lo tiene registrado.` },
];

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) { console.error('Falta GOOGLE_SERVICE_ACCOUNT_KEY'); process.exit(1); }
const rawKey = key.trim().startsWith('{') ? key : Buffer.from(key, 'base64').toString();
const auth = new GoogleAuth({ credentials: JSON.parse(rawKey), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = new sheets_v4.Sheets({ auth });

const res = await sheets.spreadsheets.values.get({ spreadsheetId: SOT3, range: TAB, valueRenderOption: 'UNFORMATTED_VALUE' });
const values = res.data.values;
const H = values[0];
const colLetter = i => { let s = '', n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

const C_ITEM = H.indexOf('Item');
const C_NOMBRE = H.indexOf('Nombre');
const C_CT = H.indexOf('Peso (ct)');
const C_COSTO = H.indexOf('costoBaseCOP');
const C_OBS = H.indexOf('observacion');
for (const [n, i] of [['Item', C_ITEM], ['costoBaseCOP', C_COSTO], ['observacion', C_OBS]])
  if (i < 0) { console.error(`No encuentro la cabecera "${n}"`); process.exit(1); }
console.log(`Cabeceras: Item=${colLetter(C_ITEM)} costoBaseCOP=${colLetter(C_COSTO)} observacion=${colLetter(C_OBS)}\n`);

const byItem = new Map();
values.forEach((r, i) => { if (i && r && r[C_ITEM] !== '' && r[C_ITEM] != null) byItem.set(Number(r[C_ITEM]), { fila: i + 1, r }); });

const updates = [], backup = [], problemas = [];
const append = (prev, nota) => (prev && String(prev).trim() ? String(prev).trim() + ' · ' : '') + nota;

console.log('── COSTOS ──');
for (const c of COSTOS) {
  const hit = byItem.get(c.item);
  if (!hit) { problemas.push(`#${c.item} no existe en la hoja`); continue; }
  const { fila, r } = hit;
  const actual = r[C_COSTO];
  if (actual !== '' && actual != null && Number(actual) !== 0) {
    problemas.push(`#${c.item} ya tiene costo ${actual} — NO se sobrescribe`); continue;
  }
  const ctSot = Number(r[C_CT]) || 0;
  const delta = Math.abs(ctSot - c.ct);
  console.log(`#${c.item} ${String(r[C_NOMBRE]).padEnd(24)} fila ${fila}  ${ctSot.toFixed(2)} ct (cert ${c.ct.toFixed(2)}, Δ${delta.toFixed(2)})  →  $${c.costo.toLocaleString('es-CO')}   [${c.etiqueta}]`);
  backup.push({ item: c.item, fila, nombre: r[C_NOMBRE], costoAntes: actual ?? '', obsAntes: r[C_OBS] ?? '' });
  updates.push({ range: `${TAB}!${colLetter(C_COSTO)}${fila}`, values: [[c.costo]] });
  updates.push({ range: `${TAB}!${colLetter(C_OBS)}${fila}`, values: [[append(r[C_OBS], c.nota)]] });
}

console.log('\n── SOLO OBSERVACIÓN (sin costo) ──');
for (const p of PENDIENTES) {
  const hit = byItem.get(p.item);
  if (!hit) { problemas.push(`#${p.item} no existe en la hoja`); continue; }
  const { fila, r } = hit;
  console.log(`#${p.item} ${String(r[C_NOMBRE]).padEnd(24)} fila ${fila}  → nota de revisión`);
  backup.push({ item: p.item, fila, nombre: r[C_NOMBRE], costoAntes: r[C_COSTO] ?? '', obsAntes: r[C_OBS] ?? '' });
  updates.push({ range: `${TAB}!${colLetter(C_OBS)}${fila}`, values: [[append(r[C_OBS], p.nota)]] });
}

const total = COSTOS.reduce((a, c) => a + c.costo, 0);
console.log(`\nTotal a escribir: $${total.toLocaleString('es-CO')} en ${COSTOS.length} ítems · ${updates.length} celdas`);
if (problemas.length) { console.log('\n⚠ Problemas:'); problemas.forEach(p => console.log('  - ' + p)); }

if (!APPLY) { console.log('\nDRY-RUN. Correr con --apply para escribir.'); process.exit(0); }

mkdirSync('scripts/.backups', { recursive: true });
const bpath = `scripts/.backups/costos-lote-origen-ANTES-${STAMP}.json`;
writeFileSync(bpath, JSON.stringify(backup, null, 2));
console.log('\nBackup →', bpath);

const w = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { valueInputOption: 'RAW', data: updates },
});
console.log('Celdas actualizadas:', w.data.totalUpdatedCells);
