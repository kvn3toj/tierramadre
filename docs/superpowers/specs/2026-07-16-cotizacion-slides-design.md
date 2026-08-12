# Cotización → Google Slides Deck — Design

**Date:** 2026-07-16
**Scope:** Two repos. `TierraMadre` (Python renderer + one new API endpoint) and
`anima-bot` `tierra-madre` profile only (`@Anima_TM_bot`). The `trinity-mvp` bot is untouched.
**Status:** Approved (pending spec review)

## Goal

From Telegram, turn a `/cotizacion` estimate into a client-ready **Google Slides deck** in
Drive. The bot already quotes: it searches Convex inventory for price comparables, derives an
estimate, and files an Anima note behind a Sí/No gate. This adds the missing **render +
publish** leg, reusing the existing 1080×1920 portrait renderer.

The deck lands as **native Google Slides with editable text boxes** (a `.pptx` uploaded with
conversion), because the user reviews and tweaks it before sending to the client.

## Non-goals (this MVP)

- **No Soul-style production plan.** No `líneas`, no priced `opciones` per line, no
  `recomendada` marker, no `lamina_modulos`. Those stay a Soul-only fixture. This generates a
  simple per-client quote: portada + N pieces + resumen.
- **No Slides-API template.** The deck's design stays in Python. Rejected because Slides
  cannot composite photo backgrounds and cannot do the computed layout math (see
  "Rejected alternatives").
- **No TypeScript port of the renderer.**
- **No fix for `/api/media-upload`'s missing auth gate.** Pre-existing; flagged, out of scope.
- **No aspect-ratio fix for wide pieces.** Bracelet-shaped pieces still leave white bands.
  Background handling is in scope; aspect mismatch is not.
- **No PDF export, no direct-to-client send.** Bot returns a Drive link; a human sends it.

## Interaction model

1. Write-trusted user runs `/cotizacion` in Telegram and the agent produces an estimate
   (existing behaviour, unchanged).
2. Agent offers to generate the deck. This is a **write** (it creates a Drive file), so it goes
   through the existing write gate (`makeCanUseTool`) and requires an explicit Sí.
3. On Sí: bot renders locally, uploads, and replies with the Slides link.

## Data flow

```
/cotizacion  →  buscar_comparables → Convex            [existing]
             →  agent derives ESTIMADO                  [existing]
             →  "¿Genero el deck?" → Sí/No write gate   [existing]
                   │
                   ├─ bot writes quote.json
                   ├─ spawn TM_COTIZADOR_BIN --quote quote.json --out deck.pptx
                   │     ├─ fetch photo per item (/api/serve-drive-image?fileId=)
                   │     ├─ quality guard → composite | bleed | placeholder
                   │     ├─ build portada + N×lamina_pieza + resumen
                   │     └─ assert check_layout → nonzero exit on overflow
                   ├─ POST deck.pptx → ${TM_API_BASE}/api/cotizacion-deck   [NEW, bearer-gated]
                   │     └─ drive.files.create(mimeType: …google-apps.presentation)
                   │        into TM-Studio/cotizaciones/asesores/{email}/    [existing helper]
                   └─ reply Slides link + file Anima note                    [existing]
```

## Components

### 1. `quote.json` — the TS↔Python seam

Field names reuse `api/cotizacion-save.ts`'s existing vocabulary (`quotationNumber`,
`asesorEmail`, `clientName`, `itemNumber`, `total`) rather than inventing a parallel one.

```json
{
  "quotationNumber": "TM-2026-0043",
  "cliente": "Nombre Cliente",
  "asesor": { "email": "asesor@tierramadre.co", "name": "Nombre Asesor" },
  "fecha": "16 de julio de 2026",
  "moneda": "COP",
  "qrUrl": "https://tierramadre.app/cotizacion/TM-2026-0043",
  "items": [
    {
      "itemNumber": 32,
      "nombre": "Venus",
      "gemas": "Esmeralda F2 · Fina Sublime Verde Chivor · 1,2 Ct",
      "joya": "Montura solitario en Oro 18 k · 3 g",
      "unidades": 1,
      "unitario": "$7'907.465",
      "total": "$7'907.465",
      "fotoFileId": "1AbC…"
    }
  ],
  "total": "$7'907.465"
}
```

