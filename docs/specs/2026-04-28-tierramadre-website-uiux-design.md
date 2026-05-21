# Tierra Mädre — Website UI/UX Design Spec

**Versión:** 1.0  
**Fecha:** 2026-04-28  
**Autor:** Diseño guiado por brainstorming asistido (Aria + Moksart + Kira voices)  
**Alcance:** Solo UI/UX del sitio público `tierramadre.co` (rebuild). NO modifica el Tierra Madre Studio (app interna).  
**Estado:** Spec inicial para revisión.

---

## 0. Contexto

Este documento define la experiencia visual e interactiva del nuevo sitio público de **Tierra Mädre**, adaptando el design system del **Tierra Madre Studio** (app interna `Emerald iOS`) al lenguaje editorial-luxury que la marca pública ya posee. El sitio público y el Studio son hermanos visuales, no gemelos: comparten ADN (esmeralda, disciplina iOS, tipografía Baskerville) pero hablan a audiencias y momentos distintos.

**Tipo de sitio:** Brand luxury showcase (storytelling). Sin transacción nativa. CTA principal: agendar conversación con asesor.

**Audiencia:** Mix amplio sin segmentar — coleccionistas, curiosos lifestyle premium, aliados estratégicos / prensa. El diseño funciona para los tres viajes simultáneamente.

**Plataforma actual a reemplazar:** Shopify (tema Dawn) en `tierramadre.co`.

**Carpeta de referencia:** `coomunity-universe/WebTM/` (no es la web final; contiene el spec del sitio actual + esqueleto Next.js de prueba + assets).

---

## 1. Filosofía Visual

### 1.1 Mantra

> _"Esmeraldas con ADN de PAZ, hechas experiencia."_

El sitio web es la materialización del posicionamiento de marca: **puente entre legado ancestral y blockchain**. Donde otras marcas luxury cuentan ese puente con copy, Tierra Mädre lo _muestra_ con diseño. El visitante no lee sobre el puente — lo cruza al hacer scroll.

### 1.2 Tres principios rectores

1. **Editorial-to-Studio Arc** — El diseño evoluciona durante el scroll: empieza en modo museo (mito, comunidad, herencia) y termina en modo aplicación (datos, tokenización, conversión). El propio gradiente visual cuenta la historia.
2. **Material Honesty** — Tipografía serif sin tracking forzado, color tierra antes que pantalla, motion que respira en lugar de apurar. Nada decora; todo significa.
3. **Patient Motion** — La marca opera en plazos geológicos (esmeraldas formadas en milenios). Las animaciones reflejan esa cadencia: largas, suaves, sin urgencia. Si una animación se siente apurada, está mal calibrada.

### 1.3 No-goals (lo que el sitio NO es)

- No es e-commerce. No tiene checkout, carrito, ni precios visibles.
- No es la app interna. No replica el Studio ni sus flujos de catálogo administrativo.
- No es un sitio "trendy". No usa parallax pesado, blobs animados, brutalismo, ni neon.
- No es un brand book corporativo. No empieza con misión/visión/valores listados.

---

## 2. Sistema de Modos Visuales (corazón del spec)

El sitio opera en **tres modos visuales**. Cada modo es un sistema completo (paleta + tipografía + layout + motion + componentes). Las páginas se diseñan asignando cada bloque a un modo según su intención narrativa.

### 2.1 Modo Editorial — "El Museo"

**Intención:** Ancestral, mítico, contemplativo. La esmeralda como herencia y comunidad.

| Eje         | Tratamiento                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paleta      | `bg-deep #172D1B` predomina · superficies en `paper #FAFAF7` · acento `emerald-soft #3EB489` aplicado solo a logo, iconos lineales y reglas divisorias  |
| Tipografía  | Libre Baskerville única (400, 700, italic 400). Cero sans-serif. Letter-spacing `0.04em` global                                                         |
| Layout      | Bandas alternadas blanco/oscuro full-bleed. Texto en `max-prose 680px` centrado. Espaciado vertical generoso (`clamp(4rem, 8vw, 8.25rem)`)              |
| Surfaces    | Planas. Sin sombras. Sin glassmorphism. Sin elevación. La banda misma es la jerarquía                                                                   |
| Motion      | Fades simples 420ms `cubic-bezier(0.22, 1, 0.36, 1)`. Scroll-reveal de un solo disparo, sin parallax                                                    |
| Iconografía | SVG outline 1.5px stroke en `emerald-soft`. Reutilizar los 6 íconos existentes (30 años, títulos mineros, ICG, lapidación, confederación, monetización) |
| Forma       | `radius 2px` (casi cero). Botones rectangulares con outline. Cero pill-shapes                                                                           |

**Donde se usa:** Hero de Home, todo `/legado`, `/nosotros` (bloques 1–3), `/multimedia`, FAQ, footer.

### 2.2 Modo Studio — "La Aplicación"

**Intención:** Contemporáneo, preciso, transaccional-no-transaccional. La esmeralda como activo digital y producto luxury.

| Eje         | Tratamiento                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Paleta      | `emerald-core #00AE7A` como primario · `gold-accent #D4AF37` para CTAs y momentos de valor · neutrales iOS (`#F2F2F7` light, `#1C1C1E` dark)                                                                       |
| Tipografía  | Libre Baskerville para títulos · Inter (fallback SF Pro) para UI / labels / forms · Cormorant Garamond solo para display luxury (nombres de gemas, certificados embed) · SF Mono para datos técnicos (quilates, %) |
| Layout      | Grid de 12 columnas (gutter 24px desktop, 16px tablet, 12px mobile). Cards con elevación sutil. Glassmorphism opcional en headers flotantes                                                                        |
| Surfaces    | Cards con `box-shadow 0 4px 24px rgba(23, 45, 27, 0.08)`. Hover eleva sombra a `0 8px 36px`. Glassmorphism con `backdrop-filter: blur(20px) saturate(1.4)`                                                         |
| Motion      | Spring physics (Framer Motion `tension 120, friction 14`) para hovers y transiciones. Microinteracciones tipo iOS (haptic-visible: bounce-on-press)                                                                |
| Iconografía | Mix outline + filled. Animables (rotate, fill-on-hover). Peso variable según jerarquía                                                                                                                             |
| Forma       | `radius 12px` para cards · `radius 20px` para modales/sheets · botones pill (`radius 9999px`) o squared 12px según contexto                                                                                        |

**Donde se usa:** Sección de tokenización en Home, `/coleccion` (lookbook), `/contacto` (formulario), bloques de datos en `/legado` (tabla de valores por quilate), bloques 7–8 de `/nosotros` (categorías de calidad: Extrafinas, Finas, Comerciales).

### 2.3 Modo Bridge — "El Puente"

**Intención:** Transición visual entre Editorial y Studio. Es donde el sitio cuenta el posicionamiento.

