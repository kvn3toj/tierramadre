/**
 * Tanda de movimientos del 12-ago (instrucciones del dueño documentadas en
 * Anima, Wings/Projects/TierraMadre/inventario/) — aplicadas al SOT el 20-ago:
 *
 *  1. Fusión "Partículas de Luz": Shou (#383) → Teia (#382) → Kairos (#381),
 *     los tres del lote C-019 (facetada redonda 2 mm). Resultado confirmado por
 *     el dueño: #381 se renombra "Partículas de Luz" y queda con 11 unidades;
 *     #382 y #383 quedan en 0. Peso y costoBaseCOP del consolidado quedan
 *     PENDIENTES de recálculo físico — no se tocan (los valores actuales son
 *     del Kairos original de 5 unidades).
 *
 *  2. Las Artistas (#369): +2 unidades (topitos que regresaron de una
 *     producción no exitosa) → 9 pasa a 11.
 *
 * Reglas de la casa: dry-run por defecto, localizar por cabecera nombrada y por
 * clave, backup en scripts/.backups/, observacion se ANEXA, values.update
 * posicional sobre rangos cerrados.
 *
 * Uso:  node scripts/aplicar-fusion-particulas-y-artistas.mjs            # dry-run
 *       node scripts/aplicar-fusion-particulas-y-artistas.mjs --apply    # escribe
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
const FUENTE =
  'Fuente: Anima, notas de voz del dueño transcritas el 12-ago-2026';

// item, guardas {nombre?, cant}, cambios {nombre?, cant}, nota
const MOVS = [
  {
    item: 381,
    espera: { nombre: 'Kairos', cant: 5 },
    cambia: { nombre: 'Partículas de Luz', cant: 11 },
    nota: `Fusión del 12-ago-2026 aplicada al SOT el ${STAMP}: recibe las gemas de Teia (#382) y Shou (#383), los tres del lote C-019 (facetada redonda 2 mm). Renombrado de "Kairos" a "Partículas de Luz"; cantidad final confirmada por el dueño: 11. ⚠ Peso (ct) y costoBaseCOP pendientes de recálculo físico — los valores actuales son del Kairos original de 5 unidades, no del consolidado. ${FUENTE}.`,
  },
  {
    item: 382,
    espera: { nombre: 'Teia', cant: 5 },
    cambia: { cant: 0 },
    nota: `Fusionado el 12-ago-2026 (aplicado al SOT el ${STAMP}): sus unidades pasaron a #381 "Partículas de Luz" (lote C-019). Queda en 0. ⚠ Estaba en estado ASESOR al aplicar — verificar que el asesor no tenga las piezas. ${FUENTE}.`,
  },
  {
    item: 383,
    espera: { nombre: 'Shou', cant: 5 },
    cambia: { cant: 0 },
    nota: `Fusionado el 12-ago-2026 (aplicado al SOT el ${STAMP}): su última gema pasó vía Teia (#382) a #381 "Partículas de Luz" (lote C-019). Queda en 0. ${FUENTE}.`,
  },
  {
    item: 369,
    espera: { nombre: 'Las Artistas', cant: 9 },
    cambia: { cant: 11 },
    nota: `+2 unidades el 12-ago-2026 (aplicado al SOT el ${STAMP}): 2 topitos enviados a producción regresaron por producción no exitosa y se reintegran al lote C-018. 9 → 11. ${FUENTE}.`,
  },
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
const C_CANT = H.indexOf('Cant.');
const C_OBS = H.indexOf('observacion');
for (const [n, i] of [
  ['Item', C_ITEM],
  ['Nombre', C_NOMBRE],
  ['Cant.', C_CANT],
  ['observacion', C_OBS],
])
  if (i < 0) {
    console.error(`No encuentro la cabecera "${n}"`);
    process.exit(1);
  }
console.log(
  `Cabeceras: Item=${colLetter(C_ITEM)} Nombre=${colLetter(C_NOMBRE)} Cant.=${colLetter(C_CANT)} observacion=${colLetter(C_OBS)}\n`,
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

for (const m of MOVS) {
  const hit = byItem.get(m.item);
  if (!hit) {
    problemas.push(`#${m.item} no existe en la hoja`);
    continue;
  }
  const { fila, r } = hit;
  const nombre = String(r[C_NOMBRE]);
  const cant = Number(r[C_CANT]);
  if (m.espera.nombre && nombre !== m.espera.nombre) {
    problemas.push(
      `#${m.item} se llama "${nombre}", esperaba "${m.espera.nombre}" — NO se escribe`,
    );
    continue;
  }
  if (cant !== m.espera.cant) {
    problemas.push(
      `#${m.item} tiene Cant. ${cant}, esperaba ${m.espera.cant} — NO se escribe sin revisar`,
    );
    continue;
  }
  const partes = [];
  if (m.cambia.nombre) partes.push(`nombre "${nombre}" → "${m.cambia.nombre}"`);
  if (m.cambia.cant != null) partes.push(`Cant. ${cant} → ${m.cambia.cant}`);
  console.log(
    `#${m.item} ${nombre.padEnd(16)} fila ${fila}  ${partes.join('  ·  ')}`,
  );
  backup.push({
    item: m.item,
    fila,
    nombreAntes: nombre,
    cantAntes: cant,
    obsAntes: r[C_OBS] ?? '',
  });
  if (m.cambia.nombre)
    updates.push({
      range: `${TAB}!${colLetter(C_NOMBRE)}${fila}`,
      values: [[m.cambia.nombre]],
    });
  if (m.cambia.cant != null)
    updates.push({
      range: `${TAB}!${colLetter(C_CANT)}${fila}`,
      values: [[m.cambia.cant]],
    });
  updates.push({
    range: `${TAB}!${colLetter(C_OBS)}${fila}`,
    values: [[append(r[C_OBS], m.nota)]],
  });
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
const bpath = `scripts/.backups/fusion-particulas-artistas-ANTES-${STAMP}.json`;
writeFileSync(bpath, JSON.stringify(backup, null, 2));
console.log('\nBackup →', bpath);

const w = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { valueInputOption: 'RAW', data: updates },
});
console.log('Celdas actualizadas:', w.data.totalUpdatedCells);
