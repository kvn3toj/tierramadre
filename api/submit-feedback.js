/**
 * Vercel Serverless Function - Submit Admin Feedback
 *
 * Receives feedback from admins and stores in a dedicated Google Sheet.
 * Supports screenshot (base64), annotations, and metadata.
 */

import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

// Dedicated Feedback Sheet - SEPARATE from inventory to avoid overload
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
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

/**
 * Ensure the Feedback sheet exists, create if not
 */
async function ensureFeedbackSheet(sheets) {
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    });

    const feedbackSheet = metadata.data.sheets.find(
      (s) => s.properties.title === FEEDBACK_SHEET_NAME
    );

    if (!feedbackSheet) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: FEEDBACK_SPREADSHEET_ID,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: FEEDBACK_SHEET_NAME,
                },
              },
            },
          ],
        },
      });

      // Add headers
      const headers = [
        'timestamp',
        'id',
        'page',
        'component',
        'category',
        'priority',
        'description',
        'screenshot',
        'highlightBox',
        'adminEmail',
        'adminName',
        'status',
        'resolvedAt',
        'notes',
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: FEEDBACK_SPREADSHEET_ID,
        range: `${FEEDBACK_SHEET_NAME}!A1:N1`,
        valueInputOption: 'RAW',
        resource: {
          values: [headers],
        },
      });

      console.log('Created Feedback sheet with headers');
    }
  } catch (error) {
    console.error('Error ensuring feedback sheet:', error);
    throw error;
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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
      page,
      component = 'general',
      category,
      priority = 'medium',
      description,
      screenshot,
      highlightBox,
      adminEmail,
      adminName,
    } = req.body;

    // Validate required fields
    if (!page || !category || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'page, category, and description are required',
      });
    }

    const sheets = getSheetsClient();

    // Ensure the feedback sheet exists
    await ensureFeedbackSheet(sheets);

    // Generate unique ID
    const feedbackId = `TM-${uuidv4().slice(0, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    // Prepare row data
    const rowData = [
      timestamp,
      feedbackId,
      page,
      component,
      category,
      priority,
      description,
      screenshot || '', // Base64 screenshot (can be large)
      highlightBox ? JSON.stringify(highlightBox) : '',
      adminEmail || 'unknown',
      adminName || 'Admin',
      'open', // Initial status
      '', // resolvedAt (empty)
      '', // notes (empty)
    ];

    // Append the row
    await sheets.spreadsheets.values.append({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      range: `${FEEDBACK_SHEET_NAME}!A:N`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData],
      },
    });

    console.log(`Feedback ${feedbackId} submitted by ${adminEmail}`);

    return res.status(200).json({
      success: true,
      id: feedbackId,
      message: `Feedback ${feedbackId} submitted successfully`,
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({
      error: 'Failed to submit feedback',
      message: error.message,
    });
  }
}
