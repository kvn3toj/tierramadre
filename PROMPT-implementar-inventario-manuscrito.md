# Implementar el inventario manuscrito en el SOT v3

Trabajás en el repo **TierraMadre**. Hay que llevar a la hoja SOT v3 una captura física de
inventario que Maritza hizo a mano el 2026-08-12. Las decisiones ya están tomadas y validadas
contra el vault de Anima — **no las re-discutas, implementálas**.

- **Hoja:** `1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U`, pestaña `Inventario` (gid `1819792669`), 523 filas de datos.
- **Payload:** `scripts/.data/inventario-manuscrito-2026-08-12.json` (79 updates + 7 altas). Es la fuente, no lo transcribas a mano.
- **Invariante de costos:** reparto **por quilataje dentro de cada padre**, con **Σ hijos == costo del padre exacto** (el último hijo absorbe el redondeo). Es el dictamen del 2026-08-03; ya viene aplicado en el payload, solo hay que verificarlo.

## Qué construir

Un script `scripts/aplicar-inventario-manuscrito-20260812.mjs`, con el mismo molde que
`scripts/fix-medidas-columna-i.mjs`:

- `GoogleAuth` + `@googleapis/sheets`, `dotenv` cargando `.env.local` y luego `.env`.
- **Dry-run por defecto**; escribe solo con `--apply`.
- Backup de los valores previos en `scripts/.backups/` antes de tocar nada.
- **Localiza las columnas por nombre de cabecera, nunca por índice fijo.** La pestaña mide 102 columnas y el mapa del código cubre 57; anclar a la derecha ya rompió una migración (03-ago, 21 filas basura).
- **Localiza cada fila por `itemId` (columna A)**, no por `rowIndex`.

## Antes de escribir — obligatorio

1. **Rehacer el autofiltro sobre `A1:BE524`.** Hoy termina en `endRowIndex: 514` y hay 523 filas de datos: **#525–#534 quedan fuera de todo filtro y orden**. Este plan toca #528, #529, #530, #532, #533 y #534. Si no se corrige, al ordenar esas filas se desalinean del resto.
2. Verificar que los 79 `itemId` del payload existen en la hoja (los 7 de altas **no** deben existir).
3. Imprimir el diff completo en dry-run: `itemId · columna · valor actual · valor nuevo`.

## Reglas que no se negocian

| Columna | Regla |
|---|---|
| **I `Medidas`** | Es la medida buena. Todas las medidas van acá. |
| **J `Medidas (valores)`** | EN DESUSO. **No escribir nunca.** |
| **L `costoBaseCOP`** | Propiedad de la hoja (two-way desde 24-jul). Se escribe solo donde el payload lo diga. |
| **Y `mostrarEnCatalogo`** | Propiedad de **Convex**, no de la hoja. **No tocar.** Los 279 ítems con `False` en la hoja y `True` en Convex son deriva esperada, no un bug. |
| **AA `observacion`** | Acá vive la trazabilidad del renombre. **Se ANEXA, no se reemplaza** — el payload ya trae el texto final concatenado (`nuevo · previo`) y cada update lleva `modo: "append"`. Nunca perder cosas como `Cono 2.1 mm` o `Precio especial por cierre de temporada`. |
| **M `precioFinalCOP`** | **No tocar en esta corrida.** Ver "Fuera de alcance". |

Y una más: `normalizeCalidadForSheet` devolvía `"F1"` para calidad vacía y ese dato inventado
entraba a Convex por el pull. Si tocás ese camino, **vacío se queda vacío**.

## Las 79 escrituras

