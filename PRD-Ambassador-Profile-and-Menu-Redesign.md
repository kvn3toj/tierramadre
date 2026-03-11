# PRD: Ambassador Profile Page & "Más" Menu Redesign

**Product**: Tierra Madre Studio
**Author**: Product Team
**Date**: March 9, 2026
**Status**: Approved (Open Questions Resolved)
**Priority**: High

---

## 1. Problem Statement

Ambassadors (Embajadores) currently lack a personal dashboard where they can view their own performance data, track guest activity from their invitations, and understand which products generate the most interest. Today, this data exists only in the admin-level Analytics Dashboard (`/admin/analytics`), which is restricted to admins and shows aggregate data across all users rather than a personalized view.

Additionally, the "Más" menu has grown organically to include 8+ items with no clear hierarchy, mixing quick settings (price toggles, currency) with navigation items (Analytics, Bóveda Secreta) and actions (Invitar, Feedback). This flat structure makes it harder for ambassadors to find the tools they need, and there is no clear entry point for a personal profile.

The cost of not solving this: ambassadors cannot self-serve their own performance insights, leading to manual requests to admins. They also cannot see which products their guests viewed, missing opportunities to follow up on warm leads.

---

## 2. Goals

**User Goals:**
- Ambassadors can view their personal stats (products assigned, total inventory value, guest invitations sent, guest activity) without needing admin access.
- Ambassadors can track which products their invited guests viewed, enabling informed follow-up conversations.
- All users can navigate the "Más" menu faster by finding items grouped into logical categories.

**Business Goals:**
- Increase ambassador engagement with the platform by providing actionable personal insights.
- Improve guest-to-sale conversion by giving ambassadors visibility into guest product interest.
- Reduce admin support load for "how am I doing?" type questions from ambassadors.

**Success Criteria:**
- 80% of active ambassadors visit their profile page at least once per week within 30 days of launch.
- Ambassadors can identify their guests' top-viewed products within 2 taps from the "Más" menu.
- Menu navigation time (tap to desired option) decreases by 30% based on task-completion testing.

---

## 3. Non-Goals

- **Not a public-facing profile redesign.** The existing ambassador profile at `/ambassadors/:slug` (visible to guests and other users) is out of scope. This PRD covers a *private* profile dashboard accessible only to the ambassador themselves.
- **Not a full analytics rebuild.** The admin Analytics Dashboard remains unchanged. We are creating a scoped-down, personalized view for ambassadors — not duplicating the full admin dashboard.
- **Not a messaging/CRM system.** While we surface guest activity, we are not building in-app messaging between ambassadors and guests. Follow-up happens via WhatsApp/phone as it does today.
- **Not role-based menu customization beyond current logic.** The menu already filters items by role (`useIsAdmin`, `useIsStaff`, `useIsGuest`). We are reorganizing the layout and hierarchy, not changing permission logic.
- **Not a settings page redesign.** The Configuración (settings) panel is out of scope, though it will be repositioned within the new menu hierarchy.

---

## 4. User Stories

### Ambassador Profile Page

**US-1**: As an ambassador, I want to see my personal stats (total products, gems, jewelry, total inventory value) on my profile page, so that I can understand my current portfolio at a glance.

**US-2**: As an ambassador, I want to see a list of all invitations I've sent (with guest name, date, status: active/expired), so that I can track my outreach efforts.

**US-3**: As an ambassador, I want to see which products my invited guests viewed (product name, view count, timestamp of last view), so that I can follow up on products that generated interest.

**US-4**: As an ambassador, I want to see my "top products by guest views" ranked list, so that I can quickly identify the hottest leads.

**US-5**: As an ambassador, I want to see my guest conversion summary (total guests invited, total product views generated, average views per guest), so that I can evaluate the effectiveness of my invitations.

**US-6**: As an ambassador, I want to access my profile page from the "Más" menu, so that it's always one tap away from anywhere in the app.

### "Más" Menu Redesign

**US-7**: As any user, I want the "Más" menu items grouped into clear categories (My Profile, Sales Tools, Admin, Settings & Support), so that I can find what I need without scanning a flat list.

**US-8**: As an ambassador, I want my profile to be the first and most prominent item in the "Más" menu (with my photo and name), so that it feels personal and I can access it immediately.

