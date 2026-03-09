# Tierra Madre Design System Documentation

**"Emerald iOS" — Where Colombian emerald luxury meets Apple's minimalist precision.**

Designed by ARIA, MOKSART & EUNOIA.

---

## Overview

The Tierra Madre design system is a comprehensive, token-based system built on React 18 + TypeScript with Material-UI v6. It draws from two primary influences: the rich heritage of Colombian emeralds and the clean precision of Apple's iOS Human Interface Guidelines. A third, less obvious influence is sacred geometry — the golden ratio (phi = 1.618) informs spacing scales, line heights, layout ratios, and even the font size progression.

The system is organized into three layers: **primitives** (raw values like colors and numbers), **semantic tokens** (meaningful mappings like "surface," "text," "interactive"), and **components** (Button, Card, Layout). Everything is exported through a single canonical barrel at `src/design-system/index.ts`.

---

## Architecture

```
src/design-system/
├── index.ts                  ← Canonical barrel (ALL imports come from here)
├── ThemeProvider.tsx          ← React context for light/dark theming
├── README.md                 ← Design philosophy & guidelines
├── tokens/
│   ├── index.ts              ← Token barrel with composite `tokens` object
│   ├── colors.ts             ← Emerald, gold, quality, surface palettes
│   ├── typography.ts         ← iOS Dynamic Type scale
│   ├── spacing.ts            ← 8pt grid + golden ratio
│   ├── motion.ts             ← Framer Motion variants & CSS transitions
│   ├── shadows.ts            ← Neutral, emerald, gold, semantic shadows
│   ├── glass.ts              ← iOS-style glassmorphism effects
│   ├── gradients.ts          ← Linear, radial, conic, mesh gradients
│   ├── opacity.ts            ← 20-level opacity scale
│   ├── overlays.ts           ← Overlay & thumbnail state styles
│   ├── charts.ts             ← Data visualization tokens
│   ├── accents.ts            ← Social, status, price tier colors
│   ├── ios-semantic.ts       ← iOS HIG label/fill/separator colors
│   ├── ios-typography.ts     ← iOS typography scale
│   ├── layout.ts             ← Fixed dimensions, border radius & z-index
│   ├── brand.ts              ← Sacred brand tokens
│   ├── liquid-glass.ts       ← iOS 26-style liquid glass effects
│   ├── motion.ts             ← Animation variants & spring physics
│   ├── legacy-compat.ts      ← Legacy token bridge (migration path)
│   ├── css-variables.css     ← CSS custom properties for all tokens
│   ├── primitives/           ← Raw value tokens
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── motion.ts
│   │   ├── shadows.ts
│   │   └── geometry.ts       ← Golden ratio, Fibonacci, sacred proportions
│   └── semantic/             ← Contextual token mappings
│       ├── brand.ts
│       ├── surface.ts
│       ├── text.ts
│       ├── interactive.ts
│       └── document.ts
├── components/
│   ├── Button/               ← Button with variants & sizes
│   ├── Card/                 ← Card, CardHeader, CardContent, CardFooter
│   ├── Layout/               ← Stack, VStack, HStack, Container
│   ├── DataDisplay/          ← (placeholder)
│   ├── Feedback/             ← (placeholder)
│   ├── Navigation/           ← (placeholder)
│   └── Overlay/              ← (placeholder)
├── utils/
│   └── colorUtils.ts         ← Alpha functions & iOS contrast helpers
├── mixins/                   ← Reusable style mixins
└── hooks/                    ← Design system hooks
```

**Import rule:** Always import using relative paths to `design-system` (e.g., `../../design-system`, `../design-system`). The `@/design-system` alias is **not configured** in tsconfig or vite — do not use it. Never import from individual token files unless a token is not re-exported from the barrel (e.g., `documentShadows` from `design-system/tokens`). Never create a `src/design-system.ts` file — it shadows the barrel due to module resolution (file beats directory).

---

## Color System

### Primary Palette — Emerald Core

The brand is built around `#00AE7A`, the logo green representing pure Colombian emerald.

