/**
 * Vercel Serverless Function - Update Feedback (Enhanced)
 *
 * Updates feedback entries with: status, assignee, notes, tags, and related IDs.
 * Automatically calculates resolution time when status changes to resolved.
 */

import { google } from 'googleapis';

// Trim to remove any trailing whitespace/newlines from env var
const FEEDBACK_SPREADSHEET_ID = (process.env.FEEDBACK_SPREADSHEET_ID || '1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU').trim();
const FEEDBACK_SHEET_NAME = 'Feedback';

// Column indices (0-indexed, matching FEEDBACK_HEADERS in submit-feedback.js)
// 37 columns: A-AK
const COLUMN_MAP = {
  timestamp: 0,        // A
  id: 1,               // B
  priority: 9,         // J
  severity: 10,        // K
  tags: 11,            // L
  status: 23,          // X
  assignee: 24,        // Y
  resolvedAt: 25,      // Z
  resolutionTime: 26,  // AA
  notes: 27,           // AB
  relatedIds: 28,      // AC
  // Steve's Enhancements (AD-AK)
  reproductionSteps: 29,  // AD
  affectedUsers: 30,      // AE
  workaround: 31,         // AF
  linkedPR: 32,           // AG
  firstResponseAt: 33,    // AH
  firstResponseTime: 34,  // AI
  reopenCount: 35,        // AJ
  satisfactionScore: 36,  // AK
};

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
 * Convert column index to column letter (0=A, 1=B, ..., 26=AA, etc.)
 */
