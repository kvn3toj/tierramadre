/**
 * Vercel Serverless Function - Get Admin Feedback
 *
 * Fetches all feedback entries from Google Sheets for the admin dashboard.
 * Supports filtering by status.
 */

import { google } from 'googleapis';

// Same sheet as submit-feedback
const FEEDBACK_SPREADSHEET_ID = process.env.FEEDBACK_SPREADSHEET_ID || '1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU';
const FEEDBACK_SHEET_NAME = 'Feedback';

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
    const { status, includeScreenshots = 'false' } = req.query;

    const sheets = getSheetsClient();

    // Try to get data from the feedback sheet
    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId: FEEDBACK_SPREADSHEET_ID,
        range: `${FEEDBACK_SHEET_NAME}!A:N`,
      });
    } catch (error) {
      // Sheet might not exist yet
      if (error.message.includes('Unable to parse range')) {
        return res.status(200).json({
          success: true,
          data: [],
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
        message: 'No feedback yet',
      });
    }

    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Map rows to objects
    let feedbackItems = dataRows.map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        // Convert camelCase for frontend
        const key = header === 'highlightBox' ? 'highlightBox' : header;
        item[key] = row[index] || '';
      });

      // Parse highlightBox JSON if present
      if (item.highlightBox) {
        try {
          item.highlightBox = JSON.parse(item.highlightBox);
        } catch {
          item.highlightBox = null;
        }
      }

      // Optionally exclude screenshots to reduce payload
      if (includeScreenshots !== 'true') {
        item.hasScreenshot = !!item.screenshot;
        item.screenshot = item.screenshot ? '[BASE64_OMITTED]' : '';
      }

      return item;
    });

    // Filter by status if provided
    if (status && status !== 'all') {
      feedbackItems = feedbackItems.filter((item) => item.status === status);
    }

    // Sort by timestamp (newest first)
    feedbackItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      success: true,
      data: feedbackItems,
      total: feedbackItems.length,
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return res.status(500).json({
      error: 'Failed to fetch feedback',
      message: error.message,
    });
  }
}
