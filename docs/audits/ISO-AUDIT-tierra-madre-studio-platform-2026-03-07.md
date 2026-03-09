# ISO 9241-110:2020 Audit -- Tierra Madre Studio Platform

## Audit Information
- **Flow**: Tierra Madre Studio -- Colombian Emeralds Catalog & Sales Platform (full platform audit covering Treasure Browser, Cotizaciones, Navigation & Global UX)
- **Version**: 2026.03.07 (current production)
- **Auditor**: Claude (ISO 9241-110:2020 Skill v1.0)
- **Date**: 2026-03-07
- **Materials Reviewed**: Full source code analysis of 27 component modules, 11 context providers, 59 custom hooks, 4 page components, 27 API endpoints. Flows analyzed: Product Catalog (TreasureBrowser), Quotation Generator (CotizacionGenerator), Authentication & Navigation, Ambassador Directory, Guest Invitation Flow.

---

## Score Summary

| Principle | Score | Level | Weight | Weighted |
|-----------|-------|-------|--------|----------|
| 1. Task Suitability | 72/100 | PARTIAL | 20% | 14.40 |
| 2. Self-Descriptiveness | 68/100 | PARTIAL | 18% | 12.24 |
| 3. Conformity with Expectations | 78/100 | PARTIAL | 15% | 11.70 |
| 4. Learnability | 60/100 | DEFICIENT | 12% | 7.20 |
| 5. Controllability | 70/100 | PARTIAL | 15% | 10.50 |
| 6. Error Tolerance | 65/100 | PARTIAL | 15% | 9.75 |
| 7. User Engagement | 82/100 | PARTIAL | 5% | 4.10 |
| **GLOBAL SCORE** | | | | **69.89/100** |

**Rating**: CONDITIONAL
**Release Gate**: FAIL (threshold: 90/100)

---

## Findings by Principle

---

### Principle 1 -- Task Suitability -- Score: 72/100

#### Strengths
- **Real-time preview in Cotizaciones**: Live document preview updates as user types -- zero disconnect between form and output
- **Intelligent autocomplete**: Client name autocomplete merges invited guests (priority) + recent clients from previous quotations
- **VirtualGrid with react-window**: 500+ products handled smoothly with only viewport + 3-item overscan rendered
- **Deferred value pattern**: `useDeferredValue(filteredTreasure)` prevents search input from blocking during filter computation
- **Multi-dimensional filtering**: Status, type, color, quality, shape, quantity, price range, collection, and sorting
- **Auto-detected asesor**: Asesor name auto-populated from Google email match against Asesores sheet
- **Draft persistence**: Cotizacion form state auto-saved to localStorage with restore banner on reload

#### Findings

### HLZ-001: No quotation reuse or duplication feature

**Principle**: 1 -- Task Suitability
**Severity**: Major
**Affected Screen/Step**: Cotizacion Generator
**Description**: Users cannot load a previous quotation back into the form to resume, duplicate, or revise it. Quotations are immutable once exported. Users must manually re-enter all client info, products, and investment items for revisions -- a task that can involve 10+ fields and multiple product entries.
**Evidence**: `useCotizacionHistory` hook stores quotations in localStorage but provides read-only access. No "duplicate" or "load into form" action exists on history entries.
**Estimated Impact**: High friction for repeat business. Asesores frequently revise quotations for the same client with updated pricing.
**Recommendation**: Add "Duplicar Cotizacion" action on history entries that pre-populates the form with previous data. Supports ISO P1 by reducing unnecessary re-entry.
**Correction Effort**: M
**Priority**: P1

### HLZ-002: Saved filters only available on desktop

**Principle**: 1 -- Task Suitability
**Severity**: Major
**Affected Screen/Step**: TreasureBrowser -- Mobile
**Description**: `SavedFiltersDropdown` component only renders on desktop breakpoints. Mobile users (likely the majority for a sales tool used in-field) cannot save or load search presets.
**Evidence**: SavedFiltersDropdown conditionally rendered based on screen size. Mobile filter sheet (IOSFilterSheet) does not include saved filters option.
**Estimated Impact**: Mobile asesores must re-apply complex multi-dimensional filters every session instead of saving common searches like "Available green Muzo VVS1 under 5M COP".
**Recommendation**: Add saved filters to the mobile IOSFilterSheet, using localStorage for persistence. Aligns with ISO P1 by eliminating repetitive filter setup.
**Correction Effort**: S
**Priority**: P1

