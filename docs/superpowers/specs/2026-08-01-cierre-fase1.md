# Cierre — Fase 1 de W1–W3 + SOT v4

> **Protocolo de sesión (obligatorio).** Este doc es la **única memoria compartida** entre
> sesiones de W1–W3 + SOT v4. Hay varias trabajando el mismo frente con estados distintos.
>
> Antes de tocar nada: leelo **COMPLETO** —incluidas las últimas secciones, que son las más
> nuevas— y leé `git log --oneline main..HEAD`. Tu contexto puede estar desfasado respecto a
> él. Escribirle sin leerlo entero es editarlo a ciegas.
>
> Las reglas/nombres/comandos que **no cambian de jornada a jornada** (invariantes de proceso,
> deployments, comandos utilitarios, env vars, inventario de endpoints) viven en
> `protocolo-sot-v4.md`, no acá — leelo también. Este doc es el log operativo: qué pasó hoy, qué
> quedó bloqueado.
>
> Cuando termines, escribile de vuelta: lo que no queda acá, la próxima sesión no lo sabe.

- **Fecha:** 2026-08-01 · **Rama:** `feat/w1-w3-sot-v4` (38 commits, sin mergear)
- **Deployment:** Convex dev `flexible-wolverine-803` · **Prod intacto**
- **Suite:** 914 tests / 99 archivos al cierre de la primera ronda →
  **1137 / 109** al cierre de la segunda (ver «Segunda jornada» al final)

## Qué quedó funcionando

El ciclo completo corre en dev y está verificado contra el servidor, no solo en
tests:

1. **W1** — capturar un lote con la categoría fiscal como gate y el motor
   cotizando mientras se escribe. Guardar crea las casillas, dispara el
   recálculo del gasto fijo y encola la fila al espejo.
2. **W2** — clasificar cada casilla con su **costo unitario capturado**,
   completeness score, conciliación contra el costo del lote, y gate de
   publicación con override registrado.
3. **W3** — venta, consignación, devolución y asesor en un solo formulario, con
   la graduación consignación → venta trazada por `origenKardexEventId`.
4. **Espejo** — todo lo anterior aparece en «SOT v4 · Espejo (PRUEBAS)» por
   cabecera nombrada, con upsert idempotente y detección de deriva.

### La demo, con datos reales

| Paso          | Evidencia                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| Lote gema     | `B-002`, 4 casillas (`#525–528`), recálculo 60 → 61 lotes                                                           |
| Lote joya     | `B-003` con bloque joya, recálculo 61 → 62                                                                          |
| Clasificación | Los 4 ítems del lote 10 con sus costos reales (268.983 · 353.210 · 81.510 · 228.228)                                |
| Conciliación  | `B-004` cuadra en 0 teniendo $25.000 de costos variables                                                            |
| Gate          | Publicar sin clasificar falla nombrando las casillas; parcial sin motivo falla; parcial con motivo queda registrado |
| Consignación  | `526` y `527` a Pablo Loaiza, **sin** recálculo (correcto)                                                          |
| Graduación    | `526` vendida en $918.346 con `origenKardexEventId` apuntando a su consignación                                     |
| Doble venta   | Revender `526` falla                                                                                                |
| Espejo        | Pestañas Léeme · Lotes · Casillas · Movimientos, **deriva 0** en las tres                                           |
| Deriva        | Editar `Lotes!E2` a mano se reporta; tras re-empujar vuelve a 0                                                     |

## Paridad del motor

Los 5 casos del handoff reproducen byte a byte, pinneados en
`tests/motorPrecios.test.ts`: fijo 33.651.815 ÷ 76 = **442.787** · lote 10 →
**2.306.348** · lote 14 → **3.282.620** · ítem 295 oro **3.438.059** y plata
**1.502.059** · equilibrio real gema K/0,90 y joya K/0,71.

## ✅ El divisor del gasto fijo — APROBADO (Kevin, 2026-08-01)

> **Lo aprobado es la REGLA, no la cifra:** activo = todo lote con al menos una
> unidad ≠ VENDIDA, contado **en vivo desde la tabla**. El número es dinámico y va
> a derivar con cada alta y cada venta; esa es justamente la diferencia con el
> `B6` escrito a mano.
>
> Hoy la regla da **88 lotes activos / $382.407** por lote. La consecuencia
> —fijo −13,6%, mediana −5,7% de caída del objetivo por lote— queda registrada
> como **esperada**, no como un problema a investigar.
>
> Las 25 filas con estado en blanco quedaron dictaminadas como inventario vivo
> (ver `2026-08-01-filas-estado-en-blanco.md`), así que el criterio A corre sobre
> datos ya interpretados, sin ambigüedad.
>
> **El divisor queda FIRME.** Desbloquea: refresco de dev → merge → doble corrida.

