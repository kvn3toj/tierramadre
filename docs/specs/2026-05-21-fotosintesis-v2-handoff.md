# Fotosíntesis v2 — Developer Handoff

> **Fecha:** 2026-05-21
> **Autor:** Handoff generado desde previews HTML pulidos
> **Fuente visual:** `docs/previews/fotosintesis-v2/*.html` (8 pantallas)
> **PRD:** `docs/specs/2026-05-08-fotosintesis-admin-v2-PRD.md`
> **Plan de slices:** `docs/specs/2026-05-21-fotosintesis-v2-vertical-slice-plan.md`
> **Backend:** Convex ya construido (`convex/{providers,lots,lotItems,clients,sales,sequences}.ts`)

---

## 0. Cómo leer este documento

Cada sección de pantalla está pensada para ser implementable en una sesión de Claude Code sin tener que volver al PRD. Lo que aquí dice "token: `--foto-canvas`" debe traducirse a `foto.surfaces.canvas` usando `getFoto(mode)` del barrel `@/design-system`. Lo que aquí dice "llama a `lots.create`" se refiere a la mutación Convex ya existente — solo tienes que conectar el form.

**Estructura de cada pantalla:** Overview → Ruta y archivo → Layout → Tokens → Componentes → Estados → Convex calls → Edge cases → Accesibilidad.

---

## 1. Stack y dependencias

Sin nuevas dependencias. Todo se construye sobre lo que ya está en el proyecto:

| Layer | Tech | Version |
|---|---|---|
| UI | React + TypeScript | 18.3 / 5.6 |
| Build | Vite | 5.4 |
| Component library | Material-UI | v6 |
| Routing | React Router | 7.9 |
| Animation | Framer Motion | 12 |
| PDF | jsPDF + html2canvas | (ya en stack) |
| Backend | Convex | (ya configurado) |
| Storage | Google Drive + Sheets | (vía service account) |

**Path alias:** `@/` apunta a `src/`. Usa siempre `@/design-system`, `@/components`, `@/hooks`, `@/lib/convex-safe`.

---

## 2. Tokens de diseño (resumen de uso)

Todos vienen de `getFoto(mode)` ya existente. **No inventes valores nuevos.** Lo que sigue es la equivalencia entre los previews HTML y los tokens TS.

### 2.1 Color

| Token preview | Token TS | Valor light | Uso |
|---|---|---|---|
| `--canvas` | `foto.surfaces.canvas` | `#FFFFFF` | Fondo principal |
| `--panel` | `foto.surfaces.panel` | `#FAFAF9` | Bandeja, sub-fondos |
| `--inset` | `foto.surfaces.inset` | `#F3F4F2` | Inputs, chips, dropzones |
| `--inset-2` | (extender) | `#ECEDEA` | Hover de inset |
| `--edge` | `foto.surfaces.edge` | `rgba(11,16,14,0.06)` | Hairlines sutiles |
| `--rule` | `foto.surfaces.rule` | `rgba(11,16,14,0.10)` | Bordes de cards/inputs |
| `--edge-strong` | `foto.surfaces.edgeStrong` | `rgba(11,16,14,0.18)` | Bordes focus, ghost btns |
| `--ink-primary` | `foto.ink.primary` | `#0B100E` | Texto principal |
| `--ink-secondary` | `foto.ink.secondary` | `#454C4A` | Texto body |
| `--ink-tertiary` | `foto.ink.tertiary` | `#8B9290` | Labels, metadata |
| `--ink-mute` | `foto.ink.mute` | `#B7BCBA` | Placeholders, disabled |
| `--ink-inverse` | `foto.ink.inverse` | `#FFFFFF` | Texto sobre primario |
| `--accent` | `foto.accent.primary` | `#008C62` (`emeraldCore.dark`) | CTAs, success |
| `--accent-deep` | (extender) | `#006B4A` | Hover accent, números prominentes |
| `--accent-soft` | `foto.accent.soft` | `rgba(0,140,98,0.07)` | Bgs suaves, badges OK |
| `--accent-glow` | (extender) | `rgba(0,140,98,0.15)` | Focus ring |
| `--warn` | `foto.status.consigned` | `#B68B2F` / `#9A7029` | Lote abierto, advertencias |
| `--err` | `foto.status.sold` | `#B33A2F` | Errores, sync error, deletions |

**Recomendación:** Extender `src/design-system/tokens/foto.ts` con `accent.deep`, `accent.glow` y `surfaces.inset2`. Son los tres tokens nuevos que el preview usa y que conviene oficializar antes de implementar.

### 2.2 Tipografía

| Uso | Family | Size | Weight | Letter-spacing | Notas |
|---|---|---|---|---|---|
| Page title (Home h1) | sans | 42px | 600 | -0.035em | Hero solamente |
| Section title | sans | 22-32px | 600 | -0.02 a -0.03em | h2/h3 grandes |
| Ticket ID (B-008) | mono | 42px | 300 | -0.055em | tabular-nums |
| Card title | sans | 14-18px | 600 | -0.018em | |
| Body | sans | 13-13.5px | 400 | normal | line-height 1.45 |
| Label uppercase | sans | 9px | 500 | 0.18-0.20em | UPPERCASE |
| Helper text | sans | 11-12px | 400 | normal | Color tertiary |
| Numbers / IDs | mono | varía | 400-600 | -0.005em | `font-variant-numeric: tabular-nums` siempre |
| Kardex título | serif | 22px | 500 | -0.02em | Solo en preview del Kardex |

**Families desde `@/design-system`:**
- `fontFamilies.system` (sans)
- `fontFamilies.mono`
- (extender) `fontFamilies.serif` solo para Kardex render

### 2.3 Spacing (8px base, no inventar)

| Token | Valor | Uso típico |
|---|---|---|
| `xs` | 4px | gaps internos |
| `sm` | 8px | gap entre chips, footer cluster |
| `md` | 14-16px | padding inputs, gap entre fields |
| `lg` | 22-24px | padding panes, margin entre secciones |
| `xl` | 32-36px | padding header, separación bloques |
| `2xl` | 48-64px | top hero |

