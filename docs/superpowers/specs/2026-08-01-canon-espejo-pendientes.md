# Canon de cabeceras — lo que entró y lo que quedó bloqueado

- **Fecha:** 2026-08-01 · **Estado:** reporte, requiere decisiones de Kevin
- **Contra:** [`2026-08-01-cabeceras-canonicas-sot-v4.md`](2026-08-01-cabeceras-canonicas-sot-v4.md)
- **Commits:** `d33b352` (Movimientos) · `2f48bfb` (Lotes + Casillas)

## Entró

| Pestaña     | Columnas nuevas                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Movimientos | `pagoComisionesA` · `creditoFechaInicio` · `creditoFechaPago` · `bancoOBilletera` · `refTransaccion` · `reciboCaja` · `quienRecibio` · `ubicacionEfectivo`   |
| Lotes       | `viaticosCOP` · `packingCOP` · `domicilioCOP` · `otrosVariablesCOP` · `tipoJoya` · `mineralJoya` · `gramajeJoya` · `costoPorGramoCOP` · `presupuestoJoyaCOP` |
| Casillas    | `renombreLote` · `tipoJoya` · `gramaje`                                                                                                                      |

La regla ⚠️ de datos sensibles está implementada y **testeada por el negativo**: el
test barre todos los valores de la fila buscando la cuenta y el titular, no solo
las columnas que hoy se llaman así. Uno que mirara `fila.numeroCuenta` no
atraparía a quien mañana los meta dentro de `condicion`.

## Bloqueado — el dato no existe todavía

Nada de esto es trabajo de espejo: son campos que W1/W3 aún no capturan. Agregar
la columna vacía sería peor que no agregarla — una columna que nunca se llena
invita a llenarla a mano, y el espejo es push-only: esa edición se reporta como
deriva y el próximo cambio la borra.

| Falta                    | Dónde       | Qué haría falta                                                                         |
| ------------------------ | ----------- | --------------------------------------------------------------------------------------- |
| Bloque Gema (8 columnas) | Lotes       | Los campos en el schema + su captura en W1. El canon ya lo anticipa en su nota (3).     |
| `nombre`                 | Lotes       | El canon lo lista aparte de `renombre`, que sí existe y ya viaja. ¿Son dos cosas o una? |
| `cantidadJoyas`          | Lotes       | No está en el schema; el bloque joya tiene los otros 5.                                 |
| `fechaPago`              | Lotes       | Existe `fechaVencimiento`, que no es lo mismo (cuándo se debe pagar ≠ cuándo se pagó).  |
| `tipo`                   | Casillas    | Parece ser el tipo de gema (Murralla, Gola…), o sea parte del bloque Gema.              |
| `fechaIngresoCaja`       | Movimientos | W3 no la captura; el resto del bloque efectivo sí entró.                                |

## Bloqueado — la regla no existe. **Esto sí necesita tu decisión**

Acá me detuve a propósito. Son cifras financieras cuya definición no está en el
código ni en el plan, y ponerles una fórmula plausible es exactamente el defecto
que este proyecto vino a matar: un número con forma de verdad que nadie decidió.

### 1. El motor por unidad (Casillas: `precioEquilibrioUnidadCOP`, `precioObjetivoUnidadCOP`)

No hay motor por unidad. El único número por pieza que existe hoy es
`precioPorUnidadCOP` del preview, y el propio código lo llama **reparto
referencial** con una advertencia al lado: «el precio real de cada pieza sale de
su costo unitario capturado en la casilla, jamás de dividir el lote».

El nudo es el gasto fijo. D2 lo define **por lote** (gastos fijos ÷ lotes
activos). Para precificar una casilla hay que decidir cuánto de ese fijo absorbe
cada pieza, y las tres salidas posibles son las tres malas:

- **cada casilla absorbe el fijo entero del lote** → la estructura se cobra N
  veces y el precio se infla con las unidades;
- **el fijo se reparte entre las casillas** → el precio de una pieza pasa a
  depender de cuántas hermanas tenga, que es justo el «dividir el lote» que D6
  prohíbe;
- **el divisor cambia de lotes activos a unidades activas** → es otro D2, o sea
  otro modelo de precios.

La tercera es defendible, pero es una decisión de negocio con efecto sobre todos
los precios, no un detalle de implementación.

### 2. Cinco de las trece del motor de Lotes

Ocho salen del motor tal como está (`costoFijoUnitarioCOP`,
`costoVariableUnitarioCOP`, `precioEquilibrioCOP`, `equilibrioRealCOP`,
`precioObjetivoCOP`, `multiplicadorObjetivo`, `reglaVigente`, `recalculadoEn`).
Las otras cinco no tienen definición en ninguna parte:

- `multiplicadorMinimo` — ¿equilibrio real ÷ costo de compra, o ÷ costo total?
- `margenBrutoEstimadoCOP` — ¿bruto contra qué costo: compra, o compra + variables?
- `utilidadNetaEstimadaCOP` — ¿neta después de comisión e IVA, sobre el lote entero?
- `puntoEquilibrioUnidades` — ¿cuántas unidades hay que vender para cubrir qué?
- `brechaVsVentasEstimadasCOP` — necesita **ventas estimadas del mes**, que no
  existe como dato en ningún lado.

**No las escribí a medias.** Ocho columnas con número y cinco vacías se lee como
«el motor falló», y el Léeme promete lo contrario.

### 3. La pestaña Tablero, por consecuencia

Cinco de sus doce columnas son las mismas de arriba. Las otras siete sí son
computables (`gastosFijosMesCOP`, `lotesActivos`, `costoFijoUnitarioCOP`,
`inventarioActivoCOP`, `ventasMesCOP`, `reglaVigente`, `actualizadoEn`), y
`ventasEstimadasMesCOP` es un dato de entrada que hoy nadie captura.

## Lo que pido

Tres respuestas, en este orden de impacto:

1. **El fijo por unidad** — ¿tercera salida (divisor por unidades activas), o las
   casillas no se precifican solas y el Tablero pierde esas dos columnas?
2. **Las cinco definiciones financieras** — una frase por cada una alcanza.
3. **`nombre` vs `renombre` y `fechaPago` vs `fechaVencimiento`** — si son
   sinónimos, mapeo lo que hay; si no, van al backlog de captura con las de Gema.

Con (1) y (2) el motor de Lotes, el motor por unidad y el Tablero entran juntos y
en un solo commit. Sin ellas, lo que entre va a ser un número que nadie decidió.
