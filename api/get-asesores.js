/**
 * Vercel Serverless Function - Get Asesores from Google Sheets
 *
 * Extracts unique asesores from the inventory data
 * and returns them as JSON for the ambassadors page.
 */

import {
  sendSuccess,
  SPREADSHEET_ID,
  CACHE,
  withApiHandler,
  getSheetNames,
  findColumnIndex,
  formatDisplayName,
  DRIVE_FOLDERS,
} from './_lib/index.js';

export default withApiHandler(async (req, res, { sheets, drive, sharedDriveId }) => {
  const sheetNames = await getSheetNames(sheets);

  // Use sheet 3 (index 2) for asesores data
  let asesoresSheet = sheetNames[2];
  if (!asesoresSheet) {
    asesoresSheet = sheetNames.find(name =>
      name.toLowerCase().includes('asesor') ||
      name.toLowerCase().includes('embajador') ||
      name.toLowerCase().includes('ambassador')
    ) || sheetNames[0];
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${asesoresSheet}'!A:Z`,
  });

  const rows = response.data.values || [];

  if (!rows || rows.length === 0) {
    return sendSuccess(res, {
      asesores: [],
      message: 'No data found in asesores sheet',
      sheetName: asesoresSheet,
      availableSheets: sheetNames,
    });
  }

  const headers = rows[0];
  const nameColumnIndex = findColumnIndex(headers, ['nombre', 'name', 'asesor', 'vendedor']);

  if (nameColumnIndex === -1) {
    return sendSuccess(res, {
      asesores: [],
      message: 'No name column found in sheet',
      headers: rows[0],
      availableSheets: sheetNames,
    });
  }

  // Find optional columns
  const roleIndex = findColumnIndex(headers, ['datos', 'rol', 'role', 'tipo']);
  const whatsappIndex = findColumnIndex(headers, ['whatsapp', 'telefono', 'phone']);
  const especialidadIndex = findColumnIndex(headers, ['especialidad', 'specialty']);
  const instagramIndex = findColumnIndex(headers, ['instagram', 'ig', 'email']);
  const estadoIndex = findColumnIndex(headers, ['estado', 'status']);

  const dataRows = rows.slice(1);
  const asesoresData = [];

  dataRows.forEach((row, index) => {
    const name = row[nameColumnIndex];
    if (!name || String(name).trim() === '') return;

    // Check if asesor is active
    if (estadoIndex !== -1) {
      const estado = String(row[estadoIndex] || '').toLowerCase();
      if (estado === 'inactivo' || estado === 'inactive') return;
    }

    const displayName = formatDisplayName(name);

    // Clean email by trimming whitespace (common issue from spreadsheet copy/paste)
    const rawEmail = instagramIndex !== -1 ? row[instagramIndex] : null;
    const cleanEmail = rawEmail ? String(rawEmail).trim().toLowerCase() : null;

    asesoresData.push({
      id: `asesor_${index + 1}`,
      name: displayName,
      slug: displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      role: roleIndex !== -1 ? (row[roleIndex] || 'Asesor').trim() : 'Asesor',
      whatsapp: whatsappIndex !== -1 ? row[whatsappIndex] || null : null,
      especialidad: especialidadIndex !== -1 ? row[especialidadIndex] || null : null,
      email: cleanEmail,
    });
  });

  asesoresData.sort((a, b) => a.name.localeCompare(b.name, 'es'));

  // Scan Drive ambassadors/ folder for profile photos
  if (drive && sharedDriveId) {
    try {
      const folderResponse = await drive.files.list({
        q: `name='${DRIVE_FOLDERS.AMBASSADORS}' and mimeType='application/vnd.google-apps.folder' and '${sharedDriveId}' in parents and trashed=false`,
        fields: 'files(id)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const ambassadorsFolderId = folderResponse.data.files?.[0]?.id;
      if (ambassadorsFolderId) {
        const photosResponse = await drive.files.list({
          q: `'${ambassadorsFolderId}' in parents and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/webp') and trashed=false`,
          fields: 'files(id, name)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          pageSize: 100,
        });

        const photoMap = {};
        for (const file of (photosResponse.data.files || [])) {
          const slug = file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '');
          photoMap[slug] = file.id;
        }

        for (const asesor of asesoresData) {
          const fileId = photoMap[asesor.slug];
          if (fileId) {
            asesor.photoFileId = fileId;
            asesor.photoUrl = `/api/serve-drive-image?fileId=${fileId}`;
          }
        }
      }
    } catch (photoError) {
      console.warn('[GetAsesores] Could not scan ambassador photos:', photoError.message);
    }
  }

  return sendSuccess(res, {
    asesores: asesoresData,
    count: asesoresData.length,
    sheetName: asesoresSheet,
    lastUpdated: new Date().toISOString(),
  });
}, {
  cache: CACHE.NONE,
  provideSheets: true,
  provideDrive: true,
  errorPrefix: 'GetAsesores',
});
