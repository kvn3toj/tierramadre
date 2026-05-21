# Lottery Landing — Tierra Madre

Carpeta con todo el material para el feature de **rifa de esmeraldas con grid de números reservables y comprobante por screenshot**.

## Archivos

| Archivo | Para quién | Contiene |
|---|---|---|
| **`PRD-lottery-landing.md`** | PM / negocio | Spec completo: problema, goals, user stories, flujos, reglas, métricas, edge cases, riesgos, roadmap, open questions. |
| **`DESIGN-SYSTEM-lottery.md`** | Diseño / frontend | Tokens (override del DS de TM con emerald + gold), tipografía, componentes, motion, accesibilidad, anti-patrones, checklist. |
| **`prototype.html`** | Todos | Mockup standalone interactivo (HTML + Tailwind-free CSS + JS vanilla). **Actualizado a L1 (light) / L5 (dark)** con tokens reales TM (`#00AE7A`, `#D4AF37`, vault-cinema palette en dark), Libre Baskerville, gem-stage rotando con shimmer, hero-stamp "Origen Muzo · Boyacá", coordinate footer. Funciona offline, sin build, en cualquier navegador. |
| **`reel-proposals.html`** | Marketing / IG | 3 propuestas visuales en 9:16 (1080×1920) listas para Instagram post / historia / reel. Botón **Descargar PNG** para exportar al pixel exacto. |
| **`reel-stories-pack.html`** | Marketing / IG | 4 variantes story-reel (D Vogue · E Cyber Neon · F Botanical · G Liquid Chrome). Mismo formato que la propuesta C, distinto lenguaje gráfico. Export individual o las 4 slides de una sola vez. |
| **`reel-tm-brand-pack.html`** | Marketing / IG · brand-true | 4 variantes construidas con los **tokens reales** de TM (emerald #00AE7A · gold #D4AF37 · Libre Baskerville · vault cinema palette · "ADN de PAZ"). H Claridad · I Bóveda Cinema · J Consciousness/Tiers · K Origen Muzo. |
| **`reel-tm-2slide-pack.html`** | Marketing / IG · 2 slides | 4 hibridaciones de H+K con solo 2 slides cada una. L Claro+Origen (universal · **con transiciones cinematográficas en slide 1**) · M Lote/Subasta · N Carta lacrada · O Anverso/Reverso. |
| **`reel-tm-1slide-pack.html`** | Marketing / IG · 1 slide | 3 layouts para meter TODO en un solo slide. P Poster Editorial (vertical hierarchy) · Q Boleta Troquelada (metáfora cultural) · R Dos Columnas φ (sacred geometry asimétrica). |
| **`reel-tm-L-variants.html`** | Marketing / IG · L family | 5 variantes de L (Claro+Origen) ancladas en dominios distintos del mundo TM. L1 Espécimen (vitrina museo) · L2 Acta de escritura (notarial asimétrica) · L3 Lámina de herbario (corchetes + nombre latino) · L4 Cartografía minera (concentric + cardinales) · L5 Chiaroscuro (dark con shale + glow). Cada una con silueta única al squint test. |
| **`reel-tm-L-hybrids.html`** | Marketing / IG · L hybrids | 5 hibridaciones que combinan 2-3 variantes L para crear siluetas únicas más fuertes que cualquier L pura. M1 Espécimen Cartografiado (L1×L4) · M2 Lámina Nocturna (L3×L5) · M3 Acta Cartográfica (L2×L4) · M4 Cartografía Nocturna (L4×L5) · M5 Espécimen Mineralógico (L1×L3×L4 triple). |
| **`IMPLEMENTATION-react-mui.md`** | Frontend / backend | Cómo encaja en el monorepo TM: estructura, routing, types, 6 endpoints API, hooks, schema Sheets, layout Drive, performance budget, testing. |

## Cómo abrir el prototipo

Doble click sobre `prototype.html` o desde terminal:

```bash
open docs/lottery/prototype.html
```

## Qué probar en el prototipo

1. **Customización del grid** (admin card visible para demo):
   - Click en `1-10`, `1-25`, `1-50`, `1-100`, `1-500`, `1-1000`
   - Custom: escribe cualquier número entre 5 y 9999
   - Cambia el precio
   - Toggle Roomy ↔ Compact
2. **Reserva de número:**
   - Click en cualquier tile blanco → modal con form
   - Completa nombre, WhatsApp, email + acepta términos
   - "Reservar y ver datos de pago" → vista de pago con timer
3. **Pago + upload:**
   - Tabs Nequi / Bancolombia / PSE
   - "Copiar" cuenta (queda con feedback visual)
   - Timer cambia: emerald → gold → rojo según tiempo restante
   - "Ya pagué — Subir comprobante" → drag & drop o click
   - Acepta JPG/PNG/HEIC/PDF
   - "Confirmar y enviar a revisión" → success state
4. **Vista admin (botón escudo en header):**
   - "Ejecutar sorteo" entre números vendidos → animación de ganador con halo dorado
   - "Reset" para volver a empezar
5. **Theme & idioma:**
   - Sol/Luna en el header → toggle light/dark
   - "ES / EN" → toggle bilingüe
6. **Estados a verificar:**
   - Disponible (blanco) — clickeable
   - Reservado por otro (dorado tenue) — toast "fue reservado en este momento" + sugerencias
   - Reservado por ti (verde con anillo dorado pulsante) — vuelve a la vista de pago
   - Vendido (verde oscuro con dorado) — no clickeable
   - Ganador (dorado con halo) — animación
7. **Responsive:**
   - Redimensiona la ventana — el grid recalcula columnas
   - <720px: legend wrap, modal pasa a bottom sheet
8. **Accesibilidad:**
   - Tab solo navega tiles disponibles
   - Focus ring visible
   - `prefers-reduced-motion`: animaciones reducidas

## Próximos pasos

1. Revisar `PRD-lottery-landing.md` — resolver las 5 open questions (§16).
2. Ajustar el design system en `DESIGN-SYSTEM-lottery.md` si hay feedback.
3. Decidir scope de fase 1 (sugerido: todo lo del PRD §3 Goals).
4. Kick-off de implementación siguiendo `IMPLEMENTATION-react-mui.md`.
5. Crear branch `feature/lottery-mvp` y arrancar por:
   - `LotteryConfig` types
   - Sheet schema + endpoint `lottery-public`
   - `<NumberGrid />` + `<NumberTile />`
   - `useLotteryGrid` con polling
6. Iterar.

## Notas de coherencia con TM

- **Imports del DS:** todo viene del barrel `@/design-system` (no se crea `design-system.ts`).
- **Modal en mobile:** `Drawer anchor="bottom"`, no `Dialog` — coherente con la migración documentada en la memoria del proyecto.
- **Anti-blink:** las imágenes del premio usan `<ProgressiveImage>` con `aspect-ratio` reservado y `useId()` por instancia (regla CLAUDE.md).
- **No emojis como icons:** todos los iconos son SVG inline o de Heroicons/Lucide.
- **i18n:** ES y EN en `src/locales/lottery.{es,en}.json`.

---

Hecho con verde esmeralda y dorado.
