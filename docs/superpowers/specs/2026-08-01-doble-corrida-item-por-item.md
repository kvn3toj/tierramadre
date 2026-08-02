# La doble corrida ítem por ítem (SOT-V4-FASE1, punto 8)

> Primera corrida el 2026-08-01: **0 de 513 comparables**, por dos precondiciones del motor que
> no se cumplían para NINGÚN lote de dev (detalle en la sección «Historial» al final). Kevin
> dictaminó las dos el 2026-08-02, se implementaron y se corrieron contra dev — sección
> siguiente. Al aplicarlas apareció un **tercer bloqueo, nuevo y no dictaminado**, que deja el
> resultado en **4 de 513 comparables**. Reportado, no resuelto.

## Qué compara y con qué columnas

- **v3 — «el precio real»:** `precioFinalCOP` (columna M de Inventario). SHEET-OWNED desde
  2026-07-23 (`convex/_lib/sheetPullMaps.ts`): un humano lo fija en la hoja. `AT` («Precio
  objetivo (modelo)») y `AU` («Caja: precio venta») quedaron descartadas a propósito — ver el
  detalle en `tests/dobleCorrida.test.ts`.
- **v4 — lo que el motor recomendaría:** `precioObjetivoUnidadCOP` (piso + 30% de margen neto).

## Las dos decisiones de Kevin (2026-08-02), implementadas

### Decisión 1 — normalizar `fechaRecepcion` en la frontera

**El motor NO se aflojó.** `configVigenteEn` sigue exigiendo `AAAA-MM-DD` exacto. Lo que se
corrigió es la frontera Sheet→Convex, en tres puntos:

- `convex/_lib/fechaSheet.ts` — `normalizarFechaRecepcion`, pura, TDD (7 casos): trunca el
  sufijo de hora («2026-05-25 00:00:00» → «2026-05-25») SOLO si los primeros 10 caracteres son
  una fecha ISO válida; si no, deja el valor tal cual.
- `convex/_lib/sheetPullMaps.ts` — nuevo `coerce: 'fecha'` en `lots.fechaRecepcion`, para que el
  pull recurrente de fotoSync no vuelva a dejarla entrar mal.
- `convex/_lib/migracionV4.ts` — `mapearLotesHoja` normaliza antes de planificar, para
  migraciones futuras.
- `convex/migracionV4.ts:_normalizarFechasEnDev` — backfill de una sola vez para los 128 lotes
  que ya existían en dev, ejecutado en vivo:

  ```
  totalLots: 128 · normalizados: 67 · sinNormalizar: 55
  ```

  **Los 55 «sinNormalizar» no son un fallo de la normalización — es que su `fechaRecepcion`
  está genuinamente VACÍA**, no mal formateada. Verificado leyendo el campo crudo: son texto
  `""`. No se les inventó una fecha (regla de siempre: no se corrige por cuenta propia). Ver
  «El tercer bloqueo» abajo — este dato es parte de por qué el resultado sigue en 4/513.

### Decisión 2 — sembrar `categoriaFiscal` por inferencia, con origen marcado

- **Schema:** `lots.categoriaFiscalOrigen: 'capturada' | 'inferida' | 'revisada'`.
- **`convex/_lib/categoriaFiscalInferencia.ts`** (puro, TDD, 10 casos): la lista de palabras
  clave NO es nueva — es la que ya usó la auditoría del 25/07 para clasificar por nombre
  (`References/tierramadre-modelo-fijacion-precios-v2.md`, pregunta abierta #2: anillo, arete,
  choker, pulsera, manilla, brazalete, topito, topos, dije, pin, collar, base anillo, poste,
  cadena, montura, soberana → joya; resto → gema). Hoy se codifica por primera vez, sin
  cambiarla — la codificación no es la revisión que Kevin nunca hizo ítem por ítem.
- **El candado del motor no cambió** (`categoriaFiscal` solo tiene que EXISTIR), pero:
  - `_lib/motorUnidad.ts:preciosDelLote` estampa `avisos: ['CATEGORIA_INFERIDA']` en cada
    `PrecioUnidad` de un lote `'inferida'`.
  - `_lib/espejoFilas.ts` muestra la categoría con sufijo — «joya (inferida)» — en Lotes y
    Casillas.
  - `_lib/categoriaFiscalInferencia.ts:lotesPendientesDeRevision` — el **gate duro de Fase 3**:
    devuelve los `loteId` en `'inferida'`. Prod no corta con ninguno ahí; es responsabilidad de
    Fase 3 llamarlo antes del cutover.
- **Ejecutado en dev** (`convex/categoriaFiscalInferencia.ts:ejecutar`, dry-run primero, luego
  con `dryRun: false`, autorizado por Kevin en la misma decisión):

  ```
  lotesSinCategoria: 128 · lotesInferibles: 104 · lotesSinCasillas: 24
  porCategoria: { gema: 78, joya: 18, mixta: 8 }
  aplicado: { lotesSembrados: 104, casillasSembradas: 200, omitidos: [] }
  ```

  Los 24 `lotesSinCasillas` son los que no tienen NINGÚN ítem enlazado — el mismo grupo que ya
  cubren los puntos 5 y 6 (C-017, S-001, C-039, C-054, MED-001, MED-012 y compañía). No se
  tocaron: sin ítems no hay nombre del que inferir.

## El resultado tras aplicar las dos: 4 de 513 comparables (no 0, pero tampoco los 104 esperables)

