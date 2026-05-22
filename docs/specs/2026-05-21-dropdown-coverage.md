# Spreadsheet Dropdowns ↔ Fotosíntesis UI — Coverage Report

> **Fecha:** 2026-05-21
> **Fuentes:**
>
> - SOT v2 nuevo (`18w0DcP_4CO-le9_vt_UPGCHXAVXkQ5sugLF4r_o2bVM`) — **sin dropdowns** (vacío recién creado)
> - Sheet legacy de producción (`1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU`) — fuente real de la verdad operativa de Maritza
> - GENESIS (`1c6qTuf8mnQjOvi-txVuNDshzsYyyaEW1SZ54PDThaQc`) — propuesta de Maritza
> - UI Fotosíntesis: `src/pages/admin/Fotosintesis/**` + `convex/schema.ts`
>   **Dump JSON crudo:** `docs/specs/2026-05-21-sot-dropdowns.json`

## TL;DR

El **SOT v2 recién creado no tiene ninguna validación de datos**. Las dropdowns reales viven en el sheet legacy de inventario.

Cuando comparo esas dropdowns contra lo que la UI de Fotosíntesis ofrece, hay **3 coincidencias completas, 1 parcial, y 7 brechas**. La más crítica es **Calidad**: la UI ofrece AAA/AA/A/Comercial (4 opciones), pero el sheet (y el ítem sembrado "Extrafina F1") usa 11 terminologías distintas que no están en la UI.

---

## Matriz de cobertura

