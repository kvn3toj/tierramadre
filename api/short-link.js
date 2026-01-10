/**
 * Vercel Serverless Function - Short Link Management
 *
 * Handles short link creation and resolution for guest invitations.
 * Stored in Google Sheets "InvitacionesGuest" sheet.
 *
 * Sheet Schema:
 * A=InvitationId, B=ShortCode, C=CreatorEmail, D=CreatorName, E=GuestName,
 * F=GuestContact, G=CreatedAt, H=ActivatedAt, I=ExpiresAt, J=PricingMode,
 * K=DurationHours, L=Status
 */

import { google } from 'googleapis';
import jwt from 'jsonwebtoken';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'InvitacionesGuest';

const HEADERS = [
  'InvitationId',
  'ShortCode',
  'CreatorEmail',
  'CreatorName',
  'GuestName',
  'GuestContact',
  'CreatedAt',
  'ActivatedAt',
  'ExpiresAt',
  'PricingMode',
  'DurationHours',
  'Status',
];

function getSheetsClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Generate a random short code (6 chars, alphanumeric, no confusing chars)
 */
function generateShortCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function ensureSheetExists(sheets) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetNames = metadata.data.sheets.map((s) => s.properties.title);

  if (!sheetNames.includes(SHEET_NAME)) {
    // Create sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: SHEET_NAME },
            },
          },
        ],
      },
    });

    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A1:L1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [HEADERS],
      },
    });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Google Service Account not configured',
    });
  }

  try {
    const sheets = getSheetsClient();
    await ensureSheetExists(sheets);

    // GET - Resolve short code to token
    if (req.method === 'GET') {
      const { code, id } = req.query;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:L`,
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) {
        return res.status(404).json({
          success: false,
          error: 'No invitations found',
        });
      }

      let invitation = null;

      if (code) {
        // Find by short code
        const row = rows.find((r, i) => i > 0 && r[1] === code);
        if (row) {
          invitation = {
            invitationId: row[0],
            shortCode: row[1],
            creatorEmail: row[2],
            creatorName: row[3],
            guestName: row[4] || null,
            guestContact: row[5] || null,
            createdAt: row[6],
            activatedAt: row[7] || null,
            expiresAt: row[8] || null,
            pricingMode: row[9] || 'with_prices',
            durationHours: 24, // Fixed 24-hour duration
            status: row[11] || 'pending',
          };
        }
      } else if (id) {
        // Find by invitation ID
        const row = rows.find((r, i) => i > 0 && r[0] === id);
        if (row) {
          invitation = {
            invitationId: row[0],
            shortCode: row[1],
            creatorEmail: row[2],
            creatorName: row[3],
            guestName: row[4] || null,
            guestContact: row[5] || null,
            createdAt: row[6],
            activatedAt: row[7] || null,
            expiresAt: row[8] || null,
            pricingMode: row[9] || 'with_prices',
            durationHours: 24, // Fixed 24-hour duration
            status: row[11] || 'pending',
          };
        }
      }

      if (!invitation) {
        return res.status(404).json({
          success: false,
          error: 'Invitation not found',
        });
      }

      // Check if expired
      if (invitation.status === 'expired') {
        return res.status(200).json({
          success: true,
          invitation,
          isExpired: true,
        });
      }

      return res.status(200).json({
        success: true,
        invitation,
        isExpired: false,
      });
    }

    // POST - Create new short link entry
    if (req.method === 'POST') {
      const {
        invitationId,
        token,
        creatorEmail,
        creatorName,
        pricingMode,
      } = req.body;

      if (!invitationId || !creatorEmail) {
        return res.status(400).json({
          success: false,
          error: 'invitationId and creatorEmail are required',
        });
      }

      // Generate unique short code
      let shortCode = generateShortCode();

      // Check for collisions
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!B:B`,
      });

      const existingCodes = (response.data.values || []).flat();
      let attempts = 0;
      while (existingCodes.includes(shortCode) && attempts < 10) {
        shortCode = generateShortCode();
        attempts++;
      }

      const newRow = [
        invitationId,
        shortCode,
        creatorEmail,
        creatorName || creatorEmail.split('@')[0],
        '', // GuestName - filled later
        '', // GuestContact - filled later
        new Date().toISOString(),
        '', // ActivatedAt - filled on first access
        '', // ExpiresAt - calculated on activation
        pricingMode || 'with_prices',
        24, // Fixed 24-hour duration
        'pending',
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:L`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [newRow],
        },
      });

      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://tierra-madre-studio.vercel.app';

      return res.status(200).json({
        success: true,
        shortCode,
        shortUrl: `${baseUrl}/g/${shortCode}`,
        invitationId,
      });
    }

    // PATCH - Update invitation (activation, guest info, status) or regenerate token
    if (req.method === 'PATCH') {
      const { invitationId, updates, regenerateToken } = req.body;

      if (!invitationId) {
        return res.status(400).json({
          success: false,
          error: 'invitationId is required',
        });
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:L`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === invitationId);

      if (rowIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Invitation not found',
        });
      }

      const row = rows[rowIndex];
      const invitation = {
        invitationId: row[0],
        shortCode: row[1],
        creatorEmail: row[2],
        creatorName: row[3],
        guestName: row[4] || null,
        guestContact: row[5] || null,
        createdAt: row[6],
        activatedAt: row[7] || null,
        expiresAt: row[8] || null,
        pricingMode: row[9] || 'with_prices',
        durationHours: 24, // Fixed 24-hour duration
        status: row[11] || 'pending',
      };

      // If regenerateToken is requested, create a new JWT
      if (regenerateToken) {
        if (!process.env.JWT_SECRET) {
          return res.status(500).json({
            success: false,
            error: 'JWT_SECRET not configured',
          });
        }

        // Check if invitation is expired
        if (invitation.status === 'expired') {
          return res.status(200).json({
            success: false,
            error: 'Invitation has expired',
            isExpired: true,
          });
        }

        // If already activated and expired based on time
        if (invitation.expiresAt) {
          const expiresAt = new Date(invitation.expiresAt).getTime();
          if (Date.now() > expiresAt) {
            return res.status(200).json({
              success: false,
              error: 'Invitation has expired',
              isExpired: true,
            });
          }
        }

        // Create a new token with the invitation data
        const payload = {
          id: invitation.invitationId,
          creatorEmail: invitation.creatorEmail,
          creatorName: invitation.creatorName,
          createdAt: invitation.createdAt,
          durationHours: invitation.durationHours,
          pricingMode: invitation.pricingMode,
          shortCode: invitation.shortCode,
          // Include activation info if already activated
          ...(invitation.activatedAt && {
            activatedAt: invitation.activatedAt,
            expiresAt: invitation.expiresAt,
          }),
        };

        // Sign token (7 days max lifetime for unused invitations)
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.status(200).json({
          success: true,
          token,
          invitation,
        });
      }

      // Regular update flow
      const updateBatch = [];

      // Map field names to column indices
      const columnMap = {
        guestName: 4, // E
        guestContact: 5, // F
        activatedAt: 7, // H
        expiresAt: 8, // I
        status: 11, // L
      };

      for (const [field, value] of Object.entries(updates || {})) {
        const colIndex = columnMap[field];
        if (colIndex !== undefined) {
          const colLetter = String.fromCharCode(65 + colIndex);
          updateBatch.push({
            range: `'${SHEET_NAME}'!${colLetter}${rowIndex + 1}`,
            values: [[value]],
          });
        }
      }

      if (updateBatch.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            valueInputOption: 'RAW',
            data: updateBatch,
          },
        });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in short-link:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      message: error.message,
    });
  }
}