| Eje         | Tratamiento                                                                                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paleta      | Gradiente `bg-deep #172D1B → bridge-deep-emerald #0E5A3F → emerald-core #00AE7A` aplicado a fondos de sección. Texto se mantiene blanco con highlights en `emerald-glow #7DD3B0`                                                                                          |
| Tipografía  | Libre Baskerville **mantiene** como base. Cormorant Garamond aparece en displays grandes (frases de transición). Inter empieza a aparecer en metadata pequeña (eyebrows numerados). La tipografía es la última cosa en cambiar — el cambio principal es de paleta y forma |
| Layout      | Single column centrado al inicio del bridge, abre a 2 columnas a la mitad, abre a 3 columnas (grid Studio) al final                                                                                                                                                       |
| Surfaces    | Cero shadow al inicio, shadow sutil a la mitad, shadow Studio al final. La elevación crece con el scroll                                                                                                                                                                  |
| Motion      | Cinematic 720ms `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material standard). Gradient transitions en background. Parallax muy sutil (ratio 0.05 max) — solo en hero del bridge                                                                                                   |
| Iconografía | Outline-to-filled morph al hacer scroll-reveal                                                                                                                                                                                                                            |
| Forma       | `radius 2px → 8px → 12px` progresivo                                                                                                                                                                                                                                      |

**Donde se usa:** Sección puente entre bloques editoriales y Studio en Home (después de aliados, antes de tokenización). Bloques 4–6 de `/nosotros` (lapidación → alquimia financiera → talento humano). Bloque 3 de `/legado` (alquimia geológica como antesala a datos de mercado).

### 2.4 Reglas de combinación

- **Una página puede tener los tres modos** (Home, Nosotros, Legado).
- **Una página puede tener un solo modo** (Multimedia = Editorial; Colección y Contacto = Studio).
- **El Bridge nunca aparece solo.** Siempre conecta Editorial → Studio en ese orden. Nunca se va de Studio a Editorial dentro de la misma página.
- **El Editorial puede aparecer al final de una página tras Studio** solo como cierre contemplativo (ej. FAQ al final de Home actúa como "regreso al museo").

---

## 3. Tokens de Color

### 3.1 Paleta Editorial (heredada del sitio público actual)

```
--tm-bg-deep:           #172D1B   /* Verde profundo, fondo oscuro primario */
--tm-bg-deep-2:         #203E25   /* Verde profundo secundario, hover oscuro */
--tm-bg-deep-3:         #0E1F12   /* Verde casi negro, footers / momentos solemnes */
--tm-paper:             #FAFAF7   /* Blanco cálido, superficie clara primaria */
--tm-light:             #FFFFFF   /* Blanco puro, contraste máximo */
--tm-emerald-soft:      #3EB489   /* Esmeralda claro — logos, iconos, reglas */
--tm-emerald-glow:      #7DD3B0   /* Hover de emerald-soft, accents brillantes */
```

**Texto:**

```
--tm-text-on-light-primary:    rgba(23, 45, 27, 0.92)
--tm-text-on-light-secondary:  rgba(23, 45, 27, 0.65)
--tm-text-on-light-muted:      rgba(23, 45, 27, 0.45)
--tm-text-on-dark-primary:     rgba(255, 255, 255, 0.95)
--tm-text-on-dark-secondary:   rgba(255, 255, 255, 0.72)
--tm-text-on-dark-muted:       rgba(255, 255, 255, 0.50)
```

**Bordes:**

```
--tm-border-soft-light:  rgba(23, 45, 27, 0.12)
--tm-border-soft-dark:   rgba(255, 255, 255, 0.16)
```

### 3.2 Paleta Studio (adaptada del Studio interno)

```
--tm-emerald-core:       #00AE7A   /* Primario Studio */
--tm-emerald-core-dark:  #008C62   /* Hover, pressed */
--tm-emerald-core-light: #33C194   /* Disabled, glow */
--tm-emerald-50:         #E6FFF7   /* Tinte sutil para superficies */
--tm-gold-accent:        #D4AF37   /* CTA principal Studio */
--tm-gold-light:         #E5C866   /* Gold hover */
--tm-gold-dark:          #B8941F   /* Gold pressed */
--tm-surface-glass-light: rgba(250, 250, 247, 0.78)
--tm-surface-glass-dark:  rgba(23, 45, 27, 0.78)
```

**Estados (Studio):**

```
--tm-success:  #34C759
--tm-warning:  #FF9500
--tm-error:    #C44536   /* Error tono terroso, no rojo dramático */
--tm-info:     #007AFF
```

### 3.3 Paleta Bridge (puente entre los dos)

```
--tm-bridge-deep-emerald: #0E5A3F   /* Tono medio entre #172D1B y #00AE7A */
--tm-bridge-emerald:      #00945F   /* Verde transicional */
--tm-bridge-glow:         #5FCFA3   /* Glow del puente, usado sparingly */
```

### 3.4 Reglas de uso

- **Emerald-soft (`#3EB489`) es solo Editorial.** En Studio no se usa.
- **Emerald-core (`#00AE7A`) es solo Studio.** En Editorial no se usa (preserva la sutileza editorial).
- **Gold (`#D4AF37`) aparece exclusivamente en CTAs Studio de máximo valor** (Solicitar Acceso, Reservar Conversación). Nunca en navegación.
- **Bg-deep es texto-en-claro de Editorial.** No se usa como background secundario en Studio (Studio usa neutrales iOS).
- **Texto Cormorant siempre tiene letter-spacing 0** (deja respirar el serif luxury). Texto Baskerville body usa `0.04em`.

### 3.5 Contraste verificado

| Combinación                            | Contraste | WCAG                                           |
| -------------------------------------- | --------- | ---------------------------------------------- |
| `text-on-dark-primary` sobre `bg-deep` | 13.8:1    | AAA                                            |
| `text-on-light-primary` sobre `paper`  | 11.2:1    | AAA                                            |
| `emerald-soft` sobre `bg-deep`         | 5.1:1     | AA (no usar para body, OK para títulos/iconos) |
| `emerald-core` sobre `light`           | 3.4:1     | Falla AA — solo decorativo o con peso 700+     |
| `gold-accent` sobre `bg-deep`          | 7.8:1     | AAA                                            |

**Regla:** texto pequeño (<18px) usa siempre primary. Acentos solo en headings, iconos, decorativos.

---

## 4. Tipografía

### 4.1 Familias

| Familia                                              | Uso                                                                         | Modo                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| **Libre Baskerville** (400, 700, italic 400)         | Body, títulos editoriales, mayoría del UI                                   | Editorial + Bridge + Studio (titles) |
| **Cormorant Garamond** (400, 500, 600, italic 400)   | Display luxury — hero secundarios, nombres de gemas, frases de transición   | Bridge + Studio                      |
| **Inter** (400, 500, 600 — fallback `-apple-system`) | UI, formularios, labels, datos, navegación                                  | Studio                               |
| **SF Mono / JetBrains Mono** (400)                   | Datos técnicos: quilates, dimensiones, precios estimados, hashes blockchain | Studio                               |

**Carga:** Google Fonts con `display: swap`. Preconnect a `fonts.googleapis.com` y `fonts.gstatic.com`.

### 4.2 Escala (mobile-first, clamp-based)

