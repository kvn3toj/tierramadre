# Fotosíntesis v2 — Plan de Slices Verticales

> **Fecha:** 2026-05-21
> **Autor:** Reordenamiento conversacional con Kevin
> **Reemplaza:** las fases F1–F5 del plan original `2026-05-08-fotosintesis-admin-v2-IMPLEMENTATION-PROMPT.md`
> **NO reemplaza:** el PRD `2026-05-08-fotosintesis-admin-v2-PRD.md` — los requisitos, campos y reglas de negocio (BR-1..BR-8) siguen siendo la fuente de verdad.
> **Pre-requisito ya cumplido:** F0 del plan original (schema Convex + mutaciones con reglas + push a Sheets) — backend al ~95%.

---

## Por qué reordenar

El plan original avanza módulo por módulo: termina F1 (Proveedor) completamente antes de tocar F2 (Compra), y así. Eso tiene una virtud — cada módulo sale pulido — y un defecto: **Maritza no ve el ciclo completo hasta el día ~22**.

El ciclo de Tierra Mädre es lineal por naturaleza: entra un proveedor → entra una compra → se nombran los ítems → se venden. Si el plan también es lineal, el aprendizaje real (qué fricción tiene el flujo end-to-end, qué confunde a Maritza, qué le falta al carnet) llega al final, cuando ya es caro mover cosas.

**Inversión propuesta:** entregar primero un *ciclo feliz mínimo* que toque las 4 piezas — feo pero funcional — y después iterar en profundidad sobre lo que Maritza pruebe primero.

---

## Lo que cambia y lo que no cambia

**Cambia:** el orden de implementación de la UI. Lo que el plan original entregaba como F1→F4 ahora va como Slice 1 (mínimo de las 4 piezas) → Slices 2–4 (cada módulo a profundidad).

**No cambia:**
- El PRD sigue siendo la spec funcional. Cada campo, cada validación, cada regla BR.
- Las convenciones del plan original (Convex first, push a Sheets, tokens `foto`, MUI v6, anti-blinking).
- El backend ya construido en F0. Ningún slice modifica las mutaciones existentes salvo extensiones puntuales.
- La definición de "hecho" global: 0 lotes con preponderancia ≠ 100%, 0 ítems huérfanos, métricas leading reportando.

---

## Vista de los slices

| Slice | Nombre | Esfuerzo | Maritza puede… |
|---|---|---|---|
| 0 | Cleanup de F0 | 1 día | (interna) backend ya en pie |
| 1 | **Ciclo feliz mínimo** | 5–6 días | registrar B-001 punta a punta y exportar un carnet |
| 2 | Inventario completo | 3 días | crear joyas e insumos, no solo gemas |
| 3 | Ventas completas | 3–4 días | vender a cliente final, generar certificado |
| 4 | Proveedor + Compra ricos | 2 días | buscar proveedores, ver historial, adjuntar facturas |
| 5 | Salud + calidad | 3 días | confiar en el sistema (telemetría, tests, health) |
| **Total** | | **17–19 días** | |

Total comparable al plan original (16–19 días) pero el primer ciclo end-to-end llega en el **día 7**, no en el día 22.

---

## Slice 0 · Cleanup de F0 (1 día)

Antes de tocar UI, cerrar lo que quedó del backend.

- Confirmar que `convex/crons.ts` ejecuta `pullFromSheet` también sobre `providers`, `lots`, `clients`, `sales`. Si no, extender.
- Crear las pestañas `Proveedores`, `Lotes`, `Clientes`, `Ventas` en el Drive compartido (`GOOGLE_SHARED_DRIVE_ID`) con los encabezados del `admin-table-config`.
- Smoke test: `providers.create` en Convex Studio → aparece en la hoja `Proveedores` en menos de 1 minuto.
- **Decisión a cerrar con Maritza:** Q-2 del PRD — ¿numeración `B-{NNN}` continua global o reiniciada por año (`B-2026-001`)? Afecta `peekNextLoteId`.
- **Decisión a iniciar con legal:** Q-6 del PRD — plantilla del certificado de origen. No bloquea el Slice 1, sí bloquea el Slice 3.

**Hecho cuando:** smoke test pasa y Q-2 está resuelta.

---

