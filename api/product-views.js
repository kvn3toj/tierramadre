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
 * - recent: Get most recent activity (GET)
 */

import {
  getSheetsClient,
  isGoogleConfigured,
  initApi,
  sendError,
  setCacheHeaders,
  SPREADSHEET_ID,
  SHEETS,
  CACHE,
  ensureSheet,
} from './_lib/index.js';

const SHEET_NAME = SHEETS.PRODUCT_VIEWS;
const HEADERS = [
  'timestamp', 'itemId', 'productName', 'sessionId', 'referrer',
  'deviceType', 'browser', 'country', 'userName', 'userEmail', 'userRole'
];

/**
 * Detect device type from User-Agent
 */
function detectDevice(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Extract browser from User-Agent
 */
function detectBrowser(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('chrome') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  return 'Other';
}

/**
 * Track a product view (POST)
 */
async function trackView(sheets, body, headers) {
  const {
    itemId, productName, sessionId, referrer,
    userName, userEmail, userRole, country,
  } = body;

  if (!itemId) {
    return { success: false, error: 'itemId is required' };
  }

  const userAgent = headers['user-agent'] || '';
  const row = [
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
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:K`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { success: true, tracked: true, itemId, timestamp: row[0] };
}

/**
 * Get overall view statistics (GET)
 */
async function getStats(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:K`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: true, totalViews: 0, uniqueProducts: 0, topProducts: [], deviceStats: {}, browserStats: {} };
  }

  const dataRows = rows.slice(1);
  const productCounts = {};
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  const browserCounts = {};

  for (const row of dataRows) {
    const itemId = row[1];
    const productName = row[2] || `Product ${itemId}`;
    const device = row[5] || 'unknown';
    const browser = row[6] || 'unknown';

    const key = `${itemId}|${productName}`;
    productCounts[key] = (productCounts[key] || 0) + 1;
    deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    browserCounts[browser] = (browserCounts[browser] || 0) + 1;
  }

  const topProducts = Object.entries(productCounts)
    .map(([key, count]) => {
      const [itemId, productName] = key.split('|');
      return { itemId: parseInt(itemId), productName, views: count };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  return {
    success: true,
    totalViews: dataRows.length,
    uniqueProducts: Object.keys(productCounts).length,
    topProducts,
    deviceStats: deviceCounts,
    browserStats: browserCounts,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get detailed views for a specific product (GET ?itemId=X)
 */
async function getProductViews(sheets, itemId) {
  if (!itemId) {
    return { success: false, error: 'itemId is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:K`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: true, itemId, totalViews: 0, views: [] };
  }

  const views = rows.slice(1)
    .filter(row => row[1] === String(itemId))
    .map(row => ({
      timestamp: row[0],
      sessionId: row[3],
      referrer: row[4],
      deviceType: row[5],
      browser: row[6],
      country: row[7],
      userName: row[8],
      userEmail: row[9],
      userRole: row[10],
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    success: true,
    itemId,
    totalViews: views.length,
    views: views.slice(0, 100),
  };
}

/**
 * Get view history for a specific user (GET ?email=X or ?name=X)
 */
async function getUserViews(sheets, email, name) {
  if (!email && !name) {
    return { success: false, error: 'email or name is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:K`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: true, totalViews: 0, views: [] };
  }

  const normalizedEmail = email?.toLowerCase().trim();
  const normalizedName = name?.toLowerCase().trim();

  const views = rows.slice(1)
    .filter(row => {
      const rowEmail = (row[9] || '').toLowerCase().trim();
      const rowName = (row[8] || '').toLowerCase().trim();
      if (normalizedEmail && rowEmail === normalizedEmail) return true;
      if (normalizedName && rowName.includes(normalizedName)) return true;
      return false;
    })
    .map(row => ({
      timestamp: row[0],
      itemId: row[1],
      productName: row[2],
      deviceType: row[5],
      browser: row[6],
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    success: true,
    email: email || undefined,
    name: name || undefined,
    totalViews: views.length,
    views: views.slice(0, 100),
  };
}

/**
 * Get most recent activity (GET ?action=recent)
 */
async function getRecentActivity(sheets, limit = 50) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:K`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return { success: true, activity: [], totalViews: 0 };
  }

  const dataRows = rows.slice(1);

  // Sort by timestamp descending (most recent first)
  const sorted = dataRows
    .map(row => ({
      timestamp: row[0],
      itemId: row[1],
      productName: row[2],
      sessionId: row[3],
      deviceType: row[5],
      browser: row[6],
      userName: row[8],
      userEmail: row[9],
      userRole: row[10],
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  return {
    success: true,
    activity: sorted,
    totalViews: dataRows.length,
    lastUpdated: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'POST', 'OPTIONS'] })) return;

  // Very short cache for analytics data to ensure freshness
  setCacheHeaders(res, CACHE.SHORT);

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  const action = req.query.action || req.body?.action || 'stats';

  try {
    const sheets = getSheetsClient(req.method === 'GET');
    await ensureSheet(sheets, SHEET_NAME, HEADERS);

    // POST - Track view
    if (req.method === 'POST' && action === 'track') {
      const result = await trackView(sheets, req.body, req.headers);
      return res.status(200).json(result);
    }

    // GET - Stats
    if (req.method === 'GET' && action === 'stats') {
      const result = await getStats(sheets);
      return res.status(200).json(result);
    }

    // GET - Product views
    if (req.method === 'GET' && (action === 'product' || req.query.itemId)) {
      const result = await getProductViews(sheets, req.query.itemId);
      return res.status(200).json(result);
    }

    // GET - User views
    if (req.method === 'GET' && (action === 'user' || req.query.email || req.query.name)) {
      const result = await getUserViews(sheets, req.query.email, req.query.name);
      return res.status(200).json(result);
    }

    // GET - Recent activity
    if (req.method === 'GET' && action === 'recent') {
      const limit = parseInt(req.query.limit) || 50;
      const result = await getRecentActivity(sheets, limit);
      return res.status(200).json(result);
    }

    return sendError(res, 405, 'Method not allowed');

  } catch (error) {
    console.error('Error in product-views:', error);
    return sendError(res, 500, 'Failed to process request', error.message);
  }
}
