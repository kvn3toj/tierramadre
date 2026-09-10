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

> **🔴 `main` NO SE PUEDE DESPLEGAR A PRODUCCIÓN — desde el 2026-08-23 ~04:00.**
> `build:vercel` → `scripts/build-app.mjs` → **`convex deploy --yes --cmd 'tsc -b && vite build'`**.
> O sea que **cada build de producción de Vercel despliega Convex desde `main`**, no sólo el front.
> Y el validador de `sales` de `main` rechaza los documentos vivos que escribió el riel de checkout
> (`multiplicador`), así que el build muere en «Schema validation failed». Ver la entrada del 15:45.
>
> **Y el fallo nos está protegiendo:** si ese build pasara con el `main` de hoy, desplegaría el
> `convex/` de `main` a producción y **borraría el riel de Wompi entero** — más el fix de la fuga de
> `observacion`. No lo "arregles" quitando el `convex deploy` del build: la salida es **mergear la
> pila de checkout a `main`**, junto con `deploy/fuga-observacion`.

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
### 2026-09-09 23:30 — `feat/nuevos-clientes-google` → `main` (tercer push) — cierre de la revisión: el token de cliente ya no pasa por staff
- Qué encontró la revisión (8 lentes en paralelo + refutadores, todos confirmaron): el diseño de la
  mañana asumía que "un tms1 válido prueba roster", y esa premisa está escrita en `isStaffSession`
  (Convex) y en varios `api/*` (`cotizacion-reports`, `cotizacion-save`, `product-views`,
  `create-product-folders`, `vitrina`, `ambassador-handle`, `fotosintesis-ai`). Con el token
  sellado de un cliente, todos esos gates abrían. **P0, estuvo vivo en prod entre el primer push
  (~17:45) y este.**
- Fix central: `verifySessionToken` (Node y espejo Convex) ahora devuelve null para cualquier token
  con `lvl`; `verifyAnySessionToken` es el que acepta clientes y sólo lo usan el grant del catálogo,
  el refresh de mint-session y el lookup del creador de invitaciones. Test que lo fija:
  `tests/clienteGrant.test.ts` («el verificador de STAFF rechaza el token sellado…»).
- También: un roster **inactivo** ya no entra como cliente (tri-estado en validate); la escritura
  a `new-users` es `values.update` en rango cerrado (no `append` abierto); la lectura por email no
  crea la pestaña; duplicados fallan cerrado; `/grupo/` y la ficha de reventa en `CLIENTE_PATHS`;
  `bearerWasRejected` ya no dobla el fetch del catálogo para clientes; multiplicador x1 forzado en
  servidor para quien no puede fijarlo; el fallback al WhatsApp de la casa sólo cuando el directorio
  respondió y el creador no figura (match por email, no por subcadena de nombre); el cliente no
  hereda un multiplicador de staff del localStorage; cambio de nivel en la re-validación re-acuña
  el token; el espejo a Convex `clients` ya NO empuja a la hoja `Clientes` (upsert por nombre podía
  pisar un cliente real) — la fila de hoja del cliente es `new-users`; el Directorio muestra
  `tipo: 'cliente'` como cliente final; el pull de asesores sólo matchea contra embajadores.
- Vercel: sí, push directo a `main`. Convex: vía el build de Vercel (cambia `verifySessionToken`,
  `isStaffSession`, `clients.upsertAppClientFromServer`; sin cambio de esquema).
- Verificación: lint limpio, vitest en verde (41 en las 4 suites tocadas, total en verde), build OK.
  Sigue **sin probar** el alta real con un Gmail (el botón de Google no responde a clics
  automatizados); pendiente manual.
- Pendiente / riesgo: un cliente puede crear invitaciones pero no tiene pantalla para listarlas o
  vencerlas (`/mi-perfil` es de asesor); el GET sin auth de validate devuelve el nombre de Google de
  un cliente registrado (P3, decisión de producto); la sección del menú se llama "Herramientas de
  venta" para un cliente (P3).

### 2026-09-09 18:30 — `feat/nuevos-clientes-google` → `main` (segundo push) — clientes invitan, y quedan también en Convex
- Tocó: `convex/clients.ts` (**función nueva** `upsertAppClientFromServer`, secreto compartido,
  upsert por `by_email`, `tipo: 'cliente'`, agenda `_pushToSheet` → hoja `Clientes`),
  `convex/invitations.ts` (`INVITE_LEVELS` + `cliente`), `api/validate.ts` (register-client
  espeja en Convex, best-effort), `useCanCreateInvitations` (clientes sí), `InvitationPage`
  (sin asesor en el directorio → WhatsApp de la casa), `InvitationGenerator` (cliente: sin
  moneda ni multiplicador, x1).
- Vercel: sí, push directo a `main`.
- Convex: **sí, vía el build de Vercel desde `main`** (+1 función `clients:upsertAppClientFromServer`,
  sin cambio de esquema: `by_email` ya existía). Verificado en el primer push de hoy que ese
  build despliega Convex y queda `Ready`.
- Verificación: lint limpio, vitest en verde, build OK. **Sin probar todavía** el alta real:
  el botón de Google no responde a clics automatizados (Chrome MCP); queda para prueba manual.
