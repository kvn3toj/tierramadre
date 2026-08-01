# Cierre — Fase 1 de W1–W3 + SOT v4

- **Fecha:** 2026-08-01 · **Rama:** `feat/w1-w3-sot-v4` (11 commits, sin mergear)
- **Deployment:** Convex dev `flexible-wolverine-803` · **Prod intacto**
- **Suite:** 885 tests en 95 archivos (línea base 700/85 → **+185 tests**)

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
- **Divisor derivado, no fijado.** Los datos reales de dev dan **62 lotes
  activos** y un fijo de **$542.771**, no los 76/$442.787 de la hoja. Kevin
  decidió seguir con el número derivado (D2 ya lo pedía). Consecuencia esperada:
  los precios de v4 **no van a coincidir** con los de la hoja.
- **W1 en ruta nueva con flag** (`VITE_CAPTURA_V4`), no evolucionando la página
  actual.
- **`APP_URL` de dev se deja como está**, solo documentado.

## Defectos encontrados (dos míos, uno del terreno)

1. **`APP_URL` del deployment de dev apunta a `https://tierramadre.app`.**
   Capturar por la página vieja en dev **escribe en el SOT v3 vivo**. Es
   pre-existente e independiente de este trabajo; ningún camino v4 lo toca.
   Queda como riesgo operativo abierto.
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

## Pendientes antes de prod (no bloquean la Fase 2)

- **Gatear `precios.previewLote` por rol.** Hoy es una query pública de Convex
  que expone el gasto fijo vigente y el conteo de lotes activos. Solo la consume
  la ruta de admin, pero eso es una convención del frontend, no un candado.
- Las credenciales OAuth quedaron como env vars del deployment dev
  (`GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`,
  `ESPEJO_SPREADSHEET_ID`). Prod necesitará las suyas, apuntando a otro libro.
- El drenaje del espejo es **manual** (`espejo:drenar`). En prod hay que decidir
  si va por scheduler tras cada mutación o por cron — y medir el consumo, que es
  lo que apagó los crons de v3.

## Lo que NO se hizo, a propósito

Nada mergeado a `main`, nada desplegado a prod, ningún daemon tocado, ninguna env
var de Vercel modificada, y el SOT v3 vivo sin una sola escritura desde este
trabajo. W4, la migración v3→v4, la Mini App y la limpieza de tiers deprecados
siguen fuera de alcance.
