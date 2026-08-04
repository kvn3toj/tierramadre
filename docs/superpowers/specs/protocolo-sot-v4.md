# Protocolo SOT v4 (memoria estable — no es log de jornada)

> Este archivo guarda lo que **no cambia de una jornada a la otra**: invariantes de proceso,
> nombres de deployment, comandos utilitarios, env vars y el inventario vivo de endpoints. El
> **log operativo** (qué se hizo hoy, qué quedó bloqueado, decisiones de la jornada) sigue
> viviendo en `docs/superpowers/specs/2026-08-01-cierre-fase1.md` — no lo dupliques acá.
>
> Se edita **solo** cuando una regla, un nombre o un comando cambia de verdad. Si lo que tenés
> para anotar es el estado de hoy, no es este archivo.

## 1. Invariantes de proceso

- TDD estricto: test primero, **verlo fallar**, implementar, verde, commit. Un commit por task.
- Antes de CADA commit, el trío de pre-commit: `npm run lint` (dos `tsc --noEmit`), `npm run
test:unit` (`vitest run`), y `npx tsc --noEmit -p convex/tsconfig.json` (`npm run lint` no lo
  cubre). `npm run lint` arrastra 2 `TS7016` preexistentes en `api/cotizacion-deck.ts`, de `main`
  — no se tocan.
- **NO MERGEAR a `main`**, ni a rama intermedia, mientras esta rama esté viva.
  `scripts/build-app.mjs:35` corre `convex deploy` cuando hay `CONVEX_DEPLOY_KEY`: merge+push
  equivale a deploy a prod. El merge pertenece a la ventana de Fase 3.
- No escribir en Convex prod ni en el SOT v3 vivo. Leer la hoja SÍ.
- **Convex prod tampoco se LEE** salvo autorización explícita y acotada de Kevin — para conteos y
  verificaciones, la hoja SOT es la fuente gratuita.
- No prorratear el costo capturado (D6). Categoría fiscal sin default: ausente ⇒ throw.
- No tocar `convex/_lib/destinoEscritura.ts`: el candado por dirección ya está invertido y
  verificado (un deployment que no es producción no le escribe a un host de producción).
