# Fotosíntesis v2 — Reporte de Estado y Pendientes

> **Fecha:** 2026-05-21
> **Autor:** Auditoría asistida (Cowork)
> **Fuente:** PRD `2026-05-08-fotosintesis-admin-v2-PRD.md` + plan `2026-05-08-fotosintesis-admin-v2-IMPLEMENTATION-PROMPT.md`
> **Branch sugerida en el plan:** `feature/fotosintesis-v2-capture`

---

## TL;DR

**El backend está construido al 90–95%. La UI está al 0%.**

Las 5 tablas Convex (`providers`, `lots`, `lotItems`, `clients`, `sales`) existen con todas sus mutaciones, las reglas de negocio críticas BR-1 a BR-7 del PRD están implementadas y validadas en el servidor, y el push a Google Sheets está cableado para las 4 tablas sincronizables. Lo que falta es lo que ve Maritza: las pantallas de captura — Proveedor, Compra (Lote), Inventario (wizard) y Ventas — más el export de carnet PDF.

**Estimado para terminar v1 navegable:** 15–18 días de trabajo (F1 a F5 del plan original).

---

## Estado por fase del plan

### F0 · Schema + sync infrastructure — ✅ COMPLETO (~95%)

Todo lo prometido en F0 está en su lugar.

**Convex schema (`convex/schema.ts`)** — las 5 tablas nuevas más `sequences` y `materials` están definidas con los campos exactos del PRD §8. Las extensiones opcionales a `productInventory` (`loteId`, `preponderancia`, `costoBaseCOP`, `mostrarEnCatalogo`) también están aplicadas, sin migración destructiva.

**Mutaciones y queries (Convex)** — todos los archivos están implementados con sustancia, no son stubs:

| Archivo | LOC | Queries / Mutaciones / Acciones |
|---|---|---|
| `convex/providers.ts` | 195 | `list`, `get`, `create`, `update`, `retryPush`, `_pushToSheet` |
| `convex/lots.ts` | 330 | `list`, `get`, `getByLoteId`, `peekNextLoteId`, `create`, `update`, `close`, `publish`, `retryPush`, `_pushToSheet` |
| `convex/lotItems.ts` | 222 | `listByLote`, `sumPreponderancia` (reactivo), `create`, `remove` |
| `convex/clients.ts` | 179 | `list`, `get`, `create`, `update`, `retryPush`, `_pushToSheet` |
| `convex/sales.ts` | 331 | `list`, `get`, `peekNextSaleId`, `create`, `cancel`, `setCarnetUrl`, `setCertificadoUrl`, `_pushToSheet` |
| `convex/sequences.ts` | 74 | `allocateNext`, `formatLotId`, `formatSaleId` |

**Reglas de negocio críticas — verificadas en el código:**

- ✅ **BR-1** numeración consecutiva `B-{NNN}` sin saltos — `sequences.allocateNext()` con transacción Convex
- ✅ **BR-2** suma de preponderancia ≡ 100 ± 0.01 — `convex/lots.ts:189`
- ✅ **BR-3** `count(lotItems) === unidadesDeclaradas` — `convex/lots.ts:181`
- ✅ **BR-5** `costoBaseCOP = lot.costoTotalCOP × (preponderancia/100)`, calculado, no editable — `convex/lotItems.ts`
- ✅ **BR-6** venta sobre ítem `VENDIDA` rechazada — `convex/sales.ts:121`
- ✅ **BR-7** `formaPago === "credito"` requiere `fechaVencimiento` — `convex/sales.ts:101`

**Sync con Sheets** — `_pushToSheet` implementado en las 4 tablas sincronizables; `api/_lib/admin-table-config.ts` ya mapea columnas para `providers`, `lots`, `clients`, `sales`.

**Lo único que queda de F0:**

