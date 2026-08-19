/**
 * Vercel Serverless Function - Get Product Images from Google Drive Folder
 *
 * This endpoint lists all images/videos from a product's folder in Google Drive.
 * Folder structure: SharedDrive/products/{itemNumber}/ — with two fallbacks
 * when that folder is missing OR empty (staff loads auto-create empty ones):
 *
 *   1. The folder stored in `carpetaFotosUrl` (Convex `productInventory`,
 *      column BB — "la buena; NO products/<item> - <nombre>" per the schema).
 *      Explicit per-item data, so it wins over any name-based guess.
 *   2. SharedDrive/fotosintesis/<loteId>/{itemNumber}/, where the bot's album
 *      flow uploads its photos. The bot records only the FIRST url as the
 *      item's `fotoUrl`, so without this fallback a 4-photo album rendered as
 *      a single-image gallery (caso TM-0574, 2026-08-19).
 */

import {
  withApiHandler,
  sendError,
  sendSuccess,
  CACHE,
  getProductsFolderId,
  getProductFolderById,
  getFotosintesisItemFolderId,
  listMediaFiles,
  getViewableUrl,
  getProxyUrl,
} from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { extractDriveFolderId } from './_lib/drive-url.js';

// Per-instance cache for the Convex carpetaFotosUrl lookup — the endpoint is
// CACHE.NONE at the CDN, so without this every page view re-queries Convex.
const CARPETA_CACHE_TTL_MS = 5 * 60 * 1000;
const carpetaCache = new Map();

/**
 * Resolve the Fotosíntesis photo folder for an item via Convex.
 *
 * Server-to-server only: `products.fotosintesisFields` is gated by
 * ADMIN_SYNC_TOKEN (same pattern as ambassador-subdomain.ts) and returns
 * internal accounting fields — ONLY `carpetaFotosUrl` is consumed here;
 * nothing else leaves this function.
 *
 * @param {string} itemId - Product item number (bare id, e.g. "573")
 * @returns {Promise<string|null>} Drive folder ID, or null when unavailable
 */
async function getCarpetaFotosFolderId(itemId) {
  const secret = process.env.ADMIN_SYNC_TOKEN;
  if (!isConvexEnabled || !convexClient || !secret) return null;

  const cached = carpetaCache.get(itemId);
  // `null` ("no carpeta") is a valid cached value — only undefined is a miss.
  if (cached && cached.expires > Date.now()) return cached.value;

  try {
    const { api } = await import('../convex/_generated/api.js');
    const rows = await convexClient.query(api.products.fotosintesisFields, {
      secret,
      itemId,
    });
    const folderId = extractDriveFolderId(rows?.[0]?.carpetaFotosUrl);
    carpetaCache.set(itemId, {
      value: folderId,
      expires: Date.now() + CARPETA_CACHE_TTL_MS,
    });
    return folderId;
  } catch (err) {
    console.warn(
      `[GetDriveImages] carpetaFotosUrl lookup failed for ${itemId}:`,
      err?.message || err,
    );
    return null;
  }
}

export default withApiHandler(
  async (req, res, { drive, sharedDriveId }) => {
    const { itemNumber } = req.query;

    if (!itemNumber) {
      return sendError(res, 400, 'itemNumber is required');
    }

    const item = itemNumber.toString();
    console.log(`Fetching images for product ${item}`);

    const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
    console.log('Products folder ID:', productsFolderId);

    let folderId = await getProductFolderById(drive, productsFolderId, item);
    let source = 'products';
    let files = folderId ? await listMediaFiles(drive, folderId) : [];

    // Fallback 1: the folder the item itself points at (carpetaFotosUrl).
    // May live outside the shared drive, so a listing failure is survivable.
    if (files.length === 0) {
      const carpetaFolderId = await getCarpetaFotosFolderId(item);
      if (carpetaFolderId && carpetaFolderId !== folderId) {
        try {
          const carpetaFiles = await listMediaFiles(drive, carpetaFolderId);
          if (carpetaFiles.length > 0) {
            folderId = carpetaFolderId;
            files = carpetaFiles;
            source = 'carpetaFotos';
          }
        } catch (err) {
          console.warn(
            `[GetDriveImages] carpetaFotos listing failed for ${item}:`,
            err?.message || err,
          );
        }
      }
    }

    // Fallback 2: bot-captured items without a carpeta pointer; their album
    // lives in fotosintesis/<loteId>/<itemNumber>/.
    if (files.length === 0) {
      const fotosintesisFolderId = await getFotosintesisItemFolderId(
        drive,
        sharedDriveId,
        item,
      );
      if (fotosintesisFolderId && fotosintesisFolderId !== folderId) {
        try {
          const fotosintesisFiles = await listMediaFiles(
            drive,
            fotosintesisFolderId,
          );
          if (fotosintesisFiles.length > 0) {
            folderId = fotosintesisFolderId;
            files = fotosintesisFiles;
            source = 'fotosintesis';
          }
        } catch (err) {
          console.warn(
            `[GetDriveImages] fotosintesis listing failed for ${item}:`,
            err?.message || err,
          );
        }
      }
    }

    if (!folderId || files.length === 0) {
      console.log(`No media found for product ${item}`);
      return sendSuccess(res, {
        itemNumber,
        images: [],
        message: `No media found for product ${item}`,
      });
    }

    console.log(`Found ${files.length} media files (source: ${source})`);

    const images = files.map((file, index) => {
      const isVideo = file.mimeType.startsWith('video/');

      return {
        id: file.id,
        name: file.name,
        url: getViewableUrl(file.id, file.mimeType),
        // Responsive image URLs for different contexts
        thumbnailUrl: getProxyUrl(file.id, isVideo, 'small'), // 400px - for gallery grid
        previewUrl: getProxyUrl(file.id, isVideo, 'medium'), // 800px - for detail preview
        fullUrl: getProxyUrl(file.id, isVideo, 'original'), // Original - for full view
        type: isVideo ? 'video' : 'image',
        mimeType: file.mimeType,
        size: parseInt(file.size || '0'),
        createdTime: file.createdTime,
        order: index,
        proxyUrl: getProxyUrl(file.id, false, 'original'), // Default to original
      };
    });

    return sendSuccess(res, {
      itemNumber,
      folderId,
      source,
      images,
    });
  },
  {
    methods: ['GET', 'OPTIONS'],
    // NONE a propósito: una galería recién subida (bot o web) debe aparecer al
    // primer load de la ficha; 5 min de CDN servirían el "sin carpeta" viejo.
    cache: CACHE.NONE,
    provideDrive: true,
    requireDriveId: true,
    errorPrefix: 'GetDriveImages',
  },
);