## Slice 1 · Ciclo feliz mínimo (5–6 días) · ★ el slice transversal

**Objetivo:** Maritza registra el lote `B-001` de Mauro de principio a fin, con 3 gemas, lo vende a un embajador, y exporta el carnet. Todo en versión mínima — sin búsquedas avanzadas, sin upload de factura, sin certificado de origen, sin manejo rico de errores.

**Restricciones del slice (para mantener el alcance):**
- Solo tipo `gema` en el wizard (joyas/insumos en Slice 2).
- Solo proveedor nuevo desde formulario (autocomplete y búsqueda en Slice 4).
- Solo forma de pago `contado/efectivo` y `esmereogénesis` (crédito en Slice 4).
- Solo venta a `embajador` (cliente final en Slice 3).
- Carnet PDF básico sin certificado de origen (certificado en Slice 3).
- Foto opcional, no requerida (Slice 2 la hace requerida).

**Archivos a crear:**

```
src/pages/admin/Fotosintesis/
├── FotosintesisShell.tsx          NEW — layout + 4 tabs
├── modules/
│   ├── ProveedorModule.tsx        NEW — form + lista plana
│   ├── CompraModule.tsx           NEW — form + lista con badge "abierto X/N"
│   ├── InventarioModule.tsx       NEW — wizard mínimo (1 paso por ítem)
│   └── VentasModule.tsx           NEW — form embajador + carnet básico
├── hooks/
│   ├── useNextLoteId.ts           NEW — wrapper sobre lots.peekNextLoteId
│   ├── usePreponderanciaTotal.ts  NEW — wrapper sobre lotItems.sumPreponderancia
│   └── useLotItemCount.ts         NEW
└── exportCarnet.ts                NEW — jsPDF básico, sin certificado
```

**Modificaciones:**
- `src/App.tsx` — registrar ruta `/admin/fotosintesis` con guard de admin.
- Menú admin existente — link a "Fotosíntesis" (la consulta queda en `/admin/products`, no se toca).

**Hecho cuando:**
- Maritza completa de cero el ciclo: crea Mauro → crea lote B-001 (40 ct, $500k, 3 unidades, contado/efectivo) → crea 3 gemas con preponderancia 50/30/20 → cierra lote → vende ítem 001 a un embajador del directorio → exporta carnet PDF.
- El lote queda en estado `cerrado` con `syncStatus: "synced"` en las hojas.
- El ítem 001 queda `VENDIDA` en `productInventory` y en la hoja `Inventario`.
- La venta queda con `saleId: "V-0001"` en la hoja `Ventas`.

---

## Slice 2 · Inventario completo (3 días)

Engordar el wizard a su forma definitiva del PRD §6.4.

- Wizard de 4 pasos formales (Tipo y nombre → Datos según tipo → Foto y observación → Resumen del lote).
- Tipo `joya` con `JoyaFields`: tipo de joya, peso en gramos, técnica, 5 slots de material base + botón "+ agregar material" hasta 10. Si el material no está en la tabla `materials`, creación inline.
- Tipo `insumo` con `InsumoFields`: cantidad, costo unitario, sin preponderancia ni precio público.
- Foto requerida (mínimo 1, recomendado 3).
- Pantalla de resumen al cerrar el ítem N de N con el formato del §6.4 paso 4.
- Botón "Publicar lote ahora" en el resumen — flip masivo de `mostrarEnCatalogo` a `true`.

**Hecho cuando:** Maritza crea un lote mixto (1 gema + 2 joyas con materiales custom) y otro lote de solo insumos (envases, cajitas). Ambos cierran y sincronizan.

---

## Slice 3 · Ventas completas (3–4 días) · bloqueado por Q-6

- Venta a `cliente final` (formulario completo: nombre, NIT/cédula, dirección, teléfono, email).
- Forma de pago `crédito` con vencimiento y cuotas; `esmereogénesis` con plazo y cuotas formal.
- Certificado de origen — plantilla legal (depende Q-6 cerrada). Generación con jsPDF, subida a Drive en `ventas/{año}/{mes}/{itemId}-{slug}.pdf`, URL guardada en `sales.certificadoUrl`.
- Email opcional al comprador con carnet + certificado adjuntos vía `send-email` API existente.
- Cancelar venta → el ítem vuelve automáticamente a `DISPONIBLE` (ya hay lógica server-side parcial, falta UI).