### HLZ-003: Investment section hidden in manual product mode

**Principle**: 1 -- Task Suitability
**Severity**: Minor
**Affected Screen/Step**: Cotizacion Generator -- Manual Mode
**Description**: When `productEntryMode === 'manual'`, the Investment section (gold structure, silver, setting, certification, packaging costs) is hidden. Users who create manual products but also want to add standard investment items must switch back to treasure mode.
**Evidence**: Conditional rendering of Investment section based on `productEntryMode` in CotizacionGenerator.
**Estimated Impact**: Limits flexibility for asesores who source custom products but need to include standard investment/fabrication costs.
**Recommendation**: Always show the Investment section regardless of product entry mode. Investment costs are independent of product source.
**Correction Effort**: XS
**Priority**: P2

### HLZ-004: No quotation history browsing UI

**Principle**: 1 -- Task Suitability
**Severity**: Minor
**Affected Screen/Step**: Cotizacion Generator
**Description**: Quotation metadata and thumbnails are stored in localStorage via `useCotizacionHistory` but there's no UI to browse, search, or recall past quotations.
**Evidence**: History hook stores data but no list/grid view component references it in the Cotizaciones module.
**Estimated Impact**: Historical data exists but is inaccessible to users, negating its value for reference or follow-up.
**Recommendation**: Add a "Historial" tab or expandable panel showing recent quotations with thumbnails, client names, and dates.
**Correction Effort**: M
**Priority**: P2

---

### Principle 2 -- Self-Descriptiveness -- Score: 68/100

#### Strengths
- **Progress indicator in Cotizaciones**: 3-step bar (Info, Productos, Total) fills as sections are completed
- **Clear section headers**: Uppercase `subtitle2` typography with 700 weight for visual hierarchy
- **Live region announcements**: `announce(\`${filteredTreasure.length} productos encontrados\`)` on filter changes (WCAG 4.1.3)
- **Semantic HTML**: Grid cards use `role="article"` + `aria-label={nombre - color}`; form inputs have ARIA labels
- **Loading skeletons**: Cards show `<Skeleton variant="rectangular" animation="wave" />` during thumbnail loading
- **Active filter chips**: Horizontal scroll showing all applied filters with individual delete buttons
- **Empty state design**: SearchX icon + "Sin resultados" + 5 actionable search suggestions

#### Findings

### HLZ-005: No API error messaging in Treasure Browser

**Principle**: 2 -- Self-Descriptiveness
**Severity**: Critical
**Affected Screen/Step**: TreasureBrowser
**Description**: The `getTreasure()` hook provides no error state. If Google Sheets API fails, users see an empty grid with no explanation. There is no differentiation between "no matching results" and "data failed to load."
**Evidence**: No error state returned from the treasure data hook. No toast/notification triggered on API failure. Empty grid is indistinguishable from a filter with zero results.
**Estimated Impact**: Users may believe the catalog is empty, abandon the app, or repeatedly refresh without understanding the issue. Critical for field sales where connectivity varies.
**Recommendation**: Add error state to data hook. Render distinct error UI with retry button: "No pudimos cargar el inventario. Toca para reintentar." ISO P2 requires system states to be visually distinguishable.
**Correction Effort**: S
**Priority**: P0

### HLZ-006: Domain-specific abbreviations without explanation

**Principle**: 2 -- Self-Descriptiveness
**Severity**: Major
**Affected Screen/Step**: TreasureBrowser -- Filter chips and product cards
**Description**: Quality labels (VVS1, VVS2, VS1, VS2, SI1), filter chips ("x3" for quantity), and gemological abbreviations appear without tooltips or explanations. New asesores and guests have no way to learn what these mean within the interface.
**Evidence**: Quality badge on GridCard renders label text without tooltip. Filter chip renders abbreviated value without expansion. SUGGESTIONS array contains domain terms without definitions.
**Estimated Impact**: New users and guests (invited clients) cannot make informed filtering or purchasing decisions. Increases onboarding time and support requests.
**Recommendation**: Add tooltips on quality badges: "VVS1 (Very Very Slightly Included -- Highest clarity)". Add a small "?" icon next to quality filter with legend. ISO P2 requires controls to be intelligible without external documentation.
**Correction Effort**: S
**Priority**: P1

### HLZ-007: Comparison feature limit not communicated