### Cómo se llegó (y el error del camino)

> **El «+27%» que reporté el 2026-08-01 era FALSO.** Salía de contar el inventario de
> dev, congelado al 22-23 de julio. Contra el SOT v3 vivo el efecto va en la
> dirección CONTRARIA. Queda registrado como artefacto de datos viejos.

Leído del SOT v3 vivo (gratis, sin tocar Convex prod):

| Divisor                                            | Lotes activos | Fijo por lote | vs la hoja |
| -------------------------------------------------- | ------------- | ------------- | ---------- |
| La hoja (`B6`, a mano)                             | 76            | $442.787      | —          |
| **A** · las 25 filas en blanco son inventario vivo | **88**        | **$382.407**  | −13,6%     |
| **B** · las 25 son vendidas sin marcar             | 81            | $415.455      | −6,2%      |
| ~~dev (obsoleto, 22-23 julio)~~                    | ~~60~~        | ~~$560.864~~  | ~~+26,7%~~ |

**Las dos cotas quedan por encima de 76**, así que el gasto fijo por lote BAJA en
ambos casos y los precios objetivo bajan con él. La dirección no depende del
dictamen de las 25 filas; solo la magnitud.

Efecto medido por lote (no en agregado — tres lotes de más de $50M ahogan
cualquier suma): **mediana −5,7%**, y 51 de 88 lotes caen más de 5%.

Detalle en `2026-08-01-tabla-comparativa-divisor.md`. Las 25 filas a dictaminar,
con hipótesis por fila, en `2026-08-01-filas-estado-en-blanco.md`.

**Lección de método:** calcular un número de negocio sobre un deployment de
pruebas y reportarlo como hecho. La foto de dev tenía 10 días y 34 piezas menos
en DISPONIBLE. Los números que deciden se leen de la fuente viva.

### Dos filas que la lectura destapó

- **`C-085` cotizaba con costo 0.** Su «precio» era 100% gasto fijo y 0%
  mercancía. **Cerrado:** el motor ya no cotiza un lote sin costo capturado —
  devuelve el aviso `SIN_COSTO_CAPTURADO`, nunca un precio
  (`_lib/previewLote.ts`, con test).
- **`LC-03` declara $1.233.703.846.** Puede ser un lote de colección real o el
  total del lote metido en la fila de un ítem. **NO se corrige por cuenta
  propia** (dictamen de Kevin): va al **reporte de excepciones de la migración**
  para auditar con Kevin ANTES de que la Fase 2 lo tome como verdad.
  > ⚠️ **Actualizado la tarde del 2026-08-01.** La cifra de arriba está VIEJA: la
  > hoja hoy dice **$1.069.210.000**. Y la hipótesis del «total en la fila de un
  > ítem» no alcanza — LC-03 es internamente coherente, sus piezas suman lo que
  > declara. Ver «El inventario declarado es 25× el auditado» al final.

## Desviaciones del plan (y por qué)

1. **Las casillas v4 no crean filas en `productInventory`.** Crearlas dispararía
   el push legacy al SOT v3 vivo y sembraría un precio con el multiplicador plano
   2,6×. Consecuencia: W3 se construyó como superficie v4 propia y `VentaPage` /
   `MovimientosKardexPage` quedaron intactas, en vez de ganar el tipo VENTA
   in-place como decía la letra del plan.
2. **`costoUnitarioRealCOP` es un campo nuevo.** El gap doc afirmaba que
   `lotItems.costoBaseCOP` ya era el costo capturado; en realidad nace en cero,
   es propiedad de la hoja, y el helper que lo llenaba (`deriveCostoBaseCOP`) es
   prorrateo del que D6 prohíbe.
3. **TDD sobre funciones puras**, no sobre validators de mutation: el repo no
   tiene `convex-test` ni ningún arnés. Acordado con Kevin.
4. **El gate de commit suma `tsc -p convex`**, que `npm run lint` no cubre.
5. **`npm run lint` está roto en `main`** (dos TS7016 en `api/cotizacion-deck.ts`
   por `.js` sin tipos). Verificado en un worktree limpio: es pre-existente. No
   lo arreglé porque `api/` se despliega a Vercel y estaba fuera de alcance.