Prices arrive **pre-formatted as strings**. The renderer never does money math — it is a
layout engine. Formatting stays in one place (the bot), so the deck can't disagree with the
Telegram message or the Anima note.

`fotoFileId` is optional. Absent or unfetchable → placeholder slide (see Error handling).

### 2. Renderer refactor (`TierraMadre/scripts/`)

`build-cotizacion-pptx.py` currently imports its data from `build-cotizacion.py`, where the
Soul plan is hardcoded. Split the data from the engine:

- `cotizacion_datos.py` — the Soul plan `PRODUCTOS`/`MODULOS`/`RESUMEN`, unchanged, now an
  explicit **fixture** rather than the only possible input.
- `build-cotizacion-pptx.py` — gains a CLI:
  `--quote <json> --out <pptx> [--fotos-cache <dir>]`. With no `--quote` it builds the Soul
  deck exactly as today (keeps the existing manual workflow alive and makes the regression
  test trivial).
- `cotizacion_fotos.py` — new. Fetch by fileId → cache → quality guard.

**The simple-quote path already exists.** `lamina_pieza` renders a "Precio de la pieza" row
when a piece has no `opciones` — that is the Trinity slide. A per-client quote is exactly that
path, so a generic deck is `lamina_portada + N × lamina_pieza + lamina_resumen` with no new
layout code.

### 3. Photo quality guard (`cotizacion_fotos.py`)

Derived from measured evidence, not preference. The `products/` photos are not guaranteed to
be clean studio shots on white. Measure the border ring of each fetched photo:

| Border luminance       | Treatment                                | Why                                                                                                                                                                       |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mean ≥ 248             | `_blanquea_fondo` + contain-fit on white | The current path. Flood-fill from the edges kills the 242–255 JPEG veil that draws grey rectangles.                                                                       |
| mean < 248             | **bleed** (`sangra`, cover-fit)          | A non-white photo floated on white shows its rectangle. Bled edge-to-edge it reads as intentional — this is exactly why the Canutillo slide is the best in the Soul deck. |
| no photo / fetch fails | placeholder                              | Existing pergamino + "Fotografía en producción".                                                                                                                          |

Pure function `elige_encuadre(im) -> "blanquear" | "sangrar"`, tested on two fixture images.

Cache: `~/.anima-bot/fotos/{fileId}.jpg`, mirroring the bot's existing
`~/.anima-bot/photos/YYYY-MM-DD/` archive convention.

### 4. Adaptive summary (`lamina_resumen`)

Today it hardcodes 5 rows at `y += 100`, because Soul has exactly 5 lines. With variable N
this overflows the footer. Change: compute row height from N to fill the available band
rather than assuming 5.

Define the rule, not a magic max:

- `BANDA = PIE_Y - y_primera_fila - ALTO_BLOQUE_TOTAL`, where `ALTO_BLOQUE_TOTAL` is the
  measured height of the filete + "Precio Total del Plan" + aclaración that follow the rows.
- `ALTO_FILA = clamp(BANDA / N, ALTO_FILA_MIN, 100)` — capped at today's 100 so a 3-item deck
  does not stretch into something that looks unlike the Soul deck.
- `ALTO_FILA_MIN = 72`: a row is a 34 pt Cormorant name (~39 px line at the measured 1.15 em)
  plus a 13 pt subtitle (~15 px) plus breathing room. Below this, rows collide.
- If `BANDA / N < ALTO_FILA_MIN` the deck cannot fit: exit nonzero (see Error handling).

The maximum N falls out of that arithmetic instead of being hardcoded, and `check_layout.py`
enforces the outcome independently. Pagination is a follow-up, not MVP.

### 5. `POST /api/cotizacion-deck` (new)

Reuses `_lib/oauth-drive-client.js`, `sharedDriveId`, and `cotizacion-save.ts`'s asesor-folder
helper (extract it to `_lib/drive-helpers.js` if it is still private to that module).

```
drive.files.create({
  requestBody: { name, mimeType: 'application/vnd.google-apps.presentation',
                 parents: [asesorFolderId] },
  media: { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
           body: Readable.from(buffer) },
  supportsAllDrives: true,
})
```

The `requestBody.mimeType` differing from the `media.mimeType` is what triggers Drive's
**conversion to native Slides** — this is the mechanism that yields editable text boxes.