| Token | Hex | Purpose |
|-------|-----|---------|
| `emeraldCore.primary` | `#00AE7A` | Logo green, primary actions |
| `emeraldCore.light` | `#33C194` | Sunlit emerald, lighter UI |
| `emeraldCore.lighter` | `#66D4AE` | Morning dew |
| `emeraldCore.lightest` | `#E6F7F1` | Emerald mist, tinted backgrounds |
| `emeraldCore.dark` | `#008C61` | Deep forest |
| `emeraldCore.darker` | `#006A48` | Earth's heart |
| `emeraldCore.darkest` | `#004830` | Mineral core |
| `emeraldCore.vibrant` | `#00D697` | Phi-lighter variant |
| `emeraldCore.essence` | `#007856` | Phi-darker variant |

### Secondary Palette — Gold Accent

Pre-Columbian gold heritage, used for premium and sublime quality tiers.

| Token | Hex | Purpose |
|-------|-----|---------|
| `goldAccent.primary` | `#D4AF37` | Pre-Columbian gold |
| `goldAccent.light` | `#E5C866` | Sunlight on gold |
| `goldAccent.lighter` | `#F5E6A3` | Gold dust |
| `goldAccent.lightest` | `#FDF8E8` | Golden dawn |
| `goldAccent.dark` | `#B8941F` | Ancient gold |
| `goldAccent.darker` | `#8F7318` | Earth gold |
| `goldAccent.darkest` | `#665210` | Deep treasure |

### Quality Tiers

Emerald quality is mapped to progressively deeper greens, each associated with a sacred frequency and chakra:

| Tier | Primary | Frequency | Symbolism |
|------|---------|-----------|-----------|
| Estándar | `#33C194` | 396Hz | Earth Foundation |
| Fina | `#00AE7A` | 528Hz | Heart of Nature |
| SuperFina | `#008C61` | 639Hz | Sacred Connection |
| Sublime | `#006A48` + gold accent | 852Hz | Divine Essence |

### Origin Colors (Colombian Mining Regions)

Each mining region has its own color identity: Muzo (classic green `#00AE7A`), Chivor (blue-green `#0099CC`), Coscuez (warm golden-green `#00B35C`), and Gachalá (bright clear `#00CC88`).

### Semantic Colors

| State | Main | Light bg | Dark variant |
|-------|------|----------|-------------|
| Success | `#00AE7A` | `#E6F7F1` | `#006A48` |
| Warning | `#F59E0B` | `#FEF3C7` | `#D97706` |
| Error | `#EF4444` | `#FEE2E2` | `#DC2626` |
| Info | `#3B82F6` | `#DBEAFE` | `#1D4ED8` |

### Surface & Background Tokens

**Light mode** uses white-to-gray surfaces (`#FFFFFF`, `#F9FAFB`, `#F3F4F6`) with text ranging from `#1F2937` (primary) through `#6B7280` (secondary) to `#9CA3AF` (tertiary).

**Dark mode** uses slate-blue surfaces (`#0F172A`, `#1E293B`, `#334155`) with text from `#F8FAFC` (primary) through `#CBD5E1` (secondary) to `#94A3B8` (tertiary).

### Accent & Social Colors

Social brand colors (WhatsApp `#25D366`, Instagram `#E4405F`, Facebook `#1877F2`), UI accents (purple, indigo, cyan, pink — each with light/dark variants), and medal colors (gold `#FFD700`, silver `#C0C0C0`, bronze `#CD7F32`).

### iOS Semantic Colors

Full implementation of Apple's iOS HIG semantic color system with labels (primary through quaternary), fills (three tiers), system backgrounds (standard and grouped), and separators — all with proper light/dark variants.

---

## Typography

### Font Families

| Token | Stack | Usage |
|-------|-------|-------|
| `fontFamilies.system` | `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Roboto, Arial, sans-serif` | All UI text |
| `fontFamilies.brand` | `"Libre Baskerville", Georgia, serif` | Headlines, display text |
| `fontFamilies.mono` | `"SF Mono", "Fira Code", "Monaco", Consolas, monospace` | Prices, numeric data |

### Type Scale (iOS Dynamic Type)

