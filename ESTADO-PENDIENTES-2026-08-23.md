# Estado y pendientes — Tierra Mädre

**Actualizado:** 23-ago-2026, 19:10 (Bogotá) · reemplaza la versión de la mañana

---

## 0. Bloqueante — antes de cualquier escritura

**Fuga de datos en producción.** Nueve ítems publicados llevan en `observacion` el texto literal
*"Piso de negociación … INTERNO, no se anuncia"*, con la cifra exacta. `products:getPublicByItem`
lo devuelve **sin autenticación**: cualquiera con el número de ítem lee el piso de negociación.

Confirmado en #482, #544, #545, #546, #549, #550, #551, #553, #554.

`PROMPT-correcciones-546.md` escribe `observacion` en **modo append**: si se corre antes de limpiar,
conserva y extiende la fuga. **Orden obligatorio: limpiar primero, aplicar después.**

---

## 1. EL LOTE ORIGEN — mapa completo (nuevo, 23-ago)

### Qué es

`C-017`, duplicado como `S-001`. Edwin Mauricio Ruiz, *"Lote Origen que se movió por todo el mundo"*.
**47,47 ct · 18 unidades · $378.000.000** ($7.962.924/ct en bruto).

**Ningún ítem lo referencia por `loteId`.** Cero filas apuntan a C-017 o S-001; los ítems viven en
C-090 y C-069 y sus notas dicen literalmente *"loteId sin tocar"*. El lote existe en la pestaña
Lotes sin miembros.

Lo que sí lo identifica es el **número de reporte** y la etiqueta `Lote Origen · 00-N` en `observacion`.

### Dónde viven los certificados

**No están en el SOT ni en Anima.** El SOT tiene un solo `certificadoUrl` en 513 ítems, y sus
`F1`/`F2` son **otro sistema de calidad**, no estos reportes. Anima no tiene ala de Tierra Mädre.
La única fuente es la **presentación "Ver lote Origen"**:

`https://docs.google.com/presentation/d/1ynkvclgEPGM3epnoecqzm1DZ8bKv024dQPXC3jqnU_U/edit`

18 certificados: **9 Extrafine NO OIL + 9 Fine F2 moderado**.

### Los 9 Extrafine NO OIL, cruzados con ítem

| # | Reporte | ct | Ítem | Calidad en SOT | Tarifa aplicada |
|---|---|---|---|---|---|
| 1 | 025890 | 4,11 | #544 Viaje Estelar | `F1` ❌ | Extrafine ✅ |
| 2 | 025893 | 3,87 | #546 Planeta Verde | `NO OIL` ✅ | Extrafine ✅ |
| 3 | 025892 | 2,31 | #549 Luz de la Montaña | `F1` ❌ | Extrafine ✅ |
| 4 | 025891 | 2,15 | #545 Sentir de la Montaña | `F1` ❌ | Extrafine ✅ |
| 5 | 028563 | 1,48 | #551 Latido de la Tierra | `F1` ❌ | **Fine** ⚠️ |
| 6 | 028565 | 1,00 | #550 Libertad | `F1` ❌ | **Fine** ⚠️ |
| 7 | 025887 | 0,92 | #482 Destino | `NO OIL` ✅ | Extrafine ✅ |
| 8 | 028564 | 0,89 | #483 Gratitud | `NO OIL` ✅ | **sin costear** ⚠️ |
| 9 | 028562 | 0,84 | #553 Alma Ancestral | `F1` ❌ | **Fine** ⚠️ |

**Seis de nueve tienen la calidad mal.** Solo #546, #482 y #483 están correctos.

### Los 9 Fine F2 moderado

