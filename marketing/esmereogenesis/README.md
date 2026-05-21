# Esmereogénesis · Marketing Screenshots

6 slides at **1320 × 2868** (App Store iPhone 6.9"), exportable as PNG.
Marco de dispositivo: **iPhone 14** (notch, cuerpo midnight, switch de silencio + volumen + power).
Set completo en **dark mode** — paleta noche esmeralda + acentos oro.
Single static HTML, zero dependencies, no build step.

## Cómo usar

```bash
open marketing/esmereogenesis/index.html
```

O sirviendo localmente (recomendado para evitar restricciones de `file://`):

```bash
cd marketing/esmereogenesis && python3 -m http.server 4321
# luego abrir http://localhost:4321
```

Botones:

- **Exportar PNG** (por slide) → descarga ese slide.
- **Exportar todo** → descarga los 6 slides numerados (`01-…-1320x2868.png` … `06-…`).
- **+ / −** → ajusta el zoom del grid de previsualización.

## Narrativa (arco)

| #   | Slide               | Idea única                                   | Fondo dark                     |
| --- | ------------------- | -------------------------------------------- | ------------------------------ |
| 01  | **Hero**            | "Cultiva tu esmeralda."                      | Noche esmeralda + halo oro     |
| 02  | **Ritual**          | "Cada gota cuenta."                          | Noche profunda                 |
| 03  | **Racha**           | "Catorce semanas sin saltar un riego."       | Musgo oscuro + badge dorado    |
| 04  | **Jardín**          | "Crece cuando lo riegas."                    | Gradiente esmeralda            |
| 05  | **Lluvia generosa** | "Si la vida riega por ti, no perdiste nada." | Noche con bruma + gotas verdes |
| 06  | **Cierre**          | "Una esmeralda no se compra. Brota."         | Noche + gema cabuchón          |

Cada slide vende **una sola idea**. Headlines en Cormorant Garamond italic
para resonar con el resto del atelier (Ledger Hero, Bóveda Secreta).
Kickers en Cinzel uppercase para autoridad editorial. Sin "y" en titulares,
sin listas de features, sin jerga.

## Activos fuente

Las capturas reales están en `screens/`:

- `hub.png` — pantalla principal de Esmereogénesis
- `garden.png` — vista del jardín de una esmeralda
- `creation.png` — sheet de creación / aporte
- `onboarding.png`, `lluvia.png`, `aporte.png` — capturas adicionales reusables

Para refrescar: re-correr los QA scripts del feature y copiar los nuevos
`qa-*-360.png` aquí (las capturas a 360px se ven bien dentro del marco iPhone).

## Paleta y tipografía (dark mode)

- **Esmeralda** `#06513A` / `#00AE7A` / `#33C194`
- **Oro** `#D4AF37` / `#E5C866` (acento principal sobre dark) / `#8E6A12`
- **Noche esmeralda** `#0C2A22` · **Bruma** `#0A1A14` · **Musgo dark** `#142820`
- Text: crema `#F4EBD0` (titulares) · crema 72% (subtítulos)
- Display: Cormorant Garamond (italic) · Kicker: Cinzel · UI: Inter

## Marco iPhone 14

- Cuerpo midnight (gradiente aluminio en bordes) · radio 68px
- Notch pill 31.5% del ancho con altavoz + cámara TrueDepth tintada
- 4 botones laterales: silencio · vol+ · vol− (izq) · power (der)
- Pantalla redondeada a 54px, encaja capturas a 360px sin recortes

## Variaciones (próximos pasos)

Si quieres más resoluciones:

- **6.5"** → cambia `width / height` en `exportSlide` a `1284 / 2778`.
- **iPad 13"** → reescribe la rejilla con marco iPad y `2064 / 2752`.
- **Story 9:16** → recorta los slides existentes a `1080 / 1920`.
- **Reel 4:5** → recompón vertical a `1080 / 1350`.

El layout es resolution-independent (todo en %/px relativos a 1320×2868),
así que duplicar a otros tamaños es trivial.
