# C-068 · corrección de peso del lote y envío a producción

Tercera corrida sobre el mismo SOT v3. Las dos anteriores
(`PROMPT-implementar-inventario-manuscrito.md` y `PROMPT-addendum-inventario-manuscrito.md`) ya
aterrizaron. Esta corrige un error de origen en el lote C-068 y registra el envío a producción.

- **Hoja:** `1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U` — pestañas `Inventario` (gid `1819792669`) y **`Lotes`**.
- **Payload:** `scripts/.data/produccion-c068-2026-08-12.json`
- **Mismas reglas de siempre:** dry-run por defecto, localizar por cabecera nombrada y por clave (`itemId` / `loteId`), backup en `scripts/.backups/`, `observacion` se **anexa**, no se escribe en J.
- Script sugerido: `scripts/aplicar-produccion-c068-20260812.mjs`.

## El hallazgo

**C-068 pesa 10,71 ct, no los 8,20 declarados.** Está subvaluado un 31%.

Maritza pesó físicamente las 29 gemas que van a topitos: **7,24 ct**. Las 19 unidades restantes,
estimadas a **0,01703 ct/mm²** — tasa calibrada con los 8 ítems del propio C-068 que sí tienen peso
medido — dan 3,47 ct más.

El resultado es robusto: da 10,71 tanto si las 16 piedras ya pesadas del SOT están entre los
topitos como si están entre las baguettes, porque 2,90 ct / 16 uds **es** la tasa promedio que se
usa para estimar el resto. La ambigüedad se cancela.

Eso mueve la tarifa del lote a **$68.627/ct**, y deja fuera de lugar las dos que veníamos manejando:
el manuscrito costeaba a $90.740/ct (32% alto) y la hoja hoy reparte por unidad a $15.312,50 parejo,
entre piedras que van de 0,18 a 0,25 ct.

## ⛔ El recosteo NO va en esta corrida

Es la decisión importante de este prompt, y quiero que quede clara antes de que la implementes.

Solo **16 de las 48 unidades** de C-068 tienen peso medido. Recostear esas 8 filas con la tarifa
nueva las bajaría de $245.000 a $199.021 — y dejaría **$535.979 del lote sin repartir** entre las 40
unidades restantes. El lote pasaría de cerrar exacto por unidad a no cerrar por ninguna vía.

Lo que hace esta corrida es corregir **el peso**, que es el dato de origen del error. El recosteo
espera a que se pesen las 17 baguettes de anillo. Preview de lo que dará cuando se desbloquee:

| itemId | ct | costo hoy | costo con $68.627/ct | delta |
|---|---|---|---|---|
| 498 | 0.4 | 30.625 | 27.451 | -3.174 |
| 531 | 0.18 | 15.638 | 12.353 | -3.285 |
| 532 | 0.6 | 52.128 | 41.176 | -10.952 |
| 533 | 0.39 | 33.883 | 26.765 | -7.118 |
| 534 | 0.24 | 20.851 | 16.470 | -4.381 |
| 537 | 0.32 | 26.972 | 21.961 | -5.011 |
| 538 | 0.42 | 35.401 | 28.823 | -6.578 |
| 539 | 0.35 | 29.502 | 24.019 | -5.483 |

**No escribas esto todavía.** Está en el payload bajo `fase2_recosteo_BLOQUEADO` solo como referencia.

## Fase 1 — los 6 updates que sí van

| # | Tabla | Clave | Col | Campo | Valor actual | Valor nuevo | Modo | Nota |
|---|---|---|---|---|---|---|---|---|
| 1 | Lotes | C-068 | — | pesoTotalQuilates | 8.2 | 10.71 | replace | Subvaluado en 2.51 ct (31%). 7.24 medidos en 29 topitos + 3.47 estimados en las 19 unidades restantes. El resultado es robusto: da 10.71 tanto si las 16 piedras ya pesadas del SOT están entre los topitos como si están entre las baguettes. |
| 2 | Lotes | C-068 | — | notas | (vacío) | Peso corregido 12-ago-2026 de 8.20 a 10.71 ct. 7.24 ct MEDIDOS en las 29 gemas del envío a topitos;  […ver payload] | append |  |
| 3 | Inventario | 506 | G | Cant. | 2 | 0 | replace | Consumido COMPLETO por el envío a producción de topitos. La fila y el QR siguen vivos. |
| 4 | Inventario | 506 | Y | mostrarEnCatalogo | (vacío) | FALSE | replace | ⚠️ La col Y es propiedad de CONVEX. Escribirla en la hoja NO despublica. Hay que hacerlo desde la app — es exactamente lo que pasó con las 7 engastadas del 24-jul, que siguen visibles. |
| 5 | Inventario | 506 | AA | observacion | (vacío) | TRANSFORMADO 12-ago-2026: las 2 gemas (3.7 × 3.1 mm) entran al envío de producción de topitos de C-0 […ver payload] | append |  |
| 6 | Inventario | 485 | D | Peso (ct) | 0,74 (TEXTO) | 0.74 | replace | Está escrito con coma, así que es texto y se cuela en cualquier suma. Limpieza de paso, viene de la hoja del 12-ago. |

