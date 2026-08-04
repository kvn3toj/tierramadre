# Emerald iOS Design System

**Where Colombian emerald luxury meets Apple's minimalist precision.**

## Philosophy

The "Emerald iOS" design system is a fusion of two worlds:

- **Colombian Emerald Essence**: Organic, precious, vibrant green that represents the earth's treasure
- **iOS Minimalism**: Clean, spacious, purposeful design that respects the user's attention

**Visual Mantra**: _"Clarity over decoration, depth over surface, motion that breathes"_

---

## Design Principles

### 1. Luxury Minimalism

Every element serves a purpose. We achieve premium feel through refinement, not ornamentation.

- **Clean Hierarchy**: Clear visual order guides the eye naturally
- **Generous Spacing**: White space is not empty—it's intentional
- **Subtle Depth**: Elevation through soft shadows, not hard lines

### 2. Emerald as Accent

The emerald green `#00C992` is powerful—use it sparingly for maximum impact.

- **Primary Actions**: Emerald signals the next step
- **Brand Moments**: Emerald appears in hero sections, CTAs, success states
- **Silver Foundation**: Metallic silver provides sophistication without competing

### 3. Adaptive Brightness

The design breathes differently in light and dark modes.

- **Light Mode**: Pure white surfaces `#FFFFFF` with subtle gray tones
- **Dark Mode**: True black `#000000` with silver metallic highlights
- **Auto-Detection**: System preference honored by default

### 4. Natural Motion

Animations feel organic, never mechanical.

- **Spring Physics**: Bouncy, playful interactions (gentle spring: `tension: 120, friction: 14`)
- **iOS Timing**: Standard transitions at `300ms` with iOS easing curves
- **Purposeful Animation**: Motion guides attention, doesn't distract

---

## Color System

### Brand Colors

**Emerald Green** (Primary Brand)

```
emerald-500: #00C992  ← Main brand color (preserved from original)
emerald-400: #33FFBF  ← Bright accent (dark mode)
emerald-600: #008C62  ← Deep variant
emerald-50:  #E6FFF7  ← Subtle tint
emerald-900: #00281C  ← Dark earth
```

**Metallic Silver** (Sophistication)

```
silver-100: #E8ECEF  ← Light mode accents
silver-500: #6B7A8A  ← Mid metallic
silver-900: #121821  ← Dark mode depth
```

### Surface Hierarchy

**Light Mode**

```
Primary:   #FFFFFF (pure white)
Secondary: #F2F2F7 (iOS light secondary)
Tertiary:  #FAFAFA (subtle off-white)
```

**Dark Mode**

```
Primary:   #000000 (true black)
Secondary: #1C1C1E (iOS dark secondary)
Tertiary:  #0A0E13 (rich black with blue undertone)
```

### Status Colors

```
Success:  #34C759 / #32D74B (light/dark)
Warning:  #FF9500 / #FF9F0A
Error:    #FF3B30 / #FF453A
Info:     #007AFF / #0A84FF
```

---

## Typography

### Font Families & Strategy

| Family                                              | Token                                 | When to Use                                                                 |
| --------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| **System** (`fontFamilies.system`)                  | SF Pro Display/Text + fallbacks       | All UI text: navigation, body, buttons, forms, labels. This is the default. |
| **Brand** (`fontFamilies.brand`)                    | Libre Baskerville / Georgia           | Page titles (`largeTitle`, `title1`, `title2`). Adds elegant serif flavor.  |
| **Mono** (`fontFamilies.mono`)                      | SF Mono / Fira Code                   | Prices, carat weights, technical specs, item numbers.                       |
| **Luxury serif** (`sacredTypography.serif.elegant`) | Cormorant Garamond / Playfair Display | Product names on certificates, PDF quotations, hero display text.           |
| **Clean sans** (`sacredTypography.sans.clean`)      | Montserrat / Helvetica Neue           | Alternative body text in marketing materials, documents.                    |

