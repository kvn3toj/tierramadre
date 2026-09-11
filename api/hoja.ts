/**
 * Hoja API — una hoja de cálculo de Google, cualquiera.
 *
 * El bot NO puede crear la hoja él mismo: su service account no tiene cuota de
 * Drive (`storageQuotaExceeded`), así que no puede ser DUEÑO de archivos. El
 * OAuth de la casa sí, y vive aquí. Por eso este endpoint existe.
 *
 * Es genérico a propósito. La versión anterior (`/api/cotizacion-hoja`) sabía
 * qué era una cotización y traía el encabezado cableado; se descartó: Anima lee
 * la solicitud del dueño y diseña las columnas ella misma, así que lo único que
 * este endpoint necesita saber es `titulo` + `columnas` + `filas` + a quién se
 * le comparte.
 *
 * Tres cosas que parecen detalle y no lo son:
 *
 *  1. NO lleva `export const config = { api: { bodyParser: false } }`. Eso
 *     existe en `cotizacion-deck.ts` solo porque formidable necesita el stream
 *     crudo; aquí apagaría el parser y `req.body` llegaría `undefined`, con
 *     TODOS los campos leyéndose como ausentes, en silencio.
 *  2. Se escribe con `valueInputOption: 'RAW'`, siempre. Los valores pueden
 *     llegar ya formateados en pesos (`$7'907.465`) y `USER_ENTERED` los
 *     reinterpreta.
 *  3. Se comparte DESPUÉS de escribir. Si algo falla a mitad, nadie recibe el
 *     enlace de una hoja a medio llenar.
 *
 * Igual que el deck: lo llama el bot y crea archivos en el Shared Drive, así que
 * lleva puerta (bearer con `ANIMA_BOT_SECRET`).
 */
import type { drive_v3 } from '@googleapis/drive';
import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { bearerMatches } from './_lib/bearer.js';
import { getOAuthSheetsClient } from './_lib/oauth-drive-client.js';
import { eligeOperacion } from './_lib/deck-upload.js';
import {
  CARPETA_HOJAS,
  MIME_CARPETA,
  MIME_SHEETS,
  consultaCarpetaHojas,
  consultaHoja,
  matrizDeValores,
  rangoDeEscritura,
  validaSolicitud,
} from './_lib/hoja.js';

/**
 * Carpeta `hojas`, HERMANA de `cotizaciones`: el mismo padre, el Shared Drive.
 * Calca la primera mitad de `getAsesorCotizacionesFolder` (drive-helpers.js) —
 * ese find-or-create bajo el `sharedDriveId` es exactamente lo que hace falta,
 * sin los dos niveles de `asesores/{email}` que aquí no aplican: estas hojas no
 * son de un asesor, son del dueño.
 */
