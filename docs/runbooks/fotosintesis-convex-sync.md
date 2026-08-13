# Runbook — Doble sync Hoja ⇄ Convex (Fotosíntesis SOT)

Sincroniza ediciones hechas **directamente en la hoja SOT** de vuelta a Convex
(la app ya empuja Convex → Hoja). Sincroniza **sólo las celdas modificadas**
para no recargar el ancho de banda de Convex ni los límites de la API de Sheets.

- **SOT spreadsheet:** `1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U` (**SOT v3**)
  > Hasta 2026-08-11 este runbook decía `18w0…` (SOT v2) y ahí seguía instalado
  > el script, aunque el libro vivo ya era el v3: el v3 no tenía `_SyncQueue`
  > ni `_Sync`, o sea que el pull hoja→Convex simplemente no existía para él.
- **Prerrequisito:** en Vercel, `FOTOSINTESIS_SPREADSHEET_ID` debe apuntar al
  mismo libro. El botón sólo dispara la lectura; quien lee las celdas es
  `api/get-inventory-rows` / `api/get-table-rows`, y usan **esa** variable, no
  la del catálogo (`SPREADSHEET_ID`). Si divergen, se sincroniza el libro
  equivocado en silencio.
  > **No se puede leer con `vercel env pull`**: está marcada _Sensitive_ en
  > Vercel, o sea write-only, y la API la devuelve vacía (`=""`) igual que a
  > otras 44. Un `""` ahí NO significa que esté sin configurar — `SPREADSHEET_ID`
  > también sale vacío y demostrablemente apunta al v3.
  >
  > Se deduce midiendo: el pull lee las celdas por `get-inventory-rows`, así que
  > el contenido de Convex delata el libro de origen. Comparar los `itemId`:
  >
  > ```bash
  > curl -s -X POST "https://valuable-mule-753.convex.cloud/api/query" \
  >   -H 'content-type: application/json' \
  >   -d '{"path":"products:publishedCatalog","args":{},"format":"json"}'
  > ```
  >
  > El 2026-08-11: los 424 ítems de Convex están **100% en la SOT v3** y sólo
  > 30.9% en la v2 (293 ni existen ahí) ⇒ la variable apunta al v3.
- **Tabs:** Inventario, Proveedores, Lotes, Clientes, Ventas, Sublotes (las 6).
- **Trigger:** botón de menú manual `🔄 Convex Sync`. Un `onEdit` simple anota
  los cambios en una hoja oculta `_SyncQueue`; el botón los envía.

## Arquitectura

```
Editas celdas → onEdit (sin red) anota {tab, claveCol-A, columnas} en _SyncQueue
Menú "Sincronizar (sólo cambios)" → POST /sync/foto {mode:"delta", deltas}
  → convex/http.ts (valida token) → fotoSync.runDelta
      → lee SOLO esas filas (1 batchGet/tab vía /api/get-table-rows)
      → parchea SOLO los campos editados (allowlist + coerción)
      → protege filas con edición admin en curso (syncStatus pending/error)
      → efectos cruzados: estado→cancelada (sales.cancel), costoTotalCOP (lots.update)
  → respuesta {perTable, reviewFlags} → toast + hoja _Sync
```

Archivos: `convex/http.ts`, `convex/fotoSync.ts`, `convex/_lib/sheetPullMaps.ts`,
`api/get-table-rows.ts` (delta), `api/get-inventory-rows.ts` (full),
`scripts/apps-script/fotosintesis-convex-sync.gs` (+ `appsscript.json`).

## 1. Provisionar el token

`SHEET_SYNC_TOKEN` autoriza el botón. Es **sólo para disparar una lectura**: no
puede escribir en la hoja. Rótalo en segundos si se filtra.

```bash
openssl rand -hex 32                      # genera <TOKEN>
npx convex env set SHEET_SYNC_TOKEN <TOKEN>
```

`ADMIN_SYNC_TOKEN` y `APP_URL` ya están configurados en Convex (los usan los
readers de Vercel). En Vercel no hay variables nuevas.

## 2. Obtener la URL `.convex.site`

Las HTTP actions se sirven en `<deployment>.convex.site` (hermano del
`.convex.cloud`). El endpoint es `https://<slug>.convex.site/sync/foto`.

- **Local/dev:** `VITE_CONVEX_SITE_URL` en `.env.local` (p. ej. `http://127.0.0.1:3211`).
- **Producción:** confirma el slug con `npx convex env list` / `npx convex dashboard`.
  ⚠ `.env.production` muestra un slug `.convex.cloud`; cámbialo a `.convex.site`
  y verifica que sea el deployment donde está desplegado `convex/http.ts`.
  **Producción (verificado 2026-08-12):** `https://valuable-mule-753.convex.site/sync/foto`
  > **Historial de slugs muertos — los dos fallan igual de silenciosos.**
  > Este runbook decía primero `wonderful-tortoise-984` y después
  > `grand-hippopotamus-162`; ninguno es ya producción. Un deployment retirado
  > **sigue sirviendo `/sync/foto` y responde 401 idéntico al bueno**, así que el
  > error no se nota — sincronizás contra una base muerta y el toast dice que
  > todo salió bien. Por eso **el toast no es verificación**: la única prueba es
  > editar una celda y confirmar que el dato aparece en el deployment vivo.
  > Cómo distinguirlos sin adivinar:
  >
  > ```bash
  > # 1. a qué Convex habla el bundle desplegado
  > curl -s https://tierramadre.app/ | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1
  > curl -s "https://tierramadre.app<ese-js>" | grep -oE 'https://[a-z-]+-[0-9]+\.convex\.cloud' | sort -u
  > # 2. contrastar con los datos vivos
  > curl -s -X POST "https://<slug>.convex.cloud/api/query" -H 'content-type: application/json' \
  >   -d '{"path":"products:publishedCatalog","args":{},"format":"json"}'
  > ```
  >
  > El 2026-08-12, tras la migración de proyecto: `valuable-mule-753` → 430 ítems
  > (**vivo, producción**), `grand-hippopotamus-162` → 430 (**el viejo**: quedó
  > como respaldo de sólo lectura con los mismos datos, así que el conteo NO los
  > distingue — distinguílos por el bundle en vivo, paso 1),
  > `wonderful-tortoise-984` → 114 (muerto), `admired-jaguar-376` → dev del
  > proyecto nuevo (sin funciones desplegadas al 2026-08-12).

