/**
 * POST /api/vault-unlock — verify a submitted Bóveda Secreta combination
 * server-side (N5, 2026-08 fix round 3).
 *
 * Body: { outer: string, inner: number }
 * 200:  { matched: boolean, slug?: string }   (slug: the matching asesor's
 *       public slug — same value api/get-asesores.ts's `slug` field and
 *       `/ambassadors/:slug` already expose, so returning it here leaks
 *       nothing new. VaultLockScreen.tsx stores it as `ambassador:<slug>`
 *       and reports it back as UnlockMethod's `ambassadorSlug`.)
 *
 * Why this exists: `useVaultUnlock.ts` used to check a submitted dial
 * combination against `ambassadorVaultCodes`, a client-side Map built from
 * every asesor's raw `vaultCode` — which required `/api/get-asesores` to
 * ship the entire code list to the browser. F5 correctly withheld
 * `vaultCode` from the anon/guest projection (shipping every code to every
 * visitor WAS the leak this endpoint fixes), which broke ambassador-code
 * unlocks for non-staff. The universal combination (`VAULT_UNIVERSAL`,
 * src/config/vault.ts) is unaffected — it's a publicly documented "house"
 * combination baked into the shipped bundle by design, not a per-person
 * secret, and stays a client-side check.
 *
 * NOT rate-limited: matches every other endpoint in this codebase — none
 * currently throttle by IP (no such infrastructure exists here). The
 * 120-combination keyspace (12 outer symbols x 10 inner digits) is still
 * guarded by the CLIENT's existing 3-attempt + 5-minute-cooldown UI for the
 * normal flow (useVaultUnlock.ts), but that is bypassable by a script
 * calling this endpoint directly. Flagged as a residual gap, not fixed —
 * building IP-based throttling is its own task if this needs closing.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { sheets_v4 } from '@googleapis/sheets';
import {
  withApiHandler,
  sendError,
  sendSuccess,
  CACHE,
  SPREADSHEET_ID,
  getSheetNames,
  findSheetByPattern,
  findColumnIndex,
  formatDisplayName,
} from './_lib/index.js';
import { slugifyAsesorName } from './_lib/asesorSlug.js';
import type { VaultSymbolId, VaultCombination } from '../src/types/vault.ts';

type Sheets = sheets_v4.Sheets;

// Exported for tests/vaultUnlock.test.ts, including a drift guard against
// the real VAULT_SYMBOLS list (src/config/vault.ts) — safe to cross-import
// there since test files aren't part of api/tsconfig.json's type-check.
export const VALID_SYMBOL_IDS = new Set<VaultSymbolId>([
  'esmeralda',
  'sol',
  'luna',
  'montana',
  'rio',
  'arbol',
  'ojo',
  'estrella',
  'condor',
  'jaguar',
  'espiral',
  'corazon_verde',
]);

/**
 * Deliberately NOT imported from src/utils/parseVaultCode.ts: that module
 * imports VAULT_SYMBOLS from src/config/vault.ts, which imports from the
 * design-system barrel (src/design-system/index.ts) — a chain of .tsx
 * component files. api/tsconfig.json has no `--jsx` flag (serverless
 * functions don't render JSX), so pulling that chain in here breaks
 * `npm run lint`'s api type-check with a wall of TS6142 errors unrelated to
 * this endpoint. Same parsing rules, reimplemented against the local
 * VALID_SYMBOL_IDS above instead of VAULT_SYMBOLS.
 */
export function parseVaultCode(
  raw: string | null | undefined,
): VaultCombination | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;

  const [symbol, digitStr] = parts;
  if (!symbol || !digitStr) return null;
  if (!VALID_SYMBOL_IDS.has(symbol as VaultSymbolId)) return null;

  const inner = Number.parseInt(digitStr, 10);
  if (!Number.isInteger(inner)) return null;
  if (inner < 0 || inner > 9) return null;
  if (String(inner) !== digitStr.trim()) return null; // rejects "3abc", "3.5"

  return { outer: symbol as VaultSymbolId, inner };
}

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    context: Record<string, unknown>,
  ) => {
    const body = (req.body ?? {}) as { outer?: unknown; inner?: unknown };
    const outer = typeof body.outer === 'string' ? body.outer.trim() : '';
    const inner = Number(body.inner);
    if (!VALID_SYMBOL_IDS.has(outer as VaultSymbolId)) {
      return sendError(res, 400, 'outer inválido');
    }
    if (!Number.isInteger(inner) || inner < 0 || inner > 9) {
      return sendError(res, 400, 'inner inválido');
    }

    const sheets = context.sheets as Sheets;
    const sheetNames = await getSheetNames(sheets);
    const asesoresSheet =
      findSheetByPattern(sheetNames, ['asesor', 'embajador', 'ambassador']) ||
      sheetNames[2] ||
      sheetNames[0];

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${asesoresSheet}'!A:Z`,
    });
    const rows = response.data.values || [];
    if (rows.length === 0) {
      return sendSuccess(res, { matched: false });
    }

    const headers = rows[0];
    const nameColumnIndex = findColumnIndex(headers, [
      'nombre',
      'name',
      'asesor',
      'vendedor',
    ]);
    const estadoIndex = findColumnIndex(headers, ['estado', 'status']);
    const vaultCodeIndex = findColumnIndex(headers, [
      'vaultcode',
      'vault_code',
      'codigo_boveda',
      'boveda',
    ]);
    if (nameColumnIndex === -1 || vaultCodeIndex === -1) {
      return sendSuccess(res, { matched: false });
    }

    for (const row of rows.slice(1)) {
      const name = row[nameColumnIndex];
      if (!name || String(name).trim() === '') continue;

      // Same "inactive asesor" exclusion as get-asesores.ts — a code stays
      // valid only as long as the person is active on the roster.
      if (estadoIndex !== -1) {
        const estado = String(row[estadoIndex] || '').toLowerCase();
        if (estado === 'inactivo' || estado === 'inactive') continue;
      }

      const combo = parseVaultCode(row[vaultCodeIndex] ?? null);
      if (combo && combo.outer === outer && combo.inner === inner) {
        const slug = slugifyAsesorName(formatDisplayName(name));
        return sendSuccess(res, { matched: true, slug });
      }
    }

    return sendSuccess(res, { matched: false });
  },
  {
    methods: ['POST', 'OPTIONS'],
    cache: CACHE.NONE,
    provideSheets: true,
    errorPrefix: 'VaultUnlock',
  },
);
