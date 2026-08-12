# Nuevo proyecto Convex · TM-SOT (tech.tierramadre@gmail.com)

**Fecha:** 2026-07-21 · Estrategia: **spreadsheet-first, Convex frugal** (no quemar
free tier). Tú ejecutas los `npx convex` (requieren tu login); yo dejé el código,
la config y los pasos listos.

## 1. Coordenadas del proyecto (ya creado)

|                       |                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **Equipo / proyecto** | `dev-tec` / **TM-SOT** (cuenta tech.tierramadre@gmail.com)                                     |
| **Producción**        | `grand-hippopotamus-162` · `https://grand-hippopotamus-162.convex.cloud` · HTTP `…convex.site` |
| **Desarrollo**        | `flexible-wolverine-803` · `https://flexible-wolverine-803.convex.cloud`                       |
| Región / tamaño       | US East (N. Virginia) · S16 · plan Free                                                        |
| Estado                | _Never deployed_ (aún sin esquema ni datos)                                                    |

## 2. Estrategia para NO quemar el free tier

El cuello de botella del free tier NO es el almacenamiento (el inventario son
~513 ítems ≈ <1 MB) — es el **ancho de banda de BD** y las **llamadas a función**
por _polling_ constante. Regla: **la hoja de cálculo es la fuente de verdad; Convex
se toca solo para publicar/editar, no para consumir todo el día.**

| Recurso (Free, verificar en dashboard) | Riesgo TM                          | Mitigación aplicada                           |
| -------------------------------------- | ---------------------------------- | --------------------------------------------- |
| Llamadas a función (~1M/mes)           | polling de crons                   | pull de inventario → **diario y gated OFF**   |
| Ancho de banda BD (~1 GiB/mes)         | re-leer toda la tabla en cada sync | sync **on-demand** (botón/evento), no cron    |
| Almacenamiento BD (~0.5 GiB)           | —                                  | inventario diminuto, sin riesgo               |
| Archivos (~1 GiB)                      | —                                  | **las fotos viven en Drive, NO en Convex** ✅ |

### Guardarraíles ya implementados (en el código)

- **`convex/crons.ts`** — el pull de inventario pasó de **15 min → 24 h** y apunta
  a un wrapper **gated**: `products._pullFromSheetCron` **no-op salvo que
  `INVENTORY_PULL_CRON === "on"`**. Por defecto OFF → el cron no consume ancho de
  banda. El botón manual "Resync from sheet" (`products.pullFromSheet`) y el
  endpoint `/sync/foto` siguen funcionando on-demand (NO gated).
- **`fotoSync.reconcileBackstop`** ya venía gated OFF (`FOTO_RECONCILE_CRON`).
- Crons GHL (`nudgeAbandoned`, `tagInactiveContacts`, `ambassador scoring`) son
  diarios; si no usas GHL en este proyecto, déjalos — son 1/día c/u.

### Dev = hoja, no Convex

En desarrollo **no apuntes la app a Convex**: deja `VITE_CONVEX_URL` vacío o
apunta el dev deployment solo cuando pruebes algo de Convex. Los catálogos leen de
la hoja vía `/api/get-treasure-sheets` y `gviz`. Convex se usa para publicar/editar
puntualmente, no en cada carga.

## 3. Variables de entorno del nuevo proyecto

Setéalas en el **dashboard de Convex → Settings → Environment Variables** (por
deployment) — NO en el repo:

**Las 8 variables que leen las funciones Convex** (`grep process.env convex/`):

```
APP_URL=https://tierramadre.app              # fetch a get-treasure-sheets / get-asesores
ADMIN_SYNC_TOKEN=<token>                      # auth de /sync/foto (hoja→Convex)
SHEET_SYNC_TOKEN=<token>                      # auth del push Convex→hoja (admin-table-update)
INVENTORY_PULL_CRON=off                       # ← OFF (frugal). "on" = pull diario de inventario
FOTO_RECONCILE_CRON=off                        # ← OFF (sync on-demand)
VITRINA_SHARED_SECRET=<secret>                # firma los links públicos /v/:token (vitrinas)
GHL_TOKEN=<token>                              # GoHighLevel (solo si usas GHL)
GHL_LOCATION_ID=<id>                           # GoHighLevel (solo si usas GHL)
```

Además, las funciones que tocan la hoja necesitan (heredadas del entorno Vercel, o
setéalas en Convex si corres acciones que leen la hoja directamente):

```
FOTOSINTESIS_SPREADSHEET_ID=1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U   # SOT v3 limpio
GOOGLE_SERVICE_ACCOUNT_KEY=<base64>          # leer/escribir la hoja
GOOGLE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN
```

