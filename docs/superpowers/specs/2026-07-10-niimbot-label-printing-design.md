# NIIMBOT Item Label Printing (Phase 3: 3a Export + 3b Direct Print)

## Problem

Item QR codes only exist on-screen today (the product detail page's `AdditionalInfo.tsx`). There is no way to get a QR onto a physical NIIMBOT label without manually screenshotting the browser and importing that screenshot into the NIIMBOT app — slow, per-item, and produces a blurry, arbitrarily-sized image.

This is Phase 3 of the QR work (Phase 1: camera scanner, Phase 2: wiring Compra/Kardex/Venta — both shipped). It ships as two sequential sub-projects:

- **3a — Export:** generate a correctly-sized, crisp label image for any already-registered item, downloadable and importable into NIIMBOT's own app. Works on every device/browser.
- **3b — Direct print:** where the browser supports it, skip the NIIMBOT app entirely and print straight from TierraMadre via Web Bluetooth, using the community `@mmote/niimbluelib` library.

3b depends on 3a's label-rendering component; 3a must ship and work standalone first, since it's the only path that works everywhere (see Browser Support below).

## Non-goals

- Printing labels for brand-new/unregistered items (the scanner's `notFound` state) — blocked on a separate, not-yet-made decision about gaps in item numbering. Out of scope here.
- A model-picker UI for multiple printer models — only one physical printer (NIIMBOT D11_H) exists today; the model is a hardcoded constant, not a setting.
- Any change to the existing product-detail QR (`AdditionalInfo.tsx`), the scanner (`EscanearPage.tsx`), or Phase 2's Compra/Kardex/Venta wiring.
- Grayscale or two-color (red/black) label printing — `niimbluelib` only supports 1-bit black/white today; labels are pure QR + black text.

## Label content & size (confirmed with the user)

- **Physical size:** NIIMBOT D11 tape, 12mm fixed height, variable length (continuous thermal tape, doesn't need to fill a fixed 90mm). At the printer's native 203 DPI, that's a **96px-tall strip**, width sized to content.
- **Content:** QR code (`${STUDIO_BASE_URL}/product/${itemId}`, same convention as `AdditionalInfo.tsx:89`) + item number + nombre (truncated) + peso. No price — these are internal traceability tags, not customer-facing price tags.
- **Layout:** QR left-aligned (~80×80px), text stack to its right (item number largest/bold, nombre truncated below it, peso smallest).

## 3a: Export

### Components

- **`src/pages/admin/Fotosintesis/labels/LabelPreview.tsx`** (new) — the off-DOM label component. Sibling pattern to `KardexPreview.tsx`/`MovimientoKardexPreview.tsx`: a pure presentational component taking one item's data as props (`itemId: string, nombre?: string, peso?: string`), rendering the QR + text layout described above at the 96px-tall, content-width-sized layout. No Convex query inside this component — callers pass data in, matching the existing preview-component convention in this codebase.
- **`src/pages/admin/Fotosintesis/labels/exportLabel.ts`** (new) — `renderLabelPngBlob(node: HTMLElement, opts?: { pixelRatio?: number }): Promise<Blob>`, rasterizing one `LabelPreview` DOM node to a PNG Blob via `html2canvas`, mirroring the existing `renderCertPngBlob` pattern in `src/pages/admin/Fotosintesis/certificados/exportCert.ts:316-333` (rasterize → `canvasToDataUrl` → `fetch(dataUrl).blob()`). Default `pixelRatio` should target 203 DPI output (the printer's native resolution) rather than screen-resolution, since this PNG needs to be crisp when imported into NIIMBOT's own label editor at physical size.
- **`src/pages/admin/Fotosintesis/labels/downloadLabelsZip.ts`** (new) — for batch export: takes an array of `{ itemId, nombre, peso }`, renders each through `LabelPreview` + `renderLabelPngBlob` in sequence, and packages the PNGs into a zip (`jszip`, new dependency — no zip library exists in this codebase today) named per item (`B-001-G1.png`, `B-001-G2.png`, ...), triggering a single browser download of the zip. A zip of individual PNGs was chosen over a merged multi-page PDF because each label gets imported into NIIMBOT separately regardless — a zip matches that per-item workflow, a PDF would require the operator to extract pages themselves.

### Entry points

- **Single item — `EditItemDrawer.tsx`:** a new "Imprimir etiqueta" button (matching the existing button/notify conventions already in this file — `notify()` calls confirmed at `EditItemDrawer.tsx:561-584`) that renders `LabelPreview` off-screen with the currently-open item's `itemId`/`nombre`/`peso` (already in scope as component state — this is the same file the QR-scanner's Compra button already deep-links into), calls `renderLabelPngBlob`, and triggers a single-file download.
- **Batch — `LoteResumenPage.tsx`:** a new "Imprimir etiquetas del lote" action. This page already queries `lotItems.listByLote` and `products.listByLote` for the lote's full item list (`LoteResumenPage.tsx:118,122`), so no new Convex query is needed — the button maps that existing data into `downloadLabelsZip`'s input shape and triggers the batch download.

## 3b: Direct print via Web Bluetooth

### Browser support (confirmed via research, not assumed)

Web Bluetooth (`navigator.bluetooth`) works in Chrome/Edge/Opera on Windows and macOS, and Chrome on Android (including as an installed PWA on all of these). It does **not** work in Safari (macOS or iOS — no plans to implement), Firefox (no plans), or Linux Chrome without a manually-enabled experimental flag. This gap is structural and permanent, not a bug to work around — it's why 3a has to exist as the universal path and 3b is strictly additive.

**Feature detection gates the whole feature:** `'bluetooth' in navigator` determines whether the "Imprimir directo" button renders at all. Where it's `false`, only the 3a export button shows, plus a one-line note: "Impresión directa solo disponible en Chrome/Edge (Windows, Mac, Android)."

### Library

`@mmote/niimbluelib`, installed **pinned to an exact version** (`npm install -E @mmote/niimbluelib`, no `^` range) — the package is Alpha and its own README warns the API can change between releases; a caret range risks a silent breaking upgrade on the next `npm install`. Confirmed via research: actively maintained (published within the last few days as of this writing), ships ESM + `.d.ts`, works with a standard Vite `import`.

### Print pipeline (grounded in the library's actual documented API)

1. Draw the label (same visual content as `LabelPreview.tsx`) onto an off-screen `<canvas>`, with the relevant dimension padded to a multiple of 8px — `ImageEncoder.encodeCanvas` throws otherwise. The 96px label height already satisfies this; width needs explicit padding if it isn't already a multiple of 8.
2. `ImageEncoder.encodeCanvas(canvas, printDirection)` → packed bitmap the printer understands.
3. `new NiimbotBluetoothClient()` → `await client.connect()`. This call must happen synchronously inside the button's `onClick` handler (Web Bluetooth requires a user gesture to show the OS device picker — it cannot be triggered from a `useEffect` or fired after an `await` boundary breaks the gesture chain).
4. `client.abstraction.newPrintTask("D11_H", {...})` → `printInit()` → `printPage(encoded, quantity)` → `await waitForPageFinished()` → `await waitForFinished()` → `printEnd()`.

**Model:** hardcoded to the string `"D11_H"` (confirmed present in the library's `PrinterModel` enum) — the only printer this business owns. No settings UI; promote to a constant elsewhere only if a second printer model is ever added.

### Components

- **`src/pages/admin/Fotosintesis/labels/useNiimbotPrinter.ts`** (new hook) — wraps `NiimbotBluetoothClient` connection lifecycle (`connect`, `disconnect`, connection status) and the print pipeline above, exposing `{ supported: boolean, connected: boolean, connect(), printLabel(canvas, quantity), printing: boolean }`. `supported` is the `'bluetooth' in navigator` feature-detect, computed once.
- Reuses `LabelPreview.tsx` from 3a for the visual content — 3b's canvas is drawn from the same layout logic, not a second, divergent implementation.
- **Single-item printing:** an "Imprimir directo" button next to 3a's "Imprimir etiqueta" button in `EditItemDrawer.tsx`, rendered only when `useNiimbotPrinter().supported` is `true`.
- **Batch printing (`LoteResumenPage.tsx`):** reuses one connected `NiimbotBluetoothClient` across the whole lote loop — reconnecting per label would be slow and add failure surface — showing "N/total impreso" progress via the library's `printprogress` event, using the same `notify()` toast pattern already established in this codebase.

### Failure handling

Connection failures, print errors, or any thrown exception from the pipeline surface via `notify(message, 'error')`, with the message explicitly pointing back at the 3a export button as the fallback ("No se pudo conectar con la impresora — usa 'Imprimir etiqueta' para exportar la imagen"). Never a silent failure — the library's own issue tracker documents real device/firmware quirks (e.g. some D11 firmware needs a heartbeat packet sent before the first successful print), so a clear, actionable error message matters more here than in most flows.

## Testing

No new automated tests are planned for the rendering/rasterization/print-pipeline code itself — matching this codebase's existing convention for the Kardex/certificate preview-and-export components, which are also untested and verified manually. `LabelPreview.tsx`'s pure data-shaping (if any — e.g. peso/nombre truncation logic) should get a plain unit test if it grows non-trivial, matching the `parseTmQr.test.ts` precedent from Phase 1.

Manual verification, in order:

1. **3a single-item:** open `EditItemDrawer` for a registered item, tap "Imprimir etiqueta", confirm a correctly-named, crisp PNG downloads and looks right when imported into NIIMBOT's template editor as an image element.
2. **3a batch:** open `LoteResumenPage` for a lote with several items, tap "Imprimir etiquetas del lote", confirm a zip downloads containing one correctly-named PNG per item.
3. **3b single-item (Chrome/Edge on Mac or Windows, or Chrome on Android):** tap "Imprimir directo", confirm the OS Bluetooth picker appears, select the D11_H, confirm a label physically prints with the same content as 3a's PNG.
4. **3b unsupported browser (Safari):** confirm the "Imprimir directo" button does not render at all, only "Imprimir etiqueta" (3a) is visible, with the explanatory note.
5. **3b batch:** print an entire lote's labels via the direct-print button, confirm progress toasts update per label and the connection is reused (not re-prompted per item).
6. **3b failure path:** disconnect/power off the printer mid-batch, confirm a clear error toast appears rather than a silent hang, and that it points back at the export fallback.
