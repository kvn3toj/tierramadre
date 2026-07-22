# Centralización de spreadsheets · 3 libros → 2

**Fecha:** 2026-07-21 · Retira **inventario#3 (legacy)** y **Fotosíntesis SOT v2**.

## Antes → Después

| Antes (3 libros)                                                  | Después (2 libros)                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `1mghR…` **inventario#3** (legacy: catálogo + Asesores + pricing) | ❌ retirar                                                        |
| `18w0…` **SOT v2**                                                | ❌ retirar                                                        |
| `1DuOh…` **TM-Invitations** (logs de app)                         | → migrado                                                         |
| `1Nl2g…` **TM-Feedback**                                          | → migrado                                                         |
|                                                                   | ✅ **SOT v3** `1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U`      |
|                                                                   | ✅ **TM-App-Data** `1_TEWBTK-NJjmTlbRE19kC2jBUKpdt-bnVHrykIu9u4A` |

## Qué quedó en cada libro

**SOT v3** (inventario + lo directamente relacionado) — pestañas nuevas:

- **Asesores** (35 filas) — login/OAuth + dropdown de embajadores.
- **Modelo-Precios** (324 filas) — ex `CUALIFICACION -PRECIO`, el modelo de multiplicador/precio.
- (+ las 9 existentes: Inventario, Lotes, Sublotes, Proveedores, Clientes, Ventas, Calidades, Listas, Léeme)

**TM-App-Data** (companion, logs operativos) — migrado de APP + FEEDBACK:
`ProductViews` (3794) · `Invitations` (297) · `CotizacionProducts` (97) ·
`CotizacionesAsesores` (34) · `CotizacionReports` (18) · `SolicitudesProducto` (7) ·
`SolicitudesCotizacion` (5) · `CotizacionesProveedor` (4) · `Feedback` (9) · `UserPreferences`.

## Cambios de código (ya hechos, en la rama)

1. **`api/_lib/constants.js`** — TODOS los IDs son ahora **env-first** (antes
   `SPREADSHEET_ID` estaba hardcodeado). Repuntar es solo setear envs, sin tocar código.
2. **`api/get-treasure-sheets.ts`** — **adaptador de catálogo**: el SOT v3 retiró
   `Precio COP`, así que el precio público ahora mapea a **`precioEmbajadorCOP`**
   (tarifa embajador). Orden: `precio cop` (legacy) → `precioEmbajadorCOP` (SOT) → posicional.
3. **Pricing tab** renombrada `CUALIFICACION -PRECIO` → **`Modelo-Precios`** (código + SHEETS).

## Repunte (setear estas envs en Vercel — completa el corte)

```
SPREADSHEET_ID=1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U          # SOT v3 (catálogo + Asesores + Modelo-Precios)
FOTOSINTESIS_SPREADSHEET_ID=1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U   # SOT v3 (inventario admin)
APP_SPREADSHEET_ID=1_TEWBTK-NJjmTlbRE19kC2jBUKpdt-bnVHrykIu9u4A       # companion TM-App-Data
FEEDBACK_SPREADSHEET_ID=1_TEWBTK-NJjmTlbRE19kC2jBUKpdt-bnVHrykIu9u4A  # companion TM-App-Data
```

Con eso, sin más cambios de código:

- **Catálogo público** (`get-treasure-sheets`) lee el Inventario del SOT v3 (adaptador de precio activo).
- **Login / Asesores** (`get-asesores`, `validate`) encuentran la pestaña `Asesores` del SOT v3.
- **Modelo de precios** (`get-treasure-sheets` pricing) lee `Modelo-Precios` del SOT v3.
- **Logs** (views, feedback, invitaciones, cotizaciones, prefs) escriben en el companion.

## Verificación antes de retirar la legacy

1. Setear las envs en un **preview de Vercel** primero.
2. Abrir el catálogo público → confirmar que cargan ítems **con precio** (= precioEmbajadorCOP).
3. Login como asesor/admin → confirmar que valida contra `Asesores` del SOT v3.
4. Crear una cotización de prueba → confirmar que escribe en TM-App-Data.
5. Si algo falla, revertir es quitar la env (vuelve al fallback legacy). **Cero riesgo de rollback.**
6. Cuando esté verde en producción → archivar (no borrar aún) los 3 libros viejos.

## Mejoras aplicadas / recomendadas a esas funciones

- ✅ **IDs configurables** — antes un ID estaba hardcodeado; ahora todo por env (staging/preview triviales).
- ✅ **Catálogo desacoplado del esquema legacy** — mapea por nombre de header + adaptador de precio, no por posición frágil.
- ⏭️ **Recomendado:** `UserPreferences` (1 fila hoy) y `ProductViews` (3794) podrían vivir en Convex
  (`productViews` ya existe) en vez de la hoja — menos I/O de Sheets. Dejar en el companion por ahora.
- ⏭️ **Recomendado:** unificar `Invitations`/`ProductViews` hoja↔Convex (hoy hay ambas) — elegir una
  fuente para evitar doble escritura.

---

## Verificación de mapeo para la migración (2026-07-21)

Re-analicé el SOT v3 simulando el adaptador del catálogo. Campos que la app muestra
(item, nombre, peso, color, calidad, talla, medidas, categoría, ubicación, estado,
QR, colección, caja) → **mapean bien por nombre de header** (0 desalineados).

⚠️ **Gap detectado y corregido — el PRECIO.** El SOT v3 solo tenía
`precioEmbajadorCOP` en 101/513 ítems → el catálogo habría mostrado 412 ítems SIN
precio. **Backfill aplicado** en el SOT v3 (col M), coalesciendo:
`precioEmbajadorCOP` (101, preservado) → **legacy `Precio COP`** (306) → Modelo-Precios
PFU → **costo × 2.6** (45). Resultado: **453/513 con precio**; los ~60 restantes son
insumos/topitos/componentes sin precio de venta unitario (correcto).

> Nota semántica: para los 352 ítems backfilleados, `precioEmbajadorCOP` pasa a ser
> el "precio público del catálogo" (no una tarifa de embajador fijada a mano). Es
> consistente con el diseño ("el precio público es la tarifa embajador").

## Respaldos / versiones

Carpeta **TM-Backups** (junto al SOT v3): copias fechadas de ambos libros.
- `SOT-v3 · Backup 2026-07-21`
- `TM-App-Data · Backup 2026-07-21`

Recomendado: correr una copia fechada antes de cada cambio grande (o un backup
programado en Convex para los datos que vivan ahí).