Spacing grande también via `gridTemplateColumns` con `gap: 14px-28px` según contexto.

### 2.4 Radius

| Token | Valor | Uso |
|---|---|---|
| `xs` | 3-4px | Pills mono pequeñas, kbd |
| `sm` | 6-7px | Chips, pills inline |
| `md` | 9px | Inputs, botones |
| `lg` | 11px | Cards internas, dropzone |
| `xl` | 14px | Panel principal, cards de quick action |
| `pill` | 999px | Step pills, badges status |

### 2.5 Sombras y depth

Borders-only por default. **Sin sombras** salvo dos excepciones:

- Modal Spotlight: `0 1px 2px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.15), 0 36px 80px rgba(0,0,0,0.3)`
- Kardex preview: `0 12px 30px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2)` (porque vive sobre fondo oscuro)
- Quick cards hover: `0 1px 2px rgba(11,16,14,0.04), 0 14px 32px rgba(11,16,14,0.06)`
- Focus ring inputs: `0 0 0 3px var(--accent-glow)`

### 2.6 Motion

| Animación | Duración | Easing | Uso |
|---|---|---|---|
| Hover background | 120ms | ease | Row, chip, button bg |
| Hover transform | 120ms | ease | Botones `translateY(-1px)` |
| Focus ring | 120ms | ease | box-shadow input |
| Toggle slide | 200ms | `cubic-bezier(0.3, 0.7, 0.4, 1)` | Switch thumb |
| Sheet/Drawer slide | 280ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Drawer enter |
| Pulse dot | 1800ms | ease-in-out infinite | Sync indicator |

**Reduced motion:** todas las animaciones deben respetar `prefers-reduced-motion: reduce`. Pulse animation no es crítica — desactivar.

---

## 3. Componentes compartidos (crear primero)

Antes de tocar pantallas, crear estas piezas en `src/pages/admin/Fotosintesis/components/`. Son reutilizadas por casi todas las pantallas.

### 3.1 `<FotoTopbar>`
Sticky top, glass blur, breadcrumbs a la izquierda, chips + avatar a la derecha.

**Props:** `crumbs: Crumb[]` · `syncStatus: 'synced'|'pending'|'error'` · `userInitial: string`

**MUI base:** `<AppBar position="sticky">` + `<Toolbar>` + `<Breadcrumbs>`. Background: `rgba(255,255,255,0.86)` con `backdropFilter: 'saturate(140%) blur(8px)'`.

### 3.2 `<TicketHeader>`
El "ticket" persistente con ID grande en mono + meta + barra de progreso. Aparece en captura-lote, venta-kardex y lote-resumen.

**Props:** `id: string` (e.g. "B-008") · `kind: 'lot'|'sale'` · `subtitle?: ReactNode` · `meta?: TicketMeta[]` · `progress?: TicketProgress[]`

**Layout:** `display: grid; grid-template-columns: auto 1fr auto; gap: 28px; align-items: end`. Para sales con steps, swap el slot `progress` por `<StepPills>`.

### 3.3 `<StepPills>`
Para indicar paso 1/2/3 con done/active visual. En venta-kardex y wizard de captura si decides exponerlo.

**Props:** `steps: { label: string; state: 'done'|'active'|'pending' }[]`

### 3.4 `<ChromaBar>`
Ya existe en `src/pages/admin/ProductManagement/ChromaBar.tsx`. Reusar en directorio.

### 3.5 `<SegmentedControl>`
El toggle "Embajador / Cliente final" o "Esmereogénesis / Contado / Crédito". Estilo iOS: track inset, thumb white con shadow ligera al activo.

**Props:** `options: { value; label }[]` · `value: string` · `onChange(value)`

**No usar `<ToggleButtonGroup>` de MUI** — el look es diferente. Construir custom con `<RadioGroup>` accesible + styled-components.

### 3.6 `<FieldLabel>`
Label uppercase 9px con opcional sub a la derecha. Usada en cada field.

```tsx
<FieldLabel optional="opcional pero recomendado">Teléfono</FieldLabel>
```

### 3.7 `<NumberInputWithCalc>`
Input numérico con suffix calculado en vivo (el `33 → $165.000 COP`).

**Props:** `value: number` · `onChange(v)` · `calcSuffix?: string` · `calcVariant?: 'accent'|'neutral'`

Internamente: `<InputBase>` + `<Box>` suffix con border-left. Cuando `calcVariant='accent'`, el suffix es verde sobre `accent-soft`.

### 3.8 `<ChipsInput>`
Para materiales en wizard. Chips fijos + input que crea chip al `Enter`.

**Props:** `chips: string[]` · `onAdd(name)` · `onRemove(name)` · `placeholder?: string`

### 3.9 `<PhotoDropzone>`
Drop area + strip de thumbnails + sample cromático.

**Props:** `photos: Photo[]` · `onAdd(files)` · `onRemove(id)` · `chromaHex?: string`

Usa `useChromaSamples` ya existente para sampling.

### 3.10 `<PreponderanceRing>`
Anillo SVG con porcentaje acumulado en el centro.

**Props:** `value: number` (0-100) · `target: number` (default 100) · `overrideLabel?: ReactNode`

Cambia a rojo cuando `value > target + 0.01` (BR-2 violado).

### 3.11 `<ItemMiniCard>`
Card de ítem en la bandeja con check, nombre, meta, % y costo. Variantes: `done | pending | active`.

### 3.12 `<ShortcutTable>`
Grid de 2 columnas con label + kbd. Usado en todas las bandejas.

### 3.13 `<KbdKey>`
Tecla individual estilizada (background canvas, border edge, shadow rule 1px).

---

## 4. Pantalla por pantalla

### 4.1 Home — `/admin/fotosintesis`

