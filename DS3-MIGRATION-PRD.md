# PRD — Migración a Design System v3 «Quiet Emerald»

**Producto:** Tierra Madre Studio (tierramadre.app) · React 18 + MUI v6 + Vite
**Autor:** Diseño/ARIA · **Fecha:** 2026-07-17 · **Estado:** Listo para revisión de ingeniería
**Docs base:** `DESIGN-SYSTEM-V3.md` · `DESIGN-SYSTEM-V3-ADDENDUM.md` · `DS3-DOS-OLAS-PLAN.md` · `FOTOSINTESIS-SIMPLICIDAD-ADMIN.md` · previews en `docs/*.html`

---

## 1. Problem statement

La app arrastra **cinco lenguajes visuales** (Emerald iOS v1, Quiet Emerald v2, Atelier, Foto, Vault Cinema), **~1.022 valores hardcodeados** y **componentes huérfanos duplicados** (3 botones, 4 tarjetas, 2 barras inferiores, 5 sheets). El síntoma que ven los usuarios: en escritorio la app es un *layout de teléfono estirado* — barras que se estiran de borde a borde, contenido en islas angostas con vacíos verticales, y tableros con relleno de color genérico (incluida una línea morada fuera de marca). El costo de no resolverlo: cada pantalla nueva multiplica la inconsistencia y el mantenimiento, la marca se diluye, y los admins pierden tiempo en flujos de captura/edición poco intuitivos.

**Quién lo sufre:** asesores y clientes (storefront, sobre todo móvil), el equipo de back-office (Fotosíntesis/Atelier, sobre todo escritorio), y el equipo de desarrollo (deuda de mantenimiento).

---

## 2. Goals

1. **Un solo sistema.** Reducir de 5 lenguajes visuales a **1 DS3** con tema-como-data; 0 componentes huérfanos al cierre. *(medible: recuento de implementaciones de Button/Card/Sheet/TabBar/Field = 1 cada uno)*
2. **Cero hardcode en features.** Bajar los ~1.022 literales a **0** en `pages/**` y feature `components/**`. *(medible: conteo de lint = 0 en directorios migrados)*
3. **Escritorio intencional.** Eliminar estiramiento, islas y vacíos: **100%** de las rutas usan contenedor `--maxw` + barra contenida. *(medible: auditoría de las 6 pantallas reportadas + muestreo)*
4. **Calma sin jank.** CLS ≈ 0 en catálogo y capturas; sin parpadeo de imágenes; `prefers-reduced-motion` respetado en toda la app.
5. **Admin más simple.** Reducir el tiempo/pasos para registrar un lote y una venta con el patrón de 5 movimientos (objeto-héroe · data editable · un toque para lo difícil · primaria por estado · denso+contenido).

---

## 3. Non-goals

1. **No rediseñar la información/IA de negocio** — mismos flujos y datos; cambia la forma, no el qué. *(fuera de alcance: repensar preponderancia, roles, o el modelo de inventario.)*
2. **No tocar Vault Cinema / Esmereogénesis como excepción cinematográfica** — consume DS3 donde puede, pero conserva su libertad de romper reglas. *(scope aislado, bajo riesgo, alto costo de tocar.)*
3. **No migrar documentos/PDF/certificados** a la tipografía de producto — mantienen su set serif de documento. *(distinto medio.)*
4. **No i18n/nuevos idiomas** en esta migración — es visual/estructural. *(iniciativa aparte.)*
5. **No backend/API changes** — puramente frontend/DS. *(si un flujo admin necesita un endpoint, se levanta como dependencia, no como parte del spec.)*

---

## 4. User stories

**Cliente / Asesor (storefront)**
- Como **asesor en el teléfono frente a un cliente**, quiero una navegación inferior que no se estire ni deforme en cualquier pantalla, para verme profesional y encontrar rápido.
- Como **cliente que abre un link de pieza (`/p/:id`)**, quiero que la pantalla cargue con su chrome y su “volver” correctos, para no quedar perdido.
- Como **asesor navegando el catálogo**, quiero filtrar por origen/color/peso/precio con chips y un panel claro que muestre cuántos resultados quedan, para acotar sin fricción.
- Como **usuario que vuelve de una pieza al catálogo**, quiero aterrizar en la misma fila donde estaba, sin recarga ni parpadeo.

