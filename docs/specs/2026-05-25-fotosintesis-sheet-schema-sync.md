# Fotosíntesis SOT schema sync (2026-05-25)

Brought the Fotosíntesis push-only Google-Sheets mirror up to date with every
field the data-entry forms now capture. The forms + Convex mirror had grown
new fields (lot `renombreLote`/`tratamiento`/`mina`/`sede`/operador; item
`subtipoForm`, the x1–x4 price tiers, item photos, gem/jewel metadata) but the
sheet was still on the original `Lotes!A:N` / `Inventario!A:U` layout, silently
dropping them on every push.

## Audit — what was being dropped

**Lotes (was A:N):** `renombreLote`, `tratamiento`, `mina`, `sede`,
`operadorNombre`, `operadorRol`. (`fotoLoteUrl` / `mostrarComoLote` stay
Convex-only — `lots.setLoteDisplay` deliberately does not push.)

**Inventario (was A:U):** `preponderancia` (col S header existed but was never
written), `loteId`, `costoBaseCOP`, `mostrarEnCatalogo`, `procedencia`,
`observacion`, `rendimientoEsperado`, `cantidadEstimada`, `nivelRareza`,
`calificacion`, `tipoEsmeralda`, `subtipoForm`, `tipoJoya`, `tecnicaJoya`,
`minerales`, `complementos`, `fotoUrl`, `certificadoUrl`, `formulaGema`,
`formulaJoya`, `rangoDescuento`, `precioEmbajadorCOP`, `precioConscienteCOP`.
(`precioPotencialCOP` was dropped from the UI in a recent commit — excluded.)

**Bugs fixed:** Inventario col J was mislabeled `Medidas` (now
`Medidas (valores)`); col S documented as "unused" in `admin-product-update.ts`
but labeled `preponderancia` in the create script — now consistently
`preponderancia`, and actually written for `target="fotosintesis"`.

## Layout now

- **Lotes → A:T** (14 original + 6 appended).
- **Inventario → A:AQ** (43 cols: legacy A:U with `preponderancia` at S, then
  the Fotosíntesis extension V→AQ).

Append-only: existing column positions never moved, so live data alignment and
the legacy public-catalog sheet are untouched.

## Single source of truth

`api/_lib/fotosintesis-inventory-columns.js` (+ `.d.ts`) defines the Inventario
column order, consumed by `admin-product-update.ts`, `convex/products.ts`
`pushToSheet`, `scripts/create-fotosintesis-sot.mjs`, and the migration script.
Lot columns stay aligned across `convex/_lib/columnMaps.ts#lots`,
`api/_lib/admin-table-config.ts#lots`, and the same scripts.

## Target-aware writes

`admin-product-update.ts` branches on `target`/`loteId`:

- `fotosintesis` → SOT spreadsheet, full A:AQ layout from the column map.
- `legacy` → treasure sheet, frozen A:U (read by `get-treasure-sheets` for the
  public catalog — must never change).

## Live migration

`node scripts/extend-fotosintesis-headers.mjs` (header-only, append-only,
idempotent; `--dry-run` to preview). Applied to the live SOT
`18w0DcP_4CO-le9_vt_UPGCHXAVXkQ5sugLF4r_o2bVM` on 2026-05-25: Inventario grid
widened 26→43 + headers, Lotes headers extended to T. Re-run reports no changes.

The runtime A:AQ write requires the grid to be ≥43 columns, so the migration
must run before the new `admin-product-update.ts` reaches production.
