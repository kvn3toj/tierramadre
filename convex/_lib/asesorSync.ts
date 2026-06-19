/**
 * Pure planning core for the legacy Asesores sheet → Convex `clients` pull-sync.
 *
 * The cron action (`clients.pullAsesoresFromSheet`) fetches the Asesores rows
 * from `/api/get-asesores` and hands them, plus the current `clients` rows, to
 * `planAsesorUpsert`. Keeping the diff logic here — free of Convex and of the
 * Sheets API — lets `tests/asesorSync.test.ts` pin the contract and keeps the
 * mutation a thin apply-the-plan shell (mirrors `_lib/sheetPullMaps.ts`).
 *
 * Rules (deliberately conservative — a sync should never silently destroy data):
 *  - Match an incoming asesor to an existing client by NORMALIZED name
 *    (accent/case/punctuation-insensitive), the same key the one-shot import
 *    (`clients.bulkImportFromLegacy`) dedupes on.
 *  - New name  → insert (tipo "embajador").
 *  - Known name with a changed, NON-EMPTY contact field → update only that field.
 *  - An empty incoming value never erases a value we already hold (the sheet is
 *    frequently sparse; treat blanks as "no opinion", not "delete").
 *  - Asesores removed from / marked inactive in the sheet are NOT deactivated
 *    here — `/api/get-asesores` already drops inactive rows, and deleting a
 *    client could orphan a sale that references it. Removal stays a manual call.
 */

export interface AsesorSheetRow {
  nombre: string;
  email?: string;
  telefono?: string;
  /** slug from the Asesores sheet → stored as `clients.asesorId`. */
  asesorId?: string;
}

export interface ExistingAsesorClient<TId = string> {
  _id: TId;
  nombre: string;
  email?: string;
  telefono?: string;
  asesorId?: string;
}

export interface AsesorPatch {
  email?: string;
  telefono?: string;
  asesorId?: string;
}

export interface AsesorUpsertPlan<TId = string> {
  toInsert: AsesorSheetRow[];
  toUpdate: Array<{ id: TId; patch: AsesorPatch }>;
  /** Known asesores with no field change. */
  unchanged: number;
  /** Incoming rows dropped because the name was empty after normalize. */
  skipped: number;
}

/** Accent/case/punctuation-insensitive key for matching an asesor to a client. */
export function normalizeAsesorName(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Trim a sheet value; an empty string becomes `undefined` ("no opinion"). */
function cleanOpt(v?: string | null): string | undefined {
  if (v === undefined || v === null) return undefined;
  const t = String(v).trim();
  return t.length ? t : undefined;
}

export function planAsesorUpsert<TId = string>(
  rows: AsesorSheetRow[],
  existing: ExistingAsesorClient<TId>[],
): AsesorUpsertPlan<TId> {
  // First occurrence of each normalized name wins (the sheet shouldn't have
  // dupes, but be defensive — like dedupeSelection on the sale side).
  const byNorm = new Map<string, ExistingAsesorClient<TId>>();
  for (const c of existing) {
    const n = normalizeAsesorName(c.nombre);
    if (n && !byNorm.has(n)) byNorm.set(n, c);
  }

  const seen = new Set<string>();
  const toInsert: AsesorSheetRow[] = [];
  const toUpdate: Array<{ id: TId; patch: AsesorPatch }> = [];
  let unchanged = 0;
  let skipped = 0;

  for (const row of rows) {
    const norm = normalizeAsesorName(row.nombre);
    if (!norm) {
      skipped++;
      continue;
    }
    if (seen.has(norm)) continue;
    seen.add(norm);

    const match = byNorm.get(norm);
    const email = cleanOpt(row.email);
    const telefono = cleanOpt(row.telefono);
    const asesorId = cleanOpt(row.asesorId);

    if (!match) {
      toInsert.push({
        nombre: row.nombre.replace(/\s+/g, " ").trim(),
        email,
        telefono,
        asesorId,
      });
      continue;
    }

    // Only patch fields the sheet actually carries AND that differ — never blank
    // out a value we already have.
    const patch: AsesorPatch = {};
    if (email !== undefined && email !== match.email) patch.email = email;
    if (telefono !== undefined && telefono !== match.telefono) {
      patch.telefono = telefono;
    }
    if (asesorId !== undefined && asesorId !== match.asesorId) {
      patch.asesorId = asesorId;
    }
    if (Object.keys(patch).length > 0) toUpdate.push({ id: match._id, patch });
    else unchanged++;
  }

  return { toInsert, toUpdate, unchanged, skipped };
}
