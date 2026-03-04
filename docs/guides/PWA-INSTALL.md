# 📱 Installing Tierra Madre Studio as a PWA

## iOS Installation (iPhone/iPad)

To get the **full-screen PWA experience without browser bars**, follow these steps:

### 1. Open in Safari
⚠️ **CRITICAL**: You **MUST** use **Safari** browser (not Chrome or other browsers on iOS/iPadOS)

1. Open Safari on your iPhone/iPad
2. Navigate to: `https://tierra-madre-studio.vercel.app`

### 2. Close All Safari Tabs (iPad Only)
📱 **iPad-specific step**: Before adding to home screen on iPad:
1. Close all other Safari tabs
2. Make sure the app URL is the ONLY open tab
3. Refresh the page once

### 3. Add to Home Screen

**iPhone:**
1. Tap the **Share** button (square with arrow pointing up) at the bottom
2. Scroll down and tap **"Add to Home Screen"**

**iPad:**
1. Tap the **Share** button (square with arrow pointing up) in the top toolbar
2. Scroll down in the menu and tap **"Add to Home Screen"**
3. Edit the name if desired (default: "TM Studio")
4. Tap **"Add"** in the top right

### 4. **IMPORTANT**: Delete and Reinstall if Needed

If you previously added the app and still see browser bars:
1. **Delete the app** from your home screen (hold icon → Remove)
2. **Clear Safari cache**:
   - Settings → Safari → Clear History and Website Data
3. **Restart your iPad/iPhone**
4. **Follow steps 1-3 again**

### 5. Launch from Home Screen

1. Find the **TM Studio** icon on your home screen
2. Tap it to launch the app
3. ✅ The app will now open **without browser navigation bars**

### iPad-Specific Notes

iPads sometimes require extra steps:
- **Always launch from the home screen icon**, never from Safari bookmarks or recent tabs
- If address bar appears, **delete and reinstall** following the steps above
- Make sure you're running **iPadOS 15.4 or later**
- Ensure **Safari is up to date**

## What You Should See

### ❌ Browser Mode (NOT installed correctly)
- Top address bar visible
- Bottom Safari navigation visible
- URL bar showing

### ✅ PWA Mode (Installed correctly)
- No address bar
- No browser navigation
- Full-screen app experience
- Looks like a native app

## Android Installation

1. Open Chrome or Edge browser
2. Navigate to the app URL
3. Tap the menu (⋮) and select **"Add to Home Screen"** or **"Install app"**
4. Launch from home screen

## Troubleshooting

### Still seeing browser bars?
1. Delete the app from home screen
2. Clear Safari cache (Settings > Safari > Clear History and Website Data)
3. Restart Safari
4. Follow installation steps again
5. Make sure you're launching from the **home screen icon**, not from Safari bookmarks

### PWA not showing "Add to Home Screen"?
- Ensure you're using Safari on iOS (required)
- Check that you're on the correct URL
- Try refreshing the page

## Features When Installed as PWA

- 🚀 Instant loading
- 📴 Offline support (coming soon)
- 🔔 Push notifications (coming soon)
- 📱 Native app feel
- 💾 Persistent data storage
- 🎨 Full-screen iOS experience

## Technical Details

The PWA uses:
- **Display mode**: `standalone`
- **iOS meta tags**: `apple-mobile-web-app-capable`
- **Status bar style**: `black-translucent`
- **Orientation**: `portrait-primary`
- **Safe area insets**: Properly handled for notch/home indicator

---

**Need help?** Contact the dev team or file an issue on GitHub.
