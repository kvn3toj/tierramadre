/**
 * Vercel Serverless Function - Get Asesores from Google Sheets
 *
 * Extracts unique asesores from the inventory data
 * and returns them as JSON for the ambassadors page.
 */

import type { sheets_v4 } from '@googleapis/sheets';
import type { drive_v3 } from '@googleapis/drive';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  sendSuccess,
  SPREADSHEET_ID,
  CACHE,
  withApiHandler,
  getSheetNames,
  findSheetByPattern,
  findColumnIndex,
  formatDisplayName,
  DRIVE_FOLDERS,
} from './_lib/index.js';
import { resolveGrant } from './_lib/catalogGrant.js';
import { lookupVitrina } from './_lib/vitrinaLookup.js';
import { projectAsesoresForGrant } from './_lib/catalogProjection.js';
import { slugifyAsesorName } from './_lib/asesorSlug.js';
import { resolveEmailColumnIndex, toAsesorEmail } from './_lib/asesorEmail.js';

type Sheets = sheets_v4.Sheets;
type Drive = drive_v3.Drive;

/** Public API row — aligned with frontend `Asesor` usage (see src/types, useAsesores). */
export interface GetAsesoresRow {
  id: string;
  name: string;
  slug: string;
  role: string;
  whatsapp: string | null;
  especialidad: string | null;
  email: string | null;
  photoFileId?: string;
  photoUrl?: string;
  vaultCode: string | null;
}

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    context: Record<string, unknown>,
  ) => {
    // F5 (2026-08 fix round — ruling supersedes the original "empty list for
    // non-staff" approach): the asesor directory is sensitive as a whole
    // (an anonymous caller should not enumerate the full sales force with
    // email + internal vault code), but per-asesor public fields (name,
    // slug, role, especialidad, photo, whatsapp — see the DEVIATION note on
    // toPublicAsesor in catalogProjection.ts) are what public/guest pages
    // (ambassador profiles, the invitation flow, vitrina contact CTAs)
    // legitimately need. Project instead of emptying — see
    // projectAsesoresForGrant below, applied to every branch that carries
    // asesor data.
    const grant = await resolveGrant(req, { lookupVitrina });

    const sheets = context.sheets as Sheets;
    const drive = context.drive as Drive;
    const sharedDriveId = context.sharedDriveId as string | undefined;
    const sheetNames = await getSheetNames(sheets);

    // Locate the asesores sheet by name first; fall back to legacy index 2.
    // Pattern-first survives sheet reordering (e.g. when "Proveedores" lands at index 2).
    const asesoresSheet =
      findSheetByPattern(sheetNames, ['asesor', 'embajador', 'ambassador']) ||
      sheetNames[2] ||
      sheetNames[0];

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${asesoresSheet}'!A:Z`,
    });

    const rows = response.data.values || [];

    if (!rows || rows.length === 0) {
      return sendSuccess(res, {
        // Already empty — projected anyway so this branch can't become the
        // one that forgets, if it ever stops being empty.
        asesores: projectAsesoresForGrant([], grant),
        message: 'No data found in asesores sheet',
        // sheetName/availableSheets describe internal spreadsheet layout —
        // staff only, same rule as get-treasure-sheets.ts.
        ...(grant.kind === 'staff'
          ? { sheetName: asesoresSheet, availableSheets: sheetNames }
          : {}),
      });
    }

    const headers = rows[0];
    const nameColumnIndex = findColumnIndex(headers, [
      'nombre',
      'name',
      'asesor',
      'vendedor',
    ]);

    if (nameColumnIndex === -1) {
      return sendSuccess(res, {
        asesores: projectAsesoresForGrant([], grant),
        message: 'No name column found in sheet',
        // headers/availableSheets describe internal spreadsheet layout —
        // staff only.
        ...(grant.kind === 'staff'
          ? { headers: rows[0], availableSheets: sheetNames }
          : {}),
      });
    }

    // Find optional columns
    const roleIndex = findColumnIndex(headers, [
      'datos',
      'rol',
      'role',
      'tipo',
    ]);
    const whatsappIndex = findColumnIndex(headers, [
      'whatsapp',
      'telefono',
      'phone',
    ]);
    const especialidadIndex = findColumnIndex(headers, [
      'especialidad',
      'specialty',
    ]);
    // A1: NOT findColumnIndex. That helper matches on substring, and the old
    // pattern list here (`['instagram', 'ig', 'email']`) let the two-letter
    // 'ig' claim Codigo / Origen / Digital / Vigencia, and let an Instagram
    // column outrank a real Email one. Either way `isProfileOwner` breaks in
    // silence. See _lib/asesorEmail.ts for the full reasoning.
    const emailIndex = resolveEmailColumnIndex(headers);
    const estadoIndex = findColumnIndex(headers, ['estado', 'status']);
    const vaultCodeIndex = findColumnIndex(headers, [
      'vaultcode',
      'vault_code',
      'codigo_boveda',
      'boveda',
    ]);

    const dataRows = rows.slice(1);
    const asesoresData: GetAsesoresRow[] = [];

    dataRows.forEach((row, index) => {
      const name = row[nameColumnIndex];
      if (!name || String(name).trim() === '') return;

      // Check if asesor is active
      if (estadoIndex !== -1) {
        const estado = String(row[estadoIndex] || '').toLowerCase();
        if (estado === 'inactivo' || estado === 'inactive') return;
      }

      const displayName = formatDisplayName(name);

      // Trims and lowercases (spreadsheet copy/paste carries both), and
      // returns null for anything that is not actually an address — so a
      // stray handle or vault code can never travel onward as an email.
      const cleanEmail =
        emailIndex !== -1 ? toAsesorEmail(row[emailIndex]) : null;

      asesoresData.push({
        id: `asesor_${index + 1}`,
        name: displayName,
        slug: slugifyAsesorName(displayName),
        role: roleIndex !== -1 ? (row[roleIndex] || 'Asesor').trim() : 'Asesor',
        whatsapp: whatsappIndex !== -1 ? row[whatsappIndex] || null : null,
        especialidad:
          especialidadIndex !== -1 ? row[especialidadIndex] || null : null,
        email: cleanEmail,
        vaultCode:
          vaultCodeIndex !== -1
            ? row[vaultCodeIndex]
              ? String(row[vaultCodeIndex]).trim()
              : null
            : null,
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

          const photoMap: Record<string, string> = {};
          for (const file of photosResponse.data.files || []) {
            if (!file.name || !file.id) continue;
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
      } catch (photoError: unknown) {
        const msg =
          photoError instanceof Error ? photoError.message : String(photoError);
        console.warn('[GetAsesores] Could not scan ambassador photos:', msg);
      }
    }

    return sendSuccess(res, {
      asesores: projectAsesoresForGrant(asesoresData, grant),
      count: asesoresData.length,
      ...(grant.kind === 'staff' ? { sheetName: asesoresSheet } : {}),
      lastUpdated: new Date().toISOString(),
    });
  },
  {
    cache: CACHE.NONE,
    provideSheets: true,
    provideDrive: true,
    errorPrefix: 'GetAsesores',
  },
);
