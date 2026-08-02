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

#### C-039, C-054, MED-001, MED-012 — la tabla de decisión (SOT-V4-FASE1, punto 6)

C-017 y S-001 ya quedan cubiertos por el dictamen del punto 5 (son parte de la misma escala de
25× — $378.000.000 cada uno, comparable a LC-01/LC-03). Estos otros cuatro son una escala
completamente distinta: montos de cuatro a siete cifras, no de nueve. Les falta su propia tabla
porque nadie se la armó todavía — quedaban mencionados de pasada, sin evidencia ni recomendación.

**Evidencia**, leída de `migracionV4:ensayo` (dry-run, dev, 2026-08-01 — mismo mecanismo que
generó el número de C-017/S-001, sin volver a leer Convex prod):

| Lote    | Costo declarado | Piezas enlazadas en la hoja |
| ------- | --------------: | --------------------------- |
| C-039   |        $291.500 | 0                           |
| C-054   |      $1.279.000 | 0                           |
| MED-001 |         $22.400 | 0                           |
| MED-012 |      $2.071.050 | 0                           |

Los cuatro comparten el mismo código de excepción (`LOTE_SIN_PIEZAS`) y el mismo texto genérico
("puede ser un lote de colección real o el total del lote metido en la fila de un ítem"). No
alcancé a leer la hoja del SOT v3 para nombre/proveedor/sede de estos cuatro (el endpoint
`/api/get-table` respondió `success:false` con el `ADMIN_SYNC_TOKEN` de `.env.local` — puede ser
que el token de prod haya rotado; no insistí porque la evidencia que ya hay alcanza para la
recomendación de abajo). Si hace falta ese contexto para decidir, es la primera pregunta a
resolver antes de dictaminar.

**Por qué esta escala es distinta de C-017/S-001, en números:** el Tablero declara
`inventarioActivoCOP` = $1.777.030.371. Los cuatro juntos suman **$3.663.950** — el 0,2% de ese
total. Aunque los cuatro resultaran ser errores de captura completos, mover el titular del
Tablero un 0,2% no es la clase de hallazgo que justifica pausar nada.

**Los candados YA aprobados para C-017/S-001 (punto 5) protegen a estos cuatro gratis, sin
código nuevo:**

- `loteEstaActivo` exige al menos una unidad — un lote con 0 piezas nunca es activo, así que
  **ninguno de los cuatro entra al divisor D2** hoy ni entrará mientras sigan sin piezas.
- `inventarioActivoCOP` suma costo capturado de CASILLAS, no de lotes — sin casillas, los cuatro
  aportan **$0** al Tablero, sea cual sea su costo declarado.
- `preciosDelLote` devuelve `cotiza:false` con motivo "el lote todavía no tiene casillas" — no
  hay camino por el que se vaya a cotizar nada sobre estos cuatro.

O sea: el riesgo numérico de dejarlos exactamente como están hoy es **cero**, ya medido por el
mismo mecanismo que protege a C-017/S-001. Lo único pendiente es la interpretación del dato, no
su impacto en ningún número que ya esté circulando.

**Opciones:**

1. **(Recomendada) Migrar tal cual, sin candado nuevo.** Es lo que ya pasa. Los tres guardas de
   arriba ya los excluyen de precio y del divisor; agregar un candado explícito solo repetiría
   una protección que ya existe. Quedan visibles en el reporte de excepciones de la migración
   (`requierenAuditoria`) para quien quiera revisarlos con más tiempo — no desaparecen del radar,
   solo dejan de bloquear nada.
2. **Pedir que se enlacen sus piezas en el SOT v3 antes de Fase 2.** Permitiría correr
   `COSTO_INCONSISTENTE` sobre los cuatro, igual que a C-006/C-065/LC-05/LC-11. Tiene sentido si
   son lotes de colección activos que van a necesitar cotizar en algún momento; no lo tiene si ya
   están agotados o son costos administrativos sin pieza física que capturar.
