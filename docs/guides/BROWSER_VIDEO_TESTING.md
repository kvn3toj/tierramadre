# 🎬 CEO Collection Video Testing Guide

## ✅ Deployed Changes (Version 2026.02.13.808)

### What Was Fixed:
1. **Cache invalidation**: Updated cache key from `collection_ceo-coomunity` to `collection_v2_ceo-coomunity`
2. **Video preload**: Changed from `preload="none"` to `preload="metadata"` for better browser compatibility
3. **Safari iOS support**: Added `webkit-playsinline` and `x-webkit-airplay` attributes
4. **Updated prices**: Collection now has correct pricing and weights in carats

---

## 🧪 Browser Testing Checklist

### Chrome Desktop (Mac/Windows)
**How to Test:**
1. Open Chrome
2. Visit: https://tierra-madre-studio.vercel.app/c/ceo-tierra-madre
3. **Clear cache first**: Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
   - Select "Cached images and files"
   - Time range: "All time"
   - Click "Clear data"
4. Refresh the page: `Cmd+R` (Mac) or `Ctrl+R` (Windows)

**What to Check:**
- ✅ Page loads without errors (check Console: `Cmd+Option+J` / `Ctrl+Shift+J`)
- ✅ All 7 product cards show poster images
- ✅ Hover over a card → video should play automatically
- ✅ Move mouse away → video should pause and reset
- ✅ Click a card → dialog opens with video playing in full quality
- ✅ Prices display in USD (e.g., $12,000, $11,429, etc.)

**Common Issues:**
- If videos don't play: Check Console for errors
- If poster images are blurry: Force refresh with `Cmd+Shift+R` / `Ctrl+Shift+R`

---

### Safari Desktop (Mac)
**How to Test:**
1. Open Safari
2. Visit: https://tierra-madre-studio.vercel.app/c/ceo-tierra-madre
3. **Clear cache first**:
   - Safari menu → Settings → Privacy → Manage Website Data
   - Search "tierra-madre-studio.vercel.app"
   - Click "Remove" → "Done"
4. Close and reopen Safari
5. Revisit the collection page

**What to Check:**
- ✅ Videos play on hover (Safari sometimes blocks autoplay)
- ✅ Videos display in correct aspect ratio (1:1 square)
- ✅ No "file not found" or CORS errors in Console (`Cmd+Option+C`)
- ✅ Poster images load instantly

**Safari-Specific Notes:**
- Safari may require user interaction before playing videos
- If videos don't autoplay on hover, try clicking the card
- Check if "Auto-Play" is blocked: Safari → Settings → Websites → Auto-Play

---

### Safari iOS (iPhone/iPad)
**How to Test:**
1. Open Safari on iPhone/iPad
2. Visit: https://tierra-madre-studio.vercel.app/c/ceo-tierra-madre
3. **Clear cache first**:
   - Settings → Safari → Clear History and Website Data
   - Confirm "Clear History and Data"
4. Reopen Safari and revisit the page

**What to Check:**
- ✅ Page is responsive (grid adjusts to screen size)
- ✅ Tap a card → video plays inline (not fullscreen)
- ✅ Videos play muted (iOS requires muted videos for autoplay)
- ✅ Scroll is smooth
- ✅ No layout shifts or flickering

**iOS-Specific Notes:**
- Videos must be muted to autoplay on iOS
- `playsinline` attribute prevents fullscreen takeover
- If videos open in fullscreen, check `webkit-playsinline` is present

---

### Chrome Mobile (Android)
**How to Test:**
1. Open Chrome on Android
2. Visit: https://tierra-madre-studio.vercel.app/c/ceo-tierra-madre
3. **Clear cache first**:
   - Chrome menu (⋮) → Settings → Privacy → Clear browsing data
   - Select "Cached images and files"
   - Tap "Clear data"
4. Refresh the page

**What to Check:**
- ✅ Videos load and play smoothly
- ✅ Touch interactions work (tap to play, tap outside to close)
- ✅ No layout issues on different screen sizes
- ✅ Videos don't consume excessive data (preload="metadata" only loads ~1% of video)

---

## 🔍 Advanced Debugging

