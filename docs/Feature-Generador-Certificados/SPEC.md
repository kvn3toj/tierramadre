# Spec — Generador de Certificados (Fotosíntesis Admin)

**Repo:** tierramadre.app · **Surface:** Fotosíntesis admin · **Stack:** React (Vite) + Convex (+ spreadsheets as data source)
**Status:** Draft for implementation · **Owner:** _TBD_ · **Last updated:** 2026-06-24

> Scope note: data sources, auth, roles, inventory and users **already exist in production**. This spec covers **only the certificate generator feature** — reading existing data, rendering the exact design, and exporting.

---

## 1. Summary

Admins in Fotosíntesis need to produce branded certificates on demand without going back to the design team. This feature adds a **Generador de Certificados** screen that lets an admin pick a certificate type, auto-fill it from existing production data (a treasure/gem, an ambassador, or a member), preview the **exact design-team artwork** with the variable fields filled in, and export a print-ready PDF / shareable PNG.

The core principle: **the certificate IS the original artwork.** We render the designer's art (exported from the Illustrator/PDF source) as a fixed background and overlay only the variable fields on top at exact coordinates. We do **not** re-create the design in CSS.

Certificate types:
1. **Certificación de Origen** — gem/treasure certificate (the "treasure browser"). Portrait.
2. **Certificado Embajador Semilla** — ambassador recognition. Landscape.
3. **Carnet TM 2026** — member card. Portrait. _(artwork pending — see Open Questions)_

A working HTML mockup of all three exists (`generador-certificados-tierramadre.html`) and is the visual reference for this spec.

---

## 2. Goals

- An admin can generate any supported certificate in **under 60 seconds** from selecting a record to downloading the file.
- Output is **visually identical** to the design-team source (same textures, logo, fonts, seals, decoration) — variable fields are the only difference between two certificates of the same type.
- The generator is **data-driven**: adding a new template or field is a config change, not new code.
- Variable data is **pulled from existing production sources** (Convex / spreadsheets); admins never re-type catalog data.

## 3. Non-Goals (v1)

- ❌ Verification page / QR codes — not requested for v1.
- ❌ Storing or versioning issued certificates in the DB.
- ❌ Email / WhatsApp delivery of certificates.
- ❌ Bulk / batch generation.
- ❌ Multi-language toggle (artwork is Spanish; copy stays as-is).
- ❌ A new editor for the artwork itself — artwork comes from the design team.
- ❌ Creating/altering the gem, ambassador, or member data models (they already exist).

---

## 4. Architecture

Client-rendered, client-exported. No new backend infra.

```
React (Vite) — Fotosíntesis admin
└── /admin/certificados  (CertGeneratorPage)
    ├── useQuery(api.treasures.list)      ← existing Convex data
    ├── useQuery(api.ambassadors.list)    ← existing Convex data
    ├── useQuery(api.members.list)        ← existing Convex data
    ├── TEMPLATES config (static, in repo)
    ├── <CertForm>      — type tabs · record picker (autofill) · editable fields
    ├── <CertPreview>   — <img> artwork background + absolutely-positioned overlay fields
    └── Export          — Print→PDF (primary) · PNG (secondary)
```

- **Data:** read-only Convex queries (or the spreadsheet-backed equivalent already in prod). The generator never writes.
- **Templates:** static config + background image assets committed to the repo (`/assets/certificados/`). See §6.
- **Rendering:** `CertPreview` draws the artwork at its native pixel space and scales with a CSS `transform: scale()` to fit the viewport. Overlay fields are positioned in the **same native coordinate space** so the measured coordinates map 1:1.
- **Export:** see §8.

### PDF engine recommendation (you asked me to choose)

**Recommendation: client-side, browser-native print for PDF + raster capture for PNG.** Rationale:

- Convex runs functions in a restricted serverless runtime — it **cannot run headless Chromium**, so a server-side PDF renderer would require external infra (Browserless/Gotenberg/a separate Puppeteer worker). That's overkill for an admin-only generator.
- The preview already **is** the artwork at exact dimensions, so "print the preview" yields a pixel-faithful result with **vector-crisp, selectable text** and the smallest file size.

