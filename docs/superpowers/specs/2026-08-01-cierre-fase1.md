# Cierre — Fase 1 de W1–W3 + SOT v4

- **Fecha:** 2026-08-01 · **Rama:** `feat/w1-w3-sot-v4` (18 commits, sin mergear)
- **Deployment:** Convex dev `flexible-wolverine-803` · **Prod intacto**
- **Suite:** 914 tests en 99 archivos (línea base 700/85 → **+214 tests**)

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

## ⚠️ El divisor del gasto fijo — REQUIERE VISTO BUENO DE KEVIN

> **Antes de comparar precios en la doble corrida, esta sección tiene que estar
> resuelta.** No la resolvió esta sesión y no debe resolverla quien implemente:
> es una decisión de negocio con consecuencias sobre todo el catálogo.

El motor corriendo contra los datos reales de dev cuenta **60 lotes activos**,
no los **76** que declara la hoja. Con la definición de D2 (activo = lote con ≥1
unidad no vendida), el gasto fijo por lote queda en **$560.864** en vez de
**$442.787** — un **27% más alto**, y todos los precios suben con él.

|                     | La hoja (`Fijacion_Precios!B6`) | v4 derivado de los datos        |
| ------------------- | ------------------------------- | ------------------------------- |
| Divisor             | 76 (escrito a mano)             | **60** (COUNT de lotes activos) |
| Gasto fijo por lote | $442.787                        | **$560.864**                    |
| Lote 10 → objetivo  | $2.306.348                      | **$2.503.143**                  |

**Lo que esto NO es:** un bug del port. Los tests de paridad pasan el fijo
explícito y reproducen los números de la hoja byte a byte. La diferencia está en
el insumo, no en la aritmética.

**Lo que sí es:** la primera vez que el divisor deja de ser una celda escrita a
mano. La auditoría del 25/07 ya había dejado abiertos cuatro conteos que no
coinciden —76 declarados · 63 filas · 62 lotes con piezas en EQUIVALENTES · 235
piezas— y anotó que con 62 el fijo sube a $542.771. El número que sale de Convex
(60) cae en ese rango y confirma que el 76 de la hoja no describe el inventario
real.

**Las tres preguntas que hay que responder antes de la doble corrida:**

1. ¿Los 60 son correctos, o hay lotes que deberían contar como activos y hoy no
   (por estado mal marcado, o por no tener piezas cargadas en dev)?
2. ¿Los datos de dev representan el inventario real, o están incompletos frente
   a prod? El conteo se hace sobre lo que dev tiene.
3. Si 60 es el número bueno: **el catálogo entero se reprecia +27%**. Eso es una
   decisión comercial, no un efecto secundario de una migración.

Mientras no esté resuelta, comparar precios v4 contra precios v3 en la doble
corrida va a dar diferencias en TODAS las filas, y no se va a poder distinguir
«el motor está mal» de «el divisor cambió».

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

## Pendientes antes de prod (no bloquean la Fase 2)

- Las credenciales OAuth quedaron como env vars del deployment dev
  (`GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`,
  `ESPEJO_SPREADSHEET_ID`). Prod necesitará las suyas, apuntando a otro libro.
- Encender `ESPEJO_CRON` en prod, con la medición de consumo hecha.
- Actualizar la CLI de Convex (1.35.1 → 1.43.0). Se dejó fuera a propósito:
  cambiar la versión a mitad de una rama sin mergear mezcla dos riesgos.
- Revisión adversarial de la rama antes del merge.

## Lo que NO se hizo, a propósito

Nada mergeado a `main`, nada desplegado a prod, ningún daemon tocado, ninguna env
var de Vercel modificada, y el SOT v3 vivo sin una sola escritura desde este
trabajo. W4, la migración v3→v4, la Mini App y la limpieza de tiers deprecados
siguen fuera de alcance.