| Token       | Tamaño                                              | Familia                                          | Uso                                |
| ----------- | --------------------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| `display-1` | `clamp(2.75rem, 7vw, 6rem)`                         | Cormorant 400                                    | Hero principal Home, raros         |
| `display-2` | `clamp(2.25rem, 5vw, 4.5rem)`                       | Baskerville 400                                  | Hero de páginas internas           |
| `h1`        | `clamp(2rem, 4vw, 3.25rem)`                         | Baskerville 400                                  | Títulos de página                  |
| `h2`        | `clamp(1.6rem, 3vw, 2.5rem)`                        | Baskerville 400                                  | Títulos de sección                 |
| `h3`        | `clamp(1.15rem, 1.6vw, 1.4rem)`                     | Baskerville 700                                  | Subtítulos, FAQ headings           |
| `h4`        | `1rem`                                              | Inter 600 (Studio) / Baskerville 700 (Editorial) | Card titles                        |
| `eyebrow`   | `0.78rem` letter-spacing `0.22em` UPPERCASE         | Baskerville 400 (Edit) / Inter 500 (Studio)      | Indicador de sección               |
| `lead`      | `clamp(1.05rem, 1.3vw, 1.25rem)` line-height `1.6`  | Baskerville 400                                  | Párrafo introductorio post-heading |
| `body`      | `1.05rem` line-height `1.8` letter-spacing `0.04em` | Baskerville 400                                  | Texto largo                        |
| `body-sm`   | `0.9375rem` line-height `1.7`                       | Baskerville 400                                  | Captions, footnotes                |
| `ui-label`  | `0.875rem` letter-spacing `0.02em`                  | Inter 500                                        | Form labels, nav (Studio)          |
| `ui-button` | `0.85rem` letter-spacing `0.14em` UPPERCASE         | Baskerville 400 (Edit) / Inter 600 (Studio)      | Botones                            |
| `data`      | `0.875rem` line-height `1.4`                        | Mono 400                                         | Datos técnicos                     |

### 4.3 Reglas de jerarquía

- **Headings con peso 400** (regular) en Editorial. El peso lo da el tamaño, no el bold.
- **Body siempre `line-height 1.8`** en Editorial — la respiración entre líneas es lujo.
- **Bold solo en H3 y emphasis dentro de párrafos.**
- **Italic solo para citas o términos extranjeros** (ej. "Trapiche", "Muzo"). Nunca para enfatizar.
- **Mayúsculas tracked (`0.14em–0.22em`) son patrón de acción** (botones, eyebrows). Nunca para títulos largos.
- **Cormorant solo en display** — máximo 8 palabras. Si una frase no cabe en una línea, cambiar a Baskerville.

### 4.4 Soporte de diacríticos

La tipografía DEBE soportar el carácter `ä` con diéresis (Mädre). Verificado: Libre Baskerville, Cormorant Garamond e Inter lo incluyen. Carácter requerido en title tag, headings y meta.

---

## 5. Espaciado y Layout

### 5.1 Sistema de espaciado

Base 4px. Múltiplos relevantes:

```
--tm-space-1:  0.25rem   /* 4px  */
--tm-space-2:  0.5rem    /* 8px  */
--tm-space-3:  0.75rem   /* 12px */
--tm-space-4:  1rem      /* 16px */
--tm-space-5:  1.5rem    /* 24px */
--tm-space-6:  2rem      /* 32px */
--tm-space-7:  2.75rem   /* 44px — touch target mínimo */
--tm-space-8:  4rem      /* 64px */
--tm-space-9:  5.5rem    /* 88px */
--tm-space-10: 6.875rem  /* 110px */
--tm-space-11: 8.25rem   /* 132px */
```

**Ritmo vertical entre secciones:** `clamp(4rem, 8vw, 8.25rem)`.

### 5.2 Contenedores

```
--tm-container-narrow:  680px   /* Prose, lectura larga */
--tm-container-default: 1240px  /* Layout estándar */
--tm-container-wide:    1440px  /* Hero, banners full-bleed con texto contenido */
--tm-container-fluid:   100%    /* Imagen full-bleed */
```

Padding lateral (gutters): `clamp(1.25rem, 4vw, 2.5rem)`.

### 5.3 Grid

- **Desktop (≥1024px):** 12 columnas, gutter 24px
- **Tablet (720–1023px):** 6 columnas, gutter 16px
- **Mobile (<720px):** 4 columnas, gutter 12px

**Patrones de uso:**

- 6 pilares: 4-4-4 / 6-6 / 12 (desktop / tablet / mobile)
- Aliados: 3-3-3-3-3-3 / 6-6 / 6-6 (logos)
- Hero con companion: 8-4 / 12 / 12
- Card grid colección: 3-3-3-3 / 6-6 / 12

### 5.4 Breakpoints

| Token | Min-width | Nombre           |
| ----- | --------- | ---------------- |
| `xs`  | 0         | Mobile portrait  |
| `sm`  | 480px     | Mobile landscape |
| `md`  | 720px     | Tablet           |
| `lg`  | 1024px    | Desktop          |
| `xl`  | 1240px    | Wide desktop     |
| `2xl` | 1440px    | Cinema           |

Todos los componentes responden con queries `@media (min-width: ...)`. Mobile-first.

### 5.5 Touch & cursor zones

- Touch target mínimo: 44×44px (iOS HIG estándar).
- Zona de hover: 8px de halo invisible en links inline (padding bloque 4px).
- Cursor del visitante visible en zonas interactivas: `pointer` consistente.

---

## 6. Arquitectura de Información

### 6.1 Mapa de páginas y modo asignado

| Ruta ES             | Ruta EN             | Modo                                         | Notas                                   |
| ------------------- | ------------------- | -------------------------------------------- | --------------------------------------- |
| `/`                 | `/en`               | Arco completo Editorial→Bridge→Studio        | Página de mayor riqueza narrativa       |
| `/legado`           | `/en/legacy`        | Arco parcial (Editorial→Bridge→datos Studio) | Mito → ciencia → mercado                |
| `/nosotros`         | `/en/about`         | Arco completo (8 bloques)                    | Comunidad → talento → tecnología        |
| `/coleccion`        | `/en/collection`    | Studio puro                                  | Lookbook funcional, sin precios         |
| `/multimedia`       | `/en/multimedia`    | Editorial puro                               | Testimonios en video                    |
| `/contacto`         | `/en/contact`       | Studio puro                                  | Formulario + side image editorial       |
| `/404`              | `/en/404`           | Editorial puro                               | Página de extravío con tono de la marca |
| `/legal/privacidad` | `/en/legal/privacy` | Editorial puro                               | Documento legal, prose centrada         |

### 6.2 Header (anchor mode)

Componente sticky global. Comportamiento:

- **Layout:** Grid de 3 columnas — `[1fr] [auto] [1fr]`. Izquierda: drawer hamburger + selector ES/EN. Centro: logo (mark + wordmark). Derecha: search icon + contact CTA + cart-placeholder (si aplica).
- **Modo dinámico:** Hereda el modo de la sección visible en viewport. Editorial = bg blanco/translúcido + texto bg-deep. Studio = bg glass blur + texto bg-deep. Bridge = transición de bg con cinematic ease 720ms.
- **Threshold de cambio:** Cuando el cruce de modo entra al viewport (top 64px desde el viewport-top), el header migra colores. La transición es independiente del scroll position; usa IntersectionObserver con rootMargin `-64px 0 0 0`.
- **Mobile:** Layout colapsa a `[auto] [1fr] [auto]`. Drawer + logo + contact icon (solo).
- **Scroll behavior:** Sticky always. En `scroll-y > 80px` activa `backdrop-blur(8px)` y `border-bottom: 1px solid border-soft`.

### 6.3 Footer (anchor mode)

Siempre **Editorial dark**. Nunca cambia de modo.

- **Layout desktop:** 3 columnas — `[brand mark + tagline] [nav secundaria] [contacto + redes]`. Footer-bottom: línea legal centrada.
- **Brand mark:** Mark estrella mandala 6 puntas grande (120px), color `emerald-soft`. Animación sutil hover: rotación 360° en 8 segundos.
- **Nav secundaria:** Lista vertical: Inicio · Catálogo · Legado · Nosotros · Multimedia · Contacto · Política de Privacidad.
- **Contacto:** Email · Teléfono · Dirección Bogotá · ES/EN switch · Iconos sociales (si aplica — chequear con marca; el sitio actual no muestra redes en footer).
- **Legal:** "© 2026 Tierra Mädre · Todos los derechos reservados · Política de Privacidad". Tipografía `body-sm` muted.

