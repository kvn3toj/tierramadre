/**
 * Vercel Serverless Function - Check specific Google Drive folder contents
 */

import { google } from 'googleapis';

function getDriveClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const drive = getDriveClient();
    const folderId = req.query.folderId || process.env.GOOGLE_SHARED_DRIVE_ID;

    const files = [];
    let pageToken = null;

    do {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime)',
        pageSize: 100,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (response.data.files) {
        files.push(...response.data.files);
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    // Also get folder metadata to check if it's in a Shared Drive
    let folderInfo = null;
    try {
      const folderMeta = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, driveId, parents',
        supportsAllDrives: true,
      });
      folderInfo = folderMeta.data;
    } catch (e) {
      folderInfo = { error: e.message };
    }

    return res.status(200).json({
      success: true,
      folderId,
      folderInfo,
      isInSharedDrive: !!folderInfo?.driveId,
      sharedDriveId: folderInfo?.driveId || null,
      totalFiles: files.length,
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
        mimeType: f.mimeType,
        size: f.size,
      })),
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Failed to list folder',
      message: error.message,
    });
  }
}
