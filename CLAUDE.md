# Tierra Madre Studio

## Project Overview
Internal Advertising Agency Tool for Colombian Emeralds - "Esencia y Poder"

**Purpose**: Create professional marketing materials for Tierra Madre's Colombian emerald collection, including name generation, catalog creation, and Instagram planning.

## Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **UI Framework**: Material-UI v6
- **PDF Generation**: jsPDF + html2canvas
- **Storage**: LocalStorage persistence
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
2. **Batch Upload**: Multiple emerald photos at once
3. **Individual Upload**: Detailed metadata for single emeralds
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

### Port Management
Always clean ports before running dev server if conflicts occur.

## Part of CoomUnity Universe
Built with the CoomUnity agent ecosystem:
- **ARIA**: Frontend experience
- **KIRA**: Narrative design and copywriting

---
Made with emerald-green love in Colombia.
