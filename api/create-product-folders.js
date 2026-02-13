/**
 * Vercel Serverless Function - Create Missing Product Folders
 *
 * Admin utility: reads Inventario from Google Sheets, checks which items
 * have product folders in Google Drive, and creates missing ones.
 *
 * Folder naming convention: "{item} - {name}" (e.g., "185 - Bogota 1-V Montaña")
 *
 * GET  /api/create-product-folders         → dry-run (list missing folders)
 * POST /api/create-product-folders         → create missing folders
 * POST /api/create-product-folders?items=185,186 → create specific folders only
 */

import {
  withApiHandler,
  sendError,
  sendSuccess,
  CACHE,
  SPREADSHEET_ID,
  getSheetNames,
  findSheetByPattern,
  normalizeHeader,
  getProductsFolderId,
  listProductFolders,
  extractItemNumber,
  getOrCreateFolder,
} from './_lib/index.js';

/**
 * Clean product name for folder naming (remove line breaks, trim)
 */
function cleanName(name) {
  if (!name) return 'Sin Nombre';
  return name
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^L:A\s*/i, 'LA ')
    .replace(/^L:\s*/i, 'L ')
    .trim();
}

export default withApiHandler(async (req, res, { sheets, drive, sharedDriveId }) => {
  const isDryRun = req.method === 'GET';

  // Parse optional items filter from query
  const itemsParam = req.query?.items;
  const onlyItems = itemsParam
    ? itemsParam.split(',').map(n => parseInt(n.trim())).filter(n => n > 0)
    : null;

  // 1. Fetch inventory from Sheets
  const sheetNames = await getSheetNames(sheets);
  const targetSheet = findSheetByPattern(sheetNames, ['inventario', 'inventory']) || sheetNames[0];

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${targetSheet}!A:C`, // Only need Item (A) and Nombre (C)
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return sendError(res, 404, 'No inventory data found');
  }

  // Parse items from sheet (skip header row)
  const sheetItems = rows.slice(1)
    .filter(row => row[0] && parseInt(row[0]) > 0)
    .map(row => ({
      item: parseInt(row[0]),
      nombre: row[2] || '',
    }));

  // 2. Get existing product folders from Drive
  const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
  const existingFolders = await listProductFolders(drive, productsFolderId);

  const existingItemNumbers = new Set(
    existingFolders
      .map(f => extractItemNumber(f.name))
      .filter(n => n !== null)
  );

  // 3. Find missing folders
  let missingItems = sheetItems.filter(item => !existingItemNumbers.has(item.item));

  // Apply items filter if specified
  if (onlyItems) {
    const onlySet = new Set(onlyItems);
    missingItems = missingItems.filter(item => onlySet.has(item.item));
  }

  if (missingItems.length === 0) {
    return sendSuccess(res, {
      message: 'All product folders exist',
      totalSheetItems: sheetItems.length,
      totalDriveFolders: existingFolders.length,
      missingCount: 0,
    });
  }

  // 4. Dry-run: just list missing folders
  if (isDryRun) {
    return sendSuccess(res, {
      mode: 'dry-run',
      message: `${missingItems.length} folders need to be created. POST to create them.`,
      totalSheetItems: sheetItems.length,
      totalDriveFolders: existingFolders.length,
      missingCount: missingItems.length,
      missingFolders: missingItems.map(item => ({
        item: item.item,
        folderName: `${item.item} - ${cleanName(item.nombre)}`,
      })),
    });
  }

  // 5. Create missing folders
  const created = [];
  const errors = [];

  for (const item of missingItems) {
    const folderName = `${item.item} - ${cleanName(item.nombre)}`;
    try {
      const folderId = await getOrCreateFolder(drive, productsFolderId, folderName, sharedDriveId);
      created.push({ item: item.item, folderName, folderId });
      console.log(`Created folder: ${folderName} (${folderId})`);
    } catch (error) {
      console.error(`Failed to create folder ${folderName}:`, error.message);
      errors.push({ item: item.item, folderName, error: error.message });
    }
  }

  return sendSuccess(res, {
    mode: 'create',
    totalSheetItems: sheetItems.length,
    totalDriveFolders: existingFolders.length + created.length,
    createdCount: created.length,
    errorCount: errors.length,
    created,
    errors: errors.length > 0 ? errors : undefined,
  });
}, {
  methods: ['GET', 'POST', 'OPTIONS'],
  cache: CACHE.NONE,
  provideSheets: true,
  provideDrive: true,
  requireDriveId: true,
  errorPrefix: 'CreateProductFolders',
});
