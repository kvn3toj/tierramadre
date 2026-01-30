#!/usr/bin/env node
/**
 * Transfer Google Drive Folder Ownership
 *
 * Transfers ownership of folders from the service account to a specified user.
 *
 * Usage:
 *   node scripts/transfer-folder-ownership.mjs
 *
 * Required env vars:
 *   - GOOGLE_SERVICE_ACCOUNT_KEY (base64 encoded)
 *   - GOOGLE_SHARED_DRIVE_ID
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { GoogleAuth } from 'google-auth-library';
import { drive_v3 } from '@googleapis/drive';

// Load from .env.vercel if exists (pulled from Vercel)
config({ path: '.env.vercel' });

// ============================================
// CONFIGURATION
// ============================================
const NEW_OWNER_EMAIL = 'tierramadre.co@gmail.com';
const FOLDERS_TO_TRANSFER = ['products', 'cotizaciones'];

// ============================================
// AUTH SETUP (same pattern as api/_lib)
// ============================================
function getCredentials() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable not configured');
  }

  try {
    const cleanKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/[\s"]+/g, '');
    return JSON.parse(Buffer.from(cleanKey, 'base64').toString());
  } catch (error) {
    console.error('Error parsing Google credentials:', error);
    throw new Error('Failed to parse Google Service Account credentials');
  }
}

function getDriveClient() {
  const credentials = getCredentials();

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  return new drive_v3.Drive({ auth });
}

// ============================================
// MAIN FUNCTIONS
// ============================================

async function listFoldersInDrive(drive, parentFolderId) {
  console.log('\n📂 Listing folders in parent folder...\n');

  // First, try as a regular folder (not a Shared Drive)
  try {
    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, owners)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    return response.data.files || [];
  } catch (error) {
    console.log(`   First attempt failed: ${error.message}`);

    // Try as Shared Drive
    try {
      const response = await drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, owners)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        driveId: parentFolderId
      });
      return response.data.files || [];
    } catch (innerError) {
      throw new Error(`Could not list folders: ${innerError.message}`);
    }
  }
}

async function getFilePermissions(drive, fileId) {
  try {
    const response = await drive.permissions.list({
      fileId,
      supportsAllDrives: true,
      fields: 'permissions(id, emailAddress, role, type)'
    });
    return response.data.permissions || [];
  } catch (error) {
    console.log(`   ⚠️ Could not get permissions: ${error.message}`);
    return [];
  }
}

async function transferOwnership(drive, fileId, fileName, newOwnerEmail) {
  console.log(`\n🔄 Transferring "${fileName}" to ${newOwnerEmail}...`);

  try {
    // First, check current permissions
    const permissions = await getFilePermissions(drive, fileId);
    console.log(`   Current permissions: ${permissions.length}`);
    permissions.forEach(p => {
      console.log(`      - ${p.emailAddress || p.type}: ${p.role}`);
    });

    // Check if new owner already has access
    const existingPermission = permissions.find(p =>
      p.emailAddress?.toLowerCase() === newOwnerEmail.toLowerCase()
    );

    if (existingPermission) {
      console.log(`   📌 ${newOwnerEmail} already has "${existingPermission.role}" access`);

      if (existingPermission.role === 'owner') {
        console.log(`   ✅ Already the owner - no transfer needed`);
        return { success: true, message: 'Already owner' };
      }
    }

    // Try to transfer ownership (works for regular folders, not Shared Drives)
    console.log(`   📤 Attempting ownership transfer...`);

    await drive.permissions.create({
      fileId,
      transferOwnership: true,
      supportsAllDrives: true,
      sendNotificationEmail: true,
      requestBody: {
        type: 'user',
        role: 'owner',
        emailAddress: newOwnerEmail
      }
    });

    console.log(`   ✅ Ownership transferred to ${newOwnerEmail}`);
    return { success: true, message: 'Ownership transferred' };

  } catch (error) {
    console.log(`   ⚠️ Transfer error: ${error.message}`);

    // Handle "consent required" - need to send pending owner request
    if (error.message?.includes('Consent is required')) {
      console.log(`\n   📧 CONSENT REQUIRED - Sending pending ownership request...`);

      try {
        // Create a pendingOwner permission (user must accept)
        await drive.permissions.create({
          fileId,
          supportsAllDrives: true,
          sendNotificationEmail: true,
          requestBody: {
            type: 'user',
            role: 'owner',
            emailAddress: newOwnerEmail,
            pendingOwner: true
          }
        });
        console.log(`   ✅ Pending ownership request sent!`);
        console.log(`   📬 ${newOwnerEmail} must check their email and ACCEPT the transfer`);
        return { success: true, message: 'Pending ownership request sent - check email to accept' };
      } catch (pendingError) {
        console.log(`   ⚠️ Pending request error: ${pendingError.message}`);
        return { success: false, message: `Consent required. User must accept transfer in Google Drive UI. Current status: writer access.` };
      }
    }

    // If ownership transfer fails, try adding as writer
    if (error.message?.includes('Shared drives') ||
        error.message?.includes('teamDrive') ||
        error.message?.includes('not supported')) {
      console.log(`   ℹ️  Shared Drive detected - adding as writer instead`);

      try {
        await drive.permissions.create({
          fileId,
          supportsAllDrives: true,
          sendNotificationEmail: true,
          requestBody: {
            type: 'user',
            role: 'writer',
            emailAddress: newOwnerEmail
          }
        });
        console.log(`   ✅ Added ${newOwnerEmail} as writer`);
        return { success: true, message: 'Writer permission granted (Shared Drive)' };
      } catch (innerError) {
        if (innerError.message?.includes('already')) {
          console.log(`   ✅ ${newOwnerEmail} already has access`);
          return { success: true, message: 'Already has access' };
        }
        throw innerError;
      }
    }

    return { success: false, message: error.message };
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔑 Google Drive Folder Ownership Transfer');
  console.log('═'.repeat(60));
  console.log(`\n📧 Target owner: ${NEW_OWNER_EMAIL}`);
  console.log(`📁 Folders to transfer: ${FOLDERS_TO_TRANSFER.join(', ')}`);

  const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID;
  if (!sharedDriveId) {
    console.error('\n❌ GOOGLE_SHARED_DRIVE_ID not set');
    process.exit(1);
  }
  console.log(`🗂️  Shared Drive ID: ${sharedDriveId}`);

  const drive = getDriveClient();

  // Get service account email for reference
  const credentials = getCredentials();
  console.log(`🤖 Service Account: ${credentials.client_email}`);

  // List all folders
  const folders = await listFoldersInDrive(drive, sharedDriveId);

  if (folders.length === 0) {
    console.log('⚠️  No folders found in Shared Drive');
    process.exit(0);
  }

  console.log('Found folders:');
  folders.forEach(f => {
    const marker = FOLDERS_TO_TRANSFER.includes(f.name) ? '  ➡️ ' : '     ';
    console.log(`${marker}${f.name} (${f.id})`);
  });

  // Transfer specified folders
  const results = [];

  for (const folderName of FOLDERS_TO_TRANSFER) {
    const folder = folders.find(f => f.name === folderName);

    if (!folder) {
      console.log(`\n⚠️  Folder "${folderName}" not found`);
      results.push({ folder: folderName, success: false, message: 'Not found' });
      continue;
    }

    const result = await transferOwnership(drive, folder.id, folder.name, NEW_OWNER_EMAIL);
    results.push({ folder: folderName, ...result });
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));

  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.folder}: ${r.message}`);
  });

  console.log('\n💡 Note: In Shared Drives, "ownership" works differently.');
  console.log('   Files are owned by the Drive itself, not individual users.');
  console.log('   The important thing is having the right access level.\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
