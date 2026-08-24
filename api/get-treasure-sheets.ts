/**
 * Vercel Serverless Function - Get Treasure from Google Sheets
 *
 * Response body mirrors frontend `TreasureItem` (see src/types/index.ts).
 */

import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { TreasureItem, TreasureStatus } from '../src/types/index.ts';
import {
  withApiHandler,
  sendError,
  sendSuccess,
  CACHE,
  SPREADSHEET_ID,
  getSheetNames,
  findSheetByPattern,
  normalizeHeader,
  parsePrice,
  parseDecimal,
} from './_lib/index.js';
import { FOTO_INVENTARIO_LAST_COL } from './_lib/fotosintesis-inventory-columns.js';
import { resolveGrant, bearerWasRejected } from './_lib/catalogGrant.js';
import { lookupVitrina } from './_lib/vitrinaLookup.js';
import { projectForGrant } from './_lib/catalogProjection.js';
import { overlayConvexFotoUrls } from './_lib/convex-foto-overlay.js';
import { filtrarNoPublicados } from './_lib/catalogoPublicado.js';

type PesoParsed =
  | { value: number | string; isJewelry: true; metalType: 'Plata' | 'Oro 18k' }
  | { value: number | string; isJewelry: false; metalType?: undefined };

/**
 * Parse weight - can be carats or metal type
 */
function parsePeso(peso: string | number | null | undefined): PesoParsed {
  if (!peso) return { value: 0, isJewelry: false };
  const pesoStr = String(peso).trim().toLowerCase();

  if (pesoStr.includes('plata')) {
    return { value: 'Plata', isJewelry: true, metalType: 'Plata' };
  }
  if (pesoStr.includes('oro')) {
    return { value: 'Oro 18k', isJewelry: true, metalType: 'Oro 18k' };
  }

  const numValue = parseFloat(String(peso).replace(',', '.'));
  return { value: Number.isNaN(numValue) ? peso : numValue, isJewelry: false };
}

/**
 * Inventario Sheet Column Headers (EXACT MATCH)
 * Source: Google Sheets Inventario - Row 1
 *
 * A = Item (0)
 * B = FECHA INGRESO INVENTARIO (1)
 * C = Nombre (2)
 * D = Peso (ct) (3)
 * E = Color (4)
 * F = Calidad (5)
 * G = Cant. (6)
 * H = Corte (7) - forma de talla de la gema (antes "Talla")
 * I = Medidas (8)
 * J = Medidas (9) - valores
 * K = Categoría (10) - product category (e.g., Anillo en Plata, Aretes, Topitos)
 * L = Precio COP (11)
 * M = UBICACIÓN (12)
 * N = ASESOR (13)
 * O = ESTADO (14)
 * P = QR (15)
 * Q = Colección (16)
 * R = CAJA (17)
 * S = (18) - unused
 * T = ASESOR ACTUAL (19) - current product owner (overrides N for ownership)
 * U = ESTADO ASESOR (20) - state from current owner's perspective
 */
const INVENTARIO_HEADERS = {
  ITEM: 'item',
  FECHA_INGRESO: 'fecha ingreso inventario',
  NOMBRE: 'nombre',
  PESO: 'peso (ct)',
  COLOR: 'color',
  CALIDAD: 'calidad',
  CANTIDAD: 'cant.',
  // Columna H. El encabezado pasó de "Talla" a "Corte" el 2026-08-11 (guardaba
  // la forma de talla, no el aro). Se buscan los dos: el match de encabezado es
  // EXACTO, así que un libro sin migrar seguiría resolviendo por "talla" —
  // y "Talla (anillo)" (BF) nunca colisiona con ninguno de los dos.
  CORTE: 'corte',
  TALLA: 'talla',
  TALLA_ANILLO: 'talla (anillo)',
  MEDIDAS: 'medidas',
  CATEGORIA: 'categoría',
  PRECIO_COP: 'precio cop',
  PRECIO_FINAL: 'preciofinalcop', // SOT v3: precio final = costoBase × 2.6
  PRECIO_EMBAJADOR: 'precioembajadorcop', // compat SOT v2 (deprecado)
  UBICACION: 'ubicación',
  ASESOR: 'asesor',
  ESTADO: 'estado',
  QR: 'qr',
  COLECCION: 'colección',
  CAJA: 'caja',
  ASESOR_ACTUAL: 'asesor actual', // Column T (index 19)
  ESTADO_ASESOR: 'estado asesor', // Column U (index 20)
  // Mine of origin (Muzo, Chivor, Coscuez, Boyacá…). NOT present on the legacy
  // book, whose A:U layout is deliberately FROZEN — it is the push-only mirror
  // `admin-product-update.ts` writes positionally, so a column can never be
  // inserted or reordered there (Anima:
  // TierraMadre/decisions/2026-05-25-fotosintesis-sheet-schema-sync). Reading
  // it by header is a no-op today and starts resolving the moment
  // SPREADSHEET_ID points at SOT v3, where it lives at index 25.
  PROCEDENCIA: 'procedencia',
  FOTO_URL: 'fotourl', // SOT v3 col AL — Fotosíntesis-captured photo (Drive file)
  CERTIFICADO_URL: 'certificadourl', // SOT v3 col AM — certificado de laboratorio
};

