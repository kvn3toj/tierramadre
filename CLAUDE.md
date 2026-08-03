# Tierra Madre Studio

## Project Overview

Colombian Emeralds Catalog & Sales Platform - "Esmeraldas con ADN de Paz"

**Purpose**: Internal tool for Tierra Madre's Colombian emerald business - product catalog, quotations, analytics, and ambassador management.

## Tech Stack

- **Frontend**: React 18.3 + TypeScript 5.6
- **Build Tool**: Vite 5.4
- **UI Framework**: Material-UI v6
- **Routing**: React Router 7.9
- **Animations**: Framer Motion 12
- **PDF Generation**: jsPDF + html2canvas
- **Storage**: Convex (backend/data), Google Drive (media), Google Sheets (legacy data source, migrating to Convex), LocalStorage (cache)
- **AI Integration**: Groq API
- **Email**: Resend
- **Deployment**: Vercel (serverless)

## Project Structure

```
src/
├── components/       # feature modules (accounts, admin, ambassador, cotizacion,
│                     #   esmereogenesis, redesign, treasure, vitrina, etc.)
├── contexts/         # context providers (Auth, GoogleAuth, Theme, Language,
│                     #   PriceShare, Tracking, LiquidGlass, ScreenProtection,
│                     #   Currency, GlobalLoading, Notification, AppNavigator,
│                     #   AppShellProviders, EsmereoTheme, Esmereogenesis, NetworkStatus)
├── hooks/           # custom hooks (~80, see src/hooks/ for the full list)
├── pages/           # page components, organized into subdirs
│                     #   (admin/, ambassadors/, cuentas/, collection/, esmereogenesis/,
│                     #   mi-perfil/, public/, staff/, treasure/, valuation/, vitrina/)
├── data/            # Static data files
├── design-system/   # MUI theme tokens + DS3 ("Quiet Emerald") convergence layer
├── types/           # TypeScript interfaces
├── utils/           # Utility modules
├── locales/         # i18n (ES/EN)
└── assets/          # Static assets

convex/              # Convex backend (queries, mutations, actions, crons, HTTP)
                      #   see "Convex Backend" section below

api/                 # Vercel serverless functions (mix of .js and .ts)
├── _lib/            # Shared API utilities
└── [endpoint].{js,ts} # API endpoints — see api/ for the current list
```

> Directory contents change often; treat the above as a map of where things live, not an exact inventory. Run `ls src/components`, `ls src/hooks`, `ls convex`, `ls api` for current counts.

## Commands

```bash
npm run dev            # Development server (localhost:3000)
npm run dev:api        # Dev + Vercel Functions locally
npm run build          # Production build (auto-updates version)
npm run build:vercel   # Vercel build (version + thumbnails seed + build-app script)
npm run preview        # Preview production build

# Quality
npm run lint            # tsc --noEmit (app + api/tsconfig.json)
npm run test:unit       # Vitest unit tests
npm run test:e2e        # Playwright e2e tests
npm run test:e2e:ui     # Playwright e2e tests, UI mode

# Convex migration (Sheets → Convex)
npm run migrate:convex       # Run the Sheets→Convex migration
npm run migrate:convex:dry   # Dry-run, all tables, no writes
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

### Esmereogenesis

- Separate feature area under `src/pages/esmereogenesis/`, `src/components/esmereogenesis/`, `src/contexts/EsmereogenesisContext.tsx`, with its own theming context (`EsmereoThemeContext`)
- Own AI/data surface in Convex (`fotosintesisAi.ts`, `fotoSync.ts`) and API (`fotosintesis-ai.ts`)

### GoHighLevel (GHL) Integration

- CRM/marketing integration: `convex/ghl.ts`, `api/ghl-*.ts` endpoints, plus a root-level `GHL/` folder of specs, audits, and flow docs (funnel, Supabase, WhatsApp/Meta, web-madre integration)
- Treat as a distinct subsystem from the catalog/quotation core — consult `GHL/00-INDICE-Y-MAPA.md` before making changes in this area

## API Endpoints

Vercel serverless functions live in `api/` (a mix of `.js` and `.ts`, ~40+ files and growing). Rather than enumerate them here (they drift constantly), group by concern and check `api/` directly for the current list:

- **Core Data**: product inventory, thumbnails, ambassador list, newest products, collection/table reads (`get-treasure-sheets`, `get-batch-thumbnails`, `get-asesores`, `get-newest-products`, `get-collection`, `get-table*`, `get-inventory-rows`, `admin-table-update`, `admin-product-update`)
- **Media**: Drive image proxy/listing, uploads, jewelry preview, OG images, folder creation (`serve-drive-image`, `get-drive-images`, `media-upload`, `fast-upload`, `cloudinary-upload`, `ambassador-photo`, `og-product`, `create-product-folders`, `generate-jewelry-preview`, `serve-drive-doc`)
- **Quotations**: save/report/deck rendering, provider & admin requests (`cotizacion-save`, `cotizacion-reports`, `cotizacion-deck`, `cotizacion-lamina`, `provider-quotations`, `quotation-requests`)
- **GoHighLevel (GHL) integration**: `ghl-create-order`, `ghl-search-products`, `ghl-sync-contact` — see "GoHighLevel Integration" note below
- **Fotosíntesis / AI**: `fotosintesis-ai`
- **Users & Analytics**: `validate`, `invitations`, `user-prefs`, `product-views`, `product-requests`, `feedback`, `vitrina`, `vitrina-select`
- **System**: `health`, `send-email`, `drive-diagnostics`, `drive-cleanup`, `mp-webhook`

A growing subset now read/write through Convex (`convex/`) instead of Google Sheets directly; the migration is in progress, not complete — see "Convex Backend" below.

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
APP_URL=https://tierramadre.app
```

