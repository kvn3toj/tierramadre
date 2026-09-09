/**
 * Padrón de clientes autorregistrados — hoja `new-users` de la SOT v3.
 *
 * Desde el 2026-09-09 un correo de Google que no figura en Asesores ni en
 * Proveedores ya no rebota: entra como `cliente` y queda anotado acá. La hoja
 * es un padrón (como Asesores), no un log: una fila por email, con el último
 * acceso y el conteo, y un `estado` que decide el acceso con la MISMA regla
 * blanca del roster (`isRosterRowActive`): sólo "activo" concede entrada, así
 * que bloquear a alguien es escribir cualquier otra cosa en esa celda.
 *
 * Quién escribe acá: únicamente `/api/validate?action=register-client`, y
 * sólo con un ID token de Google verificado. La lectura por email (`GET
 * /api/validate?email=`) no está autenticada, y si registrara, cualquiera
 * podría llenar la hoja con correos ajenos.
 */
import type { sheets_v4 } from '@googleapis/sheets';
import {
  SPREADSHEET_ID,
  SHEETS,
  ensureSheet,
  findColumnIndex,
} from './index.js';
import { isRosterRowActive } from './rosterStatus.js';

type Sheets = sheets_v4.Sheets;

export const NEW_USERS_SHEET: string = SHEETS.NEW_USERS;

export const NEW_USERS_HEADERS = [
  'email',
  'nombre',
  'foto',
  'primerRegistro',
  'ultimoAcceso',
  'accesos',
  'idioma',
  'estado',
] as const;

const LAST_COL = String.fromCharCode(64 + NEW_USERS_HEADERS.length); // 'H'

export interface ClientUser {
  name: string;
  email: string;
  role: 'Cliente';
  accessLevel: 'cliente';
}

export interface GoogleProfileForRegister {
  email: string;
  name?: string;
  picture?: string;
  locale?: string;
}

interface Located {
  rowNumber: number; // A1 (1-based, header = 1)
  row: string[];
  idx: Record<(typeof NEW_USERS_HEADERS)[number], number>;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function toClientUser(email: string, name: string): ClientUser {
  return {
    name: name || email.split('@')[0],
    email,
    role: 'Cliente',
    accessLevel: 'cliente',
  };
}

async function readAll(sheets: Sheets): Promise<{ rows: string[][]; idx: Located['idx'] }> {
  await ensureSheet(sheets, NEW_USERS_SHEET, [...NEW_USERS_HEADERS], SPREADSHEET_ID);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${NEW_USERS_SHEET}'!A:${LAST_COL}`,
  });
  const rows = (response.data.values || []) as string[][];
  const headers = (rows[0] || [...NEW_USERS_HEADERS]) as string[];
  const idx = Object.fromEntries(
    NEW_USERS_HEADERS.map((h) => [h, findColumnIndex(headers, [h])]),
  ) as Located['idx'];
  return { rows, idx };
}

function locate(rows: string[][], idx: Located['idx'], email: string): Located | null {
  if (idx.email === -1) return null;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (normalizeEmail(String(row[idx.email] || '')) === email) {
      return { rowNumber: i + 1, row, idx };
    }
  }
  return null;
}

function cell(found: Located, key: (typeof NEW_USERS_HEADERS)[number]): string {
  const i = found.idx[key];
  return i === -1 ? '' : String(found.row[i] ?? '');
}

/**
 * Busca un cliente ACTIVO por email. Null si no está o si su estado no es
 * "activo" — para el llamador es lo mismo: no entra como cliente.
 */
export async function findClientRow(
  sheets: Sheets,
  email: string,
): Promise<ClientUser | null> {
  const normalized = normalizeEmail(email);
  const { rows, idx } = await readAll(sheets);
  const found = locate(rows, idx, normalized);
  if (!found) return null;
  if (!isRosterRowActive(cell(found, 'estado'), idx.estado !== -1)) return null;
  return toClientUser(normalized, cell(found, 'nombre'));
}

/**
 * Registra (o refresca) un cliente a partir de un perfil de Google YA
 * verificado. Fila nueva → estado "activo". Fila existente → actualiza
 * nombre/foto/idioma/últimoAcceso y suma un acceso, sin tocar `estado` ni
 * `primerRegistro`. Devuelve null cuando la fila existe pero no está activa:
 * el registro se anota igual (queda la huella del intento), pero no da acceso.
 */
export async function upsertClient(
  sheets: Sheets,
  profile: GoogleProfileForRegister,
): Promise<ClientUser | null> {
  const email = normalizeEmail(profile.email);
  const name = String(profile.name || '').trim();
  const picture = String(profile.picture || '').trim();
  const locale = String(profile.locale || '').trim();
  const now = new Date().toISOString();

  const { rows, idx } = await readAll(sheets);
  const found = locate(rows, idx, email);

  if (!found) {
    const values = [[email, name, picture, now, now, '1', locale, 'activo']];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${NEW_USERS_SHEET}'!A:${LAST_COL}`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    return toClientUser(email, name);
  }

  const accesos = String((parseInt(cell(found, 'accesos'), 10) || 0) + 1);
  const estado = cell(found, 'estado');
  const values = [
    [
      email,
      name || cell(found, 'nombre'),
      picture || cell(found, 'foto'),
      cell(found, 'primerRegistro') || now,
      now,
      accesos,
      locale || cell(found, 'idioma'),
      estado,
    ],
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${NEW_USERS_SHEET}'!A${found.rowNumber}:${LAST_COL}${found.rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  if (!isRosterRowActive(estado, idx.estado !== -1)) return null;
  return toClientUser(email, name || cell(found, 'nombre'));
}