| Preset | Size | Weight | Line Height | Family | Usage |
|--------|------|--------|-------------|--------|-------|
| `largeTitle` | 34px (2.125rem) | 700 | 1.2 | Brand | Page titles |
| `title1` | 28px (1.75rem) | 700 | 1.25 | Brand | Section headings |
| `title2` | 22px (1.375rem) | 700 | 1.3 | Brand | Subsections |
| `title3` | 20px (1.25rem) | 600 | 1.35 | System | Card headers |
| `headline` | 17px (1.0625rem) | 600 | 1.4 | System | Important text |
| `body` | 17px (1.0625rem) | 400 | 1.5 | System | Main content |
| `callout` | 16px (1rem) | 400 | 1.4 | System | Secondary text |
| `subheadline` | 15px (0.9375rem) | 400 | 1.4 | System | Tertiary text |
| `footnote` | 13px (0.8125rem) | 400 | 1.4 | System | Captions, metadata |
| `caption1` | 12px (0.75rem) | 400 | 1.35 | System | Small text |
| `caption2` | 11px (0.6875rem) | 400 | 1.3 | System | Smallest readable |
| `overline` | 11px | 500 | 1.5 | System | Uppercase labels |
| `price` | 20px | 700 | 1.2 | Mono | Prices (tabular-nums) |
| `button` | 17px | 600 | 1.4 | System | Button text |

### Font Weights

Light (300), Normal (400), Medium (500), Semibold (600), Bold (700).

### Line Heights

Tight (1.2), Snug (1.3), Normal (1.5), Relaxed (1.618 — golden ratio), Loose (1.8).

### Letter Spacing

From `tighter` (-0.05em) through `normal` (0) to `widest` (0.1em). Headlines use tight negative tracking; overlines use wide positive tracking.

---

## Spacing System

### 8-Point Grid

All spacing is based on an 8px base unit. The golden ratio (phi) also informs layout proportions.

| Token | Value | Multiple |
|-------|-------|----------|
| `spacing.none` | 0px | 0x |
| `spacing.xs` | 4px | 0.5x |
| `spacing.sm` | 8px | 1x |
| `spacing.md` | 12px | 1.5x |
| `spacing.lg` | 16px | 2x |
| `spacing.xl` | 20px | 2.5x |
| `spacing.2xl` | 24px | 3x |
| `spacing.3xl` | 32px | 4x |
| `spacing.4xl` | 40px | 5x |
| `spacing.5xl` | 48px | 6x |
| `spacing.6xl` | 64px | 8x |
| `spacing.7xl` | 80px | 10x |
| `spacing.8xl` | 96px | 12x |

### Touch Targets (iOS HIG)

Minimum: 44px, Comfortable: 48px, Large: 56px.

### Component Heights

Buttons: 32/40/48px (sm/md/lg). Inputs: 40/48/56px. Cards: 280/320/360px. Header: 44px. Tab bar: 49px.

### Layout Ratios (Golden Ratio)

Content/sidebar split at 61.8%/38.2%. Hero height at 61.8vh. Card aspect ratios: portrait (1:1.618), landscape (1.618:1), square (1:1).

### Container Widths

sm: 600px, md: 900px, lg: 1200px, xl: 1536px.

### Breakpoints

xs: 0, sm: 600px, md: 960px, lg: 1280px, xl: 1920px.

### Border Radius

| Token | Value |
|-------|-------|
| `radius.none` | 0 |
| `radius.xs` | 4px |
| `radius.sm` | 6px |
| `radius.md` | 8px |
| `radius.lg` | 12px |
| `radius.xl` | 16px |
| `radius.2xl` | 20px |
| `radius.3xl` | 24px |
| `radius.full` | 9999px |

---

## Shadows & Elevation

### Default (Neutral) Shadows

Seven levels from `xs` (subtle 1px drop) through `2xl` (25px spread), plus `floating` (iOS-style 10px spread with 0.2 opacity) and `inset` for pressed states.

### Emerald-Tinted Shadows

Same scale as default but using `rgba(0, 174, 122, ...)` for brand-colored depth. Includes `glow` (20px emerald glow) and `primary` (14px for CTA buttons).

### Gold-Tinted Shadows

Gold variant using `rgba(212, 175, 55, ...)`. Includes `glow` and `secondary` shadow for premium elements.

### Card Elevation System

Five levels: `flat` (none), `resting` (subtle), `hover` (medium), `active` (pronounced), `floating` (maximum). Plus `emeraldHover` and `goldHover` for brand-colored card hovers.

### Focus Rings

Default: 2px white + 4px emerald ring. Error: white + red. Subtle: emerald with 0.5 opacity for dark backgrounds.

### Liquid Glass Shadows (iOS 26)

Five floating layer levels from `ground` through `modal`, plus specular highlights (`innerGlow`, `topEdge`, `combined`, `emerald`, `gold`) for polished glass effects.

---

## Z-Index (Semantic Layering)

A 12-level stacking context system that replaces all hardcoded `zIndex` values across the codebase. Defined in `tokens/layout.ts` and exported from the barrel.