## Decisiones nuevas tomadas en esta sesión (con Kevin)

- **Espejo por Sheets API directo** desde Convex, con las credenciales OAuth que
  el repo ya usa. Hallazgo: el libro se compartió con la service account, pero
  este repo **no la usa** — autentica con refresh token de cuenta personal.
- **Divisor derivado, no fijado.** Kevin decidió seguir con el número que sale de
  contar (D2 ya lo pedía) en vez de fijar el 76 de la hoja. El número y sus
  consecuencias quedaron abiertos para su visto bueno — ver la sección ⚠️ de
  arriba.
- **W1 en ruta nueva con flag** (`VITE_CAPTURA_V4`), no evolucionando la página
  actual.
- **`APP_URL` de dev**: en la primera ronda se dejó solo documentado; en la
  segunda Kevin pidió arreglarlo, y quedó cerrado con un candado por dirección
  (ver «Cerrado en la segunda ronda»).

## Defectos encontrados (dos míos, uno del terreno)

1. **`APP_URL` del deployment de dev apunta a `https://tierramadre.app`.**
   Capturar por la página vieja en dev **escribía en el SOT v3 vivo**. Es
   pre-existente e independiente de este trabajo. **CERRADO** en la segunda
   ronda: un deployment que no es producción ya no le escribe a un host de
   producción (`_lib/destinoEscritura.ts`).
2. **Conciliación contra el costo equivocado** (mío): comparaba Σ casillas contra
   el landed cost, inventando un descuadre igual a los costos variables. Ahora
   `lots.costoCompraCOP` guarda el costo puro.
3. **El espejo se quedaba viejo** (mío): publicar un lote y mover una pieza
   cambiaban campos espejados sin re-encolar. Lo encontró el propio job de
   deriva. Regla que deja: **toda mutación que cambie un campo espejado tiene que
   re-encolar**.

## Lo que la Fase 2 necesita de aquí

- El motor y el recálculo están listos para que el script de migración los use:
  `costoFijoUnitario(gastos, lotesActivos)` y `configVigenteEn(configs, fecha)`.
- **Las tres decisiones abiertas siguen bloqueando prod**: los 5 lotes con
  diferencia real (7, 15, 17, 19, 30), la revisión gema/joya ítem por ítem, y los
  libros de Vikinga. La conciliación ya está construida para mostrar la primera.
- La migración tendrá que llenar `categoriaFiscal` en todas las unidades: el
  motor **lanza** si falta, sin default.
- El bloque AQ–BE del inventario espera la decisión #4 (ver
  `2026-08-01-writable-inventory.md`).

## Cerrado en la segunda ronda (decisiones de Kevin, 2026-08-01)

- **`previewLote` gateado.** Dejó de ser query pública: ahora es una action que
  verifica identidad y rol (`ROLES_COSTOS = ['admin']`) antes de tocar la base.
  Verificado contra el servidor: sin `idToken` rechaza en el validator, con token
  inválido rechaza en authz, y ninguno filtra un dato. Costo asumido: el preview
  perdió la reactividad y ahora se pide con debounce de 350 ms.
- **Drenaje híbrido.** Cada mutación que encola agenda su `espejo:drenar` con
  `runAfter(0)` — verificado: un lote nuevo llega a la hoja sin drenar a mano — y
  un cron de rescate cada 30 min recoge lo atascado. El cron sale **apagado**
  (`ESPEJO_CRON`), mismo idioma que los otros dos; encenderlo en prod exige la
  medición de la doble corrida.
- **Dev ya no puede escribir al SOT v3.** Candado por dirección: un deployment
  que no es producción no le escribe a un host de producción. No se resolvió
  vaciando `APP_URL` porque esa variable también sirve las lecturas de `authz.ts`
  (sin ella dev se queda sin autenticación). Verificado en vivo: `lots:retryPush`
  responde BLOQUEADO. Prod intacto.
- **Dev limpio.** Borrados B-002…B-005 con sus casillas, movimientos, cola y
  recálculos; el libro de PRUEBAS quedó con las tres pestañas vacías y las
  cabeceras puestas. Dev volvió a **60 lotes activos / $560.864**.

## Inventario de endpoints publicos - el barrido inverso