| Reporte | ct | Ítem |
|---|---|---|
| 028619 | 4,44 | #484 Magia — SOT dice `Extra Fina F2`, el "Extra" sobra |
| 028613 | 0,89 | #554 Arrecife — SOT dice `F1`, debe ser `F2` |
| 028298 | 2,88 | **sin ítem** |
| 028618 | 2,64 | **sin ítem** |
| 028617 | 2,15 | **sin ítem** — descartado como duplicado de #545 por dimensiones (8,45 × 7,35, esmeralda) |
| 028616 | 1,70 | **sin ítem** |
| 028615 | 1,56 | **sin ítem** |
| 028614 | 1,06 | **sin ítem** |
| 028694 | 12,04 + 0,92 diam. | **sin ítem** |

Ninguno de los 7 libres cuadra con #547 (1,83 ct) ni #548 (2,20 ct): **las gemas de los dos anillos
no tienen certificado.**

### La presentación no es el universo completo

**#552 Corazón Valiente no está entre los 18.** Su reporte es el **025888**, que cae justo en el
hueco del bloque Origen (025887 … 025890) junto con el **025889**, y ninguno de los dos aparece.
La lectura directa del PDF dice *"sin indicaciones de embellecimiento"* ⇒ **NO OIL**, y sería el
décimo. Faltan por ubicar el 025889 y, con él, al menos un certificado más.

---

## 2. El subcosteo — $29,98 M (decisión pendiente)

**La tarifa se asignó por serie de certificado, no por el tier que dice el certificado.** Toda la
serie 0258xx cobró Extrafine ($10.058.404/ct) y toda la 0285xx/0286xx cobró Fine ($3.723.563/ct).
Pero Extrafine **cruza las dos series**: 028562, 028563, 028564 y 028565 son Extrafine NO OIL y
quedaron costeadas a tarifa Fine.

| Ítem | Costo hoy | A tarifa Extrafine | Diferencia |
|---|---|---|---|
| #551 Latido | $5.510.873 | $14.886.438 | **+$9.375.565** |
| #550 Libertad | $3.723.563 | $10.058.404 | **+$6.334.841** |
| #553 Alma Ancestral | $3.127.793 | $8.449.059 | **+$5.321.266** |
| #483 Gratitud | $0 | $8.951.980 | **+$8.951.980** |
| | | **total** | **$29.983.652** |

Al markup ×4,5 del lote son **$134,9 M** de precio de lista: cuatro piedras No-Oil ofertándose como
si fueran aceitadas.

**No aplicar todavía.** Hay una lectura alternativa: las notas hablan de *"Lote Origen"* y
*"Lote 170"* como **dos compras distintas**. Si $3.723.563/ct es lo que realmente costó el Lote 170,
el costo está bien y lo único mal son las etiquetas de calidad.

> **Lo que inclina la balanza:** las notas citan como fuente de la tarifa
> *"tablas Extrafine/Fine + presentación Ver lote Origen"* — o sea, el rate **salió del tier**,
> no de una factura.
>
> **Decisión que desbloquea esto:** ¿existe factura separada del Lote 170? Si no existe, el
> recosteo procede.

---

## 3. El conflicto GIA — bloquea el punto 2

Tres de los nueve Extrafine NO OIL tienen reporte GIA que dice lo contrario:

| Ítem | Presentación | GIA (jun-2026) |
|---|---|---|
| #544 Viaje Estelar | 025890 · **NO OIL** | 2231993415 · `Clarity Enhanced (F1)` |
| #545 Sentir de la Montaña | 025891 · **NO OIL** | 2235993538 · `Clarity Enhanced (F1)` |
| #550 Libertad | 028565 · **NO OIL** | 2235993408 · `Clarity Enhanced (F1)` |

Las medidas coinciden al centésimo en los tres ⇒ son las mismas piedras. Un laboratorio local de
2024–2025 dice sin aceite; GIA en 2026 dice aceitada.

**Esas tres sostienen la tarifa Extrafine.** Si GIA tiene razón, el problema no es de etiquetas sino
de la valuación del lote entero — y el recosteo del punto 2 iría en la dirección opuesta. Con GIA de
por medio, la carga de la prueba la tiene la presentación.

