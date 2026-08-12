/**
 * Vercel Serverless Function - Product Views API
 *
 * Unified API for product view tracking and analytics.
 *
 * Actions (via query param or POST body):
 * - track: Record a new view (POST)
 * - stats: Get overall view statistics (GET)
 * - product: Get detailed views for a specific product (GET, ?itemId=X)
 * - user: Get view history for a specific user (GET, ?email=X or ?name=X)
 * - by-inviter: Get views for guests of a specific inviter (GET, ?inviterName=X)
 * - recent: Get most recent activity (GET)
 *
 * Converted from .js to .ts (2026-08-06, PII lockdown) so the session-token
 * imports below (`./_lib/bearer.js` / `./_lib/sessionToken.js`, both `.ts`
 * sources) resolve the same way they already do for the sibling gates in
 * api/invitations.ts and api/vitrina.ts — a plain `.js` importer does not
 * get TypeScript's `.js`→`.ts` extension resolution, which is what this
 * file needs for `verifiedSessionEmail` below.
 */

import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  sendError,
  APP_SPREADSHEET_ID,
  SHEETS,
  CACHE,
  ensureSheet,
  withApiHandler,
} from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { extractBearer } from './_lib/bearer.js';
import { isSessionToken, verifySessionToken } from './_lib/sessionToken.js';
import { api } from '../convex/_generated/api.js';

type Sheets = sheets_v4.Sheets;
/** A raw row from `sheets.spreadsheets.values.get` — cell values are strings. */
type Row = string[];
/** POST bodies use loose JSON shapes. */
type ApiBody = Record<string, unknown>;

const SHEET_NAME = SHEETS.PRODUCT_VIEWS;
const HEADERS = [
  'timestamp',
  'itemId',
  'productName',
  'sessionId',
  'referrer',
  'deviceType',
  'browser',
  'country',
  'userName',
  'userEmail',
  'userRole',
  'inviterName',
];

/**
 * Verifies a `tms1` app session token from the `Authorization: Bearer …`
 * header and returns its email, or null. Same contract as
 * `verifiedSessionEmail` in api/invitations.ts / api/vitrina.ts — a raw
 * Google ID token, whatever its shape, is not a session token and returns
 * null here, which the gated actions below turn into a 401. Exported for
 * tests. (2026-08-06, PII lockdown — sibling door to
 * convex/productViews.ts's guestActivity/byInviterAndGuest gate.)
 */
export function verifiedSessionEmail(
  authHeader?: string | string[],
): string | null {
  const token = extractBearer(authHeader);
  if (!token || !isSessionToken(token)) return null;
  return verifySessionToken(token)?.email ?? null;
}

/**
 * Detect device type from User-Agent
 */
function detectDevice(userAgent: string): string {
  const ua = (userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(ua))
    return 'mobile';
  return 'desktop';
}

/**
 * Extract browser from User-Agent
 */
function detectBrowser(userAgent: string): string {
  const ua = (userAgent || '').toLowerCase();
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('chrome') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  return 'Other';
}

interface TrackViewBody {
  itemId?: string | number;
  productName?: string;
  sessionId?: string;
  referrer?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  country?: string;
  inviterName?: string;
}

/**
 * Track a product view (POST)
 */