// Jewelry subcategory values from Column K. Three other copies of this list
// exist and must stay in step: JEWELRY_CATEGORIES in
// src/hooks/useFotosintesisCatalog.ts (Convex-backed catalog items),
// isJewelryDoc in src/pages/admin/ProductManagement/ProductManagementPage.tsx,
// and CATEGORY_SUBCATEGORIES.joyas in gallery-constants.ts.
//
// Keys are accent-stripped + lowercased (see `normalizeCategoria`). "Joyería
// Artesanal" is the label the Fotosíntesis wizard writes for EVERY finished
// piece, so omitting it made aretes/chokers/pulseras render as loose gems.
const JEWELRY_CATEGORIES = new Set([
  'anillo en plata',
  'aretes',
  'topitos',
  'pulsera',
  'dije',
  'anillo en oro',
  'joyeria artesanal',
  'joyas',
]);

/** Lowercase + strip diacritics so category matching is spelling-tolerant. */
function normalizeCategoria(categoria: string): string {
  return categoria.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Map row data to treasure item using exact header matching
 */
/**
 * Exported (2026-08-11) so `api/ambassador-products.ts` maps inventory rows
 * with THIS function rather than its own copy of the column resolution.
 * Duplicating the mapping is how the two drift apart the next time a column
 * moves — exactly the failure mode A1 just fixed one file over. Exporting is
 * a two-word diff on a critical endpoint; extracting it into `_lib/` would be
 * the tidier home, but no test imports this handler, so a 130-line move would
 * be an unverified one. Left as a follow-up.
 */
export function mapRowToTreasureItem(
  row: string[],
  headers: string[],
): TreasureItem {
  const normalizedHeaders = headers.map(normalizeHeader);

  // Find column index by exact header match (case-insensitive)
  const getColumnIndex = (headerName: string) => {
    const search = headerName.toLowerCase().trim();
    return normalizedHeaders.findIndex((h) => h === search);
  };

  // Get value by header name (exact match)
  const getValue = (headerName: string): string | null => {
    const index = getColumnIndex(headerName);
    if (index >= 0 && row[index] !== undefined && row[index] !== '') {
      return String(row[index]);
    }
    return null;
  };

  // Fallback to index if header not found
  const getByIndex = (index: number): string | null => {
    return row[index] !== undefined && row[index] !== ''
      ? String(row[index])
      : null;
  };

  const peso = getValue(INVENTARIO_HEADERS.PESO) || getByIndex(3);
  const pesoData = parsePeso(peso);

  // La celda cruda de la columna A. `item` de abajo la pasa por parseInt y eso
  // aplasta los ids alfanuméricos ("93A" → 93), así que la identidad viaja acá.
  const itemIdCrudo = String(
    getValue(INVENTARIO_HEADERS.ITEM) || getByIndex(0) || '',
  ).trim();

  const item: TreasureItem = {
    itemId: itemIdCrudo,
    item: parseInt(itemIdCrudo || '0', 10),
    fechaIngreso:
      getValue(INVENTARIO_HEADERS.FECHA_INGRESO) || getByIndex(1) || '',
    nombre: getValue(INVENTARIO_HEADERS.NOMBRE) || getByIndex(2) || '',
    peso:
      typeof pesoData.value === 'number'
        ? pesoData.value
        : parseDecimal(peso ?? ''),
    color: getValue(INVENTARIO_HEADERS.COLOR) || getByIndex(4) || '',
    calidad: getValue(INVENTARIO_HEADERS.CALIDAD) || getByIndex(5) || '',
    cantidad: parseInt(
      String(getValue(INVENTARIO_HEADERS.CANTIDAD) || getByIndex(6) || '1'),
      10,
    ),
    talla:
      getValue(INVENTARIO_HEADERS.CORTE) ||
      getValue(INVENTARIO_HEADERS.TALLA) ||
      getByIndex(7) ||
      '',
    // Sólo por encabezado: BF es una columna añadida al final, y el índice
    // posicional 57 sería basura en cualquier libro que no la tenga.
    tallaAnillo: getValue(INVENTARIO_HEADERS.TALLA_ANILLO) || '',
    medidas: getValue(INVENTARIO_HEADERS.MEDIDAS) || getByIndex(8) || '',
    medidasValores: getByIndex(9) || '',
    categoria: (
      getValue(INVENTARIO_HEADERS.CATEGORIA) ||
      getByIndex(10) ||
      ''
    ).trim(),
    // Adaptador SOT v3 (2026-07-21): la legacy tenía "Precio COP"; el SOT v3 usa
    // `precioFinalCOP` (= costoBase × 2.6). Orden: precio cop (legacy) →
    // precioFinalCOP (SOT v3) → precioEmbajadorCOP (SOT v2, deprecado) →
    // posicional (solo legacy; en el SOT el índice 11 es costoBaseCOP).
    precioCOP: parsePrice(
      getValue(INVENTARIO_HEADERS.PRECIO_COP) ||
        getValue(INVENTARIO_HEADERS.PRECIO_FINAL) ||
        getValue(INVENTARIO_HEADERS.PRECIO_EMBAJADOR) ||
        getByIndex(11),
    ),
    precioInternacional: 0,
    // NO positional fallback here. The `getByIndex` defaults encode the
    // LEGACY 21-column layout, but the Fotosíntesis book inserts
    // `precioembajadorcop` + `precioconscientecop` at 12-13 and pushes
    // everything down by two — so index 12 there is a PRICE. That is the
    // "Ubicación: 150820" report: a price rendered as a location.
    //
    // Verified read-only on both books: the `ubicación` header is present in
    // each (legacy idx 12, Fotosíntesis idx 14), so `getValue` always
    // resolves and this fallback could never fire usefully — it could only
    // ever leak a price. Dropping it is a no-op today and closes that path.
    //
    // NOTE the sibling fields are NOT equally safe: `asesor` has no header on
    // the legacy sheet (idx -1), so its `getByIndex(13)` IS load-bearing
    // there and must stay, even though the same index is
    // `precioconscientecop` on the Fotosíntesis layout.
    // Header lookup ONLY — deliberately no `getByIndex` fallback, for exactly
    // the reason P0.3 removed ubicación's: the positional defaults encode the
    // legacy layout, and against any other layout they return a neighbouring
    // column's value. Left undefined when absent so the UI can hide the row
    // rather than print a placeholder.
    procedencia: getValue(INVENTARIO_HEADERS.PROCEDENCIA) || undefined,
    ubicacion: getValue(INVENTARIO_HEADERS.UBICACION) || '',
    asesor: getValue(INVENTARIO_HEADERS.ASESOR) || getByIndex(13) || '',
    estado: (
      getValue(INVENTARIO_HEADERS.ESTADO) ||
      getByIndex(14) ||
      'DISPONIBLE'
    ).toUpperCase() as TreasureStatus,
    qr: getValue(INVENTARIO_HEADERS.QR) || getByIndex(15) || '',
    coleccion: getValue(INVENTARIO_HEADERS.COLECCION) || getByIndex(16) || '',
    caja: getValue(INVENTARIO_HEADERS.CAJA) || getByIndex(17) || '',
    asesorActual:
      getValue(INVENTARIO_HEADERS.ASESOR_ACTUAL) || getByIndex(19) || '',
    estadoAsesor: (
      getValue(INVENTARIO_HEADERS.ESTADO_ASESOR) ||
      getByIndex(20) ||
      ''
    ).toUpperCase() as TreasureStatus | '',
    isJewelry: pesoData.isJewelry,
    ...(pesoData.metalType ? { metalType: pesoData.metalType } : {}),
  };

  // Fotosíntesis-captured photo (SOT col AL "fotoUrl"): an individual Drive file
  // stored OUTSIDE the `products/{item}/` folder that get-batch-thumbnails scans.
  // Surface it as imagen + thumbnailUrl so the catalog's thumbnail fallback
  // (useTreasure.ts) renders it when there is no folder-scan thumbnail. Without
  // this, joyas captured via Fotosíntesis (whose products/ folder is empty) show
  // a placeholder even though they have a photo. (2026-07-22 cutover fix.)
  const fotoUrl = getValue(INVENTARIO_HEADERS.FOTO_URL);
  if (fotoUrl) {
    item.imagen = fotoUrl;
    item.thumbnailUrl = fotoUrl;
  }

  // El certificado de laboratorio (col AM). Sin esto el campo NO llegaba al
  // cliente por este riel: `ProductDetailPage` resuelve su `product` desde
  // `useTreasure` — o sea desde acá — y sólo cae al doc de Convex cuando el
  // ítem no está en la lista, que para un publicado nunca pasa. Resultado: el
  // carrusel no podía pintar la diapositiva del certificado aunque la hoja lo
  // tuviera, porque `certificateUrl` llegaba `undefined`.
  // El nombre cambia de `certificadoUrl` (hoja y Convex) a `certificateUrl`
  // (TreasureItem); `useFotosintesisCatalog.ts:164` hace el mismo mapeo para el
  // riel de Convex.
  const certificadoUrl = getValue(INVENTARIO_HEADERS.CERTIFICADO_URL);
  if (certificadoUrl) {
    item.certificateUrl = certificadoUrl;
  }

  // Also flag as jewelry if categoria matches a known jewelry subcategory (e.g. items with numeric peso)
  if (
    !item.isJewelry &&
    item.categoria &&
    JEWELRY_CATEGORIES.has(normalizeCategoria(item.categoria))
  ) {
    item.isJewelry = true;
  }

  return item;
}

type PricingRow = { precioCOP: number; precioInternacional: number };

/**
 * Fetch pricing data from the Modelo-Precios sheet (ex "CUALIFICACION -PRECIO",
 * renombrada al centralizar en SOT v3 el 2026-07-21).
 */
async function fetchPricingData(
  sheets: sheets_v4.Sheets,
): Promise<Record<number, PricingRow>> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Modelo-Precios'!A:J",
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return {};

    const pricingMap: Record<number, PricingRow> = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const itemNum = parseInt(String(row[0]), 10);
      if (isNaN(itemNum) || itemNum <= 0) continue;

      const precioInternacional = parsePrice(row[7]);
      const precioNacional = parsePrice(row[9]);

      if (precioInternacional > 0 || precioNacional > 0) {
        pricingMap[itemNum] = {
          precioCOP: precioNacional > 0 ? precioNacional : precioInternacional,
          precioInternacional: precioInternacional,
        };
      }
    }

    return pricingMap;
  } catch (error: unknown) {
    console.warn(
      'Could not fetch pricing data:',
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    ctx: Record<string, unknown>,
  ) => {
    const { sheets } = ctx as { sheets: sheets_v4.Sheets };
    const grant = await resolveGrant(req, { lookupVitrina });
    console.log('[catalog] grant', grant.kind);
    const sheetNames = await getSheetNames(sheets);
    const targetSheet =
      findSheetByPattern(sheetNames, ['inventario', 'inventory']) ||
      sheetNames[0];

    // Fetch treasure and pricing data in parallel
    const [treasureResponse, pricingMap] = await Promise.all([
      sheets.spreadsheets.values.get({
        // El rango sale de FOTO_INVENTARIO_COLUMNS, no de una letra a mano:
        // fijarlo ya cortó la lectura dos veces (A:Z dejaba fuera `fotoUrl` en
        // AL; A:AP dejó fuera `tallaAnillo` en BF el 2026-08-11, y el campo
        // llegaba vacío al catálogo aunque la hoja lo tuviera). Derivarlo hace
        // que añadir una columna al mapa ensanche la lectura sola.
        spreadsheetId: SPREADSHEET_ID,
        range: `${targetSheet}!A:${FOTO_INVENTARIO_LAST_COL}`,
      }),
      fetchPricingData(sheets),
    ]);

    const rows = treasureResponse.data.values;

    if (!rows || rows.length === 0) {
      return sendSuccess(res, {
        // Empty array either way — projected here anyway so this branch
        // never becomes the one that forgets, if it ever stops being empty.
        treasure: projectForGrant([], grant),
        message: 'No data found in spreadsheet',
        ...(bearerWasRejected(req, grant) ? { tokenRejected: true } : {}),
      });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const treasure = dataRows
      // Capture each data row's TRUE 1-based physical sheet row BEFORE any
      // compaction. rows[0] is the header (physical row 1), so dataRows[idx]
      // is rows[idx + 1] → physical row idx + 2. Threading this through the
      // filter/map below keeps the real row number even after blank/invalid
      // rows are dropped, which is what the Convex sync bridge relies on.
      .map((row, idx) => ({ row, sheetRow: idx + 2 }))
      .filter(({ row }) => row.length > 0 && row.some((cell) => cell))
      .map(({ row, sheetRow }) => {
        const item = mapRowToTreasureItem(
          row.map((c) => (c == null ? '' : String(c))) as string[],
          (headers as string[]).map((c) => String(c)),
        );
        // Preserve the original physical sheet row (never reordered/reindexed).
        item.sheetRow = sheetRow;
        // Only add precioInternacional from CUALIFICACION sheet (precioCOP comes from Inventario column L)
        const pricing = pricingMap[item.item];
        if (pricing) {
          item.precioInternacional = pricing.precioInternacional;
        }
        return item;
      })
      .filter((item) => item.item > 0);

    // Convex manda sobre la foto principal: la columna AL de arriba es el
    // espejo (va detrás del push); acá se pisa con lo que el bot escribió en
    // vivo. Best-effort — sin Convex se sirve la hoja tal cual, como siempre.
    const treasureConFotos = await overlayConvexFotoUrls(treasure);

    // `mostrarEnCatalogo` no se miraba acá NUNCA: este endpoint servía las 576
    // filas de la hoja, así que despublicar un ítem lo sacaba del catálogo de
    // Convex y NO del Treasure Browser. La bandera sale de Convex, que es
    // quien la posee — la columna Y de la hoja va 279 filas atrasada. Sólo
    // para no-staff; el personal sigue viendo el inventario entero.
    // Ver api/_lib/catalogoPublicado.ts.
    const treasureVisible =
      grant.kind === 'staff'
        ? treasureConFotos
        : await filtrarNoPublicados(treasureConFotos);

    const sampleRow = dataRows[0] || [];
    const pricingCount = Object.keys(pricingMap).length;

    // The _debug block exposes the sheet's header labels + the first row's raw cell
    // values to the client. Useful for column-mapping diagnostics, but it leaks the
    // internal sheet layout to every catalog visitor, so gate it behind an explicit
    // `?debug=1` AND a non-production environment.
    const includeDebug =
      Boolean(req.query.debug) && process.env.NODE_ENV !== 'production';

    return sendSuccess(res, {
      treasure: projectForGrant(treasureVisible, grant),
      count: treasureVisible.length,
      // sheetName + _debug describe the internal spreadsheet layout — staff
      // only. Non-staff (anon/vitrina) never had a reason to receive it.
      ...(grant.kind === 'staff' ? { sheetName: targetSheet } : {}),
      lastUpdated: new Date().toISOString(),
      ...(bearerWasRejected(req, grant) ? { tokenRejected: true } : {}),
      ...(includeDebug && grant.kind === 'staff'
        ? {
            _debug: {
              headers: headers.map(
                (h, i) => `${String.fromCharCode(65 + i)}: ${h}`,
              ),
              sampleValues: sampleRow
                .slice(0, 21)
                .map((v, i) => `${String.fromCharCode(65 + i)}: ${v}`),
              pricingItemsFound: pricingCount,
            },
          }
        : {}),
    });
  },
  {
    methods: ['GET', 'OPTIONS'],
    cache: CACHE.NONE,
    provideSheets: true,
    errorPrefix: 'GetTreasureSheets',
  },
);
