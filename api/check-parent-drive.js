/**
 * Diagnostic script to find parent Shared Drive of a folder
 */
import { getDriveClient } from './_lib/google-clients.js';

const FOLDER_ID = '1kQqmNyk8wiN4VWSaKgg-2crTXz-2BFpB';

async function checkParentDrive() {
  const drive = getDriveClient(true);

  try {
    const folderData = await drive.files.get({
      fileId: FOLDER_ID,
      fields: 'id, name, driveId, parents',
      supportsAllDrives: true,
    });

    console.log('Folder Info:', JSON.stringify(folderData.data, null, 2));

    if (folderData.data.driveId) {
      console.log('\n✅ FOUND! This folder is in a Shared Drive!');
      console.log('Shared Drive ID:', folderData.data.driveId);
      console.log('\nUpdate your .env file:');
      console.log(`GOOGLE_SHARED_DRIVE_ID=${folderData.data.driveId}`);

      // Get Shared Drive name
      const driveInfo = await drive.drives.get({
        driveId: folderData.data.driveId,
        fields: 'id, name',
      });
      console.log(`Shared Drive Name: ${driveInfo.data.name}`);
    } else {
      console.log('\n❌ This folder is in My Drive (personal), not a Shared Drive');
      console.log('Service Accounts CANNOT upload to My Drive folders.');
      console.log('\nYou must:');
      console.log('1. Create a Shared Drive in Google Drive');
      console.log('2. Move this folder into the Shared Drive');
      console.log('3. Share the Shared Drive with your Service Account');
      console.log('4. Update GOOGLE_SHARED_DRIVE_ID to the Shared Drive ID');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkParentDrive();