**Resolver esto antes que el punto 2.**

---

## 4. Correcciones seguras — no dependen de nada

Estas se pueden aplicar ya, porque no tocan costo ni dependen del conflicto GIA.

### Calidad (del certificado, no del lote)

| Ítem | Hoy | Debe ser |
|---|---|---|
| #544, #545, #549, #551 | `F1` | `NO OIL` |
| #550 | `F1` | `NO OIL` |
| #553 | `F1` | `NO OIL` |
| #552 | `F2` | `NO OIL` |
| #554 | `F1` | `F2` |
| #484 | `Extra Fina F2` | `Fine F2` |

> Con la salvedad de que #544, #545 y #550 quedan **congelados** hasta resolver el punto 3 — su
> certificado local dice NO OIL pero su GIA dice F1.
> Aplicables sin reserva: **#549, #551, #553, #552, #554, #484**.

### Pesos

- **#553 Alma Ancestral: 0,86 → 0,84.** La presentación dice 0,84 y su costo es exactamente
  0,84 × $3.723.563. Esto explica el −2,33% de desviación de tarifa que llevaba días sin causa.
- **`C-090.pesoTotalQuilates`: 21,21 → 21,25.** El desfase de 0,04 es el ajuste 0,52 → 0,56 de #552,
  que se aplicó al ítem pero no al total del lote.

### Medidas (3 ejes, del certificado)

| Ítem | Hoy | Certificado |
|---|---|---|
| #483 Gratitud | *vacío* | 6,02 × 6,78 × 4,35 |
| #545 | `10.09 × 5.59` | 10,09 × 5,59 × **4,80** |
| #550 | `6.78 × 5.44` | 6,78 × 5,44 × **4,16** |
| #551 | `9.5 × 7` | 9,58 × 7,01 × 4,16 |
| #552 | `5.46 × 5.02` | 5,01 × 5,45 × 4,08 |
| #546 | `13.40 × 6.47 × 5.48` | orden del cert: 6,47 × 13,40 × 5,48 |

También: #483 tiene `color` vacío ⇒ **Verde Vívido**.

---

## 5. Costeo de #552 — CORREGIDO

**El número que di en la mañana estaba mal.** Le apliqué la tarifa baja ($2.085.195). El número de
certificado lo desmiente: **025888 cae dentro del bloque del Lote Origen** (025887–025893), no en la
serie 0285xx del Lote 170. La nota que ya estaba en el ítem lo tenía previsto —
*"SIN COSTAR hasta definir el lote: Lote 170 → $1.936.253, Lote Origen → $5.230.370"* — y ese
$5.230.370 es exactamente 0,52 × $10.058.404. El certificado resuelve esa decisión abierta.

Con el peso corregido a 0,56:

> **#552 → `costoBaseCOP = $5.632.706`** (0,56 × 10.058.404) · **`precioFinalCOP = $25.347.177`** (×4,5)

Sujeto al mismo conflicto GIA del punto 3 si la tarifa Extrafine cae.

**#548 Anillo Semilla** sigue en `costoBaseCOP = 0` y sin certificado. Ninguna tarifa reproduce su
precio de $36.200.000 ⇒ es joya, necesita **Regla B** (Σ precio gema + costo de joyería). Su nota
deja las dos hipótesis abiertas: Lote 170 → $8.191.838, Lote Origen → $22.128.488.

**C-069** sigue sin `costoTotalCOP`. Los $65.000.000 del "Lote piedra Lágrima" no están en Lotes, y
la nota de #484 deja abierto si esa piedra sale de ahí ($14.639.640/ct) o del Lote 170 ($16.532.620).

---

## 6. Prompts entregados sin ejecutar (4)

