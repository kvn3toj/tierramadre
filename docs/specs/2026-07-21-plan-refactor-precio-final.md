# Plan · Refactor de precio final (costoBase × 2.6)

**Fecha:** 2026-07-21 · **Estado:** pendiente — ejecutar en el **cutover** al SOT v3 +
Convex nuevo, NO antes (la app en vivo aún usa los tiers).

## Objetivo

Retirar `precioEmbajadorCOP` y `precioConscienteCOP`. El **precio final** es
`precioFinalCOP = round(costoBaseCOP × 2.6)`. En el SOT v3 ya está hecho (columna
`precioFinalCOP` con fórmula; los tiers vaciados). Falta el código.

## Enfoque: ADITIVO en 3 pasos (no big-bang)

1. **Agregar** `precioFinalCOP` (derivado `costoBase × 2.6`) en Convex, junto a los
   tiers viejos → no rompe nada.
2. **Migrar lecturas** UI/venta/GHL a `precioFinalCOP`.
3. **Quitar** `precioEmbajadorCOP`/`precioConscienteCOP` del schema + captura (al final).

## Archivos a tocar (18) — checklist

### Convex (fuente de verdad del precio)

- [ ] `convex/schema.ts` — `productInventory`: (1) agregar `precioFinalCOP: v.optional(v.number())`;
      (3) quitar `precioEmbajadorCOP`, `precioConscienteCOP`.
- [ ] `convex/lotItems.ts` — al crear/actualizar el ítem, computar
      `precioFinalCOP = round(costoBaseCOP × 2.6)` (costoBase ya es derivado ahí).
- [ ] `convex/products.ts` — `pushToSheet`: escribir `precioFinalCOP`; dejar de escribir tiers.
- [ ] `convex/_lib/columnMaps.ts` — `inventory` (via FOTO_INVENTARIO_COLUMNS): M = precioFinalCOP.
- [ ] `convex/_lib/sheetPullMaps.ts` — WRITABLE.inventory: quitar los 2 tiers; `precioFinalCOP`
      es DERIVADO → **NO** writable (como costoBaseCOP). Ajustar el test `sheetPullMaps.test.ts`.
- [ ] `convex/migrations.ts` — migración one-shot: `precioFinalCOP = costoBase×2.6` para docs viejos.
- [ ] `convex/ghl.ts` — precio que va a la orden GHL → `precioFinalCOP`.

### API / esquema de columnas

- [ ] `api/_lib/fotosintesis-inventory-columns.js` — `FOTO_INVENTARIO_COLUMNS`: M `precioEmbajadorCOP`
      → `precioFinalCOP` (DERIVADO, no writable). Quitar N `precioConscienteCOP` **o** dejarla
      reservada para no correr O–AP (recomendado: repurpose N a un placeholder vacío para no
      romper el mirror posicional, y limpiar en una migración `reorder-*` aparte).
- [ ] `api/admin-product-update.ts` — construye la fila por key: usar `precioFinalCOP`.
- [ ] `api/get-treasure-sheets.ts` — ✅ **ya lee `precioFinalCOP`** (hecho esta sesión).

### Frontend (captura / venta / display)

- [ ] `src/pages/admin/Fotosintesis/utils/buildLotItemPayload.ts` — quitar inputs de tier;
      no enviar precioEmbajador/consciente.
- [ ] `src/pages/admin/Fotosintesis/CapturaLotePage.tsx` — quitar campos de precio manual
      (el precio es automático = costo × 2.6). Mostrar el precio final calculado (read-only).
- [ ] `src/pages/admin/Fotosintesis/components/EditItemDrawer.tsx` — idem.
- [ ] `src/pages/admin/Fotosintesis/LoteResumenPage.tsx` — mostrar `precioFinalCOP`.
- [ ] `src/pages/admin/Fotosintesis/VentaPage.tsx` + `utils/saleItemSelection.ts` — precio de
      venta base = `precioFinalCOP`.
- [ ] `src/pages/admin/Fotosintesis/MovimientosKardexPage.tsx` — el fallback
      `precioEmbajadorCOP ?? precioConscienteCOP ?? precioCOP` → `precioFinalCOP ?? precioCOP`.
- [ ] `src/pages/admin/Fotosintesis/copilot/{executeAction,flowSchemas}.ts` — quitar los args
      de tier del copiloto.
- [ ] `src/hooks/useFotosintesisCatalog.ts` — leer `precioFinalCOP`.

## Notas

- **`precioFinalCOP` es DERIVADO** (como `costoBaseCOP`/`preponderancia`): se computa en Convex,
  se empuja a la hoja, y **no** se sincroniza de vuelta (excluir de WRITABLE) para que un edit
  en la hoja no lo pise. El multiplicador 2.6 puede vivir como constante (`TM_MARKUP_DEFAULT`,
  hoy 3.0 en `vocabularies.ts` — actualizar a 2.6).
- **Columna AS** "Precio x2.6 (fórmula)" del SOT queda duplicada con M `precioFinalCOP` →
  quitarla en el próximo build del SOT.
- **Mirror posicional:** quitar N físicamente corre O–AP. Preferir migración con
  `moveDimension` (ver `scripts/reorder-fotosintesis-price-columns.mjs`) o dejar N como
  columna reservada vacía. NO borrar N a mano sin actualizar los consumidores.
- **Ejecutar junto** con el cutover (Convex nuevo + repunte de envs), probado end-to-end:
  captura → precio auto → push a hoja → catálogo muestra precio → venta usa precio.
