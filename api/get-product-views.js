/**
 * Vercel Serverless Function - Get Product View Counts
 *
 * Returns view counts for all products or a specific product.
 * Reads from the ProductViews sheet and aggregates counts.
 *
 * Query params:
 * - itemId: (optional) specific product to get views for
 * - top: (optional) number of top products to return (default: all)
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
  // Cache for 5 minutes
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
    });
  }

  try {
    const { itemId, top } = req.query;
    const sheets = getSheetsClient();

    // Check if the sheet exists
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetExists = metadata.data.sheets.some(
      (s) => s.properties.title === VIEWS_SHEET_NAME
    );

    if (!sheetExists) {
      // No views yet - return empty data
      return res.status(200).json({
        success: true,
        views: {},
        topProducts: [],
        totalViews: 0,
        message: 'No view data yet',
      });
    }

    // Fetch all view data (columns A-K: timestamp, itemId, productName, ..., userName, userEmail, userRole)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${VIEWS_SHEET_NAME}!A:K`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      // Only header or empty
      return res.status(200).json({
        success: true,
        views: {},
        topProducts: [],
        topViewers: [],
        totalViews: 0,
      });
    }

    // Skip header, aggregate counts
    const viewCounts = {};
    const productNames = {};
    const viewerCounts = {};  // Track views by user
    const recentViewers = []; // Recent views with user info
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let totalViews = 0;
    let todayViews = 0;
    let weekViews = 0;
    let guestViews = 0;
    let loggedInViews = 0;

    // Column indices (0-based):
    // A=0:timestamp, B=1:itemId, C=2:productName, D=3:sessionId, E=4:referrer,
    // F=5:deviceType, G=6:browser, H=7:country, I=8:userName, J=9:userEmail, K=10:userRole

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const [timestamp, id, name, , , , , , userName, userEmail, userRole] = row;
      if (!id) continue;

      const itemNum = parseInt(id, 10);
      if (isNaN(itemNum)) continue;

      // Count views
      viewCounts[itemNum] = (viewCounts[itemNum] || 0) + 1;
      productNames[itemNum] = name || `Item ${itemNum}`;
      totalViews++;

      // Time-based counts
      const viewDate = new Date(timestamp);
      if (viewDate >= todayStart) {
        todayViews++;
      }
      if (viewDate >= weekAgo) {
        weekViews++;
      }

      // Track views by user
      if (userName && userName.trim()) {
        const viewerKey = userEmail || userName;
        if (!viewerCounts[viewerKey]) {
          viewerCounts[viewerKey] = {
            name: userName,
            email: userEmail || null,
            role: userRole || 'full',
            views: 0,
            lastSeen: timestamp,
          };
        }
        viewerCounts[viewerKey].views++;
        viewerCounts[viewerKey].lastSeen = timestamp;
        loggedInViews++;
      } else {
        guestViews++;
      }

      // Track recent views (last 50) for activity feed
      if (recentViewers.length < 50) {
        recentViewers.push({
          timestamp,
          itemId: itemNum,
          productName: name,
          userName: userName || null,
          userEmail: userEmail || null,
          userRole: userRole || 'guest',
        });
      }
    }

    // If specific itemId requested
    if (itemId) {
      const id = parseInt(itemId, 10);
      return res.status(200).json({
        success: true,
        itemId: id,
        views: viewCounts[id] || 0,
        productName: productNames[id] || null,
      });
    }

    // Sort by views for top products
    const sortedProducts = Object.entries(viewCounts)
      .map(([id, count]) => ({
        itemId: parseInt(id, 10),
        productName: productNames[parseInt(id, 10)],
        views: count,
      }))
      .sort((a, b) => b.views - a.views);

    // Limit if top param specified
    const topProducts = top
      ? sortedProducts.slice(0, parseInt(top, 10))
      : sortedProducts.slice(0, 20); // Default top 20

    // Sort viewers by view count
    const topViewers = Object.values(viewerCounts)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10); // Top 10 viewers

    return res.status(200).json({
      success: true,
      views: viewCounts,
      topProducts,
      topViewers,
      recentActivity: recentViewers.reverse(), // Most recent first
      totalViews,
      todayViews,
      weekViews,
      guestViews,
      loggedInViews,
      uniqueProducts: Object.keys(viewCounts).length,
      uniqueViewers: Object.keys(viewerCounts).length,
    });
  } catch (error) {
    console.error('Error fetching view counts:', error);
    return res.status(500).json({
      error: 'Failed to fetch view counts',
      message: error.message,
    });
  }
}