**Rule of thumb**: Use `fontFamilies.system` everywhere in the app. Switch to `brand` for page titles. Use `mono` for data. Reserve luxury serif for offline documents (PDF, certificates).

```typescript
// In-app (iOS HIG)
Display: (-apple - system, 'SF Pro Display'); // Headlines (20pt+)
Text: (-apple - system, 'SF Pro Text'); // Body (19pt-)
Mono: (ui - monospace, 'SF Mono'); // Technical data

// Documents & certificates
Elegant: 'Cormorant Garamond'; // Product names
Display: 'Playfair Display'; // Document titles
```

### iOS Type Scale

| Style           | Size | Weight | Line Height | Usage                  |
| --------------- | ---- | ------ | ----------- | ---------------------- |
| **Large Title** | 34px | 700    | 41px        | Page titles            |
| **Title 1**     | 28px | 700    | 34px        | Section headings       |
| **Title 2**     | 22px | 700    | 28px        | Subsections            |
| **Title 3**     | 20px | 600    | 25px        | Card headers           |
| **Headline**    | 17px | 600    | 22px        | Emphasized content     |
| **Body**        | 17px | 400    | 22px        | Main content (default) |
| **Callout**     | 16px | 400    | 21px        | Secondary content      |
| **Subheadline** | 15px | 400    | 20px        | Tertiary content       |
| **Footnote**    | 13px | 400    | 18px        | Captions, metadata     |
| **Caption 1**   | 12px | 400    | 16px        | Small text             |
| **Caption 2**   | 11px | 400    | 13px        | Smallest readable      |

---

## Spacing System

### 8-Point Grid

All spacing values are multiples of `8px` (base unit).

```
xxs:  4px   (0.5x) - Micro-adjustments
xs:   8px   (1x)   - Standard element spacing
sm:   12px  (1.5x) - Comfortable grouped content
md:   16px  (2x)   - iOS standard padding ⭐
lg:   20px  (2.5x) - Generous section spacing
xl:   24px  (3x)   - Major sections
xxl:  32px  (4x)   - Page-level spacing
xxxl: 48px  (6x)   - Hero spacing
```

### iOS-Specific Dimensions

```
Touch Target:       44px  (minimum tappable area)
Button Height (SM): 36px
Button Height (MD): 50px  ⭐ Standard
Button Height (LG): 56px
Input Height:       52px  (mobile) / 40px (desktop)
Border Radius:      10px  (standard) / 12px (cards)
```

---

## Shadows & Elevation

### Light Mode Shadows

```css
xs:  0 1px 2px rgba(15, 23, 42, 0.04)
sm:  0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)
md:  0 4px 6px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)
lg:  0 10px 15px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.04)
```

### Dark Mode Shadows

Deeper, more pronounced shadows for depth on dark backgrounds.

```css
sm:  0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)
md:  0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)
```

### Colored Shadows

**Emerald Glow** (for primary CTAs)

```css
Light: 0 4px 14px rgba(0, 174, 122, 0.25)
Dark:  0 4px 20px rgba(0, 174, 122, 0.3)
```

---

## Motion & Animation

### Easing Curves

```typescript
Standard: cubic - bezier(0.4, 0.0, 0.2, 1); // Most transitions
Decelerate: cubic - bezier(0.0, 0.0, 0.2, 1); // Enter animations
Spring: cubic - bezier(0.34, 1.56, 0.64, 1); // Bouncy interactions
```

### Durations

```
Fast:    200ms  - Quick transitions (hover, toggles)
Normal:  300ms  - Standard iOS timing ⭐
Slow:    400ms  - Deliberate movements (modals, sheets)
```

### Spring Physics

**Gentle Spring** (professional feel)

```
tension: 120, friction: 14
```

**Snappy Spring** (playful feel)

```
tension: 180, friction: 12
```

---

## Component Guidelines

### IOSCard

**Variants**:

- `elevated`: Standard card with shadow (default)
- `glass`: Glassmorphic with backdrop blur
- `flat`: Flat card with border only

