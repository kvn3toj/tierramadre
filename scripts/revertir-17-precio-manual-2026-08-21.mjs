/**
 * Revierte los 17 ítems que la corrida de niveles A/B/C del 2026-08-21 repreció
 * sin que debiera — los que YA traían `precioFinalManual: true`.
 *
 * POR QUÉ. El filtro de esa corrida fue «precio vigente == costo × 2.6», con la
 * idea de tocar sólo la semilla plana que el sistema siembra. La aritmética se
 * aplicó bien, pero la premisa era falsa: esa igualdad también aparece cuando un
 * humano tecleó un PRECIO REDONDO y el costo se derivó hacia atrás. La firma no
 * son decimales en el costo (los 17 son enteros de pesos) sino el precio redondo
 * con un costo feo que es exactamente `precio / 2.6` redondeado:
 *
 *   #52  precio $340.000     → costo $130.769   (340.000 / 2.6 = 130.769,2)
 *   #421 precio $210.000     → costo  $80.769   (210.000 / 2.6 =  80.769,2)
 *   #129 precio $17.280.000  → costo $6.646.154 (17.280.000 / 2.6 = 6.646.153,8)
 *
 * El marcador canónico de «esto lo puso un humano» es `precioFinalManual`, que
 * el pull sólo estampa cuando una celda de M cambió de verdad
 * (`convex/_lib/sheetPullMaps.ts:524`). Ese es el filtro correcto, no la
 * aritmética. Lo formaliza `docs/superpowers/specs/2026-08-21-campos-protegidos-design.md`.
 *
 * Decisión de Kevin (2026-08-21): revertir los 17. Los 34 restantes —semilla
 * legítima, sin sello previo— se quedan repreciados.
 *
 * Fuentes (ambas en scripts/.backups/, gitignoreadas):
 *   · `niveles-abc-operativo-ANTES-2026-08-21.json` — qué escribió la corrida
 *   · `precios-y-costos-ANTES-2026-08-21.json`      — quién tenía el sello
 *
 * Uso:  node scripts/revertir-17-precio-manual-2026-08-21.mjs          # dry-run
 *       node scripts/revertir-17-precio-manual-2026-08-21.mjs --apply
 * Después:  node scripts/sync-sot-convex.mjs --prod
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const TAB = 'Inventario';
const cop = (v) => '$' + Math.round(v).toLocaleString('es-CO');

const escrito = JSON.parse(readFileSync('scripts/.backups/niveles-abc-operativo-ANTES-2026-08-21.json', 'utf8')).items;
const prod = new Map(JSON.parse(readFileSync('scripts/.backups/precios-y-costos-ANTES-2026-08-21.json', 'utf8')).prod);

const objetivo = escrito.filter((e) => prod.get(String(e.item))?.precioFinalManual === true);
console.log(`Escritos por la corrida: ${escrito.length} · con sello manual previo: ${objetivo.length}\n`);
if (objetivo.length !== 17) {
  console.error(`⛔ ABORTO: esperaba 17 y encontré ${objetivo.length}. Revisar antes de tocar.`);
  process.exit(1);
}

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) { console.error('Falta GOOGLE_SERVICE_ACCOUNT_KEY'); process.exit(1); }
const rawKey = key.trim().startsWith('{') ? key : Buffer.from(key, 'base64').toString();
const auth = new GoogleAuth({ credentials: JSON.parse(rawKey), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = new sheets_v4.Sheets({ auth });

const res = await sheets.spreadsheets.values.get({ spreadsheetId: SOT3, range: TAB, valueRenderOption: 'UNFORMATTED_VALUE' });
const values = res.data.values;
const H = values[0];
const colLetter = (i) => { let s = '', n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
const C_ITEM = H.indexOf('Item'), C_PRECIO = H.indexOf('precioFinalCOP'), C_OBS = H.indexOf('observacion');
for (const [n, i] of [['Item', C_ITEM], ['precioFinalCOP', C_PRECIO], ['observacion', C_OBS]])
  if (i < 0) { console.error(`No encuentro la cabecera "${n}"`); process.exit(1); }

const filaDe = new Map();
values.forEach((r, i) => { if (i && r?.[C_ITEM] != null && r[C_ITEM] !== '') filaDe.set(String(r[C_ITEM]).trim(), i + 1); });

const NOTA = (e) => `Repreciado a ${cop(e.precioDespues)} por la corrida de niveles del 2026-08-21 y REVERTIDO el mismo día a ${cop(e.precioAntes)}: la pieza ya tenía precioFinalManual, o sea precio puesto a mano, y el filtro de esa corrida (precio == costo x 2.6) no lo distinguía de la semilla del sistema. Decisión de Kevin.`;

// ── Guarda del badge de promoción ────────────────────────────────────────────
// El badge público «Precio especial por cierre de temporada» NO es un campo: se
// DERIVA de que `observacion` TERMINE con la etiqueta canónica
// (`convex/_lib/precioEspecial.ts`). Como acá se ANEXA a `observacion`, hay dos
// formas de romperlo sin querer, y las dos se le muestran al cliente:
//   · encenderlo — si el texto nuevo terminara con la etiqueta;
//   · apagarlo   — si la observación previa terminaba con ella y le pegamos algo
//                  detrás, mientras la promo sigue vigente.
// La etiqueta se LEE del módulo de Convex en vez de copiarse: es .ts y esto es
// .mjs, así que no se puede importar, pero un literal duplicado quedaría obsoleto
// en silencio el día que allá cambie el texto.
function leerConstantesPromo() {
  const ruta = 'convex/_lib/precioEspecial.ts';
  let src;
  try { src = readFileSync(ruta, 'utf8'); }
  catch { throw new Error(`No pude leer ${ruta} — el guard del badge no puede validarse. Abortado.`); }
  const etiqueta = src.match(/ETIQUETA_PRECIO_ESPECIAL\s*=\s*\n?\s*'([^']+)'/)?.[1];
  const hasta = src.match(/PRECIO_ESPECIAL_HASTA\s*=\s*'([^']+)'/)?.[1];
  if (!etiqueta || !hasta) throw new Error(`No encontré ETIQUETA_PRECIO_ESPECIAL / PRECIO_ESPECIAL_HASTA en ${ruta}. Abortado.`);
  return { etiqueta, vigente: Date.now() <= Date.parse(`${hasta}T23:59:59.999-05:00`) };
}
const PROMO = leerConstantesPromo();

function revisarBadge(item, obsAntes, obsNueva) {
  if (obsNueva.trimEnd().endsWith(PROMO.etiqueta))
    throw new Error(`#${item}: la observación resultante TERMINA con la etiqueta de promoción — le encendería el badge de cierre de temporada en el catálogo público. Abortado.`);
  if (PROMO.vigente && String(obsAntes ?? '').trimEnd().endsWith(PROMO.etiqueta))
    throw new Error(`#${item}: la observación previa terminaba con la etiqueta y la promo SIGUE VIGENTE — anexarle texto APAGA el badge que el cliente ve hoy. Abortado.`);
}

const updates = [], problemas = [];
let sumA = 0, sumD = 0;
for (const e of objetivo) {
  const fila = filaDe.get(String(e.item));
  if (!fila) { problemas.push(`#${e.item} ya no está en la hoja`); continue; }
  const vivo = Number(values[fila - 1]?.[C_PRECIO]) || 0;
  if (vivo !== e.precioDespues) { problemas.push(`#${e.item} está en ${vivo}, esperaba ${e.precioDespues} — alguien lo movió después; NO se toca`); continue; }
  sumD += e.precioDespues; sumA += e.precioAntes;
  console.log(`  #${String(e.item).padStart(4)} ${e.nombre.slice(0,26).padEnd(26)} ${cop(e.precioDespues).padStart(12)} → ${cop(e.precioAntes).padStart(12)}  (vuelve)`);
  const obsNueva = (String(e.obsAntes ?? '').trim() ? String(e.obsAntes).trim() + ' · ' : '') + NOTA(e);
  revisarBadge(e.item, e.obsAntes, obsNueva);
  updates.push({ range: `${TAB}!${colLetter(C_PRECIO)}${fila}`, values: [[e.precioAntes]] });
  updates.push({ range: `${TAB}!${colLetter(C_OBS)}${fila}`,    values: [[obsNueva]] });
}
console.log(`\nRevierten ${updates.length / 2} ítems: ${cop(sumD)} → ${cop(sumA)}  (−${cop(sumD - sumA)})`);
if (problemas.length) { console.log('\n⚠ No se tocan:'); problemas.forEach((p) => console.log('  - ' + p)); }
if (!updates.length) { console.log('Nada que revertir.'); process.exit(0); }

writeFileSync('scripts/.backups/revert-17-ANTES-2026-08-21.json', JSON.stringify(objetivo, null, 2));
if (!APPLY) { console.log('\nDRY-RUN. Correr con --apply para escribir.'); process.exit(0); }

const w = await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: SOT3, requestBody: { valueInputOption: 'RAW', data: updates } });
console.log('\nCeldas actualizadas (según la API):', w.data.totalUpdatedCells);

const check = await sheets.spreadsheets.values.get({ spreadsheetId: SOT3, range: TAB, valueRenderOption: 'UNFORMATTED_VALUE' });
const H2 = check.data.values[0], cI = H2.indexOf('Item'), cP = H2.indexOf('precioFinalCOP');
const vivo = new Map();
check.data.values.forEach((r, i) => { if (i && r?.[cI] != null && r[cI] !== '') vivo.set(String(r[cI]).trim(), Number(r[cP]) || 0); });
let ok = 0; const mal = [];
for (const e of objetivo) (vivo.get(String(e.item)) === e.precioAntes) ? ok++ : mal.push(`#${e.item} leí ${vivo.get(String(e.item))}, esperaba ${e.precioAntes}`);
console.log(`Verificado releyendo la hoja: ${ok}/${objetivo.length} volvieron a su precio anterior`);
if (mal.length) { console.error('⛔ NO volvieron:'); mal.forEach((m) => console.error('   ' + m)); process.exit(1); }
console.log('\n✅ Revertidos. Ahora:  node scripts/sync-sot-convex.mjs --prod');
