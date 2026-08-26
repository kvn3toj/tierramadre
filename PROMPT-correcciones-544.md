# #544 Viaje Estelar — medidas y costo desde el GIA 2231993415

Sexta corrida sobre el SOT v3. Cinco celdas de un solo ítem.

- **Hoja:** `1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U`, pestaña `Inventario` (gid `1819792669`).
- **Payload:** `scripts/.data/correcciones-544.json`
- **Fuente:** **GIA Emerald Origin Report nº 2231993415**, 25-jun-2026.
- Reglas de siempre: dry-run por defecto, localizar por cabecera nombrada y por `itemId`, backup en `scripts/.backups/`, `observacion` se **anexa**, no se escribe en J, la col Y no se toca desde la hoja.
- Script sugerido: `scripts/aplicar-correcciones-544.mjs`.

> Las medidas de **#546** ya van en `correcciones-546.json` (13,40 × 6,47 × 5,48 mm, cert. 025893).
> No se duplican acá. Los dos prompts son independientes y pueden correr en cualquier orden.

## El hallazgo: el costo se calculó con un peso equivocado

La observación de #544 dice textualmente *"report 025890 (Lote Origen · 00-4), **4.11 ct** ×
$10.058.404/ct"*. El GIA certifica **4,10 ct**, y la columna D del SOT también dice 4,10.

Ese centésimo explica el desvío del 0,24% que llevábamos arrastrando en el lote:

- costo actual **$41.340.039** = 4,11 × tarifa
- costo correcto **$41.239.456** = 4,10 × tarifa → **sobreestimado en $100.583**
- el precio (× 4,5) baja de $186.030.176 a **$185.577.554**

Con esta corrección el nivel alto de C-090 queda parejo: **#544, #545 y #546 los tres a
$10.058.404/ct exactos.**

## Las 5 celdas

| # | Col | Campo | Valor actual | Valor nuevo | Modo |
|---|---|---|---|---|---|
| 1 | I | Medidas | 12.91 × 6.78 mm | 12.91 × 6.78 × 5.88 mm | replace |
| 2 | L | costoBaseCOP | 41340039 | 41239456 | replace |
| 3 | M | precioFinalCOP | 186030176 | 185577554 | replace |
| 4 | AA | observacion | Alta 12-ago-2026 desde la hoja "In […] | GIA Emerald Origin Report 2231993415 (25-jun […ver payload] | append |
| 5 | AM | certificadoUrl | (vacío) | <URL_DRIVE_GIA_2231993415> | replace |

La última está **bloqueada**: sube el PDF a Drive y reemplaza el placeholder
`<URL_DRIVE_GIA_2231993415>` por la URL real. **No apliques esa celda con el texto de relleno.** Es
un GIA — el documento con más peso comercial de todo el inventario.

## Lo que NO se toca — el SOT ya estaba bien

| Campo | Valor | Por qué |
|---|---|---|
| Calidad | F1 | CONFIRMADO por el GIA: "Clarity Enhanced (F1)". El SOT ya estaba bien. |
| Corte | Octogonal | CONFIRMADO: el GIA dice "Octagonal". A diferencia de #546, cuyo certificado dice "Esmeralda". Son cortes distintos — `Octogonal` NO sobra del vocabulario. |
| Peso (ct) | 4.1 | CONFIRMADO por el GIA. Lo que estaba mal era el costeo, no el peso. |

Ojo con `Corte`: el GIA dice **Octagonal** y el certificado de #546 dice **Esmeralda**. Son cortes
distintos, así que **`Octogonal` NO sobra del vocabulario** — retiro la duda que dejé en el prompt
de #546.

## ⛔ Decisión pendiente: el color

`Color` sigue diciendo **"Verde Muzo"** y **no se escribe en esta corrida**.

El GIA es un ORIGIN REPORT — su propósito específico es determinar procedencia — y dice "Colombia", no Muzo. El color lo gradúa como "Green" a secas, no "Vivid Green". Van dos de dos: el cert. 025893 de #546 tampoco atribuye mina. Llamarla "Verde Muzo" contradice un GIA que está en la mano. NO se escribe sin tu decisión: el reemplazo obvio sería "Verde" o "Verde Intenso", ambos ya en el vocabulario.

## Pendientes de C-090

- Las 11 de C-090 dicen "Verde Muzo" y ningún certificado lo respalda. Revisar el lote completo.
- Faltan los certificados de las otras 9 piedras de C-090 (#545, #547–#554).
- #548 Anillo Semilla y #552 Corazón Valiente siguen en costo 0.
- C-090 tiene costoTotalCOP = 0 en Lotes mientras sus ítems suman $147.616.861.
- #553 Alma Ancestral desvía −2,33% de la tarifa baja; puede ser el mismo tipo de error de peso que #544.

## Después de escribir

1. Sync: «🔄 Convex Sync → Sincronizar todo (completo)». El `onEdit` no dispara por API.
2. Verificar leyendo la hoja de vuelta, localizando por cabecera nombrada.
3. Confirmar que `#544 ÷ 4,10 = $10.058.404/ct` y que coincide con #545 y #546.

## Qué me devolvés

Dry-run con las 5 celdas, el aviso de `certificadoUrl` bloqueada, y la decisión de color sin
resolver. No corras `--apply` sin que yo lo confirme.
