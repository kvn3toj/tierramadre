#!/usr/bin/env tsx
/**
 * Crea el libro «SOT-v6-Inventario»: el ESPEJO en Google Sheets del inventario
 * que vive en Convex. Convex es la fuente; este libro es la vista para humanos
 * y la copia barata que no consume el tope de Database I/O del free tier.
 *
 * Diseño: una tabla por pestaña, fila 1 = contrato con el código. Las
 * cabeceras NO se inventan aquí: se importan de los mismos módulos que usan los
 * escritores —`FOTO_INVENTARIO_COLUMNS` (api/admin-product-update.ts, por
 * NOMBRE) y `TABLE_CONFIGS` (api/admin-table-update.ts, POSICIONAL)— así que
 * el libro es escribible por la app cambiando sólo un ID de entorno.
 *
 * Semilla: se copian las filas de SOT v3 (Inventario, Lotes, Sublotes, Ventas,
 * Proveedores, Clientes, Listas, Calidades) casando columnas POR NOMBRE de
 * cabecera, sin transformar valores. Una columna del contrato sin equivalente
 * queda vacía; una columna de origen sin destino se reporta como descartada.
 *
 * Por defecto es DRY-RUN. `--apply` crea el libro y guarda el ID en
 * docs/specs/2026-09-10-sot-v6-inventario-id.txt (se niega si ya existe,
 * salvo --force). `--apply --continue` retoma sobre el libro existente:
 * reescribe el Léeme y vuelve a aplicar formato/validación/protección
 * (idempotente: borra la decoración previa primero).
 *
 *   tsx scripts/crear-sot-v6-inventario.ts
 *   tsx scripts/crear-sot-v6-inventario.ts --apply
 *   tsx scripts/crear-sot-v6-inventario.ts --apply --continue
 */
import fs from 'node:fs';
import dotenv from 'dotenv';
import { FOTO_INVENTARIO_HEADERS } from '../api/_lib/fotosintesis-inventory-columns.js';
import { TABLE_CONFIGS } from '../api/_lib/admin-table-config.js';
import {
  BRAND,
  banding,
  bodyFormat,
  colLetter,
  condFormula,
  headerFormat,
  hideColumns,
  leemeStyle,
  limpiar,
  numberFormat,
  oauth,
  protect,
  range,
  rangeValidation,
  tabColor,
  textFormat,
  widths,
} from './_lib/sheets-estilo.mjs';

dotenv.config({ path: '.env.local', quiet: true });

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
const CONTINUE = process.argv.includes('--continue');
const ID_FILE = 'docs/specs/2026-09-10-sot-v6-inventario-id.txt';
const TITLE = 'SOT-v6-Inventario';
const SOURCE_ID = process.env.SPREADSHEET_ID; // SOT v3
const HOY = '2026-09-10';

type Row = (string | number | boolean)[];

// ─────────────────────────────────────────────────────────────────
// Pestañas: nombre, contrato, origen en SOT v3, alias de cabecera
// ─────────────────────────────────────────────────────────────────

interface TabSpec {
  title: string;
  headers: readonly string[];
  source?: string; // pestaña de SOT v3 de la que se copia la semilla
  alias?: Record<string, string>; // cabecera destino → cabecera origen
  rows: number; // filas del grid
  frozenCols: number;
  color: { red: number; green: number; blue: number };
  writer: string; // quién la escribe en producción
}