**US-9**: As an admin, I want the admin-only tools (Analytics, Name Generator) visually separated from general tools, so that I can distinguish between personal and administrative functions.

**US-10**: As a guest, I want the "Más" menu to show only relevant options with a clear invitation status, so that I'm not confused by blurred-out staff tools.

### Edge Cases

**US-11**: As a new ambassador with no invitations sent yet, I want to see an encouraging empty state on the guest activity section (with a CTA to "Invitar"), so that I understand the feature and am motivated to start inviting.

**US-12**: As an ambassador viewing guest activity, I want to see guest views even after the invitation has expired, so that I don't lose historical data.

---

## 5. Requirements

### Must-Have (P0)

#### 5.1 Ambassador Profile Page

**R1 — Profile Header**
- Display ambassador's photo, full name, role badge ("Embajador"), and tagline.
- Show "member since" date.
- Data source: existing ambassador data from Google Sheets (`get-asesores` API).

*Acceptance Criteria:*
- [ ] Ambassador photo loads from Google Drive via existing proxy.
- [ ] Name and role badge render correctly.
- [ ] If no photo exists, show default avatar with initials.

**R2 — Portfolio Stats Cards**
- Show 4 stat cards identical to the ones on the public ambassador profile: Total Productos, Gemas, Joyería, Valor Disponible.
- Data source: product ownership via `asesorProductOwnership.ts` utilities.

*Acceptance Criteria:*
- [ ] Stats match the values shown on the public profile (`/ambassadors/:slug`).
- [ ] Cards use the existing `StatItem` component styling.
- [ ] Values update when inventory changes (on page load, no real-time).

**R3 — Guest Activity Feed**
- Show a chronological list of product views from the ambassador's **own** invited guests only.
- Each entry: guest name (or "Guest" if anonymous), product name, timestamp (relative: "hace 2h").
- Filter: only views where `inviterName` matches the current ambassador. **Data isolation is critical** — ambassadors must never see guest activity from other ambassadors' invitations.
- Data source: existing `product-views` API with client-side filtering by `inviterName`.
- Time window: last 90 days of activity.

*Acceptance Criteria:*
- [ ] Activity feed shows the 50 most recent guest views within the last 90 days.
- [ ] Each entry is tappable and navigates to the product detail.
- [ ] Empty state shows illustration + "Invita a tu primer cliente" CTA.
- [ ] Views from expired invitations are still displayed (within 90-day window).
- [ ] Ambassador A **cannot** see guest activity from Ambassador B's invitations.
- [ ] Data is filtered client-side using the existing `product-views` API `recent` action.

**R4 — Top Products by Guest Interest**
- Show a ranked list (top 5) of products most viewed by the ambassador's guests.
- Each entry: product thumbnail, name, view count, mini sparkline or bar.
- Data source: aggregated from guest views data.

*Acceptance Criteria:*
- [ ] Products are ranked by total guest view count (descending).
- [ ] Tapping a product navigates to product detail.
- [ ] If fewer than 5 products have views, show only those available.

**R5 — Invitation Summary**
- Show key metrics: total invitations sent, active invitations, expired invitations.
- Show a compact list of recent invitations: guest name, date created, status badge (active/expired), view count generated.
- Data source: `invitations` API with `list-by-creator` action.

*Acceptance Criteria:*
- [ ] Metrics cards show correct counts.
- [ ] Status badges are color-coded: green (active), gray (expired).
- [ ] Tapping an invitation shows full details (guest name, contact, duration, pricing mode).

**R6 — Route & Navigation**
- New route: `/mi-perfil` (protected: `StaffRoute` — accessible to Asesor, Embajador, and Admin roles. **NOT** available to guests).
- Accessible from the "Más" menu as the first item for all staff roles.

