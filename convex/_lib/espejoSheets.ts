/**
 * El transporte del espejo: Convex → Google Sheets, directo.
 *
 * ¿Por qué no reusar `pushTableRowToVercel`? Porque ese transporte sale por
 * `${APP_URL}/api/admin-table-update`, y el libro se resuelve server-side en
 * Vercel desde `FOTOSINTESIS_SPREADSHEET_ID`. Apuntarlo al libro de PRUEBAS
 * exigiría tocar env vars de Vercel (prohibido en este plan) o desplegar `api/`
 * a un preview. Peor: el `APP_URL` del deployment de dev apunta a PRODUCCIÓN, o
 * sea que ese camino escribe en el SOT v3 vivo.
 *
 * Acá se habla con la Sheets API v4 por `fetch`, con las credenciales OAuth que
 * el repo ya usa (`api/_lib/google-clients.js` autentica igual: refresh token de
 * cuenta personal, NO service account). Env vars del deployment de Convex:
 *
 *   GOOGLE_OAUTH_CLIENT_ID · GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_REFRESH_TOKEN · ESPEJO_SPREADSHEET_ID
 *
 * Push-only por construcción: este módulo escribe y lee para ubicar la fila,
 * pero nada de lo que lee vuelve a Convex como dato. La hoja es una vista.
 */

import { exigeDeploymentDelEspejo } from './destinoEscritura';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

function requiereEnv(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable ${nombre} en el deployment de Convex. ` +
        `El espejo no puede escribir sin credenciales.`,
    );
  }
  return valor;
}

export function espejoSpreadsheetId(): string {
  return requiereEnv('ESPEJO_SPREADSHEET_ID');
}

/**
 * Un access token fresco a partir del refresh token.
 *
 * No se cachea entre invocaciones: cada acción de Convex es un proceso efímero,
 * y un token guardado en memoria global sobreviviría de forma impredecible. El
 * costo es una llamada extra por drenaje, no por fila.
 *
 * **Acá vive el candado del espejo**, y no en cada acción que escribe: sin token
 * no hay forma de tocar el libro, así que un camino nuevo hereda el permiso solo.
 * Un guard por acción se olvida; este no se puede saltear.
 */
export async function obtenerAccessToken(): Promise<string> {
  exigeDeploymentDelEspejo(process.env.CONVEX_CLOUD_URL);

  const body = new URLSearchParams({
    client_id: requiereEnv('GOOGLE_OAUTH_CLIENT_ID'),
    client_secret: requiereEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
    refresh_token: requiereEnv('GOOGLE_OAUTH_REFRESH_TOKEN'),
    grant_type: 'refresh_token',
  });

  const res = await fetch(TOKEN_URL, { method: 'POST', body });
  const json = (await res.json()) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      `No se pudo renovar el token de Google (${res.status}): ` +
        `${json.error_description ?? json.error ?? 'sin detalle'}`,
    );
  }
  return json.access_token;
}

async function sheetsFetch(
  token: string,
  ruta: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(`${SHEETS_API}/${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const texto = await res.text();
  if (!res.ok) {
    throw new Error(`Sheets API ${res.status}: ${texto.slice(0, 300)}`);
  }
  return texto ? JSON.parse(texto) : {};
}

/** Las pestañas que existen hoy en el libro. */
export async function listarPestanas(
  token: string,
  spreadsheetId: string,
): Promise<string[]> {
  const data = (await sheetsFetch(
    token,
    `${spreadsheetId}?fields=sheets.properties.title`,
  )) as { sheets?: { properties?: { title?: string } }[] };
  return (data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => !!t);
}

/** Crea una pestaña si no existe. Idempotente. */
export async function asegurarPestana(
  token: string,
  spreadsheetId: string,
  titulo: string,
): Promise<void> {
  const existentes = await listarPestanas(token, spreadsheetId);
  if (existentes.includes(titulo)) return;
  await sheetsFetch(token, `${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: titulo } } }],
    }),
  });
}

/** Devuelve un rango como matriz de strings (vacío si la pestaña está en blanco). */
export async function leerRango(
  token: string,
  spreadsheetId: string,
  rango: string,
): Promise<string[][]> {
  const data = (await sheetsFetch(
    token,
    `${spreadsheetId}/values/${encodeURIComponent(rango)}`,
  )) as { values?: string[][] };
  return data.values ?? [];
}

/**
 * Agrega una fila al final de la pestaña, dejando que Google resuelva CUÁL es
 * el final.
 *
 * Calcular la fila del lado del cliente (`filas.length + 2`) es el mismo error
 * que el `rowIndex = maxRow + 1` del riel viejo: el rango leído omite filas
 * finales vacías en la columna consultada, así que una fila con una nota suelta
 * al final se sobrescribía.
 */
export async function agregarFila(
  token: string,
  spreadsheetId: string,
  pestana: string,
  valores: (string | null)[],
): Promise<void> {
  await sheetsFetch(
    token,
    `${spreadsheetId}/values/${encodeURIComponent(pestana)}:append` +
      `?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: [valores] }) },
  );
}

export async function escribirRango(
  token: string,
  spreadsheetId: string,
  rango: string,
  valores: (string | null)[][],
): Promise<void> {
  await sheetsFetch(
    token,
    `${spreadsheetId}/values/${encodeURIComponent(rango)}?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ values: valores }) },
  );
}

/** Índice de columna (0) → letra A1 («A», «Z», «AA»). */
export function columnaA1(indice: number): string {
  let n = indice;
  let letras = '';
  do {
    letras = String.fromCharCode(65 + (n % 26)) + letras;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letras;
}

/**
 * El texto de la pestaña Léeme. Es la única defensa real contra que alguien
 * edite la hoja creyendo que cambia algo: decirlo donde se ve.
 */
export const TEXTO_LEEME = [
  ['SOT v4 · Espejo (PRUEBAS)'],
  [
    'Este libro es un ESPEJO de Convex. Editarlo no cambia nada: tu edición ' +
      'será detectada y reportada como deriva, y el próximo cambio en Convex ' +
      'la sobrescribe.',
  ],
  [''],
  ['La fuente de verdad es Convex. Los datos nacen en los wizards de'],
  ['Fotosíntesis (W1 lote, W2 casilla, W3 movimiento), se validan ahí, y'],
  ['desde ahí se empujan a este libro.'],
  [''],
  ['Pestañas: Lotes · Casillas · Movimientos'],
  ['Las filas se identifican por su id (loteId, itemId). Reordenar columnas'],
  ['es seguro: el espejo escribe por cabecera nombrada, no por posición.'],
  ['Borrar o renombrar una CABECERA sí rompe el espejo de esa columna.'],
] as const;