const TABS: TabSpec[] = [
  { title: 'Léeme', headers: ['seccion', 'clave', 'valor'], rows: 80, frozenCols: 0, color: BRAND.deepGreen, writer: 'humanos (documentación)' },
  { title: 'Inventario', headers: FOTO_INVENTARIO_HEADERS, source: 'Inventario', rows: 1500, frozenCols: 3, color: BRAND.primary, writer: 'Convex → /api/admin-product-update (por NOMBRE de cabecera)' },
  { title: 'Lotes', headers: TABLE_CONFIGS.lots.columns, source: 'Lotes', rows: 1000, frozenCols: 1, color: BRAND.accent, writer: 'Convex lots._pushToSheet → /api/admin-table-update (POSICIONAL)' },
  { title: 'Sublotes', headers: TABLE_CONFIGS.subLotes.columns, source: 'Sublotes', alias: { itemIdsJoined: 'itemIds' }, rows: 500, frozenCols: 1, color: BRAND.accent, writer: 'Convex subLotes → /api/admin-table-update (POSICIONAL)' },
  { title: 'Ventas', headers: TABLE_CONFIGS.sales.columns, source: 'Ventas', rows: 1000, frozenCols: 1, color: BRAND.strong, writer: 'Convex sales → /api/admin-table-update (POSICIONAL)' },
  { title: 'Proveedores', headers: TABLE_CONFIGS.providers.columns, source: 'Proveedores', rows: 200, frozenCols: 1, color: BRAND.g600, writer: 'Convex providers → /api/admin-table-update (POSICIONAL)' },
  { title: 'Clientes', headers: TABLE_CONFIGS.clients.columns, source: 'Clientes', rows: 1000, frozenCols: 1, color: BRAND.g600, writer: 'Convex clients → /api/admin-table-update (POSICIONAL)' },
  { title: 'MovimientosAsesor', headers: TABLE_CONFIGS.movimientosAsesor.columns, rows: 2000, frozenCols: 1, color: BRAND.g400, writer: 'Convex asesorMovements → /api/admin-table-update (POSICIONAL)' },
  { title: 'Listas', headers: [], source: 'Listas', rows: 100, frozenCols: 0, color: BRAND.g300, writer: 'humanos, por acuerdo: alimenta los dropdowns' },
  { title: 'Calidades', headers: [], source: 'Calidades', rows: 50, frozenCols: 0, color: BRAND.g300, writer: 'humanos, por acuerdo: catálogo canónico de calidad' },
];

// Inventario ⇄ Listas: qué columna del inventario valida contra qué lista.
const VALIDA_INVENTARIO: Record<string, string> = {
  Color: 'color', Calidad: 'calidad', Corte: 'corte', 'Categoría': 'categoria', 'UBICACIÓN': 'ubicacion', ESTADO: 'estado',
  'Colección': 'coleccion', CAJA: 'caja', procedencia: 'procedencia', tipoEsmeralda: 'tipoEsmeralda', subtipoForm: 'subtipoForm',
  tipoJoya: 'tipoJoya', tecnicaJoya: 'tecnicaJoya', minerales: 'minerales', 'Talla (anillo)': 'tallaAnillo',
};
const VALIDA_OTRAS: Record<string, Record<string, string>> = {
  Lotes: { formaPago: 'formaPago', metodoContado: 'metodoContado', estado: 'lotEstado', tratamiento: 'tratamiento' },
  Ventas: { formaPago: 'formaPago', metodoContado: 'metodoContado', estado: 'saleEstado' },
  Proveedores: { tipo: 'provTipo' },
  Clientes: { tipo: 'cliTipo' },
};
// Formato numérico por cabecera (patrón de Sheets).
const NUM: Record<string, [string, string]> = {
  Item: ['NUMBER', '0'], 'FECHA INGRESO INVENTARIO': ['DATE', 'yyyy-mm-dd'], 'Peso (ct)': ['NUMBER', '0.00'], 'Peso (gr)': ['NUMBER', '0.00'],
  costoBaseCOP: ['NUMBER', '#,##0'], precioFinalCOP: ['NUMBER', '#,##0'], 'Costo lote (fórmula)': ['NUMBER', '#,##0'], 'Precio objetivo (modelo)': ['NUMBER', '#,##0'],
  'Caja: precio venta': ['NUMBER', '#,##0'], 'Caja: valor pagado': ['NUMBER', '#,##0'], 'Caja: saldo': ['NUMBER', '#,##0'], 'Precio USD': ['NUMBER', '#,##0.00'],
  costoTotalCOP: ['NUMBER', '#,##0'], pesoTotalQuilates: ['NUMBER', '0.00'], totalCostoCOP: ['NUMBER', '#,##0'],
  precioAcordadoCOP: ['NUMBER', '#,##0'], descuentoCOP: ['NUMBER', '#,##0'], totalCOP: ['NUMBER', '#,##0'], comisionCOP: ['NUMBER', '#,##0'], precio: ['NUMBER', '#,##0'],
};
const ANCHO: Record<string, number> = {
  Item: 60, 'FECHA INGRESO INVENTARIO': 105, Nombre: 200, observacion: 320, 'Notas / conflictos': 260, 'Anima: notas relacionadas': 200,
  QR: 200, fotoUrl: 220, certificadoUrl: 220, 'Producto (URL)': 200, 'Carpeta fotos (Drive)': 220, Fuentes: 160,
  notas: 260, direccion: 220, urlFactura: 220, carnetUrl: 220, nombre: 200, providerNombre: 180, clientNombre: 180, nombreORazonSocial: 200, itemIdsJoined: 160,
};

