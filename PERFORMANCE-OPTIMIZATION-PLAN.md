# React Performance Optimization Plan
## Treasure Browser Grid & Product Detail Page — Image Loading

**Date:** March 9, 2026
**Scope:** Image loading pipeline across grid cards, product detail MediaGallery, and ImageLightbox
**Method:** Live Chrome DevTools inspection on localhost:3000

---

## Executive Summary

The image loading architecture is well-designed with virtualization, lazy loading, and a Drive proxy with Sharp resizing. However, live profiling revealed **6 high-impact issues** causing redundant network requests, oversized images, and missed browser optimizations. Fixing these would reduce network bandwidth by ~40-60% and improve LCP by 200-400ms.

---

## Current Architecture (What Works Well)

- **react-window virtualization** — Only ~18 DOM images at any time for 102 products (excellent)
- **`useBatchThumbnails` with synchronous localStorage init** — No blink on cached reload
- **`useDeferredValue`** for search filtering — Keeps input responsive
- **Custom `React.memo` comparator on `GridCard`** — Minimal re-renders
- **`serve-drive-image` API with Sharp resizing** — Server-side responsive images
- **ETag + 304 support** — Conditional caching on the proxy
- **Progressive JPEG output** from Sharp (quality 85)
- **Double-buffer rendering** in MediaGallery with `img.decode()` before display

---

## Issues Found (Ordered by Impact)

### 🔴 CRITICAL — Issue 1: Duplicate Size Parameter Bug in MediaGallery

**What happens:** `getDisplayUrl()` appends `&size=medium` to URLs that already contain `size=small` from the batch thumbnail API, creating URLs like:
```
/api/serve-drive-image?fileId=xxx&size=small&size=medium
```

**Evidence:** Network log shows the same file fetched 3-4 times:
1. `?fileId=xxx&size=small` — thumbnail in grid
2. `?fileId=xxx&size=small&size=medium` — MediaGallery (buggy URL)
3. `?fileId=xxx&size=medium` — MediaGallery preload
4. `?fileId=xxx` — Lightbox (no size param = full original)

**Impact:** 3-4x redundant requests per product image on detail page. Each request goes through Google Drive API + Sharp processing.

**Fix:**
```typescript
// MediaGallery.tsx line 89-97
const getDisplayUrl = useCallback((index: number): string => {
  const item = media[index];
  if (!item) return '';
  if (item.url.includes('serve-drive-image')) {
    // Replace existing size param instead of appending
    const url = new URL(item.url, window.location.origin);
    url.searchParams.set('size', 'medium');  // Overwrites any existing size
    return url.pathname + url.search;
  }
  return item.url;
}, [media]);
```

**Effort:** 15 minutes | **Impact:** High — eliminates ~50% redundant API calls on product page

---

### 🔴 CRITICAL — Issue 2: Lightbox Shows Blurry Images (size=small at Full Screen)

**What happens:** `ImageLightbox` receives `item.url` directly from the media array, which contains `size=small` (400px). This 400px image is displayed at full viewport width (593px+), appearing blurry.

**Evidence:** `ImageLightbox.tsx:325` uses `currentImage.url` without any size upgrade. Network log confirms a separate fetch without size param for some images, but inconsistently.

**Fix:**
```typescript
// MediaGallery.tsx — lightboxImages computation (line 343)
const lightboxImages = useMemo(() => {
  return media
    .filter(item => item.type === 'image')
    .map(item => {
      let url = item.url;
      if (url.includes('serve-drive-image')) {
        const parsed = new URL(url, window.location.origin);
        parsed.searchParams.set('size', 'large');  // 1200px for fullscreen
        url = parsed.pathname + parsed.search;
      }
      return { url, alt: item.alt || productName };
    });
}, [media, productName]);
```

**Effort:** 20 minutes | **Impact:** High — sharp vs blurry fullscreen gallery images

---

### 🟡 HIGH — Issue 3: No `fetchpriority="high"` or `loading="eager"` on First-Row Grid Images

**What happens:** VirtualGrid passes `priority={true}` to first-row GridCards, and GridCard passes it to ProgressiveImage. But the actual `<img>` tags all render with `loading="lazy"` and no `fetchpriority`.

**Evidence:** JavaScript audit found 0 images with `loading="eager"` and 16 with `loading="lazy"`. Above-the-fold images wait for IntersectionObserver to trigger despite `priority` prop.

**Current code in ProgressiveImage:**
```typescript
const shouldLoad = priority || quality === 'eco' || inView;
```
The `shouldLoad` flag controls whether to start the Image() preload, but the actual `<img>` tag still has `loading="lazy"`.

**Fix:**
```tsx
// ProgressiveImage.tsx — on the <img> element
<img
  loading={priority ? 'eager' : 'lazy'}
  fetchpriority={priority ? 'high' : 'auto'}
  // ... rest of props
/>
```