**Principle**: 2 -- Self-Descriptiveness
**Severity**: Minor
**Affected Screen/Step**: TreasureBrowser -- Comparison
**Description**: The comparison feature has a maximum of 5 items, but this limit is not communicated to users until they reach it. There's no explanation of why the button becomes disabled or how many slots remain.
**Evidence**: Comparison limit enforced silently. No tooltip on disabled comparison button. No counter like "3/5 items selected for comparison."
**Estimated Impact**: Minor frustration when reaching the limit without warning.
**Recommendation**: Add counter badge to comparison bar: "3/5" and tooltip on disabled button: "Maximo 5 productos para comparar."
**Correction Effort**: XS
**Priority**: P2

### HLZ-008: Empty state in Cotizacion product list is silent

**Principle**: 2 -- Self-Descriptiveness
**Severity**: Major
**Affected Screen/Step**: Cotizacion Generator -- ProductListSection
**Description**: When no products have been added, `ProductListSection` returns `null` -- the section simply disappears. There is no empty state messaging to guide users on what to do next.
**Evidence**: `if (products.length === 0) return null;` in ProductListSection component.
**Estimated Impact**: New users may not understand the workflow. The absence of a section provides no affordance or call-to-action.
**Recommendation**: Replace null return with empty state: illustration + "Selecciona un producto del inventario o crea uno manualmente" with a call-to-action button. ISO P2 requires each state to be intelligible.
**Correction Effort**: S
**Priority**: P1

### HLZ-009: Icon ambiguity for secondary features

**Principle**: 2 -- Self-Descriptiveness
**Severity**: Minor
**Affected Screen/Step**: TreasureBrowser -- GridCard
**Description**: Scale icon (comparison), clock icon (recently viewed), and eye icon (admin view count) lack persistent visible labels. Tooltips appear only on hover (desktop) and are inaccessible on mobile touch.
**Evidence**: GridCard line ~300 uses Scale icon without visible label. RecentlyViewedCarousel uses Clock icon without text description. Admin badge uses Eye icon without explanation.
**Estimated Impact**: Mobile users have no way to discover icon meanings. Minor friction on desktop.
**Recommendation**: Add small text labels below icons or use `aria-describedby` with visible tooltip on first interaction. ISO P2 requires 100% of icons to have visible labels or accessible tooltips.
**Correction Effort**: S
**Priority**: P2

---

### Principle 3 -- Conformity with User Expectations -- Score: 78/100

#### Strengths
- **iOS-native navigation**: Bottom tab bar, settings sheets with spring animations, large title patterns
- **Material Design compliance**: MUI v6 components (ListItemButton, ToggleButtonGroup, Snackbar)
- **Back navigation**: React Router integration ensures browser back button works throughout
- **URL state persistence**: Filters encoded in query params -- bookmarkable and shareable
- **Destructive action confirmation**: NotificationContext `confirmAction()` replaces raw `confirm()` with styled dialogs
- **Theme follows OS**: Respects `prefers-color-scheme` system preference by default
- **Consistent icon/label patterns**: Same icon + label combinations across similar screens

#### Findings

### HLZ-010: Inconsistent pagination between grid and list views

**Principle**: 3 -- Conformity with User Expectations
**Severity**: Major
**Affected Screen/Step**: TreasureBrowser -- Grid vs List view
**Description**: Grid view uses infinite virtual scrolling (react-window), while list view uses manual "Cargar mas (156 restantes)" button pagination. Users switching between views encounter different scrolling behaviors for the same data set.
**Evidence**: VirtualGrid component uses react-window FixedSizeGrid. List view uses manual pagination button at bottom.
**Estimated Impact**: Confuses users who expect consistent behavior across view modes. Users in list view may not realize more items exist below the fold.
**Recommendation**: Unify scrolling behavior. Either apply virtual scrolling to both views or use consistent pagination. ISO P3 requires consistent behavior across similar contexts.
**Correction Effort**: M
**Priority**: P1

### HLZ-011: Mobile filter sheet doesn't preview result count

**Principle**: 3 -- Conformity with User Expectations
**Severity**: Major
**Affected Screen/Step**: TreasureBrowser -- Mobile IOSFilterSheet
**Description**: On mobile, when the filter sheet is open, users cannot see how many results match their current selections. They must close the sheet to discover the impact. This differs from modern e-commerce patterns (e.g., "Apply (24 results)").
**Evidence**: IOSFilterSheet does not display a live result count. Apply happens on each filter change but result count is hidden behind the sheet overlay.
**Estimated Impact**: Users may over-filter to zero results without realizing. Requires multiple open/close cycles to calibrate filters.
**Recommendation**: Add result count to filter sheet footer: "Mostrar 24 resultados" button (replacing implicit apply). ISO P3 requires conformity with established e-commerce conventions.
**Correction Effort**: S
**Priority**: P1