async function trackView(
  sheets: Sheets,
  body: TrackViewBody,
  headers: VercelRequest['headers'],
): Promise<Record<string, unknown>> {
  const {
    itemId,
    productName,
    sessionId,
    referrer,
    userName,
    userEmail,
    userRole,
    country,
    inviterName,
  } = body;

  if (!itemId) {
    return { success: false, error: 'itemId is required' };
  }

  const userAgent = (headers['user-agent'] as string) || '';
  const row: (string | number)[] = [
    new Date().toISOString(),
    itemId,
    productName || '',
    sessionId || '',
    referrer || '',
    detectDevice(userAgent),
    detectBrowser(userAgent),
    country || '',
    userName || '',
    userEmail || '',
    userRole || '',
    inviterName || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:L`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { success: true, tracked: true, itemId, timestamp: row[0] };
}

/**
 * Get overall view statistics (GET)
 */
async function getStats(sheets: Sheets): Promise<Record<string, unknown>> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:L`,
  });

  const rows = (response.data.values || []) as Row[];
  if (rows.length <= 1) {
    return {
      success: true,
      totalViews: 0,
      uniqueProducts: 0,
      uniqueViewers: 0,
      todayViews: 0,
      weekViews: 0,
      guestViews: 0,
      loggedInViews: 0,
      topProducts: [],
      topViewers: [],
      recentActivity: [],
      deviceStats: {},
      browserStats: {},
    };
  }

  const dataRows = rows.slice(1);
  const productCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
  };
  const browserCounts: Record<string, number> = {};
  interface ViewerCount {
    name: string;
    email: string | null;
    role: string;
    views: number;
    lastSeen: string;
  }
  const viewerCounts: Record<string, ViewerCount> = {}; // Track views per user

  // Time boundaries
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

  let todayViews = 0;
  let weekViews = 0;
  let guestViews = 0;
  let loggedInViews = 0;

  interface ActivityEntry {
    timestamp: string;
    itemId: number;
    productName: string;
    userName: string | null;
    userEmail: string | null;
    userRole: string;
    inviterName: string | null;
  }
  // Recent activity (collect all, sort later)
  const allActivity: ActivityEntry[] = [];

  for (const row of dataRows) {
    const timestamp = row[0];
    const itemId = row[1];
    const productName = row[2] || `Product ${itemId}`;
    const device = row[5] || 'unknown';
    const browser = row[6] || 'unknown';
    const userName = row[8] || '';
    const userEmail = row[9] || '';
    const userRole = row[10] || 'guest';

    // Product counts
    const key = `${itemId}|${productName}`;
    productCounts[key] = (productCounts[key] || 0) + 1;

    // Device/browser counts
    deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    browserCounts[browser] = (browserCounts[browser] || 0) + 1;

    // Time-based counts
    const viewTime = new Date(timestamp).getTime();
    if (viewTime >= todayStart) todayViews++;
    if (viewTime >= weekStart) weekViews++;

    // User tracking
    if (userName || userEmail) {
      loggedInViews++;
      const viewerKey = userEmail || userName;
      if (!viewerCounts[viewerKey]) {
        viewerCounts[viewerKey] = {
          name: userName || userEmail.split('@')[0],
          email: userEmail || null,
          role: userRole,
          views: 0,
          lastSeen: timestamp,
        };
      }
      viewerCounts[viewerKey].views++;
      // Update lastSeen if this view is more recent
      if (new Date(timestamp) > new Date(viewerCounts[viewerKey].lastSeen)) {
        viewerCounts[viewerKey].lastSeen = timestamp;
      }
    } else {
      guestViews++;
    }

    // Collect for recent activity
    const inviterName = row[11] || null;
    allActivity.push({
      timestamp,
      itemId: parseInt(itemId, 10),
      productName,
      userName: userName || null,
      userEmail: userEmail || null,
      userRole,
      inviterName,
    });
  }

  // Top products
  const topProducts = Object.entries(productCounts)
    .map(([key, count]) => {
      const [itemId, productName] = key.split('|');
      return { itemId: parseInt(itemId, 10), productName, views: count };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  // Top viewers (sorted by views)
  const topViewers = Object.values(viewerCounts)
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  // Recent activity (sorted by timestamp, newest first)
  const recentActivity = allActivity
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 50);

  // Build views object mapping itemId to view count
  const views: Record<string, number> = {};
  for (const [key, count] of Object.entries(productCounts)) {
    const [itemId] = key.split('|');
    views[itemId] = count;
  }

  return {
    success: true,
    totalViews: dataRows.length,
    uniqueProducts: Object.keys(productCounts).length,
    uniqueViewers: Object.keys(viewerCounts).length,
    todayViews,
    weekViews,
    guestViews,
    loggedInViews,
    topProducts,
    topViewers,
    recentActivity,
    views,
    deviceStats: deviceCounts,
    browserStats: browserCounts,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get detailed views for a specific product (GET ?itemId=X)
 */
async function getProductViews(
  sheets: Sheets,
  itemId: string | undefined,
): Promise<Record<string, unknown>> {
  if (!itemId) {
    return { success: false, error: 'itemId is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:L`,
  });

  const rows = (response.data.values || []) as Row[];
  const emptyResponse = {
    success: true,
    itemId: parseInt(itemId, 10),
    productName: null,
    totalViews: 0,
    uniqueViewers: 0,
    loggedInViewers: 0,
    guestViewers: 0,
    viewers: [],
    viewsByDate: [],
    viewsByDevice: {},
    viewsByBrowser: {},
    viewsByCountry: {},
    recentViews: [],
  };

  if (rows.length <= 1) {
    return emptyResponse;
  }

  // Filter rows for this product
  const productRows = rows.slice(1).filter((row) => row[1] === String(itemId));

  if (productRows.length === 0) {
    return emptyResponse;
  }

  // Get product name from first matching row
  const productName = productRows[0][2] || null;

  // Aggregation maps
  interface ViewerAgg {
    name: string;
    email: string | null;
    role: string;
    isLoggedIn: boolean;
    views: number;
    firstView: string;
    lastView: string;
    devices: Set<string>;
    browsers: Set<string>;
    countries: Set<string>;
  }
  const viewerMap = new Map<string, ViewerAgg>(); // key: email || name || sessionId
  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const dateCounts: Record<string, number> = {};
  const loggedInViewerSet = new Set<string>();
  const guestViewerSet = new Set<string>();

  // Process each view
  for (const row of productRows) {
    const timestamp = row[0];
    const sessionId = row[3] || '';
    const deviceType = row[5] || 'unknown';
    const browser = row[6] || 'unknown';
    const country = row[7] || 'unknown';
    const userName = row[8] || '';
    const userEmail = row[9] || '';
    const userRole = row[10] || 'guest';

    // Determine viewer key and logged-in status
    const isLoggedIn = !!(userName || userEmail);
    const viewerKey = userEmail || userName || sessionId || `anon-${timestamp}`;

    // Count device/browser/country
    deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;
    browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    if (country) {
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    }

    // Count by date
    const dateKey = timestamp.split('T')[0]; // YYYY-MM-DD
    dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;

    // Track unique logged-in vs guest viewers
    if (isLoggedIn) {
      loggedInViewerSet.add(viewerKey);
    } else {
      guestViewerSet.add(viewerKey);
    }

    // Build viewer aggregation
    if (!viewerMap.has(viewerKey)) {
      viewerMap.set(viewerKey, {
        name: userName || (userEmail ? userEmail.split('@')[0] : 'Invitado'),
        email: userEmail || null,
        role: userRole,
        isLoggedIn,
        views: 0,
        firstView: timestamp,
        lastView: timestamp,
        devices: new Set(),
        browsers: new Set(),
        countries: new Set(),
      });
    }

    const viewer = viewerMap.get(viewerKey)!;
    viewer.views++;
    viewer.devices.add(deviceType);
    viewer.browsers.add(browser);
    if (country) viewer.countries.add(country);

    const viewTime = new Date(timestamp).getTime();
    if (viewTime < new Date(viewer.firstView).getTime()) {
      viewer.firstView = timestamp;
    }
    if (viewTime > new Date(viewer.lastView).getTime()) {
      viewer.lastView = timestamp;
    }
  }

  // Convert viewer map to array
  const viewers = Array.from(viewerMap.values())
    .map((v) => ({
      name: v.name,
      email: v.email,
      role: v.role,
      isLoggedIn: v.isLoggedIn,
      views: v.views,
      firstView: v.firstView,
      lastView: v.lastView,
      devices: Array.from(v.devices),
      browsers: Array.from(v.browsers),
      countries: Array.from(v.countries),
    }))
    .sort((a, b) => b.views - a.views);

  // Convert date counts to sorted array
  const viewsByDate = Object.entries(dateCounts)
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Build recent views array
  const recentViews = productRows
    .map((row) => ({
      timestamp: row[0],
      userName: row[8] || 'Invitado',
      userEmail: row[9] || null,
      userRole: row[10] || 'guest',
      inviterName: row[11] || null,
      isLoggedIn: !!(row[8] || row[9]),
      deviceType: row[5] || 'unknown',
      browser: row[6] || 'unknown',
      country: row[7] || '',
      referrer: row[4] || null,
    }))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 50);

  return {
    success: true,
    itemId: parseInt(itemId, 10),
    productName,
    totalViews: productRows.length,
    uniqueViewers: viewerMap.size,
    loggedInViewers: loggedInViewerSet.size,
    guestViewers: guestViewerSet.size,
    viewers,
    viewsByDate,
    viewsByDevice: deviceCounts,
    viewsByBrowser: browserCounts,
    viewsByCountry: countryCounts,
    recentViews,
  };
}

/**
 * Get view history for a specific user (GET ?email=X or ?name=X)
 */
async function getUserViews(
  sheets: Sheets,
  email: string | undefined,
  name: string | undefined,
): Promise<Record<string, unknown>> {
  if (!email && !name) {
    return { success: false, error: 'email or name is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:L`,
  });

  const rows = (response.data.values || []) as Row[];
  if (rows.length <= 1) {
    return {
      success: true,
      user: {
        email: email || null,
        name: name || null,
        role: 'guest',
        firstSeen: null,
        lastSeen: null,
      },
      totalViews: 0,
      uniqueProducts: 0,
      products: [],
      recentViews: [],
      deviceBreakdown: {},
      browserBreakdown: {},
    };
  }

  const normalizedEmail = email?.toLowerCase().trim();
  const normalizedName = name?.toLowerCase().trim();

  // Collect all matching views
  interface MatchingView {
    timestamp: string;
    itemId: number;
    productName: string;
    deviceType: string;
    browser: string;
    country: string;
  }
  const matchingViews: MatchingView[] = [];
  interface ProductMapEntry {
    itemId: number;
    productName: string;
    views: number;
    firstView: string;
    lastView: string;
    devices: Set<string>;
    browsers: Set<string>;
  }
  const productMap: Record<string, ProductMapEntry> = {}; // Track per-product stats
  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  let userInfo: { email: string | null; name: string | null; role: string } = {
    email: null,
    name: null,
    role: 'guest',
  };
  let firstSeen: string | null = null;
  let lastSeen: string | null = null;

  for (const row of rows.slice(1)) {
    const rowEmail = (row[9] || '').toLowerCase().trim();
    const rowName = (row[8] || '').toLowerCase().trim();

    const isMatch =
      (normalizedEmail && rowEmail === normalizedEmail) ||
      (normalizedName && rowName.includes(normalizedName));

    if (!isMatch) continue;

    const timestamp = row[0];
    const itemId = row[1];
    const productName = row[2] || `Product ${itemId}`;
    const deviceType = row[5] || 'unknown';
    const browser = row[6] || 'unknown';
    const country = row[7] || '';
    const userName = row[8] || '';
    const userEmail = row[9] || '';
    const userRole = row[10] || 'guest';

    // Update user info (take the most recent)
    if (userName || userEmail) {
      userInfo = {
        email: userEmail || null,
        name: userName || null,
        role: userRole,
      };
    }

    // Track first/last seen
    const viewTime = new Date(timestamp).getTime();
    if (!firstSeen || viewTime < new Date(firstSeen).getTime()) {
      firstSeen = timestamp;
    }
    if (!lastSeen || viewTime > new Date(lastSeen).getTime()) {
      lastSeen = timestamp;
    }

    // Track per-product stats
    if (!productMap[itemId]) {
      productMap[itemId] = {
        itemId: parseInt(itemId, 10),
        productName,
        views: 0,
        firstView: timestamp,
        lastView: timestamp,
        devices: new Set(),
        browsers: new Set(),
      };
    }
    productMap[itemId].views++;
    productMap[itemId].devices.add(deviceType);
    productMap[itemId].browsers.add(browser);
    if (viewTime < new Date(productMap[itemId].firstView).getTime()) {
      productMap[itemId].firstView = timestamp;
    }
    if (viewTime > new Date(productMap[itemId].lastView).getTime()) {
      productMap[itemId].lastView = timestamp;
    }

    // Track device/browser counts
    deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;
    browserCounts[browser] = (browserCounts[browser] || 0) + 1;

    // Collect for recent views
    matchingViews.push({
      timestamp,
      itemId: parseInt(itemId, 10),
      productName,
      deviceType,
      browser,
      country,
    });
  }

  // Convert productMap to array and sort by views
  const products = Object.values(productMap)
    .map((p) => ({
      ...p,
      devices: Array.from(p.devices),
      browsers: Array.from(p.browsers),
    }))
    .sort((a, b) => b.views - a.views);

  // Sort recent views by timestamp (newest first)
  const recentViews = matchingViews
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 100);

  return {
    success: true,
    user: {
      email: userInfo.email || email || null,
      name: userInfo.name || name || null,
      role: userInfo.role,
      firstSeen,
      lastSeen,
    },
    totalViews: matchingViews.length,
    uniqueProducts: products.length,
    products,
    recentViews,
    deviceBreakdown: deviceCounts,
    browserBreakdown: browserCounts,
  };
}