- **Datos de pago viajan al espejo ENMASCARADOS** (banco + últimos 4 / # recibo); cuenta completa
  y titular solo en Convex tras gate de rol. El test negativo que barre toda la fila por leakage
  no se debilita — es una decisión de seguridad, no un detalle a simplificar.
- **El único hogar vivo del backend de movimientos (MOVIMIENTOS-V4 / maker-checker) es `dev`,
  hasta la Fase 3.** Dictamen de Kevin, 2026-08-03. La Parte A (Tasks 1–7, hoy 11 commits en esta
  rama) **NO se cherry-pickea a `main`**, por autocontenida que parezca: no vive sola —escribe
  `estadoCasilla`/`RESERVADA`, encola al espejo y toca el schema v4— y por la regla de arriba un
  push a `main` **es deploy a prod**. Adelantarla sería la Fase 3 por la puerta de atrás, sin sus
  gates (doble corrida, dictámenes pendientes). Backend y consumidor (el `MovimientosWizard` de
  anima-bot) **viajan juntos en el merge de Fase 3**, con `MOVIMIENTOS_V4_ENABLED` apagado en prod
  hasta entonces. Que la Parte B de anima-bot no esté contra ningún `main` **es el diseño, no un
  hueco**: prueba contra `dev` (`flexible-wolverine-803`), el deployment al que apunta el perfil de
  prueba del bot. Si una sesión futura siente el impulso de «ayudar» adelantando esos commits — no.

## 2. Deployments Convex de este repo

- **dev:** `flexible-wolverine-803`
- **prod:** `grand-hippopotamus-162` (no leer/escribir sin autorización — ver §1)
- ⚠️ `superb-ocelot-537` / `coomunity-sim` son deployments de **otro proyecto** (MVP) — no
  confundir.

## 3. Comandos / funciones utilitarias de Convex

- `mantenimientoV4:diagnosticoEstados`
- `mantenimientoV4:limpiarLotesDePrueba`
- `migracionV4:ensayo` (dry-run por defecto)
- `espejo:reportarDeriva '{"pestana":"..."}'`
- `espejo:escribirLeeme`
- `espejo:_publicarTablero`

## 4. Env vars del espejo (OAuth)

Credenciales OAuth del espejo, como env vars del deployment **dev**:

- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `ESPEJO_SPREADSHEET_ID`

Prod necesitará las suyas, apuntando a otro libro — ver el estado de esa migración en
`cierre-fase1.md`.

## 5. Inventario vivo — endpoints públicos que exponen costo

> Se actualiza **acá, en el lugar**, a medida que aparecen endpoints nuevos — no se re-narra por
> jornada. La historia de cómo se descubrió esta necesidad (blindar un endpoint no sirve si cinco
> vecinos regalan lo mismo) queda en `cierre-fase1.md`.

**139 endpoints públicos** en el deployment. Los que devuelven estructura de costos, clasificados:

### Riel v4 (esta rama) — todos cerrados

| Endpoint                     | Antes                                                        | Ahora                           |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------- |
| `precios.previewLote`        | query pública con el fijo vigente, K, piso y margen          | action + `ROLES_COSTOS`         |
| `casillas.estadoDelLote`     | query pública con el costo de cada casilla                   | action + `ROLES_COSTOS`         |
| `casillas.porItemId`         | query pública con el costo de la pieza                       | action + `ROLES_COSTOS`         |
| `movimientos.enConsignacion` | query pública, `lotItems` enteros                            | action + recorte a 4 campos     |
| `movimientos.porItem`        | query pública con **número de cuenta y titular del cliente** | **BORRADA** (no la usaba nadie) |
| `lotsV4.casillasDeLote`      | query pública con el costo de cada casilla                   | **BORRADA** (no la usaba nadie) |

Hoy `convex/{precios,casillas,movimientos,lotsV4}.ts` no exportan **ni una** query pública. Lo
pinnea `tests/previewLoteGate.test.ts`.

### Riel viejo — exposición PRE-EXISTENTE, no tocada aquí

Verificado contra `main`: ya estaba así antes de esta rama.

| Endpoint                                                                          | Qué expone                                                                                     | Nota                                                         |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `products.list`                                                                   | `costoBaseCOP` de cada item, sin `saleSafe`                                                    | Sin `idToken`                                                |
| `products.publishedCatalog`                                                       | `costoBaseCOP`                                                                                 | Es la query del catálogo de cara al cliente                  |
| `products.getManyByItemIds`, `fotosintesisFields`, `getPublicByItem`, `patrones*` | precios                                                                                        | Sin `saleSafe`                                               |
| `lots.list` / `get` / `getByLoteId`                                               | `costoTotalCOP`, y ahora también `costoCompraCOP`, `abonoCOP`, `saldoCOP`, `costosVariables[]` | El desglose v4 es exposición **nueva** sobre una query vieja |
| `lotItems.getByItemId` / `listByLote`                                             | ahora incluyen `costoUnitarioRealCOP`                                                          | idem                                                         |
| `ghl.searchProducts`, `fotosintesisAi.workspaceSnapshot`                          | precios                                                                                        | Sin `idToken`                                                |

**No las gatee, a propósito.** Son de `main`, las consume medio frontend, y cada conversión cuesta
la suscripción reactiva — el costo de UI que ya se pagó tres veces en esta rama. Cerrarlas es un
trabajo propio con su propio presupuesto.

Lo que sí es responsabilidad de esta rama y queda anotado: **los campos v4 nuevos viajan por
queries viejas que nadie gateó**, así que el desglose de compra, los abonos y el costo por pieza
salen por `lots.list` y `lotItems.listByLote` aunque sus endpoints v4 estén cerrados.

Recomendación para ese trabajo: extender `_lib/saleSafe.ts` a estas queries en vez de convertirlas
en actions — recorta el payload y conserva la reactividad, que es lo que las hace usables.

## 6. Dónde vive todo lo demás (no se duplica acá)

- **Reglas de negocio del motor** (divisor, naming `equilibrioReal*` vs `precioEquilibrio*`,
  decisiones de Tablero, hallazgos LC-03, números de paridad) →
  `Obsidian/Anima/Wings/Projects/TierraMadre/decisions/2026-08-01-motor-por-unidad-tablero-y-divisor-cerrado.md`.
- **El modelo de precios crudo** → `Obsidian/Anima/Wings/References/tierramadre-modelo-fijacion-precios-v2.md`.
- **El log operativo jornada a jornada** (demos, defectos, bloqueadores, estado en curso) →
  `docs/superpowers/specs/2026-08-01-cierre-fase1.md`.

## 7. Cómo se edita este archivo

- Se edita solo cuando una regla, un nombre o un comando cambia **de verdad** — nunca para
  registrar el estado de una jornada.
- Todo cambio acá se anuncia con una línea en `cierre-fase1.md` ("cambié `protocolo-sot-v4.md`:
  X") para que quien ya leyó hoy no se lo pierda.
- TODO opcional: al mergear esta rama a `main`, evaluar promover §1–4 a `CLAUDE.md` raíz del repo
  y borrar este archivo.