Concretely:
- **PDF:** `window.print()` with a print stylesheet that isolates the active certificate and sets `@page { size: <Wpx> <Hpx>; margin: 0 }`. The background `<img>` and overlay text print at full fidelity.
- **PNG:** `html-to-image` (`toPng`, preferred) or `html2canvas` at `pixelRatio: 3` for social/sharing.
- **Future (only if archival server PDFs are needed):** a Convex `action` that calls an external render service, or a Cloudflare/Vercel function with Puppeteer loading a print URL. Out of scope for v1.

---

## 5. Data model & field mapping

The generator consumes existing records. It needs read access to the fields below (names are indicative — map to the real prod schema during implementation).

### 5.1 Treasure / gem → Certificación de Origen

| Cert field | Source field (existing) | Notes |
|---|---|---|
| `name` | `treasure.name` | e.g. "Corazón de la noche" |
| `tipo` | `treasure.type` | |
| `calidad` | `treasure.quality` | optional per piece |
| `color` | `treasure.color` | |
| `peso` | `treasure.weight` | e.g. "1.31 Ct" |
| `corte` | `treasure.cut` | optional per piece |
| `joya` | `treasure.jewelry` | optional (only some pieces) |
| `tecnica` | `treasure.technique` | optional (only some pieces) |
| `photo` | `treasure.imageUrl` | circular gem photo |
| `quote` | — | **fixed** in artwork, not a field |

Reference data (the 8 auction pieces, exact values from the design PDF — use as fixtures/QA, real values come from prod):

```
Corazón de la noche  — Tipo: Gema / Cristal Faceteado · Calidad: Comercial Fina · Color: Verde menta · Peso: 1.31 Ct · Corte: Corazón
Gota Sagrada         — Tipo: Murralla · Color: Verde menta · Peso: 2 ct · Joya: Baño de Oro · Técnica: Tejido artesanal / colonial
Soberanía Imperial   — Tipo: Gola · Calidad: Fina Escencial · Color: Verde Natural · Peso: 1.6 Ct · Corte: Lágrima · Joya: Plata Ley 925 y Circones Naturales
El Secreto de Tena   — Tipo: Canutillo · Calidad: Fina Escencial · Color: Verde Natural · Peso: 1.24 Ct · Corte: Natural
Diosa Maya           — Tipo: Gema / Cristal Faceteado · Calidad: Fina Sublime · Color: Verde Limón · Peso: 1.07 Ct · Corte: Trillion · Joya: 2.60 Gr Oro 18k · Técnica: Tejido Veneciano
Infinito Amor        — Tipo: Gema / Cristal Faceteado · Calidad: Fina Sublime · Color: Verde Vivido · Peso: 0.75 Ct · Corte: Redonda · Joya: Oro 18k
Resplandor Celestial — Tipo: Gema / Cristal Faceteado · Calidad: Fina Esencial · Color: Verde Vívido · Peso: 1.0 Ct · Corte: Redondo · Joya: 1.5 Gr Oro 18k · Técnica: 28 Diamantes Naturales
Intuición            — Tipo: Gema / Cristal Faceteado · Calidad: Extrafina · Color: Verde natural · Peso: 0.88 Ct · Corte: Marquise
```

Fixed quote (baked in artwork, all pieces): _"Tu elección hoy siembra semillas de abundancia que el universo convierte en paz verdadera. Esta esmeralda es más que una gema: es un pacto entre la tierra y el alma."_

### 5.2 Ambassador → Certificado Embajador Semilla

| Cert field | Source field | Notes |
|---|---|---|
| `name` | `ambassador.fullName` | only editable text field |
| `photo` | `ambassador.photoUrl` | inside gold braided ring |

All other copy (eyebrow "Nuevo logro, misma visión", body, "Gracias por ser voz, puente y propósito", CEO signature block "Isa La Negra Vikinga / Warrior Portocarrero / ID. 66.660.945 / CEO") is **fixed** in the artwork.

### 5.3 Member → Carnet TM 2026

| Cert field | Source field | Notes |
|---|---|---|
| `name` | `member.fullName` | |
| `role` | `member.role` | e.g. "Embajador" |
| `id` | `member.idNumber` | |
| `email` | `member.email` | |
| `photo` | `member.photoUrl` | |

---

## 6. Template system (the exact details)

Each certificate is `background image + ordered overlay fields`, all in the artwork's native pixel coordinate space. This is the authoritative source of truth for placement.

