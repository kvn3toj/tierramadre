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

### Reciente vs histórica (corregido con `Fecha compra` del CSV del dueño, 2026-07-14)

> **Corrección:** una versión previa de este reporte asumió que los 34 `diverge` eran "históricos/pre-existentes". La columna **`Fecha compra`** del export del Modelo prueba lo contrario — son **recientes**.

- **La divergencia (34) es RECIENTE:** **30 de los 34 se compraron en julio 2026** (los otros 4 sin fecha: #374, #446, #447, #449, variaciones menores de nombre). Es decir, en julio se registraron ~30 piezas nuevas en el Modelo con los números **#387–416** (Renacer de Primavera, Susurro de Otoño, etc.), pero **Convex ya tenía otros ítems (más viejos) en esos mismos números** (Vuelo de la Sabana, Libélulas, etc.). **La divergencia es una colisión de numeración por reuso reciente en el Modelo**, no deriva antigua. Esto **refuerza la Opción A**: la intención de numeración más reciente (la del Modelo, de julio) es la que el dueño quiere que prevalezca.
- **`falta-en-convex` (110) es mayormente ANTIGUO/sin fecha:** 105 de 110 sin `Fecha compra` — inventario documentado viejo, no altas de esta semana. Se importan/registran en Fase 3 (favor Modelo en contenido), pero no urge por recencia.
- **`falta-en-modelo` (42, #323–471):** ítems solo-Convex, sin entrada en el Modelo — requieren decidir si documentarlos o marcarlos retirados.

**Confirmación del rollback:** ninguno de los ítems #476–503 (el registro que se deshizo) aparece como `diverge` ni `solo-Convex` — Convex quedó limpio.

**Integridad de datos (confirmada contra el CSV del dueño):** el universo de ítems y los costos coinciden con lo que extraje; solo **5 ítems (#434–438)** muestran costo distinto (ediciones recientes en el CSV más nuevo) → re-extraer el Modelo fresco antes de importar costos en Fase 2.

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

- Divergencia real = **34 ítems**, en **13 lotes del Modelo / 14 de Convex**; **28 de los 34** difieren también en el **lote** asignado.
- Por pura magnitud (>> 15 ítems / >> 3 lotes), el criterio del plan apuntaba a **B**.
- Pero la divergencia es **RECIENTE** (30/34 comprados en julio 2026): es un **reuso de numeración** — en julio el Modelo asignó #387–416 a piezas nuevas que en Convex ya estaban ocupadas por ítems más viejos. La numeración del Modelo refleja la **intención actual del dueño**.

**→ Decisión del dueño (2026-07-14): OPCIÓN A — renumerar Convex al Modelo**, con mitigación obligatoria de QR.

El riesgo principal de A (romper los QR impresos, que codifican el `itemId` de Convex) se **neutraliza** con el requisito explícito del dueño: **respaldar o redirigir los QR actuales, con rastreo total**. Esto se implementa como una **tabla de alias `itemId viejo → nuevo` + bitácora de auditoría**, de modo que la ruta `/p/:itemId` resuelva los números viejos y toda etiqueta impresa siga funcionando (redirige al ítem renumerado). Con esa mitigación, A alinea Convex a la numeración de julio del Modelo sin perder trazabilidad ni romper lo impreso.

---

## 6. Qué desbloquea la Fase 2 (§4 = A · renumerar con alias de QR)

Con §4 = **A (renumerar Convex al Modelo)**, la Fase 2+ es un sub-proyecto destructivo en producción — va con su propio spec→plan→**dry-run**→aprobación. Secuencia de seguridad obligatoria:

1. **Backup primero:** export completo de Convex PROD (`wonderful-tortoise-984`, todas las tablas) + copia de las hojas, antes de cualquier escritura.
2. **Infra de alias/redirección de QR (el requisito del dueño):** tabla `alias_itemId { viejo → nuevo, timestamp, motivo }` + bitácora de auditoría; la ruta `/p/:itemId` resuelve alias → toda etiqueta impresa vieja sigue funcionando. **Rastreo total de cada renumeración.**
3. **Renumeración atómica** con ids temporales para evitar colisiones al intercambiar números, con guardas; actualizar referencias (`lotItems`/`productInventory`, ventas, `productEdits`) y re-sincronizar Sheets. Resolver dónde quedan los **ítems viejos de Convex** que hoy ocupan #387–416 (Vuelo de la Sabana, etc.) — necesitan nuevo número.
4. **Importar costos** del Modelo (re-extraído fresco — ojo #434–438) → `costoBaseCOP`.
5. **Validación humana** de los 34 `diverge` (`validacion.csv`): confirmar, ítem por ítem, cuál es el real antes de renumerar.
6. **Ventana de mantenimiento:** pausar el cron de pull durante la migración para que no re-desalinee.
7. **Altas/pendientes** (`falta-en-convex` viejos + limpiar los 15 con fecha en el nombre; `falta-en-modelo` #323–471) — pasadas aparte en Fase 3.

**Nada toca producción sin backup + dry-run que pase + validación del dueño.**

---

## Anexo · Artefactos generados (todos git-ignored salvo los scripts)

- `scripts/reconciliacion/fetch.ts` · `parse-modelo.py` · `cruzar.py` · `validar.py` (versionados)
- `out/{modelo,convex_items,convex_lotes,legacy,sot}.json` — fuentes normalizadas
- `out/identidad.json` — tabla de identidad (227 entradas, con 3 similitudes por ítem)
- `out/metricas.json` — conteos por clase + comparativa (56/~62/34)
- `out/validacion.{csv,md}` — 186 casos para decisión humana