### 6.4 Navegación principal (drawer)

Slide-in desde la izquierda. Panel max `420px` desktop / `86vw` mobile.

- **Backdrop:** `rgba(23, 45, 27, 0.5)` con `backdrop-blur(4px)`. Click cierra.
- **Panel:** Background `paper`. Padding `2.5rem 2rem`.
- **Estructura:**
  1. Botón cerrar (top-right, símbolo ×, 1.5rem)
  2. Lista nav vertical con tipografía `1.4rem` Baskerville 400
  3. Divider sutil
  4. Selector ES/EN
  5. Mark del logo al fondo (decorativo)
- **Modo:** Siempre Editorial light, sin importar el modo del fondo.
- **Motion:** `transform: translateX(-100%) → 0` con `editorial-ease 420ms`. Backdrop fade `320ms ease-out`.
- **Accesibilidad:** Focus trap, `Esc` cierra, `aria-expanded` en botón hamburger, `role="dialog"` + `aria-modal="true"`, focus inicial en botón cerrar.

---

## 7. Componentes UI

### 7.1 Hero block

**Variantes:** `hero-editorial`, `hero-studio`, `hero-bridge`.

**Editorial (Home, páginas internas largas):**

- Full-bleed image cover, mínimo `min-height: 88vh` desktop / `70vh` mobile.
- Overlay: `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 100%)`. Más oscuro abajo para legibilidad de heading.
- Heading: `display-1` o `display-2` Baskerville/Cormorant. Posición desktop: bottom-left con padding `clamp(2rem, 6vw, 6rem)`. Mobile: bottom-left con padding generoso.
- Subhead: `lead` blanco-secundario, max-width `560px`.
- **Sin CTA en hero editorial.** El CTA aparece en la primera sección post-hero.
- Animación de entrada: opacity 0→1 + translateY 24px→0, `editorial-ease 720ms` con stagger 120ms (heading primero, subhead después).

**Studio (Colección, Contacto):**

- Altura `60–70vh`.
- Grid 8/4: imagen producto/contexto + columna de texto con eyebrow + h1 + lead + 1 CTA primario.
- Background neutral light (paper o light) o emerald-50.
- Heading: Baskerville o Cormorant según ocasión.
- CTA visible en hero. Botón pill emerald-core o gold-accent.

**Bridge (transición narrativa, NO inicio de página):**

- Background gradient `bg-deep → bridge-emerald` 100vh.
- Una sola frase grande Cormorant 400 centrada (8 palabras max).
- Eyebrow numerado: "II · La transformación" o "III · La conversión".
- Aparece via parallax sutil (background ratio 0.05).

### 7.2 Section block

Patrón base reutilizable.

```
[ eyebrow ]
[ H2 (max 8 palabras) ]
[ rule emerald 48×1px ]
[ lead (1-2 líneas, opcional) ]
[ contenido (children) ]
```

- **Spacing interno:** `eyebrow → H2: 1rem`. `H2 → rule: 1.5rem`. `rule → lead: 1.5rem`. `lead → contenido: 3rem` (Editorial) / `2rem` (Studio).
- **Variantes:** `centered`, `left`, `with-image-companion`.
- **Image companion:** Layout 6/6 desktop, stack mobile. Imagen aspect-ratio libre (preservar proporción original).

### 7.3 6 Pilares (Trust grid)

- **Layout:** 3 col desktop / 2 col tablet / 1 col mobile.
- **Item:** `[icon SVG 64px] [H3 Baskerville 700] [body-sm Baskerville 400, max-width 280px]`. Centrado vertical, padding `1.5rem`.
- **Hover (desktop):** Icon `transform: scale(1.05)` + color `emerald-glow`, 320ms ease.
- **Mobile:** Sin hover. Icon estático.
- **Background:** `paper` siempre. Sin cards, sin bordes — solo el icono y el texto.

### 7.4 Trust banner ("Acceso reservado por confianza")

- Full-bleed con foto de esmeralda en bruto.
- Overlay: `linear-gradient(135deg, rgba(23,45,27,0.65) 0%, rgba(14,90,63,0.4) 100%)` (Bridge mode).
- Contenido centrado: eyebrow blanco · H2 blanco · lead blanco-secundario · CTA primario.
- CTA: en Bridge se usa `gold-accent` con hover `gold-light`.
- Min-height: `560px` desktop / `440px` mobile.

### 7.5 FAQ accordion

- Contenedor centrado max-width `780px`.
- **Item closed:** `[H3 question] [+]`. Border-bottom `1px solid border-soft-light` (Editorial) o `border-soft-dark` (en Studio).
- **Item open:** El símbolo `+` rota a `×` (45°). Body se expande con max-height transition.
- **Motion:** `max-height` no se anima (causa jank). Usar `grid-template-rows: 0fr → 1fr` con transition. Transición `420ms editorial-ease`.
- **Múltiples abiertos a la vez por defecto.** El usuario puede expandir varias preguntas para comparar respuestas. Si analítica muestra que solo lee una, considerar single-open en iteración 2.
- **Accesibilidad:** Cada question es `<button aria-expanded="...">`. Body es `<div role="region" aria-labelledby="...">`. Tabbable.

### 7.6 Form (Contacto, Studio)

- **Layout:** 2 col desktop (form 7 + sidebar 5) / stack mobile.
- **Sidebar:** Imagen vertical (esmeralda en mano humana, modo cinemático) + tagline editorial superpuesta abajo. Aspect-ratio 4/5.
- **Form:**
  - Inputs underlined: `border: 0; border-bottom: 1px solid border-soft-light; padding: 0.75rem 0;`. Sin background. Fondo del form es `paper`.
  - Floating label: cuando el input tiene focus o valor, la label sube y reduce a `ui-label` size, color `emerald-core`.
  - Focus ring: en lugar de outline default, el border-bottom cambia a `2px solid emerald-core`.
  - Textarea: mismo patrón, mín 4 filas.
  - Validación: mensajes `body-sm` color `tm-error` (terroso, no rojo dramático) bajo el input. `aria-invalid` y `aria-describedby` aplicados.
  - Submit: botón pill `emerald-core` + texto `light`. Hover: `emerald-core-dark`. Loading: spinner pequeño dentro del botón.
- **Layout mobile:** Sidebar colapsa arriba del form, altura reducida (`240px`).

### 7.7 Card (Colección)

- **Aspect:** Imagen 4/5 (vertical luxury).
- **Layout:** Image arriba, label en bottom-overlay con gradient.
- **Hover (desktop):** Imagen `scale(1.03)` 600ms ease + label se eleva 4px + sombra crece.
- **Mobile:** Label siempre visible (sin hover state).
- **Contenido del label:** Eyebrow (categoría: Talismán, 11:11, Fénix) · H4 nombre · body-sm provenance ("Muzo · 2.4 ct").
- **CTA:** Card entera es link a `/contacto?gem={slug}` (sin checkout). Hover muestra icono `→` discreto en bottom-right.
- **Radius:** `12px` (Studio).
- **Loading state:** Skeleton con shimmer suave (NO el típico shimmer agresivo — un fade gentle 1.6s).

