/**
 * Vercel Serverless Function - Sync Product Folders with Inventario Sheet
 *
 * Auto-sync: reads Inventario from Google Sheets, compares with Google Drive
 * product folders, and creates missing / renames mismatched folders.
 *
 * Folder naming convention: "{item} - {name}" (e.g., "185 - Bogota 1-V Montaña")
 *
 * GET  /api/create-product-folders             → dry-run (list changes needed)
 * GET  /api/create-product-folders?sync=auto   → apply (the browser's background trigger)
 * POST /api/create-product-folders             → apply all changes (create + rename)
 * POST /api/create-product-folders?items=185,186 → sync specific items only
 *
 * AUTH (2026-08-09 lockdown): every method requires either a verified `tms1`
 * staff session or the `ADMIN_SYNC_TOKEN` bearer. Before this, the endpoint
 * answered HTTP 200 to anyone: the GET dry-run handed out the whole inventory
 * (item numbers + product names) plus raw Drive folder ids, and — worse —
 * `?sync=auto` is classified as "cron" below, so an anonymous GET actually
 * CREATED and RENAMED Drive folders. That anonymous mutation ran on every
 * catalog page load, because useSheetsTreasure.ts fires it fire-and-forget
 * after each inventory fetch; it now sends the asesor's session token, so
 * staff keep the auto-sync and anonymous visitors no longer touch Drive.
 *
 * The ADMIN_SYNC_TOKEN bearer path exists so a server-to-server caller has a
 * credential — same "acepta el secreto del bot, no solo sesión de staff"
 * pattern as the convex/ gates and api/_lib/catalogGrant.ts. Note there is no
 * `crons` entry in vercel.json today, so the `x-vercel-cron` header below only
 * selects apply-vs-dry-run for an ALREADY authenticated caller; it is not,
 * and never was, a credential.
 *
 * Converted from .js to .ts for the same reason api/product-views.ts was: a
 * plain `.js` importer does not get TypeScript's `.js`→`.ts` extension
 * resolution, which is what the `./_lib/sessionToken.js` import below needs.
 */

import type { drive_v3 } from '@googleapis/drive';
import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  withApiHandler,
  sendSuccess,
  sendError,
  CACHE,
  SPREADSHEET_ID,
  FOTOSINTESIS_SPREADSHEET_ID,
  getSheetNames,
  findSheetByPattern,
  getProductsFolderId,
  listProductFolders,
  extractItemNumber,
  getOrCreateFolder,
  invalidateFolderCache,
} from './_lib/index.js';
import { extractBearer, bearerMatches } from './_lib/bearer.js';
import { isSessionToken, verifySessionToken } from './_lib/sessionToken.js';

/**
 * True when the caller proved they are staff — either a verified `tms1` app
 * session (the browser path) or the ADMIN_SYNC_TOKEN shared secret (the
 * server-to-server path). Mirrors api/_lib/catalogGrant.ts's staff branch:
 * the constant-time secret compare is checked first because it is cheap and
 * must win over an absent/stale session on the same request.
 */
export function isAuthorizedSync(req: VercelRequest): boolean {
  const authHeader = req.headers?.authorization;
  if (bearerMatches(authHeader, process.env.ADMIN_SYNC_TOKEN)) return true;
  const token = extractBearer(authHeader);
  if (!token || !isSessionToken(token)) return false;
  return verifySessionToken(token)?.email != null;
}

/**
 * Clean product name for folder naming (remove line breaks, extra spaces, trim)
 */