### Sobre `#506`

Se consume **completo** (cant 2 → 0), no parcialmente. Por la regla del
`2026-07-24-transformacion-gemas-joyas-sot-v3.md` eso lo pone en otra categoría que `#496`, `#499`
y `#500`, que se consumen en parte y por tanto **solo se anotan y se les descuenta cantidad, sin
despublicar**. La fila de `#506` se conserva siempre — es la única traza del costo de esas piedras.

### ⚠️ `mostrarEnCatalogo` no se arregla desde la hoja

La columna Y es propiedad de **Convex**. Escribir `FALSE` ahí no despublica nada: la dirección del
espejo es Convex → hoja, y solo cuando hay push. Es exactamente lo que pasó con las 7 gemas
engastadas del 24-jul, que quedaron en `FALSE` en la hoja y siguen en `TRUE` en Convex, visibles en
el catálogo hasta hoy. **Hay que despublicar `#506` desde la app.** Escribí la celda igual por
consistencia, pero dejá el aviso en el output.

## El envío a producción — para el registro, no para escribir

| Destino | Piezas | Peso (ct) | Detalle |
|---|---|---|---|
| Topitos | 31 | 7.63 | 18 rectangulares · 4 ovaladas · 7 redondas (29, 7.24 ct medidos) + las 2 de #506 (0.39 ct estimados) |
| Anillo artesanal (baguette) | 6 | — | pendiente de pesar |
| Anillo en plata — Joshua (baguette) | 11 | — | pendiente de pesar. Eran 13; 2 pasaron a topitos con #506 — CONFIRMAR de cuál destino salieron. |

**Total del envío físico: 49 piezas** — las 48 de C-068 más **1 gema redonda de la embajadora Isa
la Negra Vikinga Warrior Portocarrero**. Esa piedra es **material de tercero**: no es un ítem de
inventario, no suma unidades ni quilates a C-068 y no recibe `costoBaseCOP`. El sistema no tiene
concepto de maquila ni de material de tercero, así que si se registra como ítem contamina el costo
del lote, y si no se registra en ningún lado queda una piedra ajena en el taller sin traza. Va en la
observación del envío y en una nota de Anima, con el nombre de Isa. Es la misma asesora que tiene
`#218` y `#171` en consignación — pero es un flujo distinto y no debe mezclarse con eso.

**Aparte del lote:** el dije lleva 2 lágrimas que **no son de C-068** — `#174 L:A Lágrima de la
Montaña` (1,44 ct, lote C-057) y `#342 Brújula Sagrada` (6,30 ct, C-007). Ninguna está registrada
con corte `Lágrima` (una es `Gola`, la otra `Ancestral`), la medida de `#174` dice `1.0 × 7.0 × 3.2
mm` — un eje de 1 mm es imposible para 1,44 ct — y **`#342` está publicada**. Nada de eso va en esta
corrida.

## Pendientes — dejalos en el output, no los resuelvas

1. **Pesar las 17 baguettes de anillo.** Es lo único que desbloquea la Fase 2.
2. **¿De qué destino salieron las 2 que pasaron a topitos?** Eran 6 artesanal + 13 Joshua = 19; ahora son 17. Para el total da igual, para el descuento fila por fila no.
3. **`#505` es casi gemelo de `#506`** — 3,7 × 3,0 vs 3,7 × 3,1, ambos cant 2, misma categoría `Topitos`, misma calidad, mismo costo $30.625. Confirmar que se agarró el que era.
4. **Qué fila de C-068 aporta cuántas piedras a cada destino.** Sin eso no se puede descontar cantidad de `#496` (10 uds), `#499` (8) y `#500` (6).
5. **El precio también baja.** Si esos ítems tienen `precioFinalCOP` derivado de un costo inflado, bajar el costo sin revisar el precio deja un margen que no era el previsto.

## Fuera de alcance — la hoja "Inventario 12 Agosto"

Ese cruce está hecho (`exports/Inventario-12Ago-vs-SOTv3.xlsx`) pero **no está listo para escribir**:
faltan el proveedor y el costo de un lote Muzo de 11 gemas sin registrar (21,21 ct), hay dos pesos
físicamente imposibles (`#526` y `#287`), `#73` está VENDIDA y el papel le recaptura peso, y los
cortes `Octogonal`, `Trapecio` y `Esfera` no existen en la pestaña `Listas`. Va en su propia corrida.

## Después de escribir

1. Correr el sync: «🔄 Convex Sync → Sincronizar todo (completo)». El `onEdit` no dispara por API.
2. Verificar leyendo la hoja de vuelta y localizando por cabecera. `syncStatus: 'synced'` no prueba aterrizaje.
3. Confirmar que `C-068` quedó en 10,71 ct en la pestaña `Lotes` y que `#506` tiene `cant 0`.
4. **Despublicar `#506` desde la app**, no desde la hoja.

## Qué me devolvés

Dry-run con el diff completo, el resumen por tipo, los 5 pendientes, y el aviso de que `#506` sigue
publicado en Convex. No corras `--apply` sin que yo lo confirme.
