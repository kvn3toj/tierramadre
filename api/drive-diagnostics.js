/**
 * Drive Diagnostics API
 *
 * Consolidated diagnostic endpoint for Google Drive configuration troubleshooting.
 *
 * Endpoints:
 * - GET /api/drive-diagnostics - Check configured drive status
 * - GET /api/drive-diagnostics?folderId=X - Check specific folder
 * - GET /api/drive-diagnostics?action=check-upload - Verify upload capability
 *
 * Use this to:
 * - Verify Shared Drive configuration
 * - Check Service Account permissions
 * - Debug upload issues
 */

import {
  withApiHandler,
  sendError,
  sendSuccess,
  DRIVE_FOLDERS,
} from './_lib/index.js';

// =============================================================================
// DIAGNOSTIC FUNCTIONS
// =============================================================================

async function checkFolderInfo(drive, folderId) {
  const folderData = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, driveId, parents, mimeType, capabilities',
    supportsAllDrives: true,
  });

  const result = {
    folderId: folderData.data.id,
    folderName: folderData.data.name,
    mimeType: folderData.data.mimeType,
    parents: folderData.data.parents,
    driveId: folderData.data.driveId || null,
    isInSharedDrive: !!folderData.data.driveId,
    capabilities: folderData.data.capabilities,
  };

  // If it's in a Shared Drive, get the drive name
  if (folderData.data.driveId) {
    try {
      const driveInfo = await drive.drives.get({
        driveId: folderData.data.driveId,
        fields: 'id, name, capabilities',
      });
      result.sharedDriveName = driveInfo.data.name;
      result.sharedDriveId = driveInfo.data.id;
      result.sharedDriveCapabilities = driveInfo.data.capabilities;
      result.status = 'ok';
      result.recommendation = `Folder is in Shared Drive "${driveInfo.data.name}". Uploads should work.`;
    } catch (driveErr) {
      result.driveError = driveErr.message;
    }
  } else {
    result.status = 'warning';
    result.recommendation = 'This folder is in My Drive (personal). Using OAuth personal account for access.';
  }

  return result;
}

async function checkDriveRoot(drive, driveId) {
  const driveInfo = await drive.drives.get({
    driveId: driveId,
    fields: 'id, name, capabilities',
  });

  return {
    isSharedDriveRoot: true,
    driveId: driveInfo.data.id,
    driveName: driveInfo.data.name,
    capabilities: driveInfo.data.capabilities,
    status: 'ok',
    recommendation: 'Shared Drive root configured. Uploads should work.',
  };
}

async function checkUploadCapability(drive, parentFolderId) {
  const result = {
    parentFolderId,
    checks: [],
  };

  // Check 1: Can we access the parent folder?
  try {
    const folderData = await drive.files.get({
      fileId: parentFolderId,
      fields: 'id, name, driveId, capabilities',
      supportsAllDrives: true,
    });
    result.checks.push({
      name: 'Access Parent Folder',
      status: 'passed',
      details: `Can access folder: ${folderData.data.name}`,
    });

    // Check 2: Is it in a Shared Drive?
    if (folderData.data.driveId) {
      result.checks.push({
        name: 'Shared Drive Detection',
        status: 'passed',
        details: `Folder is in Shared Drive: ${folderData.data.driveId}`,
      });
      result.driveId = folderData.data.driveId;
    } else {
      result.checks.push({
        name: 'Shared Drive Detection',
        status: 'warning',
        details: 'Folder is NOT in a Shared Drive. Large uploads may fail.',
      });
    }

    // Check 3: Can we create folders?
    if (folderData.data.capabilities?.canAddChildren) {
      result.checks.push({
        name: 'Create Folder Permission',
        status: 'passed',
        details: 'OAuth account can create folders here',
      });
    } else {
      result.checks.push({
        name: 'Create Folder Permission',
        status: 'failed',
        details: 'OAuth account cannot create folders here',
      });
    }
  } catch (accessError) {
    result.checks.push({
      name: 'Access Parent Folder',
      status: 'failed',
      details: accessError.message,
    });
    return result;
  }

  // Check 4: Can we find/create cotizaciones folder?
  try {
    const searchParams = {
      q: `name='${DRIVE_FOLDERS.COTIZACIONES}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    };

    if (result.driveId) {
      searchParams.driveId = result.driveId;
      searchParams.corpora = 'drive';
    }

    const searchResult = await drive.files.list(searchParams);

    if (searchResult.data.files?.length > 0) {
      result.checks.push({
        name: 'Cotizaciones Folder',
        status: 'passed',
        details: `Found existing folder: ${searchResult.data.files[0].id}`,
      });
      result.cotizacionesFolderId = searchResult.data.files[0].id;
    } else {
      result.checks.push({
        name: 'Cotizaciones Folder',
        status: 'info',
        details: 'Folder does not exist yet - will be created on first upload',
      });
    }
  } catch (searchError) {
    result.checks.push({
      name: 'Cotizaciones Folder',
      status: 'warning',
      details: `Could not search for folder: ${searchError.message}`,
    });
  }

  // Summary
  const failedChecks = result.checks.filter(c => c.status === 'failed');
  const warningChecks = result.checks.filter(c => c.status === 'warning');

  if (failedChecks.length > 0) {
    result.status = 'error';
    result.recommendation = 'There are permission issues. Check OAuth account access.';
  } else if (warningChecks.length > 0) {
    result.status = 'warning';
    result.recommendation = 'Configuration may work but has potential issues.';
  } else {
    result.status = 'ok';
    result.recommendation = 'Drive configuration looks good. Uploads should work.';
  }

  return result;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default withApiHandler(async (req, res, { drive, oauthDrive, sharedDriveId }) => {
  const { folderId, action } = req.query;
  const configuredId = sharedDriveId;

  // If no specific action or folderId, show configuration status
  if (!folderId && !action) {
    if (!configuredId) {
      return sendSuccess(res, {
        status: 'error',
        configured: false,
        recommendation: 'GOOGLE_SHARED_DRIVE_ID environment variable is not set',
      });
    }

    // First try to access as Shared Drive root
    try {
      const driveResult = await checkDriveRoot(drive, configuredId);
      return sendSuccess(res, {
        ...driveResult,
        configuredId,
        configurationType: 'shared_drive_root',
      });
    } catch {
      // Not a Shared Drive root, try as folder
      const folderResult = await checkFolderInfo(drive, configuredId);
      return sendSuccess(res, {
        ...folderResult,
        configuredId,
        configurationType: 'folder',
      });
    }
  }

  // Check specific folder
  if (folderId) {
    const folderResult = await checkFolderInfo(drive, folderId);
    return sendSuccess(res, folderResult);
  }

  // Check upload capability
  if (action === 'check-upload') {
    const targetId = configuredId;
    if (!targetId) {
      return sendError(res, 400, 'No drive ID configured');
    }
    const uploadResult = await checkUploadCapability(drive, targetId);
    return sendSuccess(res, uploadResult);
  }

  return sendError(res, 400, 'Invalid action');
}, { methods: ['GET', 'OPTIONS'], provideDrive: true, provideOAuthDrive: true, errorPrefix: 'DriveDiagnostics' });
