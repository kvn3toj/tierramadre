# Cabeceras canónicas del SOT v4 — según los wizards (dictado de Kevin)

- **Fecha:** 2026-08-01 · **Estado:** canon aprobado por Kevin — el espejo debe converger a esto
- **Qué es:** la lista definitiva de cabeceras por pestaña, derivada del modelo 2-Cerebros +
  Venta dictado por Kevin (2026-07-31, re-confirmado 2026-08-01). Lo implementado en
  `espejoFilas.ts` es un subconjunto correcto; este doc define el objetivo completo y el delta.
- **Reglas vigentes que no cambian:** cabeceras nombradas (nunca posición) · todo serializado a
  texto · la hoja es vista, Convex es la fuente · push-only.

## Pestaña LOTES — 🧮 Cerebro Racional (W1)

**Identificación**
`loteId` · `nombre` · `categoriaFiscal` ⭐(piedras | gemas y joyas | lotes de gemas | lotes de
piedras | lotes de joyas → resuelve régimen fiscal) · `sede` · `renombre` · `fecha` · `estado`

**Bloque Gema** (si la categoría lo pide)
`tipoGema` (Murralla, Piedra Cristal, Gola, Raíz, Faceteada, Rarezas) · `cantidadGemas` ·
`corteGema` (redondas, cuadradas, baguette, esmeralda, variado…) · `pesoTotalCt` ·
`calidadPromedio` (comercial, fina, extrafina) · `medidaPromedio` · `pesoGemaPromedioCt` ·
`costoPorCtCOP`

**Bloque Joya** (si la categoría lo pide)
`tipoJoya` (topitos, aretes, pulseras, anillos mujer, anillos hombre, dije, manilla) ·
`mineralJoya` (oro, plata, bronce, tela) · `gramajeJoya` · `cantidadJoyas` ·
`costoPorGramoCOP` · `presupuestoJoyaCOP`

**Costos**
`viaticosCOP` · `packingCOP` · `domicilioCOP` · `otrosVariablesCOP` · `costosVariablesCOP`
(total) · `costoCompraCOP` · `costoTotalCOP` · `unidades`

**Motor de precios — SOLO LECTURA, escritas por el recálculo, jamás editables**
`costoFijoUnitarioCOP` · `costoVariableUnitarioCOP` · `precioEquilibrioCOP` (K) ·
`equilibrioRealCOP` · `precioObjetivoCOP` · `multiplicadorMinimo` · `multiplicadorObjetivo` ·
`margenBrutoEstimadoCOP` · `utilidadNetaEstimadaCOP` · `puntoEquilibrioUnidades` ·
`reglaVigente` (remate | objetivo) · `recalculadoEn`

> **Corregido 2026-08-01 (Kevin).** `brechaVsVentasEstimadasCOP` **sale de Lotes y se muda al
> Tablero**: por lote nunca tuvo sentido — en el xlsx era modelo-global (E13) y necesita las
> ventas estimadas del mes, que son un dato de la operación, no del lote.

**Info proveedor**
`proveedor` · `formaPago` · `fechaPago` · `abonoCOP` · `saldoCOP`

## Pestaña CASILLAS — 🎨 Cerebro Creativo (W2)

`itemId` (código, conectado al lote) · `loteId` · `orden` · `renombreLote` · `renombreUnidad` ·
`estadoCasilla` (PENDIENTE_CLASIFICAR → DISPONIBLE → RESERVADA → EN_CONSIGNACION → VENDIDA) ·
`categoriaFiscal` (cuando el lote es mixto) · `calidadGema` (toda la gama, hasta NO Oil) ·
`tipo` · `color` · `corte` · `ct` · `gradoRareza` · `tipoJoya` · `gramaje` ·
`costoUnitarioRealCOP` · `rangoVentaEsperadoCOP`

**Motor por unidad — SOLO LECTURA:** `equilibrioRealUnidadCOP` · `precioObjetivoUnidadCOP`

> **Corregido 2026-08-01 (Kevin).** La primera columna se llamaba
> `precioEquilibrioUnidadCOP` y se renombró. **Regla de nombres, fijada:**
> `equilibrioReal*` = el PISO real (`K/0,90` gema · `K/0,71` joya) SIEMPRE;
> `precioEquilibrio*` = `K`, y solo existe a nivel lote. **K_unidad NO gana columna acá**: K
> disfrazado de «equilibrio» fue el habilitador del defecto ③ de la hoja —el lote 14 ofrecido a
> $27.080 de perder plata creyendo tener 30% de margen— y no vuelve.
>
> Las dos celdas van **vacías** cuando la casilla no tiene costo capturado o el lote no pasó la
> conciliación. O cotizan todas las casillas del lote, o ninguna: el fijo se reparte por peso
> del costo, así que sin el costo de una hermana los pesos de TODAS están mal.

