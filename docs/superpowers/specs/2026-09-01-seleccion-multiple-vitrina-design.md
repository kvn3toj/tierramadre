# Selección múltiple en el catálogo para compartir una vitrina (diseño)

**Fecha:** 2026-09-01
**Estado:** diseño ratificado — listo para ejecutar
**Iniciativa:** TM-VITRINA-MULTISEL (Constructor)
**Superficie:** `/treasure` — el Treasure Browser autenticado
**Autor:** `aria` (Performer). Decisiones de producto tomadas con Kevin el 2026-09-01.
**Plan de ejecución:** `docs/superpowers/plans/2026-09-01-seleccion-multiple-vitrina.md`

---

## 0 · El minuto que cuesta hoy

Un asesor que quiere mandarle a un cliente una vitrina de varias piedras hace hoy esto:

1. abre la ficha de la pieza,
2. presiona «Agregar a selección»,
3. vuelve atrás,
4. abre la siguiente,
5. repite,
6. **sale del catálogo** hacia `/cart`,
7. y ahí presiona «Compartir con cliente (sin app)».

Palabras de Kevin: _«too not intuitive and consumes time of attention»_. Y hay un problema
estructural debajo del de fricción: **el carrito es también el contenedor de compra**, así que
curar para un cliente y comprar comparten un mismo balde. Cada minuto de más acá es un cliente
esperando en WhatsApp.

Lo que se pide es el gesto de la app de Fotos: presionar «Seleccionar», tocar tarjetas,
presionar «Compartir», obtener el enlace. Sin salir del catálogo.

---

## 1 · Decisiones ratificadas (2026-09-01, con Kevin)

Estas tres no se re-litigan:

| Decisión       | Qué se decidió                                                              | Por qué                                                                                                                           |
| -------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Superficie** | `/treasure`, el catálogo autenticado — no el carrito, no una pantalla nueva | Es donde el asesor ya está mirando piedras. Mover la curaduría a otra pantalla reproduce el viaje que estamos borrando.           |
| **Acuñado**    | El `VitrinaShareDialog` que ya existe, tal cual                             | Ya resuelve token, moneda, multiplicador, slug del remitente y edición posterior del enlace. Es función pura de `items`.          |
| **Entrada**    | Un interruptor explícito «Seleccionar» — no casillas siempre visibles       | Las casillas permanentes le cobran ruido visual a los 9 de cada 10 recorridos que sólo miran. La vitrina es lo contrario a ruido. |

---

## 2 · La cerca de alcance

**Diferido a una tajada posterior, registrado acá para que nadie lo redescubra como olvido:**

- **«Seleccionar todo (N)»** para conjuntos filtrados ≤ 50. Útil, pero necesita su propia
  conversación sobre qué significa «todo» cuando hay paginación y un filtro de origen encima.
- **Pulsación larga para entrar al modo** (500 ms de `pointerdown`, cancelada al mover > 10px).
- **Selección por arrastre.** Choca con el scroller de `react-window` y con la regla de
  `touch-action` de DS3 §5.4.8.

**Fuera de alcance por diseño (no diferido — no va):**

- Tocar `convex/` o `api/`. El endpoint `/api/vitrina` ya acepta hasta 50 ids
  (`api/vitrina.ts:282`); no hace falta nada del lado del servidor.
- Tocar `VitrinaShareDialog.tsx`. Se monta como está.
- Tocar `useComparison` / `ComparisonBar`. Ver §5.

---

## 3 · Estado

### 3.1 Helpers puros — `src/utils/vitrinaSelection.ts`

Sin React, sin Convex, con su propio test. Mismo molde que
`src/pages/admin/Fotosintesis/utils/saleItemSelection.ts`.

```
VITRINA_MAX_ITEMS = 50
toggleId(ids, id, max) → { ids, rejected }   // ordenado; rejected=true si el tope bloqueó
pruneIds(ids, has)                            // conserva sólo los que siguen existiendo
toShareItems(ids, byId) → ShareItem[]         // { item, precioCOP, nombre }
selectionLabel(n)                             // "1 pieza seleccionada" / "n piezas seleccionadas"
```

El tope de 50 no es estético: es el límite que **el servidor ya impone**. Rechazar en el cliente
con un mensaje es lo que evita que el asesor arme 60 piezas y descubra el techo recién al
presionar Compartir.

### 3.2 El hook — `src/hooks/useVitrinaSelection.ts`

`({ treasureMap, enabled })` →
`{ selectionMode, enter, exit, toggle, clear, undoClear, ids, idsSet, count, atCap, shareItems, shareOpen, openShare, closeShare }`

Tres decisiones de forma:

- **`number[]` ordenado, `Set` derivado.** El orden es el orden en que el asesor tocó las
  piezas, y es el orden en que el cliente las va a ver. Un `Set` solo lo perdería.
