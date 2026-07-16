# Kardex de consignación de catálogo vivo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emitir el recibo de kardex de consignación de los catálogos vivos M-001/M-002 hacia Juan Manuel Escobar Ramirez, y poder reenviarlo desde el celular vía anima_TM_bot.

**Architecture:** La Fase 1 es **operativa, cero código** — la página `/admin/fotosintesis/movimientos` ya registra el batch multi-ítem, renderiza el comprobante y sube el PDF a Drive. La Fase 2 agrega las 4 piezas que hoy faltan para que el bot pueda reenviar ese PDF después: persistir el `comprobanteUrl` (hoy vive solo en estado de React y se pierde al cerrar la pestaña), un proxy de Drive para PDFs (`serve-drive-image` es solo imágenes), envío de documentos en el bot (no existe), y el comando.

**Tech Stack:** Convex, React 18 + MUI v6, Vercel serverless (Node), grammY (anima-bot), vitest.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-16-kardex-catalogo-vivo-design.md` — leerla antes de empezar.
- **Dos repos separados.** `TierraMadre/` y `anima-bot/` son repos git independientes (`git rev-parse --show-toplevel` difiere). Cada uno se commitea por su cuenta. No hay monorepo.
- **No existe `convex-test` en el proyecto.** Los handlers de Convex NO se testean unitariamente. El patrón establecido es extraer lógica pura y testear eso (ver `tests/fotosintesis-sequences.test.ts`). Seguirlo — no introducir un harness nuevo.
- **Tests:** `npx vitest run tests/<archivo>` en TierraMadre; `npm test` en anima-bot. `globals: false` — importar `describe/it/expect` explícitamente desde `vitest`.
- **Nunca reasignar `loteId`.** M-001/M-002 son etiquetas que viajan en `notas`. El `loteId` es la procedencia de compra y de él depende `costoBaseCOP`.
- **`_registerHandoff` exige `estado === 'DISPONIBLE'`** (`convex/asesorMovements.ts:174`) y lanza excepción si no.
- **Build antes de commitear** en TierraMadre: `npm run build` (actualiza `APP_VERSION`). Incluir siempre `index.html` y `public/version.json`.

---

## FASE 1 — Emisión del kardex (operativa, cero código)

> Esta fase no escribe código. Se ejecuta en el navegador y produce el PDF que Juan Manuel necesita. **Es independiente de la Fase 2 y puede hacerse hoy.**

### Task 0: Runbook de emisión

**Files:** ninguno (operación en producción).

**Interfaces:**

- Produces: un `kardexEventId` (`KDX-<ts>-<hash>`) y un PDF en Drive `movimientos-asesor/2026/07`. La Fase 2 lo consume.

- [x] **Step 1: Cantidades — RESUELTO por decisión del dueño (2026-07-16)**

**Decisión: se usan las cantidades de producción tal cual, sin conteo físico previo.** El dueño
lo instruyó explícitamente ("toma los datos que están en el inventario"). Este step ya no bloquea.

Lo que eso significa, para que quede por escrito:

| Ítem                          | El recibo dirá | Discrepancia conocida   |
| ----------------------------- | -------------- | ----------------------- |
| #373 Koru                     | 17             | sin verificar           |
| #427 Namek                    | 4              | la foto muestra **5**   |
| #170 Gotas del Amazonas       | 2              | solo **1** confirmada   |
| #437 Rocas Lunares Sub-lote 4 | 4              | sin verificar           |
| #382 Teia                     | 5              | coincide con la foto ✅ |

**Riesgo aceptado:** si el estuche tiene menos que el papel, el documento compromete a Juan Manuel
a devolver piezas que nunca recibió — Gotas del Amazonas es el caso más probable (el dato dice 2,
solo se confirmó 1). La **foto por línea** (commit `d04ec7d`) mitiga esto en parte: el comprobante
ahora muestra cada pieza, así que un conteo que no cuadre se ve en el papel al momento de firmar,
en vez de descubrirse en la devolución.

- [ ] **Step 2: Pasar los 7 anillos Fenix a DISPONIBLE**

En `/admin/fotosintesis` → EditDrawer de cada ítem → cambiar `estado` de `Retornado` a `DISPONIBLE`:

`#118` Sara Connor · `#119` Arya Stark · `#120` Jessica Jones · `#121` Claris Starlin · `#122` Amy Dunne · `#123` Hermione · `#167` Anillo de Plata

Cada cambio se audita solo vía `productEdits` y se sincroniza a la hoja con el `products.pushToSheet` existente. Sin esto, `registerHandoffBatch` rechaza estas 7 líneas.

> `DISPONIBLE` **no es el destino, es un salto de un segundo.** `_registerHandoff` exige
> `estado === 'DISPONIBLE'` para dejar entrar el ítem, y en la misma mutación lo mueve a `ASESOR`.
> Los anillos terminan con Juan Manuel, no en la vitrina.

- [ ] **Step 3: Registrar el batch**

Ir a `/admin/fotosintesis/movimientos`. Tipo: **entrega**.

