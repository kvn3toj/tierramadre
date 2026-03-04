# Figma MCP Design System Rules - Tierra Madre Studio

> Colombian Emeralds Catalog & Sales Platform - "Esencia y Poder"
> Design Philosophy: **"Luxury Minimalism meets iOS HIG"**

---

## 1. Token Definitions

### Color Tokens

**Primary source:** `src/design-system/tokens/primitives/colors.ts`
**Semantic mapping:** `src/design-system/tokens/semantic/brand.ts`, `surface.ts`, `text.ts`, `interactive.ts`
**CSS variables:** `src/design-system/tokens/css-variables.css`

#### Brand Colors (Emerald Core)
```
Primary:       #00AE7A  (Emerald 500 - logo green)
Primary Hover: #008C62  (Emerald 600)
Primary Active:#047857  (Emerald 700)
Light:         #33C194
Lighter:       #66D4AE
Lightest:      #E6FFF7  (Emerald 50 - subtle backgrounds)
Dark:          #008C61
Darker:        #006A48
Darkest:       #004830
Vibrant:       #00D697
Accent:        #6EE7B7  (Emerald 300)
```

#### Secondary Colors
```
Gold Accent:   #D4AF37  (luxury accent)
Gold Light:    #F5D76E
Metallic Silver: #6B7A8A (Titanium 500)
Silver Light:  #B4BFC9
Silver Dark:   #3A4654
```

#### Surface Colors
| Token | Light | Dark |
|-------|-------|------|
| surface-primary | `#FFFFFF` | `#000000` |
| surface-secondary | `#F2F2F7` | `#1C1C1E` |
| surface-tertiary | `#FAFAFA` | `#0A0E13` |
| card-bg | `#FFFFFF` | `#1C1C1E` |
| modal-bg | `#FFFFFF` | `#1C1C1E` |

#### Text Colors
| Token | Light | Dark | Contrast |
|-------|-------|------|----------|
| text-primary | `#000000` | `#FFFFFF` | WCAG AAA 21:1 |
| text-secondary | `#3A4654` | `#B4BFC9` | WCAG AA ~7:1 |
| text-tertiary | `#6B7A8A` | `#6B7A8A` | WCAG AA 4.5:1 |
| text-disabled | `#8A99A8` | `#515F6E` | - |
| brand-emerald | `#00AE7A` | `#33FFBF` | - |

#### Borders
```
border-default: #D1D9E0 (light) / #38383A (dark)
border-subtle:  #E8ECEF (light) / #2C2C2E (dark)
border-strong:  #B4BFC9 (light) / #48484A (dark)
border-focus:   #00AE7A (both modes)
```

#### Status Colors
```
success: #34C759 (light) / #30D158 (dark)
warning: #FF9500 (light) / #FF9F0A (dark)
error:   #FF3B30 (light) / #FF453A (dark)
info:    #007AFF (light) / #0A84FF (dark)
```

#### Glass Morphism
```
glass-bg:     rgba(255,255,255,0.7)  (light) / rgba(0,0,0,0.5) (dark)
glass-border: rgba(255,255,255,0.3)  (light) / rgba(255,255,255,0.1) (dark)
backdrop:     blur(20px) saturate(180%)
```

#### Shadows
```
shadow-xs:  0 1px 2px rgba(15,23,42,0.04)
shadow-sm:  0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)
shadow-md:  0 4px 6px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.04)
shadow-lg:  0 10px 15px rgba(15,23,42,0.08), 0 4px 6px rgba(15,23,42,0.04)
shadow-emerald: 0 4px 14px rgba(0,174,122,0.25)
```

#### Gradients
```
emerald:       linear-gradient(135deg, #34D399 0%, #00AE7A 50%, #008C62 100%)
emerald-dark:  linear-gradient(135deg, #6EE7B7 0%, #34D399 50%, #00AE7A 100%)
silver:        linear-gradient(135deg, #E8ECEF 0%, #B4BFC9 50%, #6B7A8A 100%)
emerald-radial: radial-gradient(circle, #00AE7A, #004830)
```

### Spacing Tokens

**Source:** `src/design-system/tokens/primitives/spacing.ts`
**System:** 8-point grid

```
none:  0px
xxs:   4px   (0.5x)
xs:    8px   (1x base)
sm:    12px  (1.5x)
md:    16px  (2x) ← iOS standard
lg:    20px  (2.5x)
xl:    24px  (3x)
xxl:   32px  (4x)
xxxl:  48px  (6x)
xxxxl: 64px  (8x)
```

