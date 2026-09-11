# SOT-v6-Inventario — espejo en Sheets del inventario que vive en Convex

**Estado:** libro creado y verificado el 2026-09-10, **limpio**: sólo cabeceras y los catálogos `Listas`/`Calidades`. **La app no lo lee ni lo escribe todavía.**
**ID:** `1iYFuW0nhixIlXE9yXQNhbFr3BIYRQZMRNPtx1QO9mig` (ver `2026-09-10-sot-v6-inventario-id.txt`).
**Script:** `scripts/crear-sot-v6-inventario.ts` (tsx). Dry-run por defecto; `--apply` (nace limpio); `--apply --semilla-v3` (copia filas de SOT v3, no es la ruta normal); `--apply --continue` idempotente; `--vaciar`; `--catalogos`.

## Por qué existe

Convex es la fuente de verdad del inventario. La copia en Sheets existe por dos razones: es la
vista para humanos, y es la copia que no consume el tope de Database I/O del free tier de
Convex (983 MB / 1 GB medidos el 2026-09-05, 99,7 % lecturas). SOT v3 mezclaba ese espejo con
el padrón de acceso (`Asesores`, `new-users`), un modelo de precios con fórmulas humanas y dos
colas del riel viejo. v6 separa por dominio y audiencia: **inventario y usuarios nunca comparten
archivo** (permisos por archivo, radio de daño de un push, historial de versiones, tamaño).

## Nombres de la familia

| Libro | Rol | Quién escribe |
|---|---|---|
| `SOT-v3-Inventario-Fotosíntesis` | legado; aún leído y escrito por la app | app + 5 humanos |
| **`SOT-v6-Inventario`** | espejo de Convex (este) | Convex, vía la app |
| `TM-Padrón-Usuarios` (antes `SOT-v6-Usuarios`) | acceso | admins + app (bloque K–P) |
| `TM-App-Data` | invitaciones, vistas, cotizaciones | app |

Convención: `SOT-*` es el linaje del inventario; `TM-*` son los satélites de la app. Nombre =
familia + dominio (+ rol si no es obvio); la versión sólo cuando conviven generaciones.

## Pestañas y contratos

Fila 1 es el contrato con el código. **No se inventó ninguna cabecera**: el script las importa
de los módulos que usan los escritores.

| Pestaña | Cabeceras (fuente) | Escritor en prod | Filas al nacer |
|---|---|---|---|
| `Inventario` | `FOTO_INVENTARIO_HEADERS` (`api/_lib/fotosintesis-inventory-columns.js`, 59 col) | `convex/products.ts:1424` → `/api/admin-product-update` (localiza por **nombre**) | 0 |
| `Lotes` | `TABLE_CONFIGS.lots` (`api/_lib/admin-table-config.ts`, 21) | `lots._pushToSheet` → `/api/admin-table-update` (**posicional**) | 0 |
| `Sublotes` | `TABLE_CONFIGS.subLotes` (11) | ídem | 0 |
| `Ventas` | `TABLE_CONFIGS.sales` (15) | ídem | 0 |
| `Proveedores` | `TABLE_CONFIGS.providers` (8) | ídem | 0 |
| `Clientes` | `TABLE_CONFIGS.clients` (8) | ídem | 0 |
| `MovimientosAsesor` | `TABLE_CONFIGS.movimientosAsesor` (15) | `asesorMovements._pushToSheet` | 0 |
| `Listas` | copia de SOT v3 (29 col) | humanos, por acuerdo | 35 |
| `Calidades` | copia de SOT v3 (2) | humanos, por acuerdo | 19 |
| `Léeme` | diccionario, reglas, cableado | humanos | 22 filas |

**El libro nace vacío a propósito** (decisión de Kevin, 2026-09-10 18:35): las tablas del
espejo las llena Convex cuando la app apunte aquí; copiar SOT v3 habría hecho pasar por «vista
de Convex» filas que tal vez nunca llegaron a Convex. La primera corrida sí copió las 577 filas
(verificadas con 0 celdas distintas) y se vació a los 35 minutos con `--vaciar`; queda
`--semilla-v3` como ruta opcional para una vista inmediata, con alias `itemIds`→`itemIdsJoined`
en Sublotes (v3 tiene la cabecera vieja y otro orden respecto al escritor posicional).

Lo que **no** se mudó, a propósito: `Modelo-Precios` (323 filas de fórmulas humanas),
`Asesores` y `new-users` (padrón → `TM-Padrón-Usuarios`), `_Sync` y `_SyncQueue` (colas del
riel viejo). El riel v4 (`convex/espejo.ts`: Lotes de 46 col, Casillas, Movimientos, Tablero)
escribe en su propio libro «SOT v4 · Espejo (PRUEBAS)» vía `ESPEJO_SPREADSHEET_ID` y sólo
desde `flexible-wolverine-803`; su `Lotes` tiene otro contrato y no se mezcló.

## Diseño aplicado

- Una tabla por pestaña, fila 1 congelada (+ 3 columnas en Inventario, 1 en el resto), grid
  con las columnas exactas del contrato (sin columnas sobrantes: un append abierto no tiene
  dónde anclarse), bandas alternas, filtro básico, rango con nombre por tabla.
- **Validación con aviso, no estricta**: 15 columnas de Inventario y las de estado/forma de
  pago/tipo en Lotes, Ventas, Proveedores y Clientes validan contra `Listas`. Un espejo no
  puede rechazar lo que Convex manda; un valor histórico fuera de catálogo se marca, no se
  corrige aquí.
- Formato condicional en Inventario: `Item` duplicado (marrón negrita), `ESTADO` fuera de
  `Listas` (marrón; vía `INDIRECT`, el formato condicional no acepta referencias a otra
  pestaña), `VENDIDA` (gris cursiva). Vistas «Disponibles», «Vendidas», «En catálogo».
- Formatos numéricos por cabecera (COP `#,##0`, quilates `0.00`, fecha `yyyy-mm-dd`, USD
  `#,##0.00`). Las dos columnas de relleno del contrato (`(sin uso)` y la vacía) quedan
  **ocultas, no borradas**: el escritor por nombre las espera.
- Protección con aviso en todas las pestañas (texto: «espejo de Convex… editar aquí no cambia
  nada»). Paleta Quiet Emerald (`scripts/_lib/sheets-estilo.mjs`, compartido con el padrón).
- Compartido sólo con el dueño y la service account. Los humanos: decisión de Kevin
  (`Clientes` y `Proveedores` traen teléfonos y correos).

## Cableado (no hecho)

Hoy `SPREADSHEET_ID` y `FOTOSINTESIS_SPREADSHEET_ID` apuntan al **mismo** libro (SOT v3),
verificado en `api/_lib/constants.js` y `api/get-treasure-sheets.ts:253`. Repunte propuesto:

1. `FOTOSINTESIS_SPREADSHEET_ID` → v6: mueve las escrituras de `admin-table-update` y
   `admin-product-update` (rama `isFoto`) y las lecturas de `get-table-rows` /
   `get-inventory-rows`. Antes: un push de prueba y leer la fila por cabecera nombrada.
2. `SPREADSHEET_ID` sirve además `Asesores`, `new-users`, `Clientes` y `get-treasure-sheets`:
   sólo cambia **después** del Stage 1 del padrón (`USUARIOS_SPREADSHEET_ID`).
3. La app pública sigue sirviendo del caché de Vercel (`api/_lib/catalogCache.ts`); leer este
   libro desde la app es una decisión aparte (cuotas por minuto de la API de Sheets).

Rollback: borrar el libro; nada apunta a él.
