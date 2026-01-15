/**
 * Enhanced diagnostic endpoint to find parent Shared Drive
 * GET /api/find-shared-drive
 */
import { getDriveClient, getSharedDriveId, isGoogleConfigured, sendError, sendSuccess, initApi } from './_lib/google-clients.js';

export default async function handler(req, res) {
  initApi(req, res);

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  const folderId = req.query.folderId || getSharedDriveId();
  if (!folderId) {
    return sendError(res, 400, 'No folder ID provided');
  }

  const drive = getDriveClient(true);

  try {
    // Get folder details including driveId
    const folderData = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, driveId, parents, mimeType',
      supportsAllDrives: true,
    });

    const result = {
      folderId: folderData.data.id,
      folderName: folderData.data.name,
      mimeType: folderData.data.mimeType,
      parents: folderData.data.parents,
      driveId: folderData.data.driveId || null,
      isInSharedDrive: !!folderData.data.driveId,
    };

    // If it's in a Shared Drive, get the drive name
    if (folderData.data.driveId) {
      try {
        const driveInfo = await drive.drives.get({
          driveId: folderData.data.driveId,
          fields: 'id, name',
        });
        result.sharedDriveName = driveInfo.data.name;
        result.sharedDriveId = driveInfo.data.id;
        result.recommendation = `✅ This folder is in a Shared Drive! Update your .env:\nGOOGLE_SHARED_DRIVE_ID=${driveInfo.data.id}`;
      } catch (driveErr) {
        result.driveError = driveErr.message;
      }
    } else {
      result.recommendation = '❌ This folder is in My Drive (personal). Service Accounts cannot upload here. You must move it to a Shared Drive.';
    }

    return sendSuccess(res, result);
  } catch (error) {
    console.error('Find Shared Drive error:', error);
    return sendError(res, 500, 'Failed to check folder', error.message);
  }
}
