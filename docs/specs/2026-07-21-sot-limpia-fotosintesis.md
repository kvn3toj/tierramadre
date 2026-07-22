# SOT Limpia · Inventario-Fotosíntesis (v3)

**Fecha:** 2026-07-21
**Google Sheet:** https://docs.google.com/spreadsheets/d/1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U/edit
**ID:** `1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U`
**Dueño:** kvn3toj@gmail.com · **Compartido (editor):** service account `tierra-madre-inventory@…`
**.xlsx equivalente:** `Fotosintesis-SOT-Limpia.xlsx` (raíz del repo)

Fuente única de verdad limpia del inventario para la app Fotosíntesis. Consolida en UNA
hoja las cinco fuentes que hoy están dispersas (Legacy, Fotosíntesis/Convex, ModeloPrecios,
Caja, Ventas/Kardex), a partir de la reconciliación `Sintesis_Inventario` + `Consolidado_Completo`
del SOT v2, con datos validados, ortografía normalizada y formatos correctos.

---

## 1. Estructura de la hoja

| Pestaña         | Filas     | Descripción                                                                                                                          |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Léeme**       | —         | Guía rápida embebida en el propio libro.                                                                                             |
| **Inventario**  | 513 ítems | 1 fila por ítem. **A–AP = esquema canónico de la app** (idéntico a `FOTO_INVENTARIO_COLUMNS`). **AQ–AU = bloque de ayuda** (dorado). |
| **Lotes**       | 98        | Catálogo de lotes. Incluye **31 lotes recuperados** (C-043…C-076) que los ítems referenciaban pero faltaban del catálogo.            |
| **Proveedores** | 4         | Catálogo.                                                                                                                            |
| **Clientes**    | 29        | Deduplicados por nombre.                                                                                                             |
| **Ventas**      | 3         | Ventas reales (VC-0001, VC-0004, VC-0005); filas vacías eliminadas.                                                                  |
| **Calidades**   | 19        | Lista canónica + `CALIDAD_FACTORS` (factor de precio) — referencia.                                                                  |
| **Listas**      | —         | Fuente de los menús desplegables. **No borrar.**                                                                                     |

### Columnas de la pestaña Inventario

- **A–AP** — esquema canónico exacto de la app (misma posición y encabezado que
  `api/_lib/fotosintesis-inventory-columns.js`). La app lee posicionalmente, así que
  **no reordenar A–AP**.
- **D `Peso (ct)`** — quilates, numérico validado (`0.00`).
- **AQ `Peso (gr)`** — gramos de joya, numérico. Separado de los quilates (antes se
  mezclaban en una sola columna).
- **L `costoBaseCOP` · M `precioEmbajadorCOP` · N `precioConscienteCOP`** — valores
  estáticos limpios (canónico, formato `#,##0`).
- **AR `Costo lote (fórmula)`** = `VLOOKUP(loteId → Lotes.costoTotalCOP) × preponderancia`.
  Columna de comparación (preserve + fill-gaps): reproduce el costoBase derivado y permite
  detectar desviaciones cuando un costo de lote cambie.
- **AS `Precio x2.6 (fórmula)`** = `costoBaseCOP × 2.6`. Precio sugerido para comparar.
- **U `preponderancia`** — fracción del lote (formato `%`).
- **AT `Fuentes` · AU `Notas / conflictos`** — trazabilidad de la reconciliación + banderas
  de limpieza por ítem.

### Validación (desplegables)

Todos **no estrictos** (permiten escribir otro valor), replicando el comportamiento real de
la app (los normalizadores conservan write-ins). Validan contra la pestaña `Listas`:
color, calidad, talla, medidas, categoría, ubicación, estado, colección, caja, procedencia,
tipoEsmeralda, subtipoForm, tipoJoya, técnicaJoya, formulaGema/Joya, rangoDescuento,
`mostrarEnCatalogo`, y escala 1–6 para `nivelRareza`/`calificacion`.

---

## 2. Cómo la app lee de esta hoja

La app **no cambia**. El pipeline actual es:

```
Hoja (Inventario A–AP)  ──Apps Script bound + convex/fotoSync.ts──▶  Convex (productInventory)
        ▲                         (delta sync, allowlist en                 │
        └── pushToSheet ──────────  convex/_lib/sheetPullMaps.ts) ◀─────────┘
```

