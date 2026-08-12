# Addendum — inventario manuscrito 2026-08-12

Corrida complementaria sobre el mismo SOT v3. La corrida anterior
(`PROMPT-implementar-inventario-manuscrito.md`) aterrizó bien: 44 de 52 filas del manuscrito,
7 altas correctas y las invariantes de costo cerrando. **Esto cubre lo que se quedó afuera.**

- **Hoja:** `1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U`, pestaña `Inventario` (gid `1819792669`), **530** filas de datos, itemId hasta **#539**.
- **Payload:** `scripts/.data/addendum-inventario-manuscrito-2026-08-12.json` (12 updates + 2 altas).
- **Mismas reglas de la corrida anterior:** dry-run por defecto, localizar por cabecera nombrada y por `itemId`, backup en `scripts/.backups/`, no escribir en J, no tocar Y, `observacion` se **anexa**.
- El autofiltro **ya quedó bien** (`A1:BE531`). No hay que rehacerlo.

Script sugerido: `scripts/aplicar-addendum-inventario-20260812.mjs`.

## ⚠️ Lo delicado de esta corrida: #218 está en ASESOR

`#218 Dinastía Real` no está en la bóveda. Está entregado:

- `ASESOR` = Mauricio Echeverry · `ASESOR ACTUAL` = Isa la Negra Vikinga Warrior Portocarrero · `ESTADO ASESOR` = ASESOR · `ESTADO` = ASESOR

**Escribir en la hoja no alcanza.** Al retirar el padre y crear los dos hijos, el movimiento de
asesor sigue apuntando a `#218`, que a partir de ese momento tiene `cant 0`. El ledger de lo que
Isa tiene en la mano queda mostrando un ítem fantasma y perdiendo dos gemas reales.

Antes de correr `--apply`:

1. Leé `convex/asesorMovements.ts` y averiguá cómo está registrado el movimiento de `#218`.
2. Decidí cómo re-apuntarlo a `#540` y `#541` — y si eso se hace desde la app o hace falta una migración.
3. **Si no hay forma limpia de re-apuntar el movimiento, parás y me avisás.** Es preferible dejar
   `#218` sin dividir que romper la trazabilidad de una consignación viva.

Los dos hijos nacen heredando el estado completo del asesor (ver tabla de altas).

## Los 12 updates

