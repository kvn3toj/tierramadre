/**
 * Vercel Serverless Function - Product Views API
 *
 * Unified API for product view tracking and analytics.
 * Replaces: track-product-view.js, get-product-views.js, get-product-detail-views.js, get-user-views.js
 *
 * Actions (via query param or POST body):
 * - track: Record a new view (POST)
 * - stats: Get overall view statistics (GET)
 * - product: Get detailed views for a specific product (GET, ?itemId=X)
 * - user: Get view history for a specific user (GET, ?email=X or ?name=X)
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const VIEWS_SHEET_NAME = 'ProductViews';

// Headers for the ProductViews sheet
const HEADERS = [
  'timestamp', 'itemId', 'productName', 'sessionId', 'referrer',
  'deviceType', 'browser', 'country', 'userName', 'userEmail', 'userRole'
];

/**
 * Initialize Google Sheets API
 */
function getSheetsClient(readonly = false) {
  try {
    const cleanKey = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/[\s"]+/g, '');
    const credentials = JSON.parse(Buffer.from(cleanKey, 'base64').toString());

    const auth = new GoogleAuth({
      credentials,
      scopes: [readonly
        ? 'https://www.googleapis.com/auth/spreadsheets.readonly'
        : 'https://www.googleapis.com/auth/spreadsheets'
      ],
    });

    return new sheets_v4.Sheets({ auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

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
 * Ensure ProductViews sheet exists
 */
async function ensureSheet(sheets) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetNames = metadata.data.sheets.map(s => s.properties.title);

  if (!sheetNames.includes(VIEWS_SHEET_NAME)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addSheet: { properties: { title: VIEWS_SHEET_NAME } },
        }],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${VIEWS_SHEET_NAME}'!A1:K1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }

  return true;
}

/**
 * Track a product view (POST)
 */
async function trackView(sheets, body, headers) {
  const { itemId, productName, sessionId, referrer, userName, userEmail, userRole } = body;

  if (!itemId) {
    return { success: false, error: 'Missing required field: itemId' };
  }

  const deviceType = detectDevice(headers['user-agent']);
  const browser = detectBrowser(headers['user-agent']);
  const country = headers['x-vercel-ip-country'] || headers['cf-ipcountry'] || 'unknown';

  const viewRow = [
    new Date().toISOString(),
    itemId,
    productName || `Item ${itemId}`,
    sessionId || '',
    referrer || '',
    deviceType,
    browser,
    country,
    userName || '',
    userEmail || '',
    userRole || 'guest',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${VIEWS_SHEET_NAME}'!A:K`,
    valueInputOption: 'RAW',
    requestBody: { values: [viewRow] },
  });

  return { success: true, message: 'View tracked' };
}

/**
 * Get overall view statistics (GET)
 */
async function getStats(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${VIEWS_SHEET_NAME}'!A:K`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return {
      success: true,
      views: {},
      topProducts: [],
      topViewers: [],
      recentActivity: [],
      totalViews: 0,
      todayViews: 0,
      weekViews: 0,
      guestViews: 0,
      loggedInViews: 0,
      uniqueProducts: 0,
      uniqueViewers: 0,
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const views = {};
  const productNames = {};
  const viewerMap = {};
  let todayViews = 0;
  let weekViews = 0;
  let guestViews = 0;
  let loggedInViews = 0;
  const recentActivity = [];

  const dataRows = rows.slice(1);

  for (const row of dataRows) {
    const [timestamp, itemId, productName, , , , , , userName, userEmail, userRole] = row;
    const itemNum = parseInt(itemId, 10);
    if (isNaN(itemNum)) continue;

    // Count views per product
    views[itemNum] = (views[itemNum] || 0) + 1;
    if (productName) productNames[itemNum] = productName;

    // Count by time period
    const viewTime = new Date(timestamp);
    if (viewTime >= todayStart) todayViews++;
    if (viewTime >= weekStart) weekViews++;

    // Count guest vs logged in
    if (userName || userEmail) {
      loggedInViews++;
      const viewerKey = userEmail || userName;
      if (!viewerMap[viewerKey]) {
        viewerMap[viewerKey] = { name: userName || 'Unknown', email: userEmail, role: userRole, views: 0, lastSeen: timestamp };
      }
      viewerMap[viewerKey].views++;
      viewerMap[viewerKey].lastSeen = timestamp;
    } else {
      guestViews++;
    }

    // Collect ALL activity for later sorting (we'll take the most recent 20)
    recentActivity.push({
      timestamp,
      itemId: itemNum,
      productName: productName || `Item ${itemNum}`,
      userName: userName || null,
      userEmail: userEmail || null,
      userRole: userRole || 'guest',
    });
  }

  // Top products
  const topProducts = Object.entries(views)
    .map(([itemId, count]) => ({
      itemId: parseInt(itemId, 10),
      productName: productNames[itemId] || `Item ${itemId}`,
      views: count,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Top viewers
  const topViewers = Object.values(viewerMap)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Sort recent by timestamp desc and take only the last 20
  recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recentActivitySliced = recentActivity.slice(0, 20);

  return {
    success: true,
    views,
    topProducts,
    topViewers,
    recentActivity: recentActivitySliced,
    totalViews: dataRows.length,
    todayViews,
    weekViews,
    guestViews,
    loggedInViews,
    uniqueProducts: Object.keys(views).length,
    uniqueViewers: Object.keys(viewerMap).length,
  };
}

/**
 * Get detailed views for a specific product (GET ?itemId=X)
 */
async function getProductViews(sheets, itemId) {
  const targetItemId = parseInt(itemId, 10);
  if (isNaN(targetItemId)) {
    return { success: false, error: 'Invalid itemId' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${VIEWS_SHEET_NAME}'!A:K`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return {
      success: true, itemId: targetItemId, productName: null, totalViews: 0,
      viewers: [], viewsByDate: [], viewsByDevice: {}, viewsByBrowser: {}, viewsByCountry: {}, recentViews: [],
    };
  }

  let productName = null;
  const viewerMap = {};
  const viewsByDate = {};
  const viewsByDevice = {};
  const viewsByBrowser = {};
  const viewsByCountry = {};
  const recentViews = [];
  let totalViews = 0;

  for (let i = 1; i < rows.length; i++) {
    const [timestamp, id, name, sessionId, , deviceType, browser, country, userName, userEmail, userRole] = rows[i];
    if (parseInt(id, 10) !== targetItemId) continue;

    totalViews++;
    if (name && !productName) productName = name;

    // Track viewer
    const viewerKey = userEmail || userName || sessionId || `guest-${i}`;
    if (!viewerMap[viewerKey]) {
      viewerMap[viewerKey] = {
        name: userName || 'Guest', email: userEmail || null, role: userRole || 'guest',
        isLoggedIn: !!userName, views: 0, firstView: timestamp, lastView: timestamp,
      };
    }
    viewerMap[viewerKey].views++;
    viewerMap[viewerKey].lastView = timestamp;

    // Date breakdown
    const dateKey = new Date(timestamp).toISOString().split('T')[0];
    viewsByDate[dateKey] = (viewsByDate[dateKey] || 0) + 1;

    // Device/browser/country
    viewsByDevice[deviceType || 'unknown'] = (viewsByDevice[deviceType || 'unknown'] || 0) + 1;
    viewsByBrowser[browser || 'unknown'] = (viewsByBrowser[browser || 'unknown'] || 0) + 1;
    viewsByCountry[country || 'unknown'] = (viewsByCountry[country || 'unknown'] || 0) + 1;

    recentViews.push({
      timestamp, userName: userName || 'Guest', userEmail, userRole: userRole || 'guest',
      isLoggedIn: !!userName, deviceType: deviceType || 'unknown', browser: browser || 'unknown', country: country || 'unknown',
    });
  }

  const viewers = Object.values(viewerMap).sort((a, b) => b.views - a.views);
  const viewsByDateArray = Object.entries(viewsByDate)
    .map(([date, count]) => ({ date, views: count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  recentViews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    success: true, itemId: targetItemId, productName, totalViews,
    uniqueViewers: viewers.length,
    loggedInViewers: viewers.filter(v => v.isLoggedIn).length,
    guestViewers: viewers.filter(v => !v.isLoggedIn).length,
    viewers, viewsByDate: viewsByDateArray, viewsByDevice, viewsByBrowser, viewsByCountry,
    recentViews: recentViews.slice(0, 50),
  };
}

/**
 * Get view history for a user (GET ?email=X or ?name=X)
 */
async function getUserViews(sheets, email, name) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${VIEWS_SHEET_NAME}'!A:K`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return {
      success: true, user: { email, name }, totalViews: 0, uniqueProducts: 0,
      products: [], recentViews: [], deviceBreakdown: {}, browserBreakdown: {},
    };
  }

  const productMap = {};
  const deviceBreakdown = {};
  const browserBreakdown = {};
  const recentViews = [];
  let totalViews = 0;
  let userName = name || null;
  let userRole = null;
  let firstSeen = null;
  let lastSeen = null;

  for (let i = 1; i < rows.length; i++) {
    const [timestamp, itemId, productName, , , deviceType, browser, country, rowUserName, rowUserEmail, rowUserRole] = rows[i];

    const matchesEmail = email && rowUserEmail && rowUserEmail.toLowerCase() === email.toLowerCase();
    const matchesName = !email && name && rowUserName && rowUserName.toLowerCase() === name.toLowerCase();
    if (!matchesEmail && !matchesName) continue;

    totalViews++;
    if (!userName && rowUserName) userName = rowUserName;
    if (!userRole && rowUserRole) userRole = rowUserRole;

    const viewTime = new Date(timestamp);
    if (!firstSeen || viewTime < new Date(firstSeen)) firstSeen = timestamp;
    if (!lastSeen || viewTime > new Date(lastSeen)) lastSeen = timestamp;

    const itemNum = parseInt(itemId, 10);
    if (!isNaN(itemNum)) {
      if (!productMap[itemNum]) {
        productMap[itemNum] = {
          itemId: itemNum, productName: productName || `Item ${itemNum}`,
          views: 0, firstView: timestamp, lastView: timestamp,
        };
      }
      productMap[itemNum].views++;
      productMap[itemNum].lastView = timestamp;
    }

    deviceBreakdown[deviceType || 'unknown'] = (deviceBreakdown[deviceType || 'unknown'] || 0) + 1;
    browserBreakdown[browser || 'unknown'] = (browserBreakdown[browser || 'unknown'] || 0) + 1;

    recentViews.push({
      timestamp, itemId: itemNum, productName: productName || `Item ${itemNum}`,
      deviceType: deviceType || 'unknown', browser: browser || 'unknown', country: country || 'unknown',
    });
  }

  const products = Object.values(productMap).sort((a, b) => b.views - a.views);
  recentViews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    success: true,
    user: { email: email || null, name: userName, role: userRole || 'guest', firstSeen, lastSeen },
    totalViews, uniqueProducts: products.length, products,
    recentViews: recentViews.slice(0, 100), deviceBreakdown, browserBreakdown,
  };
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({ success: false, error: 'Google Service Account not configured' });
  }

  const action = req.query.action || req.body?.action || 'stats';

  try {
    // POST - Track a view
    if (req.method === 'POST' && action === 'track') {
      const sheets = getSheetsClient(false);
      await ensureSheet(sheets);
      const result = await trackView(sheets, req.body, req.headers);
      return res.status(200).json(result);
    }

    // GET - Read operations (readonly)
    if (req.method === 'GET') {
      const sheets = getSheetsClient(true);

      // Check if sheet exists before querying
      const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheetExists = metadata.data.sheets.some(s => s.properties.title === VIEWS_SHEET_NAME);

      if (!sheetExists) {
        return res.status(200).json({
          success: true, views: {}, topProducts: [], totalViews: 0, message: 'No view data yet',
        });
      }

      // Get stats
      if (action === 'stats') {
        // Cache for 60 seconds, allow stale for 30 more while revalidating
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
        const result = await getStats(sheets);
        return res.status(200).json(result);
      }

      // Get product detail views
      if (action === 'product' && req.query.itemId) {
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
        const result = await getProductViews(sheets, req.query.itemId);
        return res.status(200).json(result);
      }

      // Get user views
      if (action === 'user' && (req.query.email || req.query.name)) {
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
        const result = await getUserViews(sheets, req.query.email, req.query.name);
        return res.status(200).json(result);
      }

      // Default to stats
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      const result = await getStats(sheets);
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error in product-views:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      message: error.message,
    });
  }
}
