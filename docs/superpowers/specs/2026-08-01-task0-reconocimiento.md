# Task 0 — Reconocimiento de W1–W3 + SOT v4 (Fase 1)

- **Fecha:** 2026-08-01 · **Rama:** `feat/w1-w3-sot-v4` (desde `main` @ `62c9154`)
- **Alcance:** solo lectura. Este doc cierra la Task 0 del plan
  `docs/superpowers/plans/2026-08-01-w1-w3-sot-v4-fase1.md` y se entrega **antes del primer commit
  de código**.

## 1. Definition of Ready — resultado

| #   | Ítem del DoR                                                           | Estado                                                                                         |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Handoff + los 4 docs del vault leídos                                  | ✅ los 6 documentos accesibles y leídos                                                        |
| 2   | `git status` limpio en main; rama creada                               | ✅ `feat/w1-w3-sot-v4` creada (main estaba limpio salvo el plan y el handoff, sin seguimiento) |
| 3   | `npx convex dev` autenticado contra `flexible-wolverine-803`           | ❌ **BLOQUEADO** — ver §2                                                                      |
| 4   | Libro «SOT v4 · Espejo (PRUEBAS)» accesible por la credencial del repo | ✅ verificado, ver §3                                                                          |
| 5   | Suite base verde; anotar línea de partida                              | ✅ ver §4                                                                                      |

## 2. El bloqueo — la CLI de Convex no alcanza el proyecto

`.env.local` apunta correctamente al deployment de desarrollo:

```
CONVEX_DEPLOYMENT=dev:flexible-wolverine-803   # team: dev-tec, project: tm-sot
VITE_CONVEX_URL=https://flexible-wolverine-803.convex.cloud
```

Pero cualquier comando de la CLI responde:

```
✖ You don't have access to the selected project. Run `npx convex dev` to select a different project.
```

`~/.convex/config.json` contiene un solo campo (`accessToken`) que pertenece a una cuenta sin acceso
al equipo `dev-tec`. No hay `CONVEX_DEPLOY_KEY` en ninguno de los `.env*`.

**Qué desbloquea:** que Kevin corra `npx convex login` (o `npx convex dev` y elija el proyecto)
desde este repo con la cuenta dueña de `dev-tec/tm-sot`.

**Qué NO bloquea:** la Fase A completa. Ningún test unitario de este repo necesita un deployment
vivo — todos importan funciones puras (verificado sobre los 85 archivos de test). El bloqueo empieza
en **B1**, que requiere desplegar el schema.

**Lectura de seguridad:** sin acceso a ningún deployment, el riesgo de tocar prod
(`grand-hippopotamus-162`) durante la Fase A es cero.

## 3. El libro de PRUEBAS

`1NbPkVChWkKSfp2UlvXmXz0UKRuHMn6qlK7bp_jWOTqs` · «SOT v4 · Espejo (PRUEBAS)» · dueño
`tech.tierramadre@gmail.com` · creado 2026-08-01 · **una sola pestaña, `Sheet1`**.

Lectura verificada con las credenciales del propio repo (HTTP 200, título y pestañas devueltos). Las
pestañas Lotes / Casillas / Movimientos / Léeme las crea E1 — esa será la primera escritura real y
confirma el permiso de edición.

**Hallazgo importante sobre la identidad:** el libro se compartió con la service account
`tierra-madre-inventory@winged-scout-480001-a9`, pero **este repo no usa esa service account**.
`api/_lib/google-clients.js` autentica con **OAuth2 + refresh token de cuenta personal**
(`GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` / `_REFRESH_TOKEN`). Esa credencial es la que ya lee el libro,
así que el espejo no necesita ninguna llave nueva: basta copiar esas 3 variables a env vars de
**Convex dev**. (La service account sigue siendo la que usa anima-bot; no aplica aquí.)

## 4. Línea base de la suite

Runner: **Vitest 2.1.9**, `npm run test:unit` = `vitest run`.
Línea de partida por `npx vitest list`: **700 tests en 85 archivos** (80 en `tests/`, 5 en `src/`).

Gates de commit para este plan (el tercero es adición mía, ver §5.3):

```
npm run test:unit
npm run lint                              # tsc de src + api
npx tsc --noEmit -p convex/tsconfig.json  # convex NO está en `lint`
```

Convenciones de test verificadas: `globals: false` (importar de `vitest`), `.ts` → node y `.tsx` →
jsdom vía `environmentMatchGlobs`, sin `jest-dom` (se asierta con `toBeTruthy()`), y los tests de
componentes mockean el único borde de Convex, `src/lib/convex-safe`.

## 5. Divergencias contra el handoff (las 5 que obligan a desviarse del plan)

### 5.1 `lotItems.costoBaseCOP` no es el costo capturado

El gap doc afirma que «la identificación específica del split ya existe como dato». No es así:

