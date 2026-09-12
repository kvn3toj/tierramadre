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

function indexHeaders(headers: string[]): Located['idx'] {
  return Object.fromEntries(
    NEW_USERS_HEADERS.map((h) => [h, findColumnIndex(headers, [h])]),
  ) as Located['idx'];
}

/**
 * Lee la pestaña entera. `ensure` sólo desde la escritura (upsertClient): la
 * lectura por email llega de un GET sin autenticar y no debe crear nada. Si la
 * pestaña no existe todavía la lectura devuelve cero filas.
 */
async function readAll(
  sheets: Sheets,
  ensure: boolean,
): Promise<{ rows: string[][]; idx: Located['idx'] }> {
  if (ensure) {
    await ensureSheet(sheets, NEW_USERS_SHEET, [...NEW_USERS_HEADERS], SPREADSHEET_ID);
  }
  let rows: string[][] = [];
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${NEW_USERS_SHEET}'!A:${LAST_COL}`,
    });
    rows = (response.data.values || []) as string[][];
  } catch (err) {
    // "Unable to parse range" = la pestaña no existe. Sin pestaña no hay
    // clientes; cualquier otro error sí sube (cuota, permisos).
    const msg = err instanceof Error ? err.message : String(err);
    if (!/Unable to parse range/i.test(msg)) throw err;
    rows = [];
  }

  // Pestaña vaciada a mano (sin cabecera): al escribir la reponemos en A1:H1
  // con rango cerrado; al leer, tratamos la hoja como vacía en vez de tomar
  // la primera fila de datos como cabecera y perder a ese cliente.
  const hasHeader = rows.length > 0 && findColumnIndex(rows[0] as string[], ['email']) !== -1;
  if (!hasHeader) {
    if (ensure) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${NEW_USERS_SHEET}'!A1:${LAST_COL}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [[...NEW_USERS_HEADERS]] },
      });
      rows = [[...NEW_USERS_HEADERS], ...rows.filter((r) => (r || []).length > 0 && r !== rows[0])];
    } else {
      rows = [];
    }
  }
  const headers = (rows[0] || [...NEW_USERS_HEADERS]) as string[];
  return { rows, idx: indexHeaders(headers) };
}

/** TODAS las filas de ese email (puede haber duplicados por carrera). */
function locateAll(rows: string[][], idx: Located['idx'], email: string): Located[] {
  if (idx.email === -1) return [];
  const out: Located[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (normalizeEmail(String(row[idx.email] || '')) === email) {
      out.push({ rowNumber: i + 1, row, idx });
    }
  }
  return out;
}

/**
 * Falla cerrado ante duplicados: si CUALQUIER fila de ese email está fuera de
 * "activo", el cliente no entra. Así un bloqueo escrito en la copia que el
 * admin vio (la de abajo) manda aunque la primera copia siga en "activo".
 */
function anyInactive(found: Located[], idx: Located['idx']): boolean {
  return found.some((f) => !isRosterRowActive(cell(f, 'estado'), idx.estado !== -1));
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
  sheetNames?: string[],
): Promise<ClientUser | null> {
  // Con la lista de pestañas a mano nos ahorramos la lectura cuando la hoja
  // no existe todavía (ningún cliente registrado): una llamada menos por
  // cada GET de validate.
  if (sheetNames && !sheetNames.includes(NEW_USERS_SHEET)) return null;
  const normalized = normalizeEmail(email);
  const { rows, idx } = await readAll(sheets, false);
  const found = locateAll(rows, idx, normalized);
  if (found.length === 0) return null;
  if (anyInactive(found, idx)) return null;
  return toClientUser(normalized, cell(found[0], 'nombre'));
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

  const { rows, idx } = await readAll(sheets, true);
  const all = locateAll(rows, idx, email);
  const found = all[0] ?? null;

  if (!found) {
    // Fila nueva con `values.update` sobre un rango CERRADO calculado desde la
    // lectura que ya hicimos — nunca `values.append` con rango abierto, que en
    // este mismo libro ya ancló 57 celdas en la columna AT (2026-08-03).
    const rowNumber = rows.length + 1;
    const values = [[email, name, picture, now, now, '1', locale, 'activo']];
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${NEW_USERS_SHEET}'!A${rowNumber}:${LAST_COL}${rowNumber}`,
      valueInputOption: 'RAW',
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

  if (anyInactive(all, idx)) return null;
  return toClientUser(email, name || cell(found, 'nombre'));
}
