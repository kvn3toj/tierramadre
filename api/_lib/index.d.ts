/**
 * Type declarations for ESM `index.js` — used by typed API routes.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export const SPREADSHEET_ID: string;
export const APP_SPREADSHEET_ID: string;

export const CACHE: Record<string, string>;

export function withApiHandler(
  handlerFn: (
    req: VercelRequest,
    res: VercelResponse,
    context: Record<string, unknown>
  ) => Promise<unknown> | unknown,
  options?: Record<string, unknown>
): (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

export function sendError(
  res: VercelResponse,
  status: number,
  message: string,
  detail?: string
): unknown;

export function sendSuccess(res: VercelResponse, data: unknown, status?: number): unknown;

export function getSheetNames(sheets: unknown): Promise<string[]>;

export function findSheetByPattern(sheetNames: string[], patterns: string[]): string | undefined;

export function normalizeHeader(header: string): string;

export function parsePrice(price: unknown): number;

export function parseDecimal(value: unknown): number;

export function findColumnIndex(headers: string[], names: string[]): number;

export function formatDisplayName(name: string): string;

/** From `constants.js` */
export const BATCH_SIZE: number;

/** From `drive-helpers.js` */
export function getProductsFolderId(
  drive: unknown,
  sharedDriveId: string
): Promise<string>;

export function listProductFolders(
  drive: unknown,
  productsFolderId: string,
  orderBy?: string
): Promise<Array<{ id: string; name: string }>>;

export function extractItemNumber(folderName: string): number | null;

export function getFirstImageOrVideoThumbnail(
  drive: unknown,
  folderId: string
): Promise<{
  file: { id?: string; thumbnailLink?: string | null };
  isVideo: boolean;
} | null>;

export function getProxyUrl(
  fileId: string,
  isVideo?: boolean,
  size?: string
): string;

/** From `constants.js` */
export const SHEETS: Record<string, string>;
export const INVITATION_DURATION_HOURS: number;
export const DRIVE_FOLDERS: Record<string, string>;

export function ensureSheet(
  sheets: unknown,
  sheetName: string,
  headers?: string[],
  spreadsheetId?: string
): Promise<unknown>;

export function generateShortCode(): string;