### 6.1 Config schema

```ts
type FieldKind = 'text' | 'details' | 'photo';

interface TemplateField {
  key: string;                 // maps to a cert data key (§5)
  kind: FieldKind;
  x: number; y: number;        // top-left, in template px space
  w?: number; h?: number;
  align?: 'left' | 'center';
  font?: {                     // text/details only
    family: string; style?: 'normal'|'italic'; weight?: number;
    size: number; lineHeight: number; color: string;
  };
  cover?: string;              // hex swatch painted under the field to mask the baked sample text; omit if none
  shape?: 'circle';           // photo only
  labelColor?: string;        // details only — color of "Tipo:" etc.
}

interface CertTemplate {
  id: 'origen' | 'embajador' | 'carnet';
  label: string;
  background: string;          // /assets/certificados/bg_*.jpg
  page: { w: number; h: number };   // coordinate space (= artwork px)
  print: { w: number; h: number; orientation: 'portrait'|'landscape' };
  fields: TemplateField[];
}
```

### 6.2 Certificación de Origen

- `background`: `bg_origen.jpg` · `page`: **1080 × 1920** (portrait)
- Baked & untouched: green side band, TIERRA MÄDRE logo, fixed quote, gold seals, marble texture.

| key | kind | x | y | w | h | font / notes |
|---|---|---|---|---|---|---|
| `photo` | photo (circle) | center **648, 600** | — | Ø **368** | | object-fit: cover; clipped to circle; sits inside the green ring |
| `name` | text | 434 | 940 | 560 | 142 | Cormorant Garamond italic 600, **50px**/51, `#2c2c2c`, cover `#FCF7EC` |
| `details` | details | 434 | 1082 | 540 | 210 | Cormorant Garamond 28px/31.2, value `#2c2c2c`, label `#0F5C3A` bold, cover `#FCF7EC` |

`details` renders one line per **non-empty** field in this order, `"<Label>: <value>"`: Tipo, Calidad, Color, Peso, Corte, Joya, Técnica.

### 6.3 Certificado Embajador Semilla

- `background`: `bg_embajador.jpg` · `page`: **792 × 612** (landscape)
- Baked & untouched: maroon "EMBAJADOR SEMILLA" ribbon, logo, all body copy, signature + seals, olive/gold botanical decoration, gold braided photo ring.

| key | kind | x | y | w | h | font / notes |
|---|---|---|---|---|---|---|
| `photo` | photo (circle) | center **136, 251** | — | Ø **160** | | clipped to circle; sits inside the gold braided ring |
| `name` | text | center **529**, top **279** | | 380 | 44 | Cormorant Garamond 600, **37px**/44, `#8A2230`, center-aligned, cover `#F7F2E4` |

### 6.4 Carnet TM 2026 _(pending artwork)_

Same pattern once the source PDF is provided (`CARNET TM ALVARO PELAEZ.pdf`). Expected fields: `photo`, `name`, `role`, `id`, `email`. Until then the mockup ships an approximate CSS fallback flagged "arte aprox." — see Open Questions.

### 6.5 Fonts

Overlay text uses **Cormorant Garamond** (closest web match to the artwork serif). If the design team's exact font is available, self-host it and swap `font.family` — no other change needed. Everything else is baked into the artwork, so only the few overlay fields depend on the web font.

### 6.6 Asset pipeline (how backgrounds are produced)

Backgrounds are the design-team PDFs rendered to image, committed to the repo:

```
pdftoppm -png -r 200 "Certificado ….pdf" out      # render at ~200 DPI
convert out-1.png -resize 1080x1920 -quality 90 bg_origen.jpg
```

Origen page space is 1080×1920; embajador 792×612 (background exported larger, e.g. 1584×1223, then `object-fit: fill` into the 792×612 box). Gem photos for autofill, if not already in prod, are cropped from each piece's PDF at the ring circle (center 648,600, r≈177). When a fresh artwork revision arrives, re-render and replace the asset — coordinates stay valid as long as the layout is unchanged.

---

## 7. UI / components