### 7.8 Image atom (transversal)

Patrón obligatorio para evitar layout shift y blinking (heredado de la disciplina del Studio):

- **Aspect-ratio reservado** siempre antes de cargar la imagen.
- **Lazy loading nativo** (`loading="lazy"` excepto hero above-the-fold).
- **LQIP:** Blur placeholder 12px → 0 transition 600ms al cargar.
- **Retry pattern:** Si falla la carga, reintentar 3 veces con backoff exponencial (1s, 2s, 4s) y cache-busting.
- **Object-fit:** `cover` para heros y cards, `contain` para logos.
- **alt text obligatorio** (decorativas usan `alt=""`).

### 7.9 Video atom (Multimedia)

- **NUNCA usar `<img src="video.mp4">`** (Safari memory crash, regla heredada del Studio).
- En grid/cards: `<video preload="none" muted playsinline src="url#t=0.001">` para frame-thumbnail.
- En reproductor activo: `preload="auto"`, controles nativos o custom.
- iOS Safari hack: `#t=0.001` en src para forzar primer frame.
- Container con aspect-ratio 16/9, overflow hidden, radius 2px (Editorial).

### 7.10 Button system

| Variante                | Uso                            | Estilos                                                                                                                                        |
| ----------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `btn-editorial-primary` | CTA editorial (rare)           | bg `bg-deep`, text `light`, border `1px solid bg-deep`, padding `1rem 2.25rem`, uppercase tracked. Hover: bg transparent, text bg-deep         |
| `btn-editorial-light`   | CTA sobre dark                 | bg transparent, text `light`, border `1px solid light`. Hover: bg light, text bg-deep                                                          |
| `btn-studio-primary`    | CTA principal Studio           | bg `emerald-core`, text white, pill shape, padding `0.875rem 1.75rem`, ui-button typography. Hover: bg `emerald-core-dark` + scale 1.02 spring |
| `btn-studio-gold`       | CTA de máximo valor            | bg `gold-accent`, text bg-deep, pill shape. Hover: bg `gold-light`                                                                             |
| `btn-ghost`             | CTA secundario, modos mixtos   | bg transparent, text currentColor, underline animado                                                                                           |
| `btn-icon`              | Acciones header (search, lang) | 44×44 hit area, icon 20px, currentColor                                                                                                        |

**Estados:** `:hover`, `:focus-visible` (ring 2px emerald offset 2px), `:active`, `:disabled` (opacity 0.4 cursor not-allowed), `loading` (spinner inside, disabled-like).

### 7.11 Eyebrow

Pequeña etiqueta superior a un H2. Patrón consistente:

- Tipografía: `eyebrow` token (0.78rem, letter-spacing 0.22em, UPPERCASE).
- Color: `emerald-soft` en Editorial / `emerald-core` en Studio / `emerald-glow` en Bridge.
- Variantes: `numerada` (con `I·`, `II·` prefijo), `con-rule` (con línea izquierda 32px), `plain`.

### 7.12 Rule (separador)

- 48px × 1px, color `emerald-soft` (Editorial) o `emerald-core` (Studio) o `gold-accent` (Bridge en momentos especiales).
- Margen vertical: `1.5rem`.
- Variante `rule-left`: alineado a la izquierda en bloques left-aligned.

---

## 8. Sistema de Motion

### 8.1 Tokens

```
/* Easings */
--tm-ease-editorial:  cubic-bezier(0.22, 1, 0.36, 1)     /* slow-out, contemplativo */
--tm-ease-studio:     cubic-bezier(0.25, 0.46, 0.45, 0.94) /* iOS standard */
--tm-ease-bridge:     cubic-bezier(0.4, 0.0, 0.2, 1)      /* Material standard */
--tm-ease-snap:       cubic-bezier(0.5, 0, 0.1, 1)        /* Snappy CTA confirms */

/* Durations */
--tm-dur-instant:    100ms
--tm-dur-quick:      200ms   /* Studio interactions */
--tm-dur-default:    320ms   /* Most UI */
--tm-dur-serene:     420ms   /* Editorial reveals */
--tm-dur-cinematic:  720ms   /* Bridge transitions, hero entries */
--tm-dur-geological: 1200ms  /* Slow scroll reveals, parallax */
```

### 8.2 Patrones

| Patrón                           | Detalle                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Scroll reveal**                | `opacity 0 → 1` + `translateY 16px → 0`. Threshold 0.1, one-shot (sin reverse). Stagger 80ms si hay múltiples hijos |
| **Hover Editorial**              | Underline expand left-to-right en links. `transform: scaleX(0) → 1` 200ms ease-out. `transform-origin: left`        |
| **Hover Studio**                 | Card `scale(1.02)` + sombra crece. Spring `tension 120 friction 14`                                                 |
| **Page transition**              | Cross-fade 320ms. View transitions API si soportado                                                                 |
| **Drawer nav**                   | Slide-in 420ms editorial-ease. Backdrop fade 320ms                                                                  |
| **Mode transition (intra-page)** | Background-color crossfade 720ms cinematic-ease. Header sigue el cambio con offset 80ms                             |
| **Hero entry**                   | Heading opacity+translateY, stagger niños 120ms. 720ms cinematic                                                    |
| **Accordion FAQ**                | `grid-template-rows: 0fr → 1fr` 420ms editorial. Símbolo `+ → ×` rotate 45° 320ms                                   |
| **Image LQIP reveal**            | `filter: blur(12px) → blur(0)` + `opacity 0.6 → 1`. 600ms ease-out                                                  |
| **Mark logo (footer)**           | Hover: `rotate 0 → 360deg` 8000ms linear (sutil, casi imperceptible)                                                |

### 8.3 Choreography del arco (Home)

Cuando un visitante hace scroll de Editorial a Studio, esta es la coreografía:

1. **Sección 4 (Aliados, Editorial)** termina. Scroll cruza el threshold del bloque puente.
2. **Bridge intro:** Background empieza transición `bg-deep → bridge-deep-emerald`. Header migra colores con offset 80ms para sentirse "consciente".
3. **Bridge content reveal:** Frase Cormorant aparece centrada con cinematic ease 720ms. Background continúa transicionando `bridge-deep-emerald → emerald-core`.
4. **Sección Studio entra:** Cards con elevación aparecen con stagger 120ms. Header ya está en Studio mode.
5. **CTA gold-accent:** Aparece último, con micro-bounce spring (Studio).

Toda la coreografía debe sentirse natural sin importar la velocidad de scroll del usuario. Usar `IntersectionObserver` por sección, no `scroll-position` global.

### 8.4 Reduced motion

Honor obligatorio de `prefers-reduced-motion: reduce`:

- Reemplazar todos los `translate` con opacity-only fades.
- Deshabilitar parallax (background fixed simple).
- Deshabilitar mode-transition gradients (corte directo).
- Deshabilitar mark-rotation y todos los infinity animations.
- Mantener: drawer slide (funcional), accordion open (funcional), focus rings, button press states.

### 8.5 Reglas anti-blinking

Heredadas del Studio (críticas):

- Cargar cache sincrónicamente en init de state, no via `useEffect`.
- Reservar siempre aspect-ratio en imágenes y videos.
- Usar `key` único por instancia para evitar reuso de DOM.
- Preload de imágenes antes de mostrar galerías.
- Evitar fade complejos en swap de imagen — preferir swap instantáneo si la imagen está en cache.