**Archivo:** `src/pages/admin/Fotosintesis/HomePage.tsx`
**Preview:** `docs/previews/fotosintesis-v2/home.html`
**Slice:** 1 (mínimo) → 5 (completo con métricas reales)

#### Overview
Landing de Fotosíntesis. Saluda a Maritza, muestra salud del sistema, sugiere la acción más importante (banner de atención), ofrece 3 quick actions y resume actividad.

#### Layout
- Topbar sticky
- Hero (padding `36px 28px 24px`, gradient `var(--canvas) → var(--panel)`)
  - Grid 2 col: `1fr auto`
  - Left: tag + h1 + lede
  - Right: 4 health stats con separadores verticales
- Attention banner (full width, max 1320, padding `0 28px`)
- Main grid: `1.6fr 1fr`, gap 24px
  - Quick actions row: `repeat(3, 1fr)`, gap 14px, span full
  - Left col: panels stacked (Lotes en curso, Actividad reciente)
  - Right col: panels stacked (Ventas por embajador, Ritmo semanal, Atajos)

Max width contenedor: 1320px. Breakpoint `<900px`: colapsar todo a 1 col.

#### Tokens usados
Hero: `--ink-primary` (h1, accent del nombre con linear-gradient a `#2a5b4a`), `--ink-secondary` (lede), `--accent-deep` (link), `--accent-glow` (underline link).

Health stats: mono 28px / 300 weight, separadores `--rule`. Variantes color: `.warn` usa `--warn`, `.alert` usa `--err`.

Attention banner: `linear-gradient(90deg, --accent-soft 0%, rgba(0,140,98,0.03) 100%)`, border `1px solid rgba(0,140,98,0.18)`, radius 14px, padding 18px 22px.

Quick cards: border `1px solid --rule`, radius 14px, padding 22px. Hover: border `--ink-primary` + `translateY(-2px)`. Ícono diferenciado por card:
- Compra: bg `linear-gradient(135deg, #2a5b4a, #0b3d2a)`, color white
- Venta: bg `linear-gradient(135deg, #c5a06a, #8a5e2c)`, color white
- Directorio: bg `--ink-primary`, color white

#### Componentes
| Slot | Componente | Source data |
|---|---|---|
| Saludo | string concat por hora | `new Date()` |
| 4 stats | hardcoded layout, datos | `lots`, `productInventory`, `sales` agregados |
| Banner | derivado de `lots.list({ estado: 'abierto' })` | Si existe lote abierto |
| Quick cards | static + counters | `lots.list` count, `sales.list` last |
| Lotes en curso | list | `lots.list({ estado: ['abierto', 'cerrado-pendiente-publicar'] })` |
| Actividad | list | combine `productEdits` + `sales` recientes |
| Ventas por embajador | list bars | aggregate `sales` group by `client.asesorId` |
| Ritmo semanal | sparkline | weekly buckets de `sales` |

#### Estados / interacciones
- Hover en quick card: `translateY(-2px)`, border `--ink-primary`. Cursor pointer. Click → navigate.
- Click "Retomar captura" → `/admin/fotosintesis/lots/B-008`.
- Click row de lote → si abierto: a captura, si listo para cerrar: a lote-resumen.

#### Convex calls
```ts
const lots = useQuery(api.lots.list);
const recentSales = useQuery(api.sales.list, { limit: 5 });
const inventory = useQuery(api.products.list);
const recentEdits = useQuery(api.products.recentEdits, { limit: 5 });
```

#### Edge cases
- **Sin lotes abiertos:** ocultar banner de atención, mostrar empty state en panel "Lotes en curso" con CTA "Registrar primera compra".
- **Sin ventas:** sparkline + ventas por embajador → empty state "Aún no hay ventas registradas".
- **Sync error:** mostrar `2 sync error` en rojo + tooltip que linka a `/admin/fotosintesis/health`.
- **Greeting por hora:** `00:00-11:59 → "Buenos días"`, `12:00-18:59 → "Buenas tardes"`, `19:00-23:59 → "Buenas noches"`.

#### Accesibilidad
- Tab order: stats → banner → quick cards → panels
- `<h1>` único: "Buenos días, Maritza" (incluye el name)
- Banner: `role="alert"` solo si hay action requerida
- Cards quick: `<a>` semántico, no `<div onClick>`
- Health stats: `aria-label` por stat ("42 ítems disponibles")

---

### 4.2 Captura de lote — `/admin/fotosintesis/lots/:loteId`

**Archivo:** `src/pages/admin/Fotosintesis/CapturaLotePage.tsx`
**Preview:** `docs/previews/fotosintesis-v2/captura-lote.html`
**Slice:** 1 (gema mínimo) → 2 (joya/insumo completos) → 4 (factura upload)

#### Overview
La pieza central. Ticket persistente arriba con datos del lote en construcción. Carta del ítem actual al centro. Bandeja con anillo de progreso, resumen y atajos a la derecha.

#### Layout
Sticky topbar (56px) + Ticket (~110px) + Main grid `minmax(0, 1fr) 380px`. Right pane sticky a `top: 56px`, max-height `calc(100vh - 56px)`, overflow auto. Pane izquierdo padding `24px 28px 80px` (espacio para sticky footer del item).

#### Tokens y medidas críticas
- Ticket ID: mono 42px / 300 / letter-spacing `-0.055em`. Color `--ink-primary`. Variante para errores (sin proveedor): color `--err`.
- Bar de progreso: height 5px, radius 2.5px. Fill: `linear-gradient(90deg, --accent, --accent-deep)`. Mark vertical 2px en `left: 100%`.
- Type buttons: padding `12px 14px`, radius 10px, gap 8px. Active: bg `--accent-soft`, border `--accent`, glyph bg `--accent`. Dot indicator: 6px circle top-right `-1px / -1px`.