## Pestaña MOVIMIENTOS — W3/W5

**Comunes:** `movimientoId` · `kardexEventId` · `tipo` · `fecha` · `items` · `entregadoPor` ·
`recibidoPor` · `condicion` · `origenKardexEventId`

**Bloque Venta:** `cliente` · `precioVentaRealCOP` · `comisionPct` · `pagoComisionesA` ·
`metodoPago` (crédito | efectivo | transferencia) y sus condicionales:
- crédito → `creditoFechaInicio` · `creditoFechaPago`
- transferencia → `bancoOBilletera` · `refTransaccion` ⚠️
- efectivo → `reciboCaja` · `quienRecibio` · `fechaIngresoCaja` · `ubicacionEfectivo`

⚠️ **Regla de datos sensibles (obligatoria):** el wizard W3 SÍ captura cuenta completa y
titular — pero **al espejo nunca viajan completos**. La hoja la ve todo el que tenga el libro,
y acabamos de matar una query por exponer exactamente cuenta+titular. Al espejo va
`bancoOBilletera` + `refTransaccion` (últimos 4 dígitos / # de recibo); la cuenta completa y el
titular viven solo en Convex, tras el gate de rol. Mismo criterio para `pagoComisionesA`:
nombre sí, cuenta enmascarada.

## Pestaña TABLERO — el motor agregado (valores calculados por Convex, no fórmulas de hoja)

`gastosFijosMesCOP` · `lotesActivos` · `costoFijoUnitarioCOP` · `inventarioActivoCOP` ·
`ventasMesCOP` · `margenBrutoMesCOP` · `utilidadNetaEstimadaCOP` · `puntoEquilibrioUnidades` ·
`brechaVsVentasEstimadasCOP` · `ventasEstimadasMesCOP` · `reglaVigente` · `actualizadoEn`

> **Precisado 2026-08-01 (Kevin).** **Una fila por MES**, `idFila = AAAA-MM`, y la frontera del
> mes es `America/Bogota` (offset fijo −05:00): un recálculo a las 23:00 del 31 cae en el mes
> viejo. Eso obliga a una columna **`periodo`** como primera cabecera —el upsert necesita dónde
> buscar el id—, así que la pestaña tiene **13** columnas, no 12.
>
> `ventasEstimadasMesCOP` es **dato de ENTRADA** de `configPrecios`, dictado por Kevin y
> versionado por período igual que los gastos fijos. El `B11` del xlsx era `=B4*2,5`, un
> multiplicador hardcodeado que nadie decidió, y muere. Mientras no se dicte, ella y la brecha
> van **vacías** — un cero inventado es el mismo defecto con otra cara.

## Qué NO es pestaña del SOT

El **wizard de cotización** (levantamiento + IA) no espeja al SOT: sus leads y propuestas viven
en el cotizador (anima-bot/GHL). Si algún día se quiere una vista, será pestaña `Cotizaciones`
con su propio diseño — fuera de este canon.

## Delta contra lo implementado (`espejoFilas.ts` hoy)

| Pestaña | Ya está | Falta |
| --- | --- | --- |
| Lotes | id, fecha, proveedor, categoría, costos (3), unidades, abono, saldo, formaPago, estado, sede, renombre | `nombre`, bloque Gema (8), bloque Joya (6), desglose de variables (4), motor (13), `fechaPago` |
| Casillas | itemId, loteId, orden, estadoCasilla, categoría, costoUnitarioReal, renombre, calidad, color, corte, ct, gradoRareza, rangoVentaEsperado | `renombreLote`, `tipoJoya`, `gramaje`, `tipo`, motor por unidad (2) |
| Movimientos | id, kardexEventId, tipo, fecha, items, entregadoPor, recibidoPor, cliente, precioVentaReal, comisionPct, formaPago, origenKardexEventId, condicion | condicionales de pago (8, con enmascarado), `pagoComisionesA` |
| Tablero | — | completa |

Notas de implementación: (1) agregar cabeceras es **aditivo** — el upsert por cabecera nombrada
no rompe con columnas nuevas, y el orden es libre; (2) los campos del motor se escriben en el
mismo push del recálculo, marcados solo-lectura en el Léeme; (3) los bloques Gema/Joya
requieren primero sus campos en el schema/mutation de W1 (los de joya ya existen desde Task B1;
los de gema hay que completarlos); (4) la captura de datos de pago completos en W3 exige el
gate de rol en la query correspondiente ANTES de capturarlos — no repetir el leak.