Regla que sale del propio hallazgo: blindar `previewLote` no servia de nada
mientras cinco vecinas regalaban lo mismo. Antes de dar por cerrado un gate hay
que enumerar TODAS las puertas, no solo la que se esta cerrando.

El inventario completo (139 endpoints, las tablas "Riel v4"/"Riel viejo" y la
recomendación de extender `_lib/saleSafe.ts`) vive en `protocolo-sot-v4.md` §5
— se actualiza ahí a medida que aparecen endpoints nuevos, no acá.

## Pendientes antes de prod (no bloquean la Fase 2)

- Las credenciales OAuth quedaron como env vars del deployment dev (nombres en
  `protocolo-sot-v4.md` §4). Prod necesitará las suyas, apuntando a otro libro.
- Encender `ESPEJO_CRON` en prod, con la medición de consumo hecha.
- **P0 con presupuesto propio de UI, primera tarea tras el merge:** cerrar la
  exposición de costo de `products.publishedCatalog` y `products.list` (es de
  `main`, no de esta rama, pero `publishedCatalog` es la query de cara al
  cliente). Enfoque aprobado: **extender `_lib/saleSafe.ts`**, que recorta el
  payload y conserva la reactividad, en vez de convertir a actions. En el mismo
  trabajo entran los campos v4 que salen por `lots.list` y
  `lotItems.listByLote` (`costoCompraCOP`, `abonoCOP`, `saldoCOP`,
  `costosVariables[]`, `costoUnitarioRealCOP`).
- **Refrescar dev con un pull UNA vez**, después de que el divisor esté firme y
  antes de arrancar la doble corrida — no en medio de nada. Dev quedó congelado
  al 22-23 de julio y su deriva contra el SOT vivo ya está medida (34 piezas
  menos en DISPONIBLE, ASESOR 0 contra 14, 25 filas en blanco que dev no tiene).
- Actualizar la CLI de Convex (1.35.1 → 1.43.0). Se dejó fuera a propósito:
  cambiar la versión a mitad de una rama sin mergear mezcla dos riesgos.
- Revisión adversarial de la rama antes del merge.

## Lo que NO se hizo, a propósito

Nada mergeado a `main`, nada desplegado a prod, ningún daemon tocado, ninguna env
var de Vercel modificada, y el SOT v3 vivo sin una sola escritura desde este
trabajo. W4, la migración v3→v4, la Mini App y la limpieza de tiers deprecados
siguen fuera de alcance.

---

# Segunda jornada — 2026-08-01 (tarde)

Cinco commits sobre lo anterior: `96dec30` migración · `2d5c54a` motor por unidad ·
`7cd8d87` motor de lotes + Tablero · `49f80b0` captura W1/W3 · este doc.

> **Otra sesión commiteó en esta misma rama mientras esta jornada corría:** `6104947`
> (`fix(catalogo)`, 13:29). No hubo conflicto y no hizo falta integración inversa —`main` no se
> movió—, pero es exactamente el escenario que el Protocolo de sesión del tope viene a cubrir.
> Si vas a abrir una sesión en paralelo, releé el `git log` antes de asumir tu punto de partida.

Suite **1137 tests en 109 archivos** (de 1040/106). `tsc` de convex limpio; `npm run lint`
sigue con los dos TS7016 preexistentes de `main`.

## La reconciliación del divisor — cerrada

### 1. Cronología de los números

| Cifra  | Qué era                                           | Estado                                             |
| ------ | ------------------------------------------------- | -------------------------------------------------- |
| **60** | dev congelado al 22-23 de julio                   | **MUERTA** — el refresco + import ya lo llevó a 66 |
| **66** | prod y dev, por D2 sobre el enlace de ese momento | superada por la migración                          |
| **88** | el SOT vivo, con las 25 filas dictaminadas        | **es la cifra, y dev ya la reproduce**             |

El **+27% sigue tachado**. No se recalculó repricing sobre el 66 en ningún momento.

### 2. Por qué 66 ≠ 88 — el mecanismo exacto, leído del código

Subconteo por linkage roto: 138 de 513 ítems tenían fila en `lotItems`, 290 eran huérfanos
(`804458e`). El mecanismo preciso está en `contarLotesActivosDb` (`convex/precios.ts`):
siembra su mapa **solo con filas de `lots`** y después hace `porLote.get(item.loteId)?.push(…)`.
Una pieza cuyo lote Convex nunca conoció se descarta en silencio — el `?.` es literalmente
donde se perdían.

