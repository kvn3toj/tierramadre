# ISO 9241-110:2020 Audit — Tienda pública (storefront v2)

## Audit Information

- **Flow**: the public storefront — a stranger arrives with no session, chooses between two collections, inspects a piece, shortlists, and either asks for it on WhatsApp or walks the simulated payment path.
- **Surfaces**: `/tienda`, `/tienda/:categoria`, `/tienda/:categoria/:productoSlug`, `/tienda/seleccion`, `/tienda/pago`, `/tienda/pedido/:pedidoId`, `/tienda/la-casa`, `/tienda/{terminos,privacidad,retracto,contacto}`, `/tienda/admin-preview`. Both menu placements (header nav / bottom TabBar).
- **Version / date**: working tree on `main` @ 2026-09-10, base commit `7aece13`, behind flag `TIENDA_PUBLICA` (dev-only).
- **Auditor**: Claude (iso-ux-audit skill) — measurement by hand in Chrome, remediation by 6 parallel sub-agents partitioned by file.
- **Materials reviewed**: **live interaction**, not source-only. Every visible interactive element measured with `getBoundingClientRect` across 4 viewports (500 / 834 / 900 / 1512 CSS px) on 11 routes, plus the source.
- **Target user**: a Colombian buyer arriving cold from a WhatsApp or Instagram link, on a phone, with no account and no prior relationship.

### Evidence discipline

Numbers in this report are measured, not estimated. Two candidate findings were **rejected on verification** and are recorded below rather than quietly dropped — including one the auditor raised and then disproved.

### Limitations (stated, not scored around)

1. **True phone width was never measured.** Chrome floors a desktop window at ~500 CSS px, so 390 px (iPhone 14/15) could not be reproduced. 500 px is inside MUI's `xs` bucket, so the mobile *layout* is exercised, but defects that appear only below 500 px are **predicted, not observed**.
2. **P1 cannot be scored on real task completion.** The inventory is a fixture; nobody has ever completed a purchase here. Task suitability is scored on flow structure, not on outcome data.
3. **The legal pages are deliberately incomplete** and are not scored as defects. They ship structure plus an explicit "pending" notice because the NIT, retracto procedure and SIC link must come from the owner.
4. No real users were observed. This is an expert inspection.

---

## Score Summary

| Principle                       | Score  | Level    | Weight | Weighted    |
| ------------------------------- | ------ | -------- | ------ | ----------- |
| 1. Task Suitability             | 78/100 | APPROVED | 20%    | 15.6        |
| 2. Self-Descriptiveness         | 76/100 | APPROVED | 18%    | 13.7        |
| 3. Conformity with Expectations | 74/100 | PARTIAL  | 15%    | 11.1        |
| 4. Learnability                 | 76/100 | APPROVED | 12%    | 9.1         |
| 5. Controllability              | 72/100 | PARTIAL  | 15%    | 10.8        |
| 6. Error Tolerance              | 80/100 | APPROVED | 15%    | 12.0        |
| 7. User Engagement              | 70/100 | PARTIAL  | 5%     | 3.5         |
| **GLOBAL SCORE**                |        |          |        | **~76/100** |

**Rating**: APPROVED (75–89)
**Release gate**: CONDITIONAL — the storefront is coherent and safe to show, but it is behind a flag with fictional inventory. The touch-target family (HLZ-706) is systemic and was fixed in this pass; the tablet navigation gap (HLZ-708) is the one that changes a real user's path.

---

## What the measurement found

**Zero horizontal overflow on every route at every viewport.** `documentElement.scrollWidth === innerWidth` at 500, 834, 900 and 1512 px across all 11 routes. For a surface built in one sitting this is the single best result in the report, and it is not luck: the gutters are set once on the shell and every grid collapses to one column at `xs`.

The defects cluster in **touch geometry and type scale**, not layout.

---

## Findings

### HLZ-706: Touch targets below the 44 px contract, on every screen — **Major / P0**

The project's own accessibility contract (PRODUCT.md) states targets ≥ 44×44 px with ≥ 8 px gaps. Measured violations, present on **all 11 routes**:

| Element | Measured | Where |
| --- | --- | --- |
| Wordmark → home | 120×**20** | header, all screens |
| Selection count badge | **28×28** | header, all screens |
| Header utility gaps | **2 px** | idioma / tema / menú |
| Footer links | 224×**39** (500px), 320×**39** (1512px) | all screens |
| Header nav links | 116×**39**, gaps **4 px** | ≥ 900px |
| Bookmark toggle on cards | **36×36** | /joyeria, /simbolos |
| Consent checkbox | **22×22** | /pago |
| Legal links in consent | 132×**32**, 180×**32** | /pago |
| Primary CTAs | 468×**40** | /producto, /seleccion |
| Ledger checkboxes | **16×16** | /admin-preview |

**Root cause for the CTAs is systemic and lives outside this surface:** `componentHeights.button.md = 40` (`src/design-system/tokens/spacing.ts:65`). **The design system's default button size violates the project's own touch contract.** `lg` (48) is compliant. This was NOT fixed at the token — the blast radius is every button in the app — so the storefront moves its CTAs to `size="lg"` and the token is raised here as a systemic issue for the design-system owner.

### HLZ-707: Information the buyer must read, set at 11 px — **Major / P1**

