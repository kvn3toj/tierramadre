/**
 * Vercel Serverless Function - Get User View Analytics
 *
 * Returns detailed view analytics for a specific user, including:
 * - List of all products they viewed with view counts
 * - Total views and unique products
 * - Device/browser usage patterns
 * - Recent view activity timeline
 *
 * Query params:
 * - email: (required) the user's email to lookup
 * - name: (optional) fallback if email not provided
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const VIEWS_SHEET_NAME = 'ProductViews';

/**
 * Initialize Google Sheets API with service account credentials
 */
function getSheetsClient() {
  try {
    const cleanKey = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/[\s"]+/g, '');
    const credentials = JSON.parse(
      Buffer.from(cleanKey, 'base64').toString()
    );

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return new sheets_v4.Sheets({ auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Cache for 2 minutes
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name } = req.query;

  if (!email && !name) {
    return res.status(400).json({
      error: 'Missing required parameter: email or name',
    });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
    });
  }

  try {
    const sheets = getSheetsClient();

    // Check if the sheet exists
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetExists = metadata.data.sheets.some(
      (s) => s.properties.title === VIEWS_SHEET_NAME
    );

    if (!sheetExists) {
      return res.status(200).json({
        success: true,
        user: { email, name },
        totalViews: 0,
        uniqueProducts: 0,
        products: [],
        recentViews: [],
        deviceBreakdown: {},
        browserBreakdown: {},
        message: 'No view data yet',
      });
    }

    // Fetch all view data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${VIEWS_SHEET_NAME}!A:K`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return res.status(200).json({
        success: true,
        user: { email, name },
        totalViews: 0,
        uniqueProducts: 0,
        products: [],
        recentViews: [],
        deviceBreakdown: {},
        browserBreakdown: {},
      });
    }

    // Column indices (0-based):
    // A=0:timestamp, B=1:itemId, C=2:productName, D=3:sessionId, E=4:referrer,
    // F=5:deviceType, G=6:browser, H=7:country, I=8:userName, J=9:userEmail, K=10:userRole

    const productMap = {}; // Track products viewed
    const deviceBreakdown = {};
    const browserBreakdown = {};
    const recentViews = [];
    let totalViews = 0;
    let userName = name || null;
    let userRole = null;
    let firstSeen = null;
    let lastSeen = null;

    // Process rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const [timestamp, itemId, productName, , , deviceType, browser, country, rowUserName, rowUserEmail, rowUserRole] = row;

      // Match by email (primary) or name (fallback)
      const matchesEmail = email && rowUserEmail && rowUserEmail.toLowerCase() === email.toLowerCase();
      const matchesName = !email && name && rowUserName && rowUserName.toLowerCase() === name.toLowerCase();

      if (!matchesEmail && !matchesName) continue;

      // This row is for our target user
      totalViews++;

      // Capture user info from first match
      if (!userName && rowUserName) userName = rowUserName;
      if (!userRole && rowUserRole) userRole = rowUserRole;

      // Track first/last seen
      const viewTime = new Date(timestamp);
      if (!firstSeen || viewTime < new Date(firstSeen)) firstSeen = timestamp;
      if (!lastSeen || viewTime > new Date(lastSeen)) lastSeen = timestamp;

      // Track product views
      const itemNum = parseInt(itemId, 10);
      if (!isNaN(itemNum)) {
        if (!productMap[itemNum]) {
          productMap[itemNum] = {
            itemId: itemNum,
            productName: productName || `Item ${itemNum}`,
            views: 0,
            firstView: timestamp,
            lastView: timestamp,
            devices: new Set(),
            browsers: new Set(),
          };
        }
        productMap[itemNum].views++;
        productMap[itemNum].lastView = timestamp;
        if (deviceType) productMap[itemNum].devices.add(deviceType);
        if (browser) productMap[itemNum].browsers.add(browser);
      }

      // Device breakdown
      const device = deviceType || 'unknown';
      deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;

      // Browser breakdown
      const browserName = browser || 'unknown';
      browserBreakdown[browserName] = (browserBreakdown[browserName] || 0) + 1;

      // Recent views
      recentViews.push({
        timestamp,
        itemId: itemNum,
        productName: productName || `Item ${itemNum}`,
        deviceType: device,
        browser: browserName,
        country: country || 'unknown',
      });
    }

    // Convert products map to sorted array (by views, descending)
    const products = Object.values(productMap)
      .map((p) => ({
        ...p,
        devices: Array.from(p.devices),
        browsers: Array.from(p.browsers),
      }))
      .sort((a, b) => b.views - a.views);

    // Sort recent views by timestamp (most recent first)
    recentViews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      success: true,
      user: {
        email: email || null,
        name: userName,
        role: userRole || 'guest',
        firstSeen,
        lastSeen,
      },
      totalViews,
      uniqueProducts: products.length,
      products,
      recentViews: recentViews.slice(0, 100), // Limit to 100 most recent
      deviceBreakdown,
      browserBreakdown,
    });
  } catch (error) {
    console.error('Error fetching user views:', error);
    return res.status(500).json({
      error: 'Failed to fetch user views',
      message: error.message,
    });
  }
}