3. **Marcarlos "sin piezas, aceptado" en un registro aparte** para que el reporte de excepciones
   deje de repetirlos en cada corrida. Es la única opción que agrega código (un allowlist de
   loteIds a silenciar), y a esta escala de riesgo ($3,66M sobre $1.777M) no parece que valga la
   inversión frente a la opción 1.

Mi recomendación es la 1, precisamente porque a diferencia de C-017/S-001 acá no hay una decisión
de negocio urgente escondida (no hay "25× el inventario auditado" en juego) — es una pregunta de
higiene de datos que puede esperar a que alguien tenga tiempo de mirar la hoja fila por fila, sin
que eso bloquee nada de Fase 2.

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

---

# Tercera jornada — 2026-08-01 (noche) — SOT-V4-FASE1, bloque A completo

Cuatro deudas de la segunda jornada, cerradas en orden (A.1→A.4 del hand-off), más el punto 6
del bloque B. Suite en 1148/110 (de 1137/109). `tsc -p convex` limpio. Sin mergear, sin pushear.

## A.1 — Revisión adversarial de la rama

Agente dedicado sobre las 8 áreas pedidas (pago enmascarado, gate de costos, candado de
escritura, motor, migración, convenciones D6/nomenclatura, tests, concurrencia/timezone). Un
hallazgo real, confirmado y corregido:

- **`lotItems.getByItemId` regalaba `costoUnitarioRealCOP`.** Gemela de `listByLote`, que sí
  tenía `omitInternosV4`; a esta se le olvidó en la misma revisión que cerró la otra. Query
  pública sin `idToken`, consumida por el scanner QR (`EscanearPage`) — cualquiera con la URL del
  deployment podía pedir el costo exacto de cualquier pieza por su itemId. El test que cubría las
  otras cuatro queries públicas de lote no incluía esta, que es justo cómo pasó desapercibido.
  Corregido con test primero (`tests/saleSafe.test.ts`), commit `018ec25`.

Todo lo demás: sin hallazgos que reporten riesgo real (ver el detalle completo del agente si hace
falta releerlo — no se copia acá para no duplicar). El único ítem que el review marcó como
pendiente es el propio gate de "no mergear todavía", que ya estaba anotado en
`protocolo-sot-v4.md` y no es nuevo.

## A.2 — `_publicarTablero` enganchado al drenaje

Se agenda 1:1 en los cuatro puntos que ya agendaban `drenar` (alta de lote, guardar casilla,
publicar lote, movimiento) — ahí vive todo lo que el Tablero refleja: `lotesActivos`,
`inventarioActivoCOP`, `ventasMesCOP`. Nunca dentro de `drenar` mismo (bucle: `_publicarTablero`
encola y reagenda `drenar`). Sin período explícito, sale de `periodoDeBogota(Date.now())` — el
default que la función ya tenía. Pinneado en `tests/espejoDrenajeHibrido.test.ts`. Commit
`1c917d2`.

## A.3 — Empuje masivo de las 375 casillas migradas

Medido antes de tocar Sheets: `reportarDeriva('Casillas')` en vivo contra dev confirmó
`soloEnConvex: 375`, exacto. `drenar` lee la pestaña ENTERA por fila procesada, así que un
`drenar({limite:375})` de una sola vez habría disparado ~1125 llamadas a la Sheets API sin
pausa — la forma de agotar la cuota de 60 req/min de una cuenta personal.

Construido `planificarDrenajeEscalonado` (puro, testeado — `tests/espejoEmpujeMasivo.test.ts`) +
`espejo:empujarSoloEnConvex` (con `soloMedir` para presupuestar sin escribir). Medido: 38 pasos,
~1125 llamadas, ~57 min de punta a punta — costo razonable, autorizado y ejecutado. **Verificado
en vivo: `soloEnConvex` volvió a 0, `sinDeriva: 375`.** Commit `07714f0`.