Como la URL vive en Script Properties, corregir un slug equivocado es un cambio
de 10 segundos (sin redeploy).

## 3. Instalar el Apps Script (enlazado a la hoja)

1. Abre la SOT → **Extensiones → Apps Script**.
2. Reemplaza `Code.gs` con `scripts/apps-script/fotosintesis-convex-sync.gs`.
3. **Project Settings → "Show appsscript.json manifest in editor"** y pega
   `scripts/apps-script/appsscript.json` (define los scopes OAuth).
4. Guarda (⌘/Ctrl+S) y recarga la pestaña de la hoja → aparece el menú **🔄 Convex Sync**.
5. **🔄 Convex Sync → ⚙️ Configurar (una sola vez)** → pega la URL `/sync/foto`
   y el `<TOKEN>`. Acepta la pantalla de consentimiento OAuth
   (`script.external_request`, `spreadsheets.currentonly`, `script.container.ui`).
6. Verifica: **Ver última sincronización** muestra "(aún no se ha sincronizado)"
   y existe la hoja oculta `_Sync`.

Scopes (mínimo privilegio): `script.external_request` (UrlFetchApp),
`spreadsheets.currentonly` (sólo esta hoja), `script.container.ui` (menús/diálogos).

## 4. Uso diario

- **Sincronizar (sólo cambios)** — envía lo que editaste desde el último sync.
- **Sincronizar todo (completo)** — reconcilia pestañas enteras (úsalo si
  sospechas que el `onEdit` se saltó un evento, o tras una edición programática).
- **Sincronizar sólo… {pestaña}** — reconcilia una sola tabla.
- **Ver última sincronización** — resumen rápido (celda `_Sync!F1`).

El toast resume `actualizadas / nuevas / protegidas`. "Protegidas" = filas que
tenían una edición de admin en curso y NO se sobrescribieron. Las
`reviewFlags` (loteId, líneas de venta, capacidad de lote) se listan en una
alerta y en la hoja `_Sync`: el campo se reflejó en el espejo, pero la
reconciliación cruzada se hace en la app.

## 5. Política de campos (qué sí / qué no sincroniza)

- **Sí:** todas las columnas editables (descriptivas + precios + estado + URLs…).
- **Nunca (derivados / FK / clave):** `costoBaseCOP`, `preponderancia`,
  `subLotes.unidades`/`totalCostoCOP` (derivados); `providerNombre`/`clientNombre`
  (FK denormalizada); columna A (clave natural — renombra en la app).
- **Efecto AUTO** (al editar esa celda):
  - `Ventas.estado → cancelada` ⇒ corre `sales.cancel` (reabre ítems + auditoría,
    `cancelledBy = "fotosintesis-sheet"`).
  - `Lotes.costoTotalCOP` ⇒ corre `lots.update` (re-reparte `costoBaseCOP` a los ítems).
- **FLAG** (espejo actualizado, reconciliar en la app): `loteId`, líneas de venta
  (`itemIds`), `unidadesDeclaradas`, membresía de sublote.

## 6. Prueba de extremo a extremo

Con `SHEET_SYNC_TOKEN` puesto y `FOTOSINTESIS_SPREADSHEET_ID` apuntando a una
copia de staging:

```bash
# 200 con resumen; token incorrecto → 401
curl -s -X POST "$CONVEX_SITE/sync/foto" \
  -H "x-sheet-sync-token: $SHEET_SYNC_TOKEN" \
  -H "content-type: application/json" \
  -d '{"mode":"full","tables":["providers"]}'
```

1. Edita el teléfono de un Proveedor `synced` → **Sincronizar (sólo cambios)** →
   el doc se actualiza, `syncStatus` sigue `synced`, sólo cambió ese campo.
2. Empieza una edición de ese ítem en la app (queda `pending`), edita OTRA celda
   de esa fila en la hoja → sync → la fila cuenta como **protegida**, el contenido
   no se pisa (sólo se re-fija `rowIndex`/`lastPulledAt`).
3. Pon una Venta `estado → cancelada` en la hoja → sync → los ítems se reabren y
   se escribe la auditoría de cancelación (efecto AUTO).
4. Edita `costoTotalCOP` de un Lote → sync → `costoBaseCOP` de los ítems se
   re-reparte (efecto AUTO).
5. Edita `loteId` de un ítem → sync → el campo se refleja + aparece un flag
   "reasignar lote en la app".
6. Vuelve a sincronizar sin cambios → **cero escrituras** (diff-skip; míralo en
   los logs de funciones del dashboard de Convex).