- ⚠️ Verificar que el cron `pullFromSheet` en `convex/crons.ts` ya recorre las 4 tablas nuevas (no solo `productInventory`). Si no, agregarlas — esfuerzo: ~0.5 día.
- ⚠️ Confirmar que las pestañas `Proveedores`, `Lotes`, `Clientes`, `Ventas` existen en el Drive compartido. Si no, crearlas — esfuerzo: ~0.5 día.

---

### F1 · Módulo Proveedor — ❌ PENDIENTE (0%)

> Justo lo que el usuario describe como "ingreso de insumos con detalles de proveedor".

Nada de UI existe. El plan pedía:

- ❌ Ruta `/admin/fotosintesis` en `src/App.tsx` (verificado: no está)
- ❌ `src/pages/admin/Fotosintesis/FotosintesisShell.tsx` (verificado: el directorio no existe)
- ❌ `modules/ProveedorModule.tsx` con lista + drawer + form
- ❌ Hook `useProveedorSearch.ts`
- ❌ Spec Playwright `e2e/fotosintesis-proveedor.spec.ts`

**Backend disponible para conectar:** `providers.list`, `providers.create`, `providers.update`, `providers.retryPush`. La forma del documento ya valida en el server.

**Esfuerzo estimado:** 2 días (sin sorpresas, mutaciones ya hechas).

---

### F2 · Módulo Compra (Lote) — ❌ PENDIENTE (0%)

- ❌ `modules/CompraModule.tsx` (LoteList + LoteForm + LoteResumen)
- ❌ Hook `useNextLoteId.ts` — backend ya expone `lots.peekNextLoteId` (preview sin consumir secuencia) ✅
- ❌ Badge de estado `🟡 abierto · X/N ítems` en la lista
- ❌ Validación inline `credito → fechaVencimiento` (el server ya lo valida; falta el feedback UX)

**Esfuerzo estimado:** 2–3 días.

---

### F3 · Módulo Inventario (wizard) — ❌ PENDIENTE (0%) · **fase más larga**

Esta es la pieza que el usuario describe con más detalle ("nombre, especificaciones, lote, proveedor"). El backend está listo; falta toda la UI guiada:

- ❌ `ItemWizard.tsx` con los 4 pasos (Tipo y nombre → Datos según tipo → Foto y observación → Resumen)
- ❌ `PreponderanciaTracker.tsx` siempre visible (`67% / 100%`) — backend reactivo ya disponible vía `lotItems.sumPreponderancia` ✅
- ❌ Sub-componentes por tipo: `GemaFields`, `JoyaFields`, `InsumoFields`
- ❌ Materiales: 5 slots base + "+ agregar material" hasta 10, creación inline en tabla `materials` ✅ (la tabla ya existe en schema)
- ❌ Subida de fotos al lote (reuso del flow `media-upload` existente)
- ❌ Toggle `mostrarEnCatalogo` con default `false` (reserva oculta)
- ❌ Pantalla de resumen + botón "Publicar lote ahora" (flip bulk a `true`)

**Backend disponible:** `lotItems.create` ya calcula `costoBaseCOP`, ya crea el row en `productInventory` con el `loteId`. `lots.close` ya valida BR-2 y BR-3 antes de cambiar `estado: "cerrado"`. `lots.publish` ya hace flip masivo.

**Esfuerzo estimado:** 4–5 días.

---

### F4 · Módulo Ventas + carnet — ❌ PENDIENTE (0%)

- ❌ `modules/VentasModule.tsx` con `VentaForm` + `ProductoSearch` + `ProductoCard` + `CarnetPreview`
- ❌ Toggle embajador / cliente final + auto-load desde `get-asesores` API
- ❌ `ProductoSearch` filtrado por `estado: DISPONIBLE | ASESOR`
- ❌ `exportCarnet.ts` (jsPDF + html2canvas, ambos ya en stack) — plantilla §14.2 del PRD
- ❌ `exportCertificado.ts` — **bloqueante:** la plantilla legal del certificado de origen (Q-6 del PRD) no está aprobada
- ❌ Subida a Drive en `ventas/{año}/{mes}/{itemId}-{slug}.pdf` y guardado en `sales.carnetUrl`
- ❌ Email opcional al comprador vía `send-email` API existente