| Archivo | Qué hace | Estado |
|---|---|---|
| `PROMPT-verificacion-estado.md` | Verificación solo-lectura post-sync | **entregado 23-ago, sin correr** |
| `PROMPT-produccion-c068.md` | Envío a producción de topitos (48 uds + 1 de Isa) | sin correr |
| `PROMPT-correcciones-546.md` | Correcciones #546 | sin correr — **ver §0** |
| `PROMPT-correcciones-544.md` | Correcciones #544 | sin correr |
| `PROMPT-etiquetas-nombre.md` | Arregla el truncado "Sentir de la M…" | sin correr |

Payloads en `scripts/.data/*.json`.

**Trampa de sincronización:** `onEdit` es un trigger simple y **no dispara con escrituras de API**.
Después de escribir hay que correr a mano «🔄 Convex Sync → Sincronizar todo (completo)».
`syncStatus: 'synced'` **no** prueba que aterrizó — hay que releer y localizar por encabezado nombrado.

---

## 7. Trabajo de plataforma sin empezar

- **`certificadoUrl` es un campo único.** No alcanza: hay ítems con reporte GIA *y* certificado local
  de la presentación. Hay que pluralizarlo o darle un campo compañero.
- **PDFs en el carrusel.** `ProductDetailPage.tsx:325` los descarta explícitamente:
  ```js
  if (/\.pdf(\?|#|$)/i.test(certUrl)) return mediaItems;
  ```
  Todos los certificados son PDF ⇒ hoy **ninguno** puede entrar al carrusel. Necesita miniatura de
  página 1, replicando el patrón `thumbnailUrl` que ya usan los videos.
- **Subir los 18 + los GIA a Drive** y enlazarlos. Tengo scope de escritura; #545 no tiene
  `carpetaFotosUrl`.
- **Vincular el Lote Origen.** C-017/S-001 tiene 18 unidades declaradas y 0 ítems enlazados.
  Decidir si se corrige `loteId` o si se mantiene la trazabilidad solo por `observacion`.
- **C-017 y S-001 están duplicados** — mismos 47,47 ct / $378.000.000 / 18 uds, dos filas.

---

## 8. Deuda de datos

- **22 ítems con un valor de ESTADO en la columna Colección** (#350, #381, #425–#428, #441, #467,
  #482–#484, #498, #525–#532, …). Corrimiento sistemático de columna.
- **#441 "Vida"** necesita diferenciador — #311 y #441 son piedras distintas. Propuestas:
  "Vida II" / un nombre propio / "Vida (C-077)". **Falta tu elección.**
- **Bug real en `wrap()`** de `scripts/gen-etiquetas-tiras.py` (~95-99) y
  `scripts/gen-etiquetas-thermal.py` (~75-79): compara conteos de caracteres, y `text.split()`
  normaliza dobles espacios y saltos de línea ⇒ "…" falso en #244, #89, #295, #218.
  Arreglo: `if " ".join(lines) != " ".join(text.split()):`
  Es **separado** del truncado NIIMBOT de `LabelDuoPreview.tsx`, que cubre `PROMPT-etiquetas-nombre.md`.

---

## 9. Decisiones que dependen de ti

1. **¿Existe factura separada del Lote 170?** Desbloquea el recosteo de $29,98 M del §2.
2. **Conflicto GIA vs. presentación** (§3) — con GIA de por medio, ¿se congela la tarifa Extrafine
   hasta re-certificar, o se sostiene la presentación?
3. **Nombre para #441.**
4. **¿De qué lote sale #484 Magia?** ($65.000.000 del Lote Lágrima vs. Lote 170.)
5. **Política de "Verde Muzo"** — el "Muzo" lo afirma la tanda de certificación de jun-2025
   (#551, #483, #484) y lo calla la de dic-2024 (#546, #552). El silencio no es evidencia en contra.

---

## Certificados que aún faltan

**Sin ítem asignado (7 Fine):** 028298, 028618, 028616, 028615, 028614, 028694 — y 028617 descartado.
**Sin ubicar:** 025889 (y lo que haya en el hueco del bloque Origen).
**Sin certificado:** #547 Anillo Tiempo, #548 Anillo Semilla.