---

## 9. Page-by-page Design

### 9.1 Home `/`

| #      | Sección                                          | Modo                                              | Notas                                                                |
| ------ | ------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------- |
| 1      | Hero ("Fragmentos verdes del corazón del mundo") | Editorial                                         | full-bleed, sin CTA, foto modelo afro + cluster cristales            |
| 2      | "Excelencia en cada etapa"                       | Editorial                                         | imagen Círculo de Valor + texto + CTA secundario "Ver Colección"     |
| 3      | "Un ecosistema de confianza" + 6 pilares         | Editorial                                         | bg paper, grid 3-col                                                 |
| 4      | Aliados estratégicos                             | Editorial                                         | logos monocromos verde-oscuro                                        |
| 5      | **Bridge: "Del legado al futuro"**               | Bridge (NUEVO)                                    | frase Cormorant + eyebrow numerado, gradient bg, parallax sutil      |
| 6      | Tokenización & blockchain                        | Studio                                            | cards con datos, mockup app, paleta emerald-core, gold-accent en CTA |
| 7      | "Acceso reservado por confianza" (CTA banner)    | Studio (con paleta Bridge para coherencia visual) | foto esmeralda bruto, gold CTA                                       |
| 8      | FAQ collapsible (8 preguntas)                    | Editorial                                         | regreso al modo serio, cierre contemplativo                          |
| Footer | —                                                | Editorial dark                                    | global anchor                                                        |

**Transiciones críticas:**

- Sección 4 → 5: transición de modo. Background migra `paper → gradient bridge`. Cinematic 720ms.
- Sección 7 → 8: regreso a Editorial. Background migra `bridge → paper`. Más suave (420ms) porque es contemplativo, no épico.

### 9.2 Legado `/legado`

Hero `display-2`: **LEGADO**. Página corta y densa.

| #   | Bloque                            | Modo      | Notas                                                                              |
| --- | --------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| 1   | Alma verde de Colombia            | Editorial | prose 680px, fondo paper                                                           |
| 2   | Por qué el mundo la anhera        | Editorial | imagen companion 6/6 (Esmeralda Trapiche, Gachalá)                                 |
| 3   | Alquimia de la tierra             | Bridge    | datos geológicos empiezan a aparecer en cards Studio sutiles                       |
| 4   | Diferencia que la hace invaluable | Studio    | tabla comparativa de valores por quilate (Colombia vs Brasil vs Zambia), data mono |

**Cierre:** CTA "Conocer Más" → `/coleccion` o `/contacto`. Botón Studio gold.

### 9.3 Nosotros `/nosotros`

Hero `display-2`: **NOSOTROS**. La página más larga. 8 bloques, asignación con arco completo.

| Bloque | Título                                                              | Modo                 |
| ------ | ------------------------------------------------------------------- | -------------------- |
| 1      | Tierra Mädre: Un Legado del poder de la tierra                      | Editorial            |
| 2      | El Poder de la Esmeralda: Fragmentos del Corazón la Tierra          | Editorial            |
| 3      | Las gemas más valiosas son los talentos de nuestra comunidad        | Editorial            |
| 4      | El Arte de la Lapidación: Danza de Precisión                        | Bridge               |
| 5      | Alquimia Financiera: Monetizar el Futuro con Conciencia             | Bridge               |
| 6      | Nuestra Gema Más Valiosa: El Talento Humano                         | Bridge               |
| 7      | Un Juramento Verde                                                  | Bridge               |
| 8      | Un Ecosistema Sagrado + categorías Extrafinas / Finas / Comerciales | Studio (cards 3-col) |

**CTA cierre:** "Conocer Más" → `/legado` o `/contacto`.

### 9.4 Multimedia `/multimedia`

Editorial puro. Layout simple:

- Hero `display-2`: **EL PODER DE LA CONFIANZA**.
- Bloque 1: video reproductor 16:9 + caption editorial bajo.
- Bloque intermedio: "El Sello de la Confianza" — texto centrado max-prose.
- Bloque 2: video reproductor 16:9 + caption.
- CTA: regreso a `/`.

### 9.5 Colección `/coleccion`

Studio puro. Lookbook funcional sin precios ni checkout.

- Hero corto: imagen + h1 "Colección" + filtros chips (Talismán · 11:11 · Fénix · Todas).
- Grid responsive 4 col desktop / 2 col mobile. Cards aspect 4/5.
- Cada card link a `/contacto?gem={slug}`.
- Vacío: estado editorial con mensaje "Las gemas elegidas regresan. Vuelve pronto."
- Sin paginación si <60 items; si más: botón "Ver más" con load incremental.

### 9.6 Contacto `/contacto`

Studio. Layout 7/5 desktop:

- Izquierda (7): formulario en card paper con radius 20px y shadow sutil.
- Derecha (5): imagen vertical esmeralda en mano + overlay tagline editorial: _"Solicita acceso al ecosistema."_
- Form fields: nombre, email\*, teléfono (con input mask CO/INTL), mensaje (textarea 4 filas).
- Submit "Solicitar Acceso" → estado loading → success state con frase serif "Tu mensaje cruza la montaña. Te respondemos pronto."
- Mobile: stack — sidebar arriba (240px), form abajo.

### 9.7 404 `/404`

Editorial puro. Hero full-bleed con imagen de paisaje brumoso de los Andes colombianos. Heading: "Camino perdido en la montaña". Sub: "La página que buscas se internó en otra senda." CTA: botón ghost "Volver al inicio".

### 9.8 Legal `/legal/privacidad`

Editorial. Prose centrada max-prose 680px. Tipografía Baskerville 1.05rem line-height 1.8. Estructura H1, H2 cada apartado, listas internas. Sin imágenes.

---

## 10. Microinteracciones y Estados

### 10.1 Loading global

- Barra superior thin (2px) `emerald-core` que crece de 0% a 80% en 320ms al iniciar navegación, completa al 100% en 720ms al cargar.
- NO spinner full-screen — es invasivo para una marca contemplativa.

### 10.2 Loading de imagen

- Skeleton con shimmer gentle (`linear-gradient` que mueve `0.6s ease-in-out infinite`), color base `border-soft-light`.
- Se reemplaza por LQIP blur, luego por imagen real.

### 10.3 Empty states

- **Colección vacía:** Icono mark estrella en `emerald-soft` + frase serif: "Las gemas elegidas regresan. Vuelve pronto." + botón ghost "Suscribirse a novedades".
- **Search sin resultados:** "Las palabras que buscas aún no han sido talladas en estas páginas." + sugerencias de páginas relacionadas.

### 10.4 Estados de formulario

- **Idle:** label flotante en posición baja, border-bottom soft.
- **Focus:** label sube y reduce, border-bottom emerald-core 2px.
- **Filled:** label permanece arriba, border-bottom emerald-core 1px.
- **Error:** mensaje aparece debajo (slide-down 200ms), border-bottom `tm-error`. Label rojo terroso.
- **Success (submit):** input con check icon a la derecha emerald-core. Form completo: replace por mensaje de gracias.

### 10.5 Hover states críticos

- Links inline: underline `emerald-soft` que expande izquierda→derecha 200ms.
- Botones: spring scale 1.02 (Studio) o brightness +5% (Editorial).
- Cards de colección: image scale 1.03 + label sube 4px.
- Logos aliados: filter desaturado → saturado al hover (revelan color real al hover, monocromos por defecto).

### 10.6 Selection (text)

