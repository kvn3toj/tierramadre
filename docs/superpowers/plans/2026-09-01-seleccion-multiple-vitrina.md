# Selección múltiple en el catálogo para compartir una vitrina — Implementation Plan

> **For agentic workers:** cada tarea es test-primero. El test se ve ROJO por una mutación
> nombrada antes de escribir la implementación, y la mutación se prueba con `grep -c` antes de
> correr el test. Un test que nunca estuvo rojo no es un test.

**Goal:** que en `/treasure` un asesor entre a modo selección, toque tarjetas, y acuñe un enlace
`/v/<token>` con exactamente esas piezas — sin salir del catálogo.

**Architecture:** helpers puros → hook local → passthrough en `PieceCard` → tarjeta → plomería de
la grilla → barra → interruptores → cableado del controller → montaje → teclado/gesto/foco →
snackbars → e2e. Nada de servidor: `/api/vitrina` ya acepta 50 ids.

**Tech Stack:** React 18 + TypeScript estricto, MUI v6, Vitest (jsdom para `.test.tsx`), Playwright.

**Spec:** `docs/superpowers/specs/2026-09-01-seleccion-multiple-vitrina-design.md`

## Global Constraints

- **Cerca de archivos.** Nuevos: `src/utils/vitrinaSelection.ts`, `src/hooks/useVitrinaSelection.ts`,
  `src/components/treasure/browser/VitrinaSelectionBar.tsx` y sus tests. Editables: `PieceCard.tsx`
  (sólo el passthrough de `role`/`ariaChecked`), `GridCard.tsx`, `VirtualGrid.tsx` (+ su test),
  `MobileSearchBar.tsx`, `DesktopFilterToolbar.tsx`, `useTreasureBrowserController.tsx`,
  `TreasureBrowser.tsx`, `ScrollToTop.tsx`, `vitest.config.ts`, `e2e/mobile-layout.spec.ts`,
  `src/components/treasure/browser/index.ts`.
- **NO tocar:** `convex/`, `api/`, `VitrinaShareDialog.tsx`, `useComparison.ts`, `ComparisonBar.tsx`,
  `CartPage.tsx`, `CollectionPage.tsx`, `index.html`, `public/version.json`, `src/pages/admin/**`,
  `NotificationContext.tsx`.
- **No correr `npm run build`** — reescribe los archivos de versión.
- **Sin dependencias nuevas.**
- **Cero literales de token:** nada de hex, de px de cromo inferior, ni de `zIndex` numérico.
  `bottomBarClearance(appShell.tabBarReserve)`, `zIndex.fixed`, `--tm-base`/`--tm-fast`.
- **Baseline de la suite:** 193 archivos / 1985 tests verdes (medido en el árbol intacto,
  `npm run test:unit`, 2026-09-01).
- Un commit por tarea, mensaje convencional en español: `feat(vitrina): …`. El cuerpo nombra la
  mutación que puso el test en rojo.

---

### Task 1: Helpers puros

**Files:** crear `src/utils/vitrinaSelection.ts` y `tests/vitrinaSelection.test.ts`.

Contrato: `VITRINA_MAX_ITEMS = 50`, `toggleId(ids, id, max) → { ids, rejected }` (ordenado,
quitar siempre permitido aunque se esté en el tope), `pruneIds(ids, has)`,
`toShareItems(ids, byId)`, `selectionLabel(n)`.

**Mutaciones que deben poner el test en rojo:**

- `>=` → `>` en la guarda del tope (dejaría entrar la pieza 51).
- `pruneIds` devolviendo su entrada sin filtrar.
- `toShareItems` mapeando `color` donde va `nombre`.
- Borrar la rama singular de `selectionLabel`.

---

### Task 2: El hook

**Files:** crear `src/hooks/useVitrinaSelection.ts` y `tests/useVitrinaSelection.test.ts`;
editar `vitest.config.ts` (entrada nueva en `environmentMatchGlobs` para jsdom).

Patrón `renderHook` de `tests/useDirtyGuard.test.ts`. `useLiveRegion` y `useNotification` se
mockean.

**Casos:** salir limpia · el toque 51 se rechaza y anuncia asertivo · `enabled: false` no hace
nada · se poda un id cuando `treasureMap` lo pierde · `undoClear` restituye · `shareItems` sale
en el orden de toque.

**Mutación:** `exit` que no limpia.

---

### Task 3: Passthrough en PieceCard

**Files:** editar `src/design-system/components/PieceCard/PieceCard.tsx`.

`role?: 'article' | 'checkbox'` y `ariaChecked?: boolean` opcionales sobre la raíz. Sin prop, el
comportamiento es idéntico al de hoy. Se afirma desde el test de GridCard (Tarea 4), no con un
test propio: el valor está en el uso, no en la firma.

---

### Task 4: La tarjeta

**Files:** crear `src/components/treasure/GridCard.selection.test.tsx`; editar `GridCard.tsx`.

Mocks copiados de `GridCard.agregar.test.tsx:31-77`.

