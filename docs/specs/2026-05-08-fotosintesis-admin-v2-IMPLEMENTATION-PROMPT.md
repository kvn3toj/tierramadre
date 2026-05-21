# Prompt para Claude Code · Implementación de Fotosíntesis Admin v2

> Pega este prompt completo en Claude Code (sesión nueva, working directory = root del repo `TierraMadre`). Está diseñado para ser autocontenido — Claude Code no tiene memoria del PRD, así que el prompt lo apunta a leer los archivos correctos antes de empezar.

---

## Prompt (copiar desde aquí ⬇)

Hola Claude. Vamos a implementar **Fotosíntesis Admin v2** — un rediseño de la herramienta administrativa de Tierra Madre Studio para captura de proveedores, lotes, productos y ventas. Antes de tocar código, sigue estos pasos:

### 0 · Contexto que DEBES leer primero (sin saltarte ninguno)

1. `docs/specs/2026-05-08-fotosintesis-admin-v2-PRD.md` — la PRD completa. Es la fuente de verdad. Léela entera.
2. `CLAUDE.md` (raíz) — convenciones del proyecto (tokens `foto`, Convex quirks, anti-blinking rules, comandos npm).
3. `convex/schema.ts` — schema actual; vas a extenderlo (no romper).
4. `convex/products.ts` — patrón existente de `pullFromSheet` / `pushToSheet` / `saveEdit` / `createProduct`. Lo replicarás para las tablas nuevas.
5. `src/pages/admin/ProductManagement/ProductManagementPage.tsx` y `EditDrawer.tsx` — patrones de UI admin que reutilizamos (foto tokens, Convex hooks, drawer/wizard, validaciones).
6. `src/design-system/index.ts` y `src/design-system/tokens/foto.ts` — barrel canónico; **importar siempre desde `@/design-system`**.

Después de leer, **resume en tres frases qué entendiste del alcance** antes de proponer plan. Si algo no cuadra entre PRD y código actual, **pregunta** — no asumas.

### 1 · Convenciones no negociables

- Stack fijo: React 18 + TS 5.6 + MUI v6 + Convex + Vite. **No agregar dependencias** sin avisar.
- Tokens vía `@/design-system` siempre (`foto`, `getFoto(mode)`, `atelier.type.*`). Nunca hardcodear colores.
- MUI v6: usar `ListItemButton` (no `ListItem button`), `alpha()` desde `@mui/material/styles`, Grid sin `item`.
- Anti-blinking: cache síncrono en `useState(() => ...)` para `localStorage`; nunca async load en `useEffect` para datos cacheados.
- Convex:
  - `npx convex deploy -y` (siempre con `-y`).
  - Nuevas mutaciones/queries en `convex/{table}.ts` siguiendo el patrón de `convex/products.ts`.
  - El `cron pullFromSheet` debe extenderse para las tablas nuevas, **no duplicado**.
- Sync con Sheets es **obligatorio**: cada mutación que escriba a Convex agenda `pushToSheet`. Si el push falla, `syncStatus: "error"` + `syncError`.
- Numeración `B-{NNN}` y `V-{NNNN}`: usar lock optimista en la mutación Convex (`getOrCreateNextSequence`) para evitar duplicados en concurrencia. **NO usar `Math.random` ni timestamps** como fallback.
- Validaciones críticas (BR-1..BR-8 del PRD) se implementan **en la mutación Convex** además de en el frontend. La UI puede mentir; el backend no.
- i18n: textos en `src/locales/es.json` (es-CO neutro). EN se llena después.
- Tests:
  - **Vitest** unitario para hooks nuevos y validadores (`useNextLoteId`, `usePreponderanciaTotal`, `validateLot`, `validateLotItem`).
  - **Playwright e2e** para los happy paths de los 4 módulos. Nuevos specs en `e2e/fotosintesis-*.spec.ts`. Recuerda `VITE_TEST_MODE=1` ya alias-ea `lib/convex-safe`.

### 2 · Plan de fases (ejecútalas en orden, una por una; pide review entre cada una)

**Antes de cada fase**, propón el plan detallado (archivos a crear/editar, validaciones, tests). **Después de cada fase**, corre `npm run lint` + `npm run test:unit` + `npx tsc -b && npx tsc -p convex/tsconfig.json` y comparte resultado. No pases a la siguiente fase hasta que la actual esté verde.

#### F0 · Schema + sync infrastructure (3-4 días estimados)