`qeType.spec` is 0.6875 rem (11 px) and exists for **metadata**. Measured carrying non-metadata:

- `"Catálogo de muestra. Piezas y precios de referencia."` — the sentence that tells a visitor the prices are not real. It is the most load-bearing sentence in the storefront and was the smallest text on the page.
- `"Pago simulado. Ninguna tarjeta se cobra."` — a warning that no charge occurs.
- `"Pantalla de estudio… ninguna acción escribe nada."` — the notice that stops someone mistaking the admin mockup for a working tool.
- The two legal links inside the `/pago` consent block — **interactive labels** at 11 px.
- `/pago` measured **9** such strings versus 3–4 on every other route: the highest density is on the screen where a buyer surrenders personal data and gives legal consent.

### HLZ-708: iPad portrait loses navigation entirely — **Major / P1**

Measured at **834 px** (iPad portrait, the most common tablet width): `headerNavLinksVisible = 0`, hamburger visible, while the door grid already renders **two 383 px columns**. There is room for four short links and the user gets a hamburger instead.

Cause: the nav is gated on MUI `md` (900 px). A tablet in portrait is not a phone, and hiding primary navigation behind a menu on a 834 px screen is a conformity failure (P3), not just a cosmetic one.

### HLZ-709: `Vaciar` destroys the selection with no confirmation and no undo — **Minor / P2**

The shortlist is the storefront's only persistent user state and the input to its only conversion action. `Vaciar` appears in two places (the floating bar and the selection page) and both discard it immediately. ISO P5 (Controllability) and P6 (Error Tolerance) both ask for an undo or a confirm on a destructive action. Nothing here is irrecoverable — the pieces can be re-picked in a few taps — hence Minor, not Major.

### HLZ-710: A development control ships inside the customer footer — **Minor / P2**

The "Vista previa · menú — Cabecera / Barra inferior" switcher exists so the owner can choose a menu placement by flipping between two live implementations. That is its purpose and it is the right instrument. But it currently renders in the **customer-facing footer**, where a real visitor would read it as a broken setting. It must not survive the decision it exists to serve.

### HLZ-711: Three of five pieces have no photograph — **Minor / P2**

`/tienda/simbolos` renders three cards whose image wells all show the same branded watermark. It is the system's correct "photo pending" treatment and it is honest, but three identical grey wells side by side reads as unfinished to a buyer and depresses P7. Not a code defect: it is a content gap.

---

## Rejected by verification

**Candidate: "`/pago` has 7 controls with no accessible name."** The first measurement pass flagged 7 unnamed inputs. **Rejected.** The check only looked at `aria-label` / text content / `title`; re-measuring with `document.querySelector('label[for=...]')` showed all 7 have proper label associations, generated by the DS3 `Field` render-prop. The form is correctly labelled. Recorded because a false accessibility finding wastes a sprint.

**Candidate: "narrow-viewport overflow risk on 26 elements per screen."** **Rejected.** The predictor compared *computed* width against a 358 px budget, and computed width is always resolved to px — so every full-width block matched. The check was invalid, not the layout. Genuine narrow-width risk (`min-width` and `white-space: nowrap` overruns) measured **zero**.

---

## Strengths worth protecting

1. **Zero horizontal overflow at every viewport on every route.** Rare, and easy to lose.
2. **`reservada` is never rendered as an error**, and unknown/future order states fall through to the waiting state rather than to a failure. This matches the doctrine written into `PedidoConfirmadoPage.tsx:9-16` after a real incident, and it is the single most important behaviour on the payment path.
3. **Every route has exactly one `<h1>` and no heading-level skips** — measured on all 11.
4. **Bad input never breaks a page**: an unknown collection, an unknown piece, a piece requested under the wrong collection, and an unrecognised `?metal=` each resolve to a usable screen with a way back.
5. **A piece above the payment provider's per-transaction cap does not offer a buy button**, because the failure would happen on a foreign domain after our reservation already locked the piece for 30 minutes.

---

## Improvement plan

| Priority | Finding | Effort | Status |
| --- | --- | --- | --- |
| P0 | HLZ-706 touch targets (storefront-local) | M | **fixed this pass** |
| P0 | HLZ-706 `button.md = 40` in the design system | S | **raised, not fixed** — owner decision |
| P1 | HLZ-707 11 px on load-bearing text | S | **fixed this pass** |
| P1 | HLZ-708 tablet navigation | S | **fixed this pass** |
| P2 | HLZ-709 undo/confirm on `Vaciar` | S | open |
| P2 | HLZ-710 remove the preview switcher once the menu is chosen | XS | open, by design |
| P2 | HLZ-711 photograph the three Símbolos | — | content, not code |

### The two gaps that would move the score most

- **P5 Controllability (72)** is the lowest scoring principle. One fix — an undo on `Vaciar` — addresses the only genuinely destructive action in the flow.
- **P7 Engagement (70)** is limited by content, not craft. Three photographs would move it more than any code change.

---

## Re-audit trigger

Re-run this audit when any of these is true: the inventory stops being a fixture; the payment rail becomes real; the menu placement is chosen; or the storefront leaves the `TIENDA_PUBLICA` flag. The first two invalidate the P1 and P6 scores outright.