- **Los `ShareItem` se derivan de `treasureMap`, no se guardan.** Guardar el objeto congela el
  precio del momento del toque; derivarlo del mapa hace que un cambio de precio llegue al enlace.
- **Local al controller, NO un contexto y NO una extensión de `useComparison`.** La comparación
  es cross-route por diseño, tiene tope 4, y generalizarla obligaría a tocar a todos sus
  consumidores para un beneficio que no existe: la selección de vitrina muere al salir de
  `/treasure`.

---

## 4 · Ciclo de vida

- **Entrar.** Interruptor «Seleccionar» en la barra de herramientas (`aria-pressed`), visible
  sólo si `useCanShareVitrina() && !providerMode`. **Sólo en vista cuadrícula**; pasar a lista
  sale del modo.
- **Dentro del modo.** El toque de la tarjeta entera alterna; **nunca navega**. Búsqueda y
  filtros siguen vivos y **la selección se conserva a través de los cambios de filtro** — el
  caso de uso literal es «curo tres de Muzo, luego dos de Chivor». Sólo se poda un id cuando
  desaparece de `treasureMap`.
- **Salir.** Interruptor, «Listo» en la barra, `Escape`, o el gesto de atrás del navegador
  (patrón `pushState`/`popstate` de `ImageLightbox.tsx:244-260`, que existe justamente para que
  atrás no te saque de la página). Salir **limpia** — semántica de Fotos.
- **«Limpiar»** vacía sin salir, y ofrece «Deshacer» por 6 s.
- **Tope.** El toque 51 se rechaza: anuncio asertivo + snackbar, y la barra muestra «50 / 50».
- **Compartir.** «Compartir» (deshabilitado en 0, nunca oculto) abre `VitrinaShareDialog` con
  `items = toShareItems(ids)` y `senderSlug = asesor?.slug`. **Después de acuñar, la selección y
  el modo se conservan**: el asesor típicamente ajusta dos piezas y reenvía, y el flujo de
  editar-enlace-existente del diálogo necesita los mismos items. Al cerrar el diálogo el foco
  vuelve a «Compartir».

---

## 5 · Convivencia con lo que ya está abajo

El borde inferior de `/treasure` ya está poblado: la barra de pestañas global, `ComparisonBar`
y `ScrollToTop`.

- **`ComparisonBar` se oculta mientras dure el modo** (`!providerMode && !selectionMode`). El
  estado de comparación **no se toca**: al salir del modo la barra vuelve con lo que tenía.
  Dos barras inferiores simultáneas violarían la regla de «un cromo inferior» de DS3 §5.2.
- **`ScrollToTop` se oculta mientras dure el modo.** Su `zIndex.float` (1000) está por encima
  del `zIndex.fixed` (900) de la barra, así que quedaría flotando sobre ella.

---

## 6 · La tarjeta en modo selección

- Raíz `role="checkbox"` + `aria-checked` — vía un passthrough nuevo y opcional en `PieceCard`.
  Fuera del modo la tarjeta sigue siendo exactamente lo que era (`role="article"`).
- Círculo de verificación de 24px **arriba a la izquierda** del pozo de la imagen, decorativo
  (`aria-hidden`, `pointer-events: none`). Esa esquina es la única libre: abajo a la derecha
  viven galería y lote, arriba a la derecha el precio especial y la reventa.
- Sin seleccionar: aro de hairline sobre un velo oscuro. Seleccionada: relleno `qe.accent` con
  `Check` blanco, `inset 0 0 0 2px var(--tm-accent)` en el pozo, y `opacity .9` / `scale(.97)`
  **sólo sobre el media**.
- La señal no-cromática la dan el glifo y el borde, no el color (DS3 §6.1, fila `selected`).
- **`selectionMode` e `isSelected` entran al comparador del `React.memo`** de GridCard. Sin eso
  las casillas se congelan: el comparador actual devuelve `true` y React no vuelve a pintar.

---

## 7 · La barra — `src/components/treasure/browser/VitrinaSelectionBar.tsx`

Props `{ visible, count, max, atCap, onShare, onClear, onDone }`.

De izquierda a derecha: el conteo · espacio · «Limpiar» (texto) · «Compartir» (el único botón
relleno de acento de la pantalla) · «Listo». **Sin tira de miniaturas** — la grilla detrás ya
muestra qué está seleccionado, y una tira le robaría al catálogo el alto que vino a usar.

Geometría, copiada del patrón de `BulkActionBar.tsx:62-90` (el patrón, no el archivo — aquel
depende de `FotoTokens`):

- Siempre montada; la visibilidad se alterna con `transform: translateY(100%)` + `opacity`, para
  que la salida se anime en la última deselección.
- `position: fixed`; `bottom: bottomBarClearance(appShell.tabBarReserve)`, con el override de
  escritorio a `env(safe-area-inset-bottom)` sobre `layoutBreakpoints.desktop`.