### HLZ-012: Content layout shift on price visibility toggle

**Principle**: 3 -- Conformity with User Expectations
**Severity**: Minor
**Affected Screen/Step**: TreasureBrowser -- GridCard
**Description**: When price visibility is toggled on/off, card layouts reflow because the price section is conditionally rendered. This causes visible content shift across the grid.
**Evidence**: Price display conditionally hidden when `shouldShowPrices` is false. Cards resize vertically when price row appears/disappears.
**Estimated Impact**: Minor visual disruption. Users may lose their scroll position or orientation in the grid.
**Recommendation**: Reserve space for price area even when hidden (use `visibility: hidden` instead of conditional rendering) to maintain stable layout. ISO P3 principle of no behavioral "surprises."
**Correction Effort**: XS
**Priority**: P2

---

### Principle 4 -- Learnability -- Score: 60/100

#### Strengths
- **Immediate browsing**: Users can browse the product catalog on first session without any required setup
- **Splash screen**: Premium brand experience with motivational quotes sets context
- **Progressive disclosure**: Admin tools gated behind role -- new users see only relevant features
- **Invitation flow**: Emerald Vault themed onboarding for guests with countdown timer and explore CTA
- **Filter suggestions in empty state**: "Sin resultados" offers 5 popular search terms to try

#### Findings

### HLZ-013: No guided walkthrough for key features

**Principle**: 4 -- Learnability
**Severity**: Major
**Affected Screen/Step**: TreasureBrowser (first visit), Cotizacion Generator (first visit)
**Description**: No onboarding tooltips, feature tours, or micro-tutorials exist for the comparison feature, saved filters, quotation creation workflow, or advanced filter options. Users must discover all capabilities by exploration.
**Evidence**: No tooltip, coach-mark, or walkthrough components found in the codebase. No `onboarding` state tracked per user.
**Estimated Impact**: Feature adoption rates likely low for comparison, saved filters, and advanced filtering. New asesores require informal training from colleagues.
**Recommendation**: Implement progressive coach marks for first-time users: (1) highlight comparison button, (2) show saved filters option, (3) walk through cotizacion steps. Use localStorage to track shown state. ISO P4 requires contextual guidance for non-obvious functions.
**Correction Effort**: L
**Priority**: P1

### HLZ-014: Advanced filters hidden without indication

**Principle**: 4 -- Learnability
**Severity**: Minor
**Affected Screen/Step**: TreasureBrowser -- Filters
**Description**: `showAdvancedFilters` toggle collapses shape, quantity, and collection filters. No indication of how many additional filters are available behind the toggle. Users may never discover these options.
**Evidence**: Advanced filters hidden behind expandable toggle. No badge or count like "3 more filters" on the toggle.
**Estimated Impact**: Users may miss relevant filters, leading to less precise product searches.
**Recommendation**: Add text to toggle: "Mas filtros (3)" or show collapsed filter labels as preview. ISO P4 requires advanced functions to be accessible without blocking basic flow.
**Correction Effort**: XS
**Priority**: P2

### HLZ-015: Provider portal has no onboarding

**Principle**: 4 -- Learnability
**Severity**: Major
**Affected Screen/Step**: Provider Portal (all sub-pages)
**Description**: Providers (vendors) who log in for the first time encounter the portal tabs (Home, Requests, Submit Quote, Inventory) without any onboarding explaining the workflow: view requests from Tierra Madre, submit quotations, track status.
**Evidence**: Provider routes render directly without any first-use guidance. No welcome modal, walkthrough, or help section.
**Estimated Impact**: Providers are external partners unfamiliar with the platform. Without onboarding, they may submit incomplete quotations or miss requests.
**Recommendation**: Add a first-visit welcome modal for providers explaining the 3-step workflow: (1) Browse requests, (2) Submit quotation with photos, (3) Track status. ISO P4 requires first-session task completion without help.
**Correction Effort**: M
**Priority**: P1

---

### Principle 5 -- Controllability -- Score: 70/100

