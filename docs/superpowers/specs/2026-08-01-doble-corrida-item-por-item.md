# La doble corrida ítem por ítem (SOT-V4-FASE1, punto 8) — herramienta lista, datos no

> Corrida en vivo el 2026-08-01 contra el SOT v3 (solo lectura, gratis) y Convex dev
> (`flexible-wolverine-803`). Cero escritura en ninguno de los dos. **Resultado: 0 ítems
> comparables**, no por un defecto del comparador — por dos precondiciones del motor v4 que
> hoy no se cumplen para NINGÚN lote de dev. Documentado, no corregido: las dos son de
> Kevin, no de código.

## Qué compara y con qué columnas

- **v3 — «el precio real»:** `precioFinalCOP` (columna M de Inventario). Es **SHEET-OWNED**
  desde 2026-07-23 (`convex/_lib/sheetPullMaps.ts:88`): un humano lo fija en la hoja y viaja
  de vuelta a Convex; `costoBaseCOP × 2.6` solo es la semilla de un ítem nuevo. Es la lista de
  precios oficial vigente, no una fórmula.
  - **Descartadas a propósito:** `AT` («Precio objetivo (modelo)») es el objetivo que
    calculaba el xlsx viejo a mano — es el modelo que v4 viene a reemplazar, no la vara para
    medirlo. `AU` («Caja: precio venta») es el valor de una transacción de caja, no un precio
    de lista.
- **v4 — lo que el motor recomendaría:** `precioObjetivoUnidadCOP` (piso + 30% de margen
  neto). No `equilibrioRealUnidadCOP` (es el piso de no perder plata) ni `KUnidadCOP` (ni
  siquiera viaja al espejo).

Herramienta construida con TDD (`convex/_lib/dobleCorrida.ts` + `tests/dobleCorrida.test.ts`,
17 casos) y su wiring de IO (`convex/dobleCorrida.ts:ejecutar`, solo lectura). Es reporte, no
corrección — no decide cuál precio es el correcto, mide y deja evidencia.

## El resultado real: 0 de 513 ítems comparables

```
filasHojaLeidas: 513
comparables: 0
sinComparar:
  - 480 · "v4 no cotiza el ítem (sin casilla, sin costo capturado, o lote sin categoría fiscal)"
  -  33 · "sin precioFinalCOP en el SOT v3"
```

No es que las diferencias sean pequeñas: **no hay ninguna**, porque `preciosPorItemDb` no le
calcula precio a ningún lote de dev hoy. Diagnosticado antes de aceptar el cero como
respuesta (la lección del propio doc: «un cero que nadie calculó se lee como un hecho»).

## Por qué — dos precondiciones que fallan para TODO dev, no solo para los 28 reconstruidos

### 1. `categoriaFiscal`: 0 de 128 lotes la tienen

```
totalLots: 128
conCategoriaFiscal: 0
```

Esto **ya estaba anotado** como punto 7 («categoría fiscal, criterio por lote — Kevin, no
código») y como deuda de los 28 lotes reconstruidos por la migración. Lo que este diagnóstico
agrega: **no son 28, son los 128** — ni los lotes viejos (pre-migración) la tienen. El punto 7
no bloquea una porción de la doble corrida: la bloquea ENTERA.

### 2. `fechaRecepcion`: 6 de 128 lotes están en formato `AAAA-MM-DD` — hallazgo nuevo

`configVigenteEn` (`convex/_lib/motorPrecios.ts:157`) exige la fecha en `AAAA-MM-DD` exacto
(`/^\d{4}-\d{2}-\d{2}$/`) y revienta si no matchea — antes incluso de mirar si hay una config
vigente para esa fecha. La mayoría de `lots.fechaRecepcion` en dev trae la celda de Sheets tal
cual la sirve `FORMATTED_VALUE`, con hora:

```
"2026-05-25 00:00:00"   (C-001..C-007, la mayoría)
"2026-05-26 0:00:00"    (C-009 — ni siquiera el padding es consistente)
```

`convex/_lib/sheetPullMaps.ts:192` trae `fechaRecepcion: { coerce: 'str' }` — texto tal cual,
sin truncar a la fecha. **No es un problema de la hoja: es que nada en el camino
Sheet→Convex→motor normaliza la celda antes de que `configVigenteEn` la exija estricta.**

Este hallazgo es independiente del punto 7: **aunque los 128 lotes tuvieran `categoriaFiscal`
mañana, 122 de ellos seguirían sin cotizar** por este segundo motivo, porque
`preciosPorItemDb` llama `configVigenteEn` antes de mirar la categoría fiscal
(`convex/precios.ts:199`) y ese `catch` los descarta en silencio hacia el mismo balde genérico
de «no cotiza» — que es por lo que el resumen de la corrida no puede distinguir hoy cuál de
las dos razones aplica a cada lote.

**No lo corrijo acá, por las mismas dos reglas que gobiernan esta rama:** no se inventa un
criterio de negocio (punto 7 es de Kevin) y una contradicción entre spec y realidad se
reporta, no se resuelve por cuenta propia — sobre todo tocando `configVigenteEn`, que es
motor central con paridad pinneada contra la auditoría del 25/07.

## Qué falta para que la doble corrida produzca números reales

1. **Punto 7 resuelto** (Kevin): `categoriaFiscal` puesta en los 128 lotes, o al menos en un
   subconjunto representativo suficiente para una primera lectura.
2. **Una decisión sobre `fechaRecepcion`**, que es nueva y no estaba en la mesa: ¿se normaliza
   en el pull (`sheetPullMaps.ts`, truncar a los primeros 10 caracteres antes de guardar), en
   el motor (`configVigenteEn` tolera un sufijo de hora), o en la migración? Cualquiera de las
   tres es una decisión de diseño, no una corrección obvia — tocar el motor central de precios
   sin que alguien la apruebe es exactamente lo que esta rama viene evitando.

Con las dos resueltas, `npx convex run dobleCorrida:ejecutar '{}'` ya está listo para producir
la tabla real: la función pura está testeada contra los mismos casos pinneados de
`motorUnidad.test.ts`, y el resumen agrega por mediana y buckets (no por suma) siguiendo el
mismo criterio que `2026-08-01-tabla-comparativa-divisor.md`, para que tres ítems de nueve
cifras no ahoguen la lectura del típico.

## Lo que el punto 8 deja construido, aunque no haya números que mostrar todavía

- `convex/_lib/dobleCorrida.ts` — `compararPreciosItemV3vsV4`, `mapearInventarioParaComparar`,
  `resumirComparacion`. Puro, 17 tests, `tsc -p convex` limpio.
- `convex/dobleCorrida.ts` — `ejecutar` (internalAction, solo lectura) + `_preciosV4`
  (internalQuery, serializa el `Map` de `preciosPorItemDb` para cruzar el límite action→query).
  Reutiliza `migracionV4:leerTabla` en vez de duplicar el fetch a la hoja.
- Verificado en vivo dos veces contra dev y el SOT v3: mismo resultado reproducible
  (`filasHojaLeidas: 513`, `comparables: 0`), no un fluke de una corrida.