- `convex/lotItems.ts:298` — `const costoBaseCOP = 0;` con el comentario de que el costo es
  propiedad de la hoja. Toda casilla nace en cero.
- `costoBaseCOP` está en el allowlist de pull `WRITABLE.INVENTORY`
  (`convex/_lib/sheetPullMaps.ts:111`) — es **sheet-owned** desde el 2026-07-24.
- El helper que lo llenaría, `deriveCostoBaseCOP(costoTotalCOP, preponderancia)`
  (`convex/_lib/lotMath.ts:56`), calcula `costoTotal × preponderancia / 100` — **es exactamente el
  prorrateo que D6 prohíbe**, y es el mecanismo que produjo el error de $52.500 de «Choker + Piedra».

**Resolución:** W2 captura en un campo **nuevo**, `costoUnitarioRealCOP`. `costoBaseCOP` y
`preponderancia` quedan intactos para el riel viejo, que sigue dependiendo de ellos (el gate de
cierre de lote exige Σ preponderancia = 100 ± 0,01).

### 5.2 No hay arnés para testear mutations

`convex-test` no está instalado y ninguno de los 85 archivos invoca el handler de una mutation. El
patrón establecido del repo es extraer la lógica a funciones puras en `convex/_lib/` y testear eso
(`publishState`, `lotMath`, `sequences`, `applyPayment`). El plan pide «test primero (validators de
mutation)», que no es ejecutable tal cual.

**Resolución (decidida con Kevin):** TDD sobre planners/reducers puros; el `mutation` queda como
shim delgado de `ctx.db`. Cubre las reglas duras completas; no cubre el cableado a `ctx.db`.

### 5.3 `npm run lint` no ve `convex/`

`lint` es `tsc --noEmit && tsc --noEmit -p api/tsconfig.json`, y `tsconfig.json` solo incluye `src`.
`convex/tsconfig.json` existe pero ningún script lo invoca. Como todo el backend nuevo vive en
`convex/`, sin la línea extra se commitearía código sin typechequear — la misma trampa que anima-bot
ya documentó (vitest borra los tipos con esbuild).

### 5.4 El espejo no alcanza un libro nuevo por el transporte actual

`pushTableRowToVercel` (`convex/_lib/sheetSync.ts:103`) hace POST a
`${APP_URL}/api/admin-table-update`, y el libro se resuelve **server-side en Vercel** desde
`FOTOSINTESIS_SPREADSHEET_ID`. Apuntar ese transporte al libro de PRUEBAS exigiría tocar env vars de
Vercel (prohibido) o desplegar `api/` a un preview y que Convex dev le apunte.

**Resolución (decidida con Kevin):** Convex escribe **directo** a la Sheets API v4 por `fetch`, con
las credenciales OAuth de §3 como env vars de Convex dev. No toca `api/`, ni Vercel, ni prod.

### 5.5 Trampa no documentada: escribir al SOT v3 vivo desde dev

Todas las creaciones del riel viejo agendan un push a la hoja contra `APP_URL`:
`lotItems._create` → `api.products.pushToSheet` (`convex/lotItems.ts:374`), `lots._create` →
`api.lots._pushToSheet` (`convex/lots.ts:183`), ídem `sales` y `asesorMovements`. Si el `APP_URL`
del deployment de dev apunta a producción, **capturar en dev escribe en la hoja viva** — el SOT v3,
explícitamente prohibido en este plan.

No se pudo leer el `APP_URL` de dev (§2). **Queda como verificación obligatoria apenas la CLI
funcione, antes de la primera mutation.** Mitigación estructural, independiente de lo que resulte:
**ningún camino v4 agenda pushes legacy**; v4 espeja solo por `espejoOutbox` → libro de PRUEBAS.

### 5.6 Consecuencia de diseño (la desviación más grande del plan)

De 5.1 y 5.5 se sigue que las casillas v4 **no crean filas de `productInventory`**: hacerlo dispara
el push legacy y mete un precio semilla del multiplicador plano 2,6×
(`computePrecioFinal`, `convex/_lib/pricing.ts`) — justo el vicio que el Modelo v2 quiere erradicar.

Por eso la Fase D construye una superficie v4 propia sobre el ledger nuevo, y `VentaPage` /
`MovimientosKardexPage` **quedan intactas** en vez de ganar el tipo VENTA in-place, como decía la
letra del plan. Materializar `productInventory` desde v4 es trabajo de la migración (Fase 2 de
SOT v4), no de aquí.

## 6. Firmas exactas del motor a portar (Fase A)

Fuente de solo lectura: `anima-bot/src/cotizador/precios.ts` (+ `tests/cotizador/precios.test.ts`).