*Acceptance Criteria:*
- [ ] Route renders the profile page for the authenticated user (Asesor, Embajador, or Admin).
- [ ] Each role sees their own personalized data (their products, their invitations, their guests' activity).
- [ ] Guests are **not** shown the "Mi Perfil" menu item and are redirected to home if they access the URL directly.
- [ ] Unauthenticated users are redirected to home.

#### 5.2 "Más" Menu Redesign

**R7 — Grouped Menu Structure**
Reorganize the menu into the following hierarchy with section headers:

```
─────────────────────────────────
[Avatar] Mi Perfil                    ← NEW (asesor/embajador/admin — NOT guests)
  {Name} · {Role badge}
  "Tu portafolio y actividad de invitados"
─────────────────────────────────

HERRAMIENTAS DE VENTA
  ├── Invitar                         (existing - ambassadors/admins)
  ├── Solicitudes                     (existing - staff)
  └── Cuentas                         (existing - staff)

DESCUBRIR
  ├── Bóveda Secreta                  (existing - all users)
  └── Generador de Nombres [AI]       (existing - admins)

ADMINISTRACIÓN                         (admins only)
  └── Analytics                        (existing - admins)

─────────────────────────────────
⚙ Configuración                       (existing - all users)
🐛 Reportar Feedback [DEV]            (existing - all users)
─────────────────────────────────

Mostrar Precios  [toggle]              (existing - staff)
Moneda           [toggle]              (existing - authorized)
Multiplicador    [slider]              (existing - authorized)
─────────────────────────────────
```

*Acceptance Criteria:*
- [ ] Section headers are styled as subtle uppercase labels (e.g., `HERRAMIENTAS DE VENTA`).
- [ ] "Mi Perfil" card is visually distinct — larger, with avatar and name inline.
- [ ] Quick settings (toggles, slider) are grouped at the bottom, separated by a divider.
- [ ] Empty sections (e.g., "Administración" for non-admins) are hidden entirely.
- [ ] All existing functionality (navigation, actions, modals) continues to work.

**R8 — Guest Menu View**
- For guests, show: invitation status banner at top, Bóveda Secreta, Configuración.
- Remove the blur overlay on hidden items — instead, simply don't render staff-only sections.

*Acceptance Criteria:*
- [ ] Guest sees only 2-3 relevant items, no blurred placeholders.
- [ ] Invitation expiration countdown is visible at the top.

### Nice-to-Have (P1)

**R9 — Guest Activity Notifications**
- Show a badge count on the "Mi Perfil" menu item when new guest views occur since last visit.
- Store "last seen" timestamp in localStorage.

**R10 — Export Guest Activity**
- Allow ambassadors to export their guest activity as a simple list (copy to clipboard or share via WhatsApp).

**R11 — Mini-chart on Profile**
- Show a 7-day sparkline of guest views on the profile header, similar to the Analytics overview trend chart.

### Future Considerations (P2)

**R12 — Ambassador Leaderboard**
- Ranked comparison of ambassadors by guest engagement metrics. Requires careful design around competition dynamics.

**R13 — Guest Contact Integration**
- One-tap WhatsApp follow-up from the guest activity feed, pre-filled with the product the guest viewed most.

**R14 — Personalized Product Recommendations**
- AI-suggested products for ambassadors to highlight based on guest viewing patterns.

---

## 6. Success Metrics

### Leading Indicators (1-2 weeks post-launch)

| Metric | Target | Stretch | Measurement |
|--------|--------|---------|-------------|
| Profile page adoption | 70% of active ambassadors visit within 7 days | 90% | Track `page_view` event for `/mi-perfil` |
| Menu task completion time | < 3 seconds to reach any menu item | < 2 seconds | Manual task-completion test with 3 ambassadors |
| Guest activity feed engagement | 50% of profile visits scroll to activity feed | 70% | Track scroll depth on profile page |

### Lagging Indicators (4-8 weeks post-launch)

| Metric | Target | Stretch | Measurement |
|--------|--------|---------|-------------|
| Weekly profile page return rate | 60% of ambassadors return weekly | 80% | Weekly unique visitors to `/mi-perfil` |
| Invitation creation rate | 15% increase in invitations sent | 25% | Compare `invitations.generate` API calls pre/post |
| Guest follow-up rate (proxy) | 10% increase in WhatsApp taps from ambassador profiles | 20% | Track "Contactar" button taps after profile view |

---

## 7. Open Questions — All Resolved

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Should the profile page be accessible to "Asesor" role as well, or only "Embajador" and "Admin"? | **Yes — enable for Asesor, Embajador, and Admin. NOT guests.** | All staff roles benefit from personal dashboards. Guests have no portfolio or invitations to track. |
| 2 | Do we need a new API endpoint for ambassador-specific guest views, or can we filter existing `product-views` data client-side? | **Use existing API, filter client-side.** | Avoids new endpoint complexity. The `product-views` `recent` action already returns `inviterName`, so client-side filtering by the current user's name is straightforward. Revisit if data volume causes performance issues. |
| 3 | How far back should guest activity history go? | **90 days.** | Balances useful history with data volume. Old leads beyond 90 days are unlikely to convert. |
| 4 | Should the "Más" menu transition be a bottom sheet or full-page slide? | **Keep current bottom sheet.** | Familiar pattern, lower risk. Can iterate to full-page if the grouped layout feels cramped. |
| 5 | Should we track "which ambassador's guest viewed which product" as a first-class data point in Google Sheets? | **Yes — first-class data.** Store `inviterEmail` (not just `inviterName`) as a dedicated column in the product-views sheet. **Critical: each ambassador must only see tracking for their own invitees, never other ambassadors' guest data.** | Deriving from invitation + view data is fragile (name collisions, deleted invitations). First-class tracking ensures reliable, queryable data with strict per-ambassador isolation. |

---

## 8. Timeline Considerations

**Phase 1 (Sprint 1 — ~1 week):**
- "Más" menu redesign (R7, R8) — lower risk, immediate UX improvement.
- Profile page route and shell (R6) with header and stats (R1, R2).

**Phase 2 (Sprint 2 — ~1 week):**
- Add `inviterEmail` first-class column to product-views Google Sheet.
- Guest activity feed (R3) and top products (R4) — with client-side filtering by `inviterEmail`.
- Invitation summary (R5).

**Phase 3 (Post-launch iteration):**
- P1 items: notification badges (R9), export (R10), mini-charts (R11).

**Dependencies:**
- No external team dependencies — all data sources (Google Sheets, existing APIs) are owned by the Tierra Madre team.
- May need a new API endpoint or action in `product-views.js` for filtered ambassador-specific data.

---

## 9. Technical Notes

### Existing Infrastructure to Leverage

| Need | Existing Asset | File |
|------|---------------|------|
| Ambassador data | `get-asesores` API + `AmbassadorProfile` type | `src/types/ambassador.ts` |
| Product ownership | `asesorProductOwnership.ts` utility | `src/utils/asesorProductOwnership.ts` |
| Guest views tracking | `product-views` API (tracks `inviterName`) | `api/product-views.js` |
| Invitation history | `invitations` API (`list-by-creator` action) | `api/invitations.js` |
| Stat cards | `StatItem` component | `src/components/ambassador/StatItem.tsx` |
| Menu component | `IOSMoreSheet` | `src/components/ios/IOSMoreSheet.tsx` |
| Permission hooks | `useIsStaff()`, `useIsAdmin()`, `useCanCreateInvitations()` | Various hooks |
| Auth context | `AuthContext` (provides `accessLevel`, user info) | `src/contexts/AuthContext.tsx` |
| Tracking | `TrackingContext` (`track()` function) | `src/contexts/TrackingContext.tsx` |

### New Components Needed

- `AmbassadorProfileDashboard.tsx` — main profile page component.
- `GuestActivityFeed.tsx` — chronological list of guest product views.
- `TopGuestProducts.tsx` — ranked product interest list.
- `InvitationSummary.tsx` — invitation stats and list.
- Updated `IOSMoreSheet.tsx` — grouped menu layout with sections.

### API Changes

**Decision: Use existing APIs with client-side filtering + add first-class `inviterEmail` tracking.**

1. **`product-views.js`** — Add `inviterEmail` column to the Google Sheets tracking data (alongside existing `inviterName`). This enables reliable filtering by the authenticated user's email rather than display name matching. Use existing `recent` action and filter client-side by `inviterEmail === currentUser.email`.

2. **`invitations.js`** — No changes needed. The `list-by-creator` action already filters by `creatorEmail`.

3. **Data Isolation Rule**: The client must filter all guest activity data to show only records where `inviterEmail` matches the currently authenticated user. Ambassadors must never see other ambassadors' guest data.

---

*All open questions resolved on March 9, 2026. This PRD is ready for implementation.*