- La app apunta al SOT vía la env **`FOTOSINTESIS_SPREADSHEET_ID`**. Esta hoja nueva
  **no se activa sola**: para que la app la use, hay que apuntar esa env al nuevo ID
  (`1oRw1KSh8L1Cy…`) — recomendado hacerlo tras revisión.
- El bloque de ayuda **AQ–AU no interfiere**: el lector posicional solo consume A–AP; las
  columnas derivadas (`costoBaseCOP`, `preponderancia`) siguen excluidas de la escritura
  hoja→Convex (son derivadas), tal cual la allowlist actual.
- La hoja ya está compartida con el service account, así que las APIs de Fotosíntesis
  pueden leerla/escribirla en cuanto se cambie la env.

---

## 3. Qué cambia vs. el SOT viejo

| Tema                      | SOT v2 (viejo)                                                                    | SOT Limpia (v3)                                                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pestañas                  | 12 (incl. `_Sync`, `_SyncQueue`, `Consolidado*`, `Sintesis`)                      | 8 limpias, sin andamiaje de reconciliación.                                                                                                          |
| Ítems                     | 1–323 ocultos + activos dispersos; `Inventario` solo tenía 152 ítems reales       | 513 ítems reales consolidados (1–524, sin los 11 números nunca asignados).                                                                           |
| **Peso**                  | 1 columna mezclando ct/gr; **~40 pesos corruptos** (serial de fecha)              | **ct y gr separados**; **34 recuperados** del serial de Excel + **4 corregidos manual** (341→8.6, 342→6.3, 343→3.8, 355→1.1); 0 corruptos restantes. |
| **Calidad**               | 26 variantes (`Comercial Fina` vs `COMERCIAL FINA`, `C. Estándar`, `Extrafina …`) | Normalizada a la lista canónica (`CALIDADES` + alias).                                                                                               |
| **Color/Talla/Colección** | casing/acentos/typos ("Motaña", "Lagrima")                                        | normalizados con folding de acentos.                                                                                                                 |
| Lotes                     | 31 lotes referenciados por ítems pero **ausentes** del catálogo                   | recuperados desde snapshots Convex por ítem (marcados "verificar").                                                                                  |
| Clientes                  | 36 con duplicados y fila vacía                                                    | 29 deduplicados.                                                                                                                                     |
| Formatos                  | texto/serial en números                                                           | `0.00` (peso), `#,##0` (COP), `%` (preponderancia), enteros.                                                                                         |
| Validación                | dropdowns parciales                                                               | dropdowns en 21 columnas desde `Listas`.                                                                                                             |
| Formulas                  | ninguna                                                                           | costoBase-comparación + precio x2.6 (1176 fórmulas, 0 errores).                                                                                      |

**Pendiente de captura manual** (banderas en `Notas / conflictos`, 216 ítems): medidas,
talla, color y categoría faltantes en el set legacy — no autocompletables (Convex también
vacío). Ubicación/asesor/caja/colección vacíos = normal por diseño, no son faltantes.

---

## 4. Plan Convex (opcional — el usuario despliega)

El esquema Convex actual (`convex/schema.ts`, `productInventory`) **ya está alineado** con
esta hoja: mismos campos, mismos normalizadores (`vocabularies.ts` es la fuente común). No
hace falta rediseñar el esquema para adoptar esta hoja.

Si aun así se quiere un **proyecto Convex nuevo** (free tier) + reseed desde esta hoja limpia:

1. **Crear proyecto** (requiere tu login): `npx convex login && npx convex init` (o
   `npx convex deploy` sobre un nuevo deployment).
2. **Reusar el esquema** actual `convex/schema.ts` tal cual (ya coincide).
3. **Seed desde la hoja**: adaptar `scripts/migrate-sheets-to-convex.ts` para leer esta
   hoja (`FOTOSINTESIS_SPREADSHEET_ID = nuevo ID`) tabla por tabla
   (`npm run migrate:convex:dry` primero, luego `npm run migrate:convex`).
4. **Repuntar envs**: `FOTOSINTESIS_SPREADSHEET_ID`, `CONVEX_DEPLOYMENT`, `CONVEX_URL`.
5. **Verificar** con `npm run migrate:convex:dry` y un smoke test de lectura.

No puedo ejecutar 1/4 (necesitan tu `npx convex login` en tu máquina). Puedo preparar el
script de seed adaptado cuando decidas proyecto nuevo vs. existente.

---

## 5. Artefactos generados

