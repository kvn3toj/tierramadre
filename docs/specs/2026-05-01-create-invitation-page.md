# PRD — Create Invitation Page (`/invitaciones/nueva`)

**Author:** Kevin P. (with Claude/ARIA)
**Date:** 2026-05-01
**Status:** Approved → Implementation
**Owner:** Frontend (ARIA)
**Replaces:** `src/components/invitation/InvitationGenerator.tsx` (modal)

---

## TL;DR

The current "Crear enlace de invitado" experience lives inside an MUI `Dialog` that crams a name field, contact card, currency toggle, multiplier slider, live price preview, generate button, success banner, copy URL field, 6-digit PIN row, share buttons, and QR code into a 90-vh modal. The form is functionally complete but **visually cramped and tonally inconsistent** with the rest of the app, which uses spacious, scroll-friendly, full-page flows (`/mi-perfil`, `/esmereogenesis`, `/cuentas/cotizaciones`).

This PRD specifies a **dedicated full page** at `/invitaciones/nueva` that preserves all current functionality (incl. PIN, QR, currency multiplier, share/copy) while redistributing controls into breathing sections that match the app's iOS-semantic / glass / emerald design system. The legacy modal is retired; the "Invitar" tile in `IOSMoreSheet` becomes a `navigate()` call.

---

## 1. Problem Statement

Embajadores create guest invitation links from the bottom-sheet "More" menu. Today this opens a 600-px-wide MUI Dialog that stacks 9+ controls plus a 2-phase success state into a single scrollable card. Internal feedback ("se siente apretado, no parece de la app") confirms two issues:

1. **Density** — Too many controls in too little space. Pricing settings (currency toggle + multiplier slider + live preview) compete for attention with identity fields (name + contact), making the cognitive load high for what should be a one-minute task.
2. **Off-brand visual register** — Modal padding, the tiny 6-px step-indicator pills, the `0.65rem` micro-labels, and the dialog chrome diverge from the app's iOS spacing, glass surfaces, and `iosTypographyScale` used elsewhere. The modal reads as a v0 utility, not as part of the catálogo experience.

**Cost of not solving:** Embajadores are the primary funnel into the catalog. A flow that feels rushed undermines the "Esmeraldas con ADN de PAZ" brand promise at the exact moment of advocacy. Internal staff spend 40+ seconds per invitation; a calmer page makes the action feel curated and shareable.

---

## 2. Goals

1. **Brand-coherent surface** — The create-invitation experience visually belongs to the same app as `/mi-perfil` and `/esmereogenesis` (same container width, same iOS typography scale, same emerald accent system, same glass/elevation language).
2. **Reduce cognitive density** — Group the form into three perceptually separate sections (Invitado, Experiencia de precios, Generar) instead of one stacked column. Section gaps ≥ `spacing.md`.
3. **Preserve every existing capability** — Name, email/phone, pricing on/off, COP/USD, x1–x4 multiplier, live price preview, generate, copy link, copy PIN, share, QR, "nuevo enlace". Zero functional regressions.
4. **Single source of truth** — Only one entry point lives in the codebase post-launch. `IOSMoreSheet` navigates to the page; the modal component is removed (or stub-wrapped to re-export the page hook for back-compat).
5. **Mobile-first responsive** — 375 px (iPhone SE), 768 px (tablet), 1024 px+ (desktop) all render comfortably without horizontal scroll. Page assumes single-column on mobile; ≥ md uses a 2-column split (form on left, live preview/summary card on right).

---

## 3. Non-Goals

1. **No backend changes** — `/api/invitations?action=generate` and `useInvitation` hook stay as-is. We are not changing PIN length, expiry rules, or storage.
2. **No batch invitations** — One invitation per page submission; bulk creation (CSV upload, multi-recipient) is out of scope.
3. **No invitation list / management on this page** — Listing, editing, and expiring existing invitations remain in `InvitationSummary` on `/mi-perfil`. This page is _create-only_.
4. **No new auth surface** — Existing `useCanCreateInvitations` permission guard is reused; we do not introduce role/policy changes.
5. **No redesign of `InvitationPage` (the guest-facing landing)** — That page has its own dark-vault aesthetic and is not in scope.
6. **No animation/motion overhaul** — Reuse existing `cssTransition`, `easingCurves`, `durations`. No new motion tokens.

---

## 4. Users & User Stories

**Primary persona:** Embajador (staff member with `canCreateInvitations = true`).
**Secondary persona:** Admin (also has the permission; uses the same flow).

### Stories — happy path

