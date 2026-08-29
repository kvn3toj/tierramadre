/**
 * Aplica el modelo de niveles A/B/C al CATÁLOGO OPERATIVO — 2026-08-21.
 *
 * ALCANCE, dictado por Kevin:
 *   · estado ∈ {DISPONIBLE, ASESOR, CONSIGNACION} — nada más se toca.
 *     `VENDIDA` jamás: esas filas son el registro histórico que calibró el modelo.
 *   · SIN la bóveda de Bogotá (`UBICACIÓN` = OFI.BOGOTA). Las 30 piezas de bóveda
 *     concentran el 86% del costo en alcance y su ×4.5 no tiene respaldo empírico
 *     (el costo más alto jamás vendido por la casa es $10,6M). Van por avalúo
 *     pieza por pieza, en una decisión aparte.
 *
 * MODELO: nota Anima `2026-08-20-modelo-niveles-piso-lista-calibrado`, con la
 * meseta del ticket mínimo incorporada el 2026-08-21 (`min(costo, $100.000)`).
 * Solo se escribe la LISTA (columna `precioFinalCOP`). El PISO no va a la hoja:
 * es banda de negociación interna y «nunca se anuncia» — sale en un JSON aparte.
 *
 * RIELES (CLAUDE.md + auditoría de rieles del 2026-08-21):
 *   · Localización por CABECERA NOMBRADA, nunca por posición.
 *   · `values.update` por celda sobre rango CERRADO — nunca `values.append`.
 *   · Respaldo a disco antes de escribir.
 *   · Verificación releyendo la hoja; `totalUpdatedCells` sólo prueba que la API
 *     respondió 2xx, no que la fila quedó donde debe.
 *   · Se escribe en la HOJA (columna M es sheet-owned desde 2026-07-23), no en
 *     Convex: `convex/products.ts` manda costo/precio con `?? ''` y borraría.
 *
 * DESPUÉS DE --apply, obligatorio:  node scripts/sync-sot-convex.mjs --prod
 * El pull estampa `precioFinalManual`, único escudo contra el re-fan costo×2.6.
 * ⚠ Que NADIE corra `migrations:backfillPrecioFinal` hasta que el PR #146 esté
 *   en main: hoy ignora ese flag y revertiría todo esto.
 *
 * Uso:  node scripts/aplicar-niveles-abc-operativo-2026-08-21.mjs          # dry-run
 *       node scripts/aplicar-niveles-abc-operativo-2026-08-21.mjs --apply  # escribe
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const TAB = 'Inventario';
const STAMP = '2026-08-21';

const EN_ALCANCE = new Set(['DISPONIBLE', 'ASESOR', 'CONSIGNACION']);
const BOVEDA = 'OFI.BOGOTA';
const YA_HECHOS = new Set(['577','578','579','584','544','545','546','549','550','551','553','554','482']);

const NIVELES = { A: { lista: 4.5, piso: 3.5 }, B: { lista: 3.5, piso: 2.8 }, C: { lista: 2.0, piso: 1.5 } };
const POR_CALIDAD = new Map(Object.entries({
  'FINA SUBLIME':'A','FINA ESENCIAL':'A','F1':'A',
  'FINA':'B','FINA COMERCIAL':'B','F2':'B','COMERCIAL SÚPER FINA':'B','COMERCIAL SUPERIOR':'B',
  'NO OIL':'B','MORRALLA FINA':'B',
  'COMERCIAL FINA':'C','COMERCIAL ESTÁNDAR':'C','MORRALLA COMERCIAL':'C','PLATA COMERCIAL':'C',
  'VARIADA':'C','INSUMO':'C','MARKETING':'C','TOPITOS':'C',
}));

function nivelDe(calidad) {
  const c = String(calidad ?? '').trim();
  if (c === '') return { nivel: 'B', provisional: true };   // el modelo lo dicta
  const n = POR_CALIDAD.get(c.toUpperCase());
  return { nivel: n ?? null, provisional: false };           // desconocida ≠ vacía: no se adivina
}
const ticketLista = (c) => Math.min(c, 100_000) * 3.0;
const ticketPiso  = (c) => Math.min(c, 100_000) * 2.5;
const redondeo = (v) => { const p = v < 1e6 ? 10_000 : v < 1e8 ? 100_000 : 1e6; return Math.ceil(v / p) * p; };
const cop = (v) => '$' + Math.round(v).toLocaleString('es-CO');

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) { console.error('Falta GOOGLE_SERVICE_ACCOUNT_KEY'); process.exit(1); }
const rawKey = key.trim().startsWith('{') ? key : Buffer.from(key, 'base64').toString();
const auth = new GoogleAuth({ credentials: JSON.parse(rawKey), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = new sheets_v4.Sheets({ auth });

const res = await sheets.spreadsheets.values.get({ spreadsheetId: SOT3, range: TAB, valueRenderOption: 'UNFORMATTED_VALUE' });
const values = res.data.values;
const H = values[0];
const colLetter = (i) => { let s = '', n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

const COLS = { item:'Item', nombre:'Nombre', calidad:'Calidad', costo:'costoBaseCOP',
               precio:'precioFinalCOP', ubic:'UBICACIÓN', estado:'ESTADO', obs:'observacion' };
const IX = {};
for (const [k, name] of Object.entries(COLS)) {
  IX[k] = H.indexOf(name);
  if (IX[k] < 0) { console.error(`No encuentro la cabecera "${name}".\nCabeceras: ${H.join(' | ')}`); process.exit(1); }
}
console.log('Cabeceras localizadas:', Object.entries(IX).map(([k,i]) => `${k}=${colLetter(i)}`).join(' '), '\n');

const cubetas = { candidatos: [], aplica: [], nuncaBajar: [], precioHumano: [], sinPrecio: [], boveda: [], sinCosto: [], sinClasificar: [], yaHecho: [], fueraAlcance: 0 };

for (let i = 1; i < values.length; i++) {
  const r = values[i] ?? [];
  const item = String(r[IX.item] ?? '').trim();
  if (!item) continue;
  const estado = String(r[IX.estado] ?? '').trim().toUpperCase();
  if (!EN_ALCANCE.has(estado)) { cubetas.fueraAlcance++; continue; }

  const f = {
    item, fila: i + 1,
    nombre: String(r[IX.nombre] ?? '').replace(/\n/g, ' ').trim(),
    calidad: String(r[IX.calidad] ?? '').trim(),
    ubic: String(r[IX.ubic] ?? '').trim(),
    costo: Number(r[IX.costo]) || 0,
    vigente: Number(r[IX.precio]) || 0,
    obs: r[IX.obs] ?? '',
  };

  if (YA_HECHOS.has(item)) { cubetas.yaHecho.push(f); continue; }
  if (f.ubic === BOVEDA)   { cubetas.boveda.push(f); continue; }
  if (!f.costo)            { cubetas.sinCosto.push(f); continue; }
  const { nivel, provisional } = nivelDe(f.calidad);
  if (!nivel)              { cubetas.sinClasificar.push(f); continue; }

  const m = NIVELES[nivel];
  f.nivel = nivel; f.provisional = provisional;
  f.lista = redondeo(Math.max(f.costo * m.lista, ticketLista(f.costo)));
  f.piso  = redondeo(Math.max(f.costo * m.piso,  ticketPiso(f.costo)));
  f.mult  = +(f.lista / f.costo).toFixed(2);

  if (!f.vigente) { cubetas.sinPrecio.push(f); continue; }
  cubetas.candidatos.push(f);
}

// ── Quién es dueño del precio: el sello, no la aritmética ────────────────────
// La primera versión de este script filtró por «precio == costo × 2.6», creyendo
// que esa igualdad identificaba la semilla plana del sistema. Es ambigua: también
// aparece cuando un humano teclea un PRECIO REDONDO y el costo se deriva hacia
// atrás. El 2026-08-21 eso repreció 17 ítems que ya tenían precio a mano y hubo
// que revertirlos (scripts/revertir-17-precio-manual-2026-08-21.mjs).
//
// El marcador canónico es `precioFinalManual`, que el pull sólo estampa cuando
// una celda de M CAMBIÓ de verdad (convex/_lib/sheetPullMaps.ts:524) — o sea,
// cuando alguien la tecleó. No vive en la hoja, así que se lee de Convex.
//
// Un ítem con el sello NO se reprecia solo: hay que nombrarlo con --incluir. Así
// el lote del remate (135 ítems que vencen el 2026-08-31) se reprecia el 1 de
// septiembre como una decisión enumerada, no como un efecto colateral.
const CONVEX_URL = process.env.CONVEX_URL_PROD ?? 'https://valuable-mule-753.convex.cloud';
async function selloManual(itemIds) {
  const flags = new Map();
  const lotes = [];
  for (let i = 0; i < itemIds.length; i += 40) lotes.push(itemIds.slice(i, i + 40));
  for (const lote of lotes) {
    const res = await Promise.all(lote.map(async (itemId) => {
      const r = await fetch(`${CONVEX_URL}/api/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'products:getByItem', args: { itemId }, format: 'json' }),
      });
      if (!r.ok) throw new Error(`Convex respondió ${r.status} leyendo #${itemId} — sin el sello no se puede decidir. Abortado.`);
      const j = await r.json();
      if (j.status !== 'success') throw new Error(`Convex falló en #${itemId}: ${JSON.stringify(j).slice(0, 200)}. Abortado.`);
      return [itemId, j.value?.precioFinalManual === true];
    }));
    for (const [k, v] of res) flags.set(k, v);
  }
  return flags;
}

const incluir = new Set((process.argv.find((a) => a.startsWith('--incluir='))?.split('=')[1] ?? '')
  .split(',').map((x) => x.trim()).filter(Boolean));
console.log(`Leyendo precioFinalManual de ${cubetas.candidatos.length} candidatos en Convex prod...`);
const sello = await selloManual(cubetas.candidatos.map((f) => f.item));

for (const f of cubetas.candidatos) {
  if (sello.get(f.item) && !incluir.has(f.item)) { cubetas.precioHumano.push(f); continue; }
  if (f.vigente >= f.lista) cubetas.nuncaBajar.push(f);   // nunca bajar (empate incluido)
  else cubetas.aplica.push(f);
}
if (incluir.size) console.log(`Forzados con --incluir: ${[...incluir].join(' ')}`);

console.log(`Filas fuera de alcance, intactas: ${cubetas.fueraAlcance}`);
for (const [k, v] of Object.entries(cubetas)) if (Array.isArray(v)) console.log(`  ${k.padEnd(15)} ${String(v.length).padStart(4)}`);

const antes = cubetas.aplica.reduce((a, f) => a + f.vigente, 0);
const despues = cubetas.aplica.reduce((a, f) => a + f.lista, 0);
console.log(`\nA ESCRIBIR: ${cubetas.aplica.length} ítems · lista ${cop(antes)} → ${cop(despues)}  (+${cop(despues - antes)})`);
const porNivel = {};
for (const f of cubetas.aplica) (porNivel[f.nivel] ??= []).push(f);
for (const [n, fs] of Object.entries(porNivel).sort())
  console.log(`   Nivel ${n}: ${String(fs.length).padStart(3)}   (${fs.filter(x=>x.provisional).length} por calidad vacía → B provisional)`);

// Guarda de cordura contra una lectura de sellos que venga vacía o corrupta. Una desviación grande significa
// que la hoja cambió bajo los pies — parar y mirar, no escribir.
if (cubetas.aplica.length > 80 && !incluir.size) {
  console.error(`\n⛔ ABORTO: ${cubetas.aplica.length} ítems sin sello manual es mucho más de lo que este catálogo debería tener. Algo cambió; revisar antes de escribir.`);
  process.exit(1);
}
if (cubetas.boveda.length === 0) {
  console.error('\n⛔ ABORTO: cero ítems de bóveda excluidos — la cabecera UBICACIÓN no está filtrando.');
  process.exit(1);
}

console.log('\n  Los 10 saltos más grandes:');
for (const f of [...cubetas.aplica].sort((a,b) => (b.lista-b.vigente)-(a.lista-a.vigente)).slice(0,10))
  console.log(`   #${f.item.padStart(4)} ${f.nombre.slice(0,24).padEnd(24)} ${f.nivel} ${f.ubic.padEnd(10)} ${cop(f.vigente).padStart(12)} → ${cop(f.lista).padStart(12)}  piso ${cop(f.piso)}`);

const NOTA = (f) => `Lista nivel ${f.nivel} ${STAMP}: ${cop(f.lista)} (costo ${cop(f.costo)}, x${f.mult}; piso ${cop(f.piso)})${f.provisional ? ' - nivel B provisional por calidad vacia' : ''}`;
const append = (prev, nota) => (prev && String(prev).trim() ? String(prev).trim() + ' · ' : '') + nota;

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

const updates = [], backup = [];
for (const f of cubetas.aplica) {
  backup.push({ item: f.item, fila: f.fila, nombre: f.nombre, nivel: f.nivel, calidad: f.calidad,
                costo: f.costo, precioAntes: f.vigente, precioDespues: f.lista, piso: f.piso, obsAntes: f.obs });
  const obsNueva = append(f.obs, NOTA(f));
  revisarBadge(f.item, f.obs, obsNueva);
  updates.push({ range: `${TAB}!${colLetter(IX.precio)}${f.fila}`, values: [[f.lista]] });
  updates.push({ range: `${TAB}!${colLetter(IX.obs)}${f.fila}`,    values: [[obsNueva]] });
}
console.log(`\nCeldas a escribir: ${updates.length} (${cubetas.aplica.length} precios + ${cubetas.aplica.length} observaciones)`);

if (!APPLY) { console.log('\nDRY-RUN. Correr con --apply para escribir.'); process.exit(0); }

// El respaldo se escribe SÓLO al aplicar, y con nombre único. La primera versión
// lo escribía también en dry-run y con nombre fijo: una corrida posterior que no
// seleccionaba nada lo dejó en cero y borró el registro de lo que sí se había
// escrito. Un respaldo que un ensayo puede pisar no es un respaldo.
mkdirSync('scripts/.backups', { recursive: true });
const sufijo = `${STAMP}-${cubetas.aplica.length}items-${process.pid}`;
const bpath = `scripts/.backups/niveles-abc-operativo-ANTES-${sufijo}.json`;
writeFileSync(bpath, JSON.stringify({ alcance: 'DISPONIBLE+ASESOR+CONSIGNACION sin OFI.BOGOTA', generado: STAMP, items: backup }, null, 2));
console.log('Respaldo →', bpath);

const pisos = [...cubetas.aplica.map(f => ({ ...f, respetado: false })),
               ...cubetas.nuncaBajar.map(f => ({ ...f, respetado: true }))]
  .sort((a,b) => (Number(a.item)||0) - (Number(b.item)||0))
  .map(f => ({ item: f.item, nombre: f.nombre, nivel: f.nivel, costo: f.costo,
               lista: f.respetado ? f.vigente : f.lista, piso: f.piso, nuncaBajar: f.respetado }));
writeFileSync(`scripts/.backups/pisos-negociacion-${sufijo}.json`, JSON.stringify(pisos, null, 2));
console.log(`Pisos (${pisos.length} ítems, uso interno) → scripts/.backups/pisos-negociacion-${sufijo}.json`);

const w = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3, requestBody: { valueInputOption: 'RAW', data: updates },
});
console.log('\nCeldas actualizadas (según la API):', w.data.totalUpdatedCells);

// VERIFICACIÓN REAL: releer y comparar por cabecera nombrada.
const check = await sheets.spreadsheets.values.get({ spreadsheetId: SOT3, range: TAB, valueRenderOption: 'UNFORMATTED_VALUE' });
const H2 = check.data.values[0];
const cItem = H2.indexOf(COLS.item), cPrecio = H2.indexOf(COLS.precio);
const vivo = new Map();
check.data.values.forEach((r, i) => { if (i && r?.[cItem] != null && r[cItem] !== '') vivo.set(String(r[cItem]).trim(), Number(r[cPrecio]) || 0); });
let ok = 0; const mal = [];
for (const f of cubetas.aplica) (vivo.get(f.item) === f.lista) ? ok++ : mal.push(`#${f.item} esperaba ${f.lista} y leí ${vivo.get(f.item)}`);
console.log(`Verificado releyendo la hoja: ${ok}/${cubetas.aplica.length} correctos`);
if (mal.length) { console.error('⛔ NO aterrizaron:'); mal.slice(0,20).forEach(m => console.error('   ' + m)); process.exit(1); }
console.log('\n✅ Todos aterrizaron. Ahora, obligatorio:  node scripts/sync-sot-convex.mjs --prod');