- Google Sheet (arriba) — SOT limpia en tu Drive.
- `Fotosintesis-SOT-Limpia.xlsx` — equivalente offline (raíz del repo).
- Scripts reproducibles en scratchpad: `vocab.py` (vocabularios portados), `prep.py`
  (merge + limpieza), `build.py` (openpyxl), `upload.mjs` (Drive).

---

## 6. Actualización 2026-07-21 · Enriquecimiento (menos celdas vacías)

Segunda pasada tras revisar TODAS las columnas fuente redundantes de
`Consolidado_Completo` (Legacy_/Foto_/Precio_/Convex_/Caja_) + validación cruzada
contra las ~601 notas por ítem del vault Anima (`TierraMadre/inventario/`, anima_TM_bot).

**Coalesce multi-fuente (mismo campo semántico en varias columnas):**
- **costoBaseCOP: 123 → 444** — se completó desde `Caja_costoInicial` (coincide 66/68
  = 97% con el costoBase exacto donde ambos existen), luego `Precio_costoCompra` y el
  cómputo lote×preponderancia.
- **categoria: 439 → 502** — desde `Legacy_categoria` + `Precio_lineaProduc`.
- **procedencia: 76 → 91** — derivada de la mina del lote cuando el ítem no la traía.
- color/calidad/talla/nombre/cantidad/tipoEsmeralda — coalesce a todas las fuentes.
- **estado** — inferido de `Caja_estado` (VENDIDO/CARTERA → VENDIDA) donde faltaba.

**Validación con Anima vault (anima_TM_bot):**
- **`Anima: notas relacionadas`** (nueva col) — cada ítem enlaza sus 523 notas del vault.
- **`Producto (URL)`** (nueva col) — link tierramadre.app/product/{item} por ítem.
- Corrección autoritativa **ítem #337 → 70.425 ct / 14.085 g** (nota manuscrita del
  dueño 2026-07-17, reemplaza el 48.4 gr obsoleto).
- +15 color, +6 calidad, +3 gr, fotoUrl completados desde notas.

**Columnas de referencia contable/modelo añadidas (bloque dorado):** `Precio objetivo
(modelo)`, `Caja: precio venta` (360 ítems), `Caja: valor pagado`, `Caja: saldo`,
`Caja: comprador`, `Caja: estado contable`. Datos que ya existían y ahora están visibles.

**Nota sobre vacíos restantes (por diseño, no faltantes):** rendimientoEsperado,
cantidadEstimada, nivelRareza, calificacion, tipoJoya, tecnicaJoya, minerales,
complementos, formulaGema/Joya, certificadoUrl, asesorActual/estadoAsesor, qr — campos
de captura opcionales que legítimamente no aplican a una gema suelta. ubicacion/caja/
coleccion/loteId/preponderancia vacíos = normal (ítems sin lote o sin asignar).

---

## 7. Actualización 2026-07-21 (b) · Medidas (I/J) + costos estimados

**Columnas I / J reorganizadas** (validación cruzada: SOT viejo + `Consolidado_Completo`
+ notas Anima + parser de medidas):
- **Columna I `Medidas` = unidad/formato** (`Largo x Ancho` / `Diámetro`), inferido del nº
  de dimensiones.
- **Columna J `Medidas (valores)` = el valor** normalizado, p.ej. `11.0 × 13.7 × 3.9 mm`.
- Se movieron los valores que estaban mal ubicados en I → J; se limpió el ruido `0`/`0.0`/
  `Anillo`/`Topos` de J. **187 ítems con medida real y pareada; 0 valores mal ubicados.**
- Cuando un ítem no tiene valor de medida, I y J quedan vacíos (unidad sin valor no aporta).

**Costos estimados (nueva fuente: `Seguimiento Caja-Inventario TierraMadre.xlsx`):**
- Cruzado el libro de Caja (tabs SEGUIMIENTO INVENTARIO + PIEZAS DISPONIBLE, 389 ítems).
- **100 ítems tenían costo = precio** (el "costo" solo espejaba el precio de venta). Para
  ellos: **costoBaseCOP = precio / 2.6** (modelo de markup), con nota
  *"costo estimado = precio/2.6 (costo original igualaba al precio)"* en `Notas / conflictos`.
  Ej.: #1 Rey Midas 635.000 → costo 244.231; #52 Pocahontas 340.000 → 130.769.
- Los 283 ítems con costo real distinto del precio conservan su costo registrado.
- `Caja: precio venta / valor pagado / comprador / estado` refrescados desde la fuente
  autoritativa (368 ítems con precio de venta).
