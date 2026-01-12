/**
 * Vercel Serverless Function - Get Detailed Product View Analytics
 *
 * Returns detailed view analytics for a specific product, including:
 * - List of all viewers (who viewed this product)
 * - View breakdown by device, browser, country
 * - Views by date for trend analysis
 * - Recent view activity for this product
 *
 * Query params:
 * - itemId: (required) the product item number
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
  // Cache for 2 minutes (shorter than general stats since this is more specific)
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { itemId } = req.query;

  if (!itemId) {
    return res.status(400).json({
      error: 'Missing required parameter: itemId',
    });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
    });
  }

  try {
    const targetItemId = parseInt(itemId, 10);
    if (isNaN(targetItemId)) {
      return res.status(400).json({ error: 'Invalid itemId' });
    }

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
        itemId: targetItemId,
        productName: null,
        totalViews: 0,
        viewers: [],
        viewsByDate: [],
        viewsByDevice: {},
        viewsByBrowser: {},
        viewsByCountry: {},
        recentViews: [],
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
        itemId: targetItemId,
        productName: null,
        totalViews: 0,
        viewers: [],
        viewsByDate: [],
        viewsByDevice: {},
        viewsByBrowser: {},
        viewsByCountry: {},
        recentViews: [],
      });
    }

    // Column indices (0-based):
    // A=0:timestamp, B=1:itemId, C=2:productName, D=3:sessionId, E=4:referrer,
    // F=5:deviceType, G=6:browser, H=7:country, I=8:userName, J=9:userEmail, K=10:userRole

    let productName = null;
    const viewerMap = {}; // Track unique viewers
    const viewsByDate = {}; // Group by date
    const viewsByDevice = {}; // mobile, tablet, desktop
    const viewsByBrowser = {};
    const viewsByCountry = {};
    const recentViews = []; // All views for this product
    let totalViews = 0;

    // Process rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const [timestamp, id, name, sessionId, referrer, deviceType, browser, country, userName, userEmail, userRole] = row;

      const rowItemId = parseInt(id, 10);
      if (rowItemId !== targetItemId) continue;

      // This row is for our target product
      totalViews++;
      if (name && !productName) {
        productName = name;
      }

      // Track viewer
      const viewerKey = userEmail || userName || sessionId || `guest-${i}`;
      const viewerName = userName || 'Guest';
      const isLoggedIn = !!userName;

      if (!viewerMap[viewerKey]) {
        viewerMap[viewerKey] = {
          name: viewerName,
          email: userEmail || null,
          role: userRole || 'guest',
          isLoggedIn,
          views: 0,
          firstView: timestamp,
          lastView: timestamp,
          devices: new Set(),
          browsers: new Set(),
          countries: new Set(),
        };
      }
      viewerMap[viewerKey].views++;
      viewerMap[viewerKey].lastView = timestamp;
      if (deviceType) viewerMap[viewerKey].devices.add(deviceType);
      if (browser) viewerMap[viewerKey].browsers.add(browser);
      if (country) viewerMap[viewerKey].countries.add(country);

      // Group by date
      const viewDate = new Date(timestamp);
      const dateKey = viewDate.toISOString().split('T')[0]; // YYYY-MM-DD
      viewsByDate[dateKey] = (viewsByDate[dateKey] || 0) + 1;

      // Breakdown by device type
      const device = deviceType || 'unknown';
      viewsByDevice[device] = (viewsByDevice[device] || 0) + 1;

      // Breakdown by browser
      const browserName = browser || 'unknown';
      viewsByBrowser[browserName] = (viewsByBrowser[browserName] || 0) + 1;

      // Breakdown by country
      const countryName = country || 'unknown';
      viewsByCountry[countryName] = (viewsByCountry[countryName] || 0) + 1;

      // Recent views list
      recentViews.push({
        timestamp,
        userName: viewerName,
        userEmail: userEmail || null,
        userRole: userRole || 'guest',
        isLoggedIn,
        deviceType: device,
        browser: browserName,
        country: countryName,
        referrer: referrer || null,
      });
    }

    // Convert viewers map to array, sort by views
    const viewers = Object.values(viewerMap)
      .map((v) => ({
        ...v,
        devices: Array.from(v.devices),
        browsers: Array.from(v.browsers),
        countries: Array.from(v.countries),
      }))
      .sort((a, b) => b.views - a.views);

    // Convert viewsByDate to sorted array
    const viewsByDateArray = Object.entries(viewsByDate)
      .map(([date, count]) => ({ date, views: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Sort recent views by timestamp (most recent first)
    recentViews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      success: true,
      itemId: targetItemId,
      productName,
      totalViews,
      uniqueViewers: viewers.length,
      loggedInViewers: viewers.filter((v) => v.isLoggedIn).length,
      guestViewers: viewers.filter((v) => !v.isLoggedIn).length,
      viewers,
      viewsByDate: viewsByDateArray,
      viewsByDevice,
      viewsByBrowser,
      viewsByCountry,
      recentViews: recentViews.slice(0, 50), // Limit to 50 most recent
    });
  } catch (error) {
    console.error('Error fetching product detail views:', error);
    return res.status(500).json({
      error: 'Failed to fetch product detail views',
      message: error.message,
    });
  }
}