| Token | Value | Usage |
|-------|-------|-------|
| `zIndex.hide` | -1 | Hidden elements |
| `zIndex.base` | 0 | Base layer |
| `zIndex.sticky` | 500 | Sticky headers, tab bars |
| `zIndex.fixed` | 900 | Fixed navigation, scroll-to-top |
| `zIndex.nav` | 999 | Navigation bar |
| `zIndex.float` | 1000 | Tab bar, floating action buttons |
| `zIndex.sheet` | 1100 | Sheets, drawers, dropdown overlays |
| `zIndex.sheetContent` | 1101 | Sheet content (above sheet backdrop) |
| `zIndex.panel` | 1200 | Comparison bar, floating panels |
| `zIndex.overlay` | 1400 | Cotizacion overlays |
| `zIndex.toast` | 2000 | Toasts, achievement notifications |
| `zIndex.modal` | 9999 | Modals, splash screens, lightboxes |

### Usage

```typescript
import { zIndex } from '../../design-system';

// Navigation bar
<AppBar sx={{ zIndex: zIndex.nav }} />

// Modal overlay
<Backdrop sx={{ zIndex: zIndex.modal }} />

// Floating action button
<Fab sx={{ zIndex: zIndex.float }} />
```

---

## Glassmorphism

iOS-style translucent materials with backdrop blur. Four glass families, each with multiple intensity variants:

### Light Glass

`default` (70% white, 10px blur), `frosted` (50% white, 20px blur), `ultraThin` (30% white, 8px blur), `regular` (35% white, 16px blur).

### Dark Glass

Same variants adapted for dark mode using `rgba(30, 41, 59, ...)` backgrounds with white-tinged borders at low opacity.

### Emerald Glass

Three variants: `light` (8% emerald tint), `dark` (12%), `vibrant` (15% + 250% saturation). Used for brand-accented surfaces.

### Gold Glass

Three variants: `light`, `dark`, `premium` (15% + 250% saturation). Used for premium/sublime quality content.

### Blur Scale

none (0px), xs (4px), sm (8px), md (12px), lg (16px), xl (20px), 2xl (24px), 3xl (32px).

### Usage

```typescript
import { glassLight, applyGlass } from '../../design-system';

// Apply glass effect to an sx prop
<Box sx={{ ...applyGlass(glassLight.frosted) }} />
```

---

## Gradients

### Emerald Gradients

Six variants: `light` (mist to pastel), `medium` (mid-green to primary), `deep` (primary to dark), `intense` (dark to darkest), `horizontal`, `vertical`.

### Gold Gradients

Four variants from `light` (dawn to dust) through `intense` (ancient gold to deep treasure).

### Quality Tier Gradients

Each quality tier has its own 135-degree gradient. Sublime uniquely blends emerald dark with a gold accent stop.

### Background Gradients

Page-level gradients for light mode, dark mode, emerald-tinted variants, hero sections, and subtle tints.

### Button Gradients

Primary (emerald with hover/active states), secondary (gold with hover), danger (red with hover).

### Special Gradients

Radial gradients for spotlight effects, hover glows, vignettes. Conic gradients for decorative emerald, gold, and sublime spectrums. Mesh gradients for complex multi-point backgrounds.

---

## Motion & Animation

### Timing

| Token | Duration | Usage |
|-------|----------|-------|
| `duration.instant` | 100ms | Micro-interactions |
| `duration.fast` | 200ms | Button states, toggles |
| `duration.base` | 300ms | Standard transitions |
| `duration.slow` | 500ms | Reveals, emphasis |
| `duration.slower` | 800ms | Complex sequences |

### Easing Curves

| Token | Bezier | Usage |
|-------|--------|-------|
| `easing.standard` | (0.4, 0, 0.2, 1) | Most transitions |
| `easing.decelerate` | (0, 0, 0.2, 1) | Entering elements |
| `easing.accelerate` | (0.4, 0, 1, 1) | Exiting elements |
| `easing.spring` | (0.34, 1.56, 0.64, 1) | Bouncy interactions |
| `easing.smooth` | (0.25, 0.1, 0.25, 1) | Smooth ease-out |

### Spring Physics (Framer Motion)

| Preset | Stiffness | Damping | Character |
|--------|-----------|---------|-----------|
| `spring.bouncy` | 400 | 10 | Playful |
| `spring.smooth` | 300 | 20 | Standard |
| `spring.gentle` | 200 | 30 | Subtle |
| `spring.snappy` | 500 | 25 | Responsive |