Idempotente y reanudable por construcción: `soloEnConvex` se recalcula contra la hoja real en
cada llamada, nunca contra la cola, así que una corrida repetida o interrumpida a la mitad solo
encola lo que de verdad sigue faltando.

## A.4 — Limpieza de filas huérfanas (6, no 5)

**El doc decía 5 filas huérfanas; la hoja tenía 6.** Además de B-008 (documentado, "VERIF motor
por unidad", sus casillas 525-528 verificadas — los mismos cuatro costos del lote 10:
268.983 · 353.210 · 81.510 · 228.228), apareció **B-009** ("Compra Murralla julio"), no mencionado
en ningún lado. Antes de tocar nada se leyó el contenido crudo de las tres filas: mismo proveedor
placeholder que B-008, mismos montos de costo/abono/saldo — debris de la misma sesión de
verificación del motor por unidad/lote, simplemente no listado en el resumen de la segunda
jornada. Se decidió con Kevin (pregunta explícita) tratarlo igual que B-008 en vez de asumirlo
por cuenta propia.

Limpieza a mano (opción elegida sobre construir un camino de borrado): dos llamadas
`batchUpdate.deleteDimension` directas a la Sheets API, fuera del código committeado — el espejo
sigue siendo push-only por diseño, sin nueva capacidad de borrado agregada. B-008/B-009 se
borraron primero (pestaña Lotes, no tocada por el empuje masivo en curso); las 4 casillas se
esperaron a que A.3 terminara de drenar del todo antes de tocar la pestaña Casillas, para no
competir con el drenaje concurrente sobre la misma pestaña. **Verificado: las dos pestañas dan
`soloEnEspejo: []` y `derivas: 0`.**

## Bloque B, punto 6 — la tabla de C-039/C-054/MED-001/MED-012

Armada la tabla de evidencia/opciones/recomendación que faltaba (C-017/S-001 ya estaban cubiertos
por el punto 5). Diferencia clave con esos dos: acá los montos son 4-7 cifras, no 9 — los cuatro
juntos suman $3.663.950, el 0,2% del `inventarioActivoCOP` declarado. Los tres guardas que ya
protegen a C-017/S-001 (`loteEstaActivo`, la suma de `inventarioActivoCOP` sobre casillas, y
`preciosDelLote` rechazando lotes sin casillas) protegen a estos cuatro GRATIS, sin código nuevo:
el riesgo numérico de dejarlos tal cual es cero, ya medido. Recomendación: migrar tal cual (opción
1 de 3), ver la sección completa arriba de "Los 28 lotes reconstruidos" para el detalle.

No se pudo enriquecer la tabla con nombre/proveedor/sede del SOT v3: `/api/get-table` respondió
`success:false` con el `ADMIN_SYNC_TOKEN` de `.env.local` contra `tierramadre.app`. No insistí —la
evidencia de `migracionV4:ensayo` alcanzaba para la recomendación— pero si alguien necesita ese
contexto, el token vale la pena revisarlo primero.

## Lo que queda para la próxima sesión

- **Bloque B, puntos 7 y 8, sin tocar** — 7 necesita criterio de negocio por lote (Kevin, no
  código); 8 (la doble corrida ítem por ítem) es la pieza más grande que queda: el divisor ya está
  firme y dev ya lo reproduce, así que técnicamente está desbloqueada, pero comparar ~513 ítems
  contra el SOT v3 vivo es su propio trabajo dedicado, no algo para sumar al final de esta jornada.
- El punto 5 (25× el inventario) y el punto 6 (ahora completo) tienen su material de decisión
  listo. Lo único que falta de los dos es el dictamen de Kevin.
- Nada mergeado, nada pusheado, ningún env var tocado, Convex prod sin una sola lectura ni
  escritura desde esta jornada — todo lo medido salió del SOT v3 vivo (gratis) o del propio dev.

---

# Cuarta jornada — 2026-08-01 (noche, continuación) — punto 8, blocked