**Bearer-gated** via `_lib/bearer.ts`. Deliberately unlike `/api/media-upload`, which has no
auth gate.

**Idempotent on `quotationNumber`:** look for an existing deck of that name in the folder;
if found, `files.update` the media instead of creating a duplicate. A double-Sí must not
litter the asesor's folder.

### 6. Bot side (`anima-bot`, `tierra-madre` profile)

- `TM_COTIZADOR_BIN` env var → the renderer. Same pattern as the existing `KINGDOM_MCP_BIN`,
  `OBSIDIAN_MCP_BIN`, `WHISPER_BIN`.
- `src/cotizacion/quote.ts` — pure `buildQuote(items, cliente, asesor) -> QuoteJson`.
  Unit-tested in isolation like the existing `selectComparables`.
- `src/cotizacion/deck.ts` — spawn renderer, POST result, return link.
- Feature is off unless `TM_COTIZADOR_BIN` + `TM_API_BASE` are set, matching how
  `cotizacionServer` is already gated on the Convex/Fotosíntesis config being present.

## Error handling

| Failure                         | Behaviour                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Photo fetch 404 / times out     | Placeholder slide. **Not** a build failure.                                                                                                    |
| Any item missing a price        | **Refuse to render.** The agent's existing "never invent a number" rule extends to the deck: a polished deck makes a guess look authoritative. |
| Renderer exits nonzero          | Bot reports stderr tail. No Drive file was created — render precedes upload, so nothing half-publishes.                                        |
| `check_layout` fails (overflow) | Renderer exits nonzero before writing the deck. Loud, not silent.                                                                              |
| Drive upload fails              | `.pptx` already on disk; bot reports the local path so work isn't lost. Retryable.                                                             |
| Double Sí                       | Idempotent on `quotationNumber` — updates, never duplicates.                                                                                   |

`check_layout.py` is promoted from dev tool to **build assertion inside the renderer**. With
variable N, footer overflow stops being hypothetical and becomes the expected failure mode.

## Testing

- **Soul regression fixture (the important one).** Express the Soul plan as `quote.json`,
  rebuild, diff the render against known-good PNGs. The refactor must not move a pixel of the
  existing deck. Harness already exists: LibreOffice → PDF → `pdftoppm` → per-slide numpy
  diff, which already proved this session's changes touched only the intended bands.
- **Quality guard:** two fixture images (white-bg, grey-bg) → asserts `blanquear` vs `sangrar`.
- **Composite invariant:** after build, all four corners of every non-bleed composite == 255
  and tesela seams measure a 0.0 tone jump.
- **Layout invariant:** `check_layout.py` passes for N = 1, 5, and the max; fails at N+1.
- **TS:** `buildQuote` shape test (pure function).
- **Endpoint:** mocked `drive.files.create` asserting conversion mimeType, `parents`,
  `supportsAllDrives`, and the idempotent update path.
- **Manual smoke, once:** one real quote → deck → open the Slides link.

## Rejected alternatives

**Google Slides API template + `batchUpdate`.** The literal reading of the original idea, and
it has a real benefit: restyling in Slides with no code. Rejected on two grounds. (1) Slides
cannot composite — it places the raw photo, so the grey-rectangle bug fixed on 2026-07-16
returns immediately unless photos are pre-composited, which needs the Python anyway. (2) A
static template cannot do the computed layout math; the title-height fix that stops a two-line
title colliding with the GEMAS row is calculated per slide, and a template instead autofit-
shrinks text, silently drifting typography deck to deck.

**Port the renderer to TypeScript** (pptxgenjs + sharp). One language, self-contained bot, but
it reimplements the background flood-fill, framing, and Cormorant line metrics in libraries
with different text metrics — maximal regression risk for no user-visible gain.

## Notes / risks

- **`/api/media-upload` has no auth gate** and writes to the Shared Drive. Pre-existing, out of
  scope, recorded here so it isn't forgotten.
- **No font dependency in production.** `python-pptx` writes font _names_ only; the bot's
  machine does not need Cormorant installed. Google Slides supplies the face on render.
  Only local LibreOffice verification needs the fonts.
- **Bot couples to the TierraMadre repo path** via `TM_COTIZADOR_BIN`. Consistent with the
  existing `*_BIN` vars, but the bot breaks if the repo moves.
- Prices are a **snapshot**; the deck stamps `fecha` (already does).