**Admin / Back-office (Fotosíntesis · Atelier)**
- Como **admin capturando un lote**, quiero repartir la preponderancia de un toque y editar % y precio en línea, para cerrar el lote sin pelear con números abstractos.
- Como **admin registrando una venta**, quiero agregar piezas escaneando el QR y ver el total en vivo, con “Registrar venta” que se ilumina al estar completa.
- Como **admin en el inventario (519 piezas)**, quiero seleccionar una piedra y editar su estado/precio ahí mismo en la bandeja, sin navegar a otra pantalla.
- Como **admin en escritorio**, quiero que el contenido use el ancho con densidad (no islas ni vacíos), con estado por punto **y** etiqueta (no solo color).

**Equipo (dev/diseño)**
- Como **desarrollador**, quiero un solo `@/design-system` de donde salga todo, para no elegir entre 3 botones ni copiar estilos.
- Como **desarrollador**, quiero que el lint bloquee hex/px/z hardcodeados y re-implementaciones, para que “un solo sistema” siga siendo uno.
- Como **diseñador**, quiero cambiar el corte estructural o un token de tema en un lugar y verlo en toda la app.

---

## 5. Requirements & fases

Cada fase es entregable e independiente; el orden minimiza riesgo y maximiza impacto visible. Acceptance criteria como checklist verificable.

### Fase 0 — Fundaciones (aditivo, sin regresión) · **P0** · *hecho/en curso*
Tokens `css-variables-v3.css` + `v3.ts`, `TabBar.tsx` + `tabBarConfig.ts`, spec adoptada.
- [x] `--tm-*` y `ds3` exportados desde el barrel; contraste AA verificado.
- [x] `TabBar` type-checked (`tsc --strict` limpio).
- [ ] Barrel re-exporta `TabBar` y `ds3` (una línea) sin romper build.

### Fase 1 — Ola 1a · Shell, navegación y scroll · **P0** *(primer paso acordado)*
El arreglo de mayor dolor visible.
- [ ] `AppShell` renderiza **un** `<TabBar>` por familia de ruta (storefront 4 slots + Menú · Foto 5 · provider); `IOSTabBar` y `FotoTabBar` **borrados**.
  - *Given* cualquier ancho de pantalla, *when* se muestra la barra, *then* la píldora se topa en `maxWidth` y se centra (nunca borde a borde) y exactamente un slot está encendido.
- [ ] Contenedor de layout `--maxw` (1120–1180px) centrado aplicado a todas las rutas; héroes de imagen exceptuados.
- [ ] Sheets se presentan como **modal centrado en escritorio** (≤480px) y bottom-sheet en móvil.
- [ ] **`VirtualGrid` con alto medido**: se elimina `HEADER_OFFSET=280` y `minHeight:600`; la grilla termina justo sobre la barra (un scroller efectivo).
  - *Given* iPhone SE y Pro Max, *when* se scrollea el catálogo, *then* no hay doble scrollbar ni fila oculta tras la barra.
- [ ] Restauración de scroll al volver; `scroll-behavior: smooth` solo en `html` con reduced-motion.
- [ ] Cuentas movido al Menú (barra storefront = Inicio · Tesoros · Embajadores · Menú).

### Fase 2 — Ola 1b · Color y componentes core · **P0**
- [ ] **Matar tarjetas de color**: stats a borders-first (número mono + un acento esmeralda), estado por punto+etiqueta. Cero morado/naranja neón; semánticos desaturados AA (`--tm-warn #8A5F1B`, danger `#B3403A`).
- [ ] Converger a canónico y themeable, borrando huérfanos (ver §6): **`Button` · `Card` · `Sheet` · `TextField/Field` · `SegmentedControl` · `Badge/StatusBadge`**.
  - *Given* un componente canónico, *when* una feature lo usa, *then* recibe tokens del scope activo (QE/Foto/Atelier) sin fork.
- [ ] Construir gaps que el resto necesita: **`EmptyState` · `ErrorState` · `Skeleton`** (calca geometría, CLS≈0).
- [ ] Retirar v1: platas, degradados en botones, glass-cards de contenido, `#00AE7A` como texto, springs en UI de producto.

