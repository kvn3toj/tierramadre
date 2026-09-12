/**
 * Estilo y utilidades de batchUpdate para los libros de Google Sheets de
 * Tierra Mädre (SOT-v6-Inventario, TM-Padrón-Usuarios). Una sola paleta —
 * Quiet Emerald, src/design-system/tokens/quiet-emerald.ts — y las mismas
 * reglas en todos los libros: cabecera esmeralda profunda con texto blanco,
 * cuerpo Montserrat, bandas suaves, color como señal (nunca como dato).
 *
 * Todo lo que devuelve este módulo son requests de `spreadsheets.batchUpdate`
 * (objetos planos), salvo `limpiar`, que borra la decoración previa para que
 * un `--continue` sea idempotente, y `oauth`, que arma los clientes.
 */
import { OAuth2Client } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { drive_v3 } from '@googleapis/drive';

const clean = (v) =>
  (v || '')
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '')
    .replace(/[\r\n]/g, '')
    .trim();

/** Clientes Sheets + Drive con la cuenta OAuth dueña de los libros. */
export function oauth(env = process.env) {
  const auth = new OAuth2Client(clean(env.GOOGLE_OAUTH_CLIENT_ID), clean(env.GOOGLE_OAUTH_CLIENT_SECRET));
  auth.setCredentials({ refresh_token: clean(env.GOOGLE_OAUTH_REFRESH_TOKEN) });
  return { sheets: new sheets_v4.Sheets({ auth }), drive: new drive_v3.Drive({ auth }) };
}

// ── columnas y rangos ────────────────────────────────────────────

/** 0 → 'A', 25 → 'Z', 26 → 'AA'. */
export function colLetter(index) {
  let s = '';
  let n = index;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}
/** 'A' → 0, 'AA' → 26. */
export function colIndex(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
/** "A2:P1000" | "A1:P1" | "K2:P" (filas abiertas) → GridRange. */
export function range(sheetId, a1) {
  const m = a1.match(/^([A-Z]+)(\d*):([A-Z]+)(\d*)$/);
  if (!m) throw new Error(`Rango A1 inválido: ${a1}`);
  const r = { sheetId, startColumnIndex: colIndex(m[1]), endColumnIndex: colIndex(m[3]) + 1 };
  if (m[2]) r.startRowIndex = Number(m[2]) - 1;
  if (m[4]) r.endRowIndex = Number(m[4]);
  return r;
}

// ── paleta ───────────────────────────────────────────────────────

export const hex = (h) => ({ red: parseInt(h.slice(1, 3), 16) / 255, green: parseInt(h.slice(3, 5), 16) / 255, blue: parseInt(h.slice(5, 7), 16) / 255 });
export const BRAND = {
  deepGreen: hex('#024C2E'), // cabeceras
  strong: hex('#006F52'), // cabeceras de catálogos
  primary: hex('#00C992'), // pestaña principal
  accent: hex('#00785C'),
  brown: hex('#5B0F00'), // avisos
  brownTint: { red: 0.965, green: 0.93, blue: 0.92 }, // fondo de aviso
  emeraldTint: { red: 0.9, green: 0.97, blue: 0.94 }, // sección Léeme / resaltado suave
  white: hex('#FFFFFF'),
  g50: hex('#F7F8F8'),
  g100: hex('#F1F2F2'),
  g150: hex('#EBEDEC'),
  g300: hex('#C9CECB'),
  g400: hex('#9AA09D'),
  g600: hex('#5C6360'),
  g700: hex('#3A403E'),
  g900: hex('#14181A'),
};
export const FONT = 'Montserrat'; // brand.ts → typography.sans.clean

// ── formato ──────────────────────────────────────────────────────

export function headerFormat(sheetId, nCols, bg = BRAND.deepGreen) {
  return [
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: nCols },
        cell: { userEnteredFormat: { backgroundColor: bg, textFormat: { bold: true, fontFamily: FONT, fontSize: 10, foregroundColor: BRAND.white }, wrapStrategy: 'WRAP', verticalAlignment: 'MIDDLE', padding: { top: 6, bottom: 6, left: 8, right: 8 } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment,padding)',
      },
    },
    { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 40 }, fields: 'pixelSize' } },
  ];
}
export function bodyFormat(sheetId, nCols, nRows) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: nRows, startColumnIndex: 0, endColumnIndex: nCols },
      cell: { userEnteredFormat: { textFormat: { fontFamily: FONT, fontSize: 10, foregroundColor: BRAND.g900 }, verticalAlignment: 'MIDDLE' } },
      fields: 'userEnteredFormat(textFormat,verticalAlignment)',
    },
  };
}
export function textFormat(sheetId, a1, tf, extra = {}) {
  const fieldsExtra = Object.keys(extra).map((k) => k).join(',');
  return {
    repeatCell: {
      range: range(sheetId, a1),
      cell: { userEnteredFormat: { textFormat: { fontFamily: FONT, fontSize: 10, ...tf }, ...extra } },
      fields: `userEnteredFormat(textFormat${fieldsExtra ? ',' + fieldsExtra : ''})`,
    },
  };
}
/** Formato numérico por columna: type NUMBER | DATE | CURRENCY, pattern p. ej. '#,##0'. */
export function numberFormat(sheetId, a1, type, pattern) {
  return {
    repeatCell: {
      range: range(sheetId, a1),
      cell: { userEnteredFormat: { numberFormat: { type, pattern } } },
      fields: 'userEnteredFormat.numberFormat',
    },
  };
}
export function banding(sheetId, a1, header = BRAND.deepGreen) {
  // headerColor: la banda arranca en la fila 1; sin esto pinta la cabecera de
  // blanco encima del formato y el texto blanco desaparece.
  return { addBanding: { bandedRange: { range: range(sheetId, a1), rowProperties: { headerColor: header, firstBandColor: BRAND.white, secondBandColor: BRAND.g50 } } } };
}
export function tabColor(sheetId, color) {
  return { updateSheetProperties: { properties: { sheetId, tabColor: color }, fields: 'tabColor' } };
}
export function widths(sheetId, list) {
  return list.map((px, i) => ({
    updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: px }, fields: 'pixelSize' },
  }));
}
export function hideColumns(sheetId, indexes) {
  return indexes.map((i) => ({
    updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { hiddenByUser: true }, fields: 'hiddenByUser' },
  }));
}
export function hideGridlines(sheetId) {
  return { updateSheetProperties: { properties: { sheetId, gridProperties: { hideGridlines: true } }, fields: 'gridProperties.hideGridlines' } };
}