**Punto 0 primero:** releído el final de esta misma jornada anterior y el ECHO de
`constructor.md` — sin dictamen nuevo de Kevin sobre los puntos 5, 6 o 7. Siguen como
quedaron: 5 y 6 con material de decisión armado, 7 esperando el criterio de negocio por lote.
No se tocó ninguno.

Tres commits: `2fd6144` (función pura + TDD) · `9ddbb7b` (wiring de IO en Convex) · `9aba87b`
(el reporte). Suite 1148→**1160 tests / 111 archivos** (+12 de `tests/dobleCorrida.test.ts`,
después +5 más al sumar el mapeo de la hoja → **1165/111**). `tsc -p convex` limpio en cada
commit. Sin mergear, sin pushear.

## El punto 8 — herramienta lista, datos no

Construida y corrida en vivo dos veces contra el SOT v3 (solo lectura) y Convex dev
(`flexible-wolverine-803`, cero escritura). **Resultado: 0 de 513 ítems comparables**, y no
por un defecto del comparador — verificado antes de aceptarlo como respuesta, no después.
Detalle completo, con la evidencia y las dos causas independientes, en
`2026-08-01-doble-corrida-item-por-item.md`. Resumen:

- **`precioFinalCOP`** (v3, columna M, SHEET-OWNED desde 2026-07-23) vs
  **`precioObjetivoUnidadCOP`** (v4) es la comparación correcta — confirmado antes de escribir
  código, descartando `AT` («Precio objetivo (modelo)», el xlsx viejo que v4 reemplaza) y `AU`
  («Caja: precio venta», una transacción de caja, no un precio de lista).
- **0 comparables** porque `preciosPorItemDb` no le calcula precio a NINGÚN lote de dev, por
  dos motivos independientes:
  1. **0 de 128 lotes tienen `categoriaFiscal`.** Ya se sabía del punto 7 y de los 28
     reconstruidos; lo que este diagnóstico agrega es que **no son 28, son los 128** — tampoco
     los lotes viejos, pre-migración. El punto 7 no bloquea una porción de la doble corrida:
     la bloquea entera.
  2. **Hallazgo nuevo, no documentado antes:** 122 de 128 lotes traen `fechaRecepcion` con
     sufijo de hora («2026-05-25 00:00:00», ni siquiera el padding consistente —
     «2026-05-26 0:00:00»), y `configVigenteEn` exige `AAAA-MM-DD` exacto o revienta, ANTES
     de mirar la categoría fiscal. `_lib/sheetPullMaps.ts:192` trae `fechaRecepcion` como texto
     tal cual, sin truncar la celda de Sheets. Consecuencia: aunque el punto 7 se resolviera
     mañana para los 128 lotes, 122 seguirían sin cotizar por este segundo motivo.

**No corregí ninguna de las dos** — es la misma regla que gobernó toda esta rama: el punto 7 es
criterio de negocio de Kevin, y tocar `configVigenteEn` (motor central, paridad pinneada contra
la auditoría del 25/07) sin que alguien decida CÓMO tolerar el formato de fecha es exactamente
el tipo de corrección por cuenta propia que el protocolo de sesión prohíbe. Contradicción entre
spec («el divisor firme desbloquea la doble corrida») y realidad (el divisor agregado no
necesita ni categoría fiscal ni fecha parseable — el precio POR ÍTEM sí) → parada y reportada,
no resuelta.

Lo que queda construido y verificado, listo para correr apenas se resuelvan las dos
precondiciones: `convex/_lib/dobleCorrida.ts` (puro, 17 tests, los mismos casos pinneados de
`motorUnidad.test.ts` como fixture) + `convex/dobleCorrida.ts:ejecutar` (internalAction, solo
lectura, reutiliza `migracionV4:leerTabla` en vez de duplicar el fetch a la hoja). Con las dos
resueltas, `npx convex run dobleCorrida:ejecutar '{}'` produce la tabla real sin tocar código.