**Casos:** en modo, el click llama `onToggleSelect` y **no** `onItemClick` ·
`getByRole('checkbox', { checked: true })` cuando `isSelected` · fuera del modo no existe rol
`checkbox` · el aria dice «Seleccionar Aura» / «Quitar Aura».

Luego: props `selectionMode`/`isSelected`/`onToggleSelect`, la rama del click, el overlay de
verificación arriba a la izquierda, y **`selectionMode` + `isSelected` en el comparador del memo**.

**Mutación:** quitar las dos líneas del comparador → la casilla se congela y el test de
alternancia se cae.

---

### Task 5: Plomería de la grilla

**Files:** editar `src/components/treasure/VirtualGrid.tsx` y `VirtualGrid.test.tsx`.

Props `selectedIds`, `selectionMode`, `bottomInset`. `selectedIdsSet` en `cellProps` (mismo
patrón que `comparisonIdsSet`), las tres en el array de dependencias, `CellRenderer` las pasa a
`renderCard`, y la fila espaciadora suma `bottomInset`.

**Casos:** la celda recibe `isSelected` · la fila espaciadora crece con `bottomInset`.

**Mutación:** dejar `bottomInset` fuera del `rowHeightFor`.

---

### Task 6: La barra

**Files:** crear `VitrinaSelectionBar.tsx` y `VitrinaSelectionBar.test.tsx`; editar el barrel
`src/components/treasure/browser/index.ts`.

**Casos:** `aria-hidden` cuando `visible=false` · singular vs plural · «Compartir» deshabilitado
en 0 · en el tope el texto es «50 / 50 piezas» · la región lleva su `aria-label`.

**Mutación:** invertir la condición de `aria-hidden`.

---

### Task 7: Los interruptores

**Files:** editar `DesktopFilterToolbar.tsx` (antes del grupo de vista) y `MobileSearchBar.tsx`
(botón de 38px con `hitSlop`, icono `CheckSquare`, antes de Filtros); tests de ambos.

**Casos:** con la prop presente aparece el botón con su `aria-pressed` · sin la prop **no existe**
(la compuerta de permiso vive arriba, así que la ausencia es la prueba de que el modo proveedor y
el invitado no lo ven).

**Mutación:** renderizar el botón incondicionalmente.

---

### Task 8: Cableado del controller

**Files:** editar `src/hooks/useTreasureBrowserController.tsx`.

`canSelect = useCanShareVitrina() && !isProviderMode`; montar `useVitrinaSelection`; pasar
`selectionMode`/`isSelected`/`onToggleSelect` en `renderCard` **y sumarlos a su array de
dependencias**; efecto que sale del modo al pasar a vista lista.

---

### Task 9: Montaje en TreasureBrowser

**Files:** editar `src/components/treasure/TreasureBrowser.tsx` y `ScrollToTop.tsx`.

Props a los dos interruptores; `selectedIds`/`selectionMode`/`bottomInset` a `VirtualGrid`; la
barra; `VitrinaShareDialog` con `useCurrentAsesor()`; `ComparisonBar` bajo
`!providerMode && !selectionMode`; `ScrollToTop` con `hidden` mientras dure el modo.

---

### Task 10: Teclado, gesto de atrás, foco, anuncios

**Files:** `useVitrinaSelection.ts` + su test.

`keydown` de `Escape` en `document`; `pushState`/`popstate` con el patrón del lightbox (entrar
empuja una entrada, atrás la consume y sólo cierra el modo, salir por otra vía la desenrolla);
el foco vuelve al interruptor al salir y a «Compartir» al cerrar el diálogo.

**Mutación:** no desenrollar la entrada de historia al salir → la prueba de que atrás no
acumula pasos muertos se cae.

---

### Task 11: Snackbars de limpiar y de tope

**Files:** `useVitrinaSelection.ts` + su test.

`notify('Selección limpiada', 'info', { action: { label: 'Deshacer', onClick: undoClear }, durationMs: 6000 })`
y `notify('Máximo 50 piezas por enlace', 'warning')`.

> El `mb` del snackbar global vive en `NotificationContext.tsx:156`, **fuera de la cerca**. El
> solape de 4-6 s con la barra queda anotado en el spec §10 y se entrega como «siguiente».

---

### Task 12: Playwright

**Files:** editar `e2e/mobile-layout.spec.ts`.

Sumar «Seleccionar varias piezas» a la lista `labels` del test de 44px. Test nuevo con
`primeAdminSession` + `seedCatalog`: presionar el interruptor, tocar dos tarjetas
`role=checkbox`, esperar «2 piezas seleccionadas», comprobar que la URL sigue en `/treasure`, y
que el gesto de atrás sale del modo sin salir de la página.

---

### Task 13: Cierre

`npm run lint` · `npm run test:unit` (contando antes y después) · el spec de Playwright ·
pasada manual a 390px y ≥1180px en claro y oscuro con control negativo en el enlace acuñado ·
push de la rama y PR contra `main`. **Sin merge y sin despliegue**: el push a `main` es
producción en Vercel, y esa es una decisión de Kevin.
