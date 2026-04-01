# Design Critique: Ambassadors Page — Cross-Page Consistency Audit

**Scope**: Compare the Ambassadors page against the Home page and Treasure Browser to identify where it diverges from the established design language.

**Pages reviewed**: Home (`/home`), Treasure Browser (`/treasure`), Ambassadors (`/ambassadors`)

---

## Executive Summary

The Ambassadors page was built with a **different design philosophy** than the Home page and Treasure Browser. While Home uses the app's glass system with `backdropFilter` + `whiteAlpha`/`blackAlpha` utilities, and Treasure uses iOS-semantic surface tokens with spring animations, the Ambassadors page uses **legacy brand tokens**, flat MUI cards with `darkTokens.background.surface`, and basic CSS transitions. The result feels like a page from a different app — functional but visually disconnected.

---

## 1. Card System Mismatch

### What Home + Treasure do

**Home ProductsSection** wraps cards in a glassmorphic container:
```
bgcolor: whiteAlpha(0.06) / whiteAlpha(0.85)
backdropFilter: blur(16px) saturate(180%)
borderRadius: 4 (24px container), 3 (12px cards)
border: 1px solid whiteAlpha(0.1)
```

**Treasure GridCard** uses iOS-semantic surface tokens:
```
bgcolor: surfacesLight.background.primary / surfacesDark.background.secondary
border: surfacesLight.border.light / surfacesDark.border.light
borderRadius: isMobile ? '10px' : '12px'
boxShadow: layered (outer diffuse + inner inset)
```

Both pages use **depth gradient overlays** on images, **spring animations** (`animation.transition.spring`), and **`useReducedMotion()`** for accessibility.

### What Ambassadors does instead

**AsesorCard** uses flat MUI surface:
```
bgcolor: darkTokens.background.surface   ← legacy token, not used elsewhere
border: alpha('#fff', 0.055)             ← hardcoded color, not surface token
borderRadius: 3
boxShadow: 'none'                        ← no resting shadow at all
```

| Pattern | Home | Treasure | Ambassadors |
|---------|------|----------|-------------|
| Background tokens | `whiteAlpha()`, `blackAlpha()` | `surfacesLight/Dark` | `darkTokens.background.surface` |
| Glassmorphism | Yes (blur + saturate) | No | No |
| Resting shadow | `defaultShadows.md` | Layered dual shadow | `'none'` |
| Hover shadow | Emerald-tinted glow | Emerald-tinted inset | Opacity-based, no emerald glow |
| Image treatment | Gradient overlay + eager load | `ProgressiveImage` + gradient | Raw `<img>` tags, no progressive loading |

**Recommendation**: Migrate AsesorCard to use `surfacesLight/Dark` tokens (matching Treasure), add a subtle resting shadow, and use emerald-tinted hover shadows for consistency.

---

## 2. Animation & Motion Language

### Home + Treasure patterns

Both pages share a cohesive motion vocabulary:

- **Framer Motion stagger sequences**: `staggerContainer` + `staggerItem` from design system tokens
- **Spring physics**: `animation.transition.spring` for card hover lift
- **Press feedback**: `&:active { transform: scale(0.97) }` with 0.1s ease-out
- **Image zoom on hover**: `& img { transform: scale(1.06) }` with 0.5s cubic-bezier
- **Reduced motion**: `useReducedMotion()` hook gates all animations

### What Ambassadors does

- **Framer Motion**: Uses `fadeInUp` + custom `directoryStagger` (close but not the shared `staggerContainer`)
- **Hover**: `translateY(-3px)` — correct direction but uses a **hardcoded CSS cubic-bezier** instead of `animation.transition.spring`
- **No press feedback**: Missing `&:active { transform: scale(0.97) }` entirely
- **No image zoom**: Product thumbnails don't scale on hover
- **No reduced motion**: Doesn't import or use `useReducedMotion()` hook
- **Gold accent line on hover**: Uses `goldGradients.medium` sliding bottom border — a pattern that doesn't exist on any other page

| Motion Pattern | Home | Treasure | Ambassadors |
|----------------|------|----------|-------------|
| Entry animation | `staggerContainer` + `staggerItem` | `staggerContainer` + `staggerItem` | Custom `directoryStagger` |
| Hover lift | `translateY(-4px)` + scale | `translateY(-3px)` spring | `translateY(-3px)` CSS cubic-bezier |
| Press feedback | `scale(0.97)` | `scale(0.97)` | Missing |
| Image zoom | `scale(1.06)` on hover | `scale(1.06)` on hover | None |
| Gold bottom line | None | None | Slides in from center on hover |
| `useReducedMotion` | Yes | Yes | No |

