# Tierra Madre Studio

## Project Overview
Internal Advertising Agency Tool for Colombian Emeralds - "Esencia y Poder"

**Purpose**: Create professional marketing materials for Tierra Madre's Colombian emerald collection, including name generation, catalog creation, and Instagram planning.

## Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **UI Framework**: Material-UI v6
- **PDF Generation**: jsPDF + html2canvas
- **Storage**: Google Drive (media), LocalStorage (app state)
- **PWA**: vite-plugin-pwa
- **AI Integration**: Groq API (GROQ_API_KEY in .env)

## Project Structure
```
src/
├── components/     # React components
├── data/          # Static data (emerald names, etc.)
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── utils/         # Utility functions
├── App.tsx        # Main application
├── main.tsx       # Entry point
└── theme.ts       # MUI theme configuration
```

## Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production (tsc + vite)
npm run preview  # Preview production build
```

## Key Features
1. **AI-Powered Name Generator**: Smart suggestions from 80+ curated names
2. **Google Drive Media Storage**: All product photos and videos stored in organized Drive folders
3. **Product Gallery**: Multiple images per product with automatic retry on load failures
4. **PDF Catalog Export**: Professional catalogs with jsPDF
5. **Instagram Planner**: Visual 3x3 grid preview
6. **AI Slide Generator**: Create presentations with Groq AI

## Development Guidelines

### Material-UI v6 Notes
- Use `ListItemButton` instead of `ListItem button`
- Use `alpha()` function from `@mui/material/styles` for transparency
- Grid uses new API (no `item` prop needed)

### Environment Variables
Required in `.env`:
```
VITE_GROQ_API_KEY=your_groq_api_key
```

For email notifications (Vercel environment variables):
```
RESEND_API_KEY=re_xxxxxxxxxxxx          # Resend API key
ADMIN_EMAILS=admin1@email.com,admin2@email.com  # Comma-separated admin emails
EMAIL_FROM=Tierra Madre <noti@domain.com>  # Optional: custom sender
APP_URL=https://tierra-madre-studio.vercel.app  # Optional: override app URL
```

### Port Management
Always clean ports before running dev server if conflicts occur.

## Vercel Deployment

**IMPORTANT**: This project deploys ONLY to `tierra-madre-studio` on Vercel.

### Rules
- **NEVER** create new Vercel projects
- **NEVER** run `vercel` without specifying the project
- Deployments are automatic on push to `main` branch
- The project is linked via `.vercel/project.json`

### Project Details
- **Project Name**: `tierra-madre-studio`
- **Production URL**: https://tierra-madre-studio.vercel.app
- **Organization**: kvn3tojgames

### Manual Deploy (if needed)
```bash
vercel --prod  # Uses existing project link
```

### Safari Cache Busting (Required on Deploy)
Before each deployment, update the `APP_VERSION` in `index.html`:
```javascript
var APP_VERSION = 'YYYY.MM.DD.N';  // e.g., 2026.01.01.1
```
This forces Safari to refresh its aggressive cache on version mismatch.

### Git Commit Rules
**IMPORTANT**: Always include ALL modified files in every commit to avoid multiple deployments:
1. Run `npm run build` before committing (this auto-updates version files)
2. Run `git status` and include ALL modified files in the commit, not just files changed in the current chat
3. Always include these version files:
   - `index.html` (contains APP_VERSION)
   - `public/version.json` (contains version metadata)
4. This ensures one commit = one Vercel deployment

## Media Storage Architecture

### Primary Image Source: Google Drive Product Folders
Product images are sourced from **Google Drive product folders** (NOT from Google Sheets columns).

Folder naming convention: `{item} - {name}/` (e.g., `32 - Venus/`)
```
products/
  ├── 32 - Venus/
  │   ├── hero.jpg        <- First image used as thumbnail
  │   ├── detail-1.jpg
  │   └── video.mp4
  ├── 45 - Esperanza/
  │   └── hero.jpg
  ...
```

### Image Priority Order (in `useTreasure.ts`)
1. **Gallery** - Manual gallery uploads (localStorage)
2. **Legacy media** - localStorage legacy entries
3. **Batch thumbnails** - First image from Google Drive product folders (PRIMARY)
4. **Sheets imageUrl** - Fallback from Google Sheets column K (DEPRECATED)
5. **Original imagen** - Static data fallback

### How It Works
- `/api/get-batch-thumbnails` scans Drive `products/` folder
- Extracts item number from folder name (e.g., `32` from `32 - Venus`)
- Returns first image from each folder as the product thumbnail
- Images served via `/api/serve-drive-image?fileId={id}` proxy

### Image Loading with Auto-Retry
Images served from Google Drive proxy API with automatic retry logic:
- Retries failed images up to 3 times
- Exponential backoff (1s, 2s, 4s delays)
- Cache-busting on retries
- Logging for debugging

### Legacy Support
- **Cloudinary URLs**: Maintained for backward compatibility with legacy image URLs
- **Sheets imageUrl column**: Kept as fallback but NOT the primary source

## Part of CoomUnity Universe
Built with the CoomUnity agent ecosystem:
- **ARIA**: Frontend experience
- **KIRA**: Narrative design and copywriting

---
Made with emerald-green love in Colombia.