#### Strengths
- **5-second undo for product deletion**: Snackbar with "Deshacer" button and timeout -- Gerhardt-Powals forgiveness pattern
- **Draft auto-save and restore**: Cotizacion form state preserved across page reloads with explicit restore/discard banner
- **"Nueva Cotizacion" reset**: One-click form reset with new quotation number generation
- **Clear filters**: Both bulk clear and individual chip removal supported
- **Back button throughout**: React Router integration ensures consistent browser history navigation
- **Cancel button during edit**: Manual product editing has explicit cancel action
- **beforeunload warning**: Triggered if cotizacion form is dirty with products

#### Findings

### HLZ-016: Cannot resume or edit exported quotations

**Principle**: 5 -- Controllability
**Severity**: Major
**Affected Screen/Step**: Cotizacion Generator -- Post-export
**Description**: Once a quotation is exported to PDF, it becomes immutable. Users cannot re-open it in the editor to make corrections (typo in client name, price adjustment, add/remove product). They must create an entirely new quotation.
**Evidence**: History stores read-only metadata. No "edit" or "load into form" action on exported quotations. Export finalizes the document.
**Estimated Impact**: High friction for revision workflows. Asesores report needing to recreate quotations from scratch when clients request changes.
**Recommendation**: Add "Editar" action on history entries that loads quotation data back into the form with a new version number (e.g., "COT-0042-v2"). ISO P5 requires users to be able to go back to any previous state.
**Correction Effort**: M
**Priority**: P1

### HLZ-017: Comparison bar not dismissible

**Principle**: 5 -- Controllability
**Severity**: Minor
**Affected Screen/Step**: TreasureBrowser -- ComparisonBar
**Description**: The comparison floating toolbar appears at the bottom when items are added but has no "clear all" or "dismiss" action. Users who accidentally trigger comparison must individually remove each item.
**Evidence**: ComparisonBar component renders when comparison items > 0. No "close" or "clear all" button visible.
**Estimated Impact**: Minor annoyance. Users feel the toolbar is intrusive when they didn't intend to compare.
**Recommendation**: Add "X" dismiss button and "Limpiar todo" action to the ComparisonBar. ISO P5 requires users to cancel any operation in progress.
**Correction Effort**: XS
**Priority**: P2

### HLZ-018: Recently viewed carousel cannot be hidden

**Principle**: 5 -- Controllability
**Severity**: Minor
**Affected Screen/Step**: TreasureBrowser -- RecentlyViewedCarousel
**Description**: The recently viewed carousel is always sticky at the top with z-index: 10 when items exist. The clear button exists but is small and not prominent. Users cannot permanently hide this section.
**Evidence**: Carousel always renders if items exist. `onClear()` exists but clears items rather than hiding the section.
**Estimated Impact**: Takes up screen real estate on mobile. May obscure filter results on small screens.
**Recommendation**: Add a "Hide" toggle (stored in localStorage) and make the clear button more prominent. ISO P5 requires users to adjust presentation mode.
**Correction Effort**: XS
**Priority**: P2

### HLZ-019: No keyboard shortcut to open/close filter sheet on mobile

**Principle**: 5 -- Controllability
**Severity**: Minor
**Affected Screen/Step**: TreasureBrowser -- Mobile
**Description**: Escape key does not close the filter sheet on mobile. No keyboard shortcut opens the filter panel. Bluetooth keyboard users on tablets have reduced control.
**Evidence**: IOSFilterSheet does not listen for Escape keydown events. No keyboard shortcut registry for filter actions.
**Estimated Impact**: Accessibility concern for keyboard-only users. Minor impact for general mobile users.
**Recommendation**: Add Escape key handler to close filter sheet and any open bottom sheets. ISO P5 requires controllability via available input methods.
**Correction Effort**: XS
**Priority**: P2

---

### Principle 6 -- Error Tolerance -- Score: 65/100

#### Strengths
- **Inline validation**: Client name (min 3 chars), email (@ check), manual product name (min 2 chars), price (> 0) all validate inline with helper text
- **Guest validation warning**: Orange triangle + colored border + helper text when client doesn't match invited guest list
- **ProgressiveImage retry**: 3 retries with exponential backoff (1s, 2s, 4s) + cache-busting on retries
- **Dual upload fallback**: Media uploads try fast-upload first, fall back to Cloudinary if primary fails
- **Draft preservation**: Form data survives page reload via localStorage auto-save
- **ChunkErrorBoundary**: Catches code-splitting failures with auto-reload + cache-bust strategy
- **Section-level ErrorBoundary**: Home sections wrapped with graceful degradation