// ── validación, protección, formato condicional ──────────────────

export function listValidation(sheetId, a1, values, strict = true) {
  return {
    setDataValidation: {
      range: range(sheetId, a1),
      rule: { condition: { type: 'ONE_OF_LIST', values: values.map((v) => ({ userEnteredValue: v })) }, strict, showCustomUi: true },
    },
  };
}
export function rangeValidation(sheetId, a1, sourceA1, strict = true) {
  return {
    setDataValidation: {
      range: range(sheetId, a1),
      rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: `=${sourceA1}` }] }, strict, showCustomUi: true },
    },
  };
}
/** Protección con aviso (warningOnly): el dueño decide a quién bloquear de verdad. */
export function protect(sheetId, a1OrNull, description) {
  const pr = { description, warningOnly: true, range: a1OrNull ? range(sheetId, a1OrNull) : { sheetId } };
  return { addProtectedRange: { protectedRange: pr } };
}
/** Fórmula con separador `;` — los libros nacen con locale es_CO. */
export function condFormula(sheetId, a1, formula, format, index) {
  return {
    addConditionalFormatRule: {
      rule: { ranges: [range(sheetId, a1)], booleanRule: { condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: formula }] }, format } },
      index,
    },
  };
}

/** Borra toda decoración previa (no los valores) para que --continue sea idempotente. */
export async function limpiar(sheets, ssId) {
  const m = await sheets.spreadsheets.get({ spreadsheetId: ssId, fields: 'namedRanges(namedRangeId),sheets(properties(sheetId),protectedRanges(protectedRangeId),conditionalFormats,filterViews(filterViewId),bandedRanges(bandedRangeId),basicFilter(range))' });
  const req = [];
  for (const n of m.data.namedRanges ?? []) req.push({ deleteNamedRange: { namedRangeId: n.namedRangeId } });
  for (const sh of m.data.sheets ?? []) {
    const id = sh.properties.sheetId;
    for (const p of sh.protectedRanges ?? []) req.push({ deleteProtectedRange: { protectedRangeId: p.protectedRangeId } });
    for (let i = (sh.conditionalFormats ?? []).length - 1; i >= 0; i--) req.push({ deleteConditionalFormatRule: { sheetId: id, index: i } });
    for (const f of sh.filterViews ?? []) req.push({ deleteFilterView: { filterId: f.filterViewId } });
    for (const b of sh.bandedRanges ?? []) req.push({ deleteBanding: { bandedRangeId: b.bandedRangeId } });
    if (sh.basicFilter) req.push({ clearBasicFilter: { sheetId: id } });
  }
  if (req.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests: req } });
  return req.length;
}

/** Estilo de una pestaña Léeme de tres columnas (seccion, clave, valor). */
export function leemeStyle(sheetId, nRows = 80) {
  return [
    ...headerFormat(sheetId, 3),
    bodyFormat(sheetId, 3, nRows),
    ...widths(sheetId, [130, 190, 900]),
    textFormat(sheetId, `A2:A${nRows}`, { bold: true, foregroundColor: BRAND.deepGreen }, { backgroundColor: BRAND.emeraldTint }),
    textFormat(sheetId, `B2:B${nRows}`, { bold: true, foregroundColor: BRAND.g700 }),
    {
      repeatCell: {
        range: range(sheetId, `A2:C${nRows}`),
        cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP', padding: { top: 6, bottom: 6, left: 8, right: 8 } } },
        fields: 'userEnteredFormat(wrapStrategy,verticalAlignment,padding)',
      },
    },
    hideGridlines(sheetId),
    tabColor(sheetId, BRAND.deepGreen),
  ];
}