## Design System

**Canonical barrel**: `src/design-system/index.ts` — ALL imports come from here.

```typescript
import {
  emeraldCore,
  goldAccent,
  emeraldAlpha,
  cssTransition,
  blurValues,
} from '@/design-system';
```

- Token files: `accents.ts`, `ios-semantic.ts`, `ios-typography.ts`, `layout.ts`, `motion.ts`, `glass.ts`
- Legacy compat: `src/design-system/tokens/legacy-compat.ts` (preserves `brand`, `lightTokens`, `darkTokens`)
- Color utilities: `emeraldAlpha()`, `whiteAlpha()`, `blackAlpha()`, `goldAlpha()` from `utils/colorUtils`
- **Do NOT** create a `src/design-system.ts` file — it shadows the barrel (module resolution: file > directory)

### DS3 ("Quiet Emerald") convergence — in progress

`src/design-system/v3.ts` is a composite layer (`ds3`, `getDS3`) that binds the canonical `quiet-emerald` tokens to shell/navigation/scroll foundations — it composes existing tokens, it does not fork them. This is an **active migration**: most recent commits (`feat(ds3): Phase 2 slice N — ...`) are converging existing components (Button, Card, Badge, MetricCard, TextField, Field, SegmentedControl, Sheet, TabBar) onto DS3. Spec lives at `DESIGN-SYSTEM-V3.md` (project root) — read it before touching design-system files or doing large component sweeps, since older components may still be pre-DS3.

## Development Guidelines

### Material-UI v6

- Use `ListItemButton` instead of `ListItem button`
- Use `alpha()` from `@mui/material/styles`
- Grid uses new API (no `item` prop)

### Port Management

Clean ports before dev server if conflicts occur.

## Vercel Deployment

**Project**: `tierra-madre-studio`
**URL**: https://tierramadre.app
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

## Convex Backend

`convex/` is a substantial and growing backend, not an afterthought — it sits alongside (and is progressively replacing) the Google Sheets data source. Root `convex.json` configures the deployment. Key files:

- **Domain data**: `products.ts`, `lots.ts`, `lotItems.ts`, `subLotes.ts`, `sequences.ts`, `clients.ts`, `sales.ts`, `commissions.ts`, `ambassadors.ts`, `asesorMovements.ts`, `providers.ts`, `vitrinas.ts`, `productViews.ts`, `invitations.ts`
- **Schema**: `schema.ts`
- **Ops/infra**: `adminOps.ts`, `crons.ts` (scheduled jobs), `http.ts` (HTTP actions), `migrations.ts`
- **AI/media**: `fotoSync.ts`, `fotosintesisAi.ts`
- **GoHighLevel (GHL) integration**: `ghl.ts` — see below

Use `npm run migrate:convex:dry` / `npm run migrate:convex` (backed by `scripts/migrate-sheets-to-convex.ts`) to move data from Google Sheets into Convex table-by-table. Some `api/` endpoints already read/write Convex directly (see "API Endpoints" above); others still hit Sheets — check the individual endpoint before assuming which store it uses.