#### Componentes hijos
- `<TicketHeader kind="lot">`
- `<TypeSelector>` (custom radio con glyph + label + key)
- `<NumberInputWithCalc>` para preponderancia
- `<JoyaFields>` / `<GemaFields>` / `<InsumoFields>` (conditional)
- `<ChipsInput>` para materiales
- `<PhotoDropzone>` con sample cromático
- `<Observation>` con voice button
- `<Switch>` (estilo iOS) para reserva oculta
- `<StickyFooter>` con 3 acciones
- Bandeja:
  - `<PreponderanceRing value={67} />`
  - `<LotMetaCard>` (proveedor, recibido, costo total, peso, pago, factura)
  - `<ItemList>` con 3 `<ItemMiniCard>`
  - `<ShortcutTable>`

#### Estados / interacciones

| Acción | Behavior |
|---|---|
| Teclas `1` `2` `3` `4` | Cambian tipo de ítem (sin focus en input) |
| Teclear en `preponderancia` | Recalcula `costoBaseCOP` y `% acumulado` en vivo, actualiza ring |
| Suma de prep > 100 | Ring rojo, helper "exceso de X%", botón "Guardar" disabled |
| Suma de prep < 100 al último ítem | Helper sugiere "33% es lo que falta" como prefill |
| Pegar foto | `onPaste` con clipboard image → push a `photos` |
| Drop foto | dropzone con `onDrop` |
| Sample cromático | Cuando primer foto carga, sample → mostrar swatch + hex |
| `⌘D` | Duplicar ítem actual (preserva tipo/color/calidad/materiales, limpia nombre/peso/preponderancia) |
| `⌘↵` | Si es último ítem y prep=100%: ir a `lote-resumen`. Si no: guardar y siguiente |
| Click toggle reserva oculta | Flip `mostrarEnCatalogo` |
| Blur de cualquier input | Autosave del draft (debounced 800ms) |
| Click ítem en bandeja | Navega a edición de ese ítem (reemplaza la carta actual) |

#### Convex calls
```ts
// Carga
const lot = useQuery(api.lots.getByLoteId, { loteId });
const items = useQuery(api.lotItems.listByLote, { loteId });
const sumPreponderance = useQuery(api.lotItems.sumPreponderancia, { loteId });

// Mutaciones
const createItem = useMutation(api.lotItems.create);
const updateItem = useMutation(api.lotItems.update);
const removeItem = useMutation(api.lotItems.remove);
const closeLot = useMutation(api.lots.close);
```

**Validación local antes de mutate:** BR-2 y BR-3 los protege el server, pero el frontend bloquea el botón "Cerrar lote" hasta cumplirlas para no malgastar viajes.

#### Edge cases
- **Lote nuevo sin proveedor:** ticket muestra "⚠ Sin proveedor" en rojo, abre `<ProveedorNuevoDrawer>` automáticamente.
- **Sync offline:** Toast persistente "Sin conexión Convex — los cambios no se guardarán". Disable todos los inputs.
- **`peso` con valor no numérico (ej. "Plata"):** permitir string libre, no parsear como number.
- **>10 materiales:** desactivar "+ agregar material" después del 10º.
- **Foto pegada cuyo `Image.decode()` falla:** mostrar error inline + dejar slot vacío.
- **Sample cromático CORS error:** silenciar, no mostrar swatch.
- **Otro admin entra al mismo lote:** mostrar `<LockBanner>` "Maritza está editando · solicitar control" (reusa `productLocks` existente).

#### Accesibilidad
- Topbar h1: heading nivel 1 implícito (oculto, sr-only): "Captura del lote B-008".
- Type selector: `<fieldset>` + `<legend>` "Tipo de ítem"; cada botón es `<input type=radio>` visualmente disfrazado.
- Preponderance ring: `role="progressbar"` con `aria-valuenow={67}` `aria-valuemax={100}`.
- Items en bandeja: `<ul role="list">` con cada `<li>` cliclable.
- Voice button: `aria-label="Dictar observación"`.
- Toggle reserva: `<Switch>` MUI con `aria-checked`.

---

### 4.3 Lote resumen — `/admin/fotosintesis/lots/:loteId/close`

**Archivo:** `src/pages/admin/Fotosintesis/LoteResumenPage.tsx`
**Preview:** `docs/previews/fotosintesis-v2/lote-resumen.html`
**Slice:** 2 (después de Inventario)

#### Overview
Pantalla de confirmación cuando BR-2 y BR-3 están cumplidos. Maritza ve las 4 validaciones verdes, revisa los 3 ítems, decide el comportamiento de publicación y cierra el lote.

#### Layout
- Topbar
- Hero centrado: badge "LISTO PARA CERRAR" + ícono check, h1 (38px), lede (max 560)
- Row de 4 `<ValidationCard>` (preponderancia, conteo, fotos, sync)
- Main grid `1.5fr 420px`, gap 32px
  - Left: panel "Los 3 ítems del lote" + caja `<NextHint>`
  - Right: `<MetaCard>` + `<DecisionCard>` + actions

#### Componentes
- `<ValidationCard>`: barra accent 3px izquierda, head con label + ok pill, big number, lab inferior. 4 instancias siempre.
- `<SumRow>`: ítem en lista del summary con thumb 42px, ID badge, name + meta, %/costo, `<PubToggle>`.
- `<PubToggle>` (button no input): tiene dos estados visuales — `on` (verde con dot) o `off` (gris con dot mute). Click toggleable.
- `<DecisionCard>`: 3 `<OptionCard>` tipo radio + botón block "Cerrar lote".
- `<NextHint>`: caja inset con bullets de qué pasará.

#### Estados
- Si alguna validación falla (BR-2/BR-3) → no llegamos a esta pantalla. Pero defender: redirect a captura-lote.
- Toggle individual por ítem actualiza la opción de la decisión global (si dejan los toggles mezclados, "Publicar selectivamente" queda marcado).
- "Publicar todo el lote ahora" → flip todos los toggles a `on`.
- "Mantener todo en reserva" → flip todos a `off`.