**Usage**:

```tsx
<IOSCard variant="elevated" padding="md">
  <h3>Emerald Collection</h3>
  <p>Discover our finest Colombian emeralds</p>
</IOSCard>
```

**Best Practices**:

- Use `elevated` for primary content cards
- Use `glass` for overlays, modals, floating elements
- Use `flat` for subtle containers, list items

### IOSButton

**Variants**:

- `filled`: Primary brand button (emerald gradient)
- `tinted`: Secondary button (emerald tint background)
- `plain`: Tertiary button (transparent, emerald text)
- `outlined`: Outlined button (border only)
- `destructive`: Destructive action (red)

**Usage**:

```tsx
<IOSButton variant="filled" size="medium">
  Upload Emerald
</IOSButton>
```

**Best Practices**:

- One `filled` button per view (primary action)
- Use `tinted` for secondary actions
- Use `plain` for tertiary/cancel actions
- `destructive` only for irreversible actions (delete, remove)

### IOSTextField

**Features**:

- Floating label animation
- Clear button (iOS-style 'X')
- Validation states (error, success)
- Left icon support
- Multiline (textarea) support

**Usage**:

```tsx
<IOSTextField
  label="Emerald Name"
  placeholder="e.g., Esmeralda Reina"
  value={name}
  onChange={setName}
  error={validationError}
/>
```

**Best Practices**:

- Always provide a `label` for accessibility
- Use `error` prop for validation feedback
- Use `clearButton` for quick input clearing
- Use `leftIcon` for context (search, email, etc.)

### IOSProgress

**Variants**:

- `linear`: Horizontal progress bar
- `circular`: Circular spinner

**Usage**:

```tsx
{
  /* Determinate (with value) */
}
<IOSProgress variant="linear" value={75} showLabel />;

{
  /* Indeterminate (animated) */
}
<IOSProgress variant="circular" indeterminate />;
```

**Best Practices**:

- Use `linear` for file uploads, batch operations
- Use `circular` for loading states, async actions
- Always show `label` for linear progress > 5 seconds
- Use `indeterminate` when progress is unknown

---

## Theme Usage

### Setup

Wrap your app with `ThemeProvider`:

```tsx
import { ThemeProvider } from '@/design-system/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

### Using Theme in Components

```tsx
import { useTheme } from '@/design-system/ThemeProvider';