**Hecho cuando:** Maritza vende un ítem a Ana Pérez (cliente final, crédito 6 cuotas), genera carnet + certificado, ambos llegan al email de Ana, y el ítem queda `VENDIDA` en Convex y Sheets.

---

## Slice 4 · Proveedor + Compra ricos (2 días)

Lo que el slice 1 dejó "feo pero funcional" se pule.

- Autocomplete de proveedor por nombre y NIT (debounce 200ms).
- Historial de compras por proveedor (lista de lotes ordenada por fecha desc al abrir la ficha).
- Upload de factura (PDF o foto) al lote, sube a Drive, URL en `lots.urlFactura`.
- Badge de estado del lote en la lista: `🟡 abierto · X/N ítems` | `✓ cerrado` | `📢 publicado`.
- Crédito habilitado en compras con fecha de vencimiento y número de cuotas.
- Edición de proveedor en drawer (reusa el patrón `EditDrawer` actual).

**Hecho cuando:** Maritza encuentra a Mauro escribiendo "mau" en el autocomplete, abre su ficha, ve los 3 lotes que ya le compramos, y adjunta una factura PDF al lote más reciente.

---

## Slice 5 · Salud + calidad (3 días)

Lo que evita que el sistema se degrade en silencio.

- Telemetría vía `TrackingContext` existente: `fotosintesis.lot.created`, `.lot.closed`, `.lot.published`, `.item.created`, `.sale.created`, `.sale.cancelled`.
- Health endpoint extendido en `api/health.js`: `{ lotsOpenOver7d, lotsWithBadPreponderancia, syncErrors, salesWithoutCarnet }`.
- Dashboard pequeño en `/admin/fotosintesis/health` consumiendo el endpoint.
- E2E Playwright: 4 specs nuevos en `e2e/fotosintesis-{proveedor,compra,inventario,ventas}.spec.ts`.
- Unit tests para validadores frontend (preponderancia, conteo de unidades, crédito requiere fecha).

**Hecho cuando:** `npm run test:e2e` pasa los 4 specs, el health endpoint responde con counters reales, y los eventos llegan al destino de tracking.

---

## Reglas de operación durante la implementación

- **Un slice = una rama** (`feature/fotosintesis-slice-{N}-{nombre}`). PRs cortas, una por slice, mergeadas a `main` solo cuando el "hecho cuando" pasa.
- **Demo con Maritza al final de cada slice** — 15 min, captura de fricciones que alimentan el siguiente slice.
- **`/admin/products` no se toca** — coexiste con `/admin/fotosintesis` (consulta vs captura, según decisión del PRD §15).
- **Backend solo se extiende, no se reescribe.** Si un slice descubre que falta una mutación, se agrega; las existentes están protegidas por BR-1..BR-7.
- **Sin nuevas dependencias.** Stack fijo del PRD.
- **`VITE_TEST_MODE=1`** para los e2e (alias-ea `lib/convex-safe`).

---

## Riesgos del reordenamiento

| Riesgo | Mitigación |
|---|---|
| Slice 1 entrega algo "feo" y Maritza pierde confianza | Demo con framing claro: "esto es la prueba del ciclo, no el producto final" |
| El alcance del Slice 1 se infla y deja de ser MVP | Las restricciones del slice (solo gema, solo embajador, etc.) son no negociables — se mueven a Slice 2/3/4 |
| Q-6 (certificado legal) no se cierra y bloquea Slice 3 | Iniciar conversación con legal en Slice 0, no en Slice 3 |
| Hallazgos del Slice 1 obligan a rehacer Slice 2 | Es la idea: el costo de rehacer un slice mínimo es menor que el costo de descubrir el problema en producción |

---

## Métricas de éxito del reordenamiento (no las del PRD, las de este plan)

- **Día 7:** Maritza completa el ciclo end-to-end con un lote real.
- **Día 10:** se identifican ≥ 3 fricciones del Slice 1 que orientan Slices 2–4.
- **Día 19:** sistema cumple la "Definition of Done global" del plan original (0 lotes con preponderancia mala, 0 ítems huérfanos, métricas leading reportando).

---

*Hecho con amor verde esmeralda en Colombia 💚*
