# 📱 Installing Tierra Madre Studio as a PWA

## iOS Installation (iPhone/iPad)

To get the **full-screen PWA experience without browser bars**, follow these steps:

### 1. Open in Safari
⚠️ **Important**: You must use **Safari** browser (not Chrome or other browsers on iOS)

1. Open Safari on your iPhone/iPad
2. Navigate to: `https://tierra-madre-studio.vercel.app`

### 2. Add to Home Screen

1. Tap the **Share** button (square with arrow pointing up) at the bottom of Safari
2. Scroll down and tap **"Add to Home Screen"** (or "Añadir a pantalla de inicio")
3. Edit the name if desired (default: "TM Studio")
4. Tap **"Add"** (or "Añadir") in the top right

### 3. Launch from Home Screen

1. Find the **TM Studio** icon on your home screen
2. Tap it to launch the app
3. ✅ The app will now open **without browser navigation bars**

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
