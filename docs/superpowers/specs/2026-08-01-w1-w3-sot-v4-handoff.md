# Handoff — W1–W3 sobre Fotosíntesis web + SOT v4 · contexto para el implementador

- **Fecha:** 2026-08-01 · **Para:** la sesión que implemente el plan `2026-08-01-w1-w3-sot-v4-fase1.md`
- **Qué es esto:** todo el contexto que necesitas y que NO está en el plan. Léelo completo antes de la Task 0.

## El proyecto en una frase

Trasladar el modelo de precios y captura de Tierra Madre (hoy en hojas frágiles + páginas sueltas)
a wizards web sobre Convex como fuente única (SOT v4), con espejo push-only al spreadsheet —
de modo que la estructura de captura garantice por diseño lo que la hoja no puede garantizar
por disciplina.

## Documentos fuente (en orden de lectura)

En el vault Obsidian (`/Users/kevinp/Movies/coomunity-universe/Obsidian/Anima/Wings/Projects/TierraMadre/architecture/`):

1. `2026-08-01-w1-w3-fotosintesis-web-gap.md` — el análisis de brecha que originó este plan
2. `2026-07-31-spec-wizards-fotosintesis.md` — la spec de los 5 wizards (modelo 2-Cerebros, reglas duras §4)
3. `2026-07-31-spec-sot-v4-simplificado.md` — la spec de SOT v4 (inversión pull→push, fases dev→prod)
4. `2026-08-01-diseno-wizards-ui-telegram-miniapps.md` — el mapa de formas de UI por wizard
5. `../tareas/2026-07-31-decisiones-sot-v4-checklist.md` — estado de las 6 decisiones
6. `../References/tierramadre-modelo-fijacion-precios-v2.md` — las fórmulas crudas y casos reales del motor

## Decisiones TOMADAS (no re-preguntar)

| # | Decisión | Valor |
| --- | --- | --- |
| D1 | Alcance técnico de W1–W3 | **Fotosíntesis web**, evolucionando páginas existentes, cableado a SOT v4 (Kevin, 2026-08-01) |
| D2 | Divisor del gasto fijo | **Lotes**: `COUNT(lotes activos)`, activo = ≥1 unidad no vendida. Parametrizado, no hardcodeado |
| D3 | Companion TM-App-Data | Cotizaciones se congela; Invitations/UserPreferences/Feedback migran a Convex; ProductViews no |
| D4 | Espejo | **Push-only**: la hoja nunca es origen. WRITABLE existentes se revisan uno a uno (ver plan, Fase E) |
| D5 | Regla fiscal | Gema: comisión 10%, IVA 0%, divisor 0,60 · Joya: comisión 10%, IVA 19%, divisor 0,41 |
| D6 | Costo por pieza | Capturado (identificación específica), JAMÁS prorrateado del lote |

## Decisiones PENDIENTES (no bloquean fases A–D; bloquean prod)

- Los 5 lotes con diferencia real de costos (7, 15, 17, 19, 30): qué fuente manda al migrar.
- Revisión gema/joya ítem por ítem del inventario existente (sesión de Kevin, por excepciones).
- Libros de Vikinga: espejo o congelados.
- Si encuentras que una de estas bloquea antes de lo previsto: PARA y repórtalo.

## Estado del terreno (verificado 2026-08-01)

- **Repo TierraMadre**, rama `main` al día (`62c9154`). Trabaja en rama nueva `feat/w1-w3-sot-v4`.
- Convex: prod `grand-hippopotamus-162` (**PROHIBIDO en este plan**), dev `flexible-wolverine-803`.
- Schema ya tiene: `lots` (con estados y syncFields), `lotItems` (costoBaseCOP + preponderancia),
  `sales`, `asesorMovements`, `subLotes` (push-only), `providers`, `clients`, `sequences`.
- Páginas base: `CapturaLotePage.tsx` (wizard por pasos, 3315 líneas), `EscanearPage` (QR),
  `VentaPage`/`VentaDetailPage`, `MovimientosKardexPage`, `LotesPage`/`LoteResumenPage`.
- Ya existen en `convex/_lib/`: `lotMath.ts`, `precioEspecial.ts` (regla de temporada — reusar
  para «regla vigente con fecha»), `columnMaps.ts` (mapeo a hoja), `authz.ts`.
- **El motor de precios NO existe en este repo** — vive en anima-bot `src/cotizador/precios.ts`
  (calcularK, precioVenta) y `estimar.ts`. Se porta con paridad pinneada (Fase A).

## Números de paridad del motor (la verdad contra la que se valida el port)

- Gasto fijo mensual $33.651.815 ÷ 76 lotes = **$442.787** por lote.
- Lote 10 (gemas, /0,60): K=$1.383.809 → objetivo **$2.306.348** (2,47×). Ítems 372–375 cuadran al peso.
- Lote 14 (joya, /0,41): K=$1.345.874 → objetivo **$3.282.620** (3,67×).
- Ítem 295 montado: oro 18k **$3.438.059** (K $2.148.787) · plata 925 **$1.502.059** (K $938.787).
- Anti-prorrateo: «Choker + Piedra» = **$119.999** capturado, nunca $67.499.
- Remate hasta 2026-08-31: gema K×1,3 · joya K×1,6; el 1/09 vuelve K/0,60 y K/0,41.
- Equilibrio real (que la hoja no calcula): gema K/0,90 · joya K/0,71.

## Trampas conocidas de este repo (no re-descubrirlas)

- Dos rutas de pull con allowlists distintas (`products:_pullFromSheet` vs `fotoSync:runFull`) —
  no agregues una tercera; el espejo v4 es push, no pull.
- Prohibido leer/escribir la hoja por índice posicional — solo cabeceras nombradas (`columnMaps.ts`).
- Cambio de proyección en query pública de Convex = desplegar frontend y Convex JUNTOS (incidente
  «$0 desde el ítem 318»).
- `products:getManyByItemIds` proyecta 11 campos fijos — ausente en query proyectada ≠ ausente en la base.
- Env vars de spreadsheet en Vercel prod están VACÍAS (prod cae a legacy) — no las toques en este plan.

## Riesgos principales

1. **Doble motor divergente** (anima-bot vs Convex) — mitigación: tests de paridad pinneados (Fase A DoD).
2. **Romper CapturaLotePage en producción de uso** — mitigación: rama + flag; la página vieja sigue
   siendo la default hasta el cutover de SOT v4 Fase 3 (fuera de este plan).
3. **El espejo escribe a la hoja viva de v3** — mitigación: TODO el espejo de este plan apunta al
   libro nuevo «SOT v4 · Espejo (PRUEBAS)»; jamás al SOT v3.

## Qué NO está en el alcance de este plan

W4 (cotización IA — vive en anima-bot/GHL) · W5 más allá del enlace de graduación · migración de
datos v3→v4 (es Fase 2 de SOT v4, script aparte) · cutover a prod · Mini App de Telegram ·
la limpieza de tiers deprecated del schema.