**Effort:** 10 minutes | **Impact:** Medium-High — improves LCP by 200-400ms for first paint of grid

---

### 🟡 HIGH — Issue 4: Logo Image 26x Oversized

**What happens:** The Tierra Madre logo in the Tesoros header is 3544×1182px natural, displayed at 132×44px — **26x larger than needed**.

**Evidence:** JavaScript audit: `{naturalW: 3544, naturalH: 1182, displayW: 132, displayH: 44}`

**Fix:** Generate an optimized logo at 2x display size (264×88px) as WebP/PNG. Save as `logo-2x.webp` (~5-10KB vs the current ~200KB+ full-res image).

**Effort:** 15 minutes | **Impact:** Medium — reduces initial page weight by ~150-200KB

---

### 🟡 MEDIUM — Issue 5: Thumbnail Strip Oversized on Product Page

**What happens:** Product page thumbnail strip shows images at 64×64px, but fetches `size=small` (400px wide) — **6x more pixels than needed**.

**Evidence:** JavaScript audit: `{naturalW: 300, naturalH: 400, displayW: 64, displayH: 64}`

**Fix:** Use `size=thumb` (200px) for the thumbnail strip images:
```typescript
// In the component that builds the thumbnail strip media URLs
// Replace size=small with size=thumb for thumbnails
const thumbUrl = item.url.includes('serve-drive-image')
  ? item.url.replace('size=small', 'size=thumb')
  : item.url;
```

Or better yet, pass a `thumbnailSize` prop to differentiate main gallery images from strip thumbnails.

**Effort:** 20 minutes | **Impact:** Medium — reduces ~60% bandwidth for thumbnail strip (5 images × 4x size reduction)

---

### 🟢 LOW — Issue 6: No Responsive `srcset` on Grid Images

**What happens:** Despite having Cloudinary srcset generation code in `cloudinaryImage.ts`, the Drive-proxied images don't use `srcset`/`sizes` attributes. Every device gets the same `size=small` (400px) image.

**Evidence:** JavaScript audit: `srcsetImages: 0`

**Current state:** The `serve-drive-image` API already supports `thumb/small/medium/large/original` sizes. The grid images could use `srcset` to let the browser choose optimal size.

**Fix (future):**
```tsx
// ProgressiveImage.tsx — for Drive-proxied images
const baseUrl = src.replace(/size=\w+/, '');
const srcSet = `${baseUrl}size=small 400w, ${baseUrl}size=medium 800w`;
const sizes = '(max-width: 600px) calc(50vw - 20px), (max-width: 900px) 33vw, 25vw';
```

**Effort:** 1-2 hours | **Impact:** Low for grid (400px is close to display size on mobile), more valuable for tablet/desktop where grid cards are larger

---

## Additional Observations

### StrictMode Double-Fetch (Dev Only)
- 4 `get-batch-thumbnails` API calls observed (2 completed, 2 pending)
- Caused by React StrictMode double-mounting in development
- **Not a production issue** — no action needed

### Cache Headers (Well Configured)
- `Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=300`
- 1-hour browser cache + 5-minute stale-while-revalidate
- ETag support for 304 responses
- **Working correctly** on Vercel CDN edge

### Virtualization (Well Configured)
- `overscanCount={3}` rows — good balance for scroll smoothness
- ~1,755 DOM nodes total on treasure page — healthy
- ResizeObserver for accurate grid measurements
- Dynamic row height with 4:5 aspect ratio

---

## Implementation Priority

| Priority | Issue | Effort | Bandwidth Savings | UX Impact |
|----------|-------|--------|-------------------|-----------|
| 1 | Duplicate size param bug | 15 min | ~50% on product page | Faster load |
| 2 | Lightbox blurry images | 20 min | N/A (quality fix) | Sharp fullscreen |
| 3 | `fetchpriority="high"` for row 0 | 10 min | N/A (timing fix) | Faster LCP |
| 4 | Oversized logo | 15 min | ~150-200KB per page | Faster initial |
| 5 | Thumbnail strip oversized | 20 min | ~60% on detail page | Faster product |
| 6 | Responsive srcset | 1-2 hours | Variable by device | Optimal sizing |

**Total estimated effort:** ~2-3 hours for issues 1-5 (highest ROI)

---

## Files to Modify

1. **`src/components/media/MediaGallery.tsx`** — Issues 1, 2, 5
2. **`src/components/shared/ProgressiveImage.tsx`** — Issue 3, 6
3. **`src/assets/` or `public/`** — Issue 4 (logo optimization)
4. **`src/components/media/ImageLightbox.tsx`** — No changes needed (fix is upstream in MediaGallery)

---

*Generated by live Chrome inspection on localhost:3000*
