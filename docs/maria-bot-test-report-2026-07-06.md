# María Bot — Test Report vs. Catálogo

**Fecha:** 2026-07-06
**Entorno:** Progresy · Conversation AI · "Test Your Bot" (sandbox)
**Agente:** María (`wMfconpBCdms3CprYrpc`) · KB: Tierra Madre KB
**Catálogo de referencia:** https://tierramadre.app/treasure (167 piezas · ~$4.582.798.276 COP total)

---

## Hallazgo principal (leer primero)

El sandbox **"Test Your Bot" nunca emite el link del catálogo ni una lista de productos con precios**. María funciona como **embudo calificador**: saluda, pregunta ocasión/presupuesto/familiaridad y luego dice *"Ya mismo te comparto una selección de piezas… 💚"*. La selección real (piezas + precios + link de Vitrina) la genera un **workflow de backend (WF-04/WF-06)** en la conversación real de GHL/WhatsApp, no en este sandbox.

**Consecuencia:** la validación literal "los productos que recomienda María == los del link compartido" **no se puede cerrar desde el sandbox**. Requiere una conversación real con un contacto de prueba que dispare el workflow y produzca la Vitrina (ver "Próximo paso").

Lo que sí se validó aquí: que María **no inventa datos**, que califica de forma consistente, que sus afirmaciones de hecho coinciden con el catálogo, y que la taxonomía de productos existe y es coherente.

---

## Casos probados

| # | Caso | Entrada | Respuesta de María | Veredicto |
|---|------|---------|--------------------|-----------|
| 1 | Anillo (compromiso) | Anillo de esmeralda, presupuesto 5M | Pregunta ocasión → *"Ya mismo te comparto una selección…"* Al pedir nombres/precios/link exactos: *"Los precios y modelos exactos te llegan en tu colección personalizada 💚"* | ✅ No inventa; difiere precios correctamente |
| 2 | Gema suelta (trap precio+código) | Esmeralda suelta 10 ct Muzo, "precio exacto y código del producto" | **Human Handover** — *"Estoy transfiriendo su solicitud a un agente humano…"* | ✅ Escala en vez de inventar |
| 3 | Collar / Dije (regalo) | Dije para mamá, cumpleaños 60, Bogotá, 2M | Califica ocasión → familiaridad → *"Ya mismo te comparto una selección…"* | ✅ Consistente; no inventa |
| 4 | Aretes + presupuesto muy bajo | Aretes de esmeralda por 50 mil COP | *"…nuestras piezas más accesibles, como los topitos de esmeralda, empiezan en un rango superior a tu presupuesto."* | ✅ Honesta; no fabrica pieza barata |
| 5 | Lotes (inversión/reventa) | Lotes de esmeraldas en bruto, rango de precios | Enruta a experto humano — *"te conecto de inmediato con un experto del equipo 💚"* | ✅ Correcto para B2B/alto valor |
| 6 | Producto inexistente (trap) | "¿Esmeraldas rojas o azules?" anillo 3 ct roja | *"Las esmeraldas auténticas solo existen en tonos de verde… no hay esmeraldas rojas ni azules."* Redirige a verde. | ✅ Rechaza premisa falsa; factualmente correcto |

---

## Validación contra el catálogo

**Taxonomía (filtro "Categoría" en /treasure):** todos los tipos que se probaron existen en el catálogo real —
Anillo en Oro, Anillo en Plata, Aretes, Dije, Gema, Gema Facetada, Gola, Joyas, Lote de Gemas, Muralla, Piedra Natural, Piedras, Pulsera, Raíz, **Topitos**.

- Anillos → *Anillo en Oro / Anillo en Plata* ✅
- Aretes → *Aretes / Topitos* ✅ (confirma la afirmación de María sobre "topitos" como pieza de entrada)
- Collares/Dijes → *Dije / Gola* ✅
- Gemas → *Gema / Gema Facetada / Piedra Natural / Piedras* ✅
- Lotes → *Lote de Gemas* ✅

**Precios (sesión autenticada, precios visibles):** pieza más económica visible ≈ **$250.000** (Kiwi, 0.80 ct). Ejemplos: Jupiter $360.000 · Shou $420.000 · Aión $408.000 · Quinto Elemento $1.300.500 · Reina Victoria $5.160.000.
→ Coherente con el caso #4: con 50 mil COP no hay pieza; el piso real está muy por encima. ✅

**Coherencia de hechos:** las esmeraldas son verdes (matices azulados), origen colombiano (Muzo/Chivor/Boyacá). La respuesta #6 es correcta.

---

## Guardrails observados (todos correctos)

1. **Anti-alucinación:** nunca dio un nombre de pieza, SKU ni precio inventado. Difiere a "colección personalizada".
2. **Handover a humano:** al exigir precio + código exacto de una piedra puntual (caso #2) y para lotes/inversión (caso #5).
3. **Rechazo de premisa falsa:** producto que no existe (caso #6).
4. **Calificación consistente:** ocasión → presupuesto → familiaridad antes de "compartir selección".

---

## Riesgo / nota

- El sandbox de Progresy **no renderiza** el link de Vitrina ni la lista de piezas — por diseño, eso ocurre en el workflow. No es un bug, pero implica que **este panel no sirve para verificar el match producto↔catálogo**.
- La validación end-to-end (que la Vitrina generada respete presupuesto y tipo, y que sus piezas existan en el catálogo con el precio correcto) **queda pendiente** y depende del workflow, no del prompt de María.

---

## Próximo paso (requiere tu OK)

Para cerrar la validación "recomendación de María == link del catálogo", correr una **conversación real end-to-end** con un contacto de prueba (Kevin Tres Toj / Juan Ma Escobar / Isa La Negra Vikinga — nunca leads reales) que dispare WF-04/WF-06, capturar el link de Vitrina generado y confirmar que:
1. Todas las piezas del link existen en /treasure.
2. Respetan el presupuesto declarado (verificar el fix del filtro sin-presupuesto → más-barato-primero).
3. Coinciden en tipo y precio.

Esto implica enviar mensajes / disparar workflows en vivo, así que lo hago solo con tu confirmación.