- **US-1** — As an Embajador, I want to open a dedicated page from the More menu so I can create a new guest link without losing my place inside a modal.
- **US-2** — As an Embajador, I want the guest's name and contact (email or phone) clearly grouped at the top so I know what's required before I scroll.
- **US-3** — As an Embajador, I want a clear pricing section that lets me toggle prices, pick currency, and set a multiplier with a visible live example so I trust what the guest will see.
- **US-4** — As an Embajador, after generating, I want the page to show me the link, PIN, share buttons, and a QR in a calm summary so I can confidently send any of them via WhatsApp/Telegram/email.
- **US-5** — As an Embajador, I want a "Crear otra invitación" action that resets the form on the same page so I can issue several links in a row without bouncing back to the menu.

### Stories — edge cases

- **US-6** — As an Embajador, if I don't enter a contact, the Generate button stays disabled and I see why (contact required).
- **US-7** — As a guest user (signed in but without `canCreateInvitations`), if I navigate to `/invitaciones/nueva` directly, I'm redirected to `/home` (the `RoleBasedRedirect` already enforces this for staff routes).
- **US-8** — As an Embajador on flaky network, if the API call fails, I see a non-blocking error inline and the form keeps my entered values so I can retry.
- **US-9** — As an Embajador on iOS Safari, the page respects safe-area insets (no content under the home bar / status bar / IOSMoreSheet trigger).

---

## 5. Page Structure

### Layout grid

- **Container:** `maxWidth: 720` on desktop, full-width with `px: spacing.md` on mobile, matches `MyProfilePage` (`maxWidth: 600`) family but slightly wider to accommodate the right-rail preview at md+.
- **Vertical rhythm:** `pt: 1.5, pb: 12` (room for floating bottom nav). Section gaps: `spacing.lg` (≈24 px).
- **Breadcrumb row:** `Inicio › Mi Perfil › Nueva invitación` using existing `Breadcrumbs` component.

### Sections (top → bottom on mobile; left column on md+)

**A. Hero header**

- Page title: "Nueva invitación" (`iosTypographyScale.largeTitle` weight 700, emerald-aware)
- Subtitle: existing `t.tools.invitation.description` ("Genera un enlace temporal para que tu cliente explore esmeraldas colombianas")
- Small chip: "Válido 24 h después de la primera apertura" with `Clock` icon

**B. Card — Invitado** (glass surface, `radius.lg`, `floatingLayerShadows.subtle`)

- Section label "Invitado" + subtle helper "Quién recibirá el enlace"
- TextField: nombre (required, `Person` icon, autocomplete=name) — full width, `iosTypographyScale.body`
- Two TextFields side-by-side at sm+ (stacked at xs): Email + Teléfono — at least one required; helper chip: "al menos uno"
- Inline validation: emerald check icon when satisfied, neutral icon otherwise. No alert until submit.

**C. Card — Experiencia de precios** (glass surface)

- Section label "Experiencia de precios"
- Switch row: "Mostrar precios al invitado" (large `iOS-style` switch, emerald active)
- Conditional sub-block (animated reveal, `cssTransition.default`):
  - Currency segmented control (COP / USD), large 44-px tap targets
  - Multiplier: label + emerald badge "x{n}", slider x1–x4 step 0.1, range labels x1 / x4
  - Live preview row: dashed border, two-line — "Ej: piedra de \$2M" → "\${calc} {currency}"

**D. Right-rail (md+) / inline (xs–sm) — Vista previa**

- Card titled "Lo que verá tu invitado" — shows in real-time:
  - Greeting "Hola, {firstName || 'Invitado'}"
  - Mini-product example tile (use the existing brand silhouette or muted SVG placeholder) — shows price _as the guest would see it_, formatted with `Intl.NumberFormat` using selected currency + multiplier, or "Precio bajo consulta" when prices are off
  - Validity line "Acceso por 24 h"
- Sticky on md+ during scroll; collapses to a horizontal "Vista previa" card on xs–sm rendered between section C and the Generate button.

**E. Generate button + secondary actions**

- Primary: full-width emerald gradient button, height 52 px, `iosTypographyScale.headline`, label "Crear enlace para {firstName || 'mi invitado'}"
- Loading: spinner + "Generando..." (button stays full-width, never collapses)
- Cancel link: `text-emerald-700`, "Volver" — `navigate(-1)` (≤ 36 px tap target avoided; whole row clickable)
- Expiry hint chip below button (existing copy)

### Success state (replaces sections B–E in place; preview card stays visible)

A single `iosCard` with:

1. **Headline row:** Check icon + "Listo, {guestName}" + small "Válido 24 h"
2. **URL block:** read-only TextField with monospace, copy IconButton on the right, full-width
3. **PIN block:** 6 digit boxes (preserve current style — `brand.emerald[100]` fill, 32×36 px each) + "Copiar PIN" pill aligned right; helper line "Comparte el PIN por separado"
4. **Tag row:** chips for pricing mode, currency × multiplier, contact (already implemented; keep)
5. **Action row (3 buttons):** Copiar enlace · Compartir (Web Share API) · QR (toggles QR card below)
6. **QR card:** centered `QRCodeSVG`, 200 px (slightly larger than the modal's 160 px), white card with subtle emerald border
7. **Footer row:** "Crear otra invitación" (resets state) on the left; "Ir a Mi Perfil" link on the right (deep-links to `InvitationSummary`)

### Empty / Error states

- **Pre-submit error:** form inline (`Alert severity="warning"`, rounded 12 px, top of section B)
- **API error:** `Alert severity="error"` rendered above the Generate button; never blocks form values
- **No-permission redirect:** wrap route in existing role guard

---

## 6. Functional Requirements

### Must-Have (P0)

| ID    | Requirement                                 | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                           |
| ----- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1  | New route `/invitaciones/nueva`             | Visiting the URL renders the page when `canCreateInvitations === true`; otherwise `Navigate to /home`.                                                                                                                                                                                                                                                        |
| P0-2  | Page replaces modal as the only entry point | `IOSMoreSheet` "Invitar" tile calls `navigate('/invitaciones/nueva')` and closes the sheet. `InvitationGenerator` JSX is removed from `IOSMoreSheet.tsx`.                                                                                                                                                                                                     |
| P0-3  | All current fields preserved                | Name, email, phone, showPrices, currency (COP/USD), multiplier (1–4), validation rules unchanged.                                                                                                                                                                                                                                                             |
| P0-4  | API contract unchanged                      | Calls `useInvitation.generateInvitation` with same payload shape (creatorEmail, creatorName, creatorRole, pricingMode, guestName, guestContact, contactType, guestCurrencyMode, guestMultiplier).                                                                                                                                                             |
| P0-5  | Success state inline on the same page       | After generation, sections B/C swap to a success summary card without navigation. URL, PIN, share, QR, "nuevo enlace" all functional.                                                                                                                                                                                                                         |
| P0-6  | Visual coherence                            | Uses only tokens from `@/design-system` barrel (no inline hex except where existing modal already used `brand.emerald[*]`). Container width, paddings, radii, type scale match `MyProfilePage`.                                                                                                                                                               |
| P0-7  | i18n parity                                 | All strings come from `t.tools.invitation.*` (existing) + new keys for: page title `t.invitation.pageTitle = "Nueva invitación"`, breadcrumb `t.invitation.breadcrumb`, preview header `t.invitation.previewHeader`, "Crear otra" `t.invitation.createAnother`, "Ir a Mi Perfil" `t.invitation.backToProfile`. Add to all 6 locale files (es/en/fr/it/pt/zh). |
| P0-8  | Mobile responsive                           | At 375 × 667 viewport: no horizontal scroll, all tap targets ≥ 44 × 44 px, sections stack vertically.                                                                                                                                                                                                                                                         |
| P0-9  | A11y                                        | Form labels associated, `aria-label` on icon-only IconButtons, focus ring visible on all inputs/buttons, `prefers-reduced-motion` respected (no entrance animations when set).                                                                                                                                                                                |
| P0-10 | TypeScript clean                            | `npx tsc --noEmit` passes after the change. No new `any`.                                                                                                                                                                                                                                                                                                     |

### Nice-to-Have (P1)

| ID   | Requirement                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- |
| P1-1 | Right-rail "Lo que verá tu invitado" preview card with mock product tile reflecting selected currency × multiplier in real time.    |
| P1-2 | Sticky preview card on md+ via `position: sticky; top: spacing.md`.                                                                 |
| P1-3 | Subtle `Framer Motion` fade/slide on form-to-success transition (`opacity 200ms`, `y: 8 → 0`), respecting `prefers-reduced-motion`. |
| P1-4 | Recent guests strip above section B: last 3 invitations from `useMyInvitations` as click-to-prefill chips.                          |

### Future Considerations (P2 — design-only, do not build)

| ID   | Item                                                                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-1 | Bulk import: CSV/contact-picker that pre-creates N invitations. Architecture should keep `generateInvitation` callable in a loop without UI coupling. |
| P2-2 | Per-invitation custom expiry (currently fixed 24 h).                                                                                                  |
| P2-3 | Per-invitation product-set scoping (limit guest to a curated subset of the catalog).                                                                  |
| P2-4 | Schedule-send: create the link now, deliver to guest via email/WhatsApp at a later time.                                                              |

---

## 7. Success Metrics

### Leading indicators (1–4 weeks post-launch)

- **Adoption swap:** ≥ 95% of `/api/invitations?action=generate` POSTs originate from `/invitaciones/nueva` (referer header) within 14 days. _Measurement: Vercel logs + page-view event._
- **Time to generate:** Median time from page view → successful POST drops from ~40 s (modal baseline, internal stopwatch) to ≤ 30 s. _Measurement: client-side timing event._
- **Completion rate:** ≥ 90% of page sessions that reach section B end with a successful POST (vs. estimated ~75% in the modal). _Measurement: funnel event._
- **Share-action usage:** ≥ 30% of successful invitations trigger Copy or Share within 60 s of generation (modal baseline unknown — set baseline in week 1).

### Lagging indicators (1–3 months)

- **Invitations per active embajador per week:** baseline week-of-launch +20%.
- **Guest activation:** % of generated links opened within 24 h — should be flat or up (not down) since this PRD does not change the guest-side flow.
- **Internal NPS / qual feedback:** "¿La pantalla de crear invitación se siente parte de la app?" — target ≥ 8/10 in post-launch survey of staff.

### Non-metrics (do not track)

- Bounce rate on the page itself — Embajadores arrive with intent; bounce is noisy.

---

## 8. Open Questions

| #   | Question                                                                                                                                                                                   | Owner         | Blocking?                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------- |
| Q-1 | Should we keep the legacy `InvitationGenerator.tsx` as a thin wrapper that internally `<Navigate />`s, or delete it outright? Affects any third-party plugin or test harness importing it. | Eng (Kevin)   | No — default to delete; trivial to restore via git history.                                     |
| Q-2 | Right-rail preview product tile — use a real recent product image (perf cost: extra Drive thumbnail call) or a stylized SVG silhouette?                                                    | Design (ARIA) | No — start with SVG silhouette in v1 to avoid network coupling.                                 |
| Q-3 | Do we want analytics events on this page (`invitation_page_view`, `invitation_field_focus`, `invitation_generated`)? Existing `TrackingContext` supports it.                               | PM (Kevin)    | No — add `invitation_page_view` + `invitation_generated_v2` only; field-focus events are noise. |
| Q-4 | Should "Crear otra invitación" stay on the page or route back to `/mi-perfil`?                                                                                                             | Design (ARIA) | No — stay on page (US-5).                                                                       |

---

## 9. Timeline & Phasing

This is a single-PR change targeting `feature/create-invitation-page` branch off `main`.

- **Phase 1 (this PR, ~1 day):** Build page, wire route, swap `IOSMoreSheet` trigger, delete modal, add 5 new i18n keys × 6 locales, run `tsc + npm run build`.
- **Phase 2 (follow-up PR, ~½ day):** Wire `invitation_page_view` and `invitation_generated_v2` analytics events; add the recent-guests prefill strip (P1-4).
- **Phase 3 (later, not committed):** P2 items kept in this doc as architectural reminders.

**No hard deadline.** No external dependencies. Safe to ship behind no flag — the route guard already gates it.

---

## 10. Appendix

### A. Files touched (estimate)

- **Create:** `src/pages/invitations/CreateInvitationPage.tsx`, `src/pages/invitations/index.ts`
- **Edit:** `src/App.tsx` (add route), `src/components/ios/IOSMoreSheet.tsx` (swap modal for navigate, remove import + render), `src/locales/{es,en,fr,it,pt,zh}.ts` (5 new keys each)
- **Delete (Q-1 default):** `src/components/invitation/InvitationGenerator.tsx`, update `src/components/invitation/index.ts` barrel.

### B. Design system tokens used

- Colors: `brand.emerald[50/100/200/300/400/500/600/700/800]`, `iosLabels`, `iosFills`, `iosSeparators`
- Spacing: `primitiveSpacing.{xs,sm,md,lg,xl}`
- Radius: `radius.md`, `radius.lg`
- Typography: `iosTypographyScale.{largeTitle, title3, headline, body, footnote, caption1}`
- Shadows: `floatingLayerShadows.subtle`, `cardShadows.elevated`
- Motion: `cssTransition.default`, `cssTransition.fast`, `easingCurves.standard`, `durations.medium`
- Glass: `glassLight.surface`, `glassDark.surface` for the form cards

### C. Out of scope explicitly

- Mobile push/SMS delivery of the link directly from the page (still relies on Web Share API or manual copy).
- Server-rendered preview / OG image of the invitation itself (we already have `og-product.js`; this PRD doesn't change it).
- Invitation analytics (per-link view / time-to-open) lives in `InvitationSummary` and `useMyInvitations`, untouched.