#### Findings

### HLZ-020: No retry mechanism for failed data fetches

**Principle**: 6 -- Error Tolerance
**Severity**: Critical
**Affected Screen/Step**: TreasureBrowser, Ambassador Directory
**Description**: If `getTreasure()` or batch thumbnail API calls fail, no retry button is offered. Users see an empty grid with no way to recover except manually refreshing the browser.
**Evidence**: No error state returned from data hooks. No retry button rendered in error scenarios. No toast notification on API failure.
**Estimated Impact**: In-field asesores with unstable connectivity are blocked from showing products to clients. Direct revenue impact.
**Recommendation**: Add error state to all data hooks with retry function. Render: "Error al cargar. Toca para reintentar." with a retry button. ISO P6 requires error recovery in <= 2 steps from point of failure.
**Correction Effort**: S
**Priority**: P0

### HLZ-021: No offline detection or graceful degradation

**Principle**: 6 -- Error Tolerance
**Severity**: Major
**Affected Screen/Step**: All screens
**Description**: The app does not detect offline state. Filters work (local state) but data won't refresh. API calls fail silently. Users receive no indication that they're offline.
**Evidence**: No `navigator.onLine` check or network status listener in any context provider. No offline banner or cached-data indicator.
**Estimated Impact**: Field sales often occur in areas with poor connectivity. Silent failures lead to confusion and wasted time.
**Recommendation**: Add a NetworkStatusProvider that detects offline/online transitions and shows a banner: "Sin conexion. Mostrando datos en cache." ISO P6 requires minimal consequences from user errors (including environmental factors).
**Correction Effort**: M
**Priority**: P0

### HLZ-022: PDF export has no loading state or error handling

**Principle**: 6 -- Error Tolerance
**Severity**: Major
**Affected Screen/Step**: Cotizacion Generator -- Export PDF
**Description**: The PDF export button is not disabled during export and shows no loading spinner. If html2canvas or jsPDF lazy-load fails, no error is surfaced. Users may click multiple times, generating duplicate PDFs.
**Evidence**: `handleExportPDF` is async but button remains enabled and shows no loading state. No try/catch with user-facing error messaging for the lazy imports.
**Estimated Impact**: Duplicate PDF downloads, confusion about export status, and silent failures when libraries fail to load.
**Recommendation**: Disable export button during operation, show progress indicator, catch and display errors: "No se pudo generar el PDF. Intenta de nuevo." ISO P6 requires error recovery with user-language messaging.
**Correction Effort**: S
**Priority**: P1

### HLZ-023: Client mismatch report sent silently

**Principle**: 6 -- Error Tolerance
**Severity**: Minor
**Affected Screen/Step**: Cotizacion Generator -- Export
**Description**: When a client name doesn't match any invited guest, a mismatch report is sent to `/api/cotizacion-reports` for admin review -- but the asesor is not informed this happened or what it means.
**Evidence**: Mismatch check runs during `handleExportPDF` and POSTs to API silently. No UI notification to the asesor about the report.
**Estimated Impact**: Asesores don't know their quotation was flagged. Admins receive reports without asesor context.
**Recommendation**: Show informational toast: "Nota: Este cliente no tiene invitacion activa. Se notifico al administrador." ISO P6 requires transparency about system actions.
**Correction Effort**: XS
**Priority**: P2

### HLZ-024: No validation on phone number field

**Principle**: 6 -- Error Tolerance
**Severity**: Minor
**Affected Screen/Step**: Cotizacion Generator -- Client Info
**Description**: Phone number field accepts any free text without format validation. No input mask, no country code detection, no minimum length check.
**Evidence**: Phone field rendered as plain `<TextField>` without `type="tel"`, `inputMode="numeric"`, or validation logic.
**Estimated Impact**: Quotations may contain invalid phone numbers, reducing follow-up success.
**Recommendation**: Add `inputMode="tel"` and basic validation (minimum 7 digits). Consider country code dropdown for Colombian (+57) and international numbers. ISO P6 requires inline validation on form fields.
**Correction Effort**: S
**Priority**: P2

---

### Principle 7 -- User Engagement -- Score: 82/100