```
filasHojaLeidas: 513
comparables: 4
medianaDiferenciaPct: +3.36%
sobre5Pct: 1 · sobre10Pct: 0
paraRevisarInferencia: []   ← ninguno de los 4 divergió >30% (bonus de detección, §2d)
sinComparar:
  - 476 · "v4 no cotiza el ítem (sin casilla, sin costo capturado, o lote sin categoría fiscal)"
  -  33 · "sin precioFinalCOP en el SOT v3"
```

Los cuatro ítems comparables, completos (todos del mismo bloque de lotes MED-004..MED-007, uno
cada uno):

| itemId | precio v3 (`precioFinalCOP`) | precio v4 (`precioObjetivoUnidadCOP`) |     Δ COP |       Δ % |
| ------ | ---------------------------: | ------------------------------------: | --------: | --------: |
| 487    |                   $2.054.421 |                            $1.954.282 | −$100.139 |     −4.9% |
| 490    |                   $1.537.224 |                            $1.622.745 |  +$85.521 | **+5.6%** |
| 491    |                   $1.637.789 |                            $1.687.210 |  +$49.421 |     +3.0% |
| 492    |                   $1.609.057 |                            $1.668.792 |  +$59.735 |     +3.7% |

Sin patrón claro con solo 4 puntos — dos suben, uno baja, ninguno se dispara. No alcanza para
sacar una conclusión de negocio; alcanza para confirmar que el mecanismo entero (leer la hoja,
leer dev, comparar, agregar) funciona de punta a punta con datos reales.

## El tercer bloqueo — nuevo, no dictaminado, no corregido

**Por qué 104 lotes sembrados con categoría producen solo 4 lotes comparables:** de los 513
`lotItems` en dev, **solo 375 tienen los campos v4** (`estadoCasilla`, `costoUnitarioRealCOP`)
que `preciosPorItemDb` exige para siquiera intentar precificar:

```
lotItemsTotal: 513
lotItemsConEstadoCasilla: 375   ← exactamente los que creó la migración del 2026-08-01
lotItemsConCosto: 363           ← 12 menos: los que además tienen costoUnitarioRealCOP
```

Los otros **138 `lotItems` son filas del riel viejo** (pre-migración): tienen `loteId`/`itemId`
y por eso alimentaron la inferencia por nombre (que solo necesita el nombre del ítem), pero
`estadoCasilla` y `costoUnitarioRealCOP` — campos exclusivos de v4, que solo llena la
clasificación W2 o la migración — están **ausentes**, no en cero. `preciosPorItemDb` los
descarta en el primer filtro (`if (!c.estadoCasilla) continue;`), antes de mirar categoría o
fecha. Esos 138 ítems **nunca van a poder cotizar** hasta que alguien los clasifique por W2 o
los migre — ninguna de las dos decisiones de hoy los toca.

De los 375 casillas migradas que SÍ podrían cotizar, la mayoría de sus lotes tienen
`fechaRecepcion` genuinamente vacía (son lotes reconstruidos, sin registro de compra real — ver
decisión 1 arriba). **Solo 4 lotes** (`MED-004`..`MED-007`) tienen, a la vez: categoría
(inferida hoy), fecha válida, Y casillas con los campos v4 completos. De ahí salen los 4
comparables — no es una coincidencia, es la intersección exacta de las tres condiciones.

**No se corrige acá.** Es exactamente la situación que el protocolo de sesión pide parar y
reportar: la premisa de esta sesión («con las dos decisiones de Kevin, la doble corrida corre
de verdad») era cierta para el MECANISMO, pero la COBERTURA real depende de un tercer factor
que nadie había medido — cuántos `lotItems` tienen los campos v4 completos. Es una pregunta de
alcance de la migración/clasificación, no un bug de esta rama.

## Qué falta para subir la cobertura más allá de 4/513

1. **Clasificar por W2 los 138 `lotItems` del riel viejo** (o decidir que no vale la pena, y
   dejar la doble corrida limitada a los lotes migrados). Es trabajo de captura, no de código.
2. **Decidir qué hacer con los lotes reconstruidos sin `fechaRecepcion`** — inventarles una
   fecha no es una opción (D6/la regla de no fabricar datos), así que la salida es o conseguir
   el dato real, o aceptar que esos lotes nunca van a cotizar mientras falte.
3. Ninguna de las dos es una decisión de código. La herramienta (`convex/dobleCorrida.ts`) ya
   está lista para correr apenas exista más superposición de las tres condiciones.

## Lo que queda construido y verificado

- `convex/_lib/dobleCorrida.ts` — `compararPreciosItemV3vsV4`, `mapearInventarioParaComparar`,
  `resumirComparacion`, más el bonus de detección (`revisarInferencia`,
  `paraRevisarInferencia`). 22 tests.
- `convex/_lib/categoriaFiscalInferencia.ts` — inferencia + gate de Fase 3. 10 tests.
- `convex/_lib/fechaSheet.ts` — normalización de fecha. 7 tests.
- `convex/dobleCorrida.ts`, `convex/categoriaFiscalInferencia.ts`, `convex/migracionV4.ts` — IO,
  solo lectura salvo los dos backfills explícitamente autorizados (fechas y categoría), ambos
  dev-only y verificados en vivo.
- Corrido en vivo tres veces contra dev y el SOT v3 en total (0 → 4 comparables), reproducible.

## Historial

<details>
<summary>Primera corrida (2026-08-01) — 0 de 513 comparables</summary>

Antes de las decisiones de Kevin del 2026-08-02: 0 de 128 lotes tenían `categoriaFiscal`, y 122
de 128 traían `fechaRecepcion` con sufijo de hora que `configVigenteEn` rechazaba. Detalle
completo de cómo se diagnosticaron los dos, preservado en el historial de git de este archivo
(`git log -p -- docs/superpowers/specs/2026-08-01-doble-corrida-item-por-item.md`).

</details>