#### Convex calls
```ts
const lot = useQuery(api.lots.getByLoteId, { loteId });
const items = useQuery(api.lotItems.listByLote, { loteId });
const productItems = useQuery(api.products.listByLote, { loteId });
const closeLot = useMutation(api.lots.close);
const publishLot = useMutation(api.lots.publish); // o updateMostrarEnCatalogo en bulk
```

**Al confirmar:**
1. `closeLot({ loteId })` (server valida BR-2/BR-3, sets `estado: 'cerrado'`)
2. Para cada ítem cuyo toggle quedó `on`: `updateProduct({ itemId, mostrarEnCatalogo: true })`
3. Si decisión "publicar todo": `publishLot({ loteId })` directo
4. Toast "Lote B-008 cerrado · 3 ítems · sincronizando…"
5. Navigate `/admin/fotosintesis`

#### Edge cases
- **Validación falla server-side a pesar de UI verde:** mostrar toast error + scroll a la validación rota.
- **Factura no adjunta:** el preview muestra "por adjuntar" en italic; no es bloqueante para cerrar — solo aviso.
- **Sync offline:** botón "Cerrar lote" disabled.

#### Accesibilidad
- Validation cards: `role="status"` con `aria-label="Preponderancia 100%, BR-2 cumplido"`.
- Decision options: `<RadioGroup>` real con `aria-label="Decisión de publicación"`.
- PubToggle: `<button aria-pressed={isOn}>publicar / reserva`.

---

### 4.4 Crear proveedor inline — drawer

**Archivo:** `src/pages/admin/Fotosintesis/components/ProveedorNuevoDrawer.tsx`
**Preview:** `docs/previews/fotosintesis-v2/proveedor-nuevo.html`
**Slice:** 1

#### Overview
Drawer lateral de 560px que se abre sobre captura-lote o sobre directorio. Permite crear un proveedor sin perder el contexto del flujo activo.

#### Layout
- Overlay dim `rgba(11,16,14,0.32)` + `backdropFilter: saturate(80%)`
- Drawer fixed right, width 560px, full height, shadow `-30px 0 80px rgba(11,16,14,0.18)`
- Header (padding 22-26 18 26, border-bottom rule)
- Body scroll (padding 24 26, gap 24 entre groups)
- Footer (padding 18 26, border-top, bg panel)

#### Componentes
- `<DrawerHeader>`: breadcrumb interno ("B-008 · sin salir de la captura") + h2 + sub + close button
- `<TypePills>`: grid 4 col con pill seleccionable (`Gemas` / `Joyas` / `Insumos` / `Otros`)
- Form: name + doc + tipo doc + tel + email + dir + notas
- `<NitVerifyTag>`: badge inline verde con check cuando NIT pasa validación
- `<DuplicateWarning>`: card warn cuando NIT/nombre matchea registro existente
- `<DrawerFooter>`: hints kbd + Cancelar + Crear

#### Validaciones
- **NIT colombiano:** valida dígito de verificación. Si OK, muestra `<NitVerifyTag>`.
- **Detección duplicados:** debounce 300ms al teclear name o nit; query `providers.list` con filter. Si match: mostrar `<DuplicateWarning>` con CTAs "Usar ese proveedor" / "Crear uno nuevo".
- **Teléfono:** auto-format a `+57 NNN NNN NNNN`.
- **Email:** validación HTML5 + ojo opcional.

#### Convex calls
```ts
const allProviders = useQuery(api.providers.list);
const createProvider = useMutation(api.providers.create);

// Para dup detection: filter client-side de allProviders por similitud
const duplicates = useMemo(() =>
  fuzzyMatch(allProviders, { nombre, nit }), [allProviders, nombre, nit]);
```

#### Estados
- `idle` → form vacío, focus en name
- `typing` → form parcial, validaciones inline
- `duplicate-found` → warn card visible, dos CTAs
- `saving` → footer button con spinner, body disabled
- `success` → cierra drawer, fires `onSuccess(providerId)` al parent

#### Edge cases
- Esc → confirmar descarte si form tiene cambios
- Drawer abierto desde captura: al crear, autovincula al lote en captura via `lots.update({ loteId, providerId })`.
- Drawer abierto desde directorio: al crear, selecciona el nuevo en la lista.

#### Accesibilidad
- `<Dialog>` MUI con `aria-modal` y `aria-labelledby="drawer-title"`.
- Focus trap: primer focus en input "Nombre o razón social".
- Esc cierra; click backdrop cierra (con confirmación si dirty).
- `<RadioGroup>` para type pills con `aria-label="Tipo de proveedor"`.

---

### 4.5 Buscador Spotlight — modal global

**Archivo:** `src/pages/admin/Fotosintesis/components/ProductoSpotlight.tsx`
**Preview:** `docs/previews/fotosintesis-v2/spotlight-buscador.html`
**Slice:** 1 (mínimo) → 3 (búsquedas recientes, crear nuevo)

#### Overview
Modal global accesible vía `⌘K` en cualquier pantalla. Cuando se invoca desde venta-kardex, scope auto-bind a "Solo vendibles". Resultado seleccionado vuelve al caller.

#### Layout
- Backdrop oscuro con radial-gradient verde sutil
- Modal centrado horizontal, top 50-110px, max-width 920px, radius 18px
- Header: search input grande (19px font) + scope chip + esc key
- Body grid `210px 1fr`, min-height 540px, max-height 540px
- Left: filters scroll
- Right: results scroll + recent + create-new
- Footer: kbd row + hint sobre BR-6

#### Componentes
- `<SearchInput>`: borderless, autofocus
- `<ScopeChip>`: removible, sets el filtro base
- `<FilterGroup>`: cada uno con title + lista de `<FilterItem>` clicable (active = ink-primary bg + white text)
- `<ResultRow>`: thumb 52px + ct chip + name + obs + meta + badge estado + price
- `<RecentSearchRow>`: clock icon + query + time
- `<CreateNewRow>`: bg gradient + icon square + text + kbd