#### Strengths
- **Polished visual design**: Emerald/gold theme with glass-morphism effects, consistent design tokens
- **Light/dark mode**: Smooth CSS transitions (200ms), respects system preference
- **ES/EN i18n**: Full bilingual support with toggle
- **Achievement/XP system**: TrackingContext tracks engagement, unlocks achievements, awards XP levels
- **Spring animations**: Framer Motion with `prefers-reduced-motion` respect
- **Premium splash screen**: Breathing emerald glow + motivational quotes (8 variations)
- **Luxury guest experience**: Emerald Vault dark theme with countdown timer for invited clients
- **Consistent design system**: Centralized tokens in `src/design-system/index.ts`

#### Findings

### HLZ-025: No success celebration on quotation export

**Principle**: 7 -- User Engagement
**Severity**: Minor
**Affected Screen/Step**: Cotizacion Generator -- Post-export
**Description**: After exporting a quotation (a key business action), the only feedback is a plain toast: "Cotizacion {number} Exportado". No celebration animation, no summary of what was achieved, no suggested next action.
**Evidence**: Snackbar with `severity="success"` and text message only. Achievement check runs but no visible celebration UI.
**Estimated Impact**: Missed opportunity to reinforce positive behavior. Quotation creation is the core revenue-generating action.
**Recommendation**: Add a brief success animation (emerald sparkle or checkmark) with summary: "Cotizacion exportada exitosamente. Total: $X COP. Validez: Y dias." and a "Crear otra" CTA. ISO P7 requires success feedback on key actions.
**Correction Effort**: S
**Priority**: P2

### HLZ-026: Information density on mobile treasure browser

**Principle**: 7 -- User Engagement
**Severity**: Minor
**Affected Screen/Step**: TreasureBrowser -- Mobile
**Description**: On small mobile screens, the combination of sticky recently viewed carousel (z-index 10), filter bar, active filter chips, and 2-column grid creates high information density. The content area for actual product browsing is reduced.
**Evidence**: Recently viewed carousel always sticky. Filter bar always visible. Active chips horizontal scroll. Grid renders in 2 columns with 4:5 aspect ratio cards.
**Estimated Impact**: Cognitive overload on small screens (< 375px width). Reduced visible product count.
**Recommendation**: Auto-collapse recently viewed carousel when user starts scrolling. Consider a single "Filtros activos (3)" chip that expands on tap instead of always-visible chip row. ISO P7 requires appropriate information density.
**Correction Effort**: S
**Priority**: P2

---

## Improvement Plan

### Executive Summary
- Global score: **69.89/100** (CONDITIONAL)
- Critical findings: **2** (HLZ-005, HLZ-020)
- Major findings: **8** (HLZ-001, HLZ-002, HLZ-006, HLZ-008, HLZ-010, HLZ-011, HLZ-013, HLZ-015, HLZ-016, HLZ-021, HLZ-022)
- Minor findings: **10** (HLZ-003, HLZ-004, HLZ-007, HLZ-009, HLZ-012, HLZ-014, HLZ-017, HLZ-018, HLZ-019, HLZ-023, HLZ-024, HLZ-025, HLZ-026)
- Estimated total effort: **2L + 7S + 6XS + 4M = ~3 sprints**

### Immediate Action (P0 -- Before next release)

| ID | Finding | Principle | Effort | Impact |
|----|---------|-----------|--------|--------|
| HLZ-005 | No API error messaging in Treasure Browser | P2 Self-Descriptiveness | S | Users cannot distinguish empty catalog from API failure |
| HLZ-020 | No retry mechanism for failed data fetches | P6 Error Tolerance | S | Users blocked with no recovery when connectivity drops |
| HLZ-021 | No offline detection or graceful degradation | P6 Error Tolerance | M | Silent failures in field sales with poor connectivity |

### Next Sprint (P1)

| ID | Finding | Principle | Effort | Impact |
|----|---------|-----------|--------|--------|
| HLZ-001 | No quotation reuse/duplication feature | P1 Task Suitability | M | High friction for revision workflows |
| HLZ-002 | Saved filters desktop-only | P1 Task Suitability | S | Mobile asesores must re-apply complex filters |
| HLZ-006 | Domain abbreviations without explanation | P2 Self-Descriptiveness | S | New users can't make informed decisions |
| HLZ-008 | Empty state in Cotizacion product list is silent | P2 Self-Descriptiveness | S | No guidance for new users |
| HLZ-010 | Inconsistent pagination grid vs list | P3 Conformity | M | Confusing behavior switch between views |
| HLZ-011 | Mobile filter sheet doesn't preview result count | P3 Conformity | S | Over-filtering without feedback |
| HLZ-013 | No guided walkthrough for key features | P4 Learnability | L | Low feature adoption, high informal training cost |
| HLZ-015 | Provider portal has no onboarding | P4 Learnability | M | External partners confused by workflow |
| HLZ-016 | Cannot resume or edit exported quotations | P5 Controllability | M | Asesores recreate quotations from scratch |
| HLZ-022 | PDF export has no loading state or error handling | P6 Error Tolerance | S | Duplicate exports, silent failures |

