/**
 * Shared API response shapes — keep aligned with frontend hooks (`src/hooks/*`).
 */

import type { TreasureItem } from '../../src/types/index.ts';

/** GET /api/get-treasure-sheets */
export interface GetTreasureSheetsSuccessBody {
  success: true;
  treasure: TreasureItem[];
}

/** GET /api/get-batch-thumbnails */
export interface BatchThumbnailEntry {
  url: string;
  isVideoThumbnail: boolean;
  tinyThumb?: string;
}

export interface GetBatchThumbnailsSuccessBody {
  success: true;
  thumbnails: Record<number, BatchThumbnailEntry>;
  count: number;
  lastUpdated: string;
}