### Fase 3 — Ola 1c · Filtros, catálogo y a11y · **P0/P1**
- [ ] **P0** Chips de filtro 44px, scroll horizontal contenido con fade; `FilterSheet` canónico (86dvh, safe-area, contenido) → modal en escritorio; footer Limpiar + “Ver N resultados” con conteo en vivo + contador de filtros activos.
- [ ] **P0** `PieceCard` canónica (pozo con corte + nombre serif + spec/precio mono + `Nº`); gaps asimétricos tokenizados; grilla usa el ancho en escritorio (3–4 col).
- [ ] **P0** Estados de datos (loading/empty/error/content) en toda vista async; leyes anti-parpadeo aplicadas.
- [ ] **P0** Piso WCAG AA: contraste, focus ring visible, targets ≥44px, `aria-label` en icon-buttons, labels en campos, alt significativo en fotos de piezas.

### Fase 4 — Ola 1d · Track de simplicidad admin · **P0** *(Fotosíntesis)*
Aplica el patrón de 5 movimientos (ver `FOTOSINTESIS-SIMPLICIDAD-ADMIN.md`), en orden:
- [ ] **Captura de lote**: ítems como héroe, % y precio editables en línea con steppers, barra de reparto viva + “Repartir equitativo/por costo”, “Cerrar lote” se ilumina al 100%. *(mockup: `docs/fotosintesis-captura-v2.html`)*
- [ ] **Nueva venta**: comprador → piezas (scan/⌘K) → total en vivo, descuento inline, “Registrar venta” por estado. *(mockup: `docs/fotosintesis-nueva-venta-v2.html`)*
- [ ] **Inventario**: filas densas (no tarjetas), estado punto+etiqueta, filtros segmentados, **bandeja como editor en línea**. *(mockup: `docs/fotosintesis-inventario-v2.html`)*
- [ ] **Nueva piedra / resto** (listas, Directorio, Movimientos, Escanear, Certificados) siguen el mapa del playbook.
  - *Given* un admin en cualquier captura, *then* el objeto de la tarea es lo primero y más grande, la data se ve editable, y hay una primaria por estado con checklist de una línea.

### Fase 5 — Ola 2 · Orfebrería (firma y deleite) · **P1**
- [ ] **Cut token**: `--tm-cut-structural` + prop `cut` en `TabBar`/`Button`/`Well` (esmeralda default; baguette/canutillo/cojín/redondo intercambiables). *(playground: `docs/tierra-madre-ds3-cortes.html`)*
- [ ] Firma «el bisel» (corte esmeralda completo) en indicador de nav, pozos, ticks, CTA de marca; vocabulario de joya para acentos (un corte exótico por pantalla).
- [ ] **Charts en monocromo esmeralda** alineados a `dataviz` (elimina el morado); `Ledger` component; `Lightbox` con precarga.
- [ ] Microinteracciones (deslizamiento del bisel, chip select, count-up de precios), transición de elemento compartido catálogo→producto, coreografía de toasts — todas con reduced-motion off.

### Fase 6 — Retiro y candado · **P0 de cierre**
- [ ] `legacy-compat.ts` sin consumidores; tokens v1 borrados; `DESIGN-SYSTEM.md` archivado.
- [ ] Lint a **error** por directorio migrado (ver §7).

---

## 6. Mapa de consolidación (huérfano → canónico)

| Canónico | Absorbe (borrar tras migrar) |
|---|---|
| `Button` | `ios/core/IOSButton`, `design-system/components/Button`, botones atelier/foto inline, `disabledButton` |
| `Card` | `ios/core/IOSCard`, `shared/GlassCard`, `design-system/components/Card`, cards foto/atelier inline |
| `TabBar` | `ios/IOSTabBar`, `Fotosintesis/components/FotoTabBar` |
| `Sheet` | `BottomSheetShell`, `IOSMoreSheet`, `IOSSettingsSheet`, `IOSFilterSheet`, sheets esmereo |
| `TextField/Field` | `IOSTextField` + ~40 estilos inline de MUI TextField |
| `SegmentedControl` | Piedras/Gemas/Lotes/Joyas, Contado…, tabs de Analytics, tabs de origen, redesign toggle |
| `Badge` | renderers de tiers de calidad/precio/estado dispersos |
| `RouteMenu` | `IOSMoreSheet` + `FotoRouteMenu` (registro `userNavMap` + `adminNavMap`) |
| `Toast` | estilos inline de `NotificationContext` |
| tokens | ~478 color + ~411 spacing + ~83 z-index + ~50 shadow literales → `--tm-*` / `ds3` |

