# Reconciliación de inventario (hojas ↔ Convex) — diseño

**Fecha:** 2026-07-14
**Repos:** `TierraMadre` (Convex + api + app), hoja `Modelo_fijacion_precios`, Sheets SOT/legacy
**Estado:** diseño en revisión (hay 1 decisión pivote sin cerrar — ver §4)

## Problema

El inventario vive hoy en **tres hojas + Convex**, con numeraciones que divergen:

| Sistema                                          | Rol (según el dueño)                                                             | Numeración             |
| ------------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------- |
| **Convex** (`wonderful-tortoise-984`)            | App operativa; maneja QR/escaneo (`/p/:itemId`), catálogo, ventas                | itemId/loteId propios  |
| **Fotosíntesis SOT** (`18w0Dc…`)                 | **Oficial** — fuente operativa; Convex le hace push (mirror)                     | debería = Convex       |
| **Legacy "INVENTARIO Tierra.Madre"** (`1mghR6…`) | Fuente del **pull** cron (cada 15 min, `_pullFromSheet` → `get-treasure-sheets`) | numeración vieja       |
| **Modelo_fijacion_precios** (`1Sew9…`)           | **Costos y ventas** (precio equilibrio/objetivo, márgenes, ROI)                  | C-XXX / # Ítem propios |

Un cruce preliminar (`[[Anima: 2026-07-14-mapa-reconciliacion-hoja-convex]]`) mostró divergencia entre **Modelo** y **Convex** (≈12 lotes, hasta 56 ítems), **pero ese mapa sobre-estimó** la divergencia: comparó la columna «Nombre lote» de la hoja contra el nombre de ítem de Convex (columnas distintas). **La divergencia real es menor y hay que medirla bien.**

**Meta:** una **identidad de inventario única** compartida por Convex, el SOT y el Modelo, para que cada ítem físico tenga un solo número y sus **costos/precios (del Modelo)** se peguen al ítem correcto, y el **pull deje de re-desalinear**.

## Decisiones ya tomadas por el dueño

1. **Renumerar Convex para igualar la hoja canónica** (asumiendo reimpresión de QR + impacto en catálogo/ventas). _(Ver §4 — esto tiene tensión con «SOT es oficial»; hay que cerrarla.)_
2. **SOT = oficial** (numeración/estructura); **Modelo = costos/ventas**. Se usan ambos.

## No-objetivos

- No cambiar la lógica de negocio de precios (el Modelo la calcula; solo se importan costos a Convex).
- No migrar ventas históricas ni tocar ítems ya VENDIDOS más allá de renumerarlos si aplica.
- No rehacer el registro suelto del 2026-07-14 (ya se **deshizo** — ver `[[Anima: 2026-07-14-registro-masivo-convex]]`); el registro correcto ocurre dentro de este proyecto.

## §4 · Decisión PIVOTE sin cerrar (bloquea el plan de migración)

Cuando el **SOT/Convex** y el **Modelo** difieren en el número del **mismo ítem físico**, ¿cuál número prevalece?

- **Opción A — renumerar Convex/SOT al número del Modelo.** Alinea al documento de costos, pero **rompe QR impresos** (codifican itemId) y toca ventas/catálogo. (Es lo que sugiere la decisión #1.)
- **Opción B — mantener la numeración SOT/Convex y mapear el Modelo hacia ella.** No rompe QR; el Modelo se re-numera/mapea al SOT. (Es lo que sugiere «SOT es oficial».)

**Recomendación:** **B** — el SOT/Convex es lo operativo y lo que ya está impreso; renumerar en vivo es el mayor riesgo del proyecto. Pero como el dueño pidió explícitamente renumerar (A), **esta decisión se cierra tras ver el mapa refinado** (§Fase 1): si la divergencia real es pequeña, A puede ser aceptable; si es grande, B es lo sensato.

## Arquitectura — sub-proyectos (cada uno spec→plan→ejecución)

### Fase 1 — Mapa refinado + validación (SOLO LECTURA) — _hacer primero_

- Reconstruir el cruce con las **columnas correctas** (Modelo: `# Ítem` + `Producto/corte` + `Nombre lote` + `Costo compra`; SOT/Convex: `itemId`, `nombre`, `loteId`, `costoBaseCOP`).
- Producir la **tabla de identidad**: por cada ítem físico → {número Modelo, número SOT/Convex, nombre, lote en cada uno, costo}. Clasificar: coincide / diverge-real / falta-en-Convex / falta-en-Modelo / colisión.
- **Validación humana** de los diverge-reales y los datos sucios de la hoja (fechas en la columna nombre #485–492). El dueño confirma cuál es el ítem real.
- **Entregable:** `manifest-reconciliacion.json` revisado + el conteo real de divergencia → **cierra §4**.

### Fase 2 — Backend (según §4)

- Si **A (renumerar):** extender Convex para **reasignar itemId/loteId** de forma atómica y sin colisión (usar ids temporales para evitar choques al intercambiar números), con guardas y auditoría. Actualizar referencias (lotItems, ventas, productEdits) y re-sincronizar Sheets.
- Si **B (mapear):** agregar a Convex un campo de referencia `codigoModelo`/`itemModelo` (sin renumerar), + un importador de costos desde el Modelo por ese mapeo.
- En ambos casos: **importar costos** del Modelo → `costoBaseCOP`/preponderancia por lote.

### Fase 3 — Migración (idempotente, dry-run primero)

- Aplicar la identidad reconciliada + costos, registrar los **ítems faltantes** (los que están en la hoja pero no en Convex), y resolver los solo-Convex.
- Dry-run obligatorio → revisión → apply → reporte de mapeo.

### Fase 4 — Plomería de sync (para que NO se re-desalinee)

- Consolidar a **una sola fuente de pull/push**. Decidir: retirar la legacy y que el pull lea del SOT, o mantener SOT↔Modelo sincronizados para costos.
- Ajustar `_pullFromSheet`/`pushToSheet` y el cron a la fuente única.

### Fase 5 — QR (si §4 = A)

- Regenerar y **reimprimir** todas las etiquetas afectadas (feature Etiquetas/Próximos de la app). Reporte de re-etiquetado físico.

## Seguridad / operación

- Todo cambio destructivo va con **dry-run**, **backup** (export de Convex + copia de las hojas) y, para renumeración, **ventana de mantenimiento** (bots + app en vivo; el cron de pull debe pausarse durante la migración).
- Idempotencia por token en las escrituras.
- El proyecto avanza **fase por fase con aprobación** entre cada una; nada en producción sin que el dry-run pase y el dueño valide.

## Retos conocidos

- **Colisiones al renumerar** (el número destino puede estar ocupado) → estrategia de ids temporales.
- **El pull re-desalinea** si no se arregla la fuente (Fase 4) → pausar el cron durante la migración.
- **Dato sucio en el Modelo** (fechas en nombres, sub-códigos 93A/495B) → limpiar en Fase 1.
- **Tres hojas** con roles distintos → el modelo canónico (SOT oficial + Modelo costos) debe quedar documentado y con el sync consolidado (Fase 4).
