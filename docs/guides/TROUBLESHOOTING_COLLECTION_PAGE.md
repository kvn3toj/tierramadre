# 🔧 Troubleshooting: Collection Page Error

## ❌ Error: "An error occurred trying to load the resource"

### 🎯 Likely Causes:

1. **Browser Cache Issue** (Most Common)
2. **Service Worker Interference**
3. **Vercel Deployment Propagation**
4. **Browser Extensions Blocking**

---

## 🚀 Solutions (Try in Order):

### Solution 1: Hard Refresh (90% success rate)

**Chrome/Edge:**
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

**Safari:**
```
Mac: Cmd + Option + R
```

**Firefox:**
```
Windows: Ctrl + F5
Mac: Cmd + Shift + R
```

### Solution 2: Clear Browser Cache

**Chrome:**
1. Open DevTools: `Cmd + Option + I` (Mac) or `Ctrl + Shift + I` (Windows)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Safari:**
1. Settings → Privacy → Manage Website Data
2. Search "tierra-madre-studio.vercel.app"
3. Remove
4. Close and reopen Safari

### Solution 3: Clear Service Workers

**Chrome/Edge:**
1. Open DevTools: `F12`
2. Go to "Application" tab
3. Click "Service Workers" (left sidebar)
4. Click "Unregister" for tierra-madre-studio.vercel.app
5. Refresh page

### Solution 4: Private/Incognito Mode

Open in private browsing:
- Chrome: `Cmd + Shift + N` (Mac) or `Ctrl + Shift + N` (Windows)
- Safari: `Cmd + Shift + N`
- Firefox: `Cmd + Shift + P` (Mac) or `Ctrl + Shift + P` (Windows)

If it works in incognito, the issue is cache/extensions.

### Solution 5: Check Console Errors

1. Open DevTools Console: `Cmd + Option + J` (Mac) or `Ctrl + Shift + J` (Windows)
2. Look for specific error messages
3. Share error details if issue persists

---

## 🔍 Specific Checks:

### Check 1: Verify Videos Are Accessible

Open these URLs directly in browser:
```
https://tierra-madre-studio.vercel.app/images/901.mp4
https://tierra-madre-studio.vercel.app/images/902.mp4
https://tierra-madre-studio.vercel.app/images/903.mp4
```

**Expected**: Video should play directly
**If 404**: Deployment issue (contact support)

### Check 2: Check Network Tab

1. Open DevTools → Network tab
2. Refresh page
3. Look for failed requests (red)
4. Check if videos are loading (status 200)

### Check 3: Disable Extensions

Temporarily disable:
- Ad blockers
- Privacy extensions
- Video blockers
- VPN

These can interfere with video loading.

---

## 🐛 Known Issues:

### Issue 1: Safari Aggressive Caching
**Symptom**: Page shows old version
**Fix**:
```bash
# Clear all Safari caches
rm -rf ~/Library/Caches/com.apple.Safari
# Restart Safari
```

### Issue 2: Vercel Deployment Delay
**Symptom**: Changes not visible immediately
**Fix**: Wait 2-3 minutes, then hard refresh

### Issue 3: Video Format Not Supported
**Symptom**: Video player shows error
**Fix**:
- Check if browser supports H.264/MP4
- Try different browser (Chrome, Safari, Firefox)

---

## 💻 Developer Solutions:

### Clear All Caches (Terminal)

```bash
# Clear localStorage
# In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload(true);

# Force new deployment
git commit --allow-empty -m "force redeploy"
git push origin main
```

### Check Vercel Deployment Status

```bash
# Check latest deployment
curl -s https://tierra-madre-studio.vercel.app/version.json | jq
```

**Expected output:**
```json
{
  "version": "2026.02.13.829",
  "timestamp": "..."
}
```

### Verify Video Files in Deployment

```bash
# Check if all videos exist
for i in {901..907}; do
  echo -n "$i.mp4: "
  curl -sI https://tierra-madre-studio.vercel.app/images/$i.mp4 | grep "HTTP"
done
```

**Expected**: All return `HTTP/2 200`

---

## 🔄 Rollback Plan

If issue persists, we can rollback:

```bash
# Revert to previous working version
git log --oneline | head -5  # Find last working commit
git revert <commit-hash>
git push origin main
```

---

## 📞 Still Not Working?

If none of the above solutions work:

1. **Share console errors**:
   - Open DevTools Console
   - Copy error messages
   - Screenshot the error

2. **Check browser version**:
   - Ensure browser is up-to-date
   - Test in different browser

3. **Network check**:
   - Test from different network (WiFi, mobile data)
   - Check if firewall/VPN blocking

4. **Device check**:
   - Try different device
   - Test on mobile vs desktop

---

## ✅ Prevention

To avoid future issues:

1. **Always hard refresh** after deployments
2. **Clear cache regularly** when testing
3. **Use incognito mode** for testing new deployments
4. **Disable aggressive extensions** when developing

---

**Current Version**: 2026.02.13.829
**Deployment**: https://tierra-madre-studio.vercel.app/c/ceo-tierra-madre
**Videos Status**: ✅ All deployed and accessible