// ─────────────────────────────────────────────────────────────────
// Léeme
// ─────────────────────────────────────────────────────────────────

const LEEME_ROWS: Row[] = [
  ['Propósito', 'qué es', 'ESPEJO en Sheets del inventario de Tierra Mädre. La fuente de verdad es Convex; este libro es la vista para humanos y la copia barata que no gasta el tope de Database I/O del free tier de Convex.'],
  ['Propósito', 'qué NO es', 'No es donde se corrige un dato. Editar una celda aquí no cambia nada en la app: el próximo push de Convex la pisa. Para corregir una pieza, un lote o una venta se usa la app (Fotosíntesis).'],
  ['Propósito', 'familia de libros', 'SOT-* es el linaje del inventario: SOT-v3 (legado, aún leído por la app) → SOT-v6-Inventario (este). TM-* son los satélites de la app: TM-Padrón-Usuarios (acceso), TM-App-Data (invitaciones, vistas, cotizaciones). Cada libro = un dominio y una audiencia; usuarios e inventario nunca comparten archivo.'],
  ['Propósito', 'creado', `${HOY} por scripts/crear-sot-v6-inventario.ts. Semilla copiada de SOT v3 casando columnas por NOMBRE de cabecera, sin transformar valores. Desde entonces sólo escribe Convex.`],
  ['Reglas', 'una tabla por pestaña', 'Fila 1 = cabeceras. Sin celdas combinadas, sin filas de título, sin fórmulas dentro de las tablas, sin columnas insertadas en medio.'],
  ['Reglas', 'el contrato es el código', 'Inventario: cabeceras = FOTO_INVENTARIO_COLUMNS (api/_lib/fotosintesis-inventory-columns.js); el escritor localiza cada columna por NOMBRE. Lotes/Sublotes/Ventas/Proveedores/Clientes/MovimientosAsesor: cabeceras y ORDEN = TABLE_CONFIGS (api/_lib/admin-table-config.ts); ese escritor es POSICIONAL — mover una columna corrompe la tabla.'],
  ['Reglas', 'quién escribe qué', 'Convex escribe todas las tablas (vía /api/admin-product-update y /api/admin-table-update, upsert por la clave de la columna A, rango cerrado, nunca append abierto). Humanos: sólo Listas y Calidades, y sólo por acuerdo, porque alimentan los dropdowns. Nada más.'],
  ['Reglas', 'celda vacía = pendiente', 'Una celda vacía no es un error del espejo: es un dato que Convex no tiene. No se rellena a mano; se captura en la app.'],
  ['Reglas', 'validación con aviso', 'Los dropdowns avisan (no bloquean) cuando un valor está fuera de Listas: un valor histórico fuera de catálogo queda marcado en marrón, no se rechaza ni se corrige aquí.'],
  ['Pestañas', 'Inventario', 'Una fila por ítem (columna A = Item). Vistas: "Disponibles", "Vendidas", "En catálogo". Vendidas en gris; estado fuera de Listas en marrón; Item duplicado en marrón negrita. Las dos columnas de relleno del contrato ("(sin uso)" y la vacía) están OCULTAS, no borradas.'],
  ['Pestañas', 'Lotes / Sublotes / Ventas', 'Espejo de las tablas lots, subLotes y sales de Convex. La columna A es la clave (loteId, subLoteId, saleId).'],
  ['Pestañas', 'Proveedores / Clientes', 'Espejo del CRM de Convex (providers, clients). Viven aquí porque los escribe el mismo camino que Ventas; contienen teléfonos y correos: compartir este libro es compartir eso.'],
  ['Pestañas', 'MovimientosAsesor', 'Espejo de asesorMovements. Vacía hasta que el escritor apunte a este libro.'],
  ['Pestañas', 'Listas / Calidades', 'Catálogos de validación, copiados de SOT v3. Cambiarlos cambia lo que la app y los dropdowns consideran válido.'],
  ['Pestañas', 'lo que NO se mudó', 'Modelo-Precios (fórmulas humanas), Asesores y new-users (→ TM-Padrón-Usuarios), _Sync y _SyncQueue (colas del riel viejo) se quedan en SOT v3.'],
  ['Cableado', 'estado', `Al ${HOY} la app sigue escribiendo y leyendo SOT v3: SPREADSHEET_ID y FOTOSINTESIS_SPREADSHEET_ID apuntan al mismo libro (verificado en api/_lib/constants.js). Este libro está listo para recibir escrituras; el repunte es una decisión, no un default.`],
  ['Cableado', 'repunte propuesto', 'FOTOSINTESIS_SPREADSHEET_ID → este libro (mueve las escrituras de admin-table-update y admin-product-update). SPREADSHEET_ID sirve además Asesores/new-users, así que sólo cambia después del Stage 1 del padrón. Antes: dry-run de un push, leer la fila por cabecera nombrada, y recién ahí el resto.'],
  ['Cableado', 'espejo v4', 'El riel SOT v4 (convex/espejo.ts: Lotes 46 col, Casillas, Movimientos, Tablero) escribe en su propio libro «SOT v4 · Espejo (PRUEBAS)» vía ESPEJO_SPREADSHEET_ID y sólo desde el deployment de desarrollo. No se mezcló aquí: su pestaña Lotes tiene otro contrato.'],
  ['Cableado', 'free tier', 'La app pública sirve el catálogo desde el caché de Vercel (api/_lib/catalogCache.ts), no desde este libro. Leer este libro desde la app es una decisión aparte: la API de Sheets tiene sus propias cuotas por minuto.'],
  ['Procedimientos', 'ver una pieza', 'Vista "Disponibles" o filtro por Item en la columna A. Nunca ordenar in-place sin volver a ordenar por Item: el escritor localiza por clave, no por posición, así que no se rompe, pero la lectura humana sí.'],
  ['Procedimientos', 'corregir un dato', 'En la app. Si la app no tiene el campo, se anota en Notas / conflictos de SOT v3 o se pide el campo; no se escribe aquí.'],
  ['Procedimientos', 'reconstruir el espejo', 'tsx scripts/crear-sot-v6-inventario.ts --apply --continue vuelve a aplicar formato y validaciones sin tocar valores. Para repoblar desde Convex se usan los pushes de la app, no una copia de SOT v3.'],
];