/**
 * Get views by inviter name (GET ?action=by-inviter&inviterName=X)
 */
async function getViewsByInviter(
  sheets: Sheets,
  inviterName: string | undefined,
  limit = 500,
): Promise<Record<string, unknown>> {
  if (!inviterName) return { success: true, views: [] };

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:L`,
  });

  const rows = (response.data.values || []) as Row[];
  if (rows.length <= 1) return { success: true, views: [] };

  const needle = inviterName.toLowerCase().trim();
  const views = rows
    .slice(1)
    .filter((row) => (row[11] || '').toLowerCase().trim() === needle)
    .map((row) => ({
      timestamp: row[0] || '',
      itemId: parseInt(row[1], 10) || 0,
      productName: row[2] || '',
      deviceType: row[5] || '',
      browser: row[6] || '',
      userName: row[8] || null,
      userEmail: row[9] || null,
      userRole: row[10] || 'Invitado',
      inviterName: row[11] || null,
    }))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, limit);

  return { success: true, views };
}

/**
 * Get most recent activity (GET ?action=recent)
 */
async function getRecentActivity(
  sheets: Sheets,
  limit = 50,
): Promise<Record<string, unknown>> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:L`,
  });

  const rows = (response.data.values || []) as Row[];
  if (rows.length <= 1) {
    return { success: true, activity: [], totalViews: 0 };
  }

  const dataRows = rows.slice(1);

  // Sort by timestamp descending (most recent first)
  const sorted = dataRows
    .map((row) => ({
      timestamp: row[0],
      itemId: row[1],
      productName: row[2],
      sessionId: row[3],
      deviceType: row[5],
      browser: row[6],
      userName: row[8],
      userEmail: row[9],
      userRole: row[10],
      inviterName: row[11] || null,
    }))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, limit);

  return {
    success: true,
    activity: sorted,
    totalViews: dataRows.length,
    lastUpdated: new Date().toISOString(),
  };
}

