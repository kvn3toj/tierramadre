# FOTOSÍNTESIS Form — Gap Matrix

> Generated: 2026-05-23  
> Form ID: `1WA_FbTLGK2HHTwekEW4NvNf6veN_yQK8l64PeTLBcbA`  
> Canonical schema: [`2026-05-23-fotosintesis-form-schema.json`](./2026-05-23-fotosintesis-form-schema.json)

Estados: ✅ implementado · ⚠ parcial · ❌ faltante (antes del sprint) · 🔧 en implementación

| Sección | Campo form | Estado | Notas implementación |
| --- | --- | --- | --- |
| 1 | Nombre operador | ⚠ | AuthContext; persistir en `lots.operadorNombre` |
| 1 | Rol | ⚠ | `lots.operadorRol` |
| 1 | Bóveda BOGOTÁ/CALI/SECRETA | 🔧 | `Sede` B/C/S; prefijo S-### |
| 2 | Proveedor completo | ✅ | ProveedorNuevoDrawer + EntityPicker |
| 3 | Lote ID auto | ✅ | sequences B-/C-/S- |
| 3 | Renombre lote | 🔧 | `lots.renombreLote` |
| 3 | Peso lote | 🔧 | `lots.pesoTotalQuilates` en intro |
| 3 | Costo / Unidades | ✅ | NewLotIntro |
| 3 | Tratamiento / Mina | 🔧 | `lots.tratamiento`, `lots.mina` |
| 3 | Observaciones | ⚠ | `lots.notas` |
| 4 | Forma pago compra | ✅ | Select único (no checkboxes duales) |
| 5 | Tipos ítem (9) | 🔧 | Mapeo form → gema/bruto/joya/lote + subtipoForm |
| 5 | Preponderancia | ✅ | % suma 100% (decisión: no escala 1–10) |
| 6 | Esmeraldas campos | 🔧 | GemaFields ampliado + wire-up |
| 6 | Calidad labels form | 🔧 | `vocabularies.CALIDADES` + alias legacy |
| 7 | Joyas | 🔧 | `JoyaFields.tsx` |
| 8 | Foto / Certificado | 🔧 | Drive upload post-create |
| 9 | Triple pricing + fórmulas | 🔧 | LoteResumenPage + campos productInventory |
| 10 | Venta cliente final | ⚠ | ClienteFinalForm existe |
| 10 | Canje / Crypto | 🔧 | `formaPago.canje`, `metodoContado.crypto` |
| Cierre | LoteResumenPage | 🔧 | BR-2/BR-3 + close + publish |
| Sync | Inventario SOT | 🔧 | Routing dual cuando `loteId` presente |
