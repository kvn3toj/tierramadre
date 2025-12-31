/**
 * Vercel Serverless Function - Get Admin Feedback (Enhanced)
 *
 * Fetches all feedback entries from Google Sheets for the admin dashboard.
 * Enhanced with: advanced filtering, sorting, pagination, and metrics.
 */

import { google } from 'googleapis';

// Same sheet as submit-feedback
const FEEDBACK_SPREADSHEET_ID = process.env.FEEDBACK_SPREADSHEET_ID || '1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU';
const FEEDBACK_SHEET_NAME = 'Feedback';
const DASHBOARD_SHEET_NAME = 'Dashboard';

/**
 * Initialize Google Sheets API with service account credentials
 */
function getSheetsClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if service account key is configured
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
      message: 'Please set up GOOGLE_SERVICE_ACCOUNT_KEY environment variable',
    });
  }

  try {
    const {
      status,
      category,
      priority,
      feature,
      assignee,
      search,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      page = '1',
      limit = '50',
      includeScreenshots = 'false',
      includeMetrics = 'false',
    } = req.query;

    const sheets = getSheetsClient();

    // Try to get data from the feedback sheet (expanded range for new columns)
    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId: FEEDBACK_SPREADSHEET_ID,
        range: `${FEEDBACK_SHEET_NAME}!A:AC`,
      });
    } catch (error) {
      // Sheet might not exist yet
      if (error.message.includes('Unable to parse range')) {
        return res.status(200).json({
          success: true,
          data: [],
          metrics: includeMetrics === 'true' ? getEmptyMetrics() : undefined,
          message: 'No feedback yet',
        });
      }
      throw error;
    }

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return res.status(200).json({
        success: true,
        data: [],
        metrics: includeMetrics === 'true' ? getEmptyMetrics() : undefined,
        message: 'No feedback yet',
      });
    }

    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Map rows to objects
    let feedbackItems = dataRows.map((row, rowIndex) => {
      const item = { _rowIndex: rowIndex + 2 }; // +2 for 1-indexed and header row
      headers.forEach((header, index) => {
        item[header] = row[index] || '';
      });

      // Parse highlightBox JSON if present
      if (item.highlightBox) {
        try {
          item.highlightBox = JSON.parse(item.highlightBox);
        } catch {
          item.highlightBox = null;
        }
      }

      // Convert severity to number
      if (item.severity) {
        item.severity = parseInt(item.severity, 10) || 3;
      }

      // Optionally exclude screenshots to reduce payload
      if (includeScreenshots !== 'true') {
        item.hasScreenshot = !!item.screenshot && item.screenshot !== '';
        item.screenshot = item.hasScreenshot ? '[BASE64_OMITTED]' : '';
      }

      // Calculate age in hours for open items
      if (item.timestamp && item.status === 'open') {
        const created = new Date(item.timestamp);
        const now = new Date();
        item.ageHours = Math.round((now - created) / (1000 * 60 * 60));
      }

      return item;
    });

    // Calculate metrics before filtering (if requested)
    let metrics;
    if (includeMetrics === 'true') {
      metrics = calculateMetrics(feedbackItems);
    }

    // Apply filters
    if (status && status !== 'all') {
      feedbackItems = feedbackItems.filter((item) => item.status === status);
    }
    if (category && category !== 'all') {
      feedbackItems = feedbackItems.filter((item) => item.category === category);
    }
    if (priority && priority !== 'all') {
      feedbackItems = feedbackItems.filter((item) => item.priority === priority);
    }
    if (feature && feature !== 'all') {
      feedbackItems = feedbackItems.filter((item) => item.feature === feature);
    }
    if (assignee && assignee !== 'all') {
      feedbackItems = feedbackItems.filter((item) => item.assignee === assignee);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      feedbackItems = feedbackItems.filter((item) =>
        item.title?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.id?.toLowerCase().includes(searchLower) ||
        item.tags?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    const sortField = sortBy;
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    feedbackItems.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle date sorting
      if (sortField === 'timestamp' || sortField === 'resolvedAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      // Handle numeric sorting
      else if (sortField === 'severity' || sortField === 'ageHours') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }
      // Handle priority sorting (custom order)
      else if (sortField === 'priority') {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        aVal = priorityOrder[aVal] || 0;
        bVal = priorityOrder[bVal] || 0;
      }

      if (aVal < bVal) return -sortDir;
      if (aVal > bVal) return sortDir;
      return 0;
    });

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const startIndex = (pageNum - 1) * limitNum;
    const totalBeforePagination = feedbackItems.length;
    const paginatedItems = feedbackItems.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      data: paginatedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalBeforePagination,
        totalPages: Math.ceil(totalBeforePagination / limitNum),
        hasMore: startIndex + limitNum < totalBeforePagination,
      },
      metrics,
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return res.status(500).json({
      error: 'Failed to fetch feedback',
      message: error.message,
    });
  }
}

/**
 * Calculate metrics from feedback data
 */
function calculateMetrics(items) {
  const total = items.length;

  // Status counts
  const byStatus = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    wontfix: 0,
    duplicate: 0,
  };

  // Priority counts
  const byPriority = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  // Category counts
  const byCategory = {};

  // Feature counts
  const byFeature = {};

  // Device counts
  const byDevice = {
    mobile: 0,
    tablet: 0,
    desktop: 0,
    unknown: 0,
  };

  // Resolution times (for resolved items)
  const resolutionTimes = [];

  // Process each item
  items.forEach((item) => {
    // Status
    if (byStatus[item.status] !== undefined) {
      byStatus[item.status]++;
    }

    // Priority
    if (byPriority[item.priority] !== undefined) {
      byPriority[item.priority]++;
    }

    // Category
    if (item.category) {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    }

    // Feature
    if (item.feature) {
      byFeature[item.feature] = (byFeature[item.feature] || 0) + 1;
    }

    // Device
    const device = item.deviceType || 'unknown';
    byDevice[device] = (byDevice[device] || 0) + 1;

    // Resolution time
    if (item.resolutionTime && !isNaN(parseFloat(item.resolutionTime))) {
      resolutionTimes.push(parseFloat(item.resolutionTime));
    }
  });

  // Calculate averages
  const avgResolutionTime = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : null;

  // Find oldest open item
  const openItems = items.filter((i) => i.status === 'open');
  const oldestOpen = openItems.length > 0
    ? openItems.reduce((oldest, current) =>
        new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest
      )
    : null;

  // This week's count
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeek = items.filter((i) => new Date(i.timestamp) >= oneWeekAgo).length;

  return {
    total,
    thisWeek,
    byStatus,
    byPriority,
    byCategory,
    byFeature,
    byDevice,
    avgResolutionTimeHours: avgResolutionTime ? Math.round(avgResolutionTime * 10) / 10 : null,
    oldestOpenId: oldestOpen?.id || null,
    oldestOpenTimestamp: oldestOpen?.timestamp || null,
  };
}

/**
 * Return empty metrics structure
 */
function getEmptyMetrics() {
  return {
    total: 0,
    thisWeek: 0,
    byStatus: { open: 0, in_progress: 0, resolved: 0, wontfix: 0, duplicate: 0 },
    byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
    byCategory: {},
    byFeature: {},
    byDevice: { mobile: 0, tablet: 0, desktop: 0, unknown: 0 },
    avgResolutionTimeHours: null,
    oldestOpenId: null,
    oldestOpenTimestamp: null,
  };
}
