/**
 * Vercel Serverless Function - Get Exclusive Collection
 *
 * Reads collection.json and product images from a named folder
 * inside Drive's `collections/` directory.
 *
 * Query: ?folder=ceo-coomunity
 */

import {
  withApiHandler,
  sendError,
  sendSuccess,
  CACHE,
  BATCH_SIZE,
  getCollectionsFolderId,
  findCollectionFolder,
  listProductFolders,
  getFirstImageOrVideoThumbnail,
  extractItemNumber,
  getProxyUrl,
} from './_lib/index.js';

export default withApiHandler(async (req, res, { drive, sharedDriveId }) => {
  const folder = req.query.folder;
  if (!folder || typeof folder !== 'string') {
    return sendError(res, 'Missing ?folder= parameter', 400);
  }

  // 1. Find collections/ root folder
  const collectionsFolderId = await getCollectionsFolderId(drive, sharedDriveId);
  if (!collectionsFolderId) {
    return sendError(res, 'Collections folder not found in Drive', 404);
  }

  // 2. Find the specific collection subfolder
  const collectionFolderId = await findCollectionFolder(drive, collectionsFolderId, folder);
  if (!collectionFolderId) {
    return sendError(res, `Collection "${folder}" not found`, 404);
  }

  // 3. Read collection.json from the folder
  const jsonFileResponse = await drive.files.list({
    q: `name='collection.json' and '${collectionFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const jsonFile = jsonFileResponse.data.files?.[0];
  if (!jsonFile) {
    return sendError(res, 'collection.json not found in folder', 404);
  }

  const fileContent = await drive.files.get({
    fileId: jsonFile.id,
    alt: 'media',
    supportsAllDrives: true,
  });

  let collectionData;
  try {
    collectionData = typeof fileContent.data === 'string'
      ? JSON.parse(fileContent.data)
      : fileContent.data;
  } catch {
    return sendError(res, 'Invalid collection.json format', 500);
  }

  // 4. Scan product subfolders for thumbnails (reuse existing helpers)
  const productFolders = await listProductFolders(drive, collectionFolderId);
  const thumbnails = {};

  for (let i = 0; i < productFolders.length; i += BATCH_SIZE) {
    const batch = productFolders.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (pFolder) => {
        // Collection folders may use "901 Name" or "901 - Name" format
        const match = pFolder.name.match(/^(\d+)\s*/);
        const itemNumber = match ? parseInt(match[1], 10) : null;
        if (!itemNumber) return null;

        try {
          const result = await getFirstImageOrVideoThumbnail(drive, pFolder.id);
          if (result) {
            const { file, isVideo } = result;
            return {
              itemNumber,
              proxyUrl: getProxyUrl(file.id, isVideo, 'small'),
              isVideo,
            };
          }
        } catch (error) {
          console.warn(`[Collection] Error fetching thumbnail for ${pFolder.name}:`, error.message);
        }
        return null;
      })
    );

    results.forEach((r) => {
      if (r) {
        thumbnails[r.itemNumber] = {
          url: r.proxyUrl,
          isVideoThumbnail: r.isVideo,
        };
      }
    });
  }

  // 5. Merge thumbnail URLs into product data
  const products = (collectionData.products || []).map((product) => {
    const thumb = thumbnails[product.item];
    return {
      ...product,
      imagen: thumb?.url || '',
      mediaType: thumb?.isVideoThumbnail ? 'video' : 'image',
    };
  });

  return sendSuccess(res, {
    collection: {
      name: collectionData.name,
      description: collectionData.description,
      asesorEmail: collectionData.asesorEmail,
    },
    products,
  });
}, {
  methods: ['GET', 'OPTIONS'],
  cache: CACHE.SHORT,
  provideDrive: true,
  requireDriveId: true,
  errorPrefix: 'GetCollection',
});