- Extiende `convex/schema.ts` con `providers`, `lots`, `lotItems`, `clients`, `sales` (campos exactos en §8.1 del PRD).
- Extiende `productInventory` con `loteId?`, `preponderancia?`, `costoBaseCOP?`, `mostrarEnCatalogo?` (campos opcionales — sin migración destructiva).
- Crea archivos `convex/providers.ts`, `convex/lots.ts`, `convex/clients.ts`, `convex/sales.ts` siguiendo la forma de `convex/products.ts` (pullFromSheet, pushToSheet[append/patch], list, saveEdit, create, retryPush).
- Helper genérico `convex/_lib/sheetSync.ts` parametrizado por `tableName + columnMap` para evitar duplicar 80% del código de sync.
- Crea/actualiza las pestañas Sheet correspondientes en `GOOGLE_SHARED_DRIVE_ID`: `Proveedores`, `Lotes`, `Clientes`, `Ventas`. (Usa la misma cuenta de servicio.)
- Extiende `convex/crons.ts` para que `pullFromSheet` recorra las tablas nuevas también.

**DoD F0:** `npx convex dev` arranca sin errores, las tablas existen en `wandering-parrot-148`, una llamada manual a `providers.create` agenda push y aparece en la hoja `Proveedores`.

#### F1 · Módulo Proveedor (2 días)

- Ruta nueva: `/admin/fotosintesis` (router en `App.tsx`).
- `src/pages/admin/Fotosintesis/FotosintesisShell.tsx` — layout con tabs (`Proveedor` / `Compra` / `Inventario` / `Ventas`).
- `modules/ProveedorModule.tsx` con:
  - Lista (search por nombre o NIT) + drawer para crear/editar (reusa `EditDrawer` patrón).
  - Form con campos del §6.2 del PRD; validador inline + Convex.
  - Hook `useProveedorSearch.ts` con autocomplete (debounce 200ms).
- Spec Playwright: crear → editar → buscar → eliminar.

**DoD F1:** desde `/admin/fotosintesis`, Maritza puede crear un proveedor "Mauro Confederados" con NIT, ver que apareció en Sheets `Proveedores` en < 5s, y buscarlo.

#### F2 · Módulo Compra/Lote (2-3 días)

- `modules/CompraModule.tsx` con `LoteList` + `LoteForm` + `LoteResumen`.
- Hook `useNextLoteId.ts` que consulta `lots.nextSequence` (mutación Convex con lock optimista — **importante**: usar transacción Convex para evitar race conditions cuando dos admins crean lote simultáneo).
- Form con campos del §6.3 del PRD. Validar `formaPago === "credito" → fechaVencimiento required`.
- Estado del lote: `abierto` | `cerrado` | `publicado`. Badge en la lista.
- Botón "Crear ítems del lote" lleva a F3 con `loteId` y `unidadesDeclaradas` en el contexto/URL.

**DoD F2:** crear lote `B-001` con proveedor Mauro, peso 40 ct, costo $500.000, 3 unidades, contado/efectivo. Aparece en Sheets `Lotes` con badge "abierto · 0/3 ítems".

#### F3 · Módulo Inventario (wizard) — fase más larga (4-5 días)

- `modules/InventarioModule.tsx` con `ItemWizard.tsx` (4 pasos del §6.4 del PRD).
- `PreponderanciaTracker.tsx` siempre visible en la cabecera del wizard, mostrando `acumulado / 100%`.
- `usePreponderanciaTotal(loteId)` query Convex.
- Sub-componentes por tipo: `ItemTipoStep`, `ItemDatosStep` (renderiza `GemaFields` o `JoyaFields` según tipo), `ItemFotoStep`.
- Materiales con 5 slots base + botón "+ agregar material" hasta 10. Si el material no existe, crea inline en una tabla `materials` (puede ser una tabla simple `{ name, type }`).
- Mutación `lotItems.create` que:
  1. Calcula `costoBaseCOP = lot.costoTotalCOP * (preponderancia / 100)`.
  2. Llama `productInventory.createProduct` (existente) con `loteId` y `mostrarEnCatalogo: false` por default.
  3. Crea registro en `lotItems`.
- Mutación `lots.close` que valida BR-2 y BR-3, y solo entonces cambia `lots.estado` a `cerrado`. Falla con mensajes específicos si no cumple.
- Resumen del lote (§6.4 paso 4) con botón "Publicar lote ahora" (flip `mostrarEnCatalogo: true` en bulk).

**DoD F3:** desde el lote `B-001`, crear 3 ítems con preponderancia 50/30/20 (suma 100), uno gema y dos joyas. El wizard rechaza preponderancia 50/30/30 (suma 110). El wizard rechaza cerrar lote con solo 2 ítems creados. Al cerrar, los 3 ítems aparecen en `productInventory` con `loteId="B-001"` y `mostrarEnCatalogo=false`. Botón "Publicar" los marca `true`.

#### F4 · Módulo Ventas + carnet (4-5 días)

