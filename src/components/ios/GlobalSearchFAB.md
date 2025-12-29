# GlobalSearchFAB Component

## Purpose
Floating Action Button for global search functionality, accessible from all pages in the Tierra Madre app.

## UX Design Rationale (MOKSART Principles)

### Problem Solved
**Before:**
- Search was hidden in "More" menu (2 taps to access)
- Only available on treasure page
- High cognitive load for users looking for specific emeralds
- No quick way to search from product details or other pages

**After:**
- One tap from any page
- Persistent floating button (bottom-right)
- Clear search affordance
- Reduced friction by 50%

### Core Drive Integration (Octalysis)
- **Core Drive 2 (Accomplishment)**: Quick access to finding desired items
- **Core Drive 3 (Empowerment)**: User controls their search journey
- **White Hat Focus**: Positive UX, no manipulation

### Accessibility
- **WCAG AA Compliant**:
  - Touch target: 56x56px (exceeds 44px minimum)
  - Color contrast: Emerald green on white/dark backgrounds
  - Keyboard accessible (Tab navigation)
  - Screen reader support (aria-labels)
  - Reduced motion support

### Mobile-First Design
- **iOS HIG Compliance**:
  - Spring animations (iOS native feel)
  - Bottom-right placement (thumb zone)
  - Above tab bar (65px + safe area insets)
  - Safe area aware
  - Swipe-friendly modal

## Features

### 1. Smart Visibility
```typescript
const HIDDEN_PAGES = ['/treasure'];
```
- Automatically hides on pages with prominent search
- Can be force-shown via prop: `<GlobalSearchFAB forceShow />`

### 2. Liquid Glass Modal
- Backdrop blur (when supported)
- Spring animations
- iOS-style handle bar (mobile)
- Responsive: Full-screen mobile, centered modal desktop

### 3. Search Integration
- Reuses `MoreSheetSearch` component
- All filters available (type, quality, city, price)
- Real-time results preview
- Navigates to `/treasure` with query params

### 4. Animations
```typescript
// FAB animations
transform: scale(1.08) on hover
transform: scale(0.95) on active

// Modal animations
Spring physics: durations.liquidNormal + easingCurves.liquidSpring
```

## Usage

### Basic (in IOSLayout)
```tsx
import GlobalSearchFAB from './GlobalSearchFAB';

<GlobalSearchFAB />
```

### Force Show (testing)
```tsx
<GlobalSearchFAB forceShow />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `forceShow` | `boolean` | `false` | Override visibility logic |

## Styling

### Colors
- **Primary**: `primitiveColors.emerald[500]` (#059669)
- **Hover**: `primitiveColors.emerald[600]`
- **Shadow**: Emerald glow with 40% opacity

### Positioning
```css
position: fixed;
bottom: calc(65px + env(safe-area-inset-bottom) + 16px); /* Mobile */
bottom: 24px; /* Desktop */
right: 24px;
z-index: 1000; /* Below modal (1100) */
```

## Performance

### Optimization
- Memoized styles with `useMemo`
- Lazy modal rendering (only when open)
- Zero-cost when hidden
- Minimal re-renders (controlled state)

### Accessibility Features
1. **Touch target**: 56x56px FAB
2. **Focus indicator**: MUI default + emerald accent
3. **Keyboard shortcuts**: Tab to focus, Enter to open
4. **Screen readers**: Descriptive aria-labels
5. **Reduced motion**: Respects `prefers-reduced-motion`

## Testing Checklist

- [ ] FAB appears on all pages except `/treasure`
- [ ] FAB positioned correctly (above tab bar)
- [ ] Modal opens on click
- [ ] Search works and navigates to treasure
- [ ] Filters persist as URL params
- [ ] Animations smooth on iPhone 12+
- [ ] Safe area insets respected
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Works in dark mode
- [ ] Liquid Glass blur (Safari/Chrome)

## Metrics to Track

### UX Metrics
- **Search Access Time**: Should be <1s (vs ~3s before)
- **Search Engagement**: % of users using global search
- **Task Success Rate**: Find emerald from any page

### Business Metrics
- **Conversion Rate**: Users who search → view product
- **Session Duration**: Increased exploration
- **Bounce Rate**: Reduced (easier to find items)

## Future Enhancements

### Phase 2 (Gamification)
- [ ] Search streak badge (Core Drive 2)
- [ ] "Explorer" achievement (10 searches)
- [ ] Recent searches with quick access

### Phase 3 (AI)
- [ ] Voice search (speech-to-text)
- [ ] Smart suggestions based on context
- [ ] Trending searches

---

**Built with MOKSART principles**: Data-driven empathy, ethical gamification, accessibility-first.