Orden de ataque = peores ofensores del audit primero (`templates/*`, `AsesorCard`, `FilterContent`, `feedback/*`). Cada migración: construir canónico → re-exportar viejo → migrar imports → borrar viejo.

---

## 7. Enforcement (para que “uno” siga siendo uno)

- **Una superficie de import**: todo desde `@/design-system`; lint bloquea internos y `tokens/legacy-compat` en `pages/**` y feature `components/**`.
- **Cero hardcode**: bloquear hex, `rgba(`, px fuera de escala, `zIndex:` entero, `boxShadow` inline, `100vh`/`calc(100vh`, `overflow:'auto'` desnudo en feature code (warning durante migración → error por directorio migrado).
- **Sin re-implementación**: un PR que agregue button/card/sheet/tab `styled` fuera de `src/design-system/` falla review.
- **Tema como prop, nunca fork**; **valor usado 3× = token; patrón usado 2× = componente**; nueva entrada canónica → fila en el catálogo del addendum antes de shippear.

---

## 8. Success metrics

**Leading (días–semanas)**
- Huérfanos: implementaciones de Button/Card/Sheet/TabBar/Field = **1 cada uno** (hoy 3/4/5/2/2+).
- Lint hardcode en directorios migrados = **0** (baseline ~1.022 global).
- Rutas con `--maxw` + barra contenida = **100%**.
- CLS catálogo/capturas ≈ **0**; 0 reportes de parpadeo.
- Admin: pasos para cerrar un lote y registrar una venta ↓ (medir con test de tarea moderado, 5 admins) — objetivo **−40%** de pasos/tiempo.

**Lagging (semanas–meses)**
- ↓ tickets/quejas de UX visual (barra estirada, tableros, vacíos).
- ↑ velocidad de features nuevas (tiempo a UI consistente) — cualitativo con el equipo.
- ↓ deuda: `legacy-compat` a 0 consumidores.

**Método:** conteos por script/grep + lint CI; auditoría de las 6 pantallas reportadas; test de tarea admin antes/después.

---

## 9. Risks & mitigaciones

| Riesgo | Sev | Mitigación |
|---|---|---|
| Migración grande estanca features | 🔴 | Fases entregables; canónico + re-export permite migrar incremental sin “big bang”. |
| Borrar `IOSTabBar/FotoTabBar` rompe rutas | 🟡 | Fase 1 aislada, tras `PageConfig` completo; QA en iPhone SE + Pro Max + desktop. |
| `VirtualGrid` medido altera layout | 🟡 | Cambia layout — requiere prueba en dispositivo (iPhone SE + Pro Max) antes de merge. |
| Regresión de tema en scopes Foto/Atelier | 🟡 | Theme-as-data ya probado en `TabBar`; snapshot visual por scope. |
| Lint a error frena PRs no migrados | 🟢 | Warning global, error solo por directorio ya migrado. |
| Cinematics (Bóveda) chocan con reglas | 🟢 | Excepción explícita documentada; no se migra su libertad. |

---

## 10. Open questions

- **[Diseño/Producto]** ¿Cuentas se queda en el Menú o vuelve a pestaña? *(default: Menú; 1 línea si cambia.)* — no bloqueante.
- **[Diseño]** ¿El corte estructural global es esmeralda fijo, o exponemos el `cut` token para variar por scope? — no bloqueante (Fase 5).
- **[Ingeniería]** ¿ESLint plugin a medida o script de grep en CI para el candado anti-hardcode? — resolver antes de Fase 6.
- **[Ingeniería]** ¿El registro `userNavMap` para `RouteMenu` existe o hay que crearlo? — resolver antes de Fase 2.
- **[Producto/Data]** ¿Hay analítica para medir pasos/tiempo de captura admin, o se hace test moderado? — resolver antes de medir Fase 4.

---

## 11. Timeline / phasing

Sin deadline contractual. Secuencia recomendada = orden de fases (1→6). **Fase 1 primero** (barra + `--maxw` + VirtualGrid) porque arregla las 6 capturas reportadas con el menor riesgo. Fases 2–4 son el grueso de Ola 1 (converger + admin). Fase 5 (Ola 2) solo con Ola 1 estable. Fase 6 cierra el candado. Cada fase mergeable de forma independiente.

---

*Aprobar §2 Goals + §3 Non-goals + §5 Fase 1 para arrancar. El resto se refina en ejecución.*