```ts
COSTO_FIJO_UNITARIO_COP = 442787   COMISION = 0.1   IVA_JOYA = 0.19
MARGEN_NETO_DESEADO = 0.3          ULTIMO_DIA_REMATE = '2026-08-31'
MULTIPLICADOR_REMATE = { gema: 1.3, joya: 1.6 }

calcularK({ costoCompraCOP, costosVariablesCOP?, costoFijoUnitarioCOP? }): number
pisoReal(K, regimen): number                    // K / (1 − comisión − impuestos)
precioVenta({ K, regimen, fecha }): { precioCOP, regimen, regla, K, pisoCOP, margenNetoPct }
margenNetoReal(precioCOP, K, regimen): number
inversionDisponible({ presupuestoCOP, regimen, fecha, costoFijoUnitarioCOP? }): number
```

Aritmética: `divisorObjetivo = 1 − comisión − impuestos − margen` (0,60 gema / 0,41 joya), redondeo
`Math.round` en cada salida, fechas ISO comparadas como string (sin `Date`, sin zona horaria).

**Dos divergencias deliberadas en el port** (el port NO es copia literal):

1. **Sin default de `costoFijoUnitarioCOP`.** En anima-bot cae a la constante 442.787; en Convex el
   divisor sale de `configPrecios` ÷ `COUNT(lotes activos)` (D2). Un default aquí sería una constante
   muerta que sobrevive al cambio de mes — el defecto `B5`/`E6` de la hoja, otra vez.
2. **Sin default de categoría fiscal.** Ausente ⇒ `throw`. TypeScript ya la exige en anima-bot; en
   Convex el dato llega de la base, donde puede faltar (hoy falta en 102 filas de la hoja).

Verificación aritmética de la paridad hecha en esta sesión, contra los números del handoff:

| Caso                | Cadena                                            | Resultado             |
| ------------------- | ------------------------------------------------- | --------------------- |
| Costo fijo unitario | 33.651.815 ÷ 76                                   | **442.787**           |
| Lote 10 (gema)      | K = 931.931 + 9.091 + 442.787 = 1.383.809 → /0,60 | **2.306.348** (2,47×) |
| Lote 14 (joya)      | K = 893.996 + 9.091 + 442.787 = 1.345.874 → /0,41 | **3.282.620** (3,67×) |
| Ítem 295 oro 18k    | K 2.148.787 × 1,6 (remate joya)                   | **3.438.059**         |
| Ítem 295 plata 925  | K 938.787 × 1,6                                   | **1.502.059**         |
| Equilibrio real     | gema K/0,90 · joya K/0,71                         | la hoja no lo calcula |

Los 5 reproducen exacto con `Math.round`. Son los tests que pinnean A1.

## 7. Mapa de lo que existe (resumen operativo)

**Backend.** `convex/schema.ts` (842 líneas) ya tiene `lots` (468–522, con `estado`
abierto→cerrado→publicado→cancelado y `syncFields`), `lotItems` (525–533, solo-Convex, nunca se
espeja), `productInventory` (113–293, las 42 columnas), `sales`, `asesorMovements` (ledger
append-only con `kardexEventId`), `subLotes`, `sequences`, `commitTokens` (el precedente de
idempotencia que E1 debe imitar). En `convex/_lib/` (21 archivos): `lotMath`, `precioEspecial`
(regla de temporada — misma fecha 2026-08-31 que el remate, pero es una etiqueta derivada de
`observacion`, no una regla de precio), `columnMaps` (cabeceras nombradas), `authz`, `pricing`
(el 2,6× plano), `sheetSync`, `sheetPullMaps` (los allowlists WRITABLE).

**Frontend.** `CapturaLotePage.tsx` (3315 líneas) no tiene máquina de pasos: son dos componentes
elegidos por ruta (`NewLotIntro` 488–1213 para «Antes de empezar» / `ActiveLotPage` 1625–3265 para
la iteración de ítems), y el «paso 3» se deriva del servidor (`itemsCount >= unidadesDeclaradas`).
Piezas reusables por W1/W2: `StepPills`, `FieldLabel`, `NumberInputWithCalc` (con `parseLoose`, el
único parser de COP centralizado), `EntityPicker`, `PhotoDropzone`, `getFoto('light')`.
Flag existente a copiar: `workbench/featureFlag.ts` (env `VITE_*`, DEV-on por defecto).
`EscanearPage` ya resuelve QR → 4 destinos; W2 agrega el quinto.

**Cola/espejo.** No existe tabla de outbox. El patrón vigente es estado en la propia fila
(`syncStatus` + `syncError` + índice `by_syncStatus`) con el triplete
`_getInternal`/`_markPushed`/`_markPushFailed` y un `retryPush` manual. E1 lo imita, pero ubicando la
fila **por búsqueda del id en su columna**, nunca por `rowIndex = maxRow + 1`: ese contador ya causó
deriva real y tiene una reparación dedicada en `convex/lots.ts:947-1096`.

## 8. Qué sigue

Fase A completa (A1 motor + A2 recálculo) puede ejecutarse ya, offline. B1 en adelante espera el
`npx convex login` de §2.