// ─────────────────────────────────────────────────────────────────
// Semilla por nombre de cabecera
// ─────────────────────────────────────────────────────────────────

interface Seed { rows: Row[]; mapeadas: string[]; vacias: string[]; descartadas: Record<string, number>; }

function seedByHeader(target: readonly string[], sourceRows: Row[], alias: Record<string, string> = {}): Seed {
  const src = (sourceRows[0] ?? []).map(String);
  const idx = new Map(src.map((h, i) => [h, i]));
  const mapeadas: string[] = []; const vacias: string[] = [];
  const cols = target.map((h) => { const s = alias[h] ?? h; const i = idx.has(s) ? idx.get(s)! : -1; (i >= 0 ? mapeadas : vacias).push(h); return i; });
  const usados = new Set(cols.filter((i) => i >= 0));
  const descartadas: Record<string, number> = {};
  src.forEach((h, i) => { if (!usados.has(i)) { const n = sourceRows.slice(1).filter((r) => r[i] !== undefined && r[i] !== '').length; if (n) descartadas[h || `(col ${i + 1})`] = n; } });
  const rows = sourceRows.slice(1)
    .filter((r) => r.some((c) => c !== '' && c !== undefined))
    .map((r) => cols.map((i) => (i >= 0 && r[i] !== undefined ? r[i] : '')));
  return { rows, mapeadas, vacias, descartadas };
}

