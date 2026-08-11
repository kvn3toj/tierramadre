/**
 * The Asesores roster, loaded once and shared.
 *
 * Created 2026-08-11 to collapse a coupling PR #91 introduced and flagged:
 * `api/ambassador-products.ts` had to repeat `get-asesores.ts`'s name-column
 * aliases and active-row filter, because that parse lives inline in its handler
 * and is not importable. Two copies of a column resolution is precisely how
 * the A1 bug happened (an email column resolved by the wrong alias), so the
 * second copy gets one home before a third appears.
 *
 * `api/ambassador-curation.ts` needs the reverse lookup — session email →
 * slug — to answer "does this caller own the profile they are writing to",
 * which is the whole authorization decision. That question must never be
 * answered from a client-supplied field.
 */
import type { sheets_v4 } from '@googleapis/sheets';
import {
  SPREADSHEET_ID,
  findSheetByPattern,
  findColumnIndex,
  formatDisplayName,
} from './index.js';
import { slugifyAsesorName } from './asesorSlug.js';
import { resolveEmailColumnIndex, toAsesorEmail } from './asesorEmail.js';
import { isRosterRowActive } from './rosterStatus.js';

type Sheets = sheets_v4.Sheets;

export interface RosterEntry {
  /** Display name as written in the roster, after formatDisplayName. */
  name: string;
  /** Profile slug — the same one the /ambassadors/:slug route uses. */
  slug: string;
  /** Lowercased address, or null when the cell holds something that is not one. */
  email: string | null;
}

/**
 * Reads the active roster. Inactive rows are dropped here, once, so no caller
 * has to remember to filter them.
 */
export async function loadAsesorRoster(
  sheets: Sheets,
  sheetNames: string[],
): Promise<RosterEntry[]> {
  const asesoresSheet =
    findSheetByPattern(sheetNames, ['asesor', 'embajador', 'ambassador']) ||
    sheetNames[2];
  if (!asesoresSheet) return [];

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${asesoresSheet}!A:Z`,
  });
  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];

  const headers = rows[0] as string[];
  const nameColumnIndex = findColumnIndex(headers, [
    'nombre',
    'name',
    'asesor',
    'vendedor',
  ]);
  if (nameColumnIndex === -1) return [];
  const estadoIndex = findColumnIndex(headers, ['estado', 'status']);
  const emailIndex = resolveEmailColumnIndex(headers);

  const roster: RosterEntry[] = [];
  for (const row of rows.slice(1)) {
    const rawName = row[nameColumnIndex];
    if (!rawName || String(rawName).trim() === '') continue;
    // Allowlist, no denylist — PR #100. La lista negra fallaba ABIERTA:
    // cualquier valor que no fuera «inactivo»/«inactive» («retirado»,
    // «suspendido», «baja»…) contaba como activo, así que dar de baja a un
    // asesor no siempre le quitaba el acceso. Aquí pesa el doble: de este
    // roster sale la autorización de escritura de /api/ambassador-curation,
    // o sea quién puede publicar una pieza a la venta con su nombre encima.
    if (!isRosterRowActive(row[estadoIndex], estadoIndex !== -1)) continue;
    const name = formatDisplayName(rawName);
    roster.push({
      name,
      slug: slugifyAsesorName(name),
      email: emailIndex !== -1 ? toAsesorEmail(row[emailIndex]) : null,
    });
  }
  return roster;
}

/** The roster entry a profile slug belongs to, or null. */
export function findBySlug(
  roster: RosterEntry[],
  slug: string,
): RosterEntry | null {
  return roster.find((entry) => entry.slug === slug) ?? null;
}

/**
 * The roster entry a verified session email belongs to, or null.
 *
 * This is the authorization primitive: the caller proved an email by
 * presenting a signed `tms1` token, and the roster says which profile that
 * email owns. A caller with no roster row owns no profile, full stop.
 */
export function findByEmail(
  roster: RosterEntry[],
  email: string,
): RosterEntry | null {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  return roster.find((entry) => entry.email === needle) ?? null;
}
