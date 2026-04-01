/**
 * Vercel Serverless Function - Get Batch Thumbnails from Google Drive
 *
 * Fetches the first image (or video thumbnail) from each product folder for grid thumbnails.
 * Returns a map of itemNumber -> proxy URL for efficient grid rendering.
 */

import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { drive_v3 } from '@googleapis/drive';
import {
  withApiHandler,
  sendSuccess,
  CACHE,
  BATCH_SIZE,
  getProductsFolderId,
  listProductFolders,
  getFirstImageOrVideoThumbnail,
  extractItemNumber,
  getProxyUrl,
} from './_lib/index.js';
import type { BatchThumbnailEntry } from './types/api-contracts.ts';

type DriveContext = { drive: drive_v3.Drive; sharedDriveId: string };

interface ThumbnailBuildResult {
  itemNumber: number;
  fileId: string;
  proxyUrl: string;
  isVideo: boolean;
  tinyThumb: string | null;
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse, ctx: Record<string, unknown>) => {
    const { drive, sharedDriveId } = ctx as DriveContext;
    console.log('Fetching batch thumbnails...');

    const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
    console.log('Products folder ID:', productsFolderId);

    const folders = await listProductFolders(drive, productsFolderId);
    console.log(`Found ${folders.length} product folders`);

    const seenItems = new Set<number>();
    const uniqueFolders = folders.filter((folder: { id: string; name: string }) => {
      const itemNumber = extractItemNumber(folder.name);
      if (itemNumber === null || seenItems.has(itemNumber)) return false;
      seenItems.add(itemNumber);
      return true;
    });

    if (uniqueFolders.length < folders.length) {
      console.log(
        `[Thumbnails] Deduplicated: ${folders.length} folders → ${uniqueFolders.length} unique items`
      );
    }

    const thumbnails: Record<number, BatchThumbnailEntry> = {};

    for (let i = 0; i < uniqueFolders.length; i += BATCH_SIZE) {
      const batch = uniqueFolders.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (folder: { id: string; name: string }): Promise<ThumbnailBuildResult | null> => {
          const itemNumber = extractItemNumber(folder.name);
          if (!itemNumber) return null;

          try {
            const result = await getFirstImageOrVideoThumbnail(drive, folder.id);
            if (result) {
              const { file, isVideo } = result;
              const tinyThumb = file.thumbnailLink
                ? file.thumbnailLink.replace(/=s\d+/, '=s20')
                : null;
              return {
                itemNumber,
                fileId: file.id!,
                proxyUrl: getProxyUrl(file.id!, isVideo, 'small'),
                isVideo,
                tinyThumb,
              };
            }
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`Error fetching thumbnail for ${folder.name}:`, msg);
          }
          return null;
        })
      );

      results.forEach((result: ThumbnailBuildResult | null) => {
        if (result) {
          const entry: BatchThumbnailEntry = {
            url: result.proxyUrl,
            isVideoThumbnail: result.isVideo,
          };
          if (result.tinyThumb) entry.tinyThumb = result.tinyThumb;
          thumbnails[result.itemNumber] = entry;
        }
      });
    }

    console.log(`Generated ${Object.keys(thumbnails).length} thumbnails`);

    const count = Object.keys(thumbnails).length;
    const fileIds = Object.entries(thumbnails)
      .map(([item, data]) => `${item}:${data.url}`)
      .sort()
      .join('|');
    const dataHash = crypto.createHash('md5').update(fileIds).digest('hex').slice(0, 16);
    const etag = `"batch-${dataHash}"`;

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.setHeader('ETag', etag);
      return res.status(304).end();
    }

    res.setHeader('ETag', etag);

    return sendSuccess(res, {
      thumbnails,
      count,
      lastUpdated: new Date().toISOString(),
    });
  },
  {
    methods: ['GET', 'OPTIONS'],
    cache: CACHE.CATALOG,
    provideDrive: true,
    requireDriveId: true,
    errorPrefix: 'GetBatchThumbnails',
  }
);