#### iOS Dimensions
```
touch-target:    44px (minimum tappable area)
list-item:       44px
nav-bar:         44px
tab-bar:         49px
button-sm:       36px
button-md:       50px
button-lg:       56px
text-field-mobile: 52px
text-field-desktop: 40px
```

#### Container Widths
```
mobile:  max-width 428px,  padding 16px
tablet:  max-width 768px,  padding 24px
desktop: max-width 1024px, padding 32px
```

#### Layout Ratios (Golden Ratio)
```
content: 61.8%
sidebar: 38.2%
```

### Typography Tokens

**Source:** `src/design-system/tokens/primitives/typography.ts`

#### Font Families
```
display: -apple-system, "SF Pro Display", system-ui, sans-serif  (titles 20pt+)
text:    -apple-system, "SF Pro Text", system-ui, sans-serif     (body 19pt-)
mono:    ui-monospace, "SF Mono", "Fira Code", Monaco, monospace
luxury:  "Playfair Display", Georgia, serif                       (product names)
brand:   "Libre Baskerville", Georgia, serif                      (headings)
```

#### iOS Text Styles → MUI Typography Mapping
| iOS Style | MUI Variant | Size | Weight | Line Height |
|-----------|-------------|------|--------|-------------|
| largeTitle | h1 | 34px | 700 (bold) | 41px |
| title1 | h2 | 28px | 700 (bold) | 34px |
| title2 | h3 | 22px | 700 (bold) | 28px |
| title3 | h4 | 20px | 600 (semi) | 25px |
| headline | h5 | 17px | 600 (semi) | 22px |
| subhead | h6 | 15px | 600 (semi) | 20px |
| callout | subtitle1 | 16px | 500 (medium) | 21px |
| footnote | subtitle2 | 13px | 500 (medium) | 18px |
| body | body1 | 17px | 400 (regular) | 22px |
| subhead | body2 | 15px | 400 (regular) | 20px |
| headline | button | 17px | 600 (semi) | 22px |
| caption1 | caption | 12px | 400 (regular) | 16px |
| caption2 | overline | 11px | 400 (regular) | 13px |

**Note:** h1-h3 use serif `fontFamily: "Playfair Display"`, all others use system font.
Buttons have `textTransform: 'none'` (no uppercase).

### Motion Tokens

**Source:** `src/design-system/tokens/motion.ts`

```
duration-instant: 100ms
duration-fast:    200ms
duration-normal:  300ms
duration-slow:    400ms / 500ms
duration-slower:  800ms

easing-standard:  cubic-bezier(0.4, 0.0, 0.2, 1)
easing-spring:    cubic-bezier(0.34, 1.56, 0.64, 1)

spring-bouncy:  { stiffness: 400, damping: 10 }
spring-smooth:  { stiffness: 300, damping: 20 }
spring-gentle:  { stiffness: 200, damping: 30 }
```

#### Card Interaction States
```
hover:  scale(1.02), translateY(-8px)
active: scale(0.98)
```

### Border Radius
```
xs:   8px
sm:   12px  (cards, inputs)
md:   16px  (modals, sheets)
lg:   20px  (large containers)
xl:   24px
pill:  9999px (chips, badges)
```

---

## 2. Component Library

### Architecture
- **Location:** `src/design-system/components/` + `src/components/shared/`
- **Pattern:** Feature-based modules with compound components
- **Framework:** React 18.3 + TypeScript + Material-UI v6

### Design System Components (`src/design-system/components/`)

#### Button (4 variants x 3 sizes)
```tsx
<Button variant="primary | secondary | tertiary | danger" size="sm | md | lg">
// Heights: sm=36px, md=50px, lg=56px
// Border radius: 12px
// Active state: scale(0.98)
// No text-transform (natural casing)
```

#### Card (Compound Pattern)
```tsx
<Card variant="elevated | outlined | filled">
  <CardHeader title="..." subtitle="..." avatar={} action={} />
  <CardContent compact?>{children}</CardContent>
  <CardFooter align="left | center | right | space-between">
    <Button>Action</Button>
  </CardFooter>
</Card>
```

#### Layout Primitives
```tsx
<Stack direction="vertical | horizontal" spacing={4} align="center">
<VStack spacing={3}>  // Vertical shorthand
<HStack spacing={2}>  // Horizontal shorthand
<Container maxWidth="lg" padding center>
```

### Shared Components (`src/components/shared/`)