function MyComponent() {
  const { mode, toggleTheme, tokens } = useTheme();

  return (
    <div>
      <p>Current mode: {mode}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### CSS Custom Properties

All design tokens are available as CSS variables:

```css
.my-component {
  background-color: var(--surface-primary);
  color: var(--text-primary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-sm);
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-normal) var(--easing-standard);
}
```

### TypeScript Tokens

Import and use tokens in JavaScript/TypeScript:

```tsx
import { tokens } from '@/design-system/tokens';

const styles = {
  backgroundColor: tokens.surface.background.primary.light,
  padding: tokens.spacing.spacing.md,
  borderRadius: tokens.spacing.dimensions.borderRadiusStandard,
};
```

---

## Accessibility

### WCAG 2.2 Compliance

**Color Contrast**:

- Text Primary: 21:1 (AAA)
- Text Secondary: 7:1 (AA large)
- Brand Emerald on White: 3.5:1 (AA for large text)

**Touch Targets**:

- Minimum: 44x44px (iOS HIG requirement)
- All buttons meet this standard

**Keyboard Navigation**:

- All interactive elements are keyboard-accessible
- Focus states use emerald outline (2px solid)
- Tab order follows visual hierarchy

**Screen Readers**:

- Semantic HTML structure
- ARIA labels on icon-only buttons
- Form inputs have associated labels

---

## Responsive Design

### Breakpoints

```
Mobile:  0-428px    (iPhone 14 Pro Max)
Tablet:  429-834px  (iPad Mini)
Desktop: 835px+     (iPad Pro, Desktop)
```

### Adaptive Patterns

**Touch Targets**:

- Mobile: 44px minimum
- Desktop: 40px (mouse precision)

**Typography**:

- Mobile: 17px body (iOS standard)
- Desktop: Same (consistency)

**Spacing**:

- Mobile: 16px edge padding
- Tablet: 24px edge padding
- Desktop: 32px edge padding

---

## Navigation UX Rules

The app is a **fixed-viewport shell**: `body { overflow: hidden }`, and the
only page scroller is `<main id="main-content">` inside `IOSLayout`. These
rules keep Fotosíntesis (`/admin/fotosintesis/*`) and Atelier
(`/admin/products*`) panes, sidebars, and fixed chrome coordinated with that
shell instead of guessing at the viewport. Tokens and mixins live in
`tokens/layout.ts` and `mixins/scrollMixins.ts`, exported from the barrel.

1. **One scroller per view** — `<main id="main-content">` is the page
   scroller; never make body/page wrappers scroll.
2. **Heights come from published vars, never viewport guesses** —
   `paneHeight()`. Raw `100vh` is banned; `calc(100vh - N)` is a bug by
   definition (the shell's real height is `--app-main-height`, not the raw
   viewport).
3. **Every nested scroller is contained** — spread `containedScrollY` /
   `containedScrollX`; never a bare `overflow: auto`, so boundary gestures
   never chain into `<main>`.
4. **No `touch-action` on scroll containers** — the global
   `touch-action: manipulation` on controls (`css-variables.css`) is the
   only `touch-action` the app sets.
5. **Fixed/sticky chrome pinned to the right viewport edge must consume
   `--copilot-rail-width`** — so it shifts with the docked Copilot rail
   instead of underlapping it.
6. **Bottom-fixed elements clear the active tab bar** via
   `bottomBarClearance()`.
7. **`zIndex` tokens for anything `position: fixed`** — from the
   `zIndex` scale in `tokens/layout.ts`. Locally-stacked, non-fixed chrome
   (e.g. a sticky toolbar inside its own column) is exempt.
8. **Custom px breakpoints only from `layoutBreakpoints`** (`railDock`
   1024, `desktop` 1180); everything else uses MUI theme breakpoints. The
   divergent set in `spacing.ts:124` is deprecated for new code (migration
   out of scope for now).
9. **One top chrome per route family** — shell nav bar OR module topbar,
   never both.

See `SCROLL-UIUX-AUDIT-2026-07-08.md` for the audit that motivated these
rules and the shared pane recipe (`fotoPaneSx`) they're built from.

---

## Best Practices

### Do's ✅

- Use emerald sparingly for maximum impact
- Follow 8pt grid spacing consistently
- Provide hover states on desktop (but not mobile)
- Use spring animations for interactive elements
- Test in both light and dark modes
- Ensure 44px touch targets on mobile

### Don'ts ❌

- Don't use emerald for large backgrounds
- Don't mix different shadow styles
- Don't create custom spacing (use tokens)
- Don't animate on mobile if battery low (respect `prefers-reduced-motion`)
- Don't use more than one `filled` button per view
- Don't skip accessibility attributes

---

## Quick Start

### 1. Import Styles

```tsx
import '@/design-system/tokens/css-variables.css';
```

### 2. Wrap with ThemeProvider

```tsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

### 3. Use Components

```tsx
import { IOSCard, IOSButton, IOSTextField } from '@/components/ios/core';

function UploadForm() {
  return (
    <IOSCard variant="elevated" padding="lg">
      <IOSTextField label="Emerald Name" />
      <IOSButton variant="filled">Upload</IOSButton>
    </IOSCard>
  );
}
```

---

## Resources

- **Apple HIG**: https://developer.apple.com/design/human-interface-guidelines/
- **SF Pro Fonts**: https://developer.apple.com/fonts/
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG22/quickref/

---

**Built with emerald-green love in Colombia** 💚

_Version 1.0 - "Emerald iOS" Design System_
