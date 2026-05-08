/**
 * Admin Table Update API — generic write-back endpoint for Fotosíntesis v2.
 *
 * Writes a single row to one of the Fotosíntesis tabs (Proveedores,
 * Lotes, Clientes, Ventas). Called by Convex `_pushToSheet` actions
 * after a mutation patches a Convex mirror.
 *
 * Auth: shared `ADMIN_SYNC_TOKEN` between Convex and Vercel.
 *
 * Body:
 *   {
 *     table: "providers" | "lots" | "clients" | "sales",
 *     rowIndex: number (>= 2),
 *     mode: "patch" | "append",
 *     idValue: string,                           // value of the natural-key column
 *     fields: Record<string, string>             // all column values, keyed by column name
 *   }
 *
 * Strategy mirrors admin-product-update.ts:
 *   - Resolve target tab via findSheetByPattern.
 *   - Read existing row to detect a row-shift conflict (column A mismatch).
 *   - Build the merged row using TABLE_CONFIGS[table].columns order.
 *   - values.update on `${tab}!A${rowIndex}:${lastColumnLetter}${rowIndex}`.
 *
 * Like admin-product-update, we always use values.update — Sheets
 * auto-extends past the last row, so "append" mode works without a
 * separate values.append call.
 */

import type { sheets_v4 } from "@googleapis/sheets";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  withApiHandler,
  SPREADSHEET_ID,
  sendError,
  sendSuccess,
  getSheetNames,
  findSheetByPattern,
} from "./_lib/index.js";
import { TABLE_CONFIGS, isFotoTable } from "./_lib/admin-table-config.js";

interface UpdateBody {
  table?: string;
  rowIndex?: number;
  mode?: "patch" | "append";
  idValue?: string;
  fields?: Record<string, unknown>;
}

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    ctx: Record<string, unknown>,
  ) => {
    const expectedToken = process.env.ADMIN_SYNC_TOKEN;
    const providedToken =
      (req.headers["x-admin-sync-token"] as string | undefined) ?? undefined;
    if (!expectedToken) {
      return sendError(res, 500, "ADMIN_SYNC_TOKEN not configured on server");
    }
    if (!providedToken || providedToken !== expectedToken) {
      return sendError(res, 401, "Unauthorized");
    }

    const body = (req.body ?? {}) as UpdateBody;
    const { table, rowIndex, mode, idValue, fields } = body;

    if (!table || !isFotoTable(table)) {
      return sendError(
        res,
        400,
        `Invalid table "${table}". Expected: providers | lots | clients | sales.`,
      );
    }
    if (!rowIndex || !Number.isInteger(rowIndex) || rowIndex < 2) {
      return sendError(res, 400, "rowIndex must be an integer ≥ 2");
    }
    if (!fields || typeof fields !== "object") {
      return sendError(res, 400, "Missing fields object");
    }
    if (mode !== "patch" && mode !== "append") {
      return sendError(res, 400, 'mode must be "patch" or "append"');
    }
    if (typeof idValue !== "string" || idValue.length === 0) {
      return sendError(res, 400, "Missing idValue");
    }

    const config = TABLE_CONFIGS[table];
    const { sheets } = ctx as { sheets: sheets_v4.Sheets };

    const sheetNames = await getSheetNames(sheets);
    const targetSheet =
      findSheetByPattern(sheetNames, config.sheetTabPatterns) ?? null;
    if (!targetSheet) {
      return sendError(
        res,
        500,
        `Sheet tab not found for table "${table}". Expected one of: ${config.sheetTabPatterns.join(", ")}`,
      );
    }

    const range = `${targetSheet}!A${rowIndex}:${config.lastColumnLetter}${rowIndex}`;

    // Read existing row so we can preserve untouched cells (lets the
    // sheet keep notes/manually-added columns past our last managed
    // column, and gives us a row-shift safety check on patch).
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    const existingRow = (existing.data.values?.[0] ?? []) as string[];

    if (mode === "patch") {
      const sheetIdValue = s(existingRow[0]).trim();
      if (sheetIdValue && sheetIdValue !== idValue) {
        return sendError(
          res,
          409,
          `Row ${rowIndex} of ${targetSheet} is "${sheetIdValue}", not "${idValue}". The sheet may have been re-ordered. Resync from sheet before retrying.`,
        );
      }
    }

    // Build the merged row positionally (column A = index 0).
    const merged: string[] = new Array(config.columns.length).fill("");
    for (let i = 0; i < config.columns.length; i++) {
      merged[i] = s(existingRow[i] ?? "");
    }
    for (let i = 0; i < config.columns.length; i++) {
      const col = config.columns[i];
      if (Object.prototype.hasOwnProperty.call(fields, col)) {
        merged[i] = s(fields[col]);
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [merged] },
    });

    return sendSuccess(res, {
      table,
      rowIndex,
      sheetName: targetSheet,
      updatedAt: new Date().toISOString(),
    });
  },
  {
    methods: ["POST", "OPTIONS"],
    provideSheets: true,
    errorPrefix: "AdminTableUpdate",
  },
);