### 🔒 CANDADO ACTIVO (2026-08-03) — no correr pulls manuales

**PROHIBIDO ejecutar `scripts/sync-sot-convex.mjs` ni ningún otro pull manual Sheets→Convex
hasta que esté desplegado el fix del default `F1`** (`convex/_lib/fotosintesisVocab.ts#normalizeCalidadForSheet`).

Ese `if (!s) return "F1"` inventa una calidad cuando el ítem no tiene ninguna, y `calidad` está
en el allowlist de pull: un pull estamparía F1 encima de los ítems que un humano dejó en blanco
a propósito. Los crons están verificados en `off` (`INVENTORY_PULL_CRON`, `FOTO_RECONCILE_CRON`),
así que hoy el único camino de contaminación es una persona corriendo el script — y una persona
con un script es un cron con dedos. Quitar este candado sólo cuando el fix esté en prod.

### Migración quirúrgica = rama desde `main`

Para correr una migración de Convex en producción, **nunca despliegues desde una rama de feature
larga**: `npx convex deploy` sube TODO `convex/`, así que una migración de 10 ítems puede
arrastrar un riel entero a prod como efecto colateral. El patrón es: rama desde `main` con SOLO
el bloque de la migración → push (trazabilidad de qué exactamente corrió) → `convex deploy` →
dry-run → respaldo → corrida → verificación → cherry-pick a la rama de feature → borrar la rama
temporal. Verifica antes con `npx convex function-spec --prod` que el diff de funciones sea
exactamente lo que esperas (`+N, −0`).

### Gotchas del espejo a Sheets (riel viejo)

- **`syncStatus: 'synced'` NO prueba aterrizaje.** Sólo dice que el POST devolvió 2xx.
  `api/admin-product-update.ts` puede responder 200 sin que la fila quede donde debe. La
  verificación real es leer la hoja y localizar por **cabecera nombrada**, nunca por posición
  ni por el conteo de pushes.
- **`values.append` con rango abierto ancla donde quiere.** El tab `Inventario` mide 102
  columnas y `FOTO_INVENTARIO_COLUMNS` cubre 57 (`A:BE`); con `range: 'Inventario!A:BE'` Sheets
  detectó la "tabla" a la derecha y escribió las 57 celdas desde **AT**, no desde A (2026-08-03,
  migración de sublotes). Peor: como la columna A quedó vacía, cada push siguiente no encontraba
  el itemId y **volvía a appendear** — un bucle de basura auto-alimentado, 21 filas por 10 ítems.
  Para escrituras quirúrgicas usa `values.update` posicional sobre un rango cerrado calculado.
- Estos dos defectos son exactamente lo que el espejo v4 vuelve imposible por diseño (upsert por
  cabecera nombrada, verificación de deriva, serialización que no inventa valores).

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
<img key={`img-${instanceId}-${src}`} src={src} />;
```

**4. Preload images before displaying galleries:**

```typescript
useEffect(() => {
  mediaItems.forEach((item) => {
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

## Context Providers

1. **AuthContext** - Authentication & roles
2. **GoogleAuthContext** - Google OAuth
3. **ThemeContext** - Light/dark theme
4. **LanguageContext** - i18n (ES/EN)
5. **PriceShareContext** - Price visibility
6. **TrackingContext** - Analytics events
7. **LiquidGlassContext** - Visual effects
8. **ScreenProtectionContext** - Screenshot detection
9. **CurrencyContext** - USD multiplier (x2/x3/x4) & currency toggle
10. **GlobalLoadingContext** - App-wide loading states
11. **NotificationContext** - Toast/notification system
12. **AppNavigatorContext** - App-level navigation state
13. **AppShellProviders** - Composes the app shell's provider tree
14. **EsmereoThemeContext** - Esmereogenesis-specific theming
15. **EsmereogenesisContext** - Esmereogenesis feature state
16. **NetworkStatusContext** - Online/offline detection

(Check `src/contexts/` directly — this list grows; treat it as a map, not a fixed count.)

## Part of CoomUnity Universe

Built with the CoomUnity agent ecosystem:

- **ARIA**: Frontend experience
- **KIRA**: Narrative design and copywriting

---

Made with emerald-green love in Colombia 💚