// ─────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────

async function main() {
  if (!SOURCE_ID) throw new Error('SPREADSHEET_ID (SOT v3) no está en .env.local');
  if (APPLY && !CONTINUE && fs.existsSync(ID_FILE) && !FORCE) {
    console.error(`❌ Ya existe ${ID_FILE} (${fs.readFileSync(ID_FILE, 'utf8').split('\n')[0]}). Volver a correr crearía un libro duplicado. Usa --force si de verdad quieres otro.`);
    process.exit(1);
  }
  const { sheets, drive } = oauth();

  // 1. Origen: SOT v3, valores sin formatear (los números siguen siendo números).
  const read = async (tab: string): Promise<Row[]> =>
    ((await sheets.spreadsheets.values.get({ spreadsheetId: SOURCE_ID, range: `'${tab}'!A1:CZ`, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values ?? []) as Row[];
  const seeds = new Map<string, Seed>();
  for (const t of TABS) {
    if (!t.source) continue;
    const srcRows = await read(t.source);
    if (t.headers.length === 0) { // Listas / Calidades: se copian tal cual, cabecera incluida
      const hdr = (srcRows[0] ?? []).map(String);
      (t as { headers: readonly string[] }).headers = hdr;
      seeds.set(t.title, { rows: srcRows.slice(1).filter((r) => r.some((c) => c !== '' && c !== undefined)), mapeadas: hdr, vacias: [], descartadas: {} });
    } else {
      seeds.set(t.title, seedByHeader(t.headers, srcRows, t.alias));
    }
  }
  console.log('📖 Semilla desde SOT v3 (por nombre de cabecera):');
  for (const t of TABS) {
    const s = seeds.get(t.title); if (!s) continue;
    console.log(`  ${t.title.padEnd(18)} ${String(s.rows.length).padStart(4)} filas · ${t.headers.length} col` + (s.vacias.length ? ` · sin origen: ${s.vacias.join(', ')}` : '') + (Object.keys(s.descartadas).length ? ` · descartadas: ${JSON.stringify(s.descartadas)}` : ''));
  }
  const inv = seeds.get('Inventario')!;
  const items = inv.rows.map((r) => String(r[0]));
  const dup = items.filter((v, i) => items.indexOf(v) !== i);
  console.log(`  Inventario: Items duplicados = ${dup.length}${dup.length ? ' ' + JSON.stringify(dup.slice(0, 5)) : ''}`);
  if (!APPLY) { console.log('\nNada creado. Corre con --apply para crear el libro.'); return; }

  // Service account de la app (la misma que edita SOT v3).
  const perms = (await drive.permissions.list({ fileId: SOURCE_ID, fields: 'permissions(emailAddress,role)' })).data.permissions ?? [];
  const sa = perms.find((p) => /gserviceaccount\.com$/.test(p.emailAddress || ''))?.emailAddress;
  if (!sa) throw new Error('No encontré la service account entre los permisos de SOT v3');

  let ssId: string, url: string, ids: Record<string, number>;
  const leeme: Row[] = [['seccion', 'clave', 'valor'], ...LEEME_ROWS];
  if (CONTINUE) {
    ssId = fs.readFileSync(ID_FILE, 'utf8').split('\n')[0].trim();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: ssId, fields: 'spreadsheetUrl,sheets(properties(title,sheetId))' });
    url = meta.data.spreadsheetUrl!;
    ids = Object.fromEntries(meta.data.sheets!.map((s) => [s.properties!.title!, s.properties!.sheetId!]));
    console.log(`\n↩️  Retomando ${url}`);
    await sheets.spreadsheets.values.clear({ spreadsheetId: ssId, range: `'Léeme'!A${leeme.length + 1}:C80` });
    await sheets.spreadsheets.values.update({ spreadsheetId: ssId, range: `'Léeme'!A1:C${leeme.length}`, valueInputOption: 'RAW', requestBody: { values: leeme } });
    console.log(`📝 Léeme actualizado (${LEEME_ROWS.length} filas)`);
  } else {
    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: TITLE, locale: 'es_CO', timeZone: 'America/Bogota' },
        sheets: TABS.map((t) => ({ properties: { title: t.title, tabColor: t.color, gridProperties: { rowCount: t.rows, columnCount: t.headers.length, frozenRowCount: 1, frozenColumnCount: t.frozenCols } } })),
      },
    });
    ssId = created.data.spreadsheetId!; url = created.data.spreadsheetUrl!;
    ids = Object.fromEntries(created.data.sheets!.map((s) => [s.properties!.title!, s.properties!.sheetId!]));
    console.log(`\n✅ Libro creado: ${url}`);
    fs.writeFileSync(ID_FILE, `${ssId}\n${url}\ncreado ${HOY} por scripts/crear-sot-v6-inventario.ts (semilla: SOT v3 ${SOURCE_ID})\n`);
    // Valores, siempre en rango cerrado.
    const data = TABS.map((t) => {
      const body = t.title === 'Léeme' ? leeme : [[...t.headers] as Row, ...(seeds.get(t.title)?.rows ?? [])];
      return { range: `'${t.title}'!A1:${colLetter(t.headers.length - 1)}${body.length}`, values: body };
    });
    await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: ssId, requestBody: { valueInputOption: 'RAW', data } });
    console.log('✅ Valores escritos: ' + TABS.filter((t) => seeds.has(t.title)).map((t) => `${t.title} ${seeds.get(t.title)!.rows.length}`).join(' · '));
  }

  // 2. Decoración (idempotente).
  const borrados = await limpiar(sheets, ssId);
  if (borrados) console.log(`🧹 Decoración previa retirada (${borrados} objetos)`);
  const requests: object[] = [];
  const listasHdr = TABS.find((t) => t.title === 'Listas')!.headers;
  const listaCol = (name: string) => { const i = listasHdr.indexOf(name); if (i < 0) throw new Error(`Listas no tiene la columna ${name}`); return colLetter(i); };
  const lastLista = 100;
  for (const t of TABS) {
    const id = ids[t.title]; const n = t.headers.length; const last = colLetter(n - 1);
    if (t.title === 'Léeme') { requests.push(...leemeStyle(id, 80)); continue; }
    const catalogo = t.title === 'Listas' || t.title === 'Calidades';
    requests.push(...headerFormat(id, n, catalogo ? BRAND.strong : t.title === 'Inventario' ? BRAND.deepGreen : BRAND.g700), bodyFormat(id, n, t.rows), tabColor(id, t.color));
    requests.push(...widths(id, t.headers.map((h) => ANCHO[h] ?? 110)));
    if (!catalogo) requests.push(banding(id, `A1:${last}${t.rows}`, t.title === 'Inventario' ? BRAND.deepGreen : BRAND.g700));
    // Clave en negrita esmeralda.
    requests.push(textFormat(id, `A2:A${t.rows}`, { bold: true, foregroundColor: BRAND.deepGreen }));
    // Formatos numéricos por cabecera.
    t.headers.forEach((h, i) => { const f = NUM[h]; if (f) requests.push(numberFormat(id, `${colLetter(i)}2:${colLetter(i)}${t.rows}`, f[0], f[1])); });
    // Validación con aviso desde Listas.
    const valida = t.title === 'Inventario' ? VALIDA_INVENTARIO : VALIDA_OTRAS[t.title] ?? {};
    for (const [h, lista] of Object.entries(valida)) {
      const i = t.headers.indexOf(h); if (i < 0) continue;
      requests.push(rangeValidation(id, `${colLetter(i)}2:${colLetter(i)}${t.rows}`, `Listas!$${listaCol(lista)}$2:$${listaCol(lista)}$${lastLista}`, false));
    }
    // Protección con aviso y rango con nombre.
    requests.push(protect(id, null, catalogo ? `${t.title} — catálogo de validación; cambiarlo cambia lo que la app considera válido` : `${t.title} — espejo de Convex, lo escribe la app (${t.writer.split(' (')[0]}); editar aquí no cambia nada`));
    requests.push({ addNamedRange: { namedRange: { name: t.title.toUpperCase(), range: range(id, `A1:${last}${t.rows}`) } } });
    if (!catalogo) requests.push({ setBasicFilter: { filter: { range: range(id, `A1:${last}${t.rows}`) } } });
  }
  // Inventario: columnas de relleno ocultas, formato condicional, vistas.
  {
    const t = TABS[1]; const id = ids.Inventario; const H = t.headers; const rows = t.rows; const last = colLetter(H.length - 1);
    const hidden = H.map((h, i) => (h === '' || /sin uso/i.test(h) ? i : -1)).filter((i) => i >= 0);
    requests.push(...hideColumns(id, hidden));
    const cEstado = colLetter(H.indexOf('ESTADO')); const cMostrar = H.indexOf('mostrarEnCatalogo'); const lEstado = listaCol('estado');
    requests.push(
      condFormula(id, `A2:A${rows}`, `=AND($A2<>"";COUNTIF($A$2:$A$${rows};$A2)>1)`, { backgroundColor: BRAND.brownTint, textFormat: { foregroundColor: BRAND.brown, bold: true } }, 0),
      condFormula(id, `${cEstado}2:${cEstado}${rows}`, `=AND($${cEstado}2<>"";COUNTIF(INDIRECT("Listas!${lEstado}2:${lEstado}${lastLista}");$${cEstado}2)=0)`, { backgroundColor: BRAND.brownTint, textFormat: { foregroundColor: BRAND.brown } }, 1),
      condFormula(id, `A2:${last}${rows}`, `=$${cEstado}2="VENDIDA"`, { textFormat: { foregroundColor: BRAND.g600, italic: true } }, 2),
      { addFilterView: { filter: { title: 'Disponibles', range: range(id, `A1:${last}${rows}`), filterSpecs: [{ columnIndex: H.indexOf('ESTADO'), filterCriteria: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'DISPONIBLE' }] } } }] } } },
      { addFilterView: { filter: { title: 'Vendidas', range: range(id, `A1:${last}${rows}`), filterSpecs: [{ columnIndex: H.indexOf('ESTADO'), filterCriteria: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'VENDIDA' }] } } }] } } },
      { addFilterView: { filter: { title: 'En catálogo', range: range(id, `A1:${last}${rows}`), filterSpecs: [{ columnIndex: cMostrar, filterCriteria: { hiddenValues: ['FALSE', ''] } }] } } },
    );
  }
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests } });
  console.log(`✅ Formato, validaciones, protecciones, rangos y vistas aplicados (${requests.length} requests)`);

  // 3. Compartir con la service account. Humanos: decisión del dueño.
  const yaTiene = (await drive.permissions.list({ fileId: ssId, fields: 'permissions(emailAddress)' })).data.permissions?.some((p) => p.emailAddress === sa);
  if (!yaTiene) await drive.permissions.create({ fileId: ssId, sendNotificationEmail: false, requestBody: { type: 'user', role: 'writer', emailAddress: sa } });
  console.log(`✅ Compartido (writer) con ${sa}`);
  console.log(`\nID: ${ssId}\nURL: ${url}`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