type ProductViewsAction =
  | 'track'
  | 'stats'
  | 'product'
  | 'user'
  | 'by-inviter'
  | 'recent';

/**
 * Resolves which action branch a request will actually take, mirroring the
 * routing precedence below (track > stats > product > user > by-inviter >
 * recent > 405 not-found). Used BOTH to route the request AND to decide
 * whether the session gate applies — the two must never disagree, or a query
 * param combo (e.g. `?action=stats&itemId=5`, which routes to stats, not
 * product) could reach a PII branch the gate didn't check.
 */
function resolveAction(req: VercelRequest): ProductViewsAction | null {
  const action =
    (req.query.action as string) ||
    ((req.body as ApiBody | undefined)?.action as string) ||
    'stats';
  if (req.method === 'POST') {
    return action === 'track' ? 'track' : null;
  }
  if (req.method !== 'GET') return null;
  if (action === 'stats') return 'stats';
  if (action === 'product' || req.query.itemId) return 'product';
  if (action === 'user' || req.query.email || req.query.name) return 'user';
  if (action === 'by-inviter') return 'by-inviter';
  if (action === 'recent') return 'recent';
  return null;
}

/**
 * These four actions return per-user PII (userEmail, userName, userRole,
 * plus device/browser/session detail) keyed only on a guessable itemId /
 * email / name / inviterName — none of them a secret. Session-gated
 * (2026-08-06, PII lockdown): this REST endpoint served the SAME rows as
 * convex/productViews.ts's `guestActivity`/`byInviterAndGuest`, which were
 * already gated on a `tms1` staff session — this file was the sibling door
 * left open. Every browser caller of these four actions
 * (ProductViewersPage, UserViewsPage, useAllActivity→ActivityPage,
 * useGuestActivity→mi-perfil pages) renders behind AdminRoute/StaffRoute, so
 * a caller who can reach those screens already holds a valid session token
 * — same reasoning as api/invitations.ts's `list-by-creator` gate. 401, not
 * an empty body: this is a REST endpoint, not a reactive subscription.
 */
