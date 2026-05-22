# Sheet "inventario GENESIS" — Gap Analysis vs Fotosíntesis v2

> **Fecha:** 2026-05-21
> **Sheet:** `1c6qTuf8mnQjOvi-txVuNDshzsYyyaEW1SZ54PDThaQc`
> **URL:** https://docs.google.com/spreadsheets/d/1c6qTuf8mnQjOvi-txVuNDshzsYyyaEW1SZ54PDThaQc/edit?gid=852889266
> **Decisión del usuario:** reemplazar SOT (no convivir, no read-only) + flujo en paralelo

---

## 1. Lo que tiene el sheet hoy

El sheet `inventario GENESIS` parece ser **un solo tab** (o el contenido devuelto por Drive así lo indica) con **tres sub-tablas apiladas** verticalmente, no cuatro tabs separados como espera la config actual.

### 1.1 Sub-tabla A — PROVEEDOR

| Item | Fecha Ingreso | Nombre              | NIT/CÉDULA | DIRECCIÓN                                     | TEL          | EMAIL   |
| ---- | ------------- | ------------------- | ---------- | --------------------------------------------- | ------------ | ------- |
| 319  | 21-may-2026   | Edwin Mauricio Ruiz | 80.179.071 | carrera 6#14-74 Edificio sprinter oficina 904 | 573142978350 | (vacío) |

Observación: el natural key humano es `Item` (319), no el nombre — distinto a `nombreORazonSocial` que usa el schema actual.

### 1.2 Sub-tabla B — COMPRAS

| Item  | LOTE | FORMA DE PAGO | FECHA/VENCIMIENTO | EFECTIVO     | PESO/CT | COSTO      | UNIDADES |
| ----- | ---- | ------------- | ----------------- | ------------ | ------- | ---------- | -------- |
| CMP-1 | C001 | CONTADO       | (vacío)           | Tranferencia | 37.3    | $4,900,000 | 190      |

Observaciones:

- El natural key es `Item` con prefijo `CMP-` (compra), pero también hay un `LOTE` con prefijo `C` (`C001`).
- Hoy Fotosíntesis usa `B-` para lotes (sequence allocator).
- Columna `EFECTIVO` mezcla payment method ("Tranferencia") con cantidad — está mal nombrada (en realidad parece "MÉTODO DE PAGO").

### 1.3 Sub-tabla C — INVENTARIO

| Item | LOTE | Renombre/Item                         | Nombre/Item | Preponderancia | Unidades | Categoría     | Peso/ct | Descripción | Color         | Calidad      | corte   | Medidas | Joya    | Peso/Joya gr | Tecnica | Materiales 1 | Foto    | Observacion |
| ---- | ---- | ------------------------------------- | ----------- | -------------- | -------- | ------------- | ------- | ----------- | ------------- | ------------ | ------- | ------- | ------- | ------------ | ------- | ------------ | ------- | ----------- |
| 1    | C001 | Lluvia de Oportunidades- Calibrada    | (vacío)     | 30%            | (vacío)  | Lote de Gemas | (vacío) | Cristal     | Verde Natural | Extrafina F1 | Variado | 3,5     | Aretes  | (vacío)      | (vacío) | (vacío)      | (vacío) | (vacío)     |
| 2    | C001 | Lluvia de Oportunidades- no Calibrada | (vacío)     | (vacío)        | (vacío)  | Lote de Gemas | (vacío) | (vacío)     | (vacío)       | (vacío)      | (vacío) | (vacío) | (vacío) | (vacío)      | (vacío) | (vacío)      | (vacío) | (vacío)     |

Observaciones:

- Las columnas Joya/Peso/Joya gr/Tecnica/Materiales 1 son para joyas, no para gemas — el wizard de Fotosíntesis v2 las maneja como `JoyaFields` separadas.
- Preponderancia viene como texto "30%" (no número `0.30` ni `30`).
- `Renombre/Item` y `Nombre/Item` parecen ser dos campos relacionados (¿uno es slug y otro display?).

### 1.4 Sub-tabla D (incompleta, headers solos) — INV-ESPECIAL/CATALOGO

| lote | Talla | Medidas | Medidas | Categoría | Precio COP | UBICACIÓN | NOMBRE INV-ESPECIAL | - | QR | Colección | CAJA |

Solo headers, sin filas. Parece ser una extensión planeada del Inventario o un tab futuro de "catalogo público".

---

## 2. Lo que espera el código de Fotosíntesis hoy

Definido en `api/_lib/admin-table-config.ts` + `convex/_lib/columnMaps.ts`:

### 2.1 4 tabs separados, no 1 combinado

