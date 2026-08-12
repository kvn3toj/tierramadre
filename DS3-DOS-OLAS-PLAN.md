# DS v3 — Plan de dos olas de pulido

**Antes de implementar.** 2026-07-17 · Complementa `DESIGN-SYSTEM-V3.md` + su adenda.

Este plan ordena *todo* el trabajo de mejora en **dos olas**, por área. La Ola 1 hace la app **correcta, coherente y contenida** (mata el estiramiento, los vacíos y el color genérico). La Ola 2 la hace **inconfundiblemente Tierra Madre** (firma, densidad, deleite). Nada aquí está implementado todavía — es el mapa que apruebas antes de tocar el repo.

> **Regla de oro que atraviesa ambas olas:** un solo DS3, los mismos componentes en todas las pantallas, tema como data, cero hardcode. Y el hallazgo de tus capturas de escritorio: **la app es un layout de teléfono estirado** — la Ola 1 le da un sistema de layout real.

---

## 0. El problema raíz (lo que muestran tus capturas)

Una sola causa explica casi todo lo feo: **no hay sistema de layout de escritorio.** De ahí salen tres síntomas:

- **Estiramiento** — la barra inferior y los sheets se van de borde a borde.
- **Islas + vacíos** — el contenido colapsa en una columna angosta (Mi Perfil, Analytics) o se agolpa arriba dejando vacíos verticales (Captura de lote).
- **Ruido de color** — tarjetas de dashboard con rellenos verde/naranja/rojo y una línea morada ajena a la marca.

La **Ola 1** resuelve las tres. Todo lo demás es refinamiento.

---

## Ola 1 — «Cimientos» · correcto, coherente, contenido

Objetivo: cualquier pantalla, en cualquier ancho, se ve intencional. Un solo idioma, cero jank, huesos correctos.

### 1.1 Sistema de layout (lo primero — desbloquea todo)
- **`--maxw` de contenido** (1120–1180px) centrado en todas las rutas; nada de contenido a borde completo salvo héroes de imagen.
- **Tiers de densidad**: `comfortable` (storefront), `dense` (admin/Foto). Definen padding de fila, alto de card y escala de texto.
- **Estrategia de columnas**: 1 columna en móvil; en escritorio, riel derecho para resumen/meta cuando el contenido principal lo justifique — nunca una columna vacía. Los ítems/tablas llenan la columna principal (arregla el vacío de Captura de lote).
- **Ritmo vertical**: escala de espaciado 4/8pt aplicada como secciones; sin vacíos > 1 sección; si una columna queda corta, se colapsa el grid, no se deja el hueco.
- **Barra contenida** (`TabBar`, ya construida) en todas las familias; **sheets contenidos/centrados como modal en escritorio** (máx ~480px), bottom-sheet solo en móvil.

### 1.2 Color y superficie
- Retirar v1: platas, degradados en botones, glass-cards de contenido, `#00AE7A` como texto.
- **Matar las tarjetas de color**: stats a borders-first (número mono + un acento esmeralda para la métrica clave); estado por punto+etiqueta, no por relleno.
- **Cero morado / naranjas neón**: semánticos desaturados (danger/warning terrosos); `success` = la esmeralda.
- Headers de perfil planos (fuera el degradado verde).

### 1.3 Componentes (converger, no crear)
Unificar a canónico y themeable: `Button` · `Card` · `Sheet` · `TextField/Field` · `SegmentedControl` (Piedras/Gemas/Lotes/Joyas, Contado…, tabs de Analytics) · `Badge/StatusBadge` · `RouteMenu` · `EmptyState` · `ErrorState` · `Skeleton`. Borrar los huérfanos (3 botones, 4 cards, 2 barras, 5 sheets).

### 1.4 Navegación y comportamiento
- `TabBar` contenida unificada (storefront 4 slots + Menú · Foto 5 · provider).
- `PageConfig` para **toda** ruta (sin pantallas anónimas); back sagrado (vuelve a donde estabas, con scroll); un solo top-chrome por familia.
- **Leyes de scroll**: un scroller por vista; nested contenidos; **arreglar `VirtualGrid` con alto medido** (mata `HEADER_OFFSET=280`/`minHeight:600` → la grilla termina justo sobre la barra); restauración de scroll; sheets en `dvh`.

### 1.5 Filtros (Ola 1)
- Chips de filtro 44px en scroll horizontal contenido con **fade en ambos extremos**; chip activo esmeralda-tinte.
- **FilterSheet canónico** (86dvh, safe-area, contenido, contenido interno scrolleable); en escritorio, modal centrado.
- Footer con **Limpiar** + **Ver N resultados** (conteo en vivo); contador de filtros activos en el chip «Filtros».