const SESSION_GATED_ACTIONS = new Set<ProductViewsAction>([
  'product',
  'user',
  'by-inviter',
  'recent',
]);

export async function handleProductViews(
  req: VercelRequest,
  res: VercelResponse,
  context: Record<string, unknown>,
): Promise<unknown> {
  const sheets = context.sheets as Sheets;
  const resolvedAction = resolveAction(req);
  const sessionEmail = verifiedSessionEmail(req.headers['authorization']);

  // Gate BEFORE any Sheets read (ensureSheet included below) — an
  // unauthorized caller must cost no Sheets quota.
  if (
    resolvedAction &&
    SESSION_GATED_ACTIONS.has(resolvedAction) &&
    !sessionEmail
  ) {
    return sendError(res, 401, 'Inicia sesión para ver esta información.');
  }

  await ensureSheet(sheets, SHEET_NAME, HEADERS, APP_SPREADSHEET_ID);

  // POST - Track view (anonymous — this is the whole point of view
  // tracking for guests; never gate this path)
  if (resolvedAction === 'track') {
    const body = (req.body as TrackViewBody) || {};
    if (isConvexEnabled && convexClient) {
      const {
        itemId,
        productName,
        sessionId,
        referrer,
        userName,
        userEmail,
        userRole,
        country,
        inviterName,
      } = body;
      if (!itemId) return sendError(res, 400, 'itemId is required');
      const userAgent = (req.headers['user-agent'] as string) || '';
      await convexClient.mutation(api.productViews.track, {
        itemId: String(itemId),
        productName: productName || undefined,
        sessionId: sessionId || undefined,
        referrer: referrer || undefined,
        deviceType: detectDevice(userAgent),
        browser: detectBrowser(userAgent),
        country: country || undefined,
        userName: userName || undefined,
        userEmail: userEmail || undefined,
        userRole: userRole || undefined,
        inviterName: inviterName || undefined,
      });
      return res.status(200).json({
        success: true,
        tracked: true,
        itemId,
        timestamp: new Date().toISOString(),
      });
    }
    const result = await trackView(sheets, body, req.headers);
    return res.status(200).json(result);
  }

  // GET - Stats: aggregate view counts, PUBLIC — every catalog visitor's
  // useProductViews→useTreasureBrowserController call lands here with no
  // session, and that's fine, it only reads `views` (per-item counts). But
  // the payload also embeds per-user PII (topViewers: name/email/role;
  // recentActivity: userName/userEmail) for the staff Analytics dashboard
  // (useAnalyticsData). Strip those two fields instead of gating the whole
  // action, so anonymous view-count display keeps working; a caller with a
  // verified session gets the full shape.
  if (resolvedAction === 'stats') {
    const result = await getStats(sheets);
    if (!sessionEmail) {
      result.topViewers = [];
      result.recentActivity = [];
    }
    return res.status(200).json(result);
  }

  // GET - Product views (session-gated above)
  if (resolvedAction === 'product') {
    const result = await getProductViews(
      sheets,
      req.query.itemId as string | undefined,
    );
    return res.status(200).json(result);
  }

  // GET - User views (session-gated above)
  if (resolvedAction === 'user') {
    const result = await getUserViews(
      sheets,
      req.query.email as string | undefined,
      req.query.name as string | undefined,
    );
    return res.status(200).json(result);
  }

  // GET - Views by inviter, for asesor profile guest activity (session-gated above)
  if (resolvedAction === 'by-inviter') {
    const limit = parseInt(String(req.query.limit ?? ''), 10) || 500;
    const result = await getViewsByInviter(
      sheets,
      req.query.inviterName as string | undefined,
      limit,
    );
    return res.status(200).json(result);
  }

  // GET - Recent activity across all advisors (session-gated above)
  if (resolvedAction === 'recent') {
    const limit = parseInt(String(req.query.limit ?? ''), 10) || 50;
    const result = await getRecentActivity(sheets, limit);
    return res.status(200).json(result);
  }

  return sendError(res, 405, 'Method not allowed');
}

export default withApiHandler(handleProductViews, {
  methods: ['GET', 'POST', 'OPTIONS'],
  cache: CACHE.SHORT,
  provideSheets: true,
  errorPrefix: 'ProductViews',
});
