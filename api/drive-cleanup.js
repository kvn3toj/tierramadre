/**
 * Drive Folder Cleanup API
 *
 * Lists and optionally cleans up duplicate/empty folders
 *
 * GET /api/drive-cleanup - List folder structure
 * POST /api/drive-cleanup - Delete empty folders (with confirmation)
 */

import {
  getSharedDriveId,
  setCorsHeaders,
  handleOptions,
  sendError,
  sendSuccess,
} from './_lib/index.js';

import {
  isOAuthConfigured,
  getOAuthDriveClient,
} from './_lib/oauth-drive-client.js';

/**
 * List all folders and files in a folder
 */
async function listFolderContents(drive, folderId, depth = 0) {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, size)',
    orderBy: 'name',
  });

  const items = [];
  for (const file of response.data.files || []) {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    const item = {
      id: file.id,
      name: file.name,
      isFolder,
      size: file.size ? parseInt(file.size) : 0,
      depth,
    };

    if (isFolder) {
      // Recursively get children (limit depth to prevent infinite loops)
      if (depth < 3) {
        item.children = await listFolderContents(drive, file.id, depth + 1);
        item.childCount = item.children.length;
        item.isEmpty = item.children.length === 0;
      }
    }

    items.push(item);
  }

  return items;
}

/**
 * Find empty folders recursively
 */
function findEmptyFolders(items, path = '') {
  const emptyFolders = [];

  for (const item of items) {
    const currentPath = path ? `${path}/${item.name}` : item.name;

    if (item.isFolder) {
      if (item.isEmpty) {
        emptyFolders.push({
          id: item.id,
          name: item.name,
          path: currentPath,
        });
      } else if (item.children) {
        emptyFolders.push(...findEmptyFolders(item.children, currentPath));
      }
    }
  }

  return emptyFolders;
}

/**
 * Find folders matching a pattern
 */
function findFoldersByPattern(items, pattern, path = '') {
  const matches = [];

  for (const item of items) {
    const currentPath = path ? `${path}/${item.name}` : item.name;

    if (item.isFolder) {
      if (item.name.match(pattern)) {
        matches.push({
          id: item.id,
          name: item.name,
          path: currentPath,
          childCount: item.childCount || 0,
          isEmpty: item.isEmpty,
        });
      }
      if (item.children) {
        matches.push(...findFoldersByPattern(item.children, pattern, currentPath));
      }
    }
  }

  return matches;
}

export default async function handler(req, res) {
  setCorsHeaders(res, ['GET', 'POST', 'OPTIONS']);

  if (handleOptions(req, res)) return;

  if (!isOAuthConfigured()) {
    return sendError(res, 500, 'OAuth not configured');
  }

  const parentFolderId = getSharedDriveId();
  if (!parentFolderId) {
    return sendError(res, 500, 'GOOGLE_SHARED_DRIVE_ID not configured');
  }

  let drive;
  try {
    drive = await getOAuthDriveClient();
  } catch (error) {
    return sendError(res, 500, `OAuth error: ${error.message}`);
  }

  if (req.method === 'GET') {
    // List folder structure
    try {
      console.log('[DriveCleanup] Listing folder structure...');
      const contents = await listFolderContents(drive, parentFolderId);

      // Find issues
      const emptyFolders = findEmptyFolders(contents);
      const cotizacionesFolders = findFoldersByPattern(contents, /^cotizaciones$/i);
      const manualFolders = findFoldersByPattern(contents, /^manual-/);

      // Build tree representation
      function buildTree(items, indent = '') {
        let tree = '';
        for (const item of items) {
          const icon = item.isFolder ? '📁' : '📄';
          const sizeStr = item.size > 0 ? ` (${(item.size / 1024).toFixed(1)}KB)` : '';
          const emptyStr = item.isEmpty ? ' [EMPTY]' : '';
          tree += `${indent}${icon} ${item.name}${sizeStr}${emptyStr}\n`;
          if (item.children) {
            tree += buildTree(item.children, indent + '  ');
          }
        }
        return tree;
      }

      const treeView = buildTree(contents);

      return sendSuccess(res, {
        parentFolder: parentFolderId,
        tree: treeView,
        cotizacionesFolders,
        manualFolders,
        emptyFolders,
        summary: {
          totalCotizacionesFolders: cotizacionesFolders.length,
          totalManualFolders: manualFolders.length,
          totalEmptyFolders: emptyFolders.length,
        },
      });
    } catch (error) {
      return sendError(res, 500, `Failed to list folders: ${error.message}`);
    }
  }

  if (req.method === 'POST') {
    const { action, folderIds, confirm, parentFolderId: parentId, folderName } = req.body || {};

    // Action: create folder
    if (action === 'create') {
      if (!parentId || !folderName) {
        return sendError(res, 400, 'parentFolderId and folderName required for create action');
      }

      try {
        const folder = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
          },
          fields: 'id, name',
        });

        // Set public permissions
        await drive.permissions.create({
          fileId: folder.data.id,
          requestBody: { role: 'reader', type: 'anyone' },
        });

        console.log(`[DriveCleanup] Created folder "${folderName}": ${folder.data.id}`);
        return sendSuccess(res, {
          created: true,
          folderId: folder.data.id,
          folderName: folder.data.name
        });
      } catch (error) {
        return sendError(res, 500, `Failed to create folder: ${error.message}`);
      }
    }

    // Action: delete folders
    if (!confirm) {
      return sendError(res, 400, 'Please add "confirm": true to delete folders');
    }

    if (!folderIds || !Array.isArray(folderIds)) {
      return sendError(res, 400, 'folderIds array required');
    }

    const results = [];
    for (const folderId of folderIds) {
      try {
        await drive.files.delete({ fileId: folderId });
        results.push({ id: folderId, status: 'deleted' });
        console.log(`[DriveCleanup] Deleted folder: ${folderId}`);
      } catch (error) {
        results.push({ id: folderId, status: 'error', error: error.message });
        console.error(`[DriveCleanup] Failed to delete ${folderId}:`, error.message);
      }
    }

    return sendSuccess(res, { results });
  }

  return sendError(res, 405, 'Method not allowed');
}