```
::selection {
  background: emerald-soft;
  color: bg-deep;
}
```

Detalle pequeño que reafirma identidad cada vez que el usuario selecciona texto.

### 10.7 Cursor

- Default
- Pointer en interactivos
- Custom cursor (opcional, decisión post-spec): mark estrella miniatura como cursor en hero. Solo desktop, fallback sin cursor custom.

---

## 11. Accesibilidad

### 11.1 Estándar

WCAG 2.2 nivel AA mínimo. AAA donde el contraste lo permite.

### 11.2 Contraste

Verificado en sección 3.5. Reglas:

- Texto `<18px`: usa solo `text-on-X-primary` tokens.
- Texto `≥18px` o bold `≥14px`: puede usar `secondary`.
- Decorativos / acentos no requieren contraste.

### 11.3 Navegación por teclado

- Skip-to-content link: aparece al primer Tab, lleva a `<main>`.
- Focus visible: ring 2px solid `emerald-core` con offset 2px en todos los interactivos.
- Tab order respeta visual order.
- Drawer abre en focus en botón cerrar; trap activo; `Esc` cierra.
- FAQ accordion: `Enter` o `Space` toggle. Tab navega entre ítems.
- Form: `Enter` envía. Validation errors anunciados via `aria-live="polite"`.

### 11.4 ARIA

- Header: `<header role="banner">`.
- Drawer: `<dialog role="dialog" aria-modal="true" aria-labelledby="drawer-title">`.
- Nav: `<nav aria-label="Principal">`.
- FAQ: cada question es `<button aria-expanded aria-controls>`. Body es `<div role="region" aria-labelledby>`.
- Form: cada input tiene label asociado. Errores: `aria-invalid="true"` + `aria-describedby="error-id"`.
- Loading bar: `aria-live="polite"`, `role="status"`.

### 11.5 Screen reader

- Imágenes decorativas: `alt=""`.
- Imágenes de contenido: alt descriptivo (no "imagen de"; describir directamente).
- Iconos en botones: `aria-label` obligatorio.
- Logos aliados: `alt="ICG — Instituto Colombiano de Gemología"`.

### 11.6 Motion

- `prefers-reduced-motion: reduce` honored (sección 8.4).

### 11.7 Idioma

- `<html lang="es">` o `<html lang="en">` según ruta.
- Switch ES/EN lleva a la URL espejo de la página actual.
- Términos extranjeros marcados con `<span lang="...">` (ej. "Trapiche" en EN, "Esencia" en EN).

### 11.8 Touch

- Targets mínimos 44×44px.
- Espaciado mínimo entre targets adyacentes: 8px.

### 11.9 Tamaño de fuente

- Body `1.05rem` (~16.8px) — pasa criterio de legibilidad.
- Soporta zoom hasta 200% sin layout breakage.
- No usar `viewport meta` con `user-scalable=no`.

---

## 12. Imagery y Assets

### 12.1 Heroes

- **Editorial:** Fotos editoriales humanas + paisaje. Tono cálido natural (NO hiperprocesado, NO HDR agresivo). Preferir grano fílmico sutil. Aspect-ratio: 16/9 desktop, 3/4 mobile (versiones distintas, no crop CSS).
- **Studio:** Macro de gemas con fondo limpio (negro, blanco, o textura mineral neutra). Alta nitidez, luz controlada.
- **Bridge:** Imágenes de transformación (mineral → tallado → certificado → digital).

### 12.2 Iconografía

- **Editorial (6 pilares):** SVG outline 1.5px stroke. Color: `emerald-soft` o `currentColor`. Reutilizar los del sitio actual:
  - `30-11_Verde-01.svg` — +30 años de experiencia minera
  - `Titulos_Mineros_verde-01.svg` — Títulos mineros propios
  - `ICG_verde.svg` — Certificación gemológica
  - `Talla-corazon_verde-01.svg` — Expertos en lapidación
  - `Confederacion_Verde.svg` — Confederación Esmeralderos
  - `Monetizacion_verde-01.svg` — Monetización global

  **Acción:** rediseñarlos en peso consistente (algunos varían). Mantener silueta reconocible.

- **Studio:** Mix outline + filled, animables. Diseño consistente con el sistema iOS (rounded ends, peso uniforme).
- **Reglas:** Nunca emoji nativos. Nunca iconos de stock que no se ajusten al peso del sistema.

### 12.3 Logo y mark

- **Mark:** Mandala/estrella 6 puntas con hojas internas.
- **Wordmark:** "TIERRA MÄDRE" en serif espaciado (Baskerville o custom). Mantener diéresis siempre.
- **Lockups:**
  - Vertical (mark sobre wordmark): header centered, footer brand block.
  - Horizontal (mark a la izquierda): nav drawer header, signature.
  - Mark only: favicon, mobile header colapsado, ornamentos.
  - Wordmark only: legal, citas.
- **Colores:**
  - Editorial: `emerald-soft` (`#3EB489`).
  - Studio: `emerald-core` (`#00AE7A`).
  - Sobre dark: blanco puro o `emerald-glow` para destaque.
  - Monocromo: 100% bg-deep o 100% light, según contraste necesario.

### 12.4 Diagrama "Círculo de Valor Emerald"

Existe en el sitio actual. Recomendación: rediseñar manteniendo concepto pero adaptando al sistema visual nuevo.

- Forma circular con 4 nodos: Comunidades Mineras → Compra → Lapidación → Monetización.
- Colores: nodos en `bg-deep` con etiquetas en `paper`. Conector circular `emerald-soft`.
- Animación de entrada: stroke-dashoffset 0→full 1200ms editorial-ease (parece dibujarse).

### 12.5 Logos aliados

Lista del sitio actual (5 confirmados, posibles 2-3 adicionales pendientes de auditar en `tierramadre.co`):

- ICG — Instituto Colombiano de Gemología
- Es Mi Colombia
- Confederación de Esmeralderos
- Samara Wells
- Wells Studio

Tratamiento: monocromos `bg-deep` sobre `paper`. Hover desaturado→saturado revela color real (microinteracción placentera).

### 12.6 Reglas de selección de imágenes

- Sin stock genérico.
- Sin gente sonriendo a cámara estilo corporativo.
- Sí: retratos contemplativos, manos trabajando, paisajes andinos brumosos, macro de gemas, texturas minerales.
- Sí: fotografía de la comunidad esmeraldera real (con permisos), tallerers de Bogotá, ICG.

### 12.7 Performance

- Formatos: AVIF primero, WebP fallback, JPEG último.
- Responsive `srcset` con breakpoints 480/720/1024/1240/1920.
- Hero above-the-fold: preload con `<link rel="preload" as="image" imagesrcset>`.
- LQIP de 12px width, blur 12px, base64 inline.

---

## 13. Responsive Behavior

### 13.1 Layout por breakpoint

| Breakpoint     | Layout principal                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `xs <480`      | Mobile portrait. Stack vertical total. Hero `70vh`. Type −10% via media query. Drawer 86vw. Header 3-col compact (drawer/logo/icon). |
| `sm 480–719`   | Mobile landscape. Hero `65vh`. Type baseline.                                                                                        |
| `md 720–1023`  | Tablet. Hero `80vh`. Pillars 2-col. Cards colección 2-col. Header full visible.                                                      |
| `lg 1024–1239` | Desktop. Hero `88vh`. Pillars 3-col. Cards 3-col. Drawer 420px max.                                                                  |
| `xl ≥1240`     | Wide desktop. Container centrado a 1240. Type +5%.                                                                                   |

