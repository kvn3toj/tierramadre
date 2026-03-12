/**
 * Vercel Serverless Function - Sync Product Folders with Inventario Sheet
 *
 * Auto-sync: reads Inventario from Google Sheets, compares with Google Drive
 * product folders, and creates missing / renames mismatched folders.
 *
 * Folder naming convention: "{item} - {name}" (e.g., "185 - Bogota 1-V Montaña")
 *
 * GET  /api/create-product-folders             → dry-run (list changes needed)
 * POST /api/create-product-folders             → apply all changes (create + rename)
 * POST /api/create-product-folders?items=185,186 → sync specific items only
 */

import {
  withApiHandler,
  sendSuccess,
  sendError,
  CACHE,
  SPREADSHEET_ID,
  getSheetNames,
  findSheetByPattern,
  getProductsFolderId,
  listProductFolders,
  extractItemNumber,
  getOrCreateFolder,
} from './_lib/index.js';

/**
 * Clean product name for folder naming (remove line breaks, extra spaces, trim)
 */
function cleanName(name) {
  if (!name) return 'Sin Nombre';
  return name
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build expected folder name from sheet item
 */
function buildFolderName(item, nombre) {
  return `${item} - ${cleanName(nombre)}`;
}

export default withApiHandler(async (req, res, { sheets, drive, sharedDriveId }) => {
  // Auto-apply when called by Vercel cron or with ?sync=auto
  const isCron = req.headers['x-vercel-cron'] || req.query?.sync === 'auto';
  const isDryRun = req.method === 'GET' && !isCron;

  // Parse optional items filter
  const itemsParam = req.query?.items;
  const onlyItems = itemsParam
    ? new Set(itemsParam.split(',').map(n => parseInt(n.trim())).filter(n => n > 0))
    : null;

  // 1. Fetch inventory from Sheets
  const sheetNames = await getSheetNames(sheets);
  const targetSheet = findSheetByPattern(sheetNames, ['inventario', 'inventory']) || sheetNames[0];

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${targetSheet}!A:C`, // Item (A) and Nombre (C)
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return sendError(res, 404, 'No inventory data found');
  }

  // Parse items from sheet
  const sheetItems = rows.slice(1)
    .filter(row => row[0] && parseInt(row[0]) > 0)
    .map(row => ({
      item: parseInt(row[0]),
      nombre: row[2] || '',
    }))
    .filter(item => !onlyItems || onlyItems.has(item.item));

  // 2. Get existing product folders from Drive
  const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
  const existingFolders = await listProductFolders(drive, productsFolderId);

  // Build map: itemNumber -> array of { id, name } (to detect duplicates)
  const folderMap = new Map();
  for (const folder of existingFolders) {
    const itemNumber = extractItemNumber(folder.name);
    if (itemNumber !== null) {
      if (!folderMap.has(itemNumber)) {
        folderMap.set(itemNumber, []);
      }
      folderMap.get(itemNumber).push({ id: folder.id, name: folder.name });
    }
  }

  // Detect duplicate folders (multiple folders for the same item number)
  const duplicates = [];
  for (const [itemNumber, folders] of folderMap) {
    if (folders.length > 1) {
      duplicates.push({
        item: itemNumber,
        count: folders.length,
        folders: folders.map(f => ({ id: f.id, name: f.name })),
      });
    }
  }

  // 3. Classify changes needed
  const toCreate = [];
  const toRename = [];
  const upToDate = [];

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
  const created = [];
  const renamed = [];
  const errors = [];

  // Create missing folders (pass itemNumber to prevent duplicates via prefix search)
  for (const item of toCreate) {
    try {
      const folderId = await getOrCreateFolder(drive, productsFolderId, item.folderName, sharedDriveId, item.item);
      created.push({ item: item.item, folderName: item.folderName, folderId });
      console.log(`[Sync] Created: ${item.folderName}`);
    } catch (error) {
      console.error(`[Sync] Failed to create ${item.folderName}:`, error.message);
      errors.push({ action: 'create', item: item.item, folderName: item.folderName, error: error.message });
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
      renamed.push({ item: item.item, from: item.currentName, to: item.newName });
      console.log(`[Sync] Renamed: "${item.currentName}" → "${item.newName}"`);
    } catch (error) {
      console.error(`[Sync] Failed to rename ${item.currentName}:`, error.message);
      errors.push({ action: 'rename', item: item.item, from: item.currentName, to: item.newName, error: error.message });
    }
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
}, {
  methods: ['GET', 'POST', 'OPTIONS'],
  cache: CACHE.NONE,
  provideSheets: true,
  provideDrive: true,
  requireDriveId: true,
  errorPrefix: 'SyncProductFolders',
});
