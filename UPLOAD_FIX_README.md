# Upload Fix for Service Account Quota Issue

## The Problem
Service Accounts have **0 storage quota** by design. When they try to upload files to regular Google Drive folders (even shared ones), Google rejects the upload with:

```
Upload failed: Service Accounts do not have storage quota
```

## Why Folder Creation Works But File Upload Doesn't
- **Creating folders**: Uses 0 bytes, works fine
- **Uploading files**: Consumes quota, FAILS for Service Accounts in personal Drive

## The Solution

You have **2 options**:

### Option 1: Move TM-Studio to a Shared Drive (Recommended) ✅

1. **Create a Shared Drive**:
   - Go to https://drive.google.com
   - Click "Shared drives" → "+ New"
   - Name it "Tierra Madre"

2. **Move your TM-Studio folder**:
   - Drag `TM-Studio` folder into the Shared Drive

3. **Share with Service Account**:
   - Open Shared Drive → ⚙️ → "Manage members"
   - Add your Service Account email: `<check Google Cloud Console>`
   - Give "Content Manager" permissions

4. **Update .env**:
   - Get Shared Drive ID from URL: `https://drive.google.com/drive/folders/XXXXX`
   - Update: `GOOGLE_SHARED_DRIVE_ID=XXXXX`
   - Also update in Vercel environment variables

### Option 2: Check if TM-Studio is Already in a Shared Drive

Run this test API after deployment:
```bash
curl "https://tierra-madre-studio.vercel.app/api/find-shared-drive?folderId=1kQqmNyk8wiN4VWSaKgg-2crTXz-2BFpB"
```

If response shows `"isInSharedDrive": true`, then:
- Copy the `"sharedDriveId"` value
- Update `.env`: `GOOGLE_SHARED_DRIVE_ID=<that-value>`
- Update Vercel environment variables
- Redeploy

## How to Find Your Service Account Email

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "IAM & Admin" → "Service Accounts"
3. Find your service account
4. Email format: `<name>@<project-id>.iam.gserviceaccount.com`

## Testing After Fix

1. Wait for Vercel deployment to complete
2. Try uploading the 1.6MB video again
3. Check browser console for detailed logs
4. If it still fails, run the diagnostic API call above

## Why This Happens

Google Drive has three contexts:
1. **My Drive** (personal) - Service Accounts have 0 quota here ❌
2. **Shared with me** - Still counts against Service Account quota ❌
3. **Shared Drives** - No quota limits, files belong to the drive ✅

The only way Service Accounts can upload files is to **Shared Drives** (option 3).
