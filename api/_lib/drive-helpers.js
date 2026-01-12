/**
 * Google Drive Helper Functions
 *
 * Shared utilities for interacting with Google Drive folders and files.
 */

import { DRIVE_FOLDERS, IMAGE_MIME_TYPES, VIDEO_MIME_TYPES, ALL_MEDIA_TYPES, MAX_PAGE_SIZE } from './constants.js';

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
 * List all product folders within the products folder
 * @param {object} drive - Google Drive client
 * @param {string} productsFolderId - Products folder ID
 * @param {string} orderBy - Sort order (default: 'name')
 * @returns {Promise<Array>} Array of folder objects {id, name, createdTime}
 */
export async function listProductFolders(drive, productsFolderId, orderBy = 'name') {
  const response = await drive.files.list({
    q: `'${productsFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, createdTime)',
    orderBy,
    pageSize: MAX_PAGE_SIZE,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return response.data.files || [];
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
 * @param {object} drive - Google Drive client
 * @param {string} folderId - Folder ID
 * @returns {Promise<{file: object, isVideo: boolean}|null>}
 */
export async function getFirstImageOrVideoThumbnail(drive, folderId) {
  const imageMimeTypeQuery = buildMimeTypeQuery(IMAGE_MIME_TYPES.slice(0, 6)); // Main image types

  // First, try to get an image
  const imageResponse = await drive.files.list({
    q: `'${folderId}' in parents and (${imageMimeTypeQuery}) and trashed=false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (imageResponse.data.files?.length > 0) {
    return { file: imageResponse.data.files[0], isVideo: false };
  }

  // If no images, try to get a video
  const videoMimeTypeQuery = buildMimeTypeQuery(VIDEO_MIME_TYPES);

  const videoResponse = await drive.files.list({
    q: `'${folderId}' in parents and (${videoMimeTypeQuery}) and trashed=false`,
    fields: 'files(id, name, mimeType, thumbnailLink)',
    orderBy: 'name',
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
 * @returns {string} Proxy URL
 */
export function getProxyUrl(fileId, isVideo = false) {
  return `/api/serve-drive-image?fileId=${fileId}${isVideo ? '&thumbnail=true' : ''}`;
}

/**
 * Find or create a folder within a parent folder
 * @param {object} drive - Google Drive client (with write access)
 * @param {string} parentFolderId - Parent folder ID
 * @param {string} folderName - Name of folder to find or create
 * @returns {Promise<string>} Folder ID
 */
export async function getOrCreateFolder(drive, parentFolderId, folderName) {
  const searchResponse = await drive.files.list({
    q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id;
  }

  const folder = await drive.files.create({
    resource: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });

  await drive.permissions.create({
    fileId: folder.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return folder.data.id;
}