function columnToLetter(col) {
  let letter = '';
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
    });
  }

  try {
    const {
      id,
      status,
      assignee,
      notes,
      tags,
      priority,
      severity,
      relatedIds,
      // Steve's Enhancements
      reproductionSteps,
      affectedUsers,
      workaround,
      linkedPR,
      satisfactionScore,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        error: 'Missing feedback ID',
      });
    }

    const sheets = getSheetsClient();

    // Get all rows to find the one with matching ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      range: `${FEEDBACK_SHEET_NAME}!A:AK`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return res.status(404).json({
        error: 'Feedback not found',
      });
    }

    // Find the row with matching ID
    let targetRowIndex = -1;
    let existingRow = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][COLUMN_MAP.id] === id) {
        targetRowIndex = i;
        existingRow = rows[i];
        break;
      }
    }

    if (targetRowIndex === -1) {
      return res.status(404).json({
        error: 'Feedback not found',
        id,
      });
    }

    // Prepare updates
    const updates = [];
    const rowNum = targetRowIndex + 1; // 1-indexed for Sheets

    // Status update
    if (status) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.status)}${rowNum}`,
        values: [[status]],
      });

      // If resolving, calculate resolution time
      if ((status === 'resolved' || status === 'wontfix' || status === 'duplicate') &&
          existingRow[COLUMN_MAP.status] !== status) {
        const now = new Date();
        const createdAt = new Date(existingRow[COLUMN_MAP.timestamp]);
        const resolutionTimeHours = Math.round((now - createdAt) / (1000 * 60 * 60) * 10) / 10;

        updates.push({
          range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.resolvedAt)}${rowNum}`,
          values: [[now.toISOString()]],
        });

        updates.push({
          range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.resolutionTime)}${rowNum}`,
          values: [[String(resolutionTimeHours)]],
        });
      }

      // If reopening, clear resolution data and increment reopen count
      if (status === 'open' || status === 'in_progress') {
        const wasResolved = ['resolved', 'wontfix', 'duplicate'].includes(existingRow[COLUMN_MAP.status]);
        if (existingRow[COLUMN_MAP.resolvedAt]) {
          updates.push({
            range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.resolvedAt)}${rowNum}`,
            values: [['']],
          });
          updates.push({
            range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.resolutionTime)}${rowNum}`,
            values: [['']],
          });
        }

        // Increment reopen count if it was previously resolved
        if (wasResolved) {
          const currentReopenCount = parseInt(existingRow[COLUMN_MAP.reopenCount] || '0', 10);
          updates.push({
            range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.reopenCount)}${rowNum}`,
            values: [[String(currentReopenCount + 1)]],
          });
        }
      }
    }

    // Assignee update
    if (assignee !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.assignee)}${rowNum}`,
        values: [[assignee]],
      });

      // Track first response time when assignee is set for the first time
      if (assignee && !existingRow[COLUMN_MAP.firstResponseAt]) {
        const now = new Date();
        const createdAt = new Date(existingRow[COLUMN_MAP.timestamp]);
        const firstResponseTimeHours = Math.round((now - createdAt) / (1000 * 60 * 60) * 10) / 10;

        updates.push({
          range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.firstResponseAt)}${rowNum}`,
          values: [[now.toISOString()]],
        });

        updates.push({
          range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.firstResponseTime)}${rowNum}`,
          values: [[String(firstResponseTimeHours)]],
        });
      }
    }

    // Notes update
    if (notes !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.notes)}${rowNum}`,
        values: [[notes]],
      });
    }

    // Tags update
    if (tags !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.tags)}${rowNum}`,
        values: [[tags]],
      });
    }

    // Priority update
    if (priority !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.priority)}${rowNum}`,
        values: [[priority]],
      });
    }

    // Severity update
    if (severity !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.severity)}${rowNum}`,
        values: [[String(severity)]],
      });
    }

    // Related IDs update
    if (relatedIds !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.relatedIds)}${rowNum}`,
        values: [[relatedIds]],
      });
    }

    // Steve's Enhancements - New fields (AD-AK)

    // Reproduction steps update
    if (reproductionSteps !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.reproductionSteps)}${rowNum}`,
        values: [[reproductionSteps]],
      });
    }

    // Affected users update
    if (affectedUsers !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.affectedUsers)}${rowNum}`,
        values: [[affectedUsers]],
      });
    }

    // Workaround update
    if (workaround !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.workaround)}${rowNum}`,
        values: [[workaround]],
      });
    }

    // Linked PR update
    if (linkedPR !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.linkedPR)}${rowNum}`,
        values: [[linkedPR]],
      });
    }

    // Satisfaction score update
    if (satisfactionScore !== undefined) {
      updates.push({
        range: `${FEEDBACK_SHEET_NAME}!${columnToLetter(COLUMN_MAP.satisfactionScore)}${rowNum}`,
        values: [[String(satisfactionScore)]],
      });
    }

    // Apply updates
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: FEEDBACK_SPREADSHEET_ID,
        resource: {
          valueInputOption: 'RAW',
          data: updates,
        },
      });
    }

    const changedFields = [];
    if (status) changedFields.push(`status=${status}`);
    if (assignee !== undefined) changedFields.push(`assignee=${assignee || 'unassigned'}`);
    if (notes !== undefined) changedFields.push('notes=updated');
    if (tags !== undefined) changedFields.push('tags=updated');
    if (priority !== undefined) changedFields.push(`priority=${priority}`);
    if (severity !== undefined) changedFields.push(`severity=${severity}`);
    if (relatedIds !== undefined) changedFields.push('relatedIds=updated');
    // Steve's Enhancements
    if (reproductionSteps !== undefined) changedFields.push('reproductionSteps=updated');
    if (affectedUsers !== undefined) changedFields.push(`affectedUsers=${affectedUsers}`);
    if (workaround !== undefined) changedFields.push('workaround=updated');
    if (linkedPR !== undefined) changedFields.push('linkedPR=updated');
    if (satisfactionScore !== undefined) changedFields.push(`satisfactionScore=${satisfactionScore}`);

    console.log(`Feedback ${id} updated: ${changedFields.join(', ')}`);

    return res.status(200).json({
      success: true,
      id,
      message: 'Feedback updated successfully',
      updated: changedFields,
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return res.status(500).json({
      error: 'Failed to update feedback',
      message: error.message,
    });
  }
}