- `right: var(--copilot-rail-width, 0px)` — consume el riel acoplado del Copilot.
- `zIndex: zIndex.fixed`. Cero literales.
- Transiciones sólo de `transform` y `opacity`, con `--tm-base` / `--tm-fast`, y
  `prefers-reduced-motion` como compuerta dura.
- Todos los blancos ≥ 44px.
- `role="region" aria-label="Piezas seleccionadas para compartir"`.

**Nunca se copia `ComparisonBar.tsx:57`** (`calc(72px + env(...))`): ese literal precede a
`bottomBarClearance` y es exactamente lo que la mixin existe para reemplazar.

---

## 8 · Microcopy (español, tono de la casa, sin signos de admiración)

| Dónde                | Texto                                                                            |
| -------------------- | -------------------------------------------------------------------------------- |
| Interruptor          | «Seleccionar» / «Listo»                                                          |
| aria del interruptor | «Seleccionar varias piezas» / «Salir del modo selección»                         |
| aria de la tarjeta   | «Seleccionar {nombre}» / «Quitar {nombre}»                                       |
| Conteo               | «1 pieza seleccionada» / «{n} piezas seleccionadas»; en el tope «50 / 50 piezas» |
| Anuncio · entrar     | «Modo selección. Toca una pieza para seleccionarla.»                             |
| Anuncio · elegir     | «{nombre} seleccionada. {n} de 50.»                                              |
| Anuncio · quitar     | «{nombre} quitada. {n} de 50.»                                                   |
| Anuncio · tope       | (asertivo) «Ya tienes 50 piezas, el máximo para un enlace.»                      |
| Anuncio · salir      | «Modo selección cerrado.»                                                        |
| Snackbar · limpiar   | «Selección limpiada» + acción «Deshacer» (6 s)                                   |
| Snackbar · tope      | «Máximo 50 piezas por enlace»                                                    |

**El sustantivo desnudo «tu selección» no se usa para el conteo.** La casa ya lo tiene tomado
para el carrito (`ProductDetailPage.tsx:676`, `CartPage.tsx:249`); reusarlo acá haría que dos
baldes distintos se llamaran igual en la misma sesión, que es precisamente la confusión que
esta iniciativa vino a deshacer.

---

## 9 · Lo que se reusa (verificado leyendo cada archivo, 2026-09-01)

| Pieza                    | Dónde                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Diálogo de acuñado       | `src/components/vitrina/VitrinaShareDialog.tsx:161-173` — props `{ open, onClose, items, senderSlug }`          |
| Precedente de montaje    | `src/pages/CartPage.tsx:501-507`, con `useCurrentAsesor()`                                                      |
| Compuerta de permiso     | `src/hooks/usePermissions.ts:138-141` `useCanShareVitrina()`                                                    |
| Tarjeta                  | `src/components/treasure/GridCard.tsx` (click L241, comparador memo L496-526)                                   |
| Raíz de la tarjeta       | `src/design-system/components/PieceCard/PieceCard.tsx:193-209`                                                  |
| Grilla virtual           | `src/components/treasure/VirtualGrid.tsx` — patrón `comparisonIdsSet` en `cellProps`, fila espaciadora L477-483 |
| Controller               | `src/hooks/useTreasureBrowserController.tsx` — `treasureMap` L207-210, `renderCard` L316-345                    |
| Patrón de barra inferior | `src/pages/admin/ProductManagement/BulkActionBar.tsx:62-90`                                                     |
| Molde de helper puro     | `src/pages/admin/Fotosintesis/utils/saleItemSelection.ts` + su test                                             |
| Región viva              | `src/components/shared/LiveRegion.tsx` — `useLiveRegion().announce(msg, politeness)`                            |
| Snackbar con acción      | `src/contexts/NotificationContext.tsx:29-40` — `notify(msg, sev, { action, durationMs })`                       |
| Gesto de atrás           | `src/components/media/ImageLightbox.tsx:244-260`                                                                |
| Idiom del interruptor    | `MobileSearchBar.tsx:331-385` (38px + `hitSlop`), `DesktopFilterToolbar.tsx` (grupo de vista)                   |

---

## 10 · Riesgos medidos (2026-09-01)

- **Apilamiento inferior en teléfonos bajos.** Barra + barra de pestañas + snackbar sobre 667px
  de alto. Se verifica por captura a 390×667, claro y oscuro, con la última fila de la grilla
  visible. La fila espaciadora de `VirtualGrid` (L477-483) crece con `bottomInset` para pagarlo.
- **El snackbar global ancla en `bottom-center` con `mb: env(safe-area-inset-bottom)`**
  (`NotificationContext.tsx:156`) y su `zIndex` de MUI (1400) queda por encima de la barra. Los
  4-6 s que dura tapará parcialmente la barra. `NotificationContext` está **fuera de la cerca**
  de esta tajada; queda anotado para la siguiente.
- **Colisión de sustantivo con el carrito.** Mitigada por §8, no eliminada: «Compartir» acá y
  «Agregar a selección» allá siguen viviendo en la misma app.
