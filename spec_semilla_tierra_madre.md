# Spec de Video — "La Semilla de Tierra Mädre"

**Duración total:** 30 segundos
**Formato sugerido:** 9:16 (Reels/Stories) + máster 16:9 para YouTube/web
**Resolución:** 1080×1920 (vertical) / 1920×1080 (horizontal)
**FPS:** 24 (cinematográfico)
**Audio:** Voz en off en español (tono cálido, pausado, femenino o masculino grave) + música orgánica minimalista (cuerdas suaves, percusión andina sutil) + foley ambiente (viento, hojas, risas lejanas de niños en el cierre)

---

## Concepto creativo

Una metáfora visual construida en tres actos: **semilla → árbol → comunidad iluminada**. La esmeralda cushion de 2,2 ct "La Semilla" es el punto de pivote narrativo: aparece como si naciera de la tierra, y su luz verde chivor literalmente "enciende" el poste de luz de la vereda Chánares. El lujo se redefine como acto de compartir.

**Paleta:** verde chivor profundo, tierra húmeda, dorado cálido (atardecer), azul nocturno. Contraste entre la intimidad del gema en macro y la amplitud del paisaje rural colombiano.

**Tono:** contemplativo al inicio, emotivo al medio, celebratorio al cierre.

---

## Shotlist y timing

| # | Tiempo | Duración | Plano | Descripción visual | Voz en off | Audio/SFX |
|---|--------|----------|-------|--------------------|------------|-----------|
| 1 | 00:00–00:03 | 3s | Macro extremo | Una semilla real cae en cámara lenta sobre tierra húmeda oscura. Luz lateral suave. | "Todo empieza con una semilla." | Viento suave, golpe tierra sutil |
| 2 | 00:03–00:06 | 3s | Macro | La semilla reposa. Gota de agua cae junto a ella. Silencio casi total. | "Pequeña. Silenciosa. Casi siempre subestimada." | Gota de agua, respiro musical |
| 3 | 00:06–00:11 | 5s | Timelapse / transición orgánica | La semilla germina, un tallo crece, se transforma en un árbol frondoso que proyecta sombra sobre un grupo de personas de la vereda. | "Pero la Tierra Madre nos enseña algo: de una pequeña semilla puede nacer el árbol que da sombra y frutos a toda la comunidad." | Música empieza a crecer, cuerdas cálidas |
| 4 | 00:11–00:14 | 3s | Match cut → macro gema | Transición del follaje verde del árbol directamente al brillo verde chivor de la esmeralda cushion girando lentamente sobre fondo negro. Luz dramática revelando facetas. | "Esta es la Semilla de Tierra Mädre…" | Swell musical, tono reverente |
| 5 | 00:14–00:17 | 3s | Macro + texto superpuesto | Esmeralda sigue girando. Overlay tipográfico discreto: **"Cushion · 2.2 ct · Verde Chivor"**. | "…una esmeralda cushion de 2,2 ct, verde chivor." | Música sostenida |
| 6 | 00:17–00:21 | 4s | Plano medio | Manos femeninas colocándose la joya (anillo o colgante). Piel cálida, luz dorada de atardecer. | "Al elegirla, llevas un tesoro en la piel…" | Música cálida |
| 7 | 00:21–00:25 | 4s | Plano general nocturno | Vereda Chánares al anochecer. Un poste de luz se enciende con un destello verde y después luz cálida. Niños corriendo, risas, una cancha improvisada, familias reunidas. | "…y a su vez enciendes un poste de luz en la vereda Chánares. Una comunidad que hoy celebra, juega y se recrea en la oscuridad." | Risas de niños, música se vuelve celebratoria |
| 8 | 00:25–00:28 | 3s | Plano medio comunidad | Rostros reales sonriendo bajo la luz del poste. Cámara lenta sutil. | "Porque el verdadero lujo, es poder compartir." | Música en clímax emocional |
| 9 | 00:28–00:30 | 2s | Logo / cierre | Fondo negro. Logo Tierra Mädre en dorado + tagline. Destello verde sutil detrás. | "Tierra Mädre. Esmeraldas con ADN de Paz." | Último acorde sostenido |