- `modules/VentasModule.tsx` con `VentaForm` + `ProductoSearch` + `ProductoCard` + `CarnetPreview`.
- Auto-load embajador desde `get-asesores` API existente (toggle embajador/cliente final).
- `ProductoSearch` busca en `productInventory` filtrado por `estado: "DISPONIBLE" | "ASESOR"`.
- Mutación `sales.create` que:
  1. Cambia `productInventory[itemId].estado = "VENDIDA"`.
  2. Crea registro en `sales` con `saleId` autonumerado `V-{NNNN}`.
  3. Agenda `pushToSheet` para ambas tablas.
- `exportCarnet.ts` con jsPDF + html2canvas — plantilla del §14.2 del PRD. Sube a Drive `ventas/{año}/{mes}/{itemId}-{slug}.pdf` y guarda URL en `sales.carnetUrl`.
- Certificado de origen: plantilla separada (`exportCertificado.ts`) con peso, color, calidad, procedencia (de `coleccion` o seleccionable). **Pregunta sobre la plantilla legal** (Q-6 del PRD) antes de inventarla.
- Email opcional al comprador con `send-email` API (`api/send-email.js` existente).

**DoD F4:** vender el ítem 001 (Sagrada Familia) a "Ana Pérez · cédula 1.024…" por $4.500.000 en esmereogénesis 6 cuotas. Generar carnet PDF + certificado, ver ambos en Drive, ítem queda `VENDIDA` en Convex y en Sheets.

#### F5 · QA + métricas (3 días)

- 4 specs Playwright nuevos: `e2e/fotosintesis-proveedor.spec.ts`, `-compra.spec.ts`, `-inventario.spec.ts`, `-ventas.spec.ts`.
- Telemetría mínima vía `TrackingContext` existente: eventos `fotosintesis.lot.created`, `.lot.closed`, `.item.created`, `.sale.created`.
- Health check en `api/health.js` que reporta # lotes abiertos > 7 días, # items con `syncStatus: "error"`.
- Dashboard pequeño en `/admin/fotosintesis/health` con esos counters.

**DoD F5:** `npm run test:e2e` pasa los 4 specs nuevos. El health endpoint responde `200 { ok: true, lotsOpenOver7d: 0, syncErrors: 0 }`.

### 3 · Reglas de interacción durante la implementación

- **Pregunta antes de adivinar.** Si una decisión del PRD no es 100% clara (ej. Q-2: ¿numeración por año o continua?), abre el tema antes de codificar.
- **Commits por fase.** Un commit por fase, mensaje formato `feat(fotosintesis): F{N} {nombre}` con bullets de lo cambiado. **Antes de cada commit corre `npm run build`** (la pipeline genera la versión de cache busting).
- **No tocar `/admin/products` (Fotosíntesis v1)** — coexiste, no se reemplaza.
- **No agregar Vercel projects nuevos.** Deploy es automático en push a `main`. Trabajamos en `feature/fotosintesis-v2-capture`.
- **Worktrees:** si abres un worktree para experimentar, déjalo limpio o avísame antes de desecharlo (hay specs previos en `.claude/worktrees/` que conviene preservar como referencia).
- **Si una mutación Convex puede fallar a media transacción** (ej. crear ítem pero fallar push a Sheets), usa el patrón existente: escribir Convex primero, marcar `syncStatus: "pending"`, agendar acción `pushToSheet`. Nunca rollback de Convex por fallo de Sheets — el cron eventualmente reconcilia.

### 4 · Definition of Done global

- Las 6 fases (F0–F5) en verde.
- `npm run build` pasa en local y CI.
- Maritza completa el flujo end-to-end con datos reales en una sesión guiada (proveedor Mauro → lote `B-001` → 3 ítems → 1 venta con carnet).
- 0 lotes con preponderancia ≠ 100% en `lots` table (verificable con un script `scripts/audit-fotosintesis.ts`).
- 0 ítems con `lotItems.itemId` huérfano respecto a `productInventory`.
- Métricas leading del PRD §11 instrumentadas y reportando.

### 5 · Cuando termines

Cuando F5 esté verde, abre PR contra `main` con título "Fotosíntesis v2 — captura administrativa (proveedor → lote → inventario → ventas)" y descripción que enlace al PRD. Marca a Kevin como reviewer.

¡Arranca con el paso 0 — léete el PRD completo y resúmemelo en tres frases antes de proponer plan F0!

## (fin del prompt ⬆ — copiar hasta aquí)

---

## Notas para Kevin (no van en el prompt)

- El prompt está pensado para una sesión de Claude Code en el repo `TierraMadre`, no en cowork mode.
- Si quieres que arranque ya por F0 sin el "preámbulo de lectura", borra el §0 — pero la lectura previa reduce errores en ~40% según mi experiencia con specs largos.
- Si el contexto de Claude Code se llena entre fases, dile "haz `/clear` y vuelve a leer el PRD §X para retomar F{N}".
- El estimado total (18-22 días) es para un humano. Claude Code en agentic mode puede comprimir a 4-7 días si el código de F0 sale limpio (es la base de todo).