#### Interacciones
- `⌘K` abre desde cualquier pantalla (registrar en layout principal)
- `↑↓` navega resultados (focus visual = bg accent-soft + border-left accent 3px)
- `↵` selecciona, cierra modal, devuelve item al caller
- `⇥` mueve focus al primer filtro
- `Espacio` previsualiza (futuro: drawer lateral con foto grande)
- `Esc` cierra sin selección
- `⌘N` triggea "crear nuevo" (abre wizard de captura con lote nuevo)

#### Convex calls
```ts
const products = useQuery(api.products.list, {
  estado: ['DISPONIBLE', 'ASESOR'],
  search: query,
  filters: { calidad, procedencia, lote, priceRange }
});
```

**Optimización:** debounce 200ms en `query`, cache cliente con `localStorage` para recientes.

#### Edge cases
- **Sin resultados:** mostrar empty state custom + `<CreateNewRow>` siempre visible.
- **>50 resultados:** virtualizar lista o paginar.
- **Sin búsquedas recientes:** ocultar sección recientes.
- **Network offline:** badge "modo offline" + buscar solo en cache.

#### Accesibilidad
- `<Dialog>` con `role="combobox"` `aria-expanded`.
- Live region: anunciar "5 de 9 resultados" cuando cambia el query.
- Result row: `aria-selected={isFocused}`.
- Focus trap dentro del modal.

---

### 4.6 Venta + Kardex — `/admin/fotosintesis/sales/new`

**Archivo:** `src/pages/admin/Fotosintesis/VentaPage.tsx`
**Preview:** `docs/previews/fotosintesis-v2/venta-kardex.html`
**Slice:** 1 (embajador básico + carnet) → 3 (cliente final + certificado legal)

#### Overview
Pantalla de cierre de venta. Form a la izquierda (3 secciones: comprador, producto, pago + privacidad). Preview en vivo del Kardex en papel a la derecha sobre fondo oscuro.

#### Layout
- Topbar
- Ticket (V-NNNN) con step pills 1-2-3
- Main grid `minmax(0, 1.2fr) 480px`, gap 0
- Left pane: form, padding `24px 28px 60px`
- Right pane: bg dark `linear-gradient(180deg, #2a2522 0%, #1a1714 100%)`, padding `28px 24px`, sticky top 56, max-height calc(100vh - 56), overflow-y auto

#### Componentes
- `<TicketHeader kind="sale">` + `<StepPills>`
- `<SegmentedControl>` embajador/cliente final
- `<PersonCard>` (avatar 48px + name + meta + stats)
- `<ProductCard>` (img 96px con ct chip + name + obs + lineage 2-col)
- `<SegmentedControl>` esmereogénesis/contado/crédito
- `<TotalsCard>` con commission row en gold, grand total en accent
- `<WillHappenCard>` (las 5 acciones encadenadas)
- `<PrivacyToggle>` (switch + label + sub)
- `<KardexPreview>` (componente dedicado, ver 4.6.1)

#### 4.6.1 `<KardexPreview>`

Vive en panel oscuro. Es el documento "en papel".

**Estructura interna:**
- Paper bg `#FBF8F1`, radius 6px, padding `32px 30px 26px`, shadow oscura
- Top stripe 5px: `linear-gradient(90deg, accent 0%, gold 50%, accent-deep 100%)`
- Perforated bottom edge (decoración pseudo-element con radial-gradients)
- Head: brand TM + carnet ID en mono
- Product block: photo 108px + name (serif 22px) + sub
- Grid 2-col de 8 specs (peso, calidad, color, medidas, comprador, ID, precio, pago)
- Cert footer: text + seal circular "TM 2026" + QR pattern (placeholder)

**Privacidad:** Cuando `privacyToggle.on`, la fila "Identificación" muestra "— oculta en versión pública —" en italic mute. Para el PDF interno se incluye, para el público no.

**Generación PDF:** jsPDF + html2canvas sobre `<KardexPreview>`. Output:
- `kardex-publico.pdf` (con privacidad on, para el comprador)
- `kardex-interno.pdf` (sin privacidad, para el contador)

#### Convex calls
```ts
const item = useQuery(api.products.get, { itemId });
const lot = useQuery(api.lots.getByLoteId, { loteId: item.loteId });
const provider = useQuery(api.providers.get, { id: lot.providerId });
const ambassadors = useQuery(api.clients.list, { tipo: 'embajador' });

const createSale = useMutation(api.sales.create);
const setCarnetUrl = useMutation(api.sales.setCarnetUrl);
const setCertificadoUrl = useMutation(api.sales.setCertificadoUrl);

// Upload a Drive (API existente)
const uploadCarnet = async (blob) => fetch('/api/media-upload', { ... });
```

#### Flujo de confirmar
1. Form validation client (BR-7 si crédito)
2. `createSale({ ... })` — server valida BR-6 + BR-7, flipa ítem a VENDIDA, agenda push
3. Generar PDFs (carnet + certificado si Slice 3)
4. Upload a Drive en `ventas/{año}/{mes}/{itemId}-{compradorSlug}.pdf`
5. `setCarnetUrl({ saleId, url })`, `setCertificadoUrl({ saleId, url })`
6. (Opcional Slice 3) `sendEmail({ to: client.email, attachments: [carnet, cert] })`
7. Toast "Venta V-0042 confirmada · Kardex en Drive"
8. Navigate `/admin/fotosintesis`

#### Edge cases
- **Item ya VENDIDA cuando llega el create:** server lanza error BR-6 → toast "Otro admin vendió este ítem hace X segundos" + refrescar producto.
- **Crédito sin fechaVencimiento:** input de fecha required, server también lo valida (BR-7).
- **PDF render falla:** retry 2x, luego toast error + opción "guardar sin PDF, generar después".
- **Email falla:** sale igual, solo no se envía. Toast "PDF guardado en Drive, falló el envío por email — reenviar después".
- **Cliente sin email pero pidió email:** disable email button + helper "Agrega un email al cliente".

