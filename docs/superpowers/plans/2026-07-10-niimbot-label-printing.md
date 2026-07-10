# NIIMBOT Item Label Printing (3a Export + 3b Direct Print) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff print a physical NIIMBOT label (QR + item# + nombre + peso) for any already-registered item, either by exporting a correctly-sized PNG to import into the NIIMBOT app (3a, works everywhere), or by printing directly from the browser over Web Bluetooth where supported (3b, Chrome/Edge/Android only).

**Architecture:** A single presentational `LabelPreview` component (off-DOM, always-mounted-but-hidden) is the one source of the label's visual content. 3a rasterizes it to a PNG via `html2canvas` (single item) or a zip of PNGs via `jszip` (whole lote). 3b draws the same content onto a `<canvas>` and pushes it to a NIIMBOT D11_H printer via `@mmote/niimbluelib`'s Web Bluetooth API, gated behind a `'bluetooth' in navigator` feature check so it never renders on unsupported browsers.

**Tech Stack:** React 18.3 + TypeScript 5.6, MUI v6, `html2canvas` (already a dependency), `qrcode.react` (already a dependency), `jszip` (new dependency), `@mmote/niimbluelib` (new dependency, pinned exact).

## Global Constraints

- Label size: 96px-tall strip (12mm at 203 DPI), width sized to content — not a fixed 719px box.
- Label content: QR (`${STUDIO_BASE_URL}/product/${itemId}`) + item number + nombre (truncated) + peso. No price.
- `@mmote/niimbluelib` MUST be installed with `-E` (exact pin), never a `^` range — the package is Alpha and its README warns the API can change between releases.
- 3b's printer model is hardcoded to the literal string `"D11_H"` — no model-picker UI.
- 3b features (buttons, hooks) must be invisible/absent — not merely disabled — wherever `'bluetooth' in navigator` is `false`. 3a must work identically regardless of 3b's presence.
- Follow existing codebase conventions: `notify()` from `useNotification()` for all success/error toasts (see `EditItemDrawer.tsx:561-584`, `MovimientosKardexPage.tsx`), `getFoto('light')` for design tokens, `fontFamilies` from the design system barrel.

---

### Task 1: `LabelPreview` component

**Files:**

- Create: `src/pages/admin/Fotosintesis/labels/LabelPreview.tsx`

**Interfaces:**

- Produces: `export interface LabelPreviewProps { itemId: string; nombre?: string; peso?: string }` and `export function LabelPreview(props: LabelPreviewProps): JSX.Element` — consumed by Tasks 3, 4, 6, 7 (both the export path and the direct-print canvas-drawing path read this same visual spec).

- [ ] **Step 1: Write the component**

Create `src/pages/admin/Fotosintesis/labels/LabelPreview.tsx`:

```tsx
import { Box } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { fontFamilies } from '../../../../design-system';

const STUDIO_BASE_URL = 'https://tierramadre.app';

/** 12mm NIIMBOT tape at 203 DPI native resolution. */
export const LABEL_HEIGHT_PX = 96;
const QR_SIZE_PX = 80;

export interface LabelPreviewProps {
  itemId: string;
  nombre?: string;
  peso?: string;
}

/**
 * One printable item label: QR (links to the product detail page) + item
 * number + nombre + peso. Pure presentational — no Convex query inside this
 * component, callers pass data in (matches the KardexPreview/
 * MovimientoKardexPreview convention in this codebase).
 *
 * Sized to a fixed 96px height (12mm NIIMBOT tape at 203 DPI); width grows
 * with content rather than being fixed, since the tape is continuous and
 * doesn't need to fill a fixed length.
 */
export function LabelPreview({ itemId, nombre, peso }: LabelPreviewProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: `${LABEL_HEIGHT_PX}px`,
        padding: '8px',
        background: '#FFFFFF',
        width: 'max-content',
      }}
    >
      <QRCodeSVG
        value={`${STUDIO_BASE_URL}/product/${itemId}`}
        size={QR_SIZE_PX}
        level="M"
        fgColor="#000000"
        bgColor="#FFFFFF"
        style={{ display: 'block', flexShrink: 0 }}
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            fontFamily: fontFamilies.mono,
            fontSize: '20px',
            fontWeight: 700,
            color: '#000000',
            whiteSpace: 'nowrap',
          }}
        >
          {itemId}
        </Box>
        {nombre && (
          <Box
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: '13px',
              color: '#000000',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nombre}
          </Box>
        )}
        {peso && (
          <Box
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: '11px',
              color: '#333333',
              whiteSpace: 'nowrap',
            }}
          >
            {peso}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default LabelPreview;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep LabelPreview`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/Fotosintesis/labels/LabelPreview.tsx