| # | itemId | Col | Campo | Valor actual | Valor nuevo | Modo | Nota |
|---|---|---|---|---|---|---|---|
| 1 | 283 | E | Color | Verde Natural | Verde Limón | replace | El manuscrito dice "limón". Se saltó en la corrida anterior. |
| 2 | 276 | E | Color | Verde Menta | Verde Limón | replace | El manuscrito dice "limón". Se saltó en la corrida anterior. |
| 3 | 295 | F | Calidad | COMERCIAL FINA | COMERCIAL SÚPER FINA | replace | El manuscrito dice "C.S. Fina". Es el único del bloque A al que no se le aplicó la regla. |
| 4 | 93 | F | Calidad | COMERCIAL FINA | COMERCIAL SÚPER FINA | replace | Padre retirado, pero 93A y 93B ya quedaron en COMERCIAL SÚPER FINA. Alinear. |
| 5 | 93 | M | precioFinalCOP | 1574300 | (vaciar) | replace | Los otros 5 padres retirados (#497,#501,#504,#508,#509) van sin precio. Un padre con cant 0 y precio vivo puede colarse como ofertable. |
| 6 | 171 | C | Nombre | L:A-101-(1-5) Dinastía Celestial | Dinastía Celestial | replace | El manuscrito NO le da nombres nuevos a las piedras: solo re-registra el dúo. Se limpia el prefijo legacy L:A-101-(1-5). |
| 7 | 171 | I | Medidas | 6.4 × 3.5 × 2.3 × 4.7 × 2.9 × 1.9 mm | 6.4 × 3.5 × 2.3 mm · 4.7 × 2.9 × 1.9 mm | replace | MISMO dato, solo separa las dos piedras con · como el resto del inventario. NO se toman las medidas del papel: ver Pendientes. |
| 8 | 171 | AA | observacion | Precio especial por cierre de temporada | Nombre anterior: L:A-101-(1-5) Dinastía Celestial. Limpiado 12-ago-2026 (inventario manuscrito). · Precio espe […ver payload] | append |  |
| 9 | 218 | L | costoBaseCOP | 512000 | 0 | replace | Padre retirado tras dividir. Los dos hijos absorben los $512.000. |
| 10 | 218 | M | precioFinalCOP | 955962 | (vaciar) | replace | El precio se reparte entre los hijos; el padre queda sin precio. |
| 11 | 218 | G | Cant. | 2 | 0 | replace | La fila y el QR siguen vivos. `estado` NO se toca: sigue en ASESOR. |
| 12 | 218 | AA | observacion | Precio especial por cierre de temporada | DIVIDIDO 12-ago-2026 en #540 Felicidad (0.37 ct) y #541 Alegría (0.67 ct). Antes: Dinastía Real, 1.04 ct, cant […ver payload] | append |  |

## Las 2 altas

Los itemId **540** y **541** son los siguientes libres. Ambos heredan `loteId LC-10`,
`Colección Dinastías`, `Categoría Gema`, `UBICACIÓN OFI.CALI` y el bloque completo de asesor.

| itemId | Nombre | ct | Medidas (col I) | Calidad | Color | Corte | costoBaseCOP | precioFinalCOP | Estado | Asesor actual |
|---|---|---|---|---|---|---|---|---|---|---|
| 540 | Felicidad | 0.37 | 5.9 × 3.9 mm | COMERCIAL FINA | Verde Limón | Lágrima | 182.154 | 340.102 | ASESOR | Isa la Negra Vikinga Warrior Portocarrero |
| 541 | Alegría | 0.67 | 7.7 × 4.7 × 3.7 mm | COMERCIAL FINA | Verde Limón | Lágrima | 329.846 | 615.860 | ASESOR | Isa la Negra Vikinga Warrior Portocarrero |

**Invariantes a verificar:** `540+541` en costo == **512.000** · en precio == **955.962**.

Sobre `precioFinalCOP`: en la corrida anterior estaba fuera de alcance, pero acá **no se puede
evitar** — el padre se retira y su precio tiene que ir a algún lado. Se reparte por quilataje igual
que el costo, lo que **preserva el precio de remate** que ya tenía (`Precio especial por cierre de
temporada`) en vez de re-derivarlo con `costo × 2,6`. La regla de remate vence el **31-ago**.

## #171 NO se divide

Releyendo el manuscrito, la fila de Dinastía Celestial **no le da nombres nuevos a las piedras** —
solo vuelve a registrar el dúo. Así que #171 se queda como un ítem con `cant 2`:

- Se limpia el prefijo legacy del nombre: `L:A-101-(1-5) Dinastía Celestial` → `Dinastía Celestial`.
- Se normaliza el formato de la col I separando las dos piedras con `·`. **Es el mismo dato**, no se sustituye por el del papel.

## Pendientes — no los resuelvas, solo dejalos en el output

1. **Medida de #540 Felicidad.** El papel dice `5,9 × 3,9`. La col I del padre traía
   `… 5.6 × 7.0 × 5.7` para la segunda piedra, que no se parece. Se usa la del papel porque es la
   medición física más reciente, pero conviene confirmarla contra la piedra.
2. **Color de #171.** El papel dice "Chivor" (→ `Verde Chivor`); la hoja dice `Verde Vívido`.
   **No se escribe** hasta confirmar.
3. **Segunda medida de #171.** El papel da `4,8 × 2,9` (calza con el `4.7 × 2.9 × 1.9` de la hoja ✓)
   y `4,9 × 3,5`, que no calza con el `6.4 × 3.5 × 2.3`. Puede ser un `6,4` mal leído como `4,9`.
4. **Calidad de #528 Eco del Río.** El papel dice "S. Fina" (→ `COMERCIAL SÚPER FINA`); la hoja dice
   `COMERCIAL SUPERIOR`, que viene del dictado del dueño en la subdivisión del 03-ago.
   **No se toca** sin su visto bueno.
5. **Costo de #513 Suspiro Ancestral.** Papel $193.000 vs hoja $193.200. Son $200; no se toca.
6. **#452 Falsedad.** La corrida anterior conservó `4,32 ct / cant 4` y documentó por qué (las 4
   piezas están consignadas a Mario Gómez). Contradice la decisión original de "actualizar todo",
   pero es la lectura correcta. **Queda así hasta nueva orden.**
7. **#499** sigue sin subdividir: faltan los datos de "Cuatro Elementos" y 2 de sus 8 unidades.

## Después de escribir

1. Correr el sync: «🔄 Convex Sync → Sincronizar todo (completo)». El `onEdit` no dispara por API.
2. Verificar **leyendo la hoja de vuelta y localizando por cabecera nombrada**. `syncStatus: 'synced'` no prueba aterrizaje.
3. Confirmar: `inventoryStats.total` pasa de 530 a **532** · `540+541` cierran en costo y precio · `#218` queda con `cant 0`, costo 0 y sin precio, pero **`estado` sigue en ASESOR**.
4. Revisar que el movimiento de asesor de Isa ya no apunte a un ítem con `cant 0`.

## Qué me devolvés

Dry-run con el diff completo, el resumen por tipo, y **la respuesta al punto de `asesorMovements`
antes de tocar nada**. No corras `--apply` sin que yo lo confirme.