**No era un criterio distinto: era dato incompleto.** Los 28 lotes no cabían en la tabla por
dos razones concretas, y las dos se cerraron: `reconstruido` estaba fuera de la unión de
`estado`, y no traen proveedor.

### 3. Conclusión operativa — ya no es una espera

D2 está aprobada y es la misma en todos lados. La migración de ensayo corrió en dev el
2026-08-01 y **el conteo convergió exacto**:

```
lotesActivos: 88 · costoFijoUnitarioCOP: $382.407 · unidadesActivas: 320
```

No «cerca de 88»: **88**, la misma cifra que el SOT vivo. Dev ya reparte el gasto fijo como la
operación, así que la doble corrida tiene con qué comparar. La regla sigue siendo que **todo
número de divisor se reporta con su fuente y su fecha**.

### 4. Gotcha para el handoff

`superb-ocelot-537` / `coomunity-sim` son de **otro proyecto hermano**. Los deployments de ESTE
repo son solo `flexible-wolverine-803` (dev) y `grand-hippopotamus-162` (prod), y las URLs están
leídas del deployment real, no deducidas por convención (`_lib/destinoEscritura.ts`). Que nadie
vuelva a inferir nombres.

### 5. Política de lectura de prod

La lectura de prod que se hizo queda registrada como **one-off autorizado retroactivamente**
(dumps de tablas, sin escritura). La política sigue: prod no se lee por rutina. **El SOT es la
fuente gratuita para conteos**; Convex prod solo con autorización explícita y acotada.

## Lo que la migración destapó — para Kevin, sin corregir

### ⚠️ El inventario declarado es 25× el auditado

El Tablero reporta `inventarioActivoCOP` = **$1.777.030.371**. La auditoría del 25/07 midió
**$71.769.301**. La diferencia no está repartida: son unas pocas piezas de los lotes `LC-*`.

| ítem | lote  | costo declarado  |
| ---- | ----- | ---------------- |
| 193  | LC-03 | **$357.923.077** |
| 192  | LC-03 | $318.807.692     |
| 194  | LC-03 | $235.038.462     |
| 195  | LC-03 | $162.750.000     |
| 203  | LC-01 | $98.076.923      |
| 191  | LC-03 | $87.692.308      |

**LC-03 es internamente COHERENTE**: sus piezas suman los $1.069.210.000 que declara el lote,
así que pasa la conciliación. La hipótesis vieja —«el total del lote metido en la fila de un
ítem»— **no alcanza a explicarlo**: la hoja las declara así, una por una.

Si son piezas de colección reales, el número está bien y el Tablero solo lo está mostrando por
primera vez. Si es un error de escala, el titular del Tablero está 25× arriba. **Es tu llamada:
el código no toca ninguna.**

### La cifra de LC-03 del doc estaba vieja

Este doc decía que LC-03 declaraba **$1.233.703.846**. La hoja hoy dice **$1.069.210.000**.
No es una contradicción a resolver: el dato cambió. Queda anotado para que nadie compare contra
la cifra vieja.

### Seis lotes declaran costo y no tienen ni una pieza enlazada

`COSTO_INCONSISTENTE` no podía verlos: se salta el lote sin piezas, porque sin ellas no hay con
qué comparar — y ese `continue` dejaba pasar en silencio justo la forma que había que auditar.
El código nuevo `LOTE_SIN_PIEZAS` los reporta: **C-017 y S-001 declaran $378.000.000 cada uno**,
más C-039, C-054, MED-001 y MED-012.

### Los 28 lotes reconstruidos no tienen categoría fiscal

Consecuencia buscada, no defecto: la migración **no se la inventa**. Sin ella el motor no
cotiza, así que sus 375 casillas tienen las celdas de precio **vacías** en el espejo. Llenar
`categoriaFiscal` es trabajo de la Fase 2, y hasta entonces vacío es la respuesta honesta.

## Decisiones de Kevin implementadas en esta jornada

- **El fijo por unidad se reparte POR PESO DEL COSTO CAPTURADO**, con un solo fijo por lote
  (D2 intacto). No viola D6 —el costo capturado es el insumo, solo el overhead se asigna— y es
  el método con que la auditoría validó el lote 10. Bonus estructural: vender el lote completo
  o por partes suma exactamente un fijo, así que el +18% accidental de las modalidades muere
  por diseño.