git commit -m "feat(fotosintesis): add LabelPreview component for NIIMBOT labels"
```

---

### Task 2: `exportLabel.ts` — PNG rasterization (3a core)

**Files:**

- Create: `src/pages/admin/Fotosintesis/labels/exportLabel.ts`

**Interfaces:**

- Consumes: nothing from other tasks (works on any DOM node).
- Produces: `export async function renderLabelPngBlob(node: HTMLElement, opts?: { pixelRatio?: number }): Promise<Blob>` and `export async function downloadLabelPng(node: HTMLElement, filename: string, opts?: { pixelRatio?: number }): Promise<void>` — consumed by Task 3 (single item) and Task 4 (batch, via `renderLabelPngBlob`).

- [ ] **Step 1: Write the module**

Create `src/pages/admin/Fotosintesis/labels/exportLabel.ts`:

```ts
/**
 * exportLabel — rasterize a LabelPreview DOM node to a PNG, for either a
 * single-file download or (via renderLabelPngBlob) inclusion in a batch zip.
 *
 * Simpler than certificados/exportCert.ts's dual-rasterizer setup: labels
 * have no photos/cross-origin images (just an inline QR SVG + plain text), so
 * there's no taint risk to guard against — a direct html2canvas capture is
 * sufficient, matching the plainer captureNodeToPdf.ts pattern used for the
 * Kardex/movimiento previews.
 */

import html2canvas from 'html2canvas';