---

## Tipografía en pantalla

- **Datos de la gema (shot 5):** tipografía serif elegante, tracking amplio, blanco puro con leve glow verde.
- **Tagline final (shot 9):** logo oficial + "Esmeraldas con ADN de Paz" en itálica serif dorada.
- **Evitar:** textos largos, subtítulos automáticos encima del rostro de la comunidad.

## Transiciones clave

- **Shot 3 → 4:** match cut del verde del follaje al verde de la gema. Es la transición más importante del spot — conecta naturaleza y joya como una sola esencia.
- **Shot 6 → 7:** el brillo de la gema en la piel hace un "flash" sutil que disuelve al encendido del poste de luz. Visualiza la promesa: elegir = iluminar.

## Referencias visuales sugeridas

- Campañas de Cartier "Nature" series (macro joya + naturaleza)
- Documentales de *National Geographic* sobre Colombia rural
- Tono de color de películas como *Embrace of the Serpent*

---

## Plan de producción con vidgen

### Opción A — Híbrido (recomendado)
Combina material real filmado con generación AI para los planos difíciles:

1. **Material real necesario:**
   - Macro de la esmeralda real (shots 4, 5) — filmado con macro lens
   - Manos con joya (shot 6) — sesión simple con modelo
   - Vereda Chánares (shots 7, 8) — si hay footage de la comunidad real, priorizarlo siempre

2. **Generado con `vidgen generate` (AI):**
   - Shot 1–2: semilla cayendo en tierra (prompt cinematográfico macro)
   - Shot 3: timelapse de germinación a árbol (el más complejo — probablemente 2–3 generaciones y un corte)

3. **Animado con `vidgen animate`:**
   - Logo final (shot 9) con `--motion zoom-in` y prompt de "destello verde sutil"

4. **Post con `vidgen transform`:**
   - Corrección de color unificada (efecto `vintage` suave o filtro custom `eq=saturation=1.1:contrast=1.05`)
   - Vignette ligero en shots íntimos
   - Ensamble final en timeline externa (DaVinci / Premiere) por la complejidad del audio

### Opción B — 100% AI (prototipo rápido)
Si se necesita una preview antes de producir material real, generar los 9 shots con `vidgen generate` en duraciones cortas, ensamblar con `vidgen frames assemble` + audio por separado. Sirve para validar ritmo y guion con el equipo antes de invertir en filmación.

### Prompts sugeridos para `vidgen generate`

- **Shot 1:** `"Extreme macro of a single small seed falling slowly onto dark wet soil, soft side lighting, cinematic shallow depth of field, dust particles in the air, 4k"`
- **Shot 3:** `"Timelapse of a seed germinating and growing into a large tree providing shade over a small Colombian rural community, golden hour, cinematic, realistic, emotional"`
- **Shot 7:** `"Wide shot of a small Colombian mountain village at dusk, a streetlight turning on with a subtle green flash, children playing, families gathered, warm light, documentary style"`

---

## Entregables

- Máster vertical 9:16 (30s) — Instagram Reels / TikTok / Stories
- Máster horizontal 16:9 (30s) — YouTube / web
- Versión 15s (recorte de shots 4, 5, 6, 7, 9) para pauta paga
- Still key frame (shot 4, esmeralda girando) para post de feed
- Archivo de voz en off aislado para uso en radio / podcast

---

## Notas finales

El corazón del spot es la idea de que **la gema y el poste de luz brillan con el mismo verde**. Todo el diseño de color y las transiciones deben reforzar esa equivalencia visual. Si hay que recortar algo por tiempo, el shot 2 es el más sacrificable; los shots 3, 4, 7 y 8 son intocables porque cargan la narrativa completa.