**Destinatario: `Juan Manuel Escobar Ramirez`** — escribirlo **sin tilde en "Ramirez"**, tal como
lo tiene el directorio. La UI debería resolverlo contra `get-asesores` y asignar
`asesorId: asesor_11` (rol "Embajador - Admin"). Verificar que lo resuelva; si el autocompletar lo
ofrece, elegirlo de la lista en vez de teclearlo.

> ⚠️ **Corregido 2026-07-16.** La versión anterior de este runbook decía que Juan Manuel _no está
> en el directorio_ y que fuera como `consignacion`. **Era falso.** Está: `asesor_11`, Embajador -
> Admin. Es un **asesor interno**, así que el destino correcto es **`asesor`** → estado `ASESOR`,
> no `CONSIGNACION`. Si la UI expone el selector de destino, marcarlo explícito: `destino`
> explícito le gana a la heurística.
>
> **La tilde parte el historial.** `listByAsesor` busca por string exacto sobre el índice
> `by_asesorNombre`. Si registras "Ramírez" y el resto del sistema dice "Ramirez", quedan dos
> personas distintas que nunca se cruzan.

Las **20 líneas**:

| Ítem | Pieza                       | `notas` |
| ---- | --------------------------- | ------- |
| #437 | Rocas Lunares — Sub-lote 4  | M-001   |
| #264 | Pegasus                     | M-001   |
| #472 | Mellizas del Alba (par)     | M-001   |
| #471 | Guardianas Gemelas (par)    | M-001   |
| #427 | Namek                       | M-001   |
| #373 | Koru                        | M-001   |
| #80  | Grecia                      | M-001   |
| #298 | Libélulas de la Sabana      | M-001   |
| #118 | Sara Connor                 | M-001   |
| #119 | Arya Stark                  | M-001   |
| #120 | Jessica Jones               | M-001   |
| #121 | Claris Starlin              | M-002   |
| #122 | Amy Dunne                   | M-002   |
| #123 | Hermione                    | M-002   |
| #167 | Anillo de Plata             | M-002   |
| #342 | Brújula Sagrada             | M-002   |
| #348 | Amor de Verano              | M-002   |
| #170 | Gotas del Amazonas          | M-002   |
| #382 | Teia                        | M-002   |
| #315 | Libélulas de la Sabana Gola | M-002   |

> El reparto de los 7 Fenix entre M-001 (3) y M-002 (4) es **arbitrario** — no hay dato que
> permita saber cuál anillo iba en cuál estuche. Es inocuo porque el comprobante es uno solo y el
> destinatario es el mismo. No presentarlo como verificado.

