# Tierra Madre Studio

## Project Overview
Colombian Emeralds Catalog & Sales Platform - "Esencia y Poder"

**Purpose**: Internal tool for Tierra Madre's Colombian emerald business - product catalog, quotations, analytics, and ambassador management.

## Tech Stack
- **Frontend**: React 18.3 + TypeScript 5.6
- **Build Tool**: Vite 5.4
- **UI Framework**: Material-UI v6
- **Routing**: React Router 7.9
- **Animations**: Framer Motion 12
- **PDF Generation**: jsPDF + html2canvas
- **Storage**: Google Drive (media), Google Sheets (data), LocalStorage (cache)
- **AI Integration**: Groq API
- **Email**: Resend
- **Deployment**: Vercel (serverless)

## Project Structure
```
src/
├── components/       # 27 feature modules
├── contexts/         # 8 context providers
├── hooks/           # 48 custom hooks
├── pages/           # 14 page components
├── data/            # Static data files
├── design-system/   # MUI theme tokens
├── types/           # TypeScript interfaces
├── utils/           # Utility modules
├── locales/         # i18n (ES/EN)
└── assets/          # Static assets

api/                 # 23 Vercel serverless functions
├── _lib/            # Shared API utilities
└── [endpoint].js    # API endpoints
```

## Commands
```bash
npm run dev           # Development server (localhost:3000)
npm run dev:api       # Dev + Vercel Functions locally
npm run build         # Production build (auto-updates version)
npm run preview       # Preview production build
```

## Key Features

### Product Catalog (Treasure Browser)
- Browse emeralds from Google Sheets inventory
- Filter by price, weight, color, quality
- Grid/List views with progressive image loading
- Product detail with gallery and analytics

### Quotations (Cotizaciones)
- Create professional quotations with product images
- Save to Google Drive + Sheets
- PDF export
- Provider quotation management

### Ambassadors (Asesores)
- Profile pages with agent info
- Product recommendations
- Guest invitation system

### Analytics Dashboard
- Product view tracking
- User activity feed
- Quotation analytics
- Health monitoring

### Media Management
- Upload to Google Drive
- Batch thumbnail generation
- Image proxy with auto-retry
- Video GIF preview generation

## API Endpoints (23)

**Core Data:**
- `get-treasure-sheets` - Product inventory
- `get-batch-thumbnails` - Product thumbnails
- `get-asesores` - Ambassador list
- `get-newest-products` - New products

**Media:**
- `serve-drive-image` - Proxy image delivery
- `get-drive-images` - Product media list
- `media-upload` - Upload to Drive
- `fast-upload` - Fast upload with GIF generation
- `cloudinary-upload` - Image processing for manual uploads only

**Quotations:**
- `cotizacion-save` - Save quotations
- `cotizacion-reports` - Client validation reports
- `provider-quotations` - Provider CRUD
- `quotation-requests` - Admin requests

**Users & Analytics:**
- `validate` - User validation
- `invitations` - Guest invitations
- `user-prefs` - User preferences
- `product-views` - View tracking
- `product-requests` - Asesor requests
- `feedback` - Feedback management

**System:**
- `health` - Health check
- `send-email` - Email notifications
- `drive-diagnostics` - Drive troubleshooting
- `drive-cleanup` - Folder cleanup

## Environment Variables

**Frontend (.env):**
```
VITE_GOOGLE_CLIENT_ID=xxx
VITE_GROQ_API_KEY=xxx
```

**Backend (Vercel):**
```
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_OAUTH_CLIENT_ID=xxx
GOOGLE_OAUTH_CLIENT_SECRET=xxx
GOOGLE_OAUTH_REFRESH_TOKEN=xxx
GOOGLE_SHARED_DRIVE_ID=xxx
FEEDBACK_SPREADSHEET_ID=xxx
RESEND_API_KEY=re_xxx
ADMIN_EMAILS=admin1@email.com,admin2@email.com
EMAIL_FROM=Tierra Madre <noti@domain.com>
APP_URL=https://tierra-madre-studio.vercel.app
```

