# Arquitectura de fotos · Tierra Madre

**Fecha:** 2026-07-21 · **Estado:** vigente tras la unificación (Opción A)

Dónde vive cada foto/documento en Google Drive, cómo se sirve, y cómo se crean
las carpetas. Todo cuelga de la carpeta raíz **"products"** (el
`GOOGLE_SHARED_DRIVE_ID` en runtime resuelve a esa carpeta; `getProductsFolderId`
cae de vuelta a ella — `api/_lib/drive-helpers.js:101`).

```
products/                              ← raíz (sharedDriveId en runtime)
├── {item} - {nombre}/                 ← 📸 FOTOS DE ÍTEM (galería + hero)  ★ canónico
│   ├── hero.jpg  detalle-1.jpg …
├── fotosintesis/                      ← captura histórica + heros de lote/sublote
│   └── {loteId}/
│       ├── lote-hero/                 ← 🏷️ hero del LOTE  → lots.fotoLoteUrl
│       ├── {item}/                    ← fotos de ítem (ubicación ANTERIOR, legacy)
│       └── {item}-cert/               ← 📄 CERTIFICADO del ítem → certificadoUrl
├── cotizaciones/…                     ← PDFs de cotización
├── ventas/{YYYY}/{MM}/                ← carnets/documentos de venta
└── movimientos-asesor/…               ← comprobantes kardex
```

## 1. Fotos de ítem — `products/{item} - {nombre}/` ★

**Ubicación canónica única.** De aquí sirve la app:

- **Galería multi-imagen**: `api/get-drive-images` → `getProductFolderById` busca
  `{item} - ` en `products/`.
- **Miniaturas del catálogo**: `api/get-batch-thumbnails` escanea `products/`.
- **Hero**: la primera imagen (alfabética) o el `fotoUrl` guardado.

**Subida (unificado 2026-07-21):** `uploadItemImages(files, itemId, nombre)`
(`utils/uploadItemMedia.ts`) → `subPath = "{item} - {nombre}"` → `/api/media-upload`
crea la carpeta si no existe y devuelve la URL, que se guarda en
`productInventory.fotoUrl`. Callers: **CapturaLotePage** (captura) y
**EditItemDrawer** (edición).

> El nombre de carpeta se limpia con la MISMA regla que
> `api/create-product-folders.js#cleanName` (`{item} - {nombre limpio}`), así la
> subida y el cron de sincronización convergen en UNA carpeta (sin duplicados).

**Fotos legacy:** las subidas antes del 2026-07-21 viven en
`products/fotosintesis/{lote}/{item}/`. Siguen funcionando por su `fotoUrl`
guardado (link directo). Solo las nuevas van a la ubicación unificada.

## 2. Certificados — `products/fotosintesis/{lote}/{item}-cert/`

Un PDF por ítem. `uploadFotosintesisCertificado(file, loteId, itemId)` →
`certificadoUrl`. No se movió (documento aparte de las fotos).

## 3. Lotes — `products/fotosintesis/{lote}/lote-hero/`

Un **hero único** por lote (no galería). `LoteResumenPage` sube vía
`uploadFotosintesisImages` → `lots.fotoLoteUrl`. Se usa para la card agrupada
"vender lote completo" cuando `lots.mostrarComoLote = true` y `estado = publicado`.

## 4. Sublotes — `products/fotosintesis/{lote}/…/`

Un **hero único** por sublote. `SubLoteDrawer` sube vía
`uploadFotosintesisImages` → `subLotes.fotoUrl`. Card agrupada cuando
`subLotes.mostrarComoLote = true` y `estado = activa`.

> Lotes y sublotes **no necesitan** carpeta `products/{item}/` — no son ítems,
> solo tienen un hero para su card. Ver `2026-07-21-sot-limpia-fotosintesis.md`
> §4 para el modelo lote→sublote→ítem.

## 5. Creación automática de carpetas

| Momento                     | Qué crea                              | Cómo                                                                 |
| --------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| **Al subir 1ª foto** (lazy) | `products/{item} - {nombre}/`         | `media-upload` hace getOrCreate del subPath                          |
| **Cron de sync** (respaldo) | faltantes + renombra las desalineadas | `create-product-folders?sync=auto` (lee **legacy + SOT**, ver abajo) |

**Fix de raíz (2026-07-21):** `api/create-product-folders.js` ahora lee el SOT
Fotosíntesis además de la hoja legacy (unión por ítem, el SOT manda el nombre).
Antes solo leía la hoja legacy, por eso los ítems 323+ nunca obtenían carpeta.

## 6. Columnas de foto en el SOT

| Columna (Inventario)    | Contenido                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| `fotoUrl` (AL)          | link directo al hero del ítem                                     |
| `certificadoUrl` (AM)   | link al PDF del certificado                                       |
| `Producto (URL)`        | `https://tierramadre.app/product/{item}`                          |
| `Carpeta fotos (Drive)` | `https://drive.google.com/drive/folders/{id}` — para editar fotos |
| `QR` (R)                | `https://tierramadre.app/p/{item}` (payload de la etiqueta)       |

## 7. Reglas para no duplicar / desalinear

1. **Una sola ubicación de fotos de ítem**: `products/{item} - {nombre}/`.
2. **`cleanFolderName` == `cleanName`** (subida == cron) — no tocar una sin la otra.
3. **Lote/sublote = hero único**, nunca carpeta per-item.
4. **Certificados aparte** (PDF), no en la carpeta de fotos.
5. Al renombrar un ítem, el cron `create-product-folders` renombra la carpeta
   para mantener `{item} - {nombre}` alineado con el SOT.