## Lo que queda para la próxima sesión

- **Punto 8 técnicamente completo como herramienta, bloqueado como resultado.** Necesita: (a)
  el dictamen del punto 7, y (b) una decisión sobre `fechaRecepcion` (normalizar en el pull, en
  el motor, o en la migración — las tres son de diseño, ninguna es obvia).
- Puntos 5 y 6 siguen con material de decisión armado, esperando a Kevin.
- Punto 7 sigue siendo el bloqueador real de esta fase: sin él, ni el punto 8 puede producir un
  solo número, y la migración a Fase 2 tampoco puede asumir precios sobre el catálogo migrado.
- Nada mergeado, nada pusheado, ningún env var tocado, Convex prod sin una sola lectura ni
  escritura desde esta jornada.

---

# Quinta jornada — 2026-08-02 — los dos bloqueos del punto 8, dictaminados y ejecutados

Kevin resolvió los dos bloqueos que dejó la cuarta jornada (fecha y categoría fiscal) con
decisiones concretas, ejecutables de inmediato. Se implementaron, se corrieron contra dev, y al
hacerlo apareció un **tercer bloqueo nuevo**, reportado sin corregir. Ocho commits. Suite
1165→**1196 tests**, `tsc -p convex` limpio en cada uno. Sin mergear, sin pushear.

## Decisión 1 — normalizar `fechaRecepcion` en la frontera, ejecutada

El motor no se afloja: `configVigenteEn` sigue exigiendo `AAAA-MM-DD` exacto. Se normaliza en
tres puntos de entrada (`_lib/fechaSheet.ts`, `_lib/sheetPullMaps.ts` con un `coerce: 'fecha'`
nuevo, `_lib/migracionV4.ts:mapearLotesHoja`) más un backfill de una sola vez
(`migracionV4:_normalizarFechasEnDev`) para los 128 lotes que ya existían en dev.

**Corrido en vivo:** `normalizados: 67 · sinNormalizar: 55`. Los 55 no son un fallo de la
normalización — son lotes con `fechaRecepcion` genuinamente VACÍA (texto `""`), no mal
formateada. No se les inventó una fecha.

## Decisión 2 — sembrar `categoriaFiscal` por inferencia, con origen marcado, ejecutada