### Backlog (P2 -- Continuous improvement)

| ID | Finding | Principle | Effort | Impact |
|----|---------|-----------|--------|--------|
| HLZ-003 | Investment section hidden in manual mode | P1 Task Suitability | XS | Limits flexibility for custom products |
| HLZ-004 | No quotation history browsing UI | P1 Task Suitability | M | Historical data inaccessible |
| HLZ-007 | Comparison limit not communicated | P2 Self-Descriptiveness | XS | Minor frustration at limit |
| HLZ-009 | Icon ambiguity for secondary features | P2 Self-Descriptiveness | S | Mobile users can't discover meanings |
| HLZ-012 | Content layout shift on price toggle | P3 Conformity | XS | Minor visual disruption |
| HLZ-014 | Advanced filters hidden without indication | P4 Learnability | XS | Missed filter options |
| HLZ-017 | Comparison bar not dismissible | P5 Controllability | XS | Intrusive when accidentally triggered |
| HLZ-018 | Recently viewed carousel cannot be hidden | P5 Controllability | XS | Takes up mobile screen space |
| HLZ-019 | No keyboard shortcut for filter sheet | P5 Controllability | XS | Accessibility gap for keyboard users |
| HLZ-023 | Client mismatch report sent silently | P6 Error Tolerance | XS | Asesores uninformed about flags |
| HLZ-024 | No validation on phone number field | P6 Error Tolerance | S | Invalid phone numbers in quotations |
| HLZ-025 | No success celebration on quotation export | P7 Engagement | S | Missed reinforcement opportunity |
| HLZ-026 | Information density on mobile | P7 Engagement | S | Cognitive overload on small screens |

### Principles with Largest Gap

1. **Learnability (60/100)** -- DEFICIENT. No onboarding, no guided tours, no progressive revelation of advanced features. Biggest drag on global score.
2. **Error Tolerance (65/100)** -- PARTIAL. Missing API error handling, no offline detection, silent failures during export. Critical for field sales reliability.
3. **Self-Descriptiveness (68/100)** -- PARTIAL. Domain abbreviations unexplained, empty states missing, API errors invisible. Impacts new user experience.
4. **Controllability (70/100)** -- PARTIAL. Quotation immutability post-export is the primary gap. Secondary: undismissable UI elements.
5. **Task Suitability (72/100)** -- PARTIAL. Core paths efficient but quotation reuse and cross-device parity gaps.
6. **Conformity with Expectations (78/100)** -- PARTIAL. Strong iOS/Material patterns but inconsistencies between views.
7. **User Engagement (82/100)** -- PARTIAL. Polished design but missing success ceremonies and mobile density optimization.

### Follow-up Metrics
- Re-audit recommended: After P0 + P1 completion (estimated: 2026-04-15)
- Proxy metrics to monitor:
  - **Error rate**: Track API failures in Treasure Browser (currently invisible)
  - **Time on task**: Measure quotation creation time (already tracked via `time_to_complete`)
  - **Abandonment**: Monitor cotizacion draft restoration rate vs. discard rate
  - **Feature adoption**: Track comparison, saved filters, and advanced filter usage
  - **Offline encounters**: Log navigator.onLine transitions per session

---

## Methodology & Limitations
- **Analysis type**: Expert heuristic review (not user study)
- **Standard**: ISO 9241-110:2020 -- Ergonomics of human-system interaction -- Part 110: Interaction principles
- **Limitations**:
  - Based on source code analysis only -- no live interaction observed
  - No real user data (abandonment rates, error rates, task completion times) available for validation
  - Screenshots not captured -- findings based on component logic and rendered structure
  - Provider portal flow assessed from code only -- no provider user testing data
  - Mobile behavior inferred from responsive breakpoints and touch-specific code -- not tested on physical devices
  - Scores are conservative per skill behavior rules -- when in doubt, scored lower
