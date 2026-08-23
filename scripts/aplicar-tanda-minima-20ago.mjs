/**
 * Tanda mínima del 20-ago — dos escrituras con evidencia cerrada:
 *
 *  1. #551 Latido de la Tierra: Peso (ct) 1,40 → 1,48.
 *     Tres fuentes coinciden (hoja "Inventario 12 Agosto", papel de conteo,
 *     report 028563) y el costo ya aplicado se calculó con 1,48.
 *
 *  2. #545 Sentir de la Montaña: costoBaseCOP = round(2,15 × 155.000.000/15,41).
 *     El duplicado de 2,15 ct quedó resuelto mirando los certificados en la
 *     presentación "ARE TRÜST - EMERALD OFFER": 025891 (lote 00-3, Extrafine,
 *     No-Oil) mide 5,59 × 10,15 × 4,78 mm — las 10,09 × 5,59 del ítem con los
 *     ejes invertidos. El 028617 (8,45 × 7,35 mm, corte esmeralda, F2) es otra
 *     piedra y queda sin ítem.
 *
 * Reglas de la casa: dry-run por defecto, localizar por cabecera nombrada y por
 * clave, backup en scripts/.backups/, observacion se ANEXA, values.update
 * posicional sobre rangos cerrados (nunca append con rango abierto).
 *
 * Uso:  node scripts/aplicar-tanda-minima-20ago.mjs            # dry-run
 *       node scripts/aplicar-tanda-minima-20ago.mjs --apply    # escribe
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

const RATE_ORIGEN = 155000000 / 15.41;
const COSTO_545 = Math.round(2.15 * RATE_ORIGEN);

const NOTA_551 = `Peso corregido 1,40 → 1,48 el ${STAMP}: coinciden la hoja "Inventario 12 Agosto", el papel de conteo y el report 028563. El costo ya estaba calculado con 1,48.`;
const NOTA_545 = `Costo cargado ${STAMP}: report 025891 (Lote Origen · 00-3, Extrafine, No-Oil), 2,15 ct × $${Math.round(RATE_ORIGEN).toLocaleString('es-CO')}/ct lapidado. Duplicado de 2,15 ct resuelto por dimensiones del certificado (5,59 × 10,15 × 4,78 mm = las 10,09 × 5,59 del ítem con ejes invertidos); el 028617 (8,45 × 7,35 mm, corte esmeralda, F2) es otra piedra y queda sin ítem. Cierra la revisión del mismo día.`;

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
const C_PESO = H.indexOf('Peso (ct)');
const C_COSTO = H.indexOf('costoBaseCOP');
const C_OBS = H.indexOf('observacion');
for (const [n, i] of [
  ['Item', C_ITEM],
  ['Peso (ct)', C_PESO],
  ['costoBaseCOP', C_COSTO],
  ['observacion', C_OBS],
])
  if (i < 0) {
    console.error(`No encuentro la cabecera "${n}"`);
    process.exit(1);
  }
console.log(
  `Cabeceras: Item=${colLetter(C_ITEM)} Peso=${colLetter(C_PESO)} costoBaseCOP=${colLetter(C_COSTO)} observacion=${colLetter(C_OBS)}\n`,
);

const byItem = new Map();
values.forEach((r, i) => {
  if (i && r && r[C_ITEM] !== '' && r[C_ITEM] != null)
    byItem.set(Number(r[C_ITEM]), { fila: i + 1, r });
});

const append = (prev, nota) => {
  const p = String(prev ?? '').trim();
  return p ? `${p} · ${nota}` : nota;
};
const updates = [];
const backup = [];
const problemas = [];

// ── #551: peso 1,40 → 1,48 ──
{
  const hit = byItem.get(551);
  if (!hit) problemas.push('#551 no existe en la hoja');
  else {
    const { fila, r } = hit;
    const actual = Number(r[C_PESO]);
    if (Math.abs(actual - 1.48) < 1e-9) {
      console.log(
        `#551 ${r[C_NOMBRE]} fila ${fila}: el peso YA es 1.48 — nada que escribir`,
      );
    } else if (Math.abs(actual - 1.4) > 1e-9) {
      problemas.push(
        `#551 tiene peso ${actual}, esperaba 1.40 — NO se escribe sin revisar`,
      );
    } else {
      console.log(`#551 ${r[C_NOMBRE]} fila ${fila}: peso ${actual} → 1.48`);
      backup.push({
        item: 551,
        fila,
        nombre: r[C_NOMBRE],
        pesoAntes: actual,
        obsAntes: r[C_OBS] ?? '',
      });
      updates.push({
        range: `${TAB}!${colLetter(C_PESO)}${fila}`,
        values: [[1.48]],
      });
      updates.push({
        range: `${TAB}!${colLetter(C_OBS)}${fila}`,
        values: [[append(r[C_OBS], NOTA_551)]],
      });
    }
  }
}

// ── #545: costo del report 025891 ──
{
  const hit = byItem.get(545);
  if (!hit) problemas.push('#545 no existe en la hoja');
  else {
    const { fila, r } = hit;
    const actual = r[C_COSTO];
    if (actual != null && actual !== '' && Number(actual) !== 0) {
      problemas.push(`#545 ya tiene costo ${actual} — NO se sobrescribe`);
    } else {
      console.log(
        `#545 ${r[C_NOMBRE]} fila ${fila}: costo → $${COSTO_545.toLocaleString('es-CO')}  [025891 · Lote Origen 00-3]`,
      );
      backup.push({
        item: 545,
        fila,
        nombre: r[C_NOMBRE],
        costoAntes: actual ?? '',
        obsAntes: r[C_OBS] ?? '',
      });
      updates.push({
        range: `${TAB}!${colLetter(C_COSTO)}${fila}`,
        values: [[COSTO_545]],
      });
      updates.push({
        range: `${TAB}!${colLetter(C_OBS)}${fila}`,
        values: [[append(r[C_OBS], NOTA_545)]],
      });
    }
  }
}

console.log(`\nCeldas a escribir: ${updates.length}`);
if (problemas.length) {
  console.log('\n⚠ Problemas:');
  problemas.forEach((p) => console.log('  - ' + p));
}
if (!updates.length) {
  console.log('\nNada que aplicar.');
  process.exit(problemas.length ? 1 : 0);
}

if (!APPLY) {
  console.log('\nDRY-RUN. Correr con --apply para escribir.');
  process.exit(0);
}

mkdirSync('scripts/.backups', { recursive: true });
const bpath = `scripts/.backups/tanda-minima-ANTES-${STAMP}.json`;
writeFileSync(bpath, JSON.stringify(backup, null, 2));
console.log('\nBackup →', bpath);

const w = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { valueInputOption: 'RAW', data: updates },
});
console.log('Celdas actualizadas:', w.data.totalUpdatedCells);