> **OAuth de usuarios (login):** NO depende de este Convex — `api/validate.ts` valida
> el email contra la pestaña **Asesores** de la hoja (columna rol → admin/asesor).
> El nuevo proyecto no cambia quién puede entrar. Lo que SÍ sincroniza asesores→Convex
> es `clients.pullAsesoresFromSheet` (cron diario, alimenta el dropdown de embajadores).

Y en el repo, `.env.local` (frontend + CLI):

```
CONVEX_DEPLOYMENT=dev:flexible-wolverine-803   # team dev-tec, project tm-sot
VITE_CONVEX_URL=https://flexible-wolverine-803.convex.cloud   # (vacío si dev usa hoja)
```

Para producción, Vercel usa `VITE_CONVEX_URL=https://grand-hippopotamus-162.convex.cloud`.

## 4. Pasos de despliegue (los ejecutas tú)

```bash
# 1. Loguearte con la cuenta correcta y enlazar el proyecto
npx convex login                      # entra con tech.tierramadre@gmail.com
npx convex dev --once                 # enlaza → escribe CONVEX_DEPLOYMENT (dev)
#   (elige team dev-tec / project TM-SOT / deployment flexible-wolverine-803)

# 2. Setear env vars en el dashboard (sección 3) para dev Y prod

# 3. Desplegar esquema + funciones a producción
npx convex deploy                     # sube schema.ts + todas las functions a grand-hippopotamus-162
```

## 5. Sembrar los datos — estrategia HÍBRIDA (para no dejar NADA por fuera)

⚠️ **Clave:** varias tablas son **solo-Convex** (no se pueden re-sembrar desde la
hoja) — invitaciones, vitrinas, secuencias de ID, etc. Si solo siembras desde la
hoja, PIERDES esos datos. Por eso el orden correcto es **clonar todo primero, y
luego re-sincronizar solo las tablas que viven en la hoja** para aplicar la limpieza.

```bash
# PASO 1 · Clonar TODO el Convex viejo (trae las 21 tablas, incluidas las solo-Convex)
npx convex export --path snapshot.zip                 # desde giddy-giraffe-818 (viejo)
npx convex import --replace-all snapshot.zip           # hacia grand-hippopotamus-162 (nuevo)

# PASO 2 · Re-sincronizar SOLO las tablas de la hoja, con los datos LIMPIOS del SOT v3
#          (FOTOSINTESIS_SPREADSHEET_ID ya apunta al SOT v3)
npx convex run fotoSync:runFull            # providers, lots, clients, sales, subLotes, inventory
INVENTORY_PULL_CRON=on npx convex run products:_pullFromSheet   # inventario; luego vuelve a OFF
```

### Matriz de migración — TODAS las tablas y features

| Tabla / feature                              | Origen                      | Cómo migra               | Nota                                                                                      |
| -------------------------------------------- | --------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `productInventory`                           | SOT Inventario              | clone + re-sync (paso 2) | 513 ítems limpios                                                                         |
| `lots`                                       | SOT Lotes                   | clone + re-sync          | incl. `mostrarComoLote`                                                                   |
| `subLotes`                                   | SOT Sublotes                | clone + re-sync          | catálogo agrupado                                                                         |
| `providers` `clients` `sales`                | SOT                         | clone + re-sync          |                                                                                           |
| **`lotItems`**                               | Convex (derivado)           | **clone** (paso 1)       | preponderancia + costoBase por ítem — NO está en la hoja                                  |
| **`invitations`** ⭐                         | Convex                      | **clone**                | **links de invitados + multiplier de guest**                                              |
| **`vitrinas` `vitrinaSelections`** ⭐        | Convex                      | **clone**                | **links de catálogo compartido `/v/:token` + multiplier** (firma `VITRINA_SHARED_SECRET`) |
| **`sequences`** ⚠️                           | Convex                      | **clone (obligatorio)**  | contadores de loteId/saleId — sin esto los IDs nuevos colisionan                          |
| `ambassadors` `commissions`                  | Convex                      | clone                    | scoring + comisiones (embajadores)                                                        |
| `asesorMovements`                            | Convex (+ hoja Movimientos) | clone                    | kardex de asesores                                                                        |
| `productViews` `inventoryStats`              | Convex (analítica)          | clone (o vacío)          | no crítico, puede empezar vacío                                                           |
| `aiConversations`                            | Convex (Fotosíntesis AI)    | clone (o vacío)          | historial del copiloto                                                                    |
| `materials`                                  | Convex                      | clone                    | catálogo de materiales                                                                    |
| `productEdits` `productLocks` `commitTokens` | Convex (transitorio)        | opcional                 | locks/tokens efímeros — pueden empezar vacíos                                             |

