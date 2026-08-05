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
  listMediaFiles,
  getProxyUrl,
} from './_lib/index.js';
import { resolveGrant } from './_lib/catalogGrant.js';
import { lookupVitrina } from './_lib/vitrinaLookup.js';

export default withApiHandler(
  async (req, res, { drive, sharedDriveId }) => {
    // Resolved (not applied to the payload) — DELIBERATE, product decision,
    // not an oversight. `/c/:folder` collection links are a sales tool: the
    // asesor shares a link and the client sees prices. The design for a
    // signed per-collection token (like a vitrina's `/v/<token>`, so a
    // shared link keeps its price for the recipient while a stranger who
    // finds the URL gets none) is a separate, not-yet-built task. Until that
    // exists, projecting this endpoint would break the sales tool with no
    // way to restore prices for the people it's meant for — so it stays
    // unprojected. Do NOT "fix" this by wiring projectForGrant back in
    // without that signed-token mechanism landing first; see
    // .superpowers/sdd/2026-08-05-control-de-acceso-al-catalogo/task-7-report.md
    // (fix round 2, F7) for the ruling.
    const grant = await resolveGrant(req, { lookupVitrina });
    void grant;
    const folder = req.query.folder;
    if (!folder || typeof folder !== 'string') {
      return sendError(res, 400, 'Missing ?folder= parameter');
    }

    // 1. Find collections/ root folder
    const collectionsFolderId = await getCollectionsFolderId(
      drive,
      sharedDriveId,
    );
    if (!collectionsFolderId) {
      return sendError(res, 404, 'Collections folder not found in Drive');
    }

    // 2. Find the specific collection subfolder
    const collectionFolderId = await findCollectionFolder(
      drive,
      collectionsFolderId,
      folder,
    );
    if (!collectionFolderId) {
      return sendError(res, 404, `Collection "${folder}" not found`);
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
      return sendError(res, 404, 'collection.json not found in folder');
    }

    const fileContent = await drive.files.get({
      fileId: jsonFile.id,
      alt: 'media',
      supportsAllDrives: true,
    });

    let collectionData;
    try {
      collectionData =
        typeof fileContent.data === 'string'
          ? JSON.parse(fileContent.data)
          : fileContent.data;
    } catch {
      return sendError(res, 500, 'Invalid collection.json format');
    }

    // 4. Scan for media — supports both subfolders and direct files
    const productFolders = await listProductFolders(drive, collectionFolderId);
    const thumbnails = {};

    if (productFolders.length > 0) {
      // Subfolder mode: each product has its own folder with media inside
      for (let i = 0; i < productFolders.length; i += BATCH_SIZE) {
        const batch = productFolders.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (pFolder) => {
            const match = pFolder.name.match(/^(\d+)\s*/);
            const itemNumber = match ? parseInt(match[1], 10) : null;
            if (!itemNumber) return null;
            try {
              const result = await getFirstImageOrVideoThumbnail(
                drive,
                pFolder.id,
              );
              if (result) {
                return {
                  itemNumber,
                  proxyUrl: getProxyUrl(
                    result.file.id,
                    result.isVideo,
                    'small',
                  ),
                  isVideo: result.isVideo,
                };
              }
            } catch (error) {
              console.warn(
                `[Collection] Thumbnail error for ${pFolder.name}:`,
                error.message,
              );
            }
            return null;
          }),
        );
        results.forEach((r) => {
          if (r)
            thumbnails[r.itemNumber] = {
              url: r.proxyUrl,
              isVideoThumbnail: r.isVideo,
            };
        });
      }
    } else {
      // Flat mode: media files are directly in the collection folder, named "901 Name.mp4"
      const mediaFiles = await listMediaFiles(drive, collectionFolderId);
      for (const file of mediaFiles) {
        const match = file.name.match(/^(\d+)\s/);
        if (!match) continue;
        const itemNumber = parseInt(match[1], 10);
        const isVideo = file.mimeType.startsWith('video/');
        thumbnails[itemNumber] = {
          url: getProxyUrl(file.id, isVideo, 'small'),
          isVideoThumbnail: isVideo,
        };
      }
    }

    // 5. Merge thumbnail URLs into product data
    const mergedProducts = (collectionData.products || []).map((product) => {
      const thumb = thumbnails[product.item];
      return {
        ...product,
        // Use static videoUrl/posterUrl if provided in collection.json, otherwise fallback to Drive thumbnails
        videoUrl: product.videoUrl,
        posterUrl: product.posterUrl,
        imagen: product.posterUrl || thumb?.url || '',
        mediaType: product.videoUrl
          ? 'video'
          : thumb?.isVideoThumbnail
            ? 'video'
            : 'image',
      };
    });

    // NOT projected — see the comment on `resolveGrant` above. `products`
    // is `mergedProducts` as-is, unprojected, same as before Task 7.
    const products = mergedProducts;

    return sendSuccess(res, {
      collection: {
        name: collectionData.name,
        description: collectionData.description,
        asesorEmail: collectionData.asesorEmail,
      },
      products,
    });
  },
  {
    methods: ['GET', 'OPTIONS'],
    // NOT CACHE.SHORT. setCacheHeaders' Vary list (Accept, Accept-Encoding,
    // Origin) doesn't include Authorization, so a shared CDN cache entry
    // would not distinguish a staff response from an anonymous one — a
    // priced payload could serve to an anonymous visitor for up to 90s.
    // Matches get-treasure-sheets.ts / get-asesores.ts.
    cache: CACHE.NONE,
    provideDrive: true,
    requireDriveId: true,
    errorPrefix: 'GetCollection',
  },
);
