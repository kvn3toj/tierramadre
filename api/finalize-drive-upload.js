/**
 * Vercel Serverless Function - Finalize Google Drive Upload
 *
 * Sets permissions and returns the shareable URL for the uploaded file.
 */

import { GoogleAuth } from 'google-auth-library';
import { drive_v3 } from '@googleapis/drive';

export const config = {
  api: {
    bodyParser: true,
  },
};

/**
 * Initialize Google Drive API with service account credentials
 */
function getDriveClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    return new drive_v3.Drive({ auth });
  } catch (error) {
    console.error('Error initializing Drive client:', error);
    throw new Error('Failed to initialize Google Drive client');
  }
}

/**
 * Main handler - Finalize upload and get shareable URL
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

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
      message: 'Please set up GOOGLE_SERVICE_ACCOUNT_KEY environment variable'
    });
  }

  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'fileId is required'
      });
    }

    const drive = getDriveClient();

    // Make file publicly accessible
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Return direct view URL
    const url = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return res.status(200).json({
      success: true,
      url,
      fileId,
    });

  } catch (error) {
    console.error('Finalize upload error:', error);
    return res.status(500).json({
      error: 'Failed to finalize upload',
      message: error.message
    });
  }
}