### Check API Response
Open browser DevTools Console and run:
```javascript
fetch('/api/get-collection?folder=ceo-coomunity')
  .then(r => r.json())
  .then(data => console.log(data.products[0]))
```

**Expected output:**
```json
{
  "item": 901,
  "nombre": "Reino de Paz",
  "peso": 3.56,
  "precioInternacional": 12000,
  "videoUrl": "/images/901.mp4",
  "posterUrl": "/images/901-poster.jpg",
  "mediaType": "video",
  "imagen": "/images/901-poster.jpg"
}
```

### Check Video Accessibility
```javascript
fetch('/images/901.mp4', { method: 'HEAD' })
  .then(r => console.log('Video accessible:', r.ok, r.status))
```

**Expected:** `Video accessible: true 200`

### Check Cache Version
```javascript
console.log(localStorage.getItem('collection_v2_ceo-coomunity'))
```

**Expected:** Should show JSON with `videoUrl` fields. If null, cache will be fetched on page load.

### Force Clear Old Cache
```javascript
localStorage.removeItem('collection_ceo-coomunity'); // Old cache
localStorage.removeItem('collection_v2_ceo-coomunity'); // New cache
location.reload();
```

---

## 🐛 Troubleshooting

### Videos Don't Play
1. **Check Console for errors**: Look for 404, CORS, or codec errors
2. **Verify video URL**: Should be `/images/901.mp4` not a Drive URL
3. **Test video directly**: Visit `https://tierra-madre-studio.vercel.app/images/901.mp4`
4. **Check browser autoplay policy**: Some browsers block autoplay without user interaction

### Poster Images Don't Load
1. **Check Console**: Look for 404 errors
2. **Test poster directly**: Visit `https://tierra-madre-studio.vercel.app/images/901-poster.jpg`
3. **Clear cache**: Use browser's cache clearing method above
4. **Force refresh**: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)

### Old Data Still Showing (Wrong Prices)
1. **Clear localStorage**: Run in Console:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
2. **Hard refresh**: `Cmd+Shift+R` / `Ctrl+Shift+R`
3. **Incognito mode**: Test in a private/incognito window

### Videos Lag or Buffer
1. **Check connection**: Run a speed test (videos are ~2MB each)
2. **Check CDN**: Videos should be served by Vercel's CDN with `x-vercel-cache: HIT`
3. **Check `preload` attribute**: Should be `metadata` (only loads ~1% of video)

---

## 📊 Performance Metrics

### Expected Load Times:
- **Poster images**: ~50-200ms (11-25KB each)
- **Video metadata**: ~100-300ms (loads duration, dimensions)
- **Full video playback**: Starts within 500ms of hover

### Network Usage:
- **Initial page load**: ~500KB (HTML, JS, CSS, posters)
- **Per video on hover**: ~2MB (full video download)
- **Total if all videos played**: ~14MB

### CDN Cache Headers:
```
cache-control: public, max-age=86400, stale-while-revalidate=604800
x-vercel-cache: HIT
```

Videos cached for 24 hours, stale-while-revalidate for 7 days.

---

## ✅ Success Criteria

All tests pass when:
- ✅ Videos load and play on hover in all browsers
- ✅ No console errors related to videos or images
- ✅ Prices are correct (e.g., $12,000 for item 901)
- ✅ Weights display in carats (e.g., 3.56 Cts)
- ✅ Poster images show instantly (no blinking/loading state)
- ✅ Mobile experience is smooth (no layout shifts)
- ✅ Videos play inline on iOS (not fullscreen)
- ✅ Page loads under 2 seconds on good connection

---

## 🚀 Quick Test URLs

- **Collection page**: https://tierra-madre-studio.vercel.app/c/ceo-tierra-madre
- **Direct video test**: https://tierra-madre-studio.vercel.app/images/901.mp4
- **Direct poster test**: https://tierra-madre-studio.vercel.app/images/901-poster.jpg
- **API test**: https://tierra-madre-studio.vercel.app/api/get-collection?folder=ceo-coomunity

---

**Test Date**: 2026-02-13
**Version**: 2026.02.13.808
**Commit**: 4ce0fb4
