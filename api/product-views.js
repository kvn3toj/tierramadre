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
  sendError,
  SPREADSHEET_ID,
  SHEETS,
  CACHE,
  ensureSheet,
  withApiHandler,
} from './_lib/index.js';

const SHEET_NAME = SHEETS.PRODUCT_VIEWS;
const HEADERS = [
  'timestamp', 'itemId', 'productName', 'sessionId', 'referrer',
  'deviceType', 'browser', 'country', 'userName', 'userEmail', 'userRole', 'inviterName'
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
    userName, userEmail, userRole, country, inviterName,
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
    inviterName || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:L`,
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
    range: `'${SHEET_NAME}'!A:L`,
  });

  const rows = response.data.values || [];
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
  const productCounts = {};
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  const browserCounts = {};
  const viewerCounts = {}; // Track views per user

  // Time boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - (7 * 24 * 60 * 60 * 1000);

  let todayViews = 0;
  let weekViews = 0;
  let guestViews = 0;
  let loggedInViews = 0;

  // Recent activity (collect all, sort later)
  const allActivity = [];

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
      itemId: parseInt(itemId),
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
      return { itemId: parseInt(itemId), productName, views: count };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  // Top viewers (sorted by views)
  const topViewers = Object.values(viewerCounts)
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  // Recent activity (sorted by timestamp, newest first)
  const recentActivity = allActivity
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  // Build views object mapping itemId to view count
  const views = {};
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
async function getProductViews(sheets, itemId) {
  if (!itemId) {
    return { success: false, error: 'itemId is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:L`,
  });

  const rows = response.data.values || [];
  const emptyResponse = {
    success: true,
    itemId: parseInt(itemId),
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
  const productRows = rows.slice(1).filter(row => row[1] === String(itemId));

  if (productRows.length === 0) {
    return emptyResponse;
  }

  // Get product name from first matching row
  const productName = productRows[0][2] || null;

  // Aggregation maps
  const viewerMap = new Map(); // key: email || name || sessionId
  const deviceCounts = {};
  const browserCounts = {};
  const countryCounts = {};
  const dateCounts = {};
  let loggedInViewers = 0;
  let guestViewers = 0;
  const loggedInViewerSet = new Set();
  const guestViewerSet = new Set();

  // Process each view
  for (const row of productRows) {
    const timestamp = row[0];
    const sessionId = row[3] || '';
    const referrer = row[4] || '';
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

    const viewer = viewerMap.get(viewerKey);
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
    .map(v => ({
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
    .map(row => ({
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
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  return {
    success: true,
    itemId: parseInt(itemId),
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
async function getUserViews(sheets, email, name) {
  if (!email && !name) {
    return { success: false, error: 'email or name is required' };
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:L`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    return {
      success: true,
      user: { email: email || null, name: name || null, role: 'guest', firstSeen: null, lastSeen: null },
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
  const matchingViews = [];
  const productMap = {}; // Track per-product stats
  const deviceCounts = {};
  const browserCounts = {};
  let userInfo = { email: null, name: null, role: 'guest' };
  let firstSeen = null;
  let lastSeen = null;

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
      userInfo = { email: userEmail || null, name: userName || null, role: userRole };
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
        itemId: parseInt(itemId),
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
    matchingViews.push({ timestamp, itemId: parseInt(itemId), productName, deviceType, browser, country });
  }

  // Convert productMap to array and sort by views
  const products = Object.values(productMap)
    .map(p => ({
      ...p,
      devices: Array.from(p.devices),
      browsers: Array.from(p.browsers),
    }))
    .sort((a, b) => b.views - a.views);

  // Sort recent views by timestamp (newest first)
  const recentViews = matchingViews
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
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
 * Get most recent activity (GET ?action=recent)
 */
async function getRecentActivity(sheets, limit = 50) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:L`,
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
      inviterName: row[11] || null,
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

export default withApiHandler(async (req, res, { sheets }) => {
  const action = req.query.action || req.body?.action || 'stats';

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
}, {
  methods: ['GET', 'POST', 'OPTIONS'],
  cache: CACHE.SHORT,
  provideSheets: true,
  errorPrefix: 'ProductViews',
});