**Backend disponible:** `sales.create` ya valida BR-6 y BR-7, flipa cada ítem a `VENDIDA`, agenda push a Sheets. `sales.setCarnetUrl` y `setCertificadoUrl` ya están listas para recibir las URLs de los PDFs.

**Esfuerzo estimado:** 4–5 días (5 si el certificado legal exige iteración con un abogado).

---

### F5 · QA + métricas — ❌ PENDIENTE (5%)

- ✅ `tests/fotosintesis-sequences.test.ts` — único test existente, valida `formatLotId`/`formatSaleId`
- ❌ 4 specs Playwright nuevos: `fotosintesis-proveedor`, `-compra`, `-inventario`, `-ventas`
- ❌ Tests unitarios para validadores BR-2/BR-3/BR-6/BR-7 (el server los garantiza, pero conviene unit-test)
- ❌ Telemetría vía `TrackingContext`: `fotosintesis.lot.created`, `.lot.closed`, `.item.created`, `.sale.created`
- ❌ Health check en `api/health.js`: # lotes abiertos > 7 días, # items con `syncStatus: "error"`
- ❌ Dashboard `/admin/fotosintesis/health` con esos counters

**Esfuerzo estimado:** 3 días.

---

## Riesgos abiertos (del PRD §12, no resueltos)

| ID | Pregunta | Bloqueante? | Recomendación |
|---|---|---|---|
| Q-2 | ¿`B-{NNN}` se reinicia por año o es continua? | Sí — afecta `useNextLoteId` y la presentación | Confirmar con Maritza antes de F2 |
| Q-6 | Plantilla legal del certificado de origen | Sí — bloquea F4 | Iniciar conversación con legal en paralelo a F1-F3 |
| Q-3 | Autosave del wizard si Maritza no termina hoy | No bloqueante | Diseñar persistencia parcial en F3 |
| Q-10 | Importación inicial del catálogo de proveedores (Mauro existe, otros no) | No bloqueante | Maritza crea Mauro como primer proveedor en F1 |

---

## Resumen de esfuerzo y orden recomendado

| Fase | Estado | Esfuerzo restante |
|---|---|---|
| F0 · Schema + sync | ✅ 95% | ~1 día (verificar crons + pestañas Sheets) |
| F1 · Proveedor | ❌ 0% | 2 días |
| F2 · Compra/Lote | ❌ 0% | 2–3 días |
| F3 · Inventario wizard | ❌ 0% | 4–5 días |
| F4 · Ventas + carnet | ❌ 0% | 4–5 días (bloqueado por Q-6) |
| F5 · QA + métricas | ❌ 5% | 3 días |
| **Total** | **~25%** | **16–19 días** |

**Camino crítico sugerido:**

1. **Hoy** — Cerrar Q-2 con Maritza (numeración) y arrancar Q-6 con legal en paralelo.
2. **Semana 1** — F0 cleanup (0.5d) + F1 Proveedor (2d) + arrancar F2 (2d).
3. **Semana 2** — Cerrar F2 + abrir F3 (wizard de ítems es la pieza más jugosa y la que más prueba el backend).
4. **Semana 3** — Cerrar F3, abrir F4 (asumiendo certificado aprobado).
5. **Semana 4** — Cerrar F4 + F5 + sesión de end-to-end con Maritza.

---

## Lo que NO se ha perdido

El trabajo de F0 es justamente el más invisible y el más caro: schema correcto, mutaciones con reglas de negocio fuertes, sincronización a Sheets cableada. Si el backend se hubiera quedado a medias, cualquier UI montada encima estaría arrastrando estado inconsistente. Hoy las invariantes de la BD están protegidas — la UI solo necesita conectarse.

---

*Hecho con amor verde esmeralda en Colombia 💚*