- Pendiente / riesgo: el registro ahora escribe en TRES lugares (`new-users` = padrón de acceso,
  Convex `clients` = CRM, `Clientes` = espejo). El de acceso es `new-users`; si Convex falla el
  cliente entra igual y queda sin fila en el CRM (se loguea en Vercel como
  `[validate] Convex client mirror failed`).

### 2026-09-09 17:45 — `feat/nuevos-clientes-google` (worktree `.claude/worktrees/new-clients`) → `main` — clientes autorregistrados con Google
- Tocó: `api/validate.ts` (acción `register-client`, lectura de `new-users`, mint-session sellado),
  `api/_lib/newUsers.ts` (nuevo), `api/_lib/catalogGrant.ts` + `catalogProjection.ts` (grant
  `cliente`), `api/_lib/sessionToken.ts` + espejo `convex/_lib/sessionToken.ts` (campo `lvl`
  opcional), `convex/_lib/authz.ts` (sólo el tipo `AccessLevel`), y en el front el rol `cliente`
  (AuthContext/permissions, PriceShare, rutas, tab bar, producto, selección, 6 locales).
- Vercel: sí, push directo a `main` (versión `2026.09.09.1064`).
- Convex: **no hubo deploy manual**. Los cambios en `convex/` son de tipos solamente (una unión
  y una interfaz); el `convex deploy` que hace el build de Vercel desde `main` no cambia ninguna
  función ni el esquema.
- Verificación: `npm run lint` limpio (app + api + convex), `vitest` 220 archivos / 2242 tests
  en verde (10 nuevos: sello del token en Node y Convex, grant y proyección de cliente, upsert y
  bloqueo de la hoja `new-users`), `npm run build` OK. **Sin probar todavía** un sign-in real
  con un Gmail nuevo: la hoja `new-users` en la SOT v3 se crea sola en el primer registro.
- Sobre la alerta roja del 2026-08-23 («`main` no se puede desplegar»): medido hoy con
  `vercel ls --prod`, los 6 despliegues de producción de las últimas 4 h (los 8 commits de
  certificados en `main`) están `Ready`. La condición ya no se cumple; la alerta del encabezado
  quedó vieja y no la reescribí — es decisión de quien mergeó la pila de checkout.
- Pendiente / riesgo para la próxima sesión: probar el alta real (fresh Gmail → fila en
  `new-users` → catálogo con precio, WhatsApp a la línea de la casa). Un cliente comparte el
  bucket de caché `:staff` del catálogo en su propio navegador; `signOut` lo limpia, así que no
  cruza usuarios, pero si se quiere separar, `treasureCacheKey` puede leer el `lvl` del token.

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
- Verificado end-to-end el mismo día, con pago sandbox real por el navegador (VISA ****4242):
  venta `VO-0004` → `confirmada · wompi · APPROVED`, `providerTxId` idéntico al comprobante, sin
  columnas `mp*`, `totalCOP = precioBaseCOP × multiplicador 1`. Las piedras 416 y 397 se marcaron
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

## 2026-09-10 · 15:30 — SOT-v6-Usuarios creado (padrón de acceso en un libro nuevo)

- **Qué:** libro `SOT-v6-Usuarios` (`1N5UEIx1vsjkknysAWAhGe0NBazeeHe53LUZ0PVBYwmo`, en Mi unidad
  junto al SOT v3) con `Léeme`, `Usuarios` (36 filas migradas de Asesores + Proveedores-con-email +
  new-users, sin inventar valores, 0 roles sin mapear), `Perfiles`, `Estados`, `Accesos`, `Revisiones`.
  Validación estricta por dropdown, protecciones con aviso, rangos con nombre, vistas de filtro,
  formato condicional (clientes gris, no activos rojo, emails duplicados naranja). Compartido con la
  service account (writer). Spec: `docs/specs/2026-09-10-sot-v6-usuarios.md`; script
  `scripts/crear-sot-v6-usuarios.mjs` (dry-run → `--apply`; `--continue` retoma formato).
- **La app NO lo lee todavía** (medido: los seis lectores siguen en SOT v3). Repunte = Stage 1
  con `USUARIOS_SPREADSHEET_ID` + `ROSTER_UNIFICADO`. Hasta entonces, altas en SOT v3.
- **Hallazgos del día, sin corregir:** (1) el cliente registrado en `new-users` el 2026-09-10T01:0x
  UTC no está en Convex `clients` — el espejo se desplegó dos horas después (f7110a8) y nada lo
  rellena; (2) `ultimoAcceso`/`accesos` de `new-users` nunca cambian tras el primer registro:
  sólo `register-client` escribe, `mint-session` y el GET sólo leen; (3) `idioma` queda vacío
  porque el ID token de Google ya no trae `locale`; (4) el comentario de `api/validate.ts:507`
  dice que el espejo empuja a la hoja `Clientes` y no lo hace. Fix propuesto: que `mint-session`
  también haga `upsertClient` + espejo cuando resuelve una fila de cliente.
- **Tropiezo:** el libro se crea con locale `es_CO`, así que las fórmulas de formato condicional
  van con `;` — la primera corrida falló en el batch (atómico) y se retomó con `--continue`.