### 1.6 Catálogo (Ola 1)
- **PieceCard canónica**: pozo (esquina cortada) + nombre serif + spec/precio mono + `Nº` índice; gaps asimétricos tokenizados (18/12 móvil · 30/24 ancho).
- **Skeleton que calca la geometría** de la card (anti-parpadeo, CLS≈0); estados **empty** («Aún no hay…» → una línea serif + una acción) y **error** (causa + reintentar) diseñados.
- En escritorio la grilla **usa el ancho** (3–4 columnas), no un carrusel angosto.

### 1.7 Animación y a11y (Ola 1)
- Un sistema de motion (tween `--tm-ease`, 160/240/420); `prefers-reduced-motion` como puerta dura; leyes anti-parpadeo (caché síncrono, `aspect-ratio`, keys únicas, precarga, swap instantáneo, `#t=0.001`).
- Piso WCAG AA: contraste (ya verificado), focus ring visible, targets ≥44px, `aria-label` en icon-buttons, labels en campos.

**Salida de la Ola 1:** la app se ve de una sola pieza, contenida, calma y correcta en móvil y escritorio. Sin estiramiento, sin vacíos, sin color genérico.

---

## Ola 2 — «Orfebrería» · inconfundiblemente Tierra Madre

Objetivo: la firma y los refinamientos que hacen que se sienta autoral, premium y vivo. Solo se entra aquí con la Ola 1 estable.

### 2.1 Firma y diseño
- **«El bisel»** — corte esmeralda (octágono) en: indicador de tab activo, pozos de imagen, ticks/dots de confianza, CTAs de marca, notch de la cejilla de sección.
- **Vitrina numerada** (`Nº 001`), **Ledger** gemológico (mono tabular con reglas), cejilla-sobre-la-regla, serif como única voz de display, origen como textura (no color).

### 2.2 Componentes (refinar)
- Estados ricos: hover con faceta, press, selected con señal no-color; `Ledger` component; `Lightbox/Gallery` con precarga anti-parpadeo; `MetricCard` pulida; **Charts en monocromo esmeralda** alineados a `dataviz` (adiós morado para siempre).
- `SegmentedControl` con indicador deslizante; `Popover`/`Select`/`DatePicker` custom finos.

### 2.3 Navegación y comportamiento (Ola 2)
- Escritorio: **breadcrumbs + top-nav** proyectados desde la misma IA en pantallas admin de 2+ niveles; aterrizajes seguros de deep-link; memoria de scroll fina; chrome consciente del riel Copiloto.

### 2.4 Filtros (Ola 2)
- **Presets rápidos** («Muzo», «Vivid», «< $5k»); sort como segmented; **range slider con lectura mono tabular** en vivo; conteo de resultados en vivo; **vistas guardadas**.

### 2.5 Catálogo (Ola 2)
- **Revelado escalonado** al hacer scroll (transform/opacity, off con reduced-motion); LQIP progresivo; **hover-peek** en escritorio; tira de «vistos recientemente»; cards de grupo/lote.
- **Transición de elemento compartido** catálogo → producto (el pozo de imagen se transforma), respetando anti-parpadeo.

### 2.6 Animación y performance (Ola 2)
- Microinteracciones: deslizamiento del bisel del tab, selección de chip, sheet, press de CTA, **count-up en precios**; coreografía de toasts.
- Virtualización > 50 ítems; listeners pasivos; disciplina de `will-change`; 60fps en scroll.

**Salida de la Ola 2:** la app es inconfundible. Si otra IA, con el mismo brief, produjera algo parecido, fallamos — y aquí no se parece a nada más.

---

## Secuencia sugerida

1. **Ola 1 · layout + barra + scroll** (mayor dolor visible): `--maxw`/tiers, `TabBar` en el shell (borrar las dos barras), sheets-modal en escritorio, `VirtualGrid` medido. → arregla las 6 capturas.
2. **Ola 1 · color + componentes core**: matar tarjetas de color; converger `Button/Card/Sheet/Field/Segmented/Badge`; empty/error/skeleton.
3. **Ola 1 · filtros + catálogo + a11y**.
4. **Ola 2 · firma + charts monocromo + refinamientos**.
5. **Ola 2 · deleite + performance**; retirar `legacy-compat`; lint a error por directorio.

Cada paso: construir canónico → re-exportar viejo → migrar imports → borrar viejo. Sin huérfanos, sin hardcode.

---

## Nota sobre la barra
La pestaña **Cuentas** vive **dentro del Menú** (no en la barra) — barra storefront = `Inicio · Tesoros · Embajadores · Menú`. Fotosíntesis conserva 5 (`Inicio · Lotes · Ventas · Directorio · Menú`). Promover Cuentas a pestaña es una línea en `tabBarConfig.ts` si el uso lo pide.

*Aprueba estas dos olas y empezamos por el paso 1 — el que arregla lo que viste.*