| Component | Purpose |
|-----------|---------|
| `ProgressiveImage` | Lazy-load with LQIP blur-up, retry logic, watermark |
| `MetricCard` | Analytics card with sparkline trends |
| `GlassCard` | iOS glassmorphism wrapper |
| `ChunkErrorBoundary` | Vite code-split error recovery |
| `ConfirmDialog` | Confirmation modals |
| `Breadcrumbs` | Navigation breadcrumbs |
| `LiveRegion` | ARIA live regions (accessibility) |
| `SectionHeader` | Section headings |
| `LoadingFallback` | Loading state placeholders |
| `ScrollToTop` | Scroll restoration |

### No Storybook
Documentation via TypeScript interfaces, JSDoc, and `src/design-system/README.md`.

---

## 3. Frameworks & Libraries

### Core Stack
| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.3 | UI framework |
| TypeScript | 5.6 (strict) | Type safety |
| Vite | 5.4 | Build tool & dev server |
| Material-UI | v6 | Component library |
| Emotion | 11.13 | CSS-in-JS (MUI's styling engine) |
| Framer Motion | 12.x | Animations |
| React Router | 7.9 | Routing |

### Supporting Libraries
| Library | Purpose |
|---------|---------|
| lucide-react | Primary icon library |
| @mui/icons-material | Secondary icons |
| date-fns | Date formatting |
| jspdf + html2canvas | PDF generation |
| react-window | Virtualized lists |
| react-intersection-observer | Lazy loading |
| qrcode.react | QR code generation |
| react-easy-crop | Image cropping |
| react-dropzone | File uploads |

---

## 4. Asset Management

### Image Storage
- **Primary:** Google Drive `products/` folder → served via `/api/serve-drive-image?fileId={id}` proxy
- **Static:** `src/assets/` (watermarks, logos) + `public/catalog-media/` (slides)
- **CDN:** Cloudinary for optimized delivery

### Image Loading Pattern
```tsx
// Synchronous cache init (prevents blinking)
const [thumbnails] = useState(() => {
  const cached = localStorage.getItem('thumbnails');
  return cached ? JSON.parse(cached) : {};
});

// Progressive loading with LQIP
<ProgressiveImage
  src={url}
  alt="description"
  aspectRatio="1/1"
  enableLQIP={true}
  quality="good"
/>
```

### Image Proxy Retry Logic
- 3 retries with exponential backoff (1s, 2s, 4s)
- Cache-busting on failures
- Unique instance keys to prevent DOM reuse

---

## 5. Icon System

### Primary: Lucide React
```tsx
import { MapPin, User, Images, Eye, Heart, Gem } from 'lucide-react';
<Images size={14} />  // Inline sizing
```

### Secondary: MUI Icons
```tsx
import { PlayArrow, Instagram, WhatsApp } from '@mui/icons-material';
<WhatsApp sx={{ fontSize: 20 }} />  // sx-based sizing
```

### Tertiary: Custom SVG
- Brand elements in `src/components/brand/BrandElements.tsx`
- Progress rings in `src/components/gamification/ProgressRing.tsx`
- Inline SVG for specialized visuals

### Convention
- Lucide for general UI icons (lightweight, tree-shakeable)
- MUI Icons for social/system icons
- Custom SVG for branded/unique graphics

---

## 6. Styling Approach

### Primary: MUI `sx` Prop
```tsx
<Box sx={{
  bgcolor: 'var(--surface-primary)',
  borderRadius: 2.5,
  p: { xs: 1, sm: 2, md: 3 },  // Responsive
  '&:hover': { borderColor: emeraldCore.dark },
}}>
```

### Secondary: MUI `styled()` API
```tsx
const StyledCard = styled(Paper)(({ theme }) => ({
  borderRadius: 12,
  padding: theme.spacing(2),
}));
```

### CSS Variables for Runtime Theming
```css
/* Light/dark switching via data-theme attribute */
:root { --surface-primary: #FFFFFF; --text-primary: #000000; }
[data-theme="dark"] { --surface-primary: #000000; --text-primary: #FFFFFF; }
```

### No CSS Modules or Sass
Everything is component-scoped via MUI's `sx` or `styled()`.

### Responsive Design
```tsx
// MUI breakpoints
const breakpoints = { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 };

// Responsive sx syntax
sx={{ px: { xs: 1, sm: 2, md: 3, lg: 2 } }}

// useMediaQuery hook
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
```

### Global Styles (`css-variables.css`)
- iOS safe area insets: `env(safe-area-inset-*)`
- Tap highlight: `transparent`
- Font smoothing: antialiased
- Focus visible: `2px solid var(--border-focus)`
- Reduced motion: respects `prefers-reduced-motion`
- PWA standalone: fixed body with `-webkit-fill-available`
- iOS Safari: `font-size: 16px !important` on inputs (prevents zoom)

---

## 7. Project Structure

```
src/
├── components/          # 27 feature modules
│   ├── shared/          # 19 reusable components
│   ├── treasure/        # Product browser (12 files)
│   ├── cotizacion/      # Quotation generator (10 files)
│   ├── ambassador/      # Ambassador profiles (8 files)
│   ├── analytics/       # Analytics dashboards (12+ files)
│   ├── home/            # Home page sections (9 files)
│   ├── ios/             # iOS-specific UI (16 subdirs)
│   └── [20 more modules]
├── contexts/            # 11 context providers
├── hooks/               # 57 custom hooks
├── pages/               # 14 route-level components
├── design-system/       # Tokens + design components
│   ├── tokens/          # Primitives + semantics + CSS vars
│   ├── components/      # Button, Card, Layout
│   ├── utils/           # Color utilities
│   └── mixins/          # Glass morphism mixins
├── types/               # Domain-specific TypeScript interfaces
├── utils/               # 24 utility modules
├── data/                # Static data files
├── locales/             # i18n (ES/EN)
├── services/            # API services
└── assets/              # Static media

api/                     # 27 Vercel serverless functions
├── _lib/                # Shared API utilities (7 files)
└── [endpoint].js        # Individual endpoints
```

### Feature Module Pattern
```
feature/
├── Feature.tsx          # Main component
├── components/          # Local sub-components
├── hooks/               # Local hooks
├── types/               # Local types
├── utils/               # Local utilities
├── constants/           # Feature constants
├── styles.ts            # Shared styles
└── index.ts             # Barrel export
```

### State Management
- **Context API** (11 providers) - Auth, theme, language, notifications, tracking
- **Custom Hooks** (57) - Business logic, data fetching, UI behavior
- **LocalStorage** - Persistence (filters, preferences, drafts)
- **No Redux** - Deliberate choice for simplicity

---

## 8. MUI Theme Integration

**File:** `src/theme.ts`

### Palette
```typescript
palette: {
  mode: 'light',
  primary: { main: '#00AE7A', light: '#34D399', dark: '#008C62' },
  secondary: { main: '#D4AF37', light: '#F5D76E' },
  background: { default: '#FAFAFA', paper: '#FFFFFF' },
  text: { primary: '#111827', secondary: '#6B7280', disabled: '#9CA3AF' },
  divider: '#E5E7EB',
  action: {
    active: '#00AE7A',
    hover: 'rgba(0,174,122,0.08)',
    selected: 'rgba(0,174,122,0.12)',
  },
}
```

### Component Overrides (20+)
- **MuiButton:** 44px height, scale(0.98) active, textTransform: none
- **MuiCard:** CSS var colors, rounded corners
- **MuiTextField:** iOS focus states
- **MuiChip:** pill shape (borderRadius: 9999)
- **MuiIconButton:** 44x44px touch target
- **MuiDialog:** iOS modal styling
- **MuiMenu:** Backdrop blur
- **MuiDrawer:** Rounded corners, bottom sheet
- **MuiSwitch:** iOS toggle (51x31px)
- **MuiFab:** Floating action button

---

## 9. Code Generation Rules

When generating code from Figma designs for this project:

1. **Use MUI components** as the base, with `sx` prop for styling
2. **Import design tokens** from `src/design-system/tokens/` not raw hex values
3. **Use CSS variables** (`var(--surface-primary)`) for theme-aware colors
4. **Apply iOS dimensions** - 44px touch targets, 12px border radius, 8pt grid
5. **Use Framer Motion** for animations with project spring tokens
6. **Import icons from lucide-react** first, MUI icons as fallback
7. **Follow the responsive pattern**: `{ xs: ..., sm: ..., md: ... }`
8. **No uppercase buttons** - use `textTransform: 'none'`
9. **Serif fonts for headings** (h1-h3), system font for body
10. **Glass morphism** via `var(--glass-bg)` + `backdrop-filter: blur(20px)`
11. **Images via ProgressiveImage** component with LQIP
12. **Place new components** in the appropriate feature module under `src/components/`

### Import Pattern
```tsx
// 1. External
import { useState } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';

// 2. Design tokens
import { emeraldCore } from '../../design-system/tokens/colors';

// 3. Shared components
import { ProgressiveImage } from '../../components/shared';

// 4. Icons
import { Gem, Eye } from 'lucide-react';

// 5. Hooks
import { useTheme } from '../../contexts/ThemeContext';

// 6. Types
import type { TreasureItem } from '../../types';
```

---

*Generated for Figma MCP integration with Tierra Madre Studio*
*Last updated: 2026-02-19*