// 203 DPI is the NIIMBOT D11's native print resolution — matching pixelRatio
// here keeps the exported PNG crisp at the label's real physical size when
// imported into NIIMBOT's own template editor.
const DEFAULT_PIXEL_RATIO = 203 / 96; // native DPI ÷ CSS-px label height

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Rasterize the node to a PNG Blob (not downloaded). */
export async function renderLabelPngBlob(
  node: HTMLElement,
  opts?: { pixelRatio?: number },
): Promise<Blob> {
  const canvas = await html2canvas(node, {
    backgroundColor: '#FFFFFF',
    scale: opts?.pixelRatio ?? DEFAULT_PIXEL_RATIO,
    useCORS: true,
    logging: false,
  });
  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Rasterize the node to a PNG and trigger a browser download. */
export async function downloadLabelPng(
  node: HTMLElement,
  filename: string,
  opts?: { pixelRatio?: number },
): Promise<void> {
  const blob = await renderLabelPngBlob(node, opts);
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep exportLabel`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/Fotosintesis/labels/exportLabel.ts
git commit -m "feat(fotosintesis): add exportLabel PNG rasterization for NIIMBOT labels"
```

---

### Task 3: Single-item export button in `EditItemDrawer.tsx`

**Files:**

- Modify: `src/pages/admin/Fotosintesis/components/EditItemDrawer.tsx`

**Interfaces:**

- Consumes: `LabelPreview` (Task 1), `downloadLabelPng` (Task 2). Existing in-scope values: `product` (query result with `.itemId`, `.nombre?`, `.peso?` — confirmed fields on `productInventory` at `convex/schema.ts:120-121`), `notify` from `useNotification()`.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add imports**

Add to the top of `EditItemDrawer.tsx` (alongside the existing imports):

```tsx
import { useRef } from 'react';
```

(If `useRef` is already imported from `'react'` in this file's existing import line, add it to that same line instead of a new line — check the file's current `import { ... } from 'react';` line first.)

```tsx
import { LabelPreview } from '../labels/LabelPreview';
import { downloadLabelPng } from '../labels/exportLabel';
```

- [ ] **Step 2: Add the hidden label ref + print handler**

Inside the `EditItemDrawer` component function, near the other refs/handlers (not inside JSX), add:

```tsx
const labelRef = useRef<HTMLDivElement>(null);

async function handlePrintLabelExport() {
  if (!product || !labelRef.current) return;
  try {
    await downloadLabelPng(labelRef.current, `${product.itemId}.png`);
    notify(`Etiqueta de #${product.itemId} exportada`, 'success');
  } catch (err) {
    notify(
      `No se pudo exportar la etiqueta: ${err instanceof Error ? err.message : String(err)}`,
      'error',
    );
  }
}
```

- [ ] **Step 3: Render the hidden `LabelPreview` and the button**

Immediately after the closing `</Box>` of the HEADER block (right after the header's close-button conditional, before the `{/* BODY */}` comment), add the off-screen label node:

```tsx
{
  /* Off-screen label render target — always mounted so
          html2canvas has a real node to capture on demand, never
          visible to the operator. */
}
<Box ref={labelRef} sx={{ position: 'fixed', left: '-9999px', top: 0 }}>
  {product && (
    <LabelPreview
      itemId={product.itemId}
      nombre={product.nombre}
      peso={product.peso}
    />
  )}
