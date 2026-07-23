# Spec + Plan · Pestaña "Items" en Fotosíntesis (migrar el atelier `/admin/products`)

**Fecha:** 2026-07-21 · Basado en investigación de 2 agentes (atelier + patrones Fotosíntesis).

## 0. Hallazgo clave (cambia el marco)

`/admin/products` (atelier "Inventario") **YA es Convex-nativo**: lee/escribe la MISMA
tabla `productInventory` que Fotosíntesis, comparte `useProductLock`, la auditoría
`productEdits` y el push `pushToSheet`. **No es una migración de datos** — es un
**movimiento de navegación + rediseño** para que viva dentro de Fotosíntesis.

El atelier es el editor MÁS AMPLIO (todo el inventario, con o sin lote); el editor
nativo de Fotosíntesis (`EditItemPage`) es solo ítems-dentro-de-lote. Por eso "Items"
debe basarse en el atelier, no en el editor de lote.

## 1. Objetivo

Nueva pestaña **"Items"** en el bottom nav de Fotosíntesis (`/admin/fotosintesis/items`)
que: (a) lista TODOS los ítems con el patrón visual de **Lotes**; (b) se conecta al
finder **⌘K** (ya busca ítems); (c) permite ver detalle + editar + ver tracking
(kardex) de cada ítem. `/admin/products` se redirige a la nueva ruta.

## 2. Alcance

| Incluye                                            | Cómo                                                                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Lista de todos los ítems (511+), filtros, búsqueda | reusar lógica de `ProductManagementPage` + query `products.list({})`, **presentada con el layout de `LotesPage`** |
| Detalle + edición de ítem                          | reusar `ProductManagement/EditDrawer.tsx` (el amplio) o `Bandeja` inspector                                       |
| Tracking / kardex por ítem                         | `asesorMovements.listByItem` (ya en `AsesorMovementPanel`)                                                        |
| ⌘K → buscar ítem → detalle                         | `ProductoSpotlight` ya lo hace; solo asegurar el `onSelect` navegue a `/items?item=<id>`                          |
| Etiquetas/QR                                       | ya existe `/admin/products/etiquetas` (reusa labels de Fotosíntesis)                                              |

## 3. Diseño

- **Ruta:** `/admin/fotosintesis/items` (hija de `FotosintesisLayout`) + redirect de `/admin/products`.
- **Tab bar:** agregar 6º slot a `FOTO_SLOTS` (`src/components/navigation/tabBarConfig.ts`),
  ícono `Gem`/`Layers`, `route:'/admin/fotosintesis/items'`, `match:'prefix'`, ANTES del slot `menu`.
- **Lista (redesign estilo Lotes):** header editorial + KPIs (`HeaderStat`), tabs de estado
  (Todo/Disponibles/Con asesor/Consignación/Vendidas), search inline, filas `Link` con:
  chip de ID mono, bullet de color, nombre + meta (`itemId · colección · calidad · ubicación`),
  columnas desktop (peso, categoría, **precioFinalCOP**, estado-badge vía `estadoMeta()`),
  chevron móvil. Reusar `estadoMeta()`, `COP_FORMATTER`, `monoSx` de `LotesPage`.
- **Detalle/edición:** al click en fila → abrir el **`EditDrawer` del atelier** (ya soporta
  todo el inventario, con/sin lote) como drawer lateral (patrón `DirectorioPage` split-pane),
  o navegar a `?item=<id>` (deep-link que el atelier ya entiende). Dentro: identidad,
  specs, precio, estado, **AsesorMovementPanel (kardex/tracking)**, archivos (Drive),
  historial (`productEdits`). Lock compartido ya resuelto.
- **⌘K:** `ProductoSpotlight` ya busca `productInventory`. Registrar `onSelect` cuando la
  pestaña Items esté activa para navegar al detalle del ítem (`?item=<id>`).

## 4. Plan de implementación (orden)

1. **Ruta + slot** — `App.tsx` (`<Route path="items">`), `adminNavMap.ts` (entry `fotosintesis.items`,
   grupo Inventario), `tabBarConfig.ts` (slot), breadcrumbs en `FotosintesisLayout`, y el
   test drift-guard `adminNavMap.routes.test.ts`.
2. **`FotosintesisItems.tsx`** — nueva página: copia la estructura de `LotesPage.tsx`
   pero sobre `products.list({estado?, search})`; reusa `AdminToolbar` (filtros) o
   reconstruye los tabs de estado estilo Lotes. Filas navegan a `?item=<id>`.
3. **Detalle** — montar el `EditDrawer` del atelier dentro de la página (o via `?item=`),
   incluyendo `AsesorMovementPanel` (tracking). Verificar que funciona para ítems SIN lote.
4. **⌘K** — en `FotosintesisItems`, `openSpotlight({ onSelect: goToItem, scope:'Items' })`.
5. **Redirect** — `/admin/products` → `/admin/fotosintesis/items` (mantener `/etiquetas`).
6. **Limpieza** — mover `ProductManagement/*` bajo `Fotosintesis/items/` o dejar in-place
   e importar (decisión de organización, no funcional).

## 5. Decisiones abiertas (para ti)

1. **Detalle: drawer lateral (como Directorio) vs página completa** (`?item=`). Recomiendo
   drawer lateral (más rápido, no pierde el contexto de la lista).
2. **Reusar el `EditDrawer` del atelier tal cual** vs unificar con el `EditItemDrawer` de
   Fotosíntesis. Recomiendo reusar el del atelier (más amplio, ya maneja no-lote).
3. **Precio en el editor:** hoy edita `precioEmbajadorCOP`/`precioConscienteCOP`; con el
   refactor de precio (`precioFinalCOP = costo×2.6`) esos campos se retiran → coordinar con
   `docs/specs/2026-07-21-plan-refactor-precio-final.md`. Recomiendo: hacer el refactor de
   precio ANTES o JUNTO con esta migración (para no reconstruir el editor dos veces).

## 6. Fuera de alcance / follow-ups

- **Tracking analytics** (`UserViewsPage`/`ProductViewersPage`, ruta `/admin/analytics/*`)
  → hoy leen Sheets (`/api/product-views`), NO son parte del atelier. Unificarlos bajo
  "Items" sería re-cablear su fuente de datos a Convex `productViews` — trabajo aparte.
- El `products.list` está PROYECTADO (no trae todos los campos). Si "Items" muestra campos
  extra (procedencia, nivelRareza, preponderancia), extender la proyección en `convex/products.ts`.

## 7. Estimación

Trabajo de UI + wiring, sin migración de datos (todo ya es Convex). ~1-2 días: ruta+slot (rápido),
la página lista rediseñada (medio), wiring del drawer+kardex+⌘K (rápido, casi todo existe),
redirect + tests. El grueso es el rediseño visual de la lista al estilo Lotes.
