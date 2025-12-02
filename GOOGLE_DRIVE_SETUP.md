# Google Drive Integration Setup Guide

This guide will help you set up Google Drive integration for the Tierra Madre inventory system using the account **Comercial.aretrust@gmail.com**.

## Overview
Files uploaded in the inventory product pages will be stored in Google Drive and displayed to all users via public URLs.

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with **Comercial.aretrust@gmail.com**
3. Click "Select a project" → "NEW PROJECT"
4. Enter project details:
   - **Project name**: `Tierra Madre Inventory`
   - **Organization**: (leave as default)
5. Click "CREATE"

---

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click on **Google Drive API**
4. Click **ENABLE**

---

## Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **Service account**
3. Enter service account details:
   - **Service account name**: `tierra-madre-inventory`
   - **Service account ID**: (auto-generated)
   - **Description**: `Service account for uploading inventory media to Drive`
4. Click **CREATE AND CONTINUE**
5. Grant access (optional): Click **CONTINUE** (skip this step)
6. Click **DONE**

---

## Step 4: Create and Download Credentials

1. In **Credentials**, find your new service account under "Service Accounts"
2. Click on the service account email (should be like `tierra-madre-inventory@...`)
3. Go to the **KEYS** tab
4. Click **ADD KEY** → **Create new key**
5. Select **JSON** format
6. Click **CREATE**
7. A JSON file will be downloaded automatically
   - **IMPORTANT**: Keep this file secure - it contains sensitive credentials

---

## Step 5: Share Google Drive with Service Account

1. Open [Google Drive](https://drive.google.com/) with **Comercial.aretrust@gmail.com**
2. The app will auto-create a folder called "Tierra Madre Inventory"
3. **OR** you can manually create it and share:
   - Create a folder named "Tierra Madre Inventory"
   - Right-click → Share
   - Add the service account email (from Step 3, looks like `tierra-madre-inventory@...iam.gserviceaccount.com`)
   - Give it "Editor" permissions
   - Click "Share"

---

## Step 6: Convert JSON to Base64

You need to convert the downloaded JSON file to base64 format for Vercel.

### Option A: Using Terminal (Mac/Linux)
```bash
base64 -i path/to/your-credentials.json | tr -d '\n' > credentials-base64.txt
```

### Option B: Using Online Tool
1. Go to [base64encode.org](https://www.base64encode.org/)
2. Open your JSON file in a text editor
3. Copy the entire JSON content
4. Paste into the encoder
5. Click "ENCODE"
6. Copy the base64 output

---

## Step 7: Add to Vercel Environment Variables

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **tierra-madre-studio**
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `GOOGLE_SERVICE_ACCOUNT_KEY`
   - **Value**: (paste the base64 string from Step 6)
   - **Environments**: Select all (Production, Preview, Development)
5. Click **Save**

---

## Step 8: Redeploy

After adding the environment variable, you need to redeploy:

```bash
git add .
git commit -m "feat: Add Google Drive integration for inventory media"
git push origin main
vercel --prod
```

---

## Testing

1. Go to the deployed site
2. Navigate to Inventario → Click on any product
3. Click "Subir Imagen/Video"
4. Upload a test image
5. The image should:
   - Upload to Google Drive
   - Display automatically in the product page
   - Be visible to all users on all devices

---

## Folder Structure in Drive

Files will be organized as:
```
Tierra Madre Inventory/
  ├── product-123-1732234567890.jpg
  ├── product-456-1732234567891.mp4
  └── product-789-1732234567892.jpg
```

Each file is named: `product-{ITEM_NUMBER}-{TIMESTAMP}.{EXTENSION}`

---

## Troubleshooting

### "Google Service Account not configured" error
- Make sure you added the `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable in Vercel
- Verify the base64 string is correct (no extra spaces or newlines)
- Redeploy after adding the variable

### "Permission denied" error
- Make sure you shared the Drive folder with the service account email
- Give "Editor" permissions
- Wait a few minutes for permissions to propagate

### Files not displaying
- Check browser console for errors
- Verify files are in the "Tierra Madre Inventory" folder in Drive
- Check that files are set to "Anyone with the link can view"

---

## Security Notes

- **NEVER** commit the JSON credentials file to git
- The base64 key is stored securely in Vercel environment variables
- Service account only has access to files it creates
- Drive files are publicly viewable (required for embedding)

---

## Need Help?

If you encounter any issues during setup, check:
1. Service account was created correctly
2. Drive API is enabled
3. JSON credentials are valid
4. Base64 encoding is correct
5. Environment variable is set in Vercel
6. Project has been redeployed after adding the variable

---

**Account Used**: Comercial.aretrust@gmail.com
**Service Account**: tierra-madre-inventory@{PROJECT_ID}.iam.gserviceaccount.com
**Drive Folder**: Tierra Madre Inventory