#### Accesibilidad
- Step pills: `<ol>` con `aria-current="step"` en activo.
- KardexPreview: `<article aria-label="Vista previa del Kardex V-0042">`.
- Privacy toggle: `<Switch>` con `aria-label="Ocultar identificación en versión pública"`.
- Confirm button: cuando loading, `aria-busy="true"` + sr text "Generando Kardex, espera unos segundos".

---

### 4.7 Directorio — `/admin/fotosintesis/directory`

**Archivo:** `src/pages/admin/Fotosintesis/DirectorioPage.tsx`
**Preview:** `docs/previews/fotosintesis-v2/directorio.html`
**Slice:** 1 (mínimo: tabla + drawer) → 4 (búsqueda, filtros, historial completo)

#### Overview
Lista consolidada de proveedores, embajadores y clientes finales. Tab activo selecciona qué muestra. Click en fila abre drawer derecho con ficha + métricas + timeline.

#### Layout
- Topbar
- Header band con h1 + sub + actions + 4 stats
- Tabs (3): proveedores / embajadores / clientes
- Main grid `minmax(0, 1fr) 440px`, gap 0
- Left pane: searchbar + col-headers + rows
- Right pane: drawer ficha (sticky top 56)

#### Componentes
- `<HeaderStats>`: 4 stats con separadores verticales
- `<Tabs>` con counters
- `<SearchBar>` con icon + filter chips removibles
- `<ColHeaders>`
- `<DirectoryRow>`: chroma | avatar | name+meta | id+contact | tipo tag | compras count | last date | menu btn (revealed on hover)
- `<DrawerFiche>`: head (avatar lg + h2 + sub + pill row) + meta-grid 2-col + 3-col metrics + history timeline + actions

#### Estados
- Búsqueda con debounce 250ms
- Chips de filtro removibles
- Row hover reveals menu button
- Row selected: bg accent-soft + box-shadow inset 3px accent
- Tab change: refetch con filtro `tipo`
- Drawer sticky (max-height calc(100vh-56)), si excede → scroll interno

#### Convex calls
```ts
const providers = useQuery(api.providers.list, { search });
const clients = useQuery(api.clients.list, { tipo: 'embajador' | 'final', search });
const lots = useQuery(api.lots.list, { providerId: selected?.id }); // para historial
const sales = useQuery(api.sales.list, { clientId: selected?.id });
```

**Métricas agregadas (top 3 en drawer):**
- Total comprado: `sum(lots where providerId = X, costoTotalCOP)`
- Lotes: `count(lots where providerId = X)`
- Ítems: `count(productInventory where loteId in lots(X).map(loteId))`

(Calcular client-side desde los datos ya cargados — no nuevas mutations.)

#### Edge cases
- **Búsqueda sin resultados:** empty state con CTA "Crear contacto nuevo".
- **Contacto sin compras:** mostrar timeline empty "Aún no ha vendido a Tierra Madre".
- **Drawer responsive:** en mobile, drawer en bottom sheet o fullscreen modal.

#### Accesibilidad
- Tabs: `<TabList>` con `role="tablist"`, panels con `role="tabpanel"`.
- Tabla: `<table>` semántica o `<div role="table">` con `role="row"` `role="cell"`.
- Filter chips: `<button aria-pressed>` + label leíble por SR.
- Drawer: tab order desde row → drawer head → drawer actions.

---

### 4.8 Index (solo para revisión humana)

**Archivo:** no se implementa en React, ya vive como `docs/previews/fotosintesis-v2/index.html`. Es navegación entre los 7 previews. Cuando se implemente, la página equivalente en React es la home en sí.

---

## 5. Backend disponible (Convex API surface)

Lo que ya existe y se puede llamar directamente:

### Providers
- `providers.list({ search? })` → `Provider[]`
- `providers.get({ id })` → `Provider | null`
- `providers.create({ nombreORazonSocial, nit?, cedula?, ... })` → `id`
- `providers.update({ id, ...fields })` → `void`
- `providers.retryPush({ id })` → `void`

### Lots
- `lots.list({ estado?, providerId? })` → `Lot[]`
- `lots.get({ id })` / `lots.getByLoteId({ loteId })` → `Lot | null`
- `lots.peekNextLoteId()` → `string` (e.g. "B-009", sin consumir secuencia)
- `lots.create({ providerId, fechaRecepcion, costoTotalCOP, unidadesDeclaradas, formaPago, ... })` → `{ loteId, id }`
- `lots.update({ id, ...fields })` → `void`
- `lots.close({ loteId })` → server valida BR-2 + BR-3
- `lots.publish({ loteId })` → flipa todos los ítems del lote a `mostrarEnCatalogo: true`
- `lots.retryPush({ id })` → `void`

### LotItems
- `lotItems.listByLote({ loteId })` → `LotItem[]`
- `lotItems.sumPreponderancia({ loteId })` → `number` (reactivo, ideal para el ring)
- `lotItems.create({ loteId, itemId, tipo, nombre, preponderancia, ...typeSpecific })` → server calcula `costoBaseCOP`, crea `productInventory` row, asigna `ordenEnLote`
- `lotItems.remove({ id })` → server reordena `ordenEnLote`

### Clients
- `clients.list({ tipo?, search? })` → `Client[]`
- `clients.get({ id })` → `Client | null`
- `clients.create({ nombre, tipo, ... })` → `id`
- `clients.update({ id, ...fields })` → `void`

### Sales
- `sales.list({ clientId?, limit? })` → `Sale[]`
- `sales.get({ id })` → `Sale | null`
- `sales.peekNextSaleId()` → `string` (e.g. "V-0043")
- `sales.create({ itemIds, clientId, precioAcordadoCOP, formaPago, ... })` → server valida BR-6 + BR-7, flipa ítems a VENDIDA
- `sales.cancel({ id })` → ítems vuelven a DISPONIBLE
- `sales.setCarnetUrl({ id, url })` / `setCertificadoUrl({ id, url })` → `void`