- **`equilibrioRealUnidadCOP`**, no `precioEquilibrioUnidadCOP`. Regla de nombres fijada:
  `equilibrioReal*` = piso real siempre; `precioEquilibrio*` = K, y solo a nivel lote. K_unidad
  **no gana columna** — K disfrazado de «equilibrio» habilitó el defecto ③ de la hoja.
- **Las cuatro fórmulas de Lotes** (E5, E10, E11, E12 adaptada), y
  `brechaVsVentasEstimadasCOP` **mudada al Tablero**.
- **Tablero, una fila por mes** (`AAAA-MM`), con la frontera del mes en `America/Bogota`.
  `ventasEstimadasMesCOP` es dato de entrada de `configPrecios`; el `=B4*2,5` del xlsx murió.
- **`reconstruido`** en la unión de `lots.estado` + **proveedor centinela**.
- Los seis campos de captura de W1/W3.

## La contradicción del redondeo, y quién la desempató

El dictado decía «el residuo va a la última casilla para que Σ K_unidad = K_lote» y a la vez
pinneaba #372 = **$665.681**. Las dos cosas no salen del mismo cálculo: `399.408 / 0,60` da
**665.680**, y la suma se pasaría un peso.

Lo desempató **la auditoría, no yo**: §5.2 de `tierramadre-modelo-fijacion-precios-v2` lista
K_unidad #372 = $399.408 **y** objetivo #372 = $665.681 en la misma fila, o sea derivó el
objetivo del K **sin redondear**. Implementado así, con su propio test para que nadie lo
«arregle». El test de paridad es autoverificable por tres sumas, no por cuatro números sueltos:

| Σ                       | Da         | Que es                      |
| ----------------------- | ---------- | --------------------------- |
| K_unidad                | $1.383.809 | K del lote 10               |
| equilibrioRealUnidadCOP | $1.537.566 | el equilibrio real del lote |
| precioObjetivoUnidadCOP | $2.306.348 | el objetivo del lote        |

## Defectos encontrados CORRIENDO, no razonando

1. **El mapeo leía `itemId` de una columna que se llama `item`.** Las 513 filas se caían al
   filtro y el plan reportaba «0 casillas a crear» — un cero con forma de hecho. Ahora el mapeo
   revienta si se cae ENTERO, nombrando las columnas que sí encontró.
2. **`recalculadoEn` habría reportado deriva en cada fila, para siempre.** Es un sello que se
   estampa al reconstruir. `CAMPOS_SIN_COMPARAR` lo excluye de la comparación, no de la
   escritura.
3. **El Léeme tenía `A1:A20` escrito a mano** y la Sheets API rechaza la escritura ENTERA al
   pasar de 20 líneas. Ahora sale del largo del texto.
4. **`unidadesActivas` se habría duplicado.** Los dos rieles se unían con dos `push` sobre el
   mismo array, y eso funcionaba solo mientras una casilla v4 no tuviera fila en
   `productInventory` — que es exactamente lo que la migración deja de ser cierto.
5. **El job de deriva denunció 8 falsos positivos** cuando el enqueuer y la reconstrucción
   calculaban los precios por caminos distintos. Se unificaron en `preciosPorItemDb`.

## Cambios de comportamiento del espejo

- **Una cabecera nueva se AGREGA a la derecha** en vez de reventar la fila. Antes había que
  editar el libro a mano antes de que ninguna fila se pudiera escribir. Nunca reordena ni pisa
  lo existente.
- **Guardar una casilla re-encola el LOTE ENTERO.** El reparto es por peso, así que tocar un
  costo mueve el precio de todas las hermanas.
- **Cuarta pestaña: Tablero.**

## Deuda que esta jornada deja anotada

- **5 filas huérfanas en el libro de PRUEBAS** (B-008 y sus casillas 525-528). El espejo es
  push-only y **nunca borra**, por diseño; limpiarlas es a mano o con un camino de borrado que
  hoy no existe.
- **Las 375 casillas migradas nunca se empujaron al espejo** (`soloEnConvex: 375`). La migración
  no encola. Empujarlas es una operación masiva con su propio presupuesto de cuota de Sheets.
- **Los precios del espejo quedan a la fecha de su último recálculo.** El fijo cambia con cada
  alta y cada venta, y re-encolar las ~88 filas con todas sus casillas en cada evento no cabe.
  `recalculadoEn` lo dice en la propia fila y el Léeme lo explica.
- **`_publicarTablero` no se llama solo.** Hay que invocarlo; no está enganchado al recálculo.