### Pre-built Variants

`cardVariants` — hover (scale 1.02, y -8), tap (scale 0.98), focus (scale 1.01, y -4).

`fadeInUp` — enter from y:20 with opacity, exit to y:-10.

`staggerContainer` / `staggerItem` — stagger children at 100ms intervals.

`scaleIn` — scale from 0.9 with spring physics.

`accordionVariants` — height animation for expand/collapse.

`pulse` — repeating scale/opacity loop for active indicators.

`shimmer` — loading skeleton animation.

### CSS Transition Strings

For use in MUI `sx` props or inline styles: `cssTransition.fast` (100ms), `.default` (200ms), `.slow` (300ms), `.spring` (300ms with overshoot), `.colors` (color-only transitions).

---

## Opacity Scale

A 20-level opacity system from `transparent` (0) to `opaque` (1), with semantically named stops:

`whisper` (0.03), `subtle` (0.05), `glass` (0.06), `light` (0.08), `soft` (0.1), `guide` (0.12), `medium` (0.15), `regular` (0.2), `elevated` (0.25), `prominent` (0.3), `strong` (0.35), `overlay` (0.4), `half` (0.5), `muted` (0.6), `intense` (0.7), `heavy` (0.8), `solid` (0.85), `near` (0.9), `tooltip` (0.95).

---

## Color Utility Functions

### Alpha Helpers

All alpha functions accept either a raw number (0-1) or an opacity token key string.

```typescript
import { whiteAlpha, blackAlpha, emeraldAlpha, goldAlpha } from '../../design-system';

whiteAlpha(0.1)          // "rgba(255, 255, 255, 0.1)"
blackAlpha('medium')     // "rgba(0, 0, 0, 0.15)"
emeraldAlpha(0.2)        // alpha(#00AE7A, 0.2)
goldAlpha('prominent')   // alpha(#D4AF37, 0.3)
```

Additional: `emeraldDarkAlpha`, `errorAlpha`, `successAlpha`, `warningAlpha`.

### Theme-Aware Helpers

`textAlpha(isLight, value)` — returns black-on-light or white-on-dark text.

`borderAlpha(isLight, value)` — theme-aware border colors.

`surfaceAlpha(isLight, value)` — theme-aware surface overlays.

### iOS Contrast Tokens (WCAG AA)

`iosLabels` — four-tier label hierarchy (primary through quaternary) with documented contrast ratios.

`textOnGlass` — contrast-safe text for dark glass, light glass, and emerald accent surfaces.

`getContrastText(background, level)` — returns WCAG AA compliant color for any background type.

`iosFills` — three-tier fill system for interactive elements (buttons, inputs, toggles).

`iosSeparators` — standard and opaque separator colors.

---

## Sacred Geometry

The design system incorporates mathematical proportions from sacred geometry:

**Golden Ratio (Phi):** 1.618033988749895, used for layout splits (61.8%/38.2%), line heights (1.618), spacing progressions, and container sizing.

**Fibonacci Sequence:** [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233], informing shadow depth progression.

**Golden Scale:** Base size (4px) multiplied by powers of phi — xs (4), sm (6), md (10), base (17), lg (27), xl (44), 2xl (72), 3xl (116).

**Harmonic Ratios:** Musical intervals as visual proportions — unison (1:1), octave (1:2), fifth (2:3), fourth (3:4), third (4:5).

**Emerald Cut Geometry:** Border radius tokens derived from the angular proportions of an emerald-cut gemstone.

---

## Components

### Button

Exported as `Button` with typed variants (`primary`, `secondary`, `tertiary`, `danger`) and sizes (`sm`, `md`, `lg`). Follows the rule of one primary button per view.

### Card

Composite component: `Card`, `CardHeader`, `CardContent`, `CardFooter`. Variants include `elevated` (default, with shadow), `glass` (glassmorphic), and `flat` (border only).

### Layout

Stack primitives: `Stack` (configurable direction), `VStack` (vertical), `HStack` (horizontal), `Container` (max-width wrapper). All accept spacing tokens and alignment props.

---

## Theming

### ThemeProvider

Wraps the application with a React context providing the current mode (`light` | `dark`), toggle/set functions, the full token object, and system preference detection. Theme persists to localStorage and listens for OS-level `prefers-color-scheme` changes.