**Recommendation**: Replace the custom `directoryStagger` with the shared `staggerContainer`/`staggerItem`. Add press feedback. Remove the gold sliding border (it's unique to this page and adds visual noise). Add `useReducedMotion()`.

---

## 3. Color Token Usage — Legacy vs Modern

This is the deepest inconsistency. The Ambassadors page imports from a **legacy compatibility layer** while the rest of the app has migrated.

### Modern pattern (Home + Treasure)

```typescript
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { whiteAlpha, blackAlpha, emeraldAlpha } from '../../design-system';
import { iosSemanticColors } from '../../design-system';
```

Colors are built from `emeraldCore.primary` (#00AE7A), surfaces use the `surfacesLight/Dark` system, and text uses `iosSemanticColors.label[mode]` for proper iOS-like semantic layering.

### Legacy pattern (Ambassadors)

```typescript
import { darkTokens, accentColors } from '../../design-system';
```

The `darkTokens` object comes from `legacy-compat.ts` — it was intended as a migration bridge, not a long-term dependency. `accentColors` is used directly for the info/purple stat colors and WhatsApp green, which is fine, but the card backgrounds and borders should use the modern surface tokens.

| Token | Modern (Home/Treasure) | Legacy (Ambassadors) |
|-------|------------------------|----------------------|
| Card background (dark) | `surfacesDark.background.secondary` | `darkTokens.background.surface` |
| Card border | `surfacesLight.border.light` | `alpha('#fff', 0.055)` hardcoded |
| Text primary | `iosSemanticColors.label[mode]` | `'text.primary'` MUI default |
| Text secondary | `iosSemanticColors.secondaryLabel[mode]` | `'text.secondary'` MUI default |

**Recommendation**: Replace `darkTokens` imports with `surfacesLight/Dark`. Replace hardcoded alpha borders with surface border tokens. Use `iosSemanticColors` for text colors where Treasure does.

---

## 4. Typography Inconsistencies

### Home + Treasure type scale

Both use the **system font stack** (`-apple-system, SF Pro Display`) with tight negative letter-spacing and consistent sizing:

- Product names: `0.85rem`, weight 600, `letterSpacing: '-0.24px'`
- Labels/captions: `0.65–0.75rem`, weight 500–600
- Section titles: `1rem–1.15rem`, weight 600

### Ambassadors differences

- **Page title**: Uses `fontFamilies.brand` (Libre Baskerville serif) — no other page does this for its main heading
- **Ambassador names**: `0.95rem`, weight 600 — slightly larger than product names
- **Stat labels**: `0.6rem` with `letterSpacing: '0.04em'` — positive tracking differs from the negative tracking elsewhere
- **Role badge**: `0.58rem` uppercase with `letterSpacing: '0.07em'` — heavier spacing than Treasure quality badges

The Libre Baskerville serif heading on the Ambassadors page creates a "magazine editorial" feel that clashes with the iOS-native feel of Home and Treasure. The positive letter-spacing on stat labels feels looser and more "web" while the rest of the app feels tight and "native."

**Recommendation**: Switch the page title to the system font stack (matching how Home and Treasure handle their titles). Tighten letter-spacing to negative values. Align font sizes with the scale used in Treasure cards.

---

## 5. Search/Filter UI Patterns

### Treasure Browser search

The Treasure Browser search bar sits directly below the header with icon buttons for filters and recent searches, using a clean `SearchBar` component with consistent surface tokens.

### Ambassadors search + controls

Uses a `TextField` + `ToggleButtonGroup` combination that's **unique to this page**. The toggle buttons for "Por Productos" / "Por Nombre" and grid/list view use custom-styled MUI ToggleButtons with emerald selection states.

The sort/view controls are reasonable but the styling approach differs. Treasure uses specialized components (`FilterChips`, `SearchBar`) while Ambassadors builds everything from raw MUI primitives.

**Recommendation**: This is lower priority — the ambassador filter UI works well functionally. If there's a shared `SearchBar` component, consider reusing it. Otherwise, this divergence is acceptable given the different data types being filtered.

---

## 6. Image Handling

This is a significant quality gap:

| Pattern | Home | Treasure | Ambassadors |
|---------|------|----------|-------------|
| Image component | `CardMedia` | `ProgressiveImage` | Raw `<img>` tag |
| Loading strategy | `loading="eager"` | LQIP + progressive | `loading="lazy"` |
| Retry on failure | N/A | Auto-retry (3x, exponential backoff) | None |
| Gradient overlay | Bottom 40% dark gradient | Bottom 45% gradient | None |
| Aspect ratio | Fixed heights per breakpoint | `aspectRatio: '1/1'` | Fixed 52×52px squares |
| Placeholder | `/placeholder-emerald.jpg` | Shimmer skeleton | None |

The ambassador product thumbnails are tiny 52×52px raw `<img>` elements with no loading states, no error handling, and no progressive enhancement. If an image fails, it silently shows nothing.

**Recommendation**: Use `ProgressiveImage` component for the ambassador thumbnails. Add shimmer skeletons while loading. Consider using the existing `serve-drive-image` proxy with retry logic.

---

## 7. Stats Dashboard — Unique to Ambassadors

The stats row (active ambassadors, total products, loose gems, value) is a design element that only exists on the Ambassadors page. It works well as a page-level summary, but its styling diverges:

- Uses `goldAccent.primary` for dividers — gold is reserved for premium/luxury contexts in the design system
- Icon circles use a 34px size with 7% alpha background — smaller and subtler than icon treatments elsewhere
- Number formatting uses `fontFamilies.mono` which is consistent with the Treasure price formatting

**Assessment**: The stats dashboard is a valid unique element for this page. Minor adjustments to align divider colors with the surface border tokens would improve consistency without losing functionality.

---

## 8. Accessibility Gaps

| Check | Home | Treasure | Ambassadors |
|-------|------|----------|-------------|
| `aria-label` on cards | Yes (product name + carats) | Yes (name + color) | Partial (only on name Typography, not the Card itself) |
| `role="article"` | Yes | Yes | No |
| `tabIndex={0}` | Yes | Yes | No (relies on Card's native behavior) |
| `&:focus-visible` outline | Yes (3px emerald) | Yes (2px emerald) | No |
| Keyboard Enter/Space | Yes | Yes | No |
| `useReducedMotion` | Yes | Yes | No |

The ambassador cards are missing keyboard navigation handlers, focus-visible outlines, proper ARIA roles, and reduced motion support — all of which are standard in the other pages.

**Recommendation**: Add `role="article"`, `tabIndex={0}`, keyboard handlers for Enter/Space, `&:focus-visible` outline styling, and `useReducedMotion()` support to the AsesorCard.

---

## Priority Recommendations (Ranked)

### P0 — Must Fix (Breaks consistency)

1. **Replace legacy `darkTokens` with modern `surfacesLight/Dark` tokens** — The card backgrounds and borders should use the same token system as Treasure.

2. **Add `useReducedMotion()` to all animated components** — This is an accessibility requirement that Home and Treasure already satisfy.

3. **Add keyboard navigation + focus-visible outlines to cards** — Missing `tabIndex`, `role`, Enter/Space handlers, and focus rings.

### P1 — Should Fix (Noticeable gaps)

4. **Switch from raw `<img>` to `ProgressiveImage` for thumbnails** — Adds loading states, retry logic, and LQIP placeholders.

5. **Replace hardcoded CSS transitions with `animation.transition.spring`** — Matches the motion language used everywhere else.

6. **Add `&:active { scale(0.97) }` press feedback** — This micro-interaction exists on every other card in the app.

7. **Remove the gold sliding bottom border on hover** — It's a one-off hover effect that doesn't exist on any other card component.

8. **Replace `staggerContainer` custom variant with shared design-system stagger** — Use `staggerContainer` + `staggerItem` from `design-system/tokens/motion`.

### P2 — Nice to Have (Polish)

9. **Switch page title from Libre Baskerville to system font** — Matches the iOS-native feel of other page titles.

10. **Add resting box-shadow to cards** — Currently `boxShadow: 'none'`. A subtle resting shadow like Treasure's `0 1px 3px rgba(0,0,0,0.06)` adds depth.

11. **Add emerald-tinted hover shadows** — Replace the current opacity-based hover with emerald glow shadows matching Treasure.

12. **Use `iosSemanticColors` for text** — Replace generic `'text.primary'`/`'text.secondary'` with `iosSemanticColors.label[mode]`.

---

## What the Ambassadors Page Does Well

- **Layout structure**: The 2-column grid + stats dashboard + search/sort controls is well-organized and scannable.
- **Framer Motion choreography**: The stagger entrance animations, while using a custom variant, create a polished first impression.
- **Product thumbnail strip**: The overlapping gallery with `+N` counter is a creative way to show inventory at a glance.
- **i18n compliance**: All strings now properly use the translation pipeline.
- **Gold accent hairline**: The decorative hairline under the page title is a nice editorial touch.

The page isn't broken — it's just been built with an older design vocabulary. Migrating to the modern token system and matching the interaction patterns of Home and Treasure would make it feel like a native part of the same app.