### Las features que mencionaste — dónde viven

- **Asesores / usuarios OAuth** → login valida contra la **hoja Asesores** (`api/validate.ts`),
  NO contra Convex. El sync asesores→`clients` (dropdown de embajadores) es
  `clients.pullAsesoresFromSheet` (cron diario). _No se pierde nada al migrar._
- **Invitaciones (links de invitados)** → tabla `invitations` (solo-Convex) → **clonar**.
- **Vitrina / link de catálogo compartido** → tablas `vitrinas` + `vitrinaSelections`
  (solo-Convex), el multiplier vive en el registro (no en la URL) → **clonar** + setear
  `VITRINA_SHARED_SECRET` (mismo valor, o los tokens ya emitidos dejan de validar).
- **Factor multiplier (x1–x4)** → vive en `vitrinas.multiplier` y en `invitations`
  (guest). CurrencyContext lo lee por suscripción Convex. → se migra al clonar esas tablas.
- **Analítica de vistas / dashboard de views / actividad** → tabla `productViews`
  (Convex, `productViews.track`). El dashboard (`UserViewsPage`, `ProductViewersPage`)
  lee vía `/api/product-views`. → **clonar** (o empezar vacío; es analítica, no crítico).

### ⛔ Lo que NO vive en Convex (NO migrar — sigue igual tras el cambio)

Estas features usan **Google Sheets / Drive**, así que el nuevo proyecto Convex no
las toca ni las rompe — pero para que no queden "por fuera" de tu mapa mental:

| Feature                                                                            | Dónde vive                                                               | Env / hoja                             |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------- |
| **Cotizaciones** (imágenes + metadata, deck, láminas, provider/quotation requests) | Google **Drive** `TM-Studio/cotizaciones/asesores/{email}/` + **Sheets** | `SPREADSHEET_ID`, `APP_SPREADSHEET_ID` |
| **Preferencias de usuario** (`user-prefs`)                                         | Sheets, pestaña USER_PREFERENCES                                         | `APP_SPREADSHEET_ID`                   |
| **Login / usuarios OAuth** (quién entra + rol)                                     | Sheets, pestaña **Asesores**                                             | `SPREADSHEET_ID` (`api/validate.ts`)   |
| **Feedback**                                                                       | Sheets                                                                   | `FEEDBACK_SPREADSHEET_ID`              |

> Hay **3 hojas** en juego, no confundir: `SPREADSHEET_ID` (catálogo legacy + Asesores),
> `FOTOSINTESIS_SPREADSHEET_ID` (el SOT del inventario), `APP_SPREADSHEET_ID` (prefs,
> metadata de cotizaciones, feedback). El nuevo Convex solo reemplaza el mirror del
> inventario; las otras dos hojas y Drive siguen exactamente igual.

> **Esquema:** no requiere rediseño — `convex/schema.ts` ya coincide con el SOT
> limpio (mismos campos, mismos normalizadores en `vocabularies.ts`). Incluye los
> cambios de esta rama: `mostrarComoLote` sincronizable + colecciones limpias.
>
> **Frugalidad:** el clon (paso 1) y el re-sync (paso 2) son operaciones de UNA vez
> — no cuentan como consumo recurrente. El consumo diario queda casi plano por los
> guardarraíles de la sección 2.

## 6. Después del deploy

1. **Backup**: en el dashboard, "No backup yet" → activa un backup (el free tier
   permite snapshots) antes de sembrar, por si acaso.
2. **Verifica uso**: Dashboard → Health / Usage tras 1–2 días. Con los guardarraíles
   el consumo debe ser casi plano (cron diario gated OFF + sync on-demand).
3. **Vercel**: cambia `VITE_CONVEX_URL` (prod) a `grand-hippopotamus-162` cuando
   quieras que la app en producción use el nuevo Convex.
4. **Apaga el proyecto viejo** (`giddy-giraffe-818`) cuando confirmes que el nuevo
   sirve todo — o déjalo como backup de solo lectura.

## 7. Resumen de qué NO consume Convex (por diseño)

- **Fotos** → Google Drive (no Convex file storage).
- **Lectura de catálogo en dev** → hoja de cálculo (gviz / get-treasure-sheets).
- **Sync hoja→Convex** → on-demand (botón + Apps Script), no polling.
- **Pull de inventario** → diario y OFF por defecto.
- Convex queda para: publicar cambios, ventas/kardex, y ediciones puntuales.