```
<CertGeneratorPage>
 ├─ <TypeTabs>            origen | embajador | carnet
 ├─ <CertForm>
 │   ├─ <RecordPicker>    Convex query → dropdown; on select → autofill all fields
 │   ├─ field inputs      bound to a local draft state (editable after autofill)
 │   └─ <PhotoInput>      upload (object URL) or paste URL; default = record photo
 └─ <PreviewPane>
     ├─ <CertPreview template={t} data={draft} />   ← bg img + overlay fields, scaled to fit
     ├─ zoom controls
     └─ <ExportBar>       Imprimir / PDF · Descargar PNG
```

- **State:** a single `draft` object per type; `RecordPicker` populates it, inputs edit it, `CertPreview` is a pure function of `(template, draft)`.
- **CertPreview:** outer box at `page.w × page.h`, `transform: scale(fit)`; `<img class="bg">` fills it; each field absolutely positioned from config. `cover` renders as a solid rect behind the field to mask the baked sample text.
- **Accessibility / i18n:** admin UI in Spanish, matching Fotosíntesis.

---

## 8. Export

- **Imprimir / PDF (primary):** inject `@page { size: {page.print.w}px {page.print.h}px; margin: 0 }`, add a `print` class that hides admin chrome and shows only the active `.cert` at scale 1, then `window.print()`. User picks "Save as PDF". Vector text, exact size.
- **Descargar PNG (secondary):** `html-to-image.toPng(certNode, { pixelRatio: 3 })` → download. For social/preview use.
- **Filename:** `TierraMadre_<tipo>_<slug(name)>.{pdf,png}`.

---

## 9. User stories

- As an **admin**, I select a treasure from the catalog and the Origen certificate fills in instantly with its exact data and photo, so I don't re-type anything.
- As an **admin**, I can correct any field before exporting (e.g. fix a typo, swap a photo), so the output is always right.
- As an **admin**, I export a print-ready PDF that matches the design team's artwork exactly, so I can send/print it without design review.
- As an **admin**, I generate an ambassador certificate by picking the person and uploading their photo, with all the fixed wording already in place.
- As an **admin**, I switch certificate type with one click and the form + preview update accordingly.

---

## 10. Acceptance criteria

- [ ] Given a treasure is selected, when autofill runs, then `name, tipo, calidad, color, peso, corte, joya, tecnica, photo` populate from the record and the preview updates.
- [ ] Given a field is empty (e.g. no Corte), when the details block renders, then that line is **omitted** (no empty "Corte:").
- [ ] Given any overlay field, when rendered, then it sits at the configured coordinates and **fully masks** the baked sample content (no double text / no peeking sample photo).
- [ ] Given the Origen template, then the fixed quote, seals, logo and band remain pixel-identical to `bg_origen.jpg`.
- [ ] Given an admin clicks Imprimir / PDF, then the output page size equals the certificate dimensions, text is vector (selectable), and no admin UI appears.
- [ ] Given an admin clicks Descargar PNG, then a ≥3× resolution PNG of only the certificate downloads.
- [ ] Given a photo is uploaded or set by URL, then it is clipped to the circular slot and centered (object-fit: cover).
- [ ] Given the viewport is resized, then the preview scales to fit without distorting the artwork aspect ratio.
- [ ] Given a different certificate type tab is selected, then the form fields, preview, and export dimensions switch correctly.

---

## 11. Open questions

- **Carnet artwork** _(blocking for carnet only)_: need `CARNET TM ALVARO PELAEZ.pdf` (or the .ai export) to produce the exact background and measure field coordinates. Origen + Embajador are ready.
- **Gem photos in prod** _(data)_: does each treasure already have a usable `imageUrl`, or should the generator fall back to cropping from the piece's certificate? Affects autofill of the gem photo.
- **Exact fonts** _(design)_: can the design team share the licensed font files used in the artwork? If not, we ship Cormorant Garamond as the overlay font.
- **Where to commit assets** _(eng)_: confirm `/public/assets/certificados/` (Vite) vs Convex file storage for the background images.
- **Ambassador/member photos** _(data)_: are these stored in prod, or always uploaded at generation time?

---

## 12. Phasing

- **Phase 1 (this spec):** Origen + Embajador generators, autofill from prod data, editable fields, live preview, PDF + PNG export.
- **Phase 1.1:** Carnet, once artwork is provided (same pattern, config-only addition).
- **Later (not committed):** server-stored issued certs, QR verification, bulk generation, delivery — each is an independent follow-up.