| Tab buscado                 | Patrón match              | Estado en GENESIS                   |
| --------------------------- | ------------------------- | ----------------------------------- |
| `proveedores` / `providers` | partial, case-insensitive | ❌ no existe como tab separado      |
| `lotes` / `lots`            | partial, case-insensitive | ❌ no existe (hay "COMPRAS" inline) |
| `clientes` / `clients`      | partial, case-insensitive | ❌ no existe                        |
| `ventas` / `sales`          | partial, case-insensitive | ❌ no existe                        |

### 2.2 Columnas esperadas vs reales

**Providers — esperado:**

```
A: nombreORazonSocial  (natural key)
B: nit
C: cedula
D: direccion
E: telefono
F: email
G: tipo               (gemas|joyas|insumos|otros)
H: notas
```

**Providers — real en GENESIS:**

```
A: Item               (id numérico, ej. 319)
B: Fecha Ingreso
C: Nombre
D: NIT/CÉDULA         (mezcla NIT y cédula en una columna)
E: DIRECCIÓN
F: TEL
G: EMAIL
```

Diferencia: 7 columnas vs 8; natural key diferente; ausencia de `tipo` y `notas`; NIT y cédula fusionadas; columna extra `Fecha Ingreso`.

**Lots — esperado (14 columnas):**
`loteId | providerNombre | fechaRecepcion | pesoTotalQuilates | costoTotalCOP | unidadesDeclaradas | formaPago | metodoContado | fechaVencimiento | numeroCuotas | numeroFactura | urlFactura | notas | estado`

**Lots — real en GENESIS (8 columnas):**
`Item (CMP-N) | LOTE (C-N) | FORMA DE PAGO | FECHA/VENCIMIENTO | EFECTIVO (=método) | PESO/CT | COSTO | UNIDADES`

Diferencia mayor: faltan provider link, numero factura, url factura, estado, etc. Naming distinto (B- vs C-).

**Clients — esperado (8 columnas):** no existe en GENESIS.

**Sales — esperado (15 columnas):** no existe en GENESIS.

**productInventory — esperado:** itemId, nombre, peso, color, calidad, cantidad, talla, medidas, medidasValores, categoria, precioCOP, ubicacion, asesor, estado, qr, coleccion, caja, asesorActual, estadoAsesor (+ Fotosíntesis fields). El sheet GENESIS tiene Item, LOTE, Renombre/Item, Nombre/Item, Preponderancia, Unidades, Categoría, Peso/ct, Descripción, Color, Calidad, corte, Medidas, Joya, Peso/Joya gr, Tecnica, Materiales 1, Foto, Observacion — diferente subset.

---

## 3. Implicaciones de "reemplazar como SOT"

Si cambiamos `SPREADSHEET_ID` al sheet GENESIS sin tocar nada más, lo que pasará:

| Componente                                        | Comportamiento esperado                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/api/get-table?table=providers`                  | 404 "Sheet tab not found" — porque no hay tab `proveedores`                         |
| `/api/get-table?table=lots`                       | 404 "Sheet tab not found"                                                           |
| `/api/get-table?table=clients`                    | 404 "Sheet tab not found"                                                           |
| `/api/get-table?table=sales`                      | 404 "Sheet tab not found"                                                           |
| `productInventory` pull (sync action)             | Falla — el tab `Inventario` no tiene las columnas esperadas                         |
| Convex actions de push (lots.close, sales.create) | Fallan al hacer marshalRow porque el row index no apunta a un tab válido            |
| Pantallas Fotosíntesis                            | Crashes silenciosos / loading infinito al leer queries Convex que ya no se hidratan |

**Esto no es un swap de env var. Es un refactor de la capa de sync.**

---

## 4. Opciones reales (con costo)

### Opción A — Adaptar GENESIS al formato Fotosíntesis (recomendada)

Renombrar/separar el sheet GENESIS para que tenga 4 tabs verdaderos: `Proveedores`, `Lotes`, `Clientes`, `Ventas`, además de `Inventario`. Mantener los headers en español-display, pero respetando el orden y semántica que Fotosíntesis ya cablea.

**Costo:**

- Trabajo manual de Maritza en el sheet (≤ 1 hora si se hace con templates).
- Cero cambios en código.
- Riesgo: si Maritza está acostumbrada a la vista combinada, perder esa familiaridad.

### Opción B — Adaptar Fotosíntesis al formato GENESIS

Refactor de `admin-table-config.ts`, `columnMaps.ts`, todos los actions de pull/push Convex, posiblemente schema de Convex (preponderancia como string %, NIT/CÉDULA fusionado, lote naming C- vs B-), y todas las pantallas que asumen las columnas actuales.

**Costo:**

- ~ 1-2 semanas de desarrollo.
- Riesgo alto de regresiones en productInventory (que ya está en producción con cientos de items).
- Requiere migrar items existentes al nuevo formato.

### Opción C — Híbrido (importer one-way)

GENESIS sigue siendo el "scratchpad" que Maritza llena con facilidad. Un cron/Vercel function lee GENESIS cada N minutos, valida, normaliza y escribe al sheet Fotosíntesis oficial (el actual). Lo mejor de ambos mundos.

**Costo:**

- 2-3 días de implementación del importer.
- Dos fuentes a mantener sincronizadas.
- Riesgo: conflictos cuando alguien edita en GENESIS y en el sheet oficial a la vez.

### Opción D — Vista admin GENESIS aparte (no integrada con Fotosíntesis)

Crear una página nueva `/admin/genesis` que solo lea el sheet GENESIS y lo muestre tal cual. No tocar Fotosíntesis. Útil para inspección manual mientras se decide el formato definitivo.

**Costo:**

- 4-6 horas.
- No conecta con el proceso real — sigue habiendo doble entrada.

---

## 5. Recomendación

**Opción A + algo de D temporal.**

1. Documentar el formato que Fotosíntesis espera (este doc + ejemplo de cada tab).
2. Crear 4 tabs nuevos en el sheet GENESIS (Proveedores, Lotes, Clientes, Ventas) con headers exactos.
3. Migrar las 1-2 filas existentes a los nuevos tabs (manual).
4. Cambiar `SPREADSHEET_ID` env var en Vercel.
5. Validar `/api/get-table?table=providers|lots|clients|sales` devuelve filas.
6. (Opcional) `/admin/genesis-viewer` read-only para que Maritza vea su sheet sin perder el contexto.

Esto evita reescribir Fotosíntesis y respeta toda la inversión hecha en el schema, sync y pantallas v2.

---

## 6. Lo que necesito del usuario antes de tocar código

1. ¿La estructura "PROVEEDOR/COMPRAS/INVENTARIO" en un solo tab es **propuesta nueva de Maritza** o es lo que **ya está funcionando manualmente**? (Determina si refactor de sheet es viable.)
2. El sheet actual (env SPREADSHEET_ID) tiene cientos de items en `productInventory` — ¿se migran al GENESIS o se descartan?
3. ¿Quién tiene permisos de owner sobre el sheet GENESIS? El owner es `seguimientoproduccion1@gmail.com`, no `kvn3toj@gmail.com` — necesitamos write access del service account.
4. ¿Hay urgencia de fecha? (Para elegir entre Opción A meticulosa vs Opción D rápida.)

---

_Diagnóstico antes de operar. Si esto se desvía del plan, lo discutimos antes de mover bits._

---

## 7. Resolución implementada (2026-05-21)

Se eligió un híbrido seguro: **sheet nuevo dedicado para Fotosíntesis v2**, sheet legacy intocado.

- **Nuevo SOT:** `18w0DcP_4CO-le9_vt_UPGCHXAVXkQ5sugLF4r_o2bVM`
  ([abrir](https://docs.google.com/spreadsheets/d/18w0DcP_4CO-le9_vt_UPGCHXAVXkQ5sugLF4r_o2bVM/edit))
- 5 tabs (`Proveedores`, `Lotes`, `Inventario`, `Clientes`, `Ventas`) con headers
  exactos según `api/_lib/admin-table-config.ts` + `convex/_lib/columnMaps.ts`.
- Sembrado con los datos extraídos de GENESIS (1 proveedor, 1 lote, 2 ítems);
  `Clientes` y `Ventas` arrancan vacíos.
- Compartido editor con: `kvn3toj@gmail.com` (owner),
  `seguimientoproduccion1@gmail.com`, y el service account
  `tierra-madre-inventory@winged-scout-480001-a9.iam.gserviceaccount.com`.

### Cambios en código

- `api/_lib/constants.js`: añadido `FOTOSINTESIS_SPREADSHEET_ID` (env-overridable, default = id arriba).
- `api/_lib/index.d.ts`: tipo exportado y firma de `getSheetNames` extendida con `spreadsheetId?: string`.
- `api/get-table.ts` y `api/admin-table-update.ts`: apuntan a `FOTOSINTESIS_SPREADSHEET_ID` (no al legacy) **y pasan ese id explícitamente a `getSheetNames`** — sin eso, el helper enumeraba tabs del sheet legacy y los endpoints 404-eaban silenciosamente.
- `.env.example`: documentado.
- Convex no requiere cambios (todo pasa por el endpoint Vercel; `convex/_lib/sheetSync.ts` hace `fetch(${APP_URL}/api/admin-table-update)` y `convex/products.ts:_pullFromSheet` va vía endpoint).

### Scripts utilitarios

- `scripts/read-genesis-sheet.mjs` — lee GENESIS y dumpea a `docs/specs/2026-05-21-genesis-dump.json`. Read-only, seguro de re-correr.
- `scripts/create-fotosintesis-sot.mjs` — crea el SOT, siembra, formatea, comparte. **Idempotente:** aborta si `docs/specs/2026-05-21-fotosintesis-sot-id.txt` ya existe (usar `--force` para override).
- `scripts/share-and-verify-sot.mjs` — comparte con el SA y verifica lectura directa con el service account.
- `scripts/smoke-fotosintesis-endpoints.mjs` — replica la lógica exacta de `/api/get-table` (tab discovery + range read con los patrones de `TABLE_CONFIGS`) y valida que las 4 tablas (providers/lots/clients/sales) son alcanzables con el conteo de columnas correcto. Atajo: `npm run smoke:fotosintesis`.

### Lo que sigue (por confirmar con el usuario)

1. En Vercel: añadir `FOTOSINTESIS_SPREADSHEET_ID=18w0DcP_4CO-le9_vt_UPGCHXAVXkQ5sugLF4r_o2bVM` a Environment Variables (Production + Preview).
2. Después del próximo deploy: smoke test `/api/get-table?table=providers|lots|clients|sales` desde el navegador con `x-admin-sync-token`, o correr `npm run smoke:fotosintesis` localmente.
3. Cuando ya esté operando: poblar los proveedores/lotes reales desde Fotosíntesis (no más a mano en GENESIS).

---

## 8. Auditoría post-implementación (2026-05-22)

### Verificaciones que pasaron

- Headers columna a columna en los 5 tabs vs `admin-table-config.ts` + `columnMaps.ts` + `INVENTARIO_HEADERS` de `get-treasure-sheets.ts`: **match exacto** (Proveedores 8/8, Lotes 14/14, Inventario 21/21, Clientes 8/8, Ventas 15/15).
- Service account `tierra-madre-inventory@...` lee los 5 tabs sin error.
- `getSheetNames(sheets, SPREADSHEET_ID)` pasa el id explícito tanto en `get-table.ts` (línea 63) como en `admin-table-update.ts` (línea 109).
- Round-trip de escritura end-to-end al SOT nuevo (`Proveedores` row 3): write + read-back + cleanup → OK.
- `npx tsc --noEmit` sin errores en los archivos modificados.
- Grep exhaustivo en `api/`: ningún flujo Fotosíntesis administrativo sigue apuntando al legacy `SPREADSHEET_ID`.

### Asimetría detectada

Los 4 endpoints admin (`providers/lots/clients/sales`) escriben al SOT nuevo.
Pero `lotItems.create` también inserta un row en `productInventory` que se sincroniza vía `api.products.pushToSheet` → `/api/admin-product-update.ts`, y ese endpoint sigue apuntando al **sheet legacy** (`1mghR6...`).

**Consecuencia:** un ítem capturado por Maritza en Fotosíntesis aparecerá en:
- Convex `productInventory` (mirror).
- Sheet legacy `Inventario` tab (vía push existente).
- **NO** en el sheet nuevo `Inventario` tab.

Choca con la intención "en genesis únicamente hacemos el proceso de ingreso desde hoy en adelante".

**Opciones para resolver:**

A. **Aceptar la mezcla.** Items nuevos siguen yendo al legacy. El sheet nuevo solo sirve para Proveedores/Lotes/Clientes/Ventas. La pestaña `Inventario` del nuevo SOT queda como semilla GENESIS, no destino. Cero código adicional.

B. **Routing dual en `admin-product-update.ts`.** Detectar si el ítem viene de Fotosíntesis (e.g., `loteId` presente) y enrutar el write al nuevo SOT. Items legacy siguen yendo al legacy. Requiere refactor en `admin-product-update.ts` para honrar `FOTOSINTESIS_SPREADSHEET_ID` condicionalmente, posiblemente segundo mirror en Convex.

C. **Switch total.** Todo `productInventory` write va al nuevo SOT. El catálogo público `get-treasure-sheets` deja de ver los cientos de ítems existentes hasta migrar. No recomendado sin migración previa.

**Recomendación:** opción A en esta iteración. Si en el futuro Maritza quiere catálogo separado, movemos a B.

### Otros usos legítimos de `SPREADSHEET_ID` legacy (no cambiar)

`health.js`, `get-asesores.ts`, `admin-product-update.ts`, `create-product-folders.js`, `send-email.js`, `validate.ts`, `cotizacion-save.ts`, `get-treasure-sheets.ts`, `og-product.js` — flujos del catálogo legacy o features ortogonales a Fotosíntesis.

### Veredicto

**Aprobado para deploy** con la salvedad anterior documentada. Los 4 tabs admin están al 100%. Decisión pendiente: qué hacer con la pestaña `Inventario` del nuevo SOT (opción A/B/C) antes del primer ingreso real.
