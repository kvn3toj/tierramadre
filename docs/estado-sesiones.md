# Estado de sesiones — TierraMadre

Varias sesiones (o worktrees) tocan `main` y **producción** de este repo en paralelo. Este
archivo es el protocolo mínimo para que no se pisen: **antes de tocar `main`, de empujar a
Vercel o de correr `convex deploy`, leé la última entrada**; **al terminar, agregá la tuya**.
Entrada nueva arriba.

No reemplaza a `git log`. Es el "qué corrí en prod y desde dónde", que el log por sí solo no
cuenta — y su ausencia ya costó caro: ver la entrada del 2026-08-23 16:10.

> **Este repo tiene DOS destinos de despliegue independientes.** Anotá siempre los dos:
>
> - **Vercel** — se dispara solo con push a `main`. Publica la app entera.
> - **Convex** (`valuable-mule-753`) — es manual, `npx convex deploy`, y **sube TODO `convex/`**.
>   Hoy prod NO corre desde `main`: corre desde la pila de checkout. Decir "desplegué Convex"
>   sin decir **desde qué rama y qué SHA** deja a la siguiente sesión sin forma de reconstruirlo.

> **✅ RESUELTO el 2026-08-25:** `main` volvió a ser desplegable. El blocker
> (`sales.multiplicador` rechazando documentos vivos del riel de checkout) murió cuando la pila
> de checkout entró a `main` (merge `integracion/checkout-a-main`, en `6828e1e`). Método: dos
> deploys de producción Ready el 2026-08-25 desde `main` (`e7f1bae` → versión 2026.08.25.1040 y
> `2969c75` → PR #150), ambos ejecutando el `convex deploy` que envuelve `build:vercel`.
> El histórico del incidente queda en las entradas del 2026-08-23 15:44–16:10.

## Formato de cada entrada

```
### YYYY-MM-DD HH:MM — <rama o worktree> — <una línea de qué>
- Tocó: <archivos/área>
- Vercel: <sí, versión X / no>
- Convex: <sí, desde rama@SHA, diff de function-spec +N/−M / no>
- Verificación: <cómo se comprobó, no "syncStatus dice synced">
- Pendiente / riesgo para la próxima sesión: <o "ninguno">
```

## Historial

### 2026-08-25 13:30 — `fix/miniaturas-y-certificado-vitrina` → `main` + SOT — duplicados §8 ejecutados, certificado en /v, miniaturas revividas

- **Qué (dos frentes en una sesión, ambos por decisión explícita de Kevin vía AskUserQuestion):**
- **Frente 1 — duplicados lógicos del §8** (RESUMEN-AUDITORIA-2026-08-24.md §3): #363
  Igualdad, #339 Jardín Secreto y #93 Dos Luciérnagas → `ESTADO = RETIRADA` en la hoja
  (payloads `scripts/.data/correcciones-{363,339,93}-retirada-s8.json`, dry-run + respaldo +
  relectura por cabecera, 3/3). Pull: **`patched: 3, skipped: 573`**. #363 además DESPUBLICADO
  con `products._setMostrarEnCatalogo` (fila de auditoría en `productEdits`:
  `363 · mostrarEnCatalogo · true → false · saved`). Catálogo público: 441 → **440**, los tres
  ausentes, hijos vivos (#429–#433 ×5, #93A/#93B, #471/#472). **#471/#472 vs #467–#470 queda
  SIN decidir a propósito**: Kevin pidió verlos — la comparación (fotos, pesos, costos, precios,
  y el dato de que #468–#470 no tienen ni una foto en Drive) quedó publicada como artifact.
  Estructura confirmada por datos: #471 = #467+#468 (0.36+0.38=0.74 ct) y #472 = #469+#470
  (0.37+0.37=0.74 ct); #363 los contaba una tercera vez con `Cant. 4`.
- **Frente 2 — los secundarios del recorrido de UI del 24-ago:**
  - **`get-batch-thumbnails` 504 — causa raíz y fix.** Moría exacto en su `maxDuration: 30`
    (medido: 30.37s → 504 reproducible), y en cascada el seed de build (timeout 15s) horneaba un
    **seed VACÍO** (medido: 0 entradas servidas) → visitante nuevo sin miniaturas + toast rojo.
    Fix: `maxDuration` 30 → 120 (`vercel.json`) y timeout del seed 15s → 125s. Post-deploy:
    endpoint **200 en 18.6s con 308 miniaturas**, y el seed servido ya trae **308 entradas** (el
    timeout nuevo viajó en el mismo build y alcanzó).
  - **Certificado como última diapositiva en `/v/<token>`** (`PublicProductView`), misma regla
    que la ficha (6828e1e): sólo imagen, PDF queda link-only, sin duplicar. TDD
    (`tests/publicProductViewCertificado.test.tsx`, espejo del prop `media`). Verificado en el
    bundle servido: el chunk `VitrinaPage-DZ_V7-9h.js` remoto contiene el marcador.
  - **Fuga de `Ubicación` en `/p/N`: FALSA ALARMA, cerrada con método.** `/p/:itemId` tiene dos
    rutas (`App.tsx:409` autenticada, `App.tsx:1114` anónima); el QA del 24-ago corrió en el
    Chrome de Kevin CON sesión → montó la autenticada, que muestra Ubicación legítimamente. Los
    rieles anónimos limpios: `get-treasure-sheets` sin clave `ubicacion` (medido 2026-08-25,
    441 filas) y `publishedCatalog` es lista blanca desde `5c4fcb4`.
- Tocó: hoja SOT (3 celdas Q), Convex prod (pull + 1 mutación), `src/pages/vitrina/PublicProductView.tsx`, `vercel.json`, `scripts/generate-thumbnails-seed.mjs`, 1 test nuevo, versión.
- Vercel: sí — `b575eb7..b4163c8`, deployment `cui8de054` ● Ready, versión `2026.08.25.1103`.
- Convex: funciones no (el `convex deploy` del build fue no-op); datos sí (pull + mutación, arriba).
- Verificación: todo a archivo/curl — pull `patched: 3`, `productEdits` con la fila, catálogo 440,
  endpoint 200/308, seed 308, marcador del certificado en el chunk remoto. La diapositiva no se
  vio en navegador (mismo límite del 24-ago: la ventana no acepta resize a móvil).
- Coordinación: REN-1 empujó a main dos veces durante la sesión (`0a100f7`, `b575eb7`, ambos
  aditivos, verificado); mi rama rebasó sin conflicto. Su corrección aceptada: su segundo deploy
  aterrizó ANTES de mi push (v1084) — nada quedó superseded.
- Pendiente / riesgo:
  - **La decisión #471/#472 vs #467–#470** — con el artifact en mano. Si «quedan los pares», el
    sello de #467–#470 es mecánico con los mismos payloads-patrón; si «quedan las piedras», hace
    falta sesión de fotos para #468–#470 antes de publicar.
  - Los 15 vendidos/entregados del §4 y el resto del §8 (LC-03/LC-01, GIA vs presentación,
    Lote 170, #441 «Vida», #484 Magia) siguen esperando decisiones.
  - El cutover a llaves `prod_` sigue listo por el lado de UI (ver entrada 2026-08-24 18:20).

### 2026-08-25 13:05 — `main` (ventana REN-1, worktree `renacer-spec` ya removido) — la compuerta del QR de Renacer queda ratificada y el spec entra a main

- **Qué:** Kevin ratificó en sesión las tres compuertas de REN-1 y quedaron escritas verbatim
  dentro del spec, que después se mergeó a `main`. Dos pushes:
  - `0a100f7` — merge de `docs/renacer-qr-flow-spec`. **Docs-only**: un solo archivo nuevo,
    `docs/superpowers/specs/2026-08-25-renacer-qr-flow-design.md` (647 líneas), con los rulings
    ya dentro (§3.4 y §11.1, commit `0681ab8`).
  - `b575eb7` — merge de `feat/renacer-fase0-captura-y-codigos`: el registro de códigos del §7.3
    (`scripts/renacer-codigos.mjs` + su JSON vacío) y la hoja de armado de la captura GHL
    (`GHL/07-RENACER-FASE0-CAPTURA.md`). **Cero archivos de app, de `api/` o de `convex/`.**
- **Los tres rulings (los hereda quien siga, no se re-litigan):**
  1. **URL impresa: `https://tierramadre.app/renacer/k/{codigo}`**, tal cual la propuesta §3.3.
     `/renacer/k/*` y `/renacer/b/*` son contratos permanentes desde hoy. **La imprenta queda
     habilitada** — esta sesión NO la ordenó.
  2. **Código de kit: numérico 3–4 dígitos, secuencial desde `101`**, impreso también en texto
     bajo el QR. Riesgo aceptado: es adivinable; lo mitiga la entrega en presencia, no el código.
  3. **Precios de kits por aritmética lineal** ($111.000/u manillas, $166.500/u dijes, derivados
     del 1+1 del 21-08). 1+100 = $11.211.000 / $16.816.500. Sin descuento por volumen en v1.
- Tocó: `docs/superpowers/specs/2026-08-25-renacer-qr-flow-design.md` (nuevo),
  `scripts/renacer-codigos.mjs` (nuevo), `scripts/.data/renacer-registro-codigos.json` (nuevo,
  vacío), `GHL/07-RENACER-FASE0-CAPTURA.md` (nuevo). **`vercel.json` NO se tocó** (ver abajo).
- **Vercel: sí, dos deploys, los dos EN VIVO y comprobados.** El del primer push sirvió
  `2026.08.25.1074` (buildTime 17:54:51Z); el del segundo (`b575eb7`) sirve
  **`2026.08.25.1084`** (buildTime 18:04:45Z). Ambos medidos con curl a `/version.json`, no
  inferidos de que el push saliera.
- **Convex: no directamente.** `build:vercel` envuelve `convex deploy` desde `main`, así que
  ambos builds lo corrieron — pero sobre el **mismo `convex/` que ya estaba en prod** desde el
  deploy de las 17:20Z (PR #150). Diff de funciones esperado: **0**. No se corrió
  `npx convex deploy` a mano ni ninguna migración.
- Verificación (método por afirmación):
  - Docs-only, ambos merges: `git diff --name-status origin/main..main` ANTES de cada push —
    la lista salió con exactamente los archivos citados y nada más.
  - El worktree `renacer-spec` se removió solo después de comprobar
    `git merge-base --is-ancestor 0681ab8 main` y que su `git status` estaba limpio.
  - El registro de códigos se ejercitó de punta a punta con controles negativos: dry-run que no
    crea archivo; misma venta dos veces → aborta; kit inexistente → aborta; más registradas que
    unidades → aborta (los tres con exit 1). Después se **reseteó a `{"kits": []}`** y se
    verificó por grep que no quedara ni una fila de prueba.
  - **El token GHL del repo no puede escribir:** `POST /locations/{id}/customFields` → **401**
    `The token is not authorized for this scope`, con control positivo `GET` → **200** en el
    mismo minuto, y control negativo después del fallo: **17 campos antes, 17 después, 0 de
    Renacer**. `GET /forms/` y `GET /funnels/funnel/list` → 401 también.
  - Línea base de los paths de campaña, medida con curl HOY y ANTES de cualquier redirect:
    `/renacer`, `/renacer/k/101` y `/renacer/ayudar` devuelven **200** (los sirve el rewrite
    catch-all de la SPA), con `Location` vacío. Es el "antes" contra el que la próxima sesión
    va a comprobar sus 307.
- Coordinación: `tierramadre-a9` avisada del movimiento de `main` antes y después de empujar;
  confirmó que no choca con sus dos fixes de plataforma. Esta entrada **se deja sin commitear**
  a pedido suyo, siguiendo el protocolo de este archivo (el working tree muestra el estado real;
  quien necesite commitear lo hace por worktree temporal a `docs/estado-sesiones`).
- Pendiente / riesgo para la próxima sesión:
  - **Los redirects `/renacer/*` NO existen todavía** — decisión de Kevin: entran en el mismo
    push que la URL real del form GHL. Nada impreso aún, así que ningún escaneo se pierde.
  - **El form y el funnel GHL no se armaron** — requieren la UI (el token no autoriza), y Kevin
    los difirió a un hand-off aparte. La hoja `GHL/07-RENACER-FASE0-CAPTURA.md` los deja listos
    para armar campo por campo.
  - **Para automatizar los campos hace falta un token con `locations/customFields.write`.**
  - **Dos defectos de diseño abiertos en la captura de Fase 0** (§5 de la hoja): las necesidades
    son repetibles y un custom field de contacto no lo es — y de ahí cuelga el turno FIFO del §9;
    y el timestamp del turno no cabe en un `DATE` de GHL, que no lleva hora.
  - El consentimiento de imagen que faltaba (§10.2 lo exige, §7.2 no lo listaba) **ya se resolvió**:
    Kevin lo mandó como campo 17, CHECKBOX fail-closed, obligatorio.

### 2026-08-25 12:30 — PR #150 `fix/estado-retirada` → `main` — RETIRADA en el vocabulario, y los duplicados 7/8 + Shou cerrados en todos los rieles

- **Qué:** merge del PR #150 (aprobado por Kevin): (1) estado `RETIRADA` en el vocabulario
  completo — `schema.ts`, `normalizeEstado`, cuatro uniones de validadores en `products.ts`,
  `INV_ESTADOS` del pull, `PRODUCT_ESTADOS`, StatusPip/ItemsPage; (2) mutación
  `products._setMostrarEnCatalogo` para despublicar ítems legacy sin fila `lotItems` (patch +
  bump de catálogo + fila de auditoría en `productEdits`).
- Tocó: `main` (`e7f1bae` → `2969c75`); hoja SOT (Q482/Q484 → `RETIRADA`, payloads
  `scripts/.data/correcciones-{487,491}-retirada.json`, respaldos en `scripts/.backups/`);
  Convex prod (pull + mutación de Shou).
- Vercel: sí — deployment `23xu3bua5`, ● Ready, versión 2026.08.25.1040 (buildTime 17:20Z).
- Convex: sí — desde `main` @ `2969c75` vía el `convex deploy` del build. Gate de escritura:
  `_setMostrarEnCatalogo` visible en `function-spec --prod` ANTES de escribir datos (la
  secuencia merge → deploy → datos evita el patrón del `sales.multiplicador`).
- Verificación (todo a ARCHIVO — un pipe de `npx convex run` se trunca y fabrica falsos
  negativos, lección de esta misma jornada):
  - Pull post-escritura: **`patched: 2, skipped: 574`** (el del 24-ago dio `patched: 0` —
    el vocabulario era el tapón).
  - `products:_getInternal`: #487 y #491 con `estado: "RETIRADA"`; #383 con
    `mostrarEnCatalogo: false`.
  - `publishedCatalog`: 441 filas, cero ocurrencias de `"383"`.
  - Auditoría: fila en `productEdits` (`383 · mostrarEnCatalogo · true → false · saved`).
- Pendiente / riesgo:
  - `editHistory` devuelve `[]` sin `sessionToken` de staff — NO es prueba de ausencia de
    auditoría; para verificar rastro usar `npx convex data productEdits --prod --order desc`.
  - Los otros seis duplicados lógicos de la auditoría siguen esperando las decisiones del §8 —
    esos NO son mecánicos y no se tocaron.
  - La escritura manual de la columna Y (mostrarEnCatalogo) en la hoja es no-op por diseño
    (campo de Convex, excluido del pull) — quedó documentado también en la ficha de Shou en Anima.

### 2026-08-24 18:20 — `fix/checkout-copy-403` → `main` — copy honesto del 403 + precio arriba en móvil, DESPLEGADO — y `main` volvió a ser desplegable

- **Qué:** merge (ff limpio) de `fix/checkout-copy-403` a `main` y push: `6828e1e..e7f1bae`.
  Dos fixes, ambos TDD (test en rojo primero), suite **1976/1976** antes del merge:
  - `c1929cf` — un 403 con cuerpo no-JSON (el edge nunca manda JSON; el endpoint siempre) deja
    de decir «Intenta de nuevo en un momento» y pasa a «Los pagos en línea no están disponibles
    por el momento. Escríbenos por WhatsApp y completamos tu compra.» Un 403 CON JSON y código
    conocido conserva su mensaje específico (`tests/mensajesCheckout.test.ts`).
  - `17d7e65` — en el layout compacto de `PublicProductView` el precio sube ARRIBA de la ficha
    técnica (antes vivía al final del scroll con el botón «Pagar» sticky siempre visible). El
    test fija orden del DOM con `compareDocumentPosition`
    (`tests/publicProductViewOrdenPrecio.test.tsx`).
- Tocó: `src/components/checkout/mensajesCheckout.ts`, `src/pages/vitrina/PublicProductView.tsx`,
  2 archivos de test, `index.html` + `public/version.json` (bump).
- **Vercel: sí** — deployment `pgcvb9xca`, `● Ready` en 3m, creado 18:14. Producción sirve
  `2026.08.24.1394` (el build de Vercel re-genera la versión; el bump local fue `.1092`).
- Convex: no directamente — pero `build:vercel` envuelve `convex deploy` desde `main`, y el build
  pasó. **Eso confirma que `main` volvió a ser desplegable**: el blocker del
  `sales.multiplicador` (entrada 2026-08-23 15:45) murió cuando la pila de checkout se mergeó a
  `main`. El aviso rojo de cabecera de este archivo quedó obsoleto — se deja como historia, pero
  ya no aplica: prod SÍ corre desde `main` desde el deploy de las 11:30 de hoy.
- Verificación (no «el push salió»):
  - `version.json` de producción responde `2026.08.24.1394` con `buildTime` 23:14Z (2 min después
    del push).
  - **El copy nuevo está en el bundle servido**: `assets/origenCheckout-Cp5C5Avr.js` (resuelto
    desde el `index-*.js` remoto) contiene el string «no están disponibles por el momento» —
    prueba a nivel de contenido de que el deployment corre `≥ c1929cf`.
  - El orden del precio no se verificó en navegador móvil (el resize de la ventana no aplicó dos
    veces; con viewport ancho MUI no monta el layout compacto) — la evidencia es el test de orden
    del DOM en verde y que `17d7e65` viaja en el mismo deployment ya probado por el punto
    anterior.
  - El WAF sigue puesto: `POST /api/checkout-create-order` → 403 desde el edge (control con curl
    tras el deploy). El canal de pago sigue bloqueado a propósito.
- Coordinación: la sesión `tierramadre-ed` avisada (esperaba este veredicto para **proponerle a
  Kevin** — no ejecutar — retomar el vocabulario RETIRADA + la despublicación legacy de Shou,
  ahora que un deploy de Convex desde `main` es viable).
- Pendiente / riesgo para la próxima sesión:
  - **Bloqueadores del cutover a llaves `prod_`, estado tras esta entrada:** (1) copy del 403 —
    RESUELTO y en vivo; (2) precio en móvil — RESUELTO (test verde, en el deployment); (3)
    certificado en el carrusel de `/v/<token>` — se decidió NO bloquear el cutover: el link «Ver»
    de Trazabilidad funciona y muestra el documento; la diapositiva queda como mejora de backlog.
    **El cutover ya no tiene bloqueadores de UI** — quedan `skip_limit: true`
    (`api/checkout-create-order.ts:112`, vuelve a regir al levantar el WAF) y los pendientes de
    la entrada 14:20 (504 de `get-batch-thumbnails`, fuga de `Ubicación` en `/p/N`).
  - Para el cutover: llaves `prod_` en Vercel → `npx vercel firewall rules remove
checkout-publico-llaves-test && npx vercel firewall publish`.

### 2026-08-24 17:05 — `docs/estado-sesiones` (sin commits) — corrección quirúrgica al SOT: duplicados 7/8 y despublicación de Shou

- **Qué:** la auditoría detectó que #487 y #491 (retiradas por duplicado de #542/#543) seguían
  con `ESTADO = DISPONIBLE` — la retirada vivía en el nombre, no en el campo que gobierna los
  conteos. Se escribió `ESTADO → ''` (vacío) en Q482 y Q484, y `mostrarEnCatalogo → false`
  (booleano) en Y383 para **Shou #383**, que estaba en 0 unidades desde la fusión C-019 del
  20-ago pero seguía publicado. NO se usó "RETIRADA": el enum de `convex/schema.ts` y
  `PRODUCT_ESTADOS` son listas cerradas donde no existe — escribirla habría roto la validación
  del sync.
- Tocó: hoja SOT v3 (3 celdas, payloads en `scripts/.data/correcciones-{487,491}-estado.json` y
  `correcciones-383-despublicar.json`, respaldos en `scripts/.backups/`); en el repo,
  `scripts/aplicar-correcciones-sot.mjs` (**sin commitear**: guardia nueva que rechaza payloads
  con ítems mezclados — el script localiza UNA fila con el itemId del primer update y aplicaba
  todo contra ella; la comparación de `valorActual` fue lo único que evitó escribir la fila
  equivocada).
- Vercel: no.
- Convex: deploy no. **El pull Hoja → Convex corrió y NO ingirió nada** (`patched: 0`,
  `skipped: 576`) — y no puede: `sheetPullMaps.ts:335` normaliza `'' → DISPONIBLE` («legacy
  default», el mismo patrón del incidente del candado), y `mostrarEnCatalogo` está **excluida
  del pull a propósito** desde el 2026-07-30 («es de CONVEX, no de la hoja»). Verificado contra
  Convex prod: los tres ítems siguen `DISPONIBLE` y Shou sigue entre los 127 de
  `publishedCatalog`.
- Verificación: relectura por cabecera nombrada tras cada escritura (el propio
  `aplicar-correcciones-sot.mjs`): `ESTADO = ""` en ambas filas, `mostrarEnCatalogo = "false"`
  en la 383. No por syncStatus.
- Pendiente / riesgo:
  - **Convex quedó desalineado de la hoja en estos tres ítems, y ningún riel existente lo
    corrige.** Se verificó que no hay mutación que sirva: `products:_saveEdit` y `_saveEditMany`
    no aceptan `mostrarEnCatalogo`; `lotItems:_updateGemaFields` sí, pero exige fila en
    `lotItems` y Shou #383 es legacy sin ella (`lotItems:getByItemId → null`);
    `api/admin-product-update` escribe hacia la hoja, no hacia Convex. El arreglo durable es
    doble y requiere deploy de Convex, hoy roto (`sales.multiplicador`, entrada 2026-08-23):
    (1) agregar `RETIRADA` al vocabulario (schema + `PRODUCT_ESTADOS` + `INV_ESTADOS` +
    `normalizeEstado`) y escribirla en Q482/Q484; (2) una mutación mínima para despublicar
    ítems legacy sin `lotItems` (o backfillear la fila de Shou). **Matiz posterior:** la
    entrada 14:20 reporta que `origin/main` @ `6828e1e` ya desciende del merge de la pila de
    checkout — si es así, el blocker del `sales.multiplicador` puede estar resuelto en
    `origin/main` y este arreglo vuelve a ser desplegable; verificar contra `origin/main`
    fresco antes de asumir el deploy roto (mi lectura era del `main` local, desactualizado).
  - Mientras tanto: el riel de Sheets (`get-treasure-sheets`) ya respeta los cambios (la hoja
    manda ahí); el riel de Convex sigue contando #487/#491 como DISPONIBLE y publicando a Shou.
  - La guardia nueva de `aplicar-correcciones-sot.mjs` está solo en el working tree — commitearla
    o se pierde.
  - Esta sesión también dejó la bóveda Anima en cobertura 576/576 y fundió el #381
    (kairos → partículas-de-luz); detalle en `Anima/Wings/Diary/2026-08-24.md`.

### 2026-08-24 14:20 — Performer (solo lectura, sin worktree) — recorrido de UI del checkout público, de punta a punta

- **Qué:** validación del flujo de UI del checkout público en `tierramadre.app` (producción), como
  cliente, con Chrome — desktop y móvil (390px) — antes del cutover a llaves `prod_`. Sin tocar
  código ni desplegar. Un `git fetch` mostró que `origin/main` (local estaba desactualizado) **ya
  es la rama con más avance**: `origin/main` @ `6828e1e` desciende del merge de
  `integracion/checkout-a-main` (pila completa de checkout, 59 commits sobre el `main` viejo) más
  `feat/vitrinas-vencen` y el commit del certificado — o sea que el checkout público, hoy, YA vive
  en `main`, no en una rama aparte.
- **A — el 403 del WAF (el punto que decide el cutover): se degrada con gracia, pero el copy
  miente.** `res.json().catch(() => null)` en `CheckoutSheet.tsx` absorbe el cuerpo no-JSON del
  bloqueo de WAF sin explotar; `mensajeDeRespuesta(403, null)` cae al genérico. Confirmado en vivo
  (desktop y 390px): sin spinner infinito, sin pantalla en blanco, sin stack trace. El botón
  vuelve a habilitarse y el formulario conserva lo tipeado. **Pero el texto que ve el cliente es
  «No pudimos completar el pedido. Intenta de nuevo en un momento.»** — suena a fallo transitorio
  cuando en realidad es un bloqueo permanente hasta que alguien levante la regla. No ofrece una
  salida (a diferencia de `PRECIO_NO_DISPONIBLE`/`ZERO_TOTAL`, que sí dicen «Escríbenos»). El botón
  de WhatsApp sigue visible afuera del modal, así que el cliente no queda sin salida, pero el
  mensaje no se la señala.
- **B — pieza sin precio: funciona.** Con un ítem `precioCOP` vacío (#483 «Gratitud», confirmado
  por API pública que `precioFinalCOP` es `null`) en la vitrina compartida (`/v/<token>`, la
  superficie real que ve un cliente), no aparece NINGÚN botón «Pagar» ni sección «PRECIO» — sólo
  «Consultar por WhatsApp». Probado solo y mezclado con una pieza con precio en el carrito interno
  (ahí el ítem sin precio muestra «$ 0», ver hallazgo de diseño más abajo). En la vitrina pública
  del cliente, `hayPiezaSinPrecio()` cumple lo que promete.
- **C — el certificado: aparece en la ficha, NO en la vitrina del checkout.** En `/p/546` y
  `/p/544` (la ficha, ruta interna) el certificado es la 3ª de 3 diapositivas, legible en el
  lightbox (reporte ICG #025893 y GIA #2231093419 respectivamente, texto nítido). **Pero en
  `/v/<token>` — la vitrina que un cliente real recibe por el link compartido — el carrusel de
  #544 sólo tiene 2 diapositivas, sin certificado.** Lo que sí hay ahí es un link «Ver» aparte
  (sección «Trazabilidad ADN de Paz») que abre la imagen del certificado en una pestaña nueva —
  funciona, pero no es «la diapositiva del carrusel» que pedía verificar el hand-off.
- **D — móvil: mismo comportamiento del 403, más un hallazgo de layout — el precio queda
  enterrado al final de la vitrina a 390px.** [CORREGIDO ~17:40, misma sesión: el diagnóstico
  original decía «invisible / cero altura», y era interpretación equivocada del síntoma. Leído el
  fuente: no hay bug de render.] `PublicProductView.tsx` ordena distinto por layout: en desktop
  (md+, línea 542) es nombre → **precio** → botones → ficha técnica; en el layout compacto
  (línea 579) es nombre → ficha técnica COMPLETA (FormulaPanel, SpecGroups, GemStats, GemPills,
  RelatoBlock, TrustCard) → precio al final. O sea que en móvil el precio sí se renderiza, pero
  el cliente tiene que scrollear toda la ficha para verlo — mientras el botón «Pagar» le queda
  fijo (sticky) y visible todo el tiempo. El `get_page_text` que mostraba PRECIO «entre el nombre
  y los botones» era el orden del DOM linealizado, que coincide con este código. El fix, si se
  decide, es mover `{priceBlock}` arriba de `{specSheet}` en el layout compacto (una línea) —
  pero puede ser deliberado, así que es decisión de UX, no un arreglo obvio.
- **E — copy: el genérico del 403 es el problema real** (ver A). El resto de los 5 mensajes
  conocidos (`ITEM_RESERVED`, `PRODUCT_UNAVAILABLE`, `PRECIO_NO_DISPONIBLE`, `ZERO_TOTAL`,
  `ORIGEN_INVALIDO`) se verificaron leyendo `mensajesCheckout.ts`, no en vivo — dispararlos de
  verdad requeriría crear una orden real (fuera de alcance) y hoy el WAF corta antes de llegar a
  Convex de cualquier forma.
- **Bug no pedido, reproducido 5 veces (desktop y móvil, ficha y vitrina):**
  `/api/get-batch-thumbnails` devuelve **504** de forma consistente y dispara un toast rojo «No se
  pudieron cargar las miniaturas. Intenta de nuevo.» visible al cliente en la propia pantalla de
  pago. Es independiente del WAF — va a seguir pasando con llaves `prod_`.
- **Hallazgo fuera de alcance, sin confirmar mecanismo:** la ficha interna (`/p/N`, `/product/N`)
  le muestra «Ubicación: OFI.CALI» a un visitante anónimo sin sesión (visto en #544 y #483, 3
  veces). El fix del 21-ago (`5c4fcb4`) blindó `products.publishedCatalog`/`getPublicByItem` en
  Convex; esta pantalla parece alimentarse de un camino de datos distinto
  (`api/get-treasure-sheets`, el riel viejo de Sheets, per `CLAUDE.md`) que no se auditó ese día.
  Es sólo el síntoma visual — no leí el endpoint para confirmarlo. **La vitrina pública `/v/<token>`
  no muestra esta información.**
- **Se generaron 2 links de vitrina reales** (`/v/EFK8K33QM27W` con #544, `/v/TZ2MKY83XFCZ` con
  #483) para poder ver la superficie del cliente — quedan vivos en Convex, sin más efecto que eso
  (no se creó ninguna orden; el 403 del WAF lo impidió en los dos intentos de pago).
- **Fuera de alcance, a pedido del usuario en vivo (no del hand-off):** se generó una propuesta de
  rediseño del carrito interno (`/cart`, «Mi Selección») con `/ui-ux-pro-max`, publicada como
  artifact — sólo mockup, sin tocar `src/pages/CartPage` ni ningún componente de producción.
- Vercel: no. Convex: no. Sin tocar `main` ni desplegar.
- Verificación: Chrome real contra `tierramadre.app` (desktop 1316px y 390px), `read_network_requests`
  confirmando `POST /api/checkout-create-order → 403` y `GET /api/get-batch-thumbnails → 504`, y
  `get_page_text`/DOM contra el screenshot para el bug de precio invisible en móvil.
- **Recomendación: NO, todavía no, para llaves `prod_`.** Tres bloqueadores antes del cutover: (1)
  el copy del 403 genérico induce a reintentar un bloqueo permanente — hay que arreglarlo antes de
  que el mismo path absorba cualquier fallo real de Wompi; (2) el certificado no llega al carrusel
  que el cliente realmente ve (`/v/<token>`), sólo a la ficha interna; (3) el precio queda al final
  del scroll en móvil en esa misma vitrina (ver la corrección en D), así que el cliente puede abrir
  «Pagar» sin haber visto antes cuánto le van a cobrar. Lo que SÍ está listo: la guarda de pieza-sin-precio (B) y la degradación sin crash del 403
  (A), en desktop y móvil.
- Pendiente / riesgo para la próxima sesión:
  - ~~Arreglar el copy del 403 genérico~~ **HECHO (~17:00, misma sesión):** rama
    `fix/checkout-copy-403` @ `c1929cf` (desde `origin/main`), pusheada SIN mergear. Un 403 con
    cuerpo no-JSON (el edge nunca manda JSON, el endpoint siempre) ahora dice «Los pagos en línea
    no están disponibles por el momento. Escríbenos por WhatsApp…». TDD (los 2 tests nuevos
    fallaron primero con el copy viejo), suite 1974/1974. **El merge a `main` queda pendiente:
    dispara el deploy de prod completo (Vercel + Convex desde `main`).**
  - Decidir si el certificado debe entrar al carrusel de `/v/<token>` (hoy sólo está en `/p/N`) o
    si el link «Ver» aparte es la UX querida — no quedó claro cuál era la intención original.
  - Decisión de UX pendiente sobre el precio al final del scroll en móvil (ver la corrección en
    D) — el fix es una línea si se decide.
  - `get-batch-thumbnails` 504 — bug de backend independiente del checkout, visible al cliente.
  - La fuga de `Ubicación` en `/p/N`/`/product/N` — sin confirmar el endpoint exacto, sin fix.
  - Sigue sin resolver el `skip_limit: true` de `api/checkout-create-order.ts:112` (ya anotado en
    la entrada de las 11:30).

### 2026-08-24 11:30 — WAF + `feat/certificado-en-carrusel` → `main` — canal de pago bloqueado, certificados en el carrusel

- **🔒 El checkout público quedó BLOQUEADO en el edge.** Regla de Vercel WAF
  `checkout-publico-llaves-test`: `path equals /api/checkout-create-order → Deny`, publicada a
  producción. Verificado: el endpoint pasó de `400` (atendía) a **`403` desde el edge**.
  Control negativo en la misma medición: `get-treasure-sheets` 200, la app 200, y
  `ghl-create-order` 401 (su auth normal, no el WAF) — el riel del bot no se tocó.
- **Por qué el WAF y no quitar las llaves de Wompi.** Se leyó el orden de operaciones:
  `createOrder` corre en `checkout-create-order.ts:101` y **reserva inventario**; el link de pago se
  arma después, en la 247. Sin llaves, el endpoint devuelve `200 {pending:true}` y **no libera la
  reserva** (`RESERVA_TTL_MS = 30 min`). O sea que quitar las llaves cambiaba «regala piedras» por
  «bloquea piedras en silencio» — y como la reserva de `createOrder` es incondicional, también le
  devolvía `ITEM_RESERVED` al bot de GHL. El WAF corta ANTES de crear la orden.
- **Para levantarlo** cuando estén las llaves `prod_`:
  `npx vercel firewall rules remove checkout-publico-llaves-test && npx vercel firewall publish`.
  Segundos, sin build. La descripción de la regla dice por qué existe.
- **Certificados: los 8 del Lote Origen escritos** en `certificadoUrl` (col AM) — #483, #484, #544,
  #545, #546, #550, #551, #552. URLs verificadas con lectura anónima: **8/8 `200 image/jpeg`**.
  Se usó el JPG, no el PDF: `ProductDetailPage.tsx:325` descarta los `.pdf` del carrusel.
- **Y el arreglo que faltaba, que no era el filtro de PDFs.** `api/get-treasure-sheets` NO leía la
  columna AM, y `ProductDetailPage` resuelve su `product` desde ese riel (sólo cae al doc de Convex
  si el ítem no está en la lista, que para un publicado nunca pasa). `certificateUrl` llegaba
  `undefined` y la diapositiva nunca se armaba. Commit `6828e1e` → `main`: el mapper lee AM y el
  campo entra en `PUBLIC_KEYS`. **Efecto real medido: 373 ítems con certificado servido, no 8** —
  los 365 que ya lo tenían tampoco llegaban al cliente.
- Vercel: sí (`2026.08.24.982` en vivo). Convex: no.
- Verificación: `curl` al endpoint de producción — `certificateUrl` aparece en la respuesta y los 8
  llegan. La diapositiva en sí no se verificó en el navegador.
- Pendiente / riesgo:
  - **`skip_limit: true` sigue** en `api/checkout-create-order.ts:112`. Mientras el WAF esté puesto
    da igual; **al levantar la regla vuelve a no haber techo de 2M**.
  - **Falta validar el flujo de UI de punta a punta** antes del cutover a llaves `prod_`. Hoy nadie
    lo recorrió como cliente: se probó el riel (un pago sandbox por API) pero no la experiencia.
  - `certificadoUrl` es **campo único**, y ya se sabe cuándo va a estorbar: #544, #545 y #550 tienen
    GIA y esperan el certificado propio de Tierra Mädre. Ahí no caben los dos.

### 2026-08-24 00:10 — `main` / SOT — correcciones del Lote Origen, sync completo y cutover de pago

- **Qué:** se aplicó `PROMPT-correcciones-lote-origen.md` (pasos 0, 1 y 2), se corrió el sync
  completo Hoja→Convex, y se puso `PAYMENT_PROVIDER=wompi` en Production.
- **SOT — 20 celdas escritas, 4 omitidas.** `NO OIL` en #549, #551, #552, #553 · `F2` en #554 ·
  medidas de 3 ejes en #551, #552 y #483 · peso de #553 `0.86 → 0.84` · color de #483.
  `Lotes!C-090.pesoTotalQuilates` **21,21 → 21,22** — SUMADO de los 11, no copiado: el payload decía
  21,25 y el prompt esperaba 21,23; la suma real da 21,22.
- **Paso 0 — la frase del piso eliminada de los 9** (482, 544, 545, 546, 549, 550, 551, 553, 554).
- **Convex: sí**, `fotoSync:runFull {tables:["inventory"]}` → `patched: 12 · inserted: 0 ·
flagged: 0 · skipped: 564`. Hoja↔Convex pasó de 23 diferencias a 1.
- Verificación: relectura por cabecera nombrada + `scripts/verificar-sot-vs-convex.mjs`. #546
  confirmado en `NO OIL` en Convex (estaba publicado mostrando `F1`), #553 en `0.84`, y **0 ítems
  conservan la frase del piso en Convex**.
- **Lo omitido a propósito:**
  - **#484 `Extra Fina F2` → `Fine F2`**: `Fine F2` NO está en `CALIDADES`, y
    `CALIDAD_FACTORS[calidad] ?? 1` manda toda calidad desconocida a **factor 1.0** — el cambio
    dejaba la pieza fuera de vocabulario igual que antes. El valor que el certificado respalda es
    `F2` (factor 0.85). Pendiente de decisión.
  - **#552, bloque de plata**: el payload esperaba `precioFinalCOP` vacío y la hoja tiene 9.000.000.
    Se omitieron costo Y precio juntos — escribir sólo el costo dejaba la razón en 1,60 cuando todo
    C-090 va a ×4,5. **También se omitió su append**, que dice «Costeado y corregido… $5.632.706…
    Precio $25.347.177»: escribirlo sin las celdas dejaba la fila afirmando un costeo que no tiene.
- **⚠️ La verificación del paso 0 que pedía el prompt ya no mide lo que cree medir.** Pedía llamar
  `getPublicByItem` sin credenciales. Esa prueba **pasa siempre** desde el 2026-08-23 16:10, porque
  `observacion` salió de la proyección pública: el campo no viaja, esté sucio o limpio. La
  verificación real es leer el campo crudo.
- Pendiente / riesgo — **🔴 lo más urgente del repo ahora mismo:**
  - **El checkout público puede regalar inventario.** Se puso `PAYMENT_PROVIDER=wompi` (Production +
    redeploy `6odqb0jy3`), pero **las llaves de Wompi en Production son de TEST** (confirmado por el
    dueño). Con una `pub_test_` el cliente aterriza en el sandbox, donde una tarjeta de prueba
    aprueba — y esa cadena ya se probó end-to-end: marca la pieza `VENDIDA` y la empuja a la hoja.
    **Cualquiera con un link de vitrina puede marcar una esmeralda como vendida sin pagar.** Y
    `skip_limit: true` sigue en `api/checkout-create-order.ts:112`, así que tampoco hay techo.
    Salidas: bajar el punto de entrada público, quitar las llaves (`WOMPI_NOT_CONFIGURED`), o
    completar el cutover a llaves `prod_`. **Sin resolver.**
  - **La sesión `checkout-wompi-public-surfaces` se cerró**; el riel de Wompi quedó sin dueño.
  - Los certificados **no están donde el service account los vea**: `certificadoUrl` sigue vacío en
    los 12 ítems con certificado leído, y `GOOGLE_SHARED_DRIVE_ID` (`1KfDhH…`) devuelve «Shared
    drive not found» para `tierra-madre-inventory@winged-scout-480001-a9`.
  - **38 ítems dicen color `Verde Muzo`, 35 publicados**, y ningún reporte del ICG ni del GIA
    menciona Muzo. Decisión de política pendiente.
  - **Dato nuevo del 24-ago:** la diapositiva 11 de la presentación «LOTE ORIGEN» rotula el reporte
    `028298` (2,88 ct, Fine) como **«Lote: 170-2»** — primera evidencia dentro del material fuente
    de que el Lote 170 existe como agrupación propia. Toca la pregunta abierta que bloquea el
    recosteo de $29,98 M.

### 2026-08-23 16:10 — `deploy/fuga-observacion` (base `chore/wompi-sandbox`) — cierre de la fuga de `observacion` en el catálogo público

- **Qué:** `products:getPublicByItem` devolvía `observacion` **sin autenticación**. Medido sobre
  las 443 filas publicadas: 210 traían texto y **204 de esas eran bitácora interna de costeo** —
  tarifa por quilate, fórmula del precio de lista, número de factura, y en nueve la frase
  literal `Piso de negociación $X (× 3.5) — INTERNO, no se anuncia`. Los ítems se numeran de
  corrido y el QR es `/p/<n>`, así que la enumeración era trivial. `observacion` pasó de
  `CAMPOS_PUBLICOS_CATALOGO` a `CAMPOS_RESERVADOS_CATALOGO`.
- Tocó: `convex/products.ts` (solo eso, +23/−2).
- Vercel: no.
- **Convex: sí — `deploy/fuga-observacion` @ `5ccf198`, base `chore/wompi-sandbox` @ `a1e1d3a`.**
  `function-spec --prod` antes y después: **316 entradas / 315 identificadores únicos las dos
  veces, −0 perdidas, +0 nuevas.** Las 22 funciones del riel V4 intactas antes y después.
- Verificación: llamada **anónima** (`ConvexHttpClient` sin credencial) contra
  `valuable-mule-753` sobre los nueve ítems del piso → los nueve dejaron de devolver
  `observacion`, conservando nombre y precio. No por lectura de código.
- Pendiente / riesgo:
  - **Si algún día hace falta una descripción pública de verdad, va en un campo propio**
    (`descripcionPublica`), no reutilizando la bitácora. El error de origen fue que un campo con
    dos públicos distintos siempre termina sirviendo al equivocado.
  - `precioEspecial` NO se rompió: `precioEspecialDeObservacion()` lee el documento crudo, antes
    de la proyección.

### 2026-08-23 15:45 — `main` — 🔴 el deploy de producción FALLÓ, y el `main` de hoy es indesplegable

- **Qué pasó:** el push de `fix/catalogo-respeta-despublicado` a `main` (entrada de las 15:44)
  disparó el build de producción y **murió en `Schema validation failed`** — el mismo
  `multiplicador` en `sales` que bloquea un `convex deploy` manual desde `main`. Deployment
  `lzkaqh05l`, estado `● Error`, `Command "npm run build:vercel" exited with 1`.
- **Consecuencia inmediata:** el filtro de publicación **NO está en vivo**. Producción sigue
  sirviendo `2026.08.22.1294`, y #339 / #487 / #491 siguen en la vitrina pese a estar
  despublicados en Convex. Los tres commits (`1d2476f`, `668ca09`, `5aa411b`) están en `main`
  sin desplegar.
- **Desde cuándo:** el último build de producción exitoso fue `al273jl60`, el 22-ago 16:34 (`fd73d78`). El riel de checkout se desplegó a Convex a las ~04:00 de hoy y escribió el
  primer `sales` con `multiplicador`. **Desde ese momento `main` quedó indesplegable**, y nadie lo
  notó durante ~17 h porque nadie empujó a `main` en esa ventana. Yo fui el primero.
- Verificación: `vercel ls --prod` + `vercel inspect <url> --logs`. El log muestra el `vite build`
  completo y en verde, y el fallo **después**, en el `convex deploy` que envuelve al build.
- Pendiente / riesgo — **esto es lo que hay que resolver antes que nada:**
  - **La salida es mergear la pila de checkout a `main`**, con `deploy/fuga-observacion` adentro.
    Mientras eso no pase, `main` acumula commits que no llegan a producción.
  - **NO quitar el `convex deploy` del build para "destrabarlo".** Ese acoplamiento es lo único
    que hoy impide que un build de `main` pise el riel de Wompi en prod.
  - **Quien haga ese merge tiene que incluir `deploy/fuga-observacion` (`5ccf198`).** Si `main`
    se vuelve desplegable sin ese commit, el primer build exitoso despliega el `convex/` de `main`
    y **reabre la fuga de `observacion`** que se cerró hoy a las 16:10.

### 2026-08-23 15:44 — `fix/catalogo-respeta-despublicado` → `main` — despublicar por fin saca de la vitrina

- **Qué:** `api/get-treasure-sheets` devolvía TODA fila con `item > 0` — las 576 — **sin mirar
  `mostrarEnCatalogo` ni una vez**. Había dos catálogos con reglas distintas: el de Convex
  respetaba la bandera y el Treasure Browser, que es el que la gente mira, la ignoraba. Se
  destapó con tres duplicados retirados (#339, #487, #491) que seguían en vitrina después de
  despublicarlos. Va con el fix de identidad de `93A`/`93B` (ver abajo).
- Tocó: `api/get-treasure-sheets.ts`, `api/_lib/catalogoPublicado.ts` (nuevo),
  `api/_lib/catalogProjection.ts`, `src/types/index.ts`, `src/hooks/useFotosintesisCatalog.ts`,
  - 3 archivos de tests.
- **Vercel: sí** — `main` `fd73d78..5aa411b`, `APP_VERSION 2026.08.23.942`. `main` estaba tomado
  por el worktree `cotizacion-lock`, así que se empujó la rama directo a la ref remota.
- Convex: no.
- Verificación: simulado contra datos de producción antes de commitear → 576 → 440, con #339,
  #487 y #491 fuera y #542/#543 dentro. Suite 1816/1816, `tsc` limpio.
- Pendiente / riesgo:
  - **La bandera se lee de Convex, NUNCA de la columna Y.** Medido el 2026-08-23: la hoja tenía
    204 en `true` y Convex 443, con **279 filas en desacuerdo**. Filtrar por la columna habría
    escondido 239 ítems legítimos.
  - El filtro es **fail-open** a propósito: sin Convex se sirve la hoja sin filtrar. Lo sensible
    lo recorta `projectForGrant`, que no depende de esa llamada.
  - `itemId` es opcional en `TreasureItem`; los fixtures estáticos no lo traen. Quien lo consuma
    cae a `String(item)`.

### 2026-08-23 ~04:00 — `feat/checkout-publico-superficies` @ `7895c8a` (worktree `.claude/worktrees/checkout-publico`) — riel de checkout Wompi

- Registrado **a posteriori** (2026-08-23 16:10) a partir del dato que aportó esa sesión, porque
  este archivo no existía cuando corrió.
- Vercel: **no** (la rama sólo tuvo previews; producción siguió sirviendo `main`).
- Convex: sí, `CONVEX_DEPLOYMENT=prod:valuable-mule-753 npx convex deploy`. `function-spec` antes
  y después: **314 → 315, +1 (`sales:estadoPublico`), −0.** V4 presente en ambas (22 funciones).
- **⚠️ CAMBIO DE CONDUCTA EN EL RIEL VIVO DEL BOT, no sólo funciones nuevas.** El deploy subió la
  fase 2 entera, y la **reserva de inventario de `createOrder` es incondicional**: se aplica a
  TODA llamada, incluida la del bot de GHL, no sólo al checkout público. Desde este deploy, un
  pedido del bot sobre una piedra que otro cliente tiene apartada hace <30 min falla con
  `ITEM_RESERVED` en vez de crear una segunda venta. **Es el cierre del bug de doble venta**, y es
  deseado — pero si alguien ve un pedido del bot fallando con ese error, no es una regresión.
  `markOrderPaid` además marca la piedra `VENDIDA` y **la empuja a la hoja** (era manual antes).
- Verificado end-to-end el mismo día, con pago sandbox real por el navegador (VISA \*_\*\*4242):
  venta `VO-0004` → `confirmada · wompi · APPROVED`, `providerTxId` idéntico al comprobante, sin
  columnas `mp_`, `totalCOP = precioBaseCOP × multiplicador 1`. Las piedras 416 y 397 se marcaron
`VENDIDA` y llegaron a la hoja (`productEdits.status: 'saved'`).
- **Datos de prueba en prod: creados y REVERTIDOS.** Cuatro ventas (`VO-0001`…`VO-0004`)
  canceladas vía `sales:_cancel` — la reversión canónica, la que nombra el propio `_saveEdit` al
  negarse a sacar una pieza de `VENDIDA` mientras una venta viva la posea. `VO-0004` devolvió
  `restored: 2`. Los 5 ítems tocados (416, 397, 323, 324, 411) verificados en `DISPONIBLE`, con la
  restauración empujada a la hoja. **Quedan sin borrar los clientes de prueba** (celulares
  `30000000xx`): borrar datos no es algo que esta sesión haga por su cuenta.
- **Por qué hubo que mergear `main` primero:** desplegar la pila de checkout sin `main` encima
  falla en validación de esquema con
  `configPrecios ... extra field ivaGemaPct that is not in the validator` — el PR #142 agregó ese
  campo el 20-ago. **Corré `npx convex deploy --dry-run` antes, siempre.**
- Pendiente / riesgo:
  - **Producción corre desde una rama de feature sin mergear**, no desde `main`. Hay que decidir
    si `chore/wompi-sandbox` / `feat/checkout-publico-superficies` se mergea a `main` o si se
    acepta explícitamente que prod vive en una rama. Mientras tanto, **nunca despliegues Convex
    desde `main`**: le falta `sales:estadoPublico` y el `multiplicador` del validador de `sales`.
  - Sin medir: si el `movimientosV4` que corre en prod está en uso vivo por el anima-bot o es
    residuo de un deploy viejo. `registrarViaBot` lo sugiere, pero eso es lectura de nombre, no
    medición.

---

## Cómo identificar desde qué rama corre Convex prod (si vuelve a perderse el rastro)

Costó una investigación entera el 2026-08-23. El método, por si sirve:

1. `npx convex function-spec --prod` → la superficie viva. Compará contra lo que cada rama
   produciría, derivado del fuente.
2. **Ojo con el filtro de archivos.** `^convex/[A-Za-z]+\.ts$` **excluye todo nombre con dígito**
   — o sea `lotsV4.ts`, `movimientosV4.ts`, `migracionV4.ts`, `mantenimientoV4.ts`. Con ese
   filtro toda rama parece haber perdido el riel V4 y se concluye, en falso, que producción corre
   algo que no está en el árbol. Usá `[A-Za-z0-9]+`.
3. El esquema discrimina mejor que los nombres: buscá un campo que solo un grupo de ramas declare
   (acá fue `configPrecios.ivaGemaPct`) y fijate si algún **documento vivo** lo tiene. Si lo
   tiene, las ramas que no lo declaran habrían fallado la validación.
4. `function-spec` trae entradas **sin `identifier`** (las HttpActions de `/sync/foto`). Contar
   entradas da 316 y contar identificadores únicos da 315. No es un deploy intermedio, es método.