function cleanName(name?: string): string {
  if (!name) return 'Sin Nombre';
  return name.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Build expected folder name from sheet item
 */
function buildFolderName(item: number, nombre?: string): string {
  return `${item} - ${cleanName(nombre)}`;
}

interface SheetItem {
  item: number;
  nombre: string;
}

export async function handleCreateProductFolders(
  req: VercelRequest,
  res: VercelResponse,
  ctx: Record<string, unknown>,
): Promise<unknown> {
  // Gate BEFORE any Sheets or Drive call — an unauthorized caller must cost
  // no Google API quota and must never reach the mutation below.
  if (!isAuthorizedSync(req)) {
    return sendError(res, 401, 'Inicia sesión para sincronizar las carpetas.');
  }

  const { sheets, drive, sharedDriveId } = ctx as {
    sheets: sheets_v4.Sheets;
    drive: drive_v3.Drive;
    sharedDriveId: string;
  };

  // Auto-apply when called by Vercel cron or with ?sync=auto
  const isCron = req.headers['x-vercel-cron'] || req.query?.sync === 'auto';
  const isDryRun = req.method === 'GET' && !isCron;

  // Parse optional items filter
  const itemsParam = req.query?.items;
  const itemsRaw = Array.isArray(itemsParam) ? itemsParam[0] : itemsParam;
  const onlyItems = itemsRaw
    ? new Set(
        itemsRaw
          .split(',')
          .map((n) => parseInt(n.trim()))
          .filter((n) => n > 0),
      )
    : null;

  // 1. Fetch inventory from BOTH the legacy public sheet AND the Fotosíntesis
  //    SOT, unioned by item number (SOT name wins). Root-cause fix: the sync
  //    used to read only SPREADSHEET_ID (legacy), so Fotosíntesis-only items
  //    (323+) were never in it and never got a product folder. Reading the SOT
  //    too makes the auto-sync cron cover the FULL catalog.
  async function readInventory(spreadsheetId: string): Promise<SheetItem[]> {
    try {
      const names = await getSheetNames(sheets, spreadsheetId);
      const tab =
        findSheetByPattern(names, ['inventario', 'inventory']) || names[0];
      const r = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tab}!A:C`, // Item (A) and Nombre (C)
      });
      return ((r.data.values || []) as string[][])
        .slice(1)
        .filter((row) => row[0] && parseInt(row[0]) > 0)
        .map((row) => ({ item: parseInt(row[0]), nombre: row[2] || '' }));
    } catch (e) {
      console.warn(
        `[Sync] Could not read inventory from ${spreadsheetId}: ${(e as Error).message}`,
      );
      return [];
    }
  }

  const legacyItems = await readInventory(SPREADSHEET_ID);
  const sotItems = FOTOSINTESIS_SPREADSHEET_ID
    ? await readInventory(FOTOSINTESIS_SPREADSHEET_ID)
    : [];
  // Union by item number; the SOT is the source of truth so it overrides the
  // legacy name (folder gets renamed to match the SOT on the next sync).
  const byItem = new Map<number, SheetItem>();
  for (const it of legacyItems) byItem.set(it.item, it);
  for (const it of sotItems) byItem.set(it.item, it);
  const sheetItems = [...byItem.values()].filter(
    (item) => !onlyItems || onlyItems.has(item.item),
  );

  if (sheetItems.length === 0) {
    return sendError(res, 404, 'No inventory data found');
  }

  // 2. Get existing product folders from Drive
  const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
  const existingFolders = await listProductFolders(drive, productsFolderId);

  // Build map: itemNumber -> array of { id, name } (to detect duplicates)
  const folderMap = new Map<number, Array<{ id: string; name: string }>>();
  for (const folder of existingFolders) {
    const itemNumber = extractItemNumber(folder.name);
    if (itemNumber !== null) {
      if (!folderMap.has(itemNumber)) {
        folderMap.set(itemNumber, []);
      }
      folderMap.get(itemNumber)!.push({ id: folder.id, name: folder.name });
    }
  }

  // Detect duplicate folders (multiple folders for the same item number)
  const duplicates: Array<{
    item: number;
    count: number;
    folders: Array<{ id: string; name: string }>;
  }> = [];
  for (const [itemNumber, folders] of folderMap) {
    if (folders.length > 1) {
      duplicates.push({
        item: itemNumber,
        count: folders.length,
        folders: folders.map((f) => ({ id: f.id, name: f.name })),
      });
    }
  }

  // 3. Classify changes needed
  const toCreate: Array<{ item: number; folderName: string }> = [];
  const toRename: Array<{
    item: number;
    folderId: string;
    currentName: string;
    newName: string;
  }> = [];
  const upToDate: number[] = [];

  for (const item of sheetItems) {
    const expectedName = buildFolderName(item.item, item.nombre);
    const existingList = folderMap.get(item.item);
    // Use the first folder found for this item number (oldest by position)
    const existing = existingList?.[0];

    if (!existing) {
      toCreate.push({ item: item.item, folderName: expectedName });
    } else if (existing.name !== expectedName) {
      toRename.push({
        item: item.item,
        folderId: existing.id,
        currentName: existing.name,
        newName: expectedName,
      });
    } else {
      upToDate.push(item.item);
    }
  }

  // 4. Dry-run: report what would change
  if (isDryRun) {
    return sendSuccess(res, {
      mode: 'dry-run',
      message: `${toCreate.length} to create, ${toRename.length} to rename, ${upToDate.length} up to date, ${duplicates.length} items with duplicate folders. POST to apply.`,
      totalSheetItems: sheetItems.length,
      totalDriveFolders: existingFolders.length,
      toCreate: toCreate.length > 0 ? toCreate : undefined,
      toRename: toRename.length > 0 ? toRename : undefined,
      upToDateCount: upToDate.length,
      duplicates: duplicates.length > 0 ? duplicates : undefined,
    });
  }

  // 5. Apply changes
  const created: Array<{ item: number; folderName: string; folderId: string }> =
    [];
  const renamed: Array<{ item: number; from: string; to: string }> = [];
  const errors: Array<Record<string, unknown>> = [];

  // Create missing folders (pass itemNumber to prevent duplicates via prefix search)
  for (const item of toCreate) {
    try {
      const folderId = await getOrCreateFolder(
        drive,
        productsFolderId,
        item.folderName,
        sharedDriveId,
        item.item,
      );
      created.push({
        item: item.item,
        folderName: item.folderName,
        folderId,
      });
      console.log(`[Sync] Created: ${item.folderName}`);
    } catch (error) {
      console.error(
        `[Sync] Failed to create ${item.folderName}:`,
        (error as Error).message,
      );
      errors.push({
        action: 'create',
        item: item.item,
        folderName: item.folderName,
        error: (error as Error).message,
      });
    }
  }

  // Rename mismatched folders
  for (const item of toRename) {
    try {
      await drive.files.update({
        fileId: item.folderId,
        requestBody: { name: item.newName },
        supportsAllDrives: true,
      });
      renamed.push({
        item: item.item,
        from: item.currentName,
        to: item.newName,
      });
      console.log(`[Sync] Renamed: "${item.currentName}" → "${item.newName}"`);
    } catch (error) {
      console.error(
        `[Sync] Failed to rename ${item.currentName}:`,
        (error as Error).message,
      );
      errors.push({
        action: 'rename',
        item: item.item,
        from: item.currentName,
        to: item.newName,
        error: (error as Error).message,
      });
    }
  }

  if (created.length > 0 || renamed.length > 0) {
    invalidateFolderCache();
  }

  return sendSuccess(res, {
    mode: 'sync',
    totalSheetItems: sheetItems.length,
    totalDriveFolders: existingFolders.length + created.length,
    createdCount: created.length,
    renamedCount: renamed.length,
    upToDateCount: upToDate.length,
    errorCount: errors.length,
    created: created.length > 0 ? created : undefined,
    renamed: renamed.length > 0 ? renamed : undefined,
    errors: errors.length > 0 ? errors : undefined,
    duplicates: duplicates.length > 0 ? duplicates : undefined,
  });
}

export default withApiHandler(handleCreateProductFolders, {
  methods: ['GET', 'POST', 'OPTIONS'],
  cache: CACHE.NONE,
  provideSheets: true,
  provideDrive: true,
  requireDriveId: true,
  errorPrefix: 'SyncProductFolders',
});
