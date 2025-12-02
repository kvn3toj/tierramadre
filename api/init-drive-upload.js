/**
 * Vercel Serverless Function - Initialize Direct Google Drive Upload
 *
 * Returns a resumable upload URL that the client can use to upload
 * directly to Google Drive, bypassing Vercel's 4.5MB limit.
 */

import { google } from 'googleapis';

export const config = {
  api: {
    bodyParser: true,
  },
};

/**
 * Initialize Google Drive API with service account credentials
 */
async function getDriveClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    // Get the auth client and access token
    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();

    return {
      drive: google.drive({ version: 'v3', auth }),
      accessToken: accessToken.token
    };
  } catch (error) {
    console.error('Error initializing Drive client:', error);
    throw new Error('Failed to initialize Google Drive client');
  }
}

/**
 * Get or create Tierra Madre Inventory folder in Shared Drive
 */
async function getOrCreateFolder(drive) {
  const folderName = 'Tierra Madre Inventory';
  const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID;

  // Search in Shared Drive if configured, otherwise in My Drive
  const query = sharedDriveId
    ? `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${sharedDriveId}' in parents`
    : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (response.data.files.length > 0) {
    return { folderId: response.data.files[0].id, sharedDriveId };
  }

  // Create folder
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    ...(sharedDriveId && { parents: [sharedDriveId] }),
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: 'id',
    supportsAllDrives: true,
  });

  // Only set permissions if not in Shared Drive (Shared Drive has its own permissions)
  if (!sharedDriveId) {
    await drive.permissions.create({
      fileId: folder.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  }

  return { folderId: folder.data.id, sharedDriveId };
}

/**
 * Main handler - Initialize resumable upload
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
    const { fileName, mimeType, itemNumber, fileSize } = req.body;

    if (!fileName || !mimeType || !itemNumber) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'fileName, mimeType, and itemNumber are required'
      });
    }

    const { drive, accessToken } = await getDriveClient();
    const { folderId, sharedDriveId } = await getOrCreateFolder(drive);

    // Generate unique filename
    const ext = fileName.split('.').pop() || 'bin';
    const uniqueFileName = `product-${itemNumber}-${Date.now()}.${ext}`;

    // Create file metadata
    const fileMetadata = {
      name: uniqueFileName,
      parents: [folderId],
    };

    // Build upload URL with shared drive support
    let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
    if (sharedDriveId) {
      uploadUrl += '&supportsAllDrives=true';
    }

    // Initialize resumable upload session
    const initResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': fileSize?.toString() || '',
        },
        body: JSON.stringify(fileMetadata),
      }
    );

    if (!initResponse.ok) {
      const error = await initResponse.text();
      throw new Error(`Failed to initialize upload: ${error}`);
    }

    // Get the resumable upload URL
    const uploadUrl = initResponse.headers.get('Location');

    if (!uploadUrl) {
      throw new Error('No upload URL received from Google Drive');
    }

    return res.status(200).json({
      success: true,
      uploadUrl,
      fileName: uniqueFileName,
      accessToken: accessToken.token,
    });

  } catch (error) {
    console.error('Init upload error:', error);
    return res.status(500).json({
      error: 'Failed to initialize upload',
      message: error.message
    });
  }
}