```tsx
import { ThemeProvider, useTheme } from '../design-system/ThemeProvider';

// In a component:
const { mode, toggleTheme, tokens } = useTheme();
```

### CSS Custom Properties

All tokens are also available as CSS variables via `css-variables.css`, enabling styling with `var(--surface-primary)`, `var(--text-primary)`, `var(--spacing-md)`, etc.

### MUI Theme Integration

The design system works alongside Material-UI v6's theming. Use `ListItemButton` (not `ListItem button`), the new Grid API (no `item` prop), and `alpha()` from `@mui/material/styles`.

---

## Accessibility

The system is designed for WCAG 2.2 AA compliance:

**Color contrast** — Primary text achieves 21:1 (AAA). Secondary label text achieves approximately 7:1 (AA). iOS label hierarchy has documented contrast ratios for each tier.

**Touch targets** — Minimum 44x44px per iOS HIG. All button sizes meet or exceed this.

**Focus states** — Emerald focus rings (2px white + 4px emerald) with error and subtle variants.

**Glass surfaces** — Dedicated `textOnGlass` tokens ensure readable text on translucent backgrounds with documented contrast ratios.

---

## Usage Patterns

### Importing Tokens

```typescript
// Always from the barrel via relative path (adjust depth to match file location)
import { emeraldCore, goldAccent, spacing, typography, cssTransition, zIndex } from '../../design-system';

// For tokens not in the barrel, import from sub-modules
import { documentShadows } from '../../design-system/tokens';
```

### Applying Glass Effects

```tsx
import { glassLight, applyGlass } from '../../design-system';
<Box sx={{ ...applyGlass(glassLight.frosted), borderRadius: radius.lg }} />
```

### Theme-Aware Styling

```tsx
import { emeraldAlpha, textAlpha } from '../../design-system';
const { mode } = useTheme();
const isLight = mode === 'light';

<Box sx={{
  background: emeraldAlpha(isLight ? 0.05 : 0.1),
  color: textAlpha(isLight, 'solid'),
}} />
```

### Animated Components

```tsx
import { motion } from 'framer-motion';
import { cardVariants, fadeInUp, staggerContainer } from '../../design-system';

<motion.div variants={staggerContainer} initial="initial" animate="animate">
  <motion.div variants={fadeInUp}>Content</motion.div>
</motion.div>
```

---

## Component Coverage (Audit v2 — March 2026)

The design system audit connected ~90+ components to the token system, eliminating hardcoded values across the codebase.

### What was connected

**Z-Index tokens** (~56 files) — Every hardcoded `zIndex` value replaced with semantic tokens (`zIndex.nav`, `zIndex.float`, `zIndex.modal`, etc.). Covers navigation bars, floating buttons, sheets, drawers, modals, overlays, comparison bar, toasts, and splash screens.

**Typography tokens** (~20 files) — Hardcoded `fontWeight` numbers replaced with `fontWeights.semibold`, `.bold`, `.medium`, `.normal`. Hardcoded `fontFamily` strings replaced with `fontFamilies.mono`, `.brand`, `.system`.

**Shadow & transition tokens** (~15 files) — Hardcoded `boxShadow` strings replaced with `defaultShadows`, `emeraldShadows`, `cardShadows` tokens. Hardcoded CSS `transition` strings replaced with `cssTransition.fast`, `.default`, `.slow`.

**Context providers** — `NotificationContext`, `ThemeContext` fully connected to semantic tokens (colors, radius, fontSizes, fontWeights).

### Tokens NOT in the barrel

Some tokens exist in sub-modules but are intentionally not re-exported from the top-level barrel (`src/design-system/index.ts`):

| Token | Import from | Notes |
|-------|-------------|-------|
| `documentShadows` | `design-system/tokens` | Document-specific shadows |
| `floatingLayerShadows` | `design-system/tokens/shadows` | iOS 26 liquid glass layers |

### fontWeights mapping

The barrel exports `fontWeights` from `tokens/typography.ts`. Use `normal` (not `regular`):

| Token | Value |
|-------|-------|
| `fontWeights.light` | 300 |
| `fontWeights.normal` | 400 |
| `fontWeights.medium` | 500 |
| `fontWeights.semibold` | 600 |
| `fontWeights.bold` | 700 |

---

*Built with emerald-green love in Colombia. Version 2.0 — "Emerald iOS" Design System. Audited March 2026.*