async function carpetaHojas(
  drive: drive_v3.Drive,
  sharedDriveId: string,
): Promise<string> {
  const previa = await drive.files.list({
    q: consultaCarpetaHojas(sharedDriveId),
    fields: 'files(id, name)',
    // Sin `driveId`/`corpora` a propósito (igual que el resto del repo), pero
    // estos dos sí: sin ellos el Shared Drive es invisible para la consulta.
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const encontrada = previa.data.files?.[0]?.id;
  if (encontrada) return encontrada;

  const creada = await drive.files.create({
    requestBody: {
      name: CARPETA_HOJAS,
      mimeType: MIME_CARPETA,
      parents: [sharedDriveId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  const id = creada.data.id;
  if (!id) throw new Error('Drive no devolvió el id de la carpeta hojas');
  return id;
}

/** Exportado para los tests: el default va envuelto en `withApiHandler`. */
export async function handleHoja(
  req: VercelRequest,
  res: VercelResponse,
  ctx: Record<string, unknown>,
) {
  if (
    !bearerMatches(req.headers['authorization'], process.env.ANIMA_BOT_SECRET)
  ) {
    return sendError(res, 401, 'No autorizado');
  }

  const { oauthDrive, sharedDriveId } = ctx as {
    oauthDrive: drive_v3.Drive | null;
    sharedDriveId: string;
  };
  if (!oauthDrive) {
    return sendError(res, 500, 'OAuth Drive no está configurado');
  }

  // Rechazar en el borde, nunca sanear en silencio.
  let datos;
  try {
    datos = validaSolicitud((req.body ?? {}) as Record<string, unknown>);
  } catch (err) {
    return sendError(res, 400, (err as Error).message);
  }
  const { titulo, columnas, filas, emailDestino } = datos;
  const valores = matrizDeValores(columnas, filas);

  const folderId = await carpetaHojas(oauthDrive, sharedDriveId);

  // Idempotente por título EXACTO: pedir dos veces «Gastos septiembre» reemplaza
  // la misma hoja en vez de llenar la carpeta de duplicados. El filtro de
  // mimeType de `consultaHoja` es el que evita tocar el archivo de otro
  // endpoint que se llame igual.
  const previo = await oauthDrive.files.list({
    q: consultaHoja(titulo, folderId, emailDestino),
    fields: 'files(id, webViewLink)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const existentes = previo.data.files ?? [];
  const op = eligeOperacion(existentes);
  const sheets = await getOAuthSheetsClient();

  let fileId: string | null | undefined;
  let webViewLink: string | null | undefined;
  let operacion: 'creada' | 'reemplazada';

  if (op.tipo === 'actualizar') {
    fileId = op.fileId;
    // `eligeOperacion` se queda con el primero: es el mismo de `existentes[0]`,
    // así que el link ya vino en el listado y no hace falta un `files.get`.
    webViewLink = existentes[0]?.webViewLink;
    operacion = 'reemplazada';
  } else {
    // El archivo se crea por Drive (no por `spreadsheets.create`) porque solo
    // Drive sabe ponerlo dentro de una carpeta del Shared Drive.
    const creada = await oauthDrive.files.create({
      requestBody: {
        name: titulo,
        mimeType: MIME_SHEETS,
        parents: [folderId],
        // El destinatario ENTRA EN LA IDENTIDAD de la hoja. Sin esto, la
        // deduplicación por título es global y los títulos los inventa el
        // modelo: dos personas que pidan «Gastos septiembre 2026» se pisarían
        // el archivo, y la primera conservaría acceso de editor a los datos de
        // la segunda. No es un duplicado molesto, es una fuga.
        appProperties: { solicitante: emailDestino },
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });
    fileId = creada.data.id;
    webViewLink = creada.data.webViewLink;
    operacion = 'creada';
  }

  // Ajustar la CUADRÍCULA y limpiar lo viejo, en un solo batchUpdate y por
  // `sheetId`, no por un rango de texto. Dos motivos, los dos medidos:
  //
  //  1. Una hoja nueva nace de 1000x26. `values.update` NO agranda la
  //     cuadrícula: escribir 30 columnas devuelve 400 «exceeds grid limits», y
  //     este endpoint es GENÉRICO — las columnas las diseña Anima y pasar de la
  //     Z es cuestión de tiempo. Se pide el tamaño que hace falta antes.
  //  2. Limpiar con un rango fijo tipo `A1:Z10000` deja intacto lo que hubiera
  //     en AA+ de una hoja anterior más ancha, y eso queda pegado a los datos
  //     nuevos como si fuera parte de ellos — justo el fallo que el limpiado
  //     existe para evitar. `updateCells` con `fields: '*'` sobre la hoja
  //     entera no tiene ese borde.
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: fileId as string,
    fields: 'sheets.properties(sheetId,gridProperties)',
  });
  const hoja0 = meta.data.sheets?.[0]?.properties;
  const sheetId = hoja0?.sheetId ?? 0;
  const filasNecesarias = Math.max(valores.length, 1);
  const columnasNecesarias = Math.max(
    ...valores.map((f) => f.length),
    1,
  );
  const requests: sheets_v4.Schema$Request[] = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            rowCount: Math.max(
              filasNecesarias,
              hoja0?.gridProperties?.rowCount ?? 0,
            ),
            columnCount: Math.max(
              columnasNecesarias,
              hoja0?.gridProperties?.columnCount ?? 0,
            ),
          },
        },
        fields: 'gridProperties.rowCount,gridProperties.columnCount',
      },
    },
  ];
  if (operacion === 'reemplazada') {
    // Sin `range` = la hoja entera, sin importar cuán ancha fuera antes.
    requests.push({ updateCells: { range: { sheetId }, fields: '*' } });
  }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: fileId as string,
    requestBody: { requests },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: fileId as string,
    range: rangoDeEscritura(valores),
    // RAW: los valores llegan tal como los diseñó Anima. Ver el módulo puro.
    valueInputOption: 'RAW',
    requestBody: { values: valores },
  });

  // Compartir al final: si algo falló arriba, nadie recibió el enlace de una
  // hoja a medio llenar. Sin correo de notificación — quien la pidió ya está
  // esperando la respuesta del bot.
  await oauthDrive.permissions.create({
    fileId: fileId as string,
    requestBody: {
      role: 'writer',
      type: 'user',
      emailAddress: emailDestino,
    },
    sendNotificationEmail: false,
    supportsAllDrives: true,
  });

  return sendSuccess(res, { fileId, webViewLink, operacion });
}

export default withApiHandler(handleHoja, {
  methods: ['POST', 'OPTIONS'],
  provideOAuthDrive: true,
  requireDriveId: true,
  errorPrefix: 'Hoja',
});