| # | itemId | Col | Campo | Valor actual | Valor nuevo | Nota |
|---|---|---|---|---|---|---|
| 1 | 467 | C | Nombre | Guardianas Gemelas — Piedra 1 | Solsticio Lunar | Era "Guardianas Gemelas — Piedra 1". Medida 6.1×3.3 = el "6x3,3" del papel. |
| 2 | 467 | AA | observacion | Par Guardianas Gemelas (ex Igualdad Dijes, #363). Cono 2.1 mm. Calidad a confirmar (dictad […] | Antes: Guardianas Gemelas — Piedra 1. Renombrado 12-ago-2026 (inventario manuscrito). Par C-042-G1 pasa a llamarse Bellezas del Alba. · Par  […ver payload] |  |
| 3 | 468 | C | Nombre | Guardianas Gemelas — Piedra 2 | Despertar del Alma | Era "Guardianas Gemelas — Piedra 2". Medida 5.5×3.6 = el "5,5x3,5" del papel. |
| 4 | 468 | AA | observacion | Par Guardianas Gemelas (ex Igualdad Dijes, #363). Cono 2.3 mm. · Precio especial por cierr […] | Antes: Guardianas Gemelas — Piedra 2. Renombrado 12-ago-2026 (inventario manuscrito). Par C-042-G1 pasa a llamarse Bellezas del Alba. · Par  […ver payload] |  |
| 5 | 471 | C | Nombre | Guardianas Gemelas | Bellezas del Alba | Fila-par de C-042-G1 (0.74 ct). Antes "Guardianas Gemelas". |
| 6 | 471 | AA | observacion | Par para dijes (ex 'Igualdad Dijes', #363). 2 gemas facetadas rectangulares: 6.1×3.3mm/0.3 […] | Antes: Guardianas Gemelas (par para dijes, ex Igualdad Dijes #363). Renombrado 12-ago-2026. · Par para dijes (ex 'Igualdad Dijes', #363). 2  […ver payload] |  |
| 7 | 469 | C | Nombre | Mellizas del Alba — Piedra 3 | Guardianas Gemelas — Piedra 1 | Era "Mellizas del Alba — Piedra 3". Medida 5.3×3.4 = el "5,3x3,4" del papel ✓ exacto. |
| 8 | 469 | AA | observacion | Par Mellizas del Alba (ex Igualdad Topitos, #363). Cono 2.5 mm. · Precio especial por cier […] | Antes: Mellizas del Alba — Piedra 3. Renombrado 12-ago-2026. El par C-042-G2 hereda el nombre Guardianas Gemelas. · Par Mellizas del Alba (e […ver payload] |  |
| 9 | 470 | C | Nombre | Mellizas del Alba — Piedra 4 | Guardianas Gemelas — Piedra 2 | Era "Mellizas del Alba — Piedra 4". |
| 10 | 470 | AA | observacion | Par Mellizas del Alba (ex Igualdad Topitos, #363). Cono 2.3 mm. · Precio especial por cier […] | Antes: Mellizas del Alba — Piedra 4. Renombrado 12-ago-2026. El par C-042-G2 hereda el nombre Guardianas Gemelas. · Par Mellizas del Alba (e […ver payload] |  |
| 11 | 472 | C | Nombre | Mellizas del Alba | Guardianas Gemelas | Fila-par de C-042-G2 (0.74 ct). Antes "Mellizas del Alba". El nombre "Mellizas del Alba" desaparece del inventario. |
| 12 | 472 | AA | observacion | Par para topitos (ex 'Igualdad Topitos', #363). 2 gemas: 5.3×3.4mm/0.37ct + 5.3×3.7mm/0.37 […] | Antes: Mellizas del Alba (par para topitos, ex Igualdad Topitos #363). Renombrado 12-ago-2026. · Par para topitos (ex 'Igualdad Topitos', #3 […ver payload] |  |
| 13 | C-042-G1 | D | nombre (Sublotes) | — | Bellezas del Alba | Pestaña Sublotes, no Inventario. |
| 14 | C-042-G2 | D | nombre (Sublotes) | — | Guardianas Gemelas | Pestaña Sublotes, no Inventario. |
| 15 | 532 | C | Nombre | Alma Pura | Tres Marías | Sublote 497-B. Trío, 3 piedras, 0.60 ct. Las 3 medidas del papel coinciden exactas con la col I. El papel lo rotulaba "497C". |
| 16 | 532 | AA | observacion | Sublote 497-B de #497 "Vuelos del Alba" (subdivisión 2026-08-03). 0.60 ct en 3 piedras (pe […] | Antes: Alma Pura. Renombrado 12-ago-2026. Sublote 497-B de #497 "Vuelos del Alba" (subdivisión 2026-08-03). 0.60 ct en 3 piedras (peso del g […ver payload] |  |
| 17 | 533 | C | Nombre | Esencia del Cóndor | Los Caminos | Sublote 497-C. 2 piedras. El papel lo rotulaba "497B" — las letras venían cruzadas. |
| 18 | 533 | AA | observacion | Sublote 497-C de #497 "Vuelos del Alba" (subdivisión 2026-08-03). 0.39 ct en 2 piedras (pe […] | Antes: Esencia del Cóndor. Renombrado 12-ago-2026. Sublote 497-C de #497 (subdivisión 2026-08-03). 0.39 ct en 2 piedras. Costo repartido por […ver payload] |  |
| 19 | 534 | C | Nombre | Armonía Radiante | Amorcito | Sublote 497-D. 2 piedras, 0.24 ct ✓ coincide exacto con el papel. |
| 20 | 534 | AA | observacion | Sublote 497-D de #497 "Vuelos del Alba" (subdivisión 2026-08-03). 0.24 ct en 2 piedras (pe […] | Antes: Armonía Radiante. Renombrado 12-ago-2026. Sublote 497-D de #497 (subdivisión 2026-08-03). 0.24 ct en 2 piedras. Costo repartido por q […ver payload] |  |
| 21 | 274 | C | Nombre | Cáncer | Autenticidad | Era "Cáncer". Se descartó "Armonía" para no chocar con #534 (que además pasa a llamarse Amorcito). |
| 22 | 274 | I | Medidas | (vacío) | 5.9 × 3.9 mm | Columna I estaba VACÍA. Cierra un hueco de la §13. |
| 23 | 274 | E | Color | (vacío) | Verde Menta | Columna E estaba VACÍA. |
| 24 | 274 | AA | observacion | Precio especial por cierre de temporada | Antes: Cáncer. Renombrado 12-ago-2026 (inventario manuscrito). · Precio especial por cierre de temporada |  |
| 25 | 242 | I | Medidas | (vacío) | 6.6 × 5.0 mm | Col I VACÍA → cierra hueco §13. |
| 26 | 242 | D | Peso (ct) | 0.93 | 0.95 | SOT decía 0.93. |
| 27 | 242 | L | costoBaseCOP | 550,240 | 436000 | El $436.000 suelto del papel es de Amanecer. SOT tenía $550.240. |
| 28 | 244 | I | Medidas | (vacío) | 6.5 × 4.5 mm | Col I VACÍA → cierra hueco §13. |
| 29 | 233 | I | Medidas | (vacío) | 5.8 × 5.9 mm | Col I VACÍA → cierra hueco §13. |
| 30 | 233 | D | Peso (ct) | 0.95 | 0.96 | SOT decía 0.95. |
| 31 | 233 | E | Color | Verde Limón | Verde Menta | SOT decía Verde Limón. |
| 32 | 245 | I | Medidas | (vacío) | 6.0 × 4.8 mm | Col I VACÍA → cierra hueco §13. |
| 33 | 245 | D | Peso (ct) | 0.82 | 0.81 | SOT decía 0.82. |
| 34 | 245 | E | Color | Verde Limón | Verde Menta | SOT decía Verde Limón. |
| 35 | 234 | I | Medidas | (vacío) | 6.0 × 6.4 mm | Col I VACÍA → cierra hueco §13. |
| 36 | 234 | E | Color | Verde Limón | Verde Menta | SOT decía Verde Limón. |
| 37 | 236 | I | Medidas | (vacío) | 5.8 × 4.8 mm | Col I VACÍA → cierra hueco §13. |
| 38 | 236 | E | Color | Verde Limón | Verde Menta | SOT decía Verde Limón. |
| 39 | 233 | F | Calidad | COMERCIAL FINA | COMERCIAL SÚPER FINA | "S. Fina" del papel = COMERCIAL SÚPER FINA. |
| 40 | 234 | F | Calidad | COMERCIAL FINA | COMERCIAL SÚPER FINA |  |
| 41 | 242 | F | Calidad | COMERCIAL FINA | COMERCIAL SÚPER FINA |  |
| 42 | 244 | F | Calidad | COMERCIAL FINA | COMERCIAL SÚPER FINA |  |
| 43 | 245 | F | Calidad | COMERCIAL FINA | COMERCIAL SÚPER FINA |  |
| 44 | 274 | F | Calidad | COMERCIAL FINA | COMERCIAL SÚPER FINA |  |
| 45 | 276 | F | Calidad | COMERCIAL FINA | COMERCIAL SÚPER FINA |  |
| 46 | 276 | I | Medidas | 4.2 × 4.0 × 2.3 mm | 4.1 × 4.2 mm | SOT decía 4.2 × 4.0 × 2.3 mm. |
| 47 | 283 | F | Calidad | COMERCIAL SUPERIOR | COMERCIAL SÚPER FINA |  |
| 48 | 283 | L | costoBaseCOP | 207,692 | 180000 | SOT tenía $207.692. El papel manda. |
| 49 | 283 | I | Medidas | 6.8 × 4.5 × 2.9 mm | 7.0 × 4.5 mm | SOT decía 6.8 × 4.5 × 2.9 mm. |
| 50 | 100 | D | Peso (ct) | 0.60 | 0.63 | SOT decía 0.60. Calidad y medida ya coincidían. |
| 51 | 295 | D | Peso (ct) | 1.06 | 1.07 | SOT decía 1.06. |
| 52 | 295 | E | Color | Verde Menta | Verde Limón | SOT decía Verde Menta. |
| 53 | 513 | F | Calidad | COMERCIAL FINA | COMERCIAL SÚPER FINA | SOT decía COMERCIAL FINA. |
| 54 | 513 | E | Color | Verde Claro | Verde Limón | SOT decía Verde Claro. |
| 55 | 530 | D | Peso (ct) | 0.25 | 0.24 | SOT decía 0.25 (sublote 509-C). |
| 56 | 528 | I | Medidas | 6.4 x 4.1 x 2.5 mm | 6.4 × 4.1 mm | Ya coincidía; el papel confirma. |
| 57 | 529 | D | Peso (ct) | 0.34 | 0.33 | SOT decía 0.34 (sublote 509-B). |
| 58 | 515 | E | Color | Verde Vívido |  | El papel deja la columna Vida en blanco; SOT dice Verde Vívido. NO se toca — vacío no es un dato. |
| 59 | 89 | I | Medidas | 5.2 -3.2 5.0-3.4 mm | 5.1 × 3.4 mm · 5.3 × 3.3 mm | El SOT tenía el formato roto "5.2 -3.2 5.0-3.4 mm". |
| 60 | 89 | F | Calidad | COMERCIAL FINA | COMERCIAL SÚPER FINA |  |
| 61 | 498 | D | Peso (ct) | (vacío) | 0.40 | Estaba vacío → cierra hueco §13 (lista SIN PESO). |
| 62 | 498 | C | Nombre | Baguette | Perfecta Compañía | Era "Baguette". Dúo, cant 2. |
| 63 | 498 | I | Medidas | 4.5 × 3.0 mm | 4.5 × 2.9 mm · 4.3 × 2.6 mm | El SOT solo tenía una medida (4.5 × 3.0). Confirma que el papel decía 4,5 y no 9,5. |
| 64 | 498 | AA | observacion | (vacío) | Antes: Baguette (lote C-068). Nombrado 12-ago-2026 desde el inventario manuscrito. |  |
| 65 | 498 | F | Calidad | FINA COMERCIAL | COMERCIAL SUPERIOR | El papel dice "C. Superior"; SOT decía FINA COMERCIAL. |
| 66 | 452 | C | Nombre | Gemas Pedagógicas Laboratorio (Marketing) | Falsedad | Era "Gemas Pedagógicas Laboratorio (Marketing)". |
| 67 | 452 | D | Peso (ct) | 4.32 | 1.06 | SOT decía 4.32. |
| 68 | 452 | G | Cant. | 4 | 1 | SOT decía 4. |
| 69 | 452 | I | Medidas | 7 mm | 7.0 × 7.0 mm | SOT decía "7 mm". |
| 70 | 452 | AA | observacion | (vacío) | Antes: Gemas Pedagógicas Laboratorio (Marketing), 4.32 ct, cant 4. Renombrado y recapturado 12-ago-2026 desde el inventario manuscrito. | ⚠️ Ver Pendientes: consignación Mario Gómez del 08-ago. |
| 71 | 501 | L | costoBaseCOP | 91,875 | 0 | Padre retirado tras subdividir. Los 3 hijos absorben los $91.875. |
| 72 | 501 | G | Cant. | 6 | 0 | Padre retirado; la fila y el QR siguen vivos. |
| 73 | 501 | AA | observacion | (vacío) | SUBDIVIDIDO 12-ago-2026 en 3 sublotes vendibles individualmente: 501-A Dos Amores, 501-B Éxitosos, 501-C Equilibrio. El costo original ($91. […ver payload] |  |
| 74 | 504 | L | costoBaseCOP | 30,625 | 0 | Padre retirado tras subdividir. |
| 75 | 504 | G | Cant. | 2 | 0 |  |
| 76 | 504 | AA | observacion | (vacío) | SUBDIVIDIDO 12-ago-2026 en 2 sublotes: 504-A Amor Prohibido, 504-B Romance Predestinado. El costo original ($30.625) se repartió entre los h […ver payload] |  |
| 77 | 93 | L | costoBaseCOP | 759,122 | 469120 | SOT tenía $759.122. El papel manda. Se reparte entre 93A y 93B. |
| 78 | 93 | G | Cant. | 2 | 0 |  |
| 79 | 93 | AA | observacion | Precio especial por cierre de temporada | DIVIDIDO 12-ago-2026 en 93A Romeo (0.83 ct) y 93B Julieta (0.91 ct). Antes: Dos Luciérnagas, 1.74 ct. Padre retirado para evitar doble venta […ver payload] | ⚠️ Tenía precioFinalCOP $1.574.300 — hay que recalcular (ver Pendientes). |

## Las 7 altas

Los `itemId` 535–539 son los siguientes libres (el SOT llega hasta #534). 93A/93B usan la
convención de letra que ya se decidió el 31-jul.

| itemId | Nombre | Padre | subLote | Cant. | Peso (ct) | Medidas (col I) | Calidad | Color | costoBaseCOP | Nota |
|---|---|---|---|---|---|---|---|---|---|---|
| 93A | Romeo | #93 Dos Luciérnagas | C-045-G1 | 1 | 0.83 | 7.4 × 5.6 mm | COMERCIAL SÚPER FINA | Verde Limón | 223.771 | Numeración 93A/93B ya definida en el vault (31-jul). Peso del papel (0,83) sobre el del vault (0,84). |
| 93B | Julieta | #93 Dos Luciérnagas | C-045-G1 | 1 | 0.91 | 7.4 × 5.6 mm | COMERCIAL SÚPER FINA | Verde Limón | 245.349 | Σ hijos = $469.120 exacto ✓ |
| 535 | Amor Prohibido | #504 Baguette | 504-A | 1 | — | 5.0 × 3.1 mm | COMERCIAL FINA | Verde Natural | 15.313 | ⚠️ El papel da 0,55 ct del par, no de cada piedra. Sin pesos individuales no se puede repartir por quilataje. |
| 536 | Romance Predestinado | #504 Baguette | 504-B | 1 | — | 4.9 × 3.0 mm | COMERCIAL FINA | Verde Natural | 15.312 | Σ hijos = $30.625 exacto ✓ |
| 537 | Dos Amores | #501 Baguette | 501-A | 2 | 0.32 | 4.2 × 2.9 mm | COMERCIAL SUPERIOR | Verde Natural | 26.972 | ⚠️ Falta la 2ª medida. El nombre implica 2 piedras (patrón de la casa) y así 2+2+2 = las 6 uds de #501. |
| 538 | Éxitosos | #501 Baguette | 501-B | 2 | 0.42 | 4.8 × 2.7 mm · 4.6 × 2.7 mm | COMERCIAL SUPERIOR | Verde Natural | 35.401 | Peso del grupo, no por piedra. |
| 539 | Equilibrio | #501 Baguette | 501-C | 2 | 0.35 | 5.6 × 2.7 mm · 5.3 × 2.5 mm | COMERCIAL SUPERIOR | Verde Natural | 29.502 | Σ hijos = $91.875 exacto ✓ |

Los tres padres subdivididos (**#93, #501, #504**) quedan **retirados, no borrados**: costo 0,
cant 0, fuera del catálogo, con la observación que dice en qué se convirtieron. **La fila y el QR
siguen vivos** — escanear la etiqueta física vieja tiene que seguir resolviendo en la app. `estado`
no se toca. Es exactamente lo que hizo `migrations:seedSublotes508509497`.

También hay que actualizar la pestaña **`Sublotes`**: `C-042-G1` → nombre "Bellezas del Alba" y
`C-042-G2` → "Guardianas Gemelas".

## Después de escribir

1. **Correr el sync:** menú «🔄 Convex Sync → Sincronizar todo (completo)». El trigger `onEdit` es
   simple y **no dispara con escrituras por API** — Convex no se entera solo.
2. **Verificar leyendo la hoja de vuelta y localizando por cabecera nombrada.** `syncStatus: 'synced'`
   **no prueba aterrizaje** — ese es el criterio que quedó escrito en `CLAUDE.md` después del 03-ago.
3. Chequear las tres sumas: `93A+93B == 469.120` · `501-A+B+C == 91.875` · `504-A+B == 30.625`.
4. Confirmar que `inventoryStats.total` pasa de 523 a 530 y que los tres padres quedan fuera de `publishedCatalog`.

## Fuera de alcance — no lo hagas en esta corrida

- **#499 no se subdivide.** El manuscrito asigna 499A "Complemento" (2 piedras) y 499B "Cuatro
  Elementos" (sin datos): 2+4 = 6 de las 8 unidades, quedan 2 sin nombre. El precedente del 03-ago
  solo subdividió lotes completos.
- **`precioFinalCOP`.** El padre #93 tenía $1.574.300; la regla canónica `costo × 2,6` daría
  $1.219.712 entre los dos hijos. Pero hasta el **31-ago** rige el remate (`K × 1,3` en gema), así
  que el precio se define aparte.
- **Doble conteo de C-042.** La reconciliación del 24-jul dijo que #467–#470 debían quedar en costo
  0 porque el nivel vivo es el par (#471/#472 a $367.500 c/u). Hoy los cuatro tienen $178.784 y el
  lote se cuenta dos veces. Este plan **renombra** esos ítems pero **no toca sus costos**.
- **#452 y la consignación de Mario Gómez.** El 08-ago se autorizó #452 a $20.000 siendo "Gemas
  Pedagógicas Laboratorio (Marketing)", 4,32 ct, cant 4. Este plan lo convierte en "Falsedad",
  1,06 ct, cant 1. **Aplicá el cambio pero dejá una advertencia en el output** para revisar esa
  consignación y las otras 3 gemas pedagógicas.
- **Calidad de #529 y #530.** Siguen publicadas con el campo vacío por dictamen del dueño. El
  manuscrito propone "C. Fina" y "S. Fina", pero no se escriben sin visto bueno.
- **#531 "Vuelo del Alba"** (sublote 497-A) no aparece en el manuscrito y arrastra "CALIDAD
  PENDIENTE DE CONFIRMAR". Se queda como está.

## De ñapa, si querés

`#219` tiene el typo `2..3` vivo en la columna **I**. La normalización del 11-ago lo corrigió en la
columna J, que está muerta, y dejó la buena mal. Corregir `2..3 → 2.3` en I.

## Contexto de las decisiones (por si necesitás justificar algo)

| Decisión | Qué se resolvió |
|---|---|
| Pares C-042 | Los nombres se **invierten**: C-042-G1 (#467/#468/#471) → "Bellezas del Alba" con piedras Solsticio Lunar y Despertar del Alma; C-042-G2 (#469/#470/#472) → "Guardianas Gemelas". "Mellizas del Alba" desaparece. |
| Letras 497-B / 497-C | El manuscrito las tenía cruzadas. Manda el peso y el nº de piedras: "Tres Marías" → #532 (497-B, 3 piedras, 0.60 ct, medidas idénticas), "Los Caminos" → #533 (497-C, 2 piedras). |
| Tarifa C-068 | El manuscrito costeó a $90.740/ct parejo, lo que rompía Σhijos = padre por ~$13.000. **Se descartó**: se reparte por quilataje dentro de cada padre. El lote tiene 48 uds y $735.000 que hoy cierran exacto por unidad; solo 1,41 de sus 8,20 ct están pesados. |
| "S. Fina" | = `COMERCIAL SÚPER FINA`. Cierra de paso la discrepancia abierta en #93 desde el 13-jul. |
| Pesos 93A/93B | Del manuscrito (Romeo 0,83 · Julieta 0,91) sobre los del vault (0,84 · 0,90). Ambos suman 1,74. |
| #274 | "Cáncer" → **Autenticidad** (se descartó "Armonía" por el choque con #534). |
| Trazabilidad | Se conserva el itemId y el nombre anterior va a `observacion` (col AA), que es donde el SOT ya guarda esta historia. |

## Qué me tenés que devolver

1. El script, corrido en **dry-run** con el diff completo a la vista.
2. Un resumen de lo que va a cambiar, agrupado por tipo (renombres · medidas nuevas · pesos · costos · altas · retiros).
3. Las advertencias que dispare (#452 / consignación, y cualquier `itemId` que no encuentre).
4. **Parás ahí.** No corras `--apply` sin que yo lo confirme.