La lista de palabras clave es la misma que ya usó la auditoría del 25/07 para clasificar por
nombre (pregunta abierta #2 de `tierramadre-modelo-fijacion-precios-v2`), codificada hoy por
primera vez sin cambiarla. `lots.categoriaFiscalOrigen` nuevo (`'capturada' | 'inferida' |
'revisada'`); lo sembrado por inferencia sale marcado `'inferida'`, nunca `'capturada'`. El
candado del motor sigue igual (solo exige que la categoría EXISTA), pero cada precio de un lote
`'inferida'` viaja con el aviso `CATEGORIA_INFERIDA` (`_lib/motorUnidad.ts`), el espejo lo
muestra con sufijo (`_lib/espejoFilas.ts`), y `lotesPendientesDeRevision`
(`_lib/categoriaFiscalInferencia.ts`) es el **gate duro de Fase 3**: prod no corta con ningún
lote ahí.

**Corrido en vivo, con autorización explícita de Kevin para escribir:**
`lotesSembrados: 104 · casillasSembradas: 200` (78 gema, 18 joya, 8 mixta). Los 24 lotes que no
se pudieron inferir son los mismos sin piezas enlazadas que ya cubren los puntos 5 y 6.

**Bonus de detección (§2d), también construido:** `compararPreciosItemV3vsV4` ahora marca
`revisarInferencia: true` cuando un ítem de un lote `'inferida'` diverge más de 30% contra el
precio real — la propia doble corrida detectando sus inferencias sospechosas, sin que nadie
tenga que leer las 513 filas a mano.

## El resultado: 0 → 4 de 513 comparables, y un tercer bloqueo nuevo

Con las dos decisiones aplicadas, la doble corrida subió de 0 a **4 comparables** (mediana
+3,4%, 1 ítem sobre 5%, ninguno sobre 10%, ninguno marcado para revisión de inferencia). No los
~300-400 que cabía esperar de 104 lotes sembrados.

**Por qué:** de los 513 `lotItems` en dev, solo **375 tienen los campos v4**
(`estadoCasilla`, `costoUnitarioRealCOP`) — exactamente los que creó la migración del
2026-08-01. Los otros **138 son del riel viejo**: tienen `loteId`/`itemId` (por eso alimentaron
la inferencia, que solo necesita el nombre) pero les faltan los campos que
`preciosPorItemDb` exige para cotizar, y nunca los van a tener hasta que alguien los clasifique
por W2. De los 375 que sí podrían, la mayoría pertenece a lotes con `fechaRecepcion` vacía (los
reconstruidos, decisión 1). La intersección de las tres condiciones —categoría, fecha, campos
v4— da exactamente 4 lotes (`MED-004`..`MED-007`).

**No se corrigió.** Es la misma regla de siempre: la premisa de la sesión («con las dos
decisiones, la doble corrida corre de verdad») era cierta para el mecanismo, pero la cobertura
depende de un tercer factor que nadie había medido. Documentado completo, con la tabla de los 4
ítems comparables, en `2026-08-01-doble-corrida-item-por-item.md` — reescrito para esta
jornada, con el resultado de la primera corrida preservado en un `<details>` al final.

## Artifacts

Commits: `2bdf44a` (fecha, TDD+wiring+backfill) · `8980b32` (categoría, schema+TDD+motor+espejo)
· `d6d7854` (wiring de la siembra) · `3d1ab10` (bonus de detección). Los dos backfills
(`migracionV4:_normalizarFechasEnDev`, `categoriaFiscalInferencia:ejecutar` con
`dryRun: false`) se corrieron contra dev con autorización explícita de Kevin en la propia
decisión — verificados en vivo, no simulados.

## Lo que queda para la próxima sesión

- **Tercer bloqueo, sin dictamen:** ¿vale la pena clasificar por W2 los 138 `lotItems` del riel
  viejo para que puedan entrar a la doble corrida? ¿o se acepta que mientras tanto la doble
  corrida solo puede medir lo que migró el 2026-08-01?
- **`fechaRecepcion` vacía en lotes reconstruidos** sigue sin fuente: no hay dato que normalizar
  porque no hay dato.
- Puntos 5 y 6 siguen esperando dictamen — sin cambios esta jornada.
- **Fase 3, cuando llegue:** correr `lotesPendientesDeRevision` antes de cualquier cutover. Hoy
  devolvería 104 lotes — ninguno graduado a `'revisada'` todavía.
- Nada mergeado, nada pusheado, ningún env var tocado. Convex prod sin una sola lectura ni
  escritura. Las dos escrituras a dev (fechas, categoría) fueron explícitamente autorizadas por
  Kevin en la decisión de esta jornada.

---

# Sexta jornada — 2026-08-02 (continuación) — punto 5 dictaminado: segmento colección

Kevin dictaminó los puntos 5, 6 y 7 en un solo mensaje. El 7 ya estaba ejecutado (quinta
jornada); el 6 se reconfirma sin código nuevo (los guardas existentes ya bastan); el 5 es
trabajo nuevo — segmentación operacional/colección — implementado y corrido esta jornada. Cinco
commits. Suite 1196→**1205 tests**, `tsc -p convex` limpio en cada uno. Sin mergear, sin
pushear.

## El dictamen del punto 5

**Evidencia:** ítem 193 "Secretos del Sol" (`LC-03`), 20,68 ct Fina Esencial, colección Finas
29-Ene, Bogotá/M.Campuzano, costo $310M — el modelo histórico EXCLUÍA Bogotá por diseño.
Dictamen: **REALES, segmento COLECCIÓN**. Es OTRO negocio: precio individual negociado, nunca
absorbe el gasto fijo mensual ni cuenta en el divisor D2 — así era el modelo histórico (por eso
`B6` decía 76 y no más). `C-017`/`S-001` NO entran: siguen **EN AUDITORÍA**, qué son sigue sin
respuesta.

## Lo implementado

- `lots.segmento: 'operacional' | 'coleccion'` (schema). `_lib/segmentoLote.ts`: la regla es el
  prefijo `LC-` del `loteId` — la convención de nombres que el SOT v3 ya usaba, no un criterio
  inventado. TDD, 3 tests.
- **Motor:** `preciosDelLote` y `motorDelLoteDb` cortan ANTES de mirar categoría, costo o
  conciliación cuando el segmento es colección — motivo `SEGMENTO_COLECCION`, nunca
  K/equilibrio/objetivo. 3 tests nuevos.
- **Divisor D2:** `contarLotesActivosDb` excluye colección de `lotesActivos` y
  `unidadesActivas`.
- **Tablero:** `inventarioActivoCOP` e `inventarioColeccionCOP` separados — dos negocios, dos
  celdas, nunca sumadas. Nueva columna en el espejo. TDD en `tablero.test.ts` +
  `espejoFilasCanon.test.ts` (que no tenía cobertura para `filaTableroParaEspejo` — se agregó).
- `migracionV4:_sembrarSegmentoEnDev` — backfill dev-only, un patch por lote `LC-*`.

## Corrido en vivo, verificado dos veces

**El divisor:**

```
ANTES:    lotesActivos: 88  · costoFijoUnitarioCOP: $382.407
DESPUÉS:  lotesActivos: 73  · costoFijoUnitarioCOP: $460.984   (33.651.815 ÷ 73, exacto)
```

**El Tablero de 2026-08**, leído en vivo con una query temporal (borrada antes de commitear):
`inventarioActivoCOP: $53.613.946` + `inventarioColeccionCOP: $1.723.416.425` =
**$1.777.030.371** — la misma suma combinada de antes de la segmentación, ahora partida en sus
dos negocios sin perder ni un peso. Confirma que el split no perdió ni duplicó nada.

**La doble corrida**, re-corrida con el nuevo divisor: sigue en **4/513 comparables** (la
segmentación es ortogonal al tercer bloqueo de la quinta jornada — mueve CUÁNTO cotizan los 4
lotes que ya cotizaban, no CUÁLES), pero la mediana subió de +3,36% a **+11,4%** (3 de 4 ítems
ahora sobre 10%, antes ninguno) — consistente con un divisor más alto: cada lote operacional
absorbe más gasto fijo ahora que colección ya no lo diluye. Detalle completo, con la tabla de
los 4 ítems antes/después, en `2026-08-01-doble-corrida-item-por-item.md`.

## Artifacts

Commits: `dbe988b` (schema+regla) · `6b6f86c` (motor) · `1ac4fd6` (divisor) · `e65ec89`
(Tablero) · `dbfa298` (backfill) · `3434edd` (docs).

## Lo que queda para la próxima sesión

- **El tercer bloqueo de la quinta jornada sigue abierto y sin dictamen:** ¿clasificar por W2
  los 138 `lotItems` legacy? ¿aceptar que la doble corrida solo mide lo migrado? La
  segmentación no lo resuelve — es un factor distinto.
- Punto 6 reconfirmado, sin trabajo pendiente. Punto 7 ejecutado la jornada anterior.
- **Fase 3, cuando llegue:** correr `lotesPendientesDeRevision` (104 lotes hoy) Y verificar que
  ningún lote `'coleccion'` se cotice por absorción — los dos gates son independientes.
- Nada mergeado, nada pusheado, ningún env var tocado. Las tres escrituras a dev (fechas,
  categoría, segmento) fueron explícitamente autorizadas por Kevin en sus decisiones.