### Products (existente)
- `products.list({ estado?, search?, ... })` → `Product[]`
- `products.get({ itemId })` → `Product | null`
- `products.listByLote({ loteId })` → ítems creados por ese lote
- `products.update({ itemId, ...fields })` → `void` (incluye `mostrarEnCatalogo`)

---

## 6. Ruteo

Agregar a `src/App.tsx`:

```tsx
const FotosintesisHome = lazy(() => import("./pages/admin/Fotosintesis/HomePage"));
const CapturaLote     = lazy(() => import("./pages/admin/Fotosintesis/CapturaLotePage"));
const LoteResumen     = lazy(() => import("./pages/admin/Fotosintesis/LoteResumenPage"));
const VentaNueva      = lazy(() => import("./pages/admin/Fotosintesis/VentaPage"));
const Directorio      = lazy(() => import("./pages/admin/Fotosintesis/DirectorioPage"));

<Route path="/admin/fotosintesis" element={<FotosintesisHome />} />
<Route path="/admin/fotosintesis/lots/:loteId" element={<CapturaLote />} />
<Route path="/admin/fotosintesis/lots/:loteId/close" element={<LoteResumen />} />
<Route path="/admin/fotosintesis/sales/new" element={<VentaNueva />} />
<Route path="/admin/fotosintesis/sales/:saleId" element={<VentaNueva />} />
<Route path="/admin/fotosintesis/directory" element={<Directorio />} />
```

Todas requieren `requireAdmin` (reusar el guard existente del proyecto).

**Atajos globales** (registrar en el layout `<FotosintesisLayout>`):
- `⌘ K` → abre `<ProductoSpotlight>` (modal global)
- `⌘ N` → nav a captura nueva
- `⌘ V` → nav a venta nueva
- `⌘ D` → nav a directorio

Usar `useHotkeys` o un hook custom; no librería nueva si ya hay algo similar.

---

## 7. Mapeo de slices ↔ archivos

| Slice | Pantallas a implementar | Componentes nuevos |
|---|---|---|
| **0** | (Backend cleanup) | — |
| **1** Ciclo feliz mínimo | HomePage (mínima), CapturaLotePage (solo gema, formato denso), ProveedorNuevoDrawer, VentaPage (embajador + carnet básico), Directorio (lista + drawer mínimo) | TicketHeader, SegmentedControl, NumberInputWithCalc, PreponderanceRing, ItemMiniCard, ProductoSpotlight (versión sin filtros) |
| **2** Inventario completo | CapturaLote con tabs Gema/Joya/Insumo, ChipsInput funcional, foto required, LoteResumenPage completa | JoyaFields, InsumoFields, ChipsInput full, PhotoDropzone con sampling |
| **3** Ventas completas | VentaPage con cliente final, crédito completo, certificado legal | KardexPreview, ClienteFinalForm, PdfExport util |
| **4** Proveedor+Compra ricos | Directorio con autocomplete, filtros, historial completo, upload factura | DirectoryRow expandida, HistoryTimeline, FacturaUploader |
| **5** Salud + calidad | Health endpoint dashboard, e2e Playwright, telemetría | HealthPanel, eventTracking |

---

## 8. QA checklist por pantalla

**Para cada pantalla, antes de PR a `main`:**

- [ ] Comparar con el preview HTML correspondiente lado a lado (1280x900 viewport)
- [ ] Tab order completo y lógico
- [ ] Funciona con teclado solamente (sin mouse)
- [ ] Respeta `prefers-reduced-motion`
- [ ] Estados loading, empty, error visibles y consistentes
- [ ] Convex offline → UI no se rompe, muestra banner
- [ ] Console limpia (sin warnings React, sin errors de Convex)
- [ ] Lighthouse a11y ≥ 95
- [ ] Mobile (375px) usable o gracefully degraded
- [ ] Build production sin errores (`npm run build`)

---

## 9. Anti-blinking — recordatorio

El CLAUDE.md del proyecto tiene reglas estrictas para evitar parpadeos:

1. Cargar cache de localStorage **síncronamente** en `useState(() => ...)`
2. Reservar espacio de imágenes con `aspect-ratio`
3. Usar `useId()` para keys únicos en componentes con imágenes
4. Preload de imágenes antes de mostrar galería
5. Para videos: usar el hack `#t=0.001` + poster
6. Evitar animaciones complejas; preferir swap instantáneo

**Aplica directamente a:**
- PhotoDropzone (preload + aspect-ratio)
- KardexPreview (la foto del producto)
- ItemMiniCard thumbnails
- Directorio avatars
- Spotlight result thumbnails

---

## 10. Próximo paso recomendado

1. **Extender tokens** (`src/design-system/tokens/foto.ts`) con `accent.deep`, `accent.glow`, `surfaces.inset2`, `fontFamilies.serif`. PR pequeño.
2. **Crear componentes compartidos** (§3) en `src/pages/admin/Fotosintesis/components/`. Sin pantallas todavía. PR mediano.
3. **Slice 1 pantalla por pantalla**, en este orden:
   1. HomePage (lectura, sin mutaciones)
   2. ProveedorNuevoDrawer (mutación más simple)
   3. CapturaLotePage (la pieza central, donde rompe todo)
   4. ProductoSpotlight
   5. VentaPage (con Kardex básico)
4. Demo con Maritza al cierre del Slice 1.
5. Iterar con sus feedback antes de Slice 2.

---

*Hecho con amor verde esmeralda en Colombia 💚*
*Este documento es la fuente de verdad para la implementación de Fotosíntesis v2. Si algo se desvía del preview HTML, gana el preview. Si algo se desvía del PRD, gana el PRD.*
