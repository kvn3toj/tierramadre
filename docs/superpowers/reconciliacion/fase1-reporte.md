# Reconciliación de inventario · Fase 1 — Reporte (SOLO LECTURA)

**Fecha:** 2026-07-14
**Alcance:** Fase 1 (mapa refinado + validación). 100% solo-lectura — cero escrituras a Convex, Sheets o producción.
**Cierra:** la decisión pivote **§4** del diseño (renumerar vs mapear).
**Fuentes cruzadas:** Modelo_fijacion_precios ↔ Convex PROD (`wonderful-tortoise-984`) ↔ SOT fotosíntesis ↔ legacy.

---

## 1. Fuentes y conteos

| Fuente                                      | Cómo se leyó                                       | Filas                          | Clave del ítem                                                             |
| ------------------------------------------- | -------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| **Modelo_fijacion_precios**                 | Google Drive `1Sew9…` (XLSX), hoja `Inventario`    | 203 filas (**185 con # Ítem**) | `# Ítem` (col C), normalizado sin `.0`, sub-códigos `93A/495B` conservados |
| **Convex PROD** (`wonderful-tortoise-984`)  | `lotItems:search {minCantidad:0}` + `lots:list {}` | **117 ítems**, **43 lotes**    | `itemId` (string)                                                          |
| **Legacy** (`get-treasure-sheets`)          | `GET /api/get-treasure-sheets` → `.treasure[]`     | 347                            | `item`                                                                     |
| **SOT fotosíntesis** (`get-inventory-rows`) | `GET /api/get-inventory-rows` → **HTTP 401**       | — (no disponible)              | —                                                                          |

**Notas:**

- **Convex está limpio:** 43 lotes / 117 ítems, sin rastro de los 31 ítems de prueba `MED-XXX` ni de los ítems #476–503 del registro que se **deshizo** (rollback verificado en los datos — ver §2).
- **SOT no accesible** este ciclo (401, requiere auth que el script no tenía). No bloquea: Convex es su mirror, así que el cruce Modelo↔Convex captura lo que importa para §4. La columna `sot` queda `null`.
- 18 filas del Modelo no tienen `# Ítem` (encabezados/subtotales/entradas sin numerar) → no reconciliables por número; quedan fuera del cruce.
- El cruce **empareja por número de ítem**; el nombre real del ítem en el Modelo = `Producto/corte` (col D) + `Nombre lote` (col F).

---

## 2. Métricas de divergencia refinadas (vs mapa preliminar)

**Universo del cruce:** 227 números de ítem (185 del Modelo con número ∪ 117 de Convex).

| Clase             |  Conteo | Qué significa                                                           |
| ----------------- | ------: | ----------------------------------------------------------------------- |
| `coincide`        |  **41** | Mismo número → mismo ítem físico (nombre coincide)                      |
| `diverge-nombre`  |  **34** | Mismo número → **producto distinto** en cada sistema (divergencia REAL) |
| `falta-en-convex` | **110** | Documentado en el Modelo, sin equivalente en Convex                     |
| `falta-en-modelo` |  **42** | En Convex, ausente del Modelo                                           |
| `colision`        |   **0** | Ningún número duplicado dentro de una misma fuente                      |
| **Total**         | **227** |                                                                         |

### La cifra que importa: divergencia REAL = 34 (no 56, no 62)

El mapa preliminar y la regla literal del plan **sobre-estimaron** la divergencia por un **artefacto de la métrica de similitud**, no por divergencia real:

| Métrica                                                                       | `diverge-nombre` | Por qué            |
| ----------------------------------------------------------------------------- | ---------------: | ------------------ |
| Mapa preliminar (comparó solo `Nombre lote`)                                  |               56 | columnas distintas |
| Regla **literal** del plan (`corte + Nombre lote` vs `convex.nombre`)         |              ~62 | inflada            |
| **Robusta** (`max(similitud vs Nombre lote, similitud vs corte+Nombre lote)`) |           **34** | ← **REAL**         |

**Causa del artefacto:** `convex.nombre` almacena el **`Nombre lote` solo** (p. ej. Convex `"Celeritas"`, `"Brújula Sagrada"`), no `corte + Nombre lote`. Al anteponer el `corte` (a veces largo: `"Chispitas"`, `"Set Choker, anillo y aretes…"`), el denominador sensible a longitud de `SequenceMatcher` empuja **matches genuinos** por debajo del umbral 0.72. Ejemplos:

| #   | Modelo (corte / Nombre lote)         | Convex                 | sim literal | sim robusta | Veredicto        |
| --- | ------------------------------------ | ---------------------- | ----------: | ----------: | ---------------- |
| 342 | Lágrima / Pera · **Brújula Sagrada** | Brújula Sagrada        |     0.67 ❌ |     1.00 ✅ | mismo ítem       |
| 370 | Chispitas · **Celeritas**            | Celeritas              |     0.64 ❌ |     1.00 ✅ | mismo ítem       |
| 379 | Chispitas · **Aion**                 | Aión                   |     0.44 ❌ |     1.00 ✅ | mismo ítem       |
| 387 | Set Choker… · Renacer de Primavera   | **Vuelo de la Sabana** |        0.37 |        0.37 | **diverge real** |

La métrica robusta recuperó **27 falsos diverge**. _(Decisión del dueño 2026-07-14: usar la métrica robusta como cifra oficial de §4.)_

### Reciente vs histórica (el corte que decide §4)

Siguiendo la nota de recencia del plan (el Modelo trae los cambios de esta semana):

- **RECIENTE (no es divergencia — son altas por importar):** los `falta-en-convex` recientes: **21 ítems #500–521** (bloque más nuevo), de los cuales **15 traen una fecha metida en el nombre** (dato sucio de esta semana; #485–492 y #511–519 — estos últimos 9 caen dentro del bloque #500–521, no se suman aparte). Se resuelven **a favor del Modelo** (es más nuevo); es trabajo de importación en Fase 3, no una decisión de §4.
- **HISTÓRICA (esto decide §4):** los **34 `diverge-nombre`**, todos en el bloque de joyería **#374, #387–416, #446–449** — divergencia **pre-existente** (ya significaban cosas distintas en cada sistema antes de cualquier registro). Coincide exactamente con el bloque que el mapa preliminar ya había señalado como divergencia de joyería.

**Confirmación del rollback:** ninguno de los ítems #476–503 (el registro que se deshizo) aparece como `diverge` ni `solo-Convex` — Convex quedó limpio.

---

## 3. Resumen de casos a validar

Artefacto para el dueño: `scripts/reconciliacion/out/validacion.{csv,md}` — **186 casos** que requieren decisión humana (todo lo no-`coincide`), una tabla por clase con la instrucción de qué decidir:

| Clase             | Casos | Qué decide el dueño                                                                 |
| ----------------- | ----: | ----------------------------------------------------------------------------------- |
| `diverge-nombre`  |    34 | ¿Mismo ítem físico con distinto nombre, o dos ítems distintos que comparten número? |
| `falta-en-convex` |   110 | ¿Alta reciente por importar (favor Modelo), o ruido?                                |
| `falta-en-modelo` |    42 | ¿Venta vieja, ítem retirado, o falta documentarlo en el Modelo? (rango #323–471)    |
| `colision`        |     0 | —                                                                                   |

Los 41 `coincide` van en un anexo colapsado (no requieren revisión).

---

## 4. Datos sucios detectados en la hoja Modelo

**15 filas** tienen una **fecha/datetime metida en la columna de nombre** (p. ej. `"Lágrima 2026-03-03 00:00:00"`), concentradas en los lotes **C-034 / C-037**, ítems **#485–492 y #511–519** — todos `falta-en-convex`. Marcados `⚠️ fecha en columna nombre` en el CSV/MD. Hay que limpiarlos en la hoja antes de importarlos (Fase 3). _(La detección usa un matcher de fecha real, no coincidencia de substring — no marca falsos como `"chatones mariposa"`.)_

---

## 5. Recomendación §4 — cerrada con datos

**Pregunta §4:** cuando Convex y el Modelo difieren en el número del mismo ítem físico, ¿se **renumera Convex** al número del Modelo (Opción A) o se **mapea** el Modelo hacia Convex sin renumerar (Opción B)?

**Criterio del plan:** si la divergencia real es _poca_ (≤~15 ítems y ≤~3 lotes) → A (renumerar) es viable; si es _mucha_ → B (mapear).

**Lo que muestran los datos:**

- Divergencia real = **34 ítems** (>> 15).
- Abarca **13 lotes del Modelo / 14 de Convex** (>> 3).
- **28 de los 34** además difieren en el **lote** asignado en cada sistema (no solo el nombre) → renumerar tendría que reasignar también lotes, multiplicando el riesgo de colisión.
- Toda la divergencia es **histórica** (joyería #387–446), sobre ítems que ya pueden tener **QR impresos** (que codifican el `itemId` de Convex).

**→ Recomendación: OPCIÓN B — mapear sin renumerar.**

Agregar a Convex un campo de referencia (`itemModelo`/`codigoModelo`) que apunte al número del Modelo, e importar costos por ese mapeo, **sin cambiar los `itemId`/`loteId` de Convex**. Renumerar (A) rompería los QR impresos, tocaría 34 ítems en 13–14 lotes con 28 reasignaciones de lote, y no aporta valor operativo — el SOT/Convex es lo que ya está en producción y escaneándose. La numeración del Modelo se preserva como **referencia**, no como identidad primaria.

---

## 6. Qué desbloquea la Fase 2

Con §4 = **B (mapear)**, la Fase 2 (backend) queda definida:

1. **Campo de mapeo** en Convex (`itemModelo`/`codigoModelo`) — sin renumerar.
2. **Importador de costos** del Modelo → `costoBaseCOP` por ese mapeo (el Modelo manda en costos).
3. **Altas pendientes:** registrar los `falta-en-convex` recientes (#500–521 + limpiar los 15 con fecha en el nombre) — trabajo de Fase 3, con dry-run.
4. **Validación humana** de los 34 `diverge-nombre` (¿cuál nombre es el real?) usando `validacion.csv` — insumo para el mapeo.
5. Los `falta-en-modelo` (42, #323–471) requieren una pasada aparte: ¿documentarlos en el Modelo o marcarlos como retirados?

**Nada de esto arranca sin la decisión explícita del dueño sobre §4.**

---

## Anexo · Artefactos generados (todos git-ignored salvo los scripts)

- `scripts/reconciliacion/fetch.ts` · `parse-modelo.py` · `cruzar.py` · `validar.py` (versionados)
- `out/{modelo,convex_items,convex_lotes,legacy,sot}.json` — fuentes normalizadas
- `out/identidad.json` — tabla de identidad (227 entradas, con 3 similitudes por ítem)
- `out/metricas.json` — conteos por clase + comparativa (56/~62/34)
- `out/validacion.{csv,md}` — 186 casos para decisión humana
