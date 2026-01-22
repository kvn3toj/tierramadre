# Manual Testing Guide for Image Blinking Fix

## Setup

Server is running at: **http://localhost:3001**

## Test Scenarios

### Test 1: Images Don't Display Until Fully Loaded ✅

**Objective**: Verify images remain hidden (opacity: 0) until completely downloaded.

**Steps**:
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Select "Slow 3G" throttling
4. Navigate to http://localhost:3001
5. Navigate to the Treasure Browser (catalog/grid view)
6. Observe image loading behavior

**Expected Result**:
- ✅ Skeleton loaders visible initially
- ✅ Images appear ONLY when 100% loaded (instant appearance)
- ❌ NO progressive rendering (gradual image appearance)
- ❌ NO blurry-to-sharp transitions
- ✅ Clean skeleton → full image swap

**How to Verify**:
Right-click an image while loading → Inspect → Check `opacity` style:
- Should be `opacity: 0` until `onLoad` fires
- Then instantly transitions to `opacity: 1`

---

### Test 2: Filter Changes Don't Cause Re-renders 🔍

**Objective**: Verify GridCards don't re-render when filters change.

**Steps**:
1. Open Chrome DevTools (F12)
2. Go to **React DevTools** → **Profiler** tab
3. Click "Record"
4. Apply a price filter (e.g., $1000-$5000)
5. Stop recording
6. Examine the flame graph

**Expected Result**:
- ✅ Only filtered-out cards **unmount**
- ✅ Visible cards show "Did not render" in Profiler
- ✅ GridCard components NOT in re-render list
- ❌ NO cascade of re-renders across all cards

**Key Metric**: <5% of visible cards should re-render

---

### Test 3: Product #162 Image Stability 🎯

**Objective**: Verify product #162 maintains stable image URL.

**Steps**:
1. Open Chrome DevTools (F12) → **Network** tab
2. Filter by "Img" or "api/serve-drive-image"
3. Navigate to Treasure Browser
4. Locate product #162 in the grid
5. Note the image URL
6. Apply various filters (price, weight, color)
7. Return to original view showing #162
8. Check Network tab

**Expected Result**:
- ✅ Same image URL for product #162 across all views
- ✅ Zero duplicate network requests for same image
- ✅ Image persists in browser cache
- ❌ NO new fetch when returning to view

---

### Test 4: No Blinking on Search Changes 🔎

**Objective**: Verify images don't reload when searching.

**Steps**:
1. Load Treasure Browser with all products visible
2. Open Network tab, filter by images
3. Type in search box: "esmeralda"
4. Observe Network tab and visible images

**Expected Result**:
- ✅ Matching products remain mounted (no image reload)
- ✅ Non-matching products unmount gracefully
- ✅ No new network requests for visible images
- ❌ NO blinking or flashing during search

---

### Test 5: Favorites Toggle is Isolated ⭐

**Objective**: Verify favoriting ONE product doesn't affect others.

**Steps**:
1. Open React DevTools → Profiler
2. Start recording
3. Click favorite icon on ANY product
4. Stop recording
5. Examine flame graph

**Expected Result**:
- ✅ Only ONE GridCard re-renders (the favorited one)
- ✅ All other GridCards show "Did not render"
- ❌ NO cascade of re-renders to other cards

---

### Test 6: Scroll Performance (VirtualGrid) ⚡

**Objective**: Verify smooth 60fps scrolling with 500+ items.

**Steps**:
1. Load Treasure Browser (full catalog)
2. Open DevTools → **Performance** tab
3. Start recording
4. Scroll rapidly through entire grid (top to bottom)
5. Stop recording
6. Analyze frame rate

**Expected Result**:
- ✅ FPS: 60fps (green line)
- ✅ Scripting time: <16ms per frame
- ❌ NO frame drops (red/yellow indicators)
- ❌ NO jank or stuttering

---

### Test 7: Layout Shift Prevention 📐

**Objective**: Verify zero layout shifts during image load.

**Steps**:
1. Open DevTools → **More tools** → **Rendering**
2. Enable "Layout Shift Regions"
3. Clear cache and reload page
4. Navigate to Treasure Browser
5. Observe during image loading

**Expected Result**:
- ✅ No blue highlights (layout shift indicators)
- ✅ Reserved space maintained by skeleton
- ✅ Smooth replacement when image loads
- ❌ NO height changes or jumping content

---

### Test 8: Cache Expiration Handling ⏰

**Objective**: Verify graceful cache refresh after 10 minutes.

**Steps**:
1. Load Treasure Browser
2. Wait 10 minutes (or clear localStorage: `localStorage.clear()`)
3. Navigate away and back to Treasure Browser
4. Observe loading behavior

**Expected Result**:
- ✅ Fresh load with skeleton loaders
- ✅ Gradual image appearance (expected)
- ❌ NO blinking of already-loaded images
- ✅ Smooth user experience despite cache miss

---

## Success Criteria Summary

### Must Pass (Critical):
- [ ] Images hidden until fully loaded (Test 1)
- [ ] Filter changes don't re-render visible cards (Test 2)
- [ ] Product #162 has stable image URL (Test 3)
- [ ] No blinking on search (Test 4)
- [ ] Favorites toggle is isolated (Test 5)

### Should Pass (Important):
- [ ] 60fps scroll performance (Test 6)
- [ ] Zero layout shifts (Test 7)
- [ ] Graceful cache expiration (Test 8)

---

## Common Issues & Fixes

### Issue: Progressive rendering still visible
**Cause**: `fullyLoaded` state not working
**Check**: Inspect image element, verify `opacity: 0` until `onLoad`

### Issue: Cards re-render on filter
**Cause**: Callback props not memoized
**Check**: React DevTools Profiler → Look for GridCard in render list

### Issue: Product #162 URL changes
**Cause**: Drive API not using `orderBy`
**Check**: Network tab → Compare file IDs across loads

---

## Quick Verification Checklist

Run through this 2-minute checklist:

1. **Load page with slow network** → Images appear instantly when ready? ✅/❌
2. **Apply filter** → No grid flashing? ✅/❌
3. **Search for product** → Matching products stay mounted? ✅/❌
4. **Toggle favorite** → Only one card updates? ✅/❌
5. **Scroll rapidly** → Smooth 60fps? ✅/❌

If all checks pass ✅ → **Fix is working!**

---

## Automated Test (Puppeteer)

To run automated tests:

```bash
# Ensure server is running
npm run dev:api

# In another terminal
node test-blinking.cjs
```

**Note**: Automated tests may require authentication bypass or mock data.

---

## Reporting Issues

If tests fail, please capture:
1. Screenshot of issue
2. React DevTools Profiler flame graph
3. Network tab waterfall
4. Console errors
5. Browser version

Report at: https://github.com/kvn3toj/tierramadre/issues
