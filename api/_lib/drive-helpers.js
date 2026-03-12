/**
 * Google Drive Helper Functions
 *
 * Shared utilities for interacting with Google Drive folders and files.
 */

import { DRIVE_FOLDERS, IMAGE_MIME_TYPES, VIDEO_MIME_TYPES, ALL_MEDIA_TYPES, MAX_PAGE_SIZE } from './constants.js';

/**
 * Find the collections folder ID (sibling of products inside the drive root)
 * @param {object} drive - Google Drive client
 * @param {string} sharedDriveId - Root folder ID (TM-Studio)
 * @returns {Promise<string|null>} Collections folder ID or null if not found
 */
export async function getCollectionsFolderId(drive, sharedDriveId) {
  const response = await drive.files.list({
    q: `name='${DRIVE_FOLDERS.COLLECTIONS}' and mimeType='application/vnd.google-apps.folder' and '${sharedDriveId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files?.[0]?.id || null;
}

/**
 * Find a specific collection subfolder by name within the collections folder
 * @param {object} drive - Google Drive client
 * @param {string} collectionsFolderId - Collections parent folder ID
 * @param {string} folderName - Collection folder name (e.g., 'ceo-coomunity')
 * @returns {Promise<string|null>} Collection folder ID or null
 */
export async function findCollectionFolder(drive, collectionsFolderId, folderName) {
  const escapedName = folderName.replace(/'/g, "\\'");
  const response = await drive.files.list({
    q: `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and '${collectionsFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files?.[0]?.id || null;
}

/**
 * Find the products folder ID within a shared drive
 * @param {object} drive - Google Drive client
 * @param {string} sharedDriveId - Shared Drive ID
 * @returns {Promise<string>} Products folder ID or shared drive ID if not found
 */
export async function getProductsFolderId(drive, sharedDriveId) {
  const response = await drive.files.list({
    q: `name='${DRIVE_FOLDERS.PRODUCTS}' and mimeType='application/vnd.google-apps.folder' and '${sharedDriveId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  return sharedDriveId;
}

/**
 * List all product folders within the products folder (with pagination)
 * @param {object} drive - Google Drive client
 * @param {string} productsFolderId - Products folder ID
 * @param {string} orderBy - Sort order (default: 'name')
 * @returns {Promise<Array>} Array of folder objects {id, name, createdTime}
 */
export async function listProductFolders(drive, productsFolderId, orderBy = 'name') {
  const allFiles = [];
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${productsFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'nextPageToken, files(id, name, createdTime)',
      orderBy,
      pageSize: MAX_PAGE_SIZE,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      ...(pageToken && { pageToken }),
    });

    allFiles.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return allFiles;
}

/**
 * Find product folder by item number (folder name format: "32 - Venus")
 * @param {object} drive - Google Drive client
 * @param {string} parentFolderId - Parent folder ID
 * @param {string|number} itemNumber - Product item number
 * @returns {Promise<string|null>} Folder ID or null if not found
 */
export async function getProductFolderById(drive, parentFolderId, itemNumber) {
  const response = await drive.files.list({
    q: `name contains '${itemNumber} -' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const exactMatch = response.data.files?.find(f =>
    f.name.startsWith(`${itemNumber} - `)
  );

  return exactMatch?.id || null;
}

/**
 * Extract item number from folder name (format: "32 - Venus")
 * @param {string} folderName - Folder name
 * @returns {number|null} Item number or null
 */
export function extractItemNumber(folderName) {
  const match = folderName.match(/^(\d+)\s*-/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract product name from folder name (format: "32 - Venus")
 * @param {string} folderName - Folder name
 * @returns {string} Product name
 */
export function extractProductName(folderName) {
  const match = folderName.match(/^\d+\s*-\s*(.+)$/);
  return match ? match[1].trim() : folderName;
}

/**
 * Build MIME type query for Drive API
 * @param {string[]} mimeTypes - Array of MIME types
 * @returns {string} Query string for mimeType filter
 */
export function buildMimeTypeQuery(mimeTypes) {
  return mimeTypes.map(t => `mimeType='${t}'`).join(' or ');
}

/**
 * Get first image from a folder (or video thumbnail if no images)
 *
 * IMPORTANT: Uses orderBy='name' for consistent file selection across API calls.
 * This ensures the same file is returned as "first image" even when folder contents change.
 *
 * Note: 'name' uses alphabetical sort (1, 12, 2, 22). For natural sort (1, 2, 12, 22),
 * use 'name_natural'. See: https://developers.google.com/drive/api/v3/reference/files/list
 *
 * @param {object} drive - Google Drive client
 * @param {string} folderId - Folder ID
 * @returns {Promise<{file: object, isVideo: boolean}|null>}
 */
export async function getFirstImageOrVideoThumbnail(drive, folderId) {
  const imageMimeTypeQuery = buildMimeTypeQuery(IMAGE_MIME_TYPES.slice(0, 6)); // Main image types

  // First, try to get an image
  // orderBy='name' ensures consistent "first image" selection across API calls
  const imageResponse = await drive.files.list({
    q: `'${folderId}' in parents and (${imageMimeTypeQuery}) and trashed=false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name', // Alphabetical ordering for stability
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (imageResponse.data.files?.length > 0) {
    return { file: imageResponse.data.files[0], isVideo: false };
  }

  // If no images, try to get a video
  const videoMimeTypeQuery = buildMimeTypeQuery(VIDEO_MIME_TYPES);

  // Same orderBy='name' for video fallback to maintain stability
  const videoResponse = await drive.files.list({
    q: `'${folderId}' in parents and (${videoMimeTypeQuery}) and trashed=false`,
    fields: 'files(id, name, mimeType, thumbnailLink)',
    orderBy: 'name', // Alphabetical ordering for stability
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (videoResponse.data.files?.length > 0) {
    return { file: videoResponse.data.files[0], isVideo: true };
  }

  return null;
}

/**
 * Get first image with creation date from a folder
 * @param {object} drive - Google Drive client
 * @param {string} folderId - Folder ID
 * @returns {Promise<object|null>} File object with createdTime or null
 */
export async function getFirstImageWithDate(drive, folderId) {
  const imageMimeTypeQuery = buildMimeTypeQuery(IMAGE_MIME_TYPES.slice(0, 6));

  const imageResponse = await drive.files.list({
    q: `'${folderId}' in parents and (${imageMimeTypeQuery}) and trashed=false`,
    fields: 'files(id, name, mimeType, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return imageResponse.data.files?.[0] || null;
}

/**
 * List all media files in a folder
 * @param {object} drive - Google Drive client
 * @param {string} folderId - Folder ID
 * @returns {Promise<Array>} Array of file objects
 */
export async function listMediaFiles(drive, folderId) {
  const mimeTypeQuery = buildMimeTypeQuery(ALL_MEDIA_TYPES);

  const response = await drive.files.list({
    q: `'${folderId}' in parents and (${mimeTypeQuery}) and trashed=false`,
    fields: 'files(id, name, mimeType, size, createdTime, thumbnailLink, webContentLink)',
    orderBy: 'name',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files || [];
}

/**
 * Generate viewable URL for a Drive file
 * @param {string} fileId - File ID
 * @param {string} mimeType - File MIME type
 * @returns {string} Viewable URL
 */
export function getViewableUrl(fileId, mimeType) {
  if (mimeType.startsWith('image/')) {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Generate proxy URL for serving file through our API
 * @param {string} fileId - File ID
 * @param {boolean} isVideo - Whether file is a video (to request thumbnail)
 * @param {string} size - Image size: 'thumb', 'small', 'medium', 'large', 'original'
 * @returns {string} Proxy URL
 */
export function getProxyUrl(fileId, isVideo = false, size = 'original') {
  const params = [`fileId=${fileId}`];
  if (isVideo) params.push('thumbnail=true');
  if (size && size !== 'original') params.push(`size=${size}`);
  return `/api/serve-drive-image?${params.join('&')}`;
}

/**
 * Find or create a folder within a parent folder.
 *
 * For product folders (when itemNumber is provided), searches by item number
 * prefix (e.g., "222 -") instead of exact name to prevent duplicate folder
 * creation when product names change in the sheet.
 *
 * @param {object} drive - Google Drive client (with write access)
 * @param {string} parentFolderId - Parent folder ID
 * @param {string} folderName - Name of folder to find or create
 * @param {string} [sharedDriveId] - Optional Shared Drive ID (required for creating in Shared Drives)
 * @param {number} [itemNumber] - Optional item number for product folder prefix search
 * @returns {Promise<string>} Folder ID
 */
export async function getOrCreateFolder(drive, parentFolderId, folderName, sharedDriveId = null, itemNumber = null) {
  try {
    let searchQuery;

    if (itemNumber !== null) {
      // Product folder: search by item number prefix to find existing folder
      // regardless of name changes. This prevents duplicate folders.
      searchQuery = `name contains '${itemNumber} -' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    } else {
      // Non-product folder: search by exact name
      const escapedFolderName = folderName.replace(/'/g, "\\'");
      searchQuery = `name='${escapedFolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    }

    const searchResponse = await drive.files.list({
      q: searchQuery,
      fields: 'files(id, name)',
      pageSize: 200,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      ...(sharedDriveId && { driveId: sharedDriveId, corpora: 'drive' }),
    });

    if (itemNumber !== null && searchResponse.data.files?.length > 0) {
      // For product folders, find exact prefix match (e.g., "222 - " not "2222 - ")
      // The `contains` query can match substrings (e.g., "22 -" matches "122 - ..."),
      // so we filter client-side with startsWith for exact item number prefix.
      const exactMatch = searchResponse.data.files.find(f =>
        f.name.startsWith(`${itemNumber} - `)
      );
      if (exactMatch) {
        return exactMatch.id;
      }
    } else if (searchResponse.data.files?.length > 0) {
      return searchResponse.data.files[0].id;
    }
  } catch (searchError) {
    console.error(`[Drive] Error searching for folder "${folderName}":`, searchError.message);
    // Continue to try creating the folder
  }

  // Create folder - for Shared Drives, we need supportsAllDrives
  try {
    const createParams = {
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id',
      supportsAllDrives: true,
    };

    const folder = await drive.files.create(createParams);

    // Only set public permissions for non-Shared Drive folders
    // Shared Drive folders inherit permissions from the drive
    if (!sharedDriveId) {
      await drive.permissions.create({
        fileId: folder.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true,
      });
    }

    return folder.data.id;
  } catch (createError) {
    console.error(`[Drive] Error creating folder "${folderName}" in parent ${parentFolderId}:`, createError.message);
    if (createError.response?.data) {
      console.error('[Drive] API error details:', JSON.stringify(createError.response.data, null, 2));
    }
    throw createError;
  }
}