**NO incluir `#469`** — está contenida en `#472` (el par, `cantidad: 2` = #469 + #470). Incluir ambas es contar la misma piedra dos veces.

- [ ] **Step 4: Texto de `condicion`**

Campo compartido del evento. Debe incluir la condición de devolución **y** las 4 piezas que no
pudieron registrarse como línea auditable:

```
Devolución obligatoria si no se vende.

Piezas entregadas sin registro en sistema, pendientes de identificar:
- Luciérnaga 1 y Luciérnaga 2 (etiquetadas "93A"/"93B" — sin ítem asignado)
- 508-B, sub-lote "Innombradas" (2 gemas, corte esmeralda/octogonal)
- Mariposas de la Montaña, topitos en oro (ítem #151 — ya figura en consignación previa)
```

- [ ] **Step 5: Verificar el resultado del batch**

El panel de resultado muestra `ok` / `failed` y el `kardexEventId`. **Esperado: 20 en `ok`, 0 en `failed`.**

Si alguna cae en `failed` con `"está \"Retornado\", no \"DISPONIBLE\""` → el Step 2 no se completó para ese ítem.

**Anotar el `kardexEventId`** — la Fase 2 lo necesita.

- [ ] **Step 6: Generar el comprobante**

Botón "Generar comprobante" → `exportAndUploadMovimientoKardexPdf` rasteriza el preview y lo sube a Drive `movimientos-asesor/2026/07`. Descargar el PDF y mandárselo a Juan Manuel.

⚠️ **Hoy el enlace se pierde al cerrar la pestaña** — solo vive en estado de React. La Fase 2 arregla exactamente eso. Guardar el PDF localmente hasta entonces.

- [ ] **Step 7: Actualizar Anima**

Marcar en `Wings/Projects/TierraMadre/inventario/2026-07-16-resumen-catalogos-vivos-1-y-2.md` el `kardexEventId` emitido y la fecha, y actualizar el estado de los 7 Fenix (ya no `Retornado`).

---

## FASE 2 — Entrega vía anima_TM_bot

### Task 1: Persistir el `comprobanteUrl` en el evento de kardex

Hoy `handleGenerateComprobante` hace `setComprobanteUrl(url)` — estado de React, nada más. El enlace muere con la pestaña y el bot no tiene de dónde leerlo.

**Files:**

- Modify: `convex/schema.ts` (bloque `asesorMovements`, tras `movimientoId`)
- Modify: `convex/asesorMovements.ts` (nuevas exports al final del bloque de mutations)
- Modify: `src/pages/admin/Fotosintesis/MovimientosKardexPage.tsx:319-335`
- Create: `src/pages/admin/Fotosintesis/comprobanteFilename.ts`
- Test: `tests/comprobanteFilename.test.ts`

**Interfaces:**

- Consumes: `kardexEventId` del Task 0 / de `registerHandoffBatch`.
- Produces: `asesorMovements.comprobanteUrl?: string`; action `setComprobanteUrl({ idToken, kardexEventId, comprobanteUrl }) → { patched: number }`; query `getComprobante({ kardexEventId }) → { comprobanteUrl, asesorNombre, fecha, itemCount } | null`; helper `comprobanteFilename(kardexEventId: string): string`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/comprobanteFilename.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { comprobanteFilename } from '../src/pages/admin/Fotosintesis/comprobanteFilename';

describe('comprobanteFilename', () => {
  it('builds the pdf name from the kardex event id', () => {
    expect(comprobanteFilename('KDX-1784-abc123')).toBe(
      'kardex-KDX-1784-abc123.pdf',
    );
  });

  it('rejects an empty event id', () => {
    expect(() => comprobanteFilename('')).toThrow(
      'kardexEventId es obligatorio',
    );
  });

  it('strips path separators so the name can never escape its folder', () => {
    // 7 underscores — `/ . . / . . /` is 7 chars, each replaced individually.
    expect(comprobanteFilename('KDX-1/../../etc')).toBe(
      'kardex-KDX-1_______etc.pdf',
    );
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/comprobanteFilename.test.ts`
Expected: FAIL — `Failed to resolve import ".../comprobanteFilename"`

- [ ] **Step 3: Implementar el helper**

Crear `src/pages/admin/Fotosintesis/comprobanteFilename.ts`:

```ts
/**
 * Filename convention for a kardex-event PDF comprobante.
 *
 * Extracted from MovimientosKardexPage's inline template literal so the bot
 * side and the browser side agree on one name, and so the sanitisation is
 * testable: the id becomes part of a Drive path, and `/` or `..` in it would
 * otherwise let a malformed event id write outside its folder.
 */
export function comprobanteFilename(kardexEventId: string): string {
  if (!kardexEventId) throw new Error('kardexEventId es obligatorio');
  const safe = kardexEventId.replace(/[^A-Za-z0-9-]/g, '_');
  return `kardex-${safe}.pdf`;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run tests/comprobanteFilename.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Agregar el campo al schema**

En `convex/schema.ts`, dentro de `asesorMovements: defineTable({...})`, justo después de `movimientoId: v.string(),`:

```ts
    /** Drive URL of the PDF comprobante for this kardex event. Written once,
     *  after the browser rasterizes + uploads it (see
     *  MovimientosKardexPage.handleGenerateComprobante). EVERY row sharing a
     *  kardexEventId carries the same URL — the event has one comprobante, not
     *  the item. Optional: rows exist before the PDF is generated, and it may
     *  never be generated at all.
     *
     *  Denormalised onto every row on purpose: `by_kardexEventId` already
     *  exists, so a lookup is one indexed scan with no join, and the anima-bot
     *  can resolve a comprobante with the same plain query it uses elsewhere.
     *  Before this field the URL lived ONLY in React state and died with the
     *  browser tab. */
    comprobanteUrl: v.optional(v.string()),
```

- [ ] **Step 6: Agregar la mutation y las actions**

En `convex/asesorMovements.ts`, después de `_markPushFailed`:

```ts
/** Stamp the comprobante URL onto every row of one kardex event. Idempotent —
 *  regenerating the PDF overwrites with the newer Drive URL. */
export const _setComprobanteUrl = internalMutation({
  args: { kardexEventId: v.string(), comprobanteUrl: v.string() },
  handler: async (ctx, { kardexEventId, comprobanteUrl }) => {
    const rows = await ctx.db
      .query('asesorMovements')
      .withIndex('by_kardexEventId', (q) =>
        q.eq('kardexEventId', kardexEventId),
      )
      .collect();
    if (rows.length === 0) {
      throw new Error(`No hay movimientos para el evento ${kardexEventId}`);
    }
    for (const row of rows) {
      await ctx.db.patch(row._id, { comprobanteUrl });
    }
    return { patched: rows.length };
  },
});

export const setComprobanteUrl = action({
  args: {
    idToken: v.string(),
    kardexEventId: v.string(),
    comprobanteUrl: v.string(),
  },
  handler: async (
    ctx,
    { idToken, kardexEventId, comprobanteUrl },
  ): Promise<{ patched: number }> => {
    await requireAccessLevel(idToken, ['admin']);
    return await ctx.runMutation(internal.asesorMovements._setComprobanteUrl, {
      kardexEventId,
      comprobanteUrl,
    });
  },
});

/** Comprobante + event summary for one kardex event. Plain read, no auth gate —
 *  mirrors `lots:list` / `lotItems:search`, the queries the anima-bot already
 *  calls unauthenticated (see anima-bot/src/fotosintesis/client.ts). Returns
 *  null when the event doesn't exist; `comprobanteUrl` is undefined when the
 *  PDF was never generated. */
export const getComprobante = query({
  args: { kardexEventId: v.string() },
  handler: async (ctx, { kardexEventId }) => {
    const rows = await ctx.db
      .query('asesorMovements')
      .withIndex('by_kardexEventId', (q) =>
        q.eq('kardexEventId', kardexEventId),
      )
      .collect();
    if (rows.length === 0) return null;
    return {
      kardexEventId,
      comprobanteUrl: rows[0].comprobanteUrl,
      asesorNombre: rows[0].asesorNombre,
      fecha: rows[0].fecha,
      tipo: rows[0].tipo,
      itemCount: rows.length,
    };
  },
});
```

- [ ] **Step 7: Cablear la página**

En `src/pages/admin/Fotosintesis/MovimientosKardexPage.tsx`:

Importar el helper junto a los imports existentes de `./exportMovimientoKardexPdf`:

```ts
import { comprobanteFilename } from './comprobanteFilename';
```

Declarar la action junto a `registerHandoffBatch` (~línea 337):

```ts
const persistComprobanteUrl = useAuthedConvexAction(
  convexApi.asesorMovements.setComprobanteUrl,
);
```

Reemplazar el cuerpo de `handleGenerateComprobante` (líneas 320-335):

```ts
async function handleGenerateComprobante() {
  if (!activeKardexEventId || !previewRef.current) return;
  setGeneratingPdf(true);
  try {
    const url = await exportAndUploadMovimientoKardexPdf(
      previewRef.current,
      comprobanteFilename(activeKardexEventId),
    );
    setComprobanteUrl(url);
    // Persist BEFORE notifying success: the URL used to live only here, in
    // React state, and died with the tab. If this throws, the PDF is still
    // in Drive — the operator just has to regenerate to re-stamp it.
    await persistComprobanteUrl({
      kardexEventId: activeKardexEventId,
      comprobanteUrl: url,
    });
    notify('Comprobante generado y archivado', 'success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    notify(`No se pudo generar el comprobante: ${msg}`, 'error');
  } finally {
    setGeneratingPdf(false);
  }
}
```

- [ ] **Step 8: Verificar typecheck y build**

Run: `npm run lint && npx tsc --noEmit -p convex/tsconfig.json`
Expected: sin errores

> ⚠️ El `tsconfig.json` raíz tiene `include: ["src"]` — **no compila `convex/` ni `api/`**.
> `npm run lint` corre `tsc --noEmit && tsc --noEmit -p api/tsconfig.json`; `convex/` necesita
> además su propio proyecto. Un `npx tsc --noEmit -p tsconfig.json` a secas pasa en verde sin
> haber mirado nada de lo que toca este task.

Run: `npm run build`
Expected: build OK

- [ ] **Step 9: Commit**

```bash
git add convex/schema.ts convex/asesorMovements.ts \
  src/pages/admin/Fotosintesis/MovimientosKardexPage.tsx \
  src/pages/admin/Fotosintesis/comprobanteFilename.ts \
  tests/comprobanteFilename.test.ts index.html public/version.json
git commit -m "feat(fotosintesis): persist kardex comprobante URL on the event

The Drive URL of a kardex comprobante lived only in React state and died
with the browser tab, so nothing could re-send it later. Stamp it onto
every asesorMovements row of the event (by_kardexEventId already exists,
so the lookup is one indexed scan) and expose an unauthenticated
getComprobante query for the anima-bot.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Proxy de Drive para PDFs

`api/serve-drive-image.js` sirve solo `image/*` (negocia webp/heic y rasteriza thumbnails), así que
un PDF archivado no tiene proxy hoy. El bot necesita los **bytes**, no un enlace: Juan Manuel no
tiene acceso al Drive, así que el comprobante tiene que viajar como documento de Telegram.

**Files:**

- Create: `api/serve-drive-doc.ts`
- Create: `api/_lib/driveDoc.ts`
- Test: `tests/driveDoc.test.ts`

**Interfaces:**

- Consumes: `comprobanteUrl` del Task 1 (forma `https://drive.google.com/uc?export=view&id=<fileId>`); `getOAuthDriveClient` vía `withApiHandler({ provideOAuthDrive: true })`.
- Produces: `GET /api/serve-drive-doc?fileId=<id>` → `application/pdf`; helper `isAllowedDocMime(mime: string): boolean`.

> `parseDriveFileId` (URL → fileId) **NO va acá** — el único consumidor es el bot, y los repos son
> independientes. Vive en `anima-bot/src/fotosintesis/driveFileId.ts` (Task 3). Este endpoint
> recibe el `fileId` ya extraído como query param.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/driveDoc.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isAllowedDocMime } from '../api/_lib/driveDoc';

describe('isAllowedDocMime', () => {
  it('allows pdf', () => {
    expect(isAllowedDocMime('application/pdf')).toBe(true);
  });

  it('rejects html so the proxy can never serve a stored-XSS payload', () => {
    expect(isAllowedDocMime('text/html')).toBe(false);
  });

  it('rejects svg — renderable, so it carries the same XSS risk as html', () => {
    expect(isAllowedDocMime('image/svg+xml')).toBe(false);
  });

  it('rejects an empty mime', () => {
    expect(isAllowedDocMime('')).toBe(false);
  });

  it('is exact, not a prefix match', () => {
    expect(isAllowedDocMime('application/pdf; charset=utf-8')).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/driveDoc.test.ts`
Expected: FAIL — `Failed to resolve import "../api/_lib/driveDoc"`

- [ ] **Step 3: Implementar el helper**

Crear `api/_lib/driveDoc.ts`:

```ts
/**
 * Mime allowlist for `serve-drive-doc`.
 *
 * Allowlist, not a blocklist: this proxy streams bytes from Drive under our
 * OWN origin, so anything the browser renders (html, svg) would be a
 * stored-XSS vector. Only the formats the kardex/certificado flows actually
 * archive get through.
 *
 * Exact match, not `startsWith`: a `; charset=` suffix on a mime we didn't
 * vet is exactly the kind of thing a prefix check waves past.
 */
const ALLOWED_DOC_MIMES = ['application/pdf'];

export function isAllowedDocMime(mime: string): boolean {
  return ALLOWED_DOC_MIMES.includes(mime);
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run tests/driveDoc.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Implementar el endpoint**

Crear `api/serve-drive-doc.ts`. Sigue exactamente el patrón de `api/cotizacion-save.ts` (endpoint
TS con `withApiHandler`) y usa el mismo cliente de Drive que `serve-drive-image.js`
(`getOAuthDriveClient`, inyectado por `provideOAuthDrive: true` — **no crear un segundo camino de
auth**):

```ts
/**
 * Stream a Drive-archived PDF under our own origin.
 *
 * `serve-drive-image` is image-only, so an archived kardex comprobante has no
 * proxy. The anima-bot needs the actual bytes: a consignment recipient has no
 * Drive access, so a share link is useless to them — the PDF has to travel as
 * a Telegram document.
 *
 * Mime is checked AFTER fetching metadata, against an allowlist: this serves
 * bytes from our own origin, so an html/svg passthrough would be stored XSS.
 */
import type { drive_v3 } from '@googleapis/drive';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError } from './_lib/index.js';
import { isAllowedDocMime } from './_lib/driveDoc.js';

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    ctx: Record<string, unknown>,
  ) => {
    const { oauthDrive } = ctx as { oauthDrive: drive_v3.Drive | null };
    if (!oauthDrive) {
      return sendError(res, 500, 'OAuth Drive no está configurado');
    }

    const raw = req.query.fileId;
    const fileId = Array.isArray(raw) ? raw[0] : raw;
    // Drive ids are [A-Za-z0-9_-]; anything else is a caller bug or an
    // injection attempt, and never reaches the Drive API.
    if (!fileId || !/^[A-Za-z0-9_-]+$/.test(fileId)) {
      return sendError(res, 400, 'fileId inválido o ausente');
    }

    const meta = await oauthDrive.files.get({
      fileId,
      fields: 'id,name,mimeType,size',
      supportsAllDrives: true,
    });
    const mimeType = String(meta.data.mimeType ?? '');
    if (!isAllowedDocMime(mimeType)) {
      return sendError(res, 415, `Tipo no permitido: ${mimeType}`);
    }

    const file = await oauthDrive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' },
    );

    const name = String(meta.data.name ?? 'comprobante.pdf').replace(/"/g, '');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${name}"`);
    // private: this is an internal comprobante, never a CDN-cacheable asset.
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).send(Buffer.from(file.data as ArrayBuffer));
  },
  {
    methods: ['GET', 'OPTIONS'],
    provideOAuthDrive: true,
    errorPrefix: 'ServeDriveDoc',
  },
);
```

- [ ] **Step 6: Verificar typecheck**

Run: `npx tsc --noEmit -p api/tsconfig.json`
Expected: sin errores

> ⚠️ **`api/` tiene su propio tsconfig.** El raíz tiene `include: ["src"]` y no compila `api/`
> en absoluto — verificar con él pasaría en verde sin mirar el endpoint. `api/tsconfig.json`
> (`include: ["./**/*.ts"]`) es el que cuenta; `npm run lint` corre los dos.

Run: `npx vitest run tests/driveDoc.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add api/serve-drive-doc.ts api/_lib/driveDoc.ts tests/driveDoc.test.ts
git commit -m "feat(api): serve-drive-doc — PDF proxy for archived comprobantes

serve-drive-image is image-only, so an archived kardex PDF had no proxy.
The anima-bot needs the bytes, not a link: a consignment recipient has no
Drive access, so the comprobante has to travel as a Telegram document.
Mime allowlisted (pdf only, exact match) because this streams from our own
origin. Reuses getOAuthDriveClient via withApiHandler — no second auth path.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Comando `/kardex` en anima-bot

> **Repo distinto.** Todo este task ocurre en `anima-bot/`, que es su propio repo git.

El bot no tiene envío de documentos — no hay `sendDocument`, `replyWithDocument` ni `InputFile` en
todo el código. Es nuevo.

**Files:**

- Modify: `anima-bot/src/fotosintesis/client.ts`
- Create: `anima-bot/src/fotosintesis/kardexComprobante.ts`
- Modify: `anima-bot/src/telegram/gateway.ts`
- Test: `anima-bot/tests/fotosintesis/kardexComprobante.test.ts`

**Interfaces:**

- Consumes: `getComprobante` (Task 1), `GET /api/serve-drive-doc?fileId=` (Task 2), `cfg.fotosintesis.convexUrl` y `cfg.fotosintesis.tmApiBase` (ya existen en `src/config.ts`).
- Produces: `FotosintesisClient.getComprobante(kardexEventId)`; `parseKardexArg(text: string): string | null`; `parseDriveFileId(url: string): string | null`; `comprobanteCaption(ev: ComprobanteEvent): string`.

> `parseDriveFileId` vive **solo acá**, no en TierraMadre: el endpoint del Task 2 recibe el
> `fileId` ya extraído, y el bot es el único que parte de una URL de Drive. No hay duplicación
> entre repos.

- [ ] **Step 1: Escribir el test que falla**

Crear `anima-bot/tests/fotosintesis/kardexComprobante.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  parseKardexArg,
  comprobanteCaption,
} from '../../src/fotosintesis/kardexComprobante.js';

describe('parseKardexArg', () => {
  it('extracts the event id after the command', () => {
    expect(parseKardexArg('/kardex KDX-1784-abc123')).toBe('KDX-1784-abc123');
  });

  it('tolerates extra whitespace', () => {
    expect(parseKardexArg('/kardex   KDX-1784-abc123  ')).toBe(
      'KDX-1784-abc123',
    );
  });

  it('handles the @botname suffix Telegram adds in groups', () => {
    expect(parseKardexArg('/kardex@anima_TM_bot KDX-1')).toBe('KDX-1');
  });

  it('returns null when no id is given', () => {
    expect(parseKardexArg('/kardex')).toBeNull();
  });

  it("returns null for an id that isn't a KDX event", () => {
    expect(parseKardexArg('/kardex hola')).toBeNull();
  });
});

describe('comprobanteCaption', () => {
  it('summarises the event', () => {
    expect(
      comprobanteCaption({
        kardexEventId: 'KDX-1784-abc',
        asesorNombre: 'Juan Manuel Escobar Ramirez',
        fecha: '2026-07-16',
        tipo: 'entrega',
        itemCount: 20,
        comprobanteUrl: 'https://drive.google.com/uc?export=view&id=1x',
      }),
    ).toBe(
      '📄 Kardex KDX-1784-abc\nEntrega · 20 ítems\nJuan Manuel Escobar Ramirez · 2026-07-16',
    );
  });

  it('labels a devolucion', () => {
    const caption = comprobanteCaption({
      kardexEventId: 'KDX-2',
      asesorNombre: 'Ana',
      fecha: '2026-07-17',
      tipo: 'devolucion',
      itemCount: 1,
      comprobanteUrl: 'https://drive.google.com/uc?export=view&id=1y',
    });
    expect(caption).toContain('Devolución · 1 ítem');
  });
});
```

Y crear `anima-bot/tests/fotosintesis/driveFileId.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseDriveFileId } from '../../src/fotosintesis/driveFileId.js';

describe('parseDriveFileId', () => {
  it('extracts the id from the uc?export=view form media-upload returns', () => {
    expect(
      parseDriveFileId(
        'https://drive.google.com/uc?export=view&id=1AbC_dEf-123',
      ),
    ).toBe('1AbC_dEf-123');
  });

  it('extracts the id from a /file/d/<id>/view share link', () => {
    expect(
      parseDriveFileId(
        'https://drive.google.com/file/d/1AbC_dEf-123/view?usp=sharing',
      ),
    ).toBe('1AbC_dEf-123');
  });

  it('returns null for a non-Drive url', () => {
    expect(parseDriveFileId('https://example.com/x.pdf')).toBeNull();
  });

  it('returns null for a Drive url with no id', () => {
    expect(
      parseDriveFileId('https://drive.google.com/uc?export=view'),
    ).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseDriveFileId('')).toBeNull();
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd /Users/kevinp/Movies/coomunity-universe/anima-bot && npx vitest run tests/fotosintesis/kardexComprobante.test.ts tests/fotosintesis/driveFileId.test.ts`
Expected: FAIL — no se resuelven los imports

- [ ] **Step 3: Implementar los helpers puros**

Crear `anima-bot/src/fotosintesis/driveFileId.ts`:

```ts
/**
 * Drive URL → fileId.
 *
 * Lives in the bot, not in TierraMadre: `/api/serve-drive-doc` takes a fileId
 * that's already extracted, and the bot is the only caller that starts from a
 * URL (the `comprobanteUrl` stamped on a kardex event).
 *
 * `uploadVentaDocument` returns whatever `/api/media-upload` hands back —
 * today the `uc?export=view&id=…` form, same shape as
 * `productInventory.fotoUrl`. The `/file/d/<id>/view` form is accepted too
 * because Drive share links get pasted by hand.
 */

const UC_ID = /[?&]id=([A-Za-z0-9_-]+)/;
const FILE_D = /\/file\/d\/([A-Za-z0-9_-]+)/;

export function parseDriveFileId(url: string): string | null {
  if (!url.includes('drive.google.com')) return null;
  const fileD = url.match(FILE_D);
  if (fileD) return fileD[1];
  const uc = url.match(UC_ID);
  if (uc) return uc[1];
  return null;
}
```

Y crear `anima-bot/src/fotosintesis/kardexComprobante.ts`:

```ts
/**
 * Pure helpers for the /kardex command. Kept apart from the gateway so they
 * are testable without a grammY Context — same split as src/telegram/chunk.ts.
 */

export interface ComprobanteEvent {
  kardexEventId: string;
  asesorNombre: string;
  fecha: string;
  tipo: 'entrega' | 'devolucion';
  itemCount: number;
  comprobanteUrl?: string;
}

/** `KDX-<ts>-<hash>` — the shape newKardexEventId() emits in
 *  TierraMadre/convex/asesorMovements.ts. Anything else is a typo, not an id. */
const KDX_ID = /^KDX-[A-Za-z0-9-]+$/;

export function parseKardexArg(text: string): string | null {
  // Telegram appends @botname to commands in groups.
  const withoutCmd = text.replace(/^\/kardex(@\S+)?/, '').trim();
  if (!withoutCmd) return null;
  const first = withoutCmd.split(/\s+/)[0];
  return KDX_ID.test(first) ? first : null;
}

export function comprobanteCaption(ev: ComprobanteEvent): string {
  const tipo = ev.tipo === 'entrega' ? 'Entrega' : 'Devolución';
  const unit = ev.itemCount === 1 ? 'ítem' : 'ítems';
  return [
    `📄 Kardex ${ev.kardexEventId}`,
    `${tipo} · ${ev.itemCount} ${unit}`,
    `${ev.asesorNombre} · ${ev.fecha}`,
  ].join('\n');
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd /Users/kevinp/Movies/coomunity-universe/anima-bot && npx vitest run tests/fotosintesis/kardexComprobante.test.ts tests/fotosintesis/driveFileId.test.ts`
Expected: PASS (12 tests — 7 de kardexComprobante + 5 de driveFileId)

- [ ] **Step 5: Agregar el método al client**

En `anima-bot/src/fotosintesis/client.ts`, importar el tipo y agregar el método a `FotosintesisClient`
(junto a `searchItems`, mismo patrón de query sin auth):

```ts
import type { ComprobanteEvent } from './kardexComprobante.js';
```

```ts
  /**
   * Comprobante + summary for one kardex event. Plain read, no auth gate —
   * same as `lots:list` / `lotItems:search` above. Null when the event
   * doesn't exist; `comprobanteUrl` undefined when the PDF was never
   * generated in the admin page.
   */
  async getComprobante(kardexEventId: string): Promise<ComprobanteEvent | null> {
    const r = (await this.convex.query(
      "asesorMovements:getComprobante" as never,
      { kardexEventId } as never,
    )) as Record<string, unknown> | null;
    if (!r) return null;
    return {
      kardexEventId: String(r.kardexEventId),
      asesorNombre: String(r.asesorNombre ?? ""),
      fecha: String(r.fecha ?? ""),
      tipo: r.tipo === "devolucion" ? "devolucion" : "entrega",
      itemCount: Number(r.itemCount ?? 0),
      comprobanteUrl: r.comprobanteUrl ? String(r.comprobanteUrl) : undefined,
    };
  }
```

- [ ] **Step 6: Registrar el comando**

En `anima-bot/src/telegram/gateway.ts`, junto a los otros `dm.command(...)` y dentro del mismo
bloque condicional que guarda `dm.command("registrar", ...)` (el que exige que Fotosíntesis esté
configurado — buscar cómo se gatea `registrar` y replicarlo):

```ts
dm.command('kardex', async (ctx: Context) => {
  const eventId = parseKardexArg(ctx.message?.text ?? '');
  if (!eventId) {
    await ctx.reply(
      'Uso: /kardex KDX-<id>\nEl id sale del panel de resultado en /admin/fotosintesis/movimientos.',
    );
    return;
  }

  const ev = await fotosintesisClient.getComprobante(eventId);
  if (!ev) {
    await ctx.reply(`No encontré el evento ${eventId}.`);
    return;
  }
  if (!ev.comprobanteUrl) {
    await ctx.reply(
      `El evento ${eventId} existe (${ev.itemCount} ítems, ${ev.asesorNombre}) pero no tiene ` +
        `comprobante generado todavía. Generalo en /admin/fotosintesis/movimientos.`,
    );
    return;
  }

  const fileId = parseDriveFileId(ev.comprobanteUrl);
  if (!fileId) {
    await ctx.reply(
      `El comprobante tiene una URL que no reconozco: ${ev.comprobanteUrl}`,
    );
    return;
  }

  const res = await fetch(
    `${cfg.fotosintesis.tmApiBase}/api/serve-drive-doc?fileId=${encodeURIComponent(fileId)}`,
  );
  if (!res.ok) {
    await ctx.reply(`No pude bajar el comprobante (HTTP ${res.status}).`);
    return;
  }
  const bytes = Buffer.from(await res.arrayBuffer());

  await ctx.replyWithDocument(new InputFile(bytes, `kardex-${eventId}.pdf`), {
    caption: comprobanteCaption(ev),
  });
});
```

Agregar los imports al tope de `gateway.ts`:

```ts
import { InputFile } from 'grammy';
import {
  parseKardexArg,
  comprobanteCaption,
} from '../fotosintesis/kardexComprobante.js';
import { parseDriveFileId } from '../fotosintesis/driveFileId.js';
```

`InputFile` ya viene en la dependencia `grammy` (`package.json`), no hay que instalar nada.

> **Executor:** verificar que `fotosintesisClient` y `cfg` estén en scope en ese punto de
> `gateway.ts`. El bloque de `dm.command("registrar", …)` (~línea 586) ya usa ambos y está gateado
> por "Fotosíntesis configurado" — registrar `/kardex` **dentro de ese mismo bloque**, no fuera:
> sin `CONVEX_URL` / `TM_API_BASE` el comando no puede funcionar y no debe ni aparecer.

- [ ] **Step 7: Agregar /kardex a la ayuda**

En `sendHelp` (`gateway.ts` ~línea 557), agregar la línea del comando junto a los demás, con el
mismo formato que ya usan.

- [ ] **Step 8: Correr toda la suite del bot**

Run: `cd /Users/kevinp/Movies/coomunity-universe/anima-bot && npm test`
Expected: PASS, sin regresiones

Run: `cd /Users/kevinp/Movies/coomunity-universe/anima-bot && npm run build`
Expected: tsc sin errores

- [ ] **Step 9: Commit (repo anima-bot)**

```bash
cd /Users/kevinp/Movies/coomunity-universe/anima-bot
git add src/fotosintesis/kardexComprobante.ts src/fotosintesis/driveFileId.ts \
  src/fotosintesis/client.ts src/telegram/gateway.ts \
  tests/fotosintesis/kardexComprobante.test.ts \
  tests/fotosintesis/driveFileId.test.ts
git commit -m "feat(fotosintesis): /kardex — send an archived comprobante as a document

First document-sending path in the bot (no sendDocument/InputFile existed).
Resolves a kardexEventId to its persisted comprobanteUrl, pulls the bytes
through the new /api/serve-drive-doc proxy and replies with the PDF, so the
owner can forward it from the phone without opening the admin page.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Verificación end-to-end

**Files:** ninguno (verificación).

**Interfaces:**

- Consumes: todo lo anterior.

- [ ] **Step 1: Regenerar el comprobante del evento real**

Abrir `/admin/fotosintesis/movimientos`, cargar el `kardexEventId` del Task 0 (la página lo acepta
por `useSearchParams` — ver `MovimientosKardexPage.tsx:30`), y darle "Generar comprobante".

Ahora sí debe persistir el `comprobanteUrl`.

- [ ] **Step 2: Verificar que quedó guardado**

Run: `npx convex run asesorMovements:getComprobante --prod '{"kardexEventId":"<el id real>"}'`
Expected: JSON con `comprobanteUrl` no nulo, `asesorNombre: "Juan Manuel Escobar Ramirez"`, `itemCount: 20`

- [ ] **Step 3: Verificar el proxy**

Run: `curl -sI "https://tierramadre.app/api/serve-drive-doc?fileId=<fileId>" | head -5`
Expected: `HTTP/2 200` y `content-type: application/pdf`

- [ ] **Step 4: Probar el comando en Telegram**

Mandarle `/kardex <kardexEventId>` a @anima_TM_bot por DM.
Expected: llega el PDF como documento, con caption `📄 Kardex KDX-… / Entrega · 20 ítems / Juan Manuel Escobar Ramirez · 2026-07-16`.

- [ ] **Step 5: Probar los caminos de error**

- `/kardex` → mensaje de uso
- `/kardex KDX-noexiste` → "No encontré el evento…"
- `/kardex hola` → mensaje de uso (no es un id KDX)

- [ ] **Step 6: Registrar en Anima**

Crear `Wings/Projects/TierraMadre/decisions/2026-07-16-kardex-comprobante-url-persistido.md` con:
por qué el `comprobanteUrl` se denormaliza en cada fila del evento, por qué el proxy de PDF existe
aparte de `serve-drive-image` (image-only) en vez de ampliarlo, y por qué el mime va por allowlist
exacta.

---

## Notas para quien ejecute

- **La Fase 1 no depende de la Fase 2.** Si el kardex urge, hacer Task 0 y parar ahí.
- **El `estado` de los 7 Fenix es el único bloqueo duro.** Sin el Step 2 del Task 0, 7 de las 20 líneas fallan con `"está \"Retornado\", no \"DISPONIBLE\""`.
- **No incluir `#469`** en ninguna lista de ítems: está contenida en `#472`.
- **Las cantidades salen de producción tal cual.** Si el conteo físico del Step 1 no cuadra, corregir `cantidad` por línea en el formulario ANTES de registrar, no después: `asesorMovements` es append-only.
- **`api/serve-drive-image.js` es la referencia de autenticación de Drive.** No crear un segundo camino de auth.
