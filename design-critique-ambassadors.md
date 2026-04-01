# Design Critique: Ambassadors Page

## Overall Impression

The Ambassadors page has a strong premium, dark aesthetic that aligns well with a luxury emerald brand. The card-based layout gives each ambassador presence, and the stats dashboard at top provides useful at-a-glance context. However, the page suffers from **language inconsistency**, **name truncation**, and **uneven card states** that undermine the polished feel.

---

## Usability

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| Ambassador names are truncated with ellipsis ("Isa la Negra Vikinga Warrior Po...", "Andrés Mauricio Escobar Ramír...") — users can't read the full name | 🟡 Moderate | Allow names to wrap to 2 lines, or show full name on tap/hover via a tooltip. Consider whether display names need to be this long. |
| The "Portafolio en construcción" card for Andrés offers "Ver Perfil" instead of "Ver Esmeraldas" — inconsistent action labels across cards | 🟡 Moderate | Use a consistent primary CTA across all cards. If a portfolio is empty, keep the same button label but show an empty state *within* the profile view. |
| The search bar placeholder says "Rechercher un ambassadeur..." (French), while the page title is "Ambassadeurs" (French) but subheading is "Embajadores" (Spanish) and card labels are in Spanish | 🔴 Critical | Settle on one language per locale. The mixing of French titles with Spanish body content is confusing. Either fully commit to French UI labels or Spanish — not both. |
| The sort options "Por Productos / Por Nombre" are in Spanish while the header is French | 🟡 Moderate | Same language consistency fix as above. |
| The stats bar shows "3 Embajadores activos" but 4 cards are displayed — is the 4th (Andrés) inactive? This isn't visually communicated. | 🟡 Moderate | Either visually dim inactive ambassadors or add a status badge (active/inactive) to each card. Also consider a filter toggle. |
| WhatsApp button has no visual affordance that it opens an external app | 🟢 Minor | Add a small external-link icon or subtle tooltip indicating it opens WhatsApp externally. |

---

## Visual Hierarchy

- **What draws the eye first**: The stats dashboard (numbers in yellow/green/blue) — this is appropriate as a summary entry point.
- **Reading flow**: Stats → search/filters → ambassador cards top-left → top-right → bottom-left → bottom-right. The 2-column grid reads naturally.
- **Emphasis**: The green "Ver Esmeraldas" CTA buttons are the strongest visual anchor on each card, which correctly guides users toward the primary action. The gold "EMBAJADOR - ADMIN" badges draw secondary attention. The emerald count number in yellow is a nice data highlight.

**Issue**: The page title hierarchy is off — "Ambassadeurs" (bold, large) and "Embajadores" (also large, medium weight) compete as two headings. It reads as a redundant double-title rather than a clear heading + description pattern.

---

## Consistency

| Element | Issue | Recommendation |
|---------|-------|----------------|
| Language | French ("Ambassadeurs", "Rechercher"), Spanish ("Embajadores", "Ver Esmeraldas", "Por Productos"), and English elements coexist | Pick one language for the UI. If the app supports i18n, ensure all strings go through the translation pipeline. |
| Card layout | 3 cards show inventory thumbnails + "Ver Esmeraldas"; 1 card shows "Portafolio en construcción" + "Ver Perfil" | Use the same card template for all ambassadors. Show an empty-inventory state within the same structure. |
| Role badges | Three ambassadors show "EMBAJADOR - ADMIN" (gold), one shows "EMBAJADOR" (green) | This is likely intentional role differentiation, but the colors (gold vs green) could be more clearly distinguished. Consider using an icon or more explicit label like "Admin" as a separate pill. |
| Thumbnail image quality | Some product thumbnails appear washed out or very similar (Isa's thumbnails look nearly identical — tiny emeralds on white backgrounds) | Ensure thumbnails have enough visual variety and clarity at small sizes to be useful. Consider larger thumbnails or a different preview strategy. |
| Avatar treatment | 3 ambassadors have photo avatars, 1 has a letter avatar ("A") | This is expected when no photo is uploaded, but the letter avatar's styling (dark green circle with serif "A") feels different from the photo avatars' green border ring. Unify the border treatment. |

---

## Accessibility

- **Color contrast**: The yellow stat numbers (e.g., "3", "$22.1M") on the dark background appear to have adequate contrast. However, the muted gray subtitle text ("Embajadores activos", "Valor disponible") may fall below WCAG AA for small text — worth verifying.
- **Touch targets**: The "Ver Esmeraldas" and "WhatsApp" buttons appear adequately sized for mobile taps. The grid/list toggle icons at the top are small and may be difficult to tap on mobile.
- **Text readability**: Body text is legible. The uppercase letter-spaced "4 EMBAJADORES ENCONTRADOS" label is readable but could be slightly larger for accessibility.
- **Screen reader concerns**: The truncated names would read the truncated text to screen readers. Ensure `aria-label` contains the full name.

---

## What Works Well

- **Premium dark aesthetic**: The dark theme with emerald green accents reinforces the luxury brand identity beautifully. The subtle glass/gradient effects on cards feel high-end.
- **Stats dashboard**: The 4-stat summary (active ambassadors, total products, loose gems, available value) is immediately useful and well-designed with distinct icon colors.
- **Product preview strip**: Showing a row of product thumbnails with a "+N more" counter gives a quick visual sense of each ambassador's inventory without overwhelming the card.
- **Clear primary CTA**: The green "Ver Esmeraldas →" button is visually strong and action-oriented.
- **Search + sort controls**: Having both search and sort options (by products, by name) with grid/list view toggles gives users good control.

---

## Priority Recommendations

1. **Fix language consistency** — This is the most jarring issue. The page mixes French ("Ambassadeurs", "Rechercher un ambassadeur") with Spanish ("Embajadores", "esmeraldas en inventario", "Ver Esmeraldas"). Run all UI strings through the i18n system and ensure the active locale is applied consistently. This undermines trust and professionalism more than any visual issue.

2. **Unify card states for empty portfolios** — Andrés's card breaks the visual rhythm with a completely different layout (dashed border placeholder, different CTA). Instead, show the same card structure with an empty-inventory message inside it (e.g., "0 esmeraldas en inventario" with an empty thumbnail row), keeping "Ver Esmeraldas" as the CTA.

3. **Handle long names gracefully** — Allow the name to wrap to 2 lines with a reasonable `max-width`, or establish a display-name policy. Truncation with "..." hides identity, which is especially problematic for an ambassador/sales page where the person's name is their brand.

4. **Clarify active vs. inactive status** — The stats say 3 active ambassadors but 4 cards are shown. Add a visual indicator (e.g., a subtle "inactive" badge or reduced opacity) so users understand the discrepancy without having to guess.

5. **Resolve the double-title** — "Ambassadeurs" + "Embajadores" reads as the same word twice in two languages. Keep one heading and use the subtitle line for the descriptive text only.