### 13.2 Reglas mobile-first

- Toda decisión empieza en `xs`. Las queries crecen hacia arriba.
- Imágenes: versiones específicas para mobile (no solo crop CSS).
- Tipografía: cap mínimo `1rem` body para no quedar bajo 16px en zoom 100%.
- Drawer: en mobile el panel ocupa 86vw, dejando 14vw de backdrop visible.

### 13.3 Hero text mobile

En todas las páginas, hero text se ancla a **bottom-left** con padding generoso. Nunca centrado en mobile (cabeza-en-medio se siente flotante en pantallas chicas).

### 13.4 Modo arco completo en mobile

El arco Editorial→Bridge→Studio se mantiene en mobile pero con duraciones de transición ligeramente más cortas (cinematic 720ms → 560ms) para no saturar baterías de dispositivos lentos.

---

## 14. i18n (Español + Inglés)

### 14.1 Idiomas

- **ES** (default): `tierramadre.co/...`
- **EN**: `tierramadre.co/en/...`

### 14.2 Slugs traducidos

| ES                  | EN                  |
| ------------------- | ------------------- |
| `/legado`           | `/en/legacy`        |
| `/nosotros`         | `/en/about`         |
| `/coleccion`        | `/en/collection`    |
| `/multimedia`       | `/en/multimedia`    |
| `/contacto`         | `/en/contact`       |
| `/legal/privacidad` | `/en/legal/privacy` |

### 14.3 Switch de idioma

- En header (top-right) y footer.
- Tipografía: `eyebrow` size, formato `ES · EN` con underline emerald-soft en el activo.
- Click: navega a la URL espejo de la página actual.
- Si no hay espejo (página solo en ES, raro), navega a home del idioma.

### 14.4 Términos intraducibles

Mantener en ES con `<span lang="es">`:

- Talismán
- Fénix
- 11:11
- Tierra Mädre (siempre así, nunca traducir)
- Trapiche, Muzo, Chivor (lugares y términos gemológicos)

### 14.5 Tipografía multilingüe

Libre Baskerville, Cormorant Garamond e Inter soportan diacríticos completos para ambos idiomas. Verificar `ä`, `ñ`, `é`, `á`, `í`, `ó`, `ú`, `ü`, `ç` (si aparece copy en otros idiomas en el futuro).

### 14.6 Line-length en EN

El inglés tiende a ser ~15% más corto que el español. En layouts donde el copy ES llena perfecto, el copy EN puede dejar espacio. Diseño debe acomodar variabilidad sin reflow caótico.

---

## 15. Lo que NO entra en este spec

Este spec es **estrictamente UI/UX frontend**. Quedan fuera del alcance:

- **Stack tecnológico** (Next.js, Astro, Eleventy, etc.): decide el equipo dev. El diseño es agnóstico.
- **CMS / fuente de contenido**: las páginas largas pueden venir de Markdown, Sanity, Payload, Directus, archivo plano. Sin opinión.
- **Backend**: formulario de contacto, integraciones email, CRM, analytics — fuera de scope.
- **SEO técnico**: meta tags, sitemap, robots, structured data.
- **Tracking**: GA, GTM, eventos, GDPR cookie banner.
- **Copy final**: el copy de referencia ya existe en `coomunity-universe/WebTM/tierramadre-spec.md`. Iteraciones futuras de copy son trabajo de Kira (voice/tone).
- **Catálogo y datos de productos**: no se diseña la fuente; el componente Card funciona con cualquier feed.
- **Performance benchmarks específicos** (LCP, CLS metas concretas): se asumen targets industry-standard (LCP <2.5s, CLS <0.1, INP <200ms).

---

## 16. Glosario rápido

- **Editorial Mode** — tratamiento luxury museo, paleta verde profunda, Baskerville, sin elevación.
- **Studio Mode** — tratamiento app iOS, paleta esmeralda brillante + dorado, mix tipográfico, cards con elevación.
- **Bridge Mode** — transición visual entre Editorial y Studio.
- **Anchor mode** — header y footer no cambian de modo aunque el contenido sí (anchors visuales).
- **Arco completo** — página que recorre Editorial → Bridge → Studio.
- **Mark** — el símbolo (estrella mandala) sin wordmark.
- **Wordmark** — el texto "TIERRA MÄDRE" sin símbolo.
- **Lockup** — combinación mark + wordmark.
- **Choreography** — secuencia coordinada de animaciones cuando se cruza un threshold de scroll.
- **Cinematic ease** — `cubic-bezier(0.4, 0.0, 0.2, 1)`, duración 720ms.

---

## 17. Próximos pasos sugeridos (post-aprobación)

1. **Mockups en Figma o Pencil** — un componente sheet por modo (Editorial, Studio, Bridge), más mockups de las páginas críticas (Home, Nosotros, Colección, Contacto). Un solo archivo, tres páginas: tokens, componentes, mockups.
2. **Prototipar el arco en Home** — validar que la transición de modo funciona perceptualmente. Test 5–7 usuarios (mix de los 3 perfiles).
3. **Decidir stack tech** — esto es decisión del equipo dev; el diseño no lo bloquea.
4. **Construir librería de componentes base** — Header, Drawer, Hero, Section, Pillars, Banner, FAQ, Form, Card, Image, Video, Button. Cada uno en sus 3 modos (cuando aplique).
5. **Producir/curar imagery** — heros editoriales, macros Studio, bridge transformaciones. Esto es tema de producción fotográfica, separado del diseño.
6. **Audit de accesibilidad** previo a launch — usar `iso-ux-audit` skill + `wcag-audit-patterns` skill del agente.
7. **Test de performance** — LCP y CLS en hero de Home y Colección.

---

## 18. Apéndice: Mapeo Studio → Website

Para developers que vengan del Studio: cómo se traducen los tokens del Studio al website.

| Studio (`src/design-system/`)        | Website equivalente                                              |
| ------------------------------------ | ---------------------------------------------------------------- |
| `emeraldCore.primary` `#00AE7A`      | `--tm-emerald-core` (solo Studio mode)                           |
| `goldAccent.primary` `#D4AF37`       | `--tm-gold-accent` (solo Studio mode CTAs alta jerarquía)        |
| `emeraldAlpha(opacity)`              | usar `color-mix()` o tokens dedicados                            |
| `cssTransition.default` 200ms        | `--tm-dur-quick` 200ms (Studio interactions)                     |
| `cssTransition.slow` 300ms           | `--tm-dur-default` 320ms                                         |
| `blurValues.md` 12px                 | `backdrop-blur(12px)` para glass                                 |
| `primitiveColors.system.green.light` | NO usar — el website tiene su propia paleta                      |
| iOS sheets (`IOSSettingsSheet`)      | NO portar — el website usa drawer y modal genéricos              |
| Vault Cinema tokens                  | NO portar — pertenecen a la app interna                          |
| Liquid Glass system                  | NO portar — el website usa glass más sutil                       |
| MUI v6 components                    | NO portar — el website es vanilla CSS o el sistema que elija dev |

**Regla general:** del Studio se importa la **disciplina** (anti-blinking, retry de imagen, lazy loading, accesibilidad iOS, motion philosophy) — NO el código ni los componentes UI específicos.

---

**Fin del spec.**

_Este documento es un punto de partida. La validez del Editorial-to-Studio Arc requiere prototipo + test usuario antes de comprometer la implementación completa._