</Box>;
```

Then add the print button. Place it in the HEADER block, as a new row directly under the existing title/subtitle `Box` (after the subtitle `Box` that renders `itemEstadoCopy(lotEstado).subtitle`, still inside the header's left-content `Box`, before that `Box`'s closing tag):

```tsx
{
  product && (
    <Box
      component="button"
      type="button"
      onClick={() => void handlePrintLabelExport()}
      sx={{
        marginTop: '10px',
        fontFamily: fontFamilies.system,
        fontSize: '12px',
        fontWeight: 600,
        padding: '7px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        background: 'transparent',
        color: foto.ink.secondary,
        border: `1px solid ${foto.surfaces.edgeStrong}`,
        '&:hover': {
          background: foto.surfaces.canvas,
          color: foto.ink.primary,
        },
      }}
    >
      Imprimir etiqueta
    </Box>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep EditItemDrawer`
Expected: no output.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`
Open `EditItemDrawer` for a registered item, tap "Imprimir etiqueta". Confirm a PNG named `<itemId>.png` downloads and, opened in an image viewer, shows the QR + item number + nombre + peso at a crisp, correctly-proportioned size.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Fotosintesis/components/EditItemDrawer.tsx
git commit -m "feat(fotosintesis): wire single-item label export in EditItemDrawer"
```

---

### Task 4: Batch export in `LoteResumenPage.tsx`

**Files:**

- Modify: `package.json` (add `jszip` dependency)
- Create: `src/pages/admin/Fotosintesis/labels/downloadLabelsZip.ts`
- Modify: `src/pages/admin/Fotosintesis/LoteResumenPage.tsx`

**Interfaces:**

- Consumes: `LabelPreview` (Task 1), `renderLabelPngBlob` (Task 2).
- Produces: `export async function downloadLabelsZip(items: Array<{ itemId: string; nombre?: string; peso?: string }>, filename: string, renderNode: (item: { itemId: string; nombre?: string; peso?: string }) => Promise<HTMLElement>): Promise<void>` — used only by this task's `LoteResumenPage.tsx` wiring, no other task consumes it.

- [ ] **Step 1: Add the `jszip` dependency**

In `package.json`, add to the `"dependencies"` object (near `html2canvas`, matching this file's existing loose grouping — exact position doesn't matter, just add it as a new line):

```json
    "jszip": "^3.10.1",
```

- [ ] **Step 2: Write `downloadLabelsZip.ts`**

Create `src/pages/admin/Fotosintesis/labels/downloadLabelsZip.ts`:

```ts
/**
 * downloadLabelsZip — render N item labels (via a caller-supplied off-screen
 * render function) and package them into a single zip download, one PNG per
 * item, named after the item id. A zip (not a merged multi-page PDF) matches
 * the real workflow: each label gets imported into NIIMBOT's app separately
 * regardless, so the operator wants individually-named files, not pages to
 * extract from a PDF.
 */

import JSZip from 'jszip';
import { renderLabelPngBlob } from './exportLabel';

export interface LabelItem {
  itemId: string;
  nombre?: string;
  peso?: string;
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * `renderNode` mounts (or reuses) an off-screen DOM node showing the given
 * item's label and resolves with that node once it's ready to rasterize —
 * the caller owns the actual React render (e.g. re-rendering one shared
 * hidden `LabelPreview` per iteration), this module only handles the
 * rasterize→zip→download plumbing.
 */
export async function downloadLabelsZip(
  items: LabelItem[],
  filename: string,
  renderNode: (item: LabelItem) => Promise<HTMLElement>,
): Promise<void> {
  const zip = new JSZip();
  for (const item of items) {
    const node = await renderNode(item);
    const blob = await renderLabelPngBlob(node);
    zip.file(`${item.itemId}.png`, blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Wire the batch button in `LoteResumenPage.tsx`**

Add imports near the top of `LoteResumenPage.tsx`:

```tsx
import { useRef, useState } from 'react';
```

(Merge into the existing `react` import line if `useRef`/`useState` aren't already there — check first, this file likely already imports `useState`.)

```tsx
import { LabelPreview } from './labels/LabelPreview';
import { downloadLabelsZip, type LabelItem } from './labels/downloadLabelsZip';
```

Inside the `FotosintesisLoteResumenPage` component, add state and a ref for the off-screen render target, plus the handler:

```tsx
const labelRenderRef = useRef<HTMLDivElement>(null);
const [labelRenderItem, setLabelRenderItem] = useState<LabelItem | null>(null);
const [printingLabels, setPrintingLabels] = useState(false);

async function handlePrintLoteLabelsExport() {
  if (!products || products.length === 0) return;
  setPrintingLabels(true);
  try {
    const items: LabelItem[] = products.map((p) => ({
      itemId: p.itemId,
      nombre: p.nombre,
      peso: p.peso,
    }));
    await downloadLabelsZip(
      items,
      `etiquetas-lote-${loteId}.zip`,
      (item) =>
        new Promise<HTMLElement>((resolve) => {
          setLabelRenderItem(item);
          // Wait one frame so React has committed the new LabelPreview
          // props to labelRenderRef before we hand the node to html2canvas.
          requestAnimationFrame(() => {
            if (labelRenderRef.current) resolve(labelRenderRef.current);
          });
        }),
    );
    notify(`${items.length} etiqueta(s) exportadas`, 'success');
  } catch (err) {
    notify(
      `No se pudieron exportar las etiquetas: ${err instanceof Error ? err.message : String(err)}`,
      'error',
    );
  } finally {
    setPrintingLabels(false);
    setLabelRenderItem(null);
  }
}
```

Add the off-screen render target once in the page's JSX (anywhere at the top level of the returned JSX, e.g. right after the component's opening `<>`/root `Box`):

```tsx
<Box sx={{ position: 'fixed', left: '-9999px', top: 0 }} ref={labelRenderRef}>
  {labelRenderItem && (
    <LabelPreview
      itemId={labelRenderItem.itemId}
      nombre={labelRenderItem.nombre}
      peso={labelRenderItem.peso}
    />
  )}
</Box>
```

Add the button in the "secondary actions" block (`LoteResumenPage.tsx`, the stacked full-width buttons around the "Reabrir lote"/"Editar lote" buttons — insert this as another full-width button in that same block, always rendered regardless of `lot.estado`):

```tsx
<Box
  component="button"
  type="button"
  disabled={printingLabels || !products?.length}
  onClick={() => void handlePrintLoteLabelsExport()}
  sx={{
    width: '100%',
    padding: '12px 18px',
    borderRadius: '11px',
    background: 'transparent',
    color: foto.ink.secondary,
    border: `1px solid ${foto.surfaces.edgeStrong}`,
    fontFamily: fontFamilies.system,
    fontSize: 13,
    fontWeight: 600,
    cursor: printingLabels ? 'wait' : 'pointer',
    transition: 'background 120ms ease, color 120ms ease',
    '&:hover:not(:disabled)': {
      background: foto.surfaces.canvas,
      color: foto.ink.primary,
    },
  }}
>
  {printingLabels ? 'Exportando etiquetas…' : 'Imprimir etiquetas del lote'}
</Box>
```

- [ ] **Step 4: Install and typecheck**

Run: `npm install`
Run: `npx tsc --noEmit -p . 2>&1 | grep -E "LoteResumenPage|downloadLabelsZip"`
Expected: no output.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`
Open `LoteResumenPage` for a lote with 2+ items, tap "Imprimir etiquetas del lote". Confirm a zip named `etiquetas-lote-<loteId>.zip` downloads containing one correctly-named, correctly-rendered PNG per item.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/pages/admin/Fotosintesis/labels/downloadLabelsZip.ts src/pages/admin/Fotosintesis/LoteResumenPage.tsx
git commit -m "feat(fotosintesis): add jszip and wire batch label export in LoteResumenPage"
```

---

### Task 5: `useNiimbotPrinter` hook (3b core)

**Files:**

- Modify: `package.json` (add `@mmote/niimbluelib` dependency, exact-pinned)
- Create: `src/hooks/useNiimbotPrinter.ts`

**Interfaces:**

- Produces: `export interface UseNiimbotPrinterReturn { supported: boolean; connected: boolean; connecting: boolean; printing: boolean; connect(): Promise<void>; printLabel(canvas: HTMLCanvasElement, quantity?: number): Promise<void> }` and `export function useNiimbotPrinter(): UseNiimbotPrinterReturn` — consumed by Tasks 6 and 7.

- [ ] **Step 1: Add the exact-pinned dependency**

In `package.json`, add to `"dependencies"` (this MUST be an exact version, not a `^` range — the package is Alpha and its README warns of breaking changes between releases):

```json
    "@mmote/niimbluelib": "0.0.1-alpha.41",
```

(Do not add a `^` prefix. If `npm install` in Step 4 resolves a different exact alpha tag than `0.0.1-alpha.41`, use whatever exact version `npm install -E @mmote/niimbluelib` actually resolves — update this line to match exactly what gets written to `package-lock.json`.)

- [ ] **Step 2: Write the hook**

Create `src/hooks/useNiimbotPrinter.ts`:

```ts
/**
 * useNiimbotPrinter — thin wrapper around @mmote/niimbluelib's Web Bluetooth
 * client for printing directly to the shop's NIIMBOT D11_H.
 *
 * `supported` gates the whole feature: Web Bluetooth only exists in
 * Chrome/Edge/Opera on Windows/macOS and Chrome on Android — never in
 * Safari (macOS or iOS) or Firefox. Callers MUST check `supported` and
 * render nothing (not a disabled button) when it's false — this hook does
 * not throw or degrade gracefully on unsupported browsers, the caller is
 * responsible for never invoking connect()/printLabel() there.
 *
 * Printer model is hardcoded to "D11_H" (the shop's only printer) — the
 * library's own model auto-detection is documented as unreliable, and a
 * model-picker UI would be premature for a printer fleet of one.
 */

import { useCallback, useRef, useState } from 'react';
import { NiimbotBluetoothClient, ImageEncoder } from '@mmote/niimbluelib';

const PRINTER_MODEL = 'D11_H';

export interface UseNiimbotPrinterReturn {
  supported: boolean;
  connected: boolean;
  connecting: boolean;
  printing: boolean;
  connect: () => Promise<void>;
  printLabel: (canvas: HTMLCanvasElement, quantity?: number) => Promise<void>;
}

export function useNiimbotPrinter(): UseNiimbotPrinterReturn {
  const supported =
    typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const clientRef = useRef<NiimbotBluetoothClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const connect = useCallback(async () => {
    if (!supported || connected || connecting) return;
    setConnecting(true);
    try {
      const client = new NiimbotBluetoothClient();
      client.on('disconnect', () => setConnected(false));
      await client.connect();
      clientRef.current = client;
      setConnected(true);
    } finally {
      setConnecting(false);
    }
  }, [supported, connected, connecting]);

  const printLabel = useCallback(
    async (canvas: HTMLCanvasElement, quantity = 1) => {
      if (!supported) {
        throw new Error('Web Bluetooth no está disponible en este navegador.');
      }
      if (!clientRef.current) {
        await connect();
      }
      const client = clientRef.current;
      if (!client) {
        throw new Error('No se pudo conectar con la impresora.');
      }
      setPrinting(true);
      try {
        const encoded = ImageEncoder.encodeCanvas(canvas, 'left');
        const printTask = client.abstraction.newPrintTask(PRINTER_MODEL, {});
        await printTask.printInit();
        await printTask.printPage(encoded, quantity);
        await printTask.waitForPageFinished();
        await printTask.waitForFinished();
        await printTask.printEnd();
      } finally {
        setPrinting(false);
      }
    },
    [supported, connect],
  );

  return { supported, connected, connecting, printing, connect, printLabel };
}
```

- [ ] **Step 3: Install and typecheck**

Run: `npm install -E @mmote/niimbluelib`
Run: `npx tsc --noEmit -p . 2>&1 | grep useNiimbotPrinter`
Expected: no output. If the library's actual exported type names (`NiimbotBluetoothClient`, `ImageEncoder`, the `.abstraction.newPrintTask` shape, or the `printInit`/`printPage`/`waitForPageFinished`/`waitForFinished`/`printEnd` method names) differ from what's written above, adjust this file to match the installed package's actual `.d.ts` — the brief's code reflects the library's documented API surface at spec time, but pin to whatever `node_modules/@mmote/niimbluelib/dist/index.d.ts` actually exports.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/hooks/useNiimbotPrinter.ts
git commit -m "feat: add useNiimbotPrinter hook for direct Web Bluetooth label printing"
```

---

### Task 6: Single-item direct print in `EditItemDrawer.tsx`

**Files:**

- Modify: `src/pages/admin/Fotosintesis/components/EditItemDrawer.tsx`

**Interfaces:**

- Consumes: `useNiimbotPrinter` (Task 5), the existing `labelRef` off-screen `LabelPreview` node (Task 3).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add the import and hook call**

Add near the top of `EditItemDrawer.tsx`:

```tsx
import { useNiimbotPrinter } from '../../../../hooks/useNiimbotPrinter';
```

Inside the component, alongside the `labelRef` from Task 3:

```tsx
const niimbot = useNiimbotPrinter();
```

- [ ] **Step 2: Add the direct-print handler**

This needs to draw `labelRef.current` onto a canvas — reuse `html2canvas` directly (not `exportLabel.ts`'s Blob-returning helpers, since `niimbluelib` needs a raw `HTMLCanvasElement`, not a Blob):

```tsx
async function handlePrintLabelDirect() {
  if (!product || !labelRef.current) return;
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(labelRef.current, {
      backgroundColor: '#FFFFFF',
      scale: 1,
      useCORS: true,
      logging: false,
    });
    await niimbot.printLabel(canvas);
    notify(`Etiqueta de #${product.itemId} impresa`, 'success');
  } catch (err) {
    notify(
      `No se pudo imprimir directo: ${err instanceof Error ? err.message : String(err)}. Usá "Imprimir etiqueta" para exportar la imagen.`,
      'error',
    );
  }
}
```

- [ ] **Step 3: Render the button, conditionally**

Immediately after the "Imprimir etiqueta" button added in Task 3, add:

```tsx
{
  product && niimbot.supported && (
    <Box
      component="button"
      type="button"
      disabled={niimbot.connecting || niimbot.printing}
      onClick={() => void handlePrintLabelDirect()}
      sx={{
        marginTop: '6px',
        marginLeft: '8px',
        fontFamily: fontFamilies.system,
        fontSize: '12px',
        fontWeight: 600,
        padding: '7px 12px',
        borderRadius: '8px',
        cursor: niimbot.connecting || niimbot.printing ? 'wait' : 'pointer',
        background: 'transparent',
        color: foto.accent.deep,
        border: `1px solid ${foto.accent.primary}`,
        opacity: niimbot.connecting || niimbot.printing ? 0.6 : 1,
        '&:hover:not(:disabled)': {
          background: foto.surfaces.canvas,
        },
      }}
    >
      {niimbot.connecting
        ? 'Conectando…'
        : niimbot.printing
          ? 'Imprimiendo…'
          : 'Imprimir directo'}
    </Box>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep EditItemDrawer`
Expected: no output.

- [ ] **Step 5: Manual verification**

On Chrome/Edge (Windows, Mac, or Android): open `EditItemDrawer` for a registered item, confirm "Imprimir directo" is visible next to "Imprimir etiqueta", tap it, confirm the OS Bluetooth device picker appears, select the D11_H, confirm a label physically prints.
On Safari: confirm "Imprimir directo" does not render at all — only "Imprimir etiqueta" is visible.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Fotosintesis/components/EditItemDrawer.tsx
git commit -m "feat(fotosintesis): wire single-item direct label printing in EditItemDrawer"
```

---

### Task 7: Batch direct print in `LoteResumenPage.tsx`

**Files:**

- Modify: `src/pages/admin/Fotosintesis/LoteResumenPage.tsx`

**Interfaces:**

- Consumes: `useNiimbotPrinter` (Task 5), the existing `labelRenderRef`/`labelRenderItem` off-screen render machinery (Task 4).
- Produces: nothing consumed elsewhere — final task.

- [ ] **Step 1: Add the import and hook call**

```tsx
import { useNiimbotPrinter } from '../../../hooks/useNiimbotPrinter';
```

Inside the component:

```tsx
const niimbot = useNiimbotPrinter();
const [printProgress, setPrintProgress] = useState<{
  done: number;
  total: number;
} | null>(null);
```

- [ ] **Step 2: Add the batch direct-print handler**

Reuses the same `labelRenderRef`/`setLabelRenderItem` off-screen render machinery from Task 4, looping and printing each item through the same connected client rather than reconnecting per label:

```tsx
async function handlePrintLoteLabelsDirect() {
  if (!products || products.length === 0) return;
  const items: LabelItem[] = products.map((p) => ({
    itemId: p.itemId,
    nombre: p.nombre,
    peso: p.peso,
  }));
  setPrintProgress({ done: 0, total: items.length });
  try {
    await niimbot.connect();
    const html2canvas = (await import('html2canvas')).default;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setLabelRenderItem(item);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (!labelRenderRef.current) continue;
      const canvas = await html2canvas(labelRenderRef.current, {
        backgroundColor: '#FFFFFF',
        scale: 1,
        useCORS: true,
        logging: false,
      });
      await niimbot.printLabel(canvas);
      setPrintProgress({ done: i + 1, total: items.length });
    }
    notify(`${items.length} etiqueta(s) impresas`, 'success');
  } catch (err) {
    notify(
      `No se pudo imprimir directo: ${err instanceof Error ? err.message : String(err)}. Usá "Imprimir etiquetas del lote" para exportar el zip.`,
      'error',
    );
  } finally {
    setPrintProgress(null);
    setLabelRenderItem(null);
  }
}
```

- [ ] **Step 3: Render the button + progress, conditionally**

Immediately after the "Imprimir etiquetas del lote" button added in Task 4, add:

```tsx
{
  niimbot.supported && (
    <Box
      component="button"
      type="button"
      disabled={
        !products?.length || niimbot.connecting || printProgress !== null
      }
      onClick={() => void handlePrintLoteLabelsDirect()}
      sx={{
        width: '100%',
        padding: '12px 18px',
        borderRadius: '11px',
        background: 'transparent',
        color: foto.accent.deep,
        border: `1px solid ${foto.accent.primary}`,
        fontFamily: fontFamilies.system,
        fontSize: 13,
        fontWeight: 600,
        cursor:
          niimbot.connecting || printProgress !== null ? 'wait' : 'pointer',
        transition: 'background 120ms ease, color 120ms ease',
        '&:hover:not(:disabled)': {
          background: foto.surfaces.canvas,
        },
      }}
    >
      {printProgress
        ? `Imprimiendo ${printProgress.done}/${printProgress.total}…`
        : niimbot.connecting
          ? 'Conectando…'
          : 'Imprimir etiquetas del lote (directo)'}
    </Box>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep LoteResumenPage`
Expected: no output.

- [ ] **Step 5: Manual verification**

On Chrome/Edge: open `LoteResumenPage` for a lote with 2+ items, tap "Imprimir etiquetas del lote (directo)", confirm the Bluetooth picker appears once (not once per item), confirm each label prints in sequence with the "N/total" progress text updating, confirm the connection is reused across the whole batch (no repeated device-picker prompts).
On Safari: confirm this button does not render — only the 3a export button ("Imprimir etiquetas del lote") is visible.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Fotosintesis/LoteResumenPage.tsx
git commit -m "feat(fotosintesis): wire batch direct label printing in LoteResumenPage"
```

## Self-Review Notes

- **Spec coverage:** 3a (Task 1-4: LabelPreview, PNG export, single-item wiring, batch zip wiring) and 3b (Task 5-7: hook, single-item wiring, batch wiring) both fully covered. Non-goals from the spec (no scanner notFound wiring, no model-picker UI, no grayscale/two-color printing) are respected — no task touches `EscanearPage.tsx`'s notFound branch, and the model is a hardcoded constant in Task 5.
- **Type consistency:** `LabelItem`/`LabelPreviewProps` shape (`itemId, nombre?, peso?`) is identical across Tasks 1, 4, 6, 7 — no divergent field names. `useNiimbotPrinter`'s returned shape (`supported, connected, connecting, printing, connect, printLabel`) is used identically in Tasks 6 and 7.
- **Feature-detection discipline:** every 3b UI element in Tasks 6-7 is wrapped in `niimbot.supported &&`, matching the Global Constraint that 3b must be absent (not disabled) on unsupported browsers.
- **Known residual risk, disclosed in the spec:** `@mmote/niimbluelib`'s exact method names/signatures are taken from the research agent's report on the library's documented example code, not from reading the installed `.d.ts` directly (the package isn't installed yet as this plan is written). Task 5, Step 3 explicitly instructs the implementer to reconcile the hook's code against the actual installed types and adjust if the real API differs — this is the plan's one known point of uncertainty, flagged rather than silently assumed correct.