## Development Guidelines

### Material-UI v6
- Use `ListItemButton` instead of `ListItem button`
- Use `alpha()` from `@mui/material/styles`
- Grid uses new API (no `item` prop)

### Port Management
Clean ports before dev server if conflicts occur.

## Vercel Deployment

**Project**: `tierra-madre-studio`
**URL**: https://tierra-madre-studio.vercel.app
**Auto-deploy**: Push to `main` branch

### Rules
- **NEVER** create new Vercel projects
- **NEVER** run `vercel` without project link
- Deployments are automatic on push to `main`

### Safari Cache Busting
`npm run build` auto-updates `APP_VERSION` in `index.html`:
```javascript
var APP_VERSION = 'YYYY.MM.DD.N';
```

### Git Commit Rules
1. Run `npm run build` before committing
2. Include ALL modified files (check `git status`)
3. Always include version files: `index.html`, `public/version.json`

## Media Storage Architecture

### Image Source: Google Drive `products/` folder
All product media stored in tm-studio Drive:
```
products/
├── 32 - Venus/
│   ├── hero.jpg     <- First image = thumbnail
│   ├── detail-1.jpg
│   └── video.mp4
├── 45 - Esperanza/
│   └── hero.jpg
```

**How it works:**
- `get-batch-thumbnails` API scans Drive `products/` folder
- Extracts item number from folder name (e.g., `32` from `32 - Venus`)
- First image (alphabetically) becomes the product thumbnail
- Images served via `/api/serve-drive-image?fileId={id}` proxy

### Image Loading with Auto-Retry
- Retries failed images up to 3 times
- Exponential backoff (1s, 2s, 4s)
- Cache-busting on retries

## Anti-Blinking Best Practices (CRITICAL)

When working with images, follow these rules to prevent flickering:

**1. Always use synchronous cache loading:**
```typescript
// ✅ CORRECT - Initialize state synchronously
const [data, setData] = useState(() => {
  const cached = localStorage.getItem('key');
  return cached ? JSON.parse(cached) : defaultValue;
});

// ❌ WRONG - Async loading causes re-render blink
useEffect(() => {
  const cached = localStorage.getItem('key');
  if (cached) setData(JSON.parse(cached));
}, []);
```

**2. Reserve image space with aspect-ratio:**
```tsx
<Box sx={{ aspectRatio: '1/1', width: '100%', overflow: 'hidden' }}>
  <img style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
</Box>
```

**3. Use unique instance keys (prevent DOM reuse):**
```tsx
const instanceId = useId();
<img key={`img-${instanceId}-${src}`} src={src} />
```

**4. Preload images before displaying galleries:**
```typescript
useEffect(() => {
  mediaItems.forEach(item => {
    const img = new Image();
    img.src = item.url;
  });
}, [mediaItems]);
```

**5. Avoid complex animations** - prefer instant swaps over fades

**6. For videos, use iOS Safari hack:**
```tsx
<video src={`${url}#t=0.001`} poster={posterUrl} preload="metadata" />
```

**Reference implementations:**
- `useBatchThumbnails.ts` - Synchronous cache loading
- `ProgressiveImage.tsx` - Retry logic, unique keys, LQIP
- `MediaGallery.tsx` - Image preloading

## Context Providers (8)
1. **AuthContext** - Authentication & roles
2. **GoogleAuthContext** - Google OAuth
3. **ThemeContext** - Light/dark theme
4. **LanguageContext** - i18n (ES/EN)
5. **PriceShareContext** - Price visibility
6. **TrackingContext** - Analytics events
7. **LiquidGlassContext** - Visual effects
8. **ScreenProtectionContext** - Screenshot detection

## Part of CoomUnity Universe
Built with the CoomUnity agent ecosystem:
- **ARIA**: Frontend experience
- **KIRA**: Narrative design and copywriting

---
Made with emerald-green love in Colombia 💚
