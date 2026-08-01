# Cierre — Fase 1 de W1–W3 + SOT v4

> **Protocolo de sesión (obligatorio).** Este doc es la **única memoria compartida** entre
> sesiones de W1–W3 + SOT v4. Hay varias trabajando el mismo frente con estados distintos.
>
> Antes de tocar nada: leelo **COMPLETO** —incluidas las últimas secciones, que son las más
> nuevas— y leé `git log --oneline main..HEAD`. Tu contexto puede estar desfasado respecto a
> él. Escribirle sin leerlo entero es editarlo a ciegas.
>
> Cuando termines, escribile de vuelta: lo que no queda acá, la próxima sesión no lo sabe.

- **Fecha:** 2026-08-01 · **Rama:** `feat/w1-w3-sot-v4` (31 commits, sin mergear)
- **Deployment:** Convex dev `flexible-wolverine-803` · **Prod intacto**
- **Suite:** 914 tests en 99 archivos al cierre de la primera ronda

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

**139 endpoints publicos** en el deployment. Los que devuelven estructura de
costos, clasificados:

### Riel v4 (esta rama) - todos cerrados

| Endpoint                     | Antes                                                        | Ahora                           |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------- |
| `precios.previewLote`        | query publica con el fijo vigente, K, piso y margen          | action + `ROLES_COSTOS`         |
| `casillas.estadoDelLote`     | query publica con el costo de cada casilla                   | action + `ROLES_COSTOS`         |
| `casillas.porItemId`         | query publica con el costo de la pieza                       | action + `ROLES_COSTOS`         |
| `movimientos.enConsignacion` | query publica, `lotItems` enteros                            | action + recorte a 4 campos     |
| `movimientos.porItem`        | query publica con **numero de cuenta y titular del cliente** | **BORRADA** (no la usaba nadie) |
| `lotsV4.casillasDeLote`      | query publica con el costo de cada casilla                   | **BORRADA** (no la usaba nadie) |

Hoy `convex/{precios,casillas,movimientos,lotsV4}.ts` no exportan **ni una**
query publica. Lo pinnea `tests/previewLoteGate.test.ts`.

### Riel viejo - exposicion PRE-EXISTENTE, no tocada aqui

Verificado contra `main`: ya estaba asi antes de esta rama.

| Endpoint                                                                          | Que expone                                                                                     | Nota                                                         |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `products.list`                                                                   | `costoBaseCOP` de cada item, sin `saleSafe`                                                    | Sin `idToken`                                                |
| `products.publishedCatalog`                                                       | `costoBaseCOP`                                                                                 | Es la query del catalogo de cara al cliente                  |
| `products.getManyByItemIds`, `fotosintesisFields`, `getPublicByItem`, `patrones*` | precios                                                                                        | Sin `saleSafe`                                               |
| `lots.list` / `get` / `getByLoteId`                                               | `costoTotalCOP`, y ahora tambien `costoCompraCOP`, `abonoCOP`, `saldoCOP`, `costosVariables[]` | El desglose v4 es exposicion **nueva** sobre una query vieja |
| `lotItems.getByItemId` / `listByLote`                                             | ahora incluyen `costoUnitarioRealCOP`                                                          | idem                                                         |
| `ghl.searchProducts`, `fotosintesisAi.workspaceSnapshot`                          | precios                                                                                        | Sin `idToken`                                                |

**No las gatee, a proposito.** Son de `main`, las consume medio frontend, y cada
conversion cuesta la suscripcion reactiva - el costo de UI que ya se pago tres
veces en esta rama. Cerrarlas es un trabajo propio con su propio presupuesto.

Lo que si es responsabilidad de esta rama y queda anotado: **los campos v4
nuevos viajan por queries viejas que nadie gateo**, asi que el desglose de
compra, los abonos y el costo por pieza salen por `lots.list` y
`lotItems.listByLote` aunque sus endpoints v4 esten cerrados.

Recomendacion para ese trabajo: extender `_lib/saleSafe.ts` a estas queries en
vez de convertirlas en actions - recorta el payload y conserva la reactividad,
que es lo que las hace usables.

## Pendientes antes de prod (no bloquean la Fase 2)

- Las credenciales OAuth quedaron como env vars del deployment dev
  (`GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`,
  `ESPEJO_SPREADSHEET_ID`). Prod necesitará las suyas, apuntando a otro libro.
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