| Dropdown del sheet               | Tab/Col                                                                                                                                                                                                                                                                                                                                                            | Opciones en sheet                                                                                                   | Equivalente en Fotosíntesis | Match                                                                                                                                                                                                                                                      | Gap |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **Tipo proveedor**               | (GENESIS col6) Anillo en Plata, Aretes, Topitos, Pulsera, Dije, Anillo en Oro, Piedras, Gemas, Lote de Gemas (9)                                                                                                                                                                                                                                                   | `TIPO_OPTIONS` en `ProveedorNuevoDrawer.tsx`: gemas, joyas, insumos, otros (4)                                      | ⚠ Parcial                   | UI categoriza por _tipo de proveedor_ (gemas/joyas/insumos/otros) mientras el sheet categoriza por _tipo de producto que el proveedor vendió_ (Aretes/Anillo/etc.). Modelo diferente — no necesariamente un gap, pero hay que decidir cuál vive en el SOT. |
| **Forma de pago (lote/venta)**   | (GENESIS col4/7/8) Efectivo, Tranferencia (2)                                                                                                                                                                                                                                                                                                                      | `MetodoContado` en `VentaPage.tsx`: efectivo, transferencia (2) + `FormaPago`: contado, credito, esmereogenesis (3) | ✅                          | Ojo: "Tranferencia" en sheet tiene errata (debería ser "Transferencia").                                                                                                                                                                                   |
| **Color de la gema**             | `INVENTARIO Tierra.Madre!Color` Verde Azulado, Verde Limón, Verde Menta, Verde Muzo, Verde Natural, Verde Vívido, Verde Chivor (7)                                                                                                                                                                                                                                 | `<input type="text">` libre en `GemaFields.tsx` con placeholder "Verde profundo, sandía…"                           | ❌                          | UI no impone vocabulario. Maritza puede teclear "verde-verde" y romper filtrado/agrupación.                                                                                                                                                                |
| **Calidad de la gema**           | `INVENTARIO Tierra.Madre!Calidad` Comercial Superfina, Comercial Fina, Comercial Superior, Comercial Estándar, Fina Esencial, Fina Sublime, Extrafina, Morralla Pulidad/Comercial/Fina/Superior (11) — **+ variantes GENESIS** Extrafina Insignificant/No Oil/Minor/F1/Moderate/F2, Com.Super Fina/Fina/Superior/Estandar (12)                                     | `CALIDAD_OPTIONS` en `GemaFields.tsx`: AAA, AA, A, Comercial (4)                                                    | ❌ CRÍTICO                  | La UI usa una escala genérica (AAA/AA/A) mientras el sheet usa el vocabulario real de Tierra Madre. Ítem sembrado "Extrafina F1" no existe en ninguno de los dos.                                                                                          |
| **Talla**                        | `INVENTARIO Tierra.Madre!Talla` 0/5/6/7/8/9 + Baguette/Corazón/Cuadrada/Cushion/Esmeralda/Lágrima/Ovalo/Lagrima/Redonda/Varias/Cabuchon/Gola/Chispero/Chisperito/Canutillo/En Bruto-Natural/Iris/Redonda calibrada/Morralla-Lapidada/Marquis (27) — **+ GENESIS col11 también ofrece** Brillante, Superman, Trapecio, Trillion, Antiguo, Ancestral, Pera, Princesa | No expuesto en GemaFields                                                                                           | ❌                          | UI no lo captura. Si Maritza necesita "talla" en venta, queda en `peso` (string libre) o no se registra.                                                                                                                                                   |
| **Medidas**                      | `INVENTARIO Tierra.Madre!Medidas` Largo x Ancho, Diámetro (2)                                                                                                                                                                                                                                                                                                      | No expuesto en GemaFields                                                                                           | ❌                          | El formato de medida (LxA vs Ø) no se pregunta en captura.                                                                                                                                                                                                 |
| **Categoría**                    | `INVENTARIO Tierra.Madre!Categoría` Gema, Anillo en Plata, Aretes, Topitos, Pulsera, Dije, Lote de Gemas, Anillo en Oro, Joyas, Piedras (10)                                                                                                                                                                                                                       | Implícita en TypeSelector (`gema`/`joya`/`insumo`/`lote`) pero solo `gema` está habilitada                          | ⚠                           | Joya/insumo están `disabled: true` en CapturaLotePage; la sub-categoría (Anillo en Plata vs Aretes vs Topitos) no se modela.                                                                                                                               |
| **Ubicación**                    | `INVENTARIO Tierra.Madre!UBICACIÓN` ASESOR, OFI.CALI, BOVEDA, EN PRODUCCION, CLIENTE, EN CERTIFICACION, OFI.BOGOTA, RETORNADO, EMBAJADOR (9)                                                                                                                                                                                                                       | No expuesto en Fotosíntesis                                                                                         | ❌                          | Fotosíntesis asume todo lo nuevo nace en bóveda y la ubicación cambia vía venta/asesor. No hay control fino.                                                                                                                                               |
| **Estado del item**              | `INVENTARIO Tierra.Madre!ESTADO` DISPONIBLE, VENDIDA, Retornado, ESMEREOGENESIS, ESMERO, DISPONIBLE ADOPTADA, LOTE X CT (7)                                                                                                                                                                                                                                        | `productInventory.estado` en `convex/schema.ts:96`: DISPONIBLE, VENDIDA, ASESOR, "" (4)                             | ⚠                           | UI no contempla "Retornado", "ESMEREOGENESIS"/"ESMERO", "DISPONIBLE ADOPTADA", "LOTE X CT". Si llega un ítem con uno de esos, el push a sheet va a estallar el v.union validator.                                                                          |
| **Asesor / NOMBRE INV-ESPECIAL** | 27 nombres hard-coded (M.Campuzano, Isa la Negra Vikinga, K.Pineda, etc.)                                                                                                                                                                                                                                                                                          | Tabla Convex `clients` con `tipo: "embajador"` — dinámica, no hard-coded                                            | ✅                          | Modelo mejor en Fotosíntesis (los embajadores se agregan vía `clients.create`); pero la migración debe importar los 27 actuales como filas en `clients`.                                                                                                   |
| **Colección**                    | 17 colecciones (COLECCION #4000, 11:11, Fenix, Secretos del Bosque, Princesas, Reinas, etc.)                                                                                                                                                                                                                                                                       | No expuesto en Fotosíntesis                                                                                         | ❌                          | Las colecciones son parte del catálogo público; al cerrar venta no se ve y al capturar lote tampoco.                                                                                                                                                       |
| **CAJA**                         | Legalizada, Pte Fecha x Legalizar, Pte Legalizar, Esmereogenesis (4)                                                                                                                                                                                                                                                                                               | No expuesto en Fotosíntesis                                                                                         | ❌                          | Es un campo de control contable; Fotosíntesis no lo cruza.                                                                                                                                                                                                 |
| **Asesores!Datos (rol)**         | Invitado Especial, Embajador, Administrador, Embajador - Admin, Asesor, CEO Tierra Mädre, Proveedor (7)                                                                                                                                                                                                                                                            | `clients.tipo`: embajador, final (2)                                                                                | ⚠                           | UI colapsa 7 roles en 2. Si se necesita distinguir "Administrador" o "CEO" en venta, no se modela.                                                                                                                                                         |

---

## Brechas por severidad

### 🔴 CRÍTICA — bloquea sync correcto

1. **`Calidad`**: La UI usa AAA/AA/A/Comercial; el sheet usa Extrafina/Fina Sublime/Comercial Fina/Morralla. Si Maritza captura una gema con "AAA" desde la UI, al sheet llega un valor que su dropdown no acepta. Si captura "Extrafina F1" desde el sheet, la UI no puede mostrarlo correctamente en el `<SegmentedControl>`.

2. **`productInventory.estado`**: Convex valida con `v.union("DISPONIBLE","VENDIDA","ASESOR","")`. El sheet legacy tiene también "Retornado", "ESMEREOGENESIS", "ESMERO", "DISPONIBLE ADOPTADA", "LOTE X CT". Cualquier ítem con uno de esos estados va a romper el pull-from-sheet en `convex/products.ts:_pullFromSheet`.

### 🟡 ALTA — pérdida de información

3. **`Color`**: free-text en UI ↔ 7 opciones en sheet. Maritza puede tipear variaciones; el sheet no las reconoce.
4. **`Talla`**: 27 opciones en sheet, ninguna en UI.
5. **`Categoría`** (sub-tipo de joya): 10 opciones en sheet, solo `gema` habilitada en UI.

### 🟢 MEDIA — features de catálogo deshabilitadas

6. **`Colección`**: 17 opciones — útiles para marketing/catálogo, no para captura.
7. **`Ubicación`**: control operativo de Maritza, no expuesto en Fotosíntesis.
8. **`CAJA`**: control contable, no expuesto.
9. **`Asesores!Datos`** (rol): 7 roles colapsados a 2.

### 🟦 BAJA — diseño deliberado

10. **`Tipo proveedor`**: GENESIS lo categoriza por producto (Aretes/Anillo); UI lo categoriza por proveedor (gemas/joyas). Es un cambio de modelo intencional documentado en el handoff §4.4.

---

## Recomendaciones

### Inmediato (antes de que Maritza use Fotosíntesis para crear datos reales)

1. **Reemplazar `CALIDAD_OPTIONS` en `GemaFields.tsx`** con el vocabulario real del sheet:

   ```ts
   const CALIDAD_OPTIONS: Array<{ value: GemaCalidad; label: string }> = [
     { value: "Extrafina", label: "Extrafina" },
     { value: "Fina Sublime", label: "Fina Sublime" },
     { value: "Fina Esencial", label: "Fina Esencial" },
     { value: "Comercial Superfina", label: "Comercial Superfina" },
     { value: "Comercial Fina", label: "Comercial Fina" },
     { value: "Comercial Superior", label: "Comercial Superior" },
     { value: "Comercial Estándar", label: "Comercial Estándar" },
     { value: "Morralla Pulida", label: "Morralla Pulida" },
     { value: "Morralla Comercial", label: "Morralla Comercial" },
     { value: "Morralla Fina", label: "Morralla Fina" },
     { value: "Morralla Superior", label: "Morralla Superior" },
   ];
   ```

   Y ampliar `GemaCalidad = "AAA" | "AA" | "A" | "Comercial"` para que acepte las 11. Tres palancas:
   - Mantener la unión de string literales (rigoroso pero más mantenimiento).
   - Tipar como `string` libre + validación en runtime contra una lista canónica.
   - **Recomendado:** importar `CALIDADES` desde un nuevo `convex/_lib/enums.ts` y reusarlo en UI + columnMaps + validators.

2. **Ampliar `productInventory.estado`** en `convex/schema.ts:96` para aceptar los 7 estados del legacy + permitir la migración de los cientos de filas existentes sin perder ninguna. Considerar mapear "ESMEREOGENESIS" ↔ "ESMERO" como sinónimos.

3. **Sembrar el SOT v2 con dropdowns**. Hoy está vacío; cuando Maritza empiece a teclear datos en el sheet va a perder la validación que tiene en el legacy. Hay que aplicar `setDataValidation` para Color/Calidad/Talla/Categoría/Ubicación/Estado a las columnas relevantes del tab `Inventario` del SOT. Script propuesto: `scripts/seed-sot-dropdowns.mjs` (no implementado todavía).

### Mediano plazo

4. **Importar los 27 asesores** del legacy `Asesores!Datos` a Convex `clients` con `tipo: "embajador"`. Sin esto, una venta con "Isa la Negra Vikinga" no encuentra cliente.

5. **Decidir si Fotosíntesis debe modelar Colección + Ubicación + CAJA**. Si sí, hay que extender el schema + UI. Si no, hay que documentar que esas columnas se gestionan solo desde el sheet y son view-only en la app.

6. **Exponer la sub-categoría de joya** cuando se implemente JoyaFields en Slice 2 (handoff §3.2/§4.2): Anillo en Plata/Oro, Aretes, Topitos, Pulsera, Dije.

### Largo plazo

7. **Unificar el vocabulario en una sola fuente** (`convex/_lib/enums.ts` o `src/data/vocabularies.ts`) que se use tanto para el `v.union` de Convex, el `CALIDAD_OPTIONS` de la UI, y el script que aplica `setDataValidation` al sheet. Hoy hay drift entre estas 3 capas — un solo módulo evita que vuelva a abrirse.

---

## Anexo — Coincidencias confirmadas

Para no perder de vista lo que sí está alineado:

- ✅ `formaPago` lote: contado/credito/esmereogenesis (Convex schema `lots.formaPago`).
- ✅ `metodoContado`: efectivo/transferencia (con la salvedad de la errata "Tranferencia" en GENESIS).
- ✅ `tipo cliente`: embajador/final (Convex `clients.tipo`).
- ✅ `tipo proveedor`: gemas/joyas/insumos/otros (Convex `providers.tipo` + UI `TIPO_OPTIONS`).
- ✅ `tipo documento` proveedor: NIT/Cédula/Pasaporte/Otro (solo UI, sin equivalente en sheet — es enriquecimiento).
- ✅ `lote.estado`: abierto/cerrado/publicado (UI/Convex solo, no hay dropdown legacy).

---

_Generado a mano contrastando `docs/specs/2026-05-21-sot-dropdowns.json` con la UI. Si Maritza valida que los 11 vocabularios de calidad y los 27 talles son los reales, hay que ejecutar las recomendaciones 1–3 antes del primer push real._
