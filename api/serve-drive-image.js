/**
 * Vercel Serverless Function - Serve Image from Google Drive
 *
 * This endpoint proxies images from Google Drive through the service account,
 * allowing access to files without requiring public sharing.
 */

import { google } from 'googleapis';

/**
 * Initialize Google Drive API with service account credentials
 */
function getDriveClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('Error initializing Drive client:', error);
    throw new Error('Failed to initialize Google Drive client');
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

  // Check required environment variables
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
    });
  }

  try {
    const { fileId, thumbnail } = req.query;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const drive = getDriveClient();

    // Get file metadata first
    const metadataResponse = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,size',
      supportsAllDrives: true,
    });

    const { mimeType, name } = metadataResponse.data;

    // For thumbnail requests, get the thumbnail
    if (thumbnail === 'true') {
      const thumbResponse = await drive.files.get({
        fileId,
        fields: 'thumbnailLink',
        supportsAllDrives: true,
      });

      if (thumbResponse.data.thumbnailLink) {
        // Redirect to thumbnail
        return res.redirect(302, thumbResponse.data.thumbnailLink);
      }
    }

    // Download the file
    const response = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data);

    // Set appropriate headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Content-Disposition', `inline; filename="${name}"`);

    return res.status(200).send(buffer);

  } catch (error) {
    console.error('Error serving Drive image:', error);

    if (error.code === 404) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file was not found or is not accessible',
      });
    }

    if (error.code === 403) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'The service account does not have permission to access this file',
      });
    }

    return res.status(500).json({
      error: 'Failed to serve image',
      message: error.message,
    });
  }
}
