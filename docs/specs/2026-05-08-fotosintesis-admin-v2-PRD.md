# PRD — Fotosíntesis Admin v2 · Captura de Lotes, Productos y Ventas

> **Fecha:** 2026-05-08
> **Autor:** Kevin (Tierra Madre Studio)
> **Tipo:** Product Requirements Document
> **Estado:** Draft v1 (listo para revisión con Maritza, Mauro y equipo administrativo)
> **Reemplaza/Extiende:** `docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md` (visión "ledger + bandeja"). Este PRD pivota Fotosíntesis hacia un **workflow de captura administrativa** organizado en 4 módulos secuenciales — Proveedor → Compra → Inventario → Ventas — manteniendo el ledger/bandeja como vista paralela de consulta.
> **Branch sugerida:** `feature/fotosintesis-v2-capture`

---

## 1. Resumen ejecutivo

Fotosíntesis hoy es un panel de inspección y edición del inventario ya cargado en Google Sheets. Para hacerlo crecer hacia el corazón administrativo del negocio, lo convertimos en el **único punto de entrada** para tres flujos que hoy se hacen a mano (o a medias) en la hoja:

1. **Registrar un proveedor** (Mauro, vendedor de cajitas, vendedor de carpetas, etc.).
2. **Registrar la compra de un lote** con número consecutivo automático (B-001, B-002…), peso, costo, unidades y forma de pago.
3. **Crear los ítems individuales** del lote (gemas, joyas, insumos) con preponderancia validada al 100% del lote, datos completos para calificación y precio, y conexión a Convex + Sheets.
4. **Registrar ventas** a embajador o cliente final con auto-carga de datos y exportación tipo "carnet" + certificado de origen.

El espíritu es el de la "entrada manual" que ya existe en cotizaciones, pero diseñada **para los administrativos** (Maritza et al.) con guard rails que impidan información perdida o inconsistente.

---

## 2. Problema

Hoy se pierde información crítica del negocio en cada paso de la cadena:

- **No sabemos quién nos vendió qué.** Lotes y proveedores viven en cabezas y WhatsApp; cuando llega un lote no queda registro de razón social, NIT, dirección o forma de pago. Si Maritza no estaba en la oficina ese día, la trazabilidad se rompe.
- **No hay número de lote consecutivo.** Cada lote se nombra a ojo ("lote 170", "lote 5"), lo que rompe consecutividad contable y dificulta auditar márgenes lote a lote.
- **No queda registrado el costo unitario real de cada gema** dentro de un lote (preponderancia). Hoy se promedia o se asume; eso destruye precisión de margen.
- **Los productos nuevos solo entran al catálogo editando la hoja a mano**, sin validar tipo, foto, observaciones, ni que el conteo de unidades del lote cuadre con la cantidad de ítems creados.
- **Las ventas no se registran en el sistema** — se hacen por WhatsApp o teléfono y luego se intenta cuadrar con la hoja. La parte contable se vuelve un dolor mensual.

**Costo de no resolverlo:** 30–60 min al día reconciliando información, riesgo contable real (preponderancia mal asignada → impuestos mal calculados), y la imposibilidad de generar un certificado de origen automático cuando el cliente lo pide. La amiga de la usuaria viene mañana y necesita esto **redondito**.

---

## 3. Objetivos (Goals)

1. **Cero pérdida de información en la cadena proveedor → lote → ítem → venta.** Cada lote nuevo queda con proveedor, fecha, costo, forma de pago y desglose por ítem en menos de 10 minutos.
2. **Numeración automática y consecutiva** de lotes (`B-001`, `B-002` …) y de ítems heredando el contexto del lote — eliminamos la posibilidad de duplicar o saltar números.
3. **Validación dura de preponderancia** — la suma de % de costo por ítem dentro de un lote debe ser exactamente 100%; el sistema no permite cerrar el lote hasta cumplirlo.
4. **Validación dura de unidades** — si el lote declara N unidades, el sistema obliga a crear exactamente N ítems antes de cerrar.
5. **Exportar venta tipo "carnet"** (foto + datos clave + certificado de origen) en un click, listo para enviar al cliente o al contador.
6. **Mantener Google Sheets como "fuente de verdad" contable** — toda escritura en Convex se sincroniza con la hoja correspondiente vía `pushToSheet` (nuevo modo `append` ya existente para `productInventory`; extender a `providers`, `lots`, `sales`).

### Métricas de éxito (ver §11)

- **Adopción:** 100% de los lotes que entren después del lanzamiento se registran por Fotosíntesis (no por edición manual de Sheets). Medimos en `lots._creationTime`.
- **Activación:** Maritza completa su primer lote real B-001 sin asistencia técnica en la primera semana.
- **Calidad:** 0 lotes con preponderancia ≠ 100% (validación) y 0 lotes con `unidadesDeclaradas ≠ count(lotItems)`.
- **Tiempo:** registrar un lote nuevo de 3 ítems toma ≤ 8 minutos.

---

## 4. No-Objetivos (Out of Scope para v1)

| No-objetivo | Razón |
|---|---|
| Pagos online / pasarela | Fotosíntesis solo registra la forma de pago acordada; el dinero se mueve fuera. |
| Conciliación bancaria automática | Es una integración con bancos colombianos que merece su propio proyecto. |
| Generación de factura electrónica DIAN | Requiere integración con proveedor tecnológico (Siigo, Alegra, etc.). El "carnet" + certificado de origen es la salida v1. |
| App móvil nativa | El admin se usa en escritorio + tablet. PWA responsive es suficiente. |
| Multi-moneda en compras | Lotes vienen en COP. (Las ventas ya tienen multiplicador x2/x3/x4 vía `CurrencyContext`.) |
| Migración histórica de lotes anteriores | Lotes pre-Fotosíntesis quedan en la hoja como están; el nuevo sistema arranca desde B-001. |
| Reglas de comisión por embajador | Existe en otra parte del producto; Fotosíntesis solo marca la venta como "ASESOR" + identifica al embajador. |
| Heatmap color × calidad y vista de patrones (Bandeja) | Ya existe en la versión actual y se preserva, pero no entra en alcance de captura v2. |

---

## 5. Usuarios y personas

### 5.1 Maritza (Administrativa) — usuaria principal

- **Contexto:** Recibe cajas físicas en la oficina, llamadas de Mauro, mensajes de proveedores secundarios.
- **Necesita:** Capturar rápido y sin equivocarse — un teclado, scroll mínimo, validación clara cuando algo falta.
- **Frustración hoy:** "Si no anoto algo en el momento, se pierde."
- **Dispositivo:** Laptop de escritorio + tablet ocasional.

### 5.2 Kevin / Equipo de producto

- **Contexto:** Necesita ver el inventario completo, márgenes, márgenes históricos por proveedor, y abrir certificados de origen.
- **Necesita:** Vista de consulta + auditoría sobre lo que captura Maritza.
- **Dispositivo:** Laptop, ocasionalmente celular.

### 5.3 Mauro / Otros proveedores (referencia indirecta)

- **No usan Fotosíntesis.** Pero sus datos viven aquí.
- Implicación: el formulario de proveedor pide razón social + NIT + dirección + contacto — campos contables formales.

---

## 6. Arquitectura funcional — los 4 módulos

Fotosíntesis v2 es una **shell de captura** con un menú principal (sidebar tipo hamburguesa) que abre cada módulo. La narrativa sugerida por la conversación es: cuando Maritza recibe algo nuevo va siempre al **mismo punto de entrada**, y Fotosíntesis decide el orden lógico — pero los módulos también son independientes para casos como "Mauro me llamó a actualizar su NIT" o "vamos a registrar solo una venta".

### 6.1 Diagrama de flujo

```
                   ┌───────────────────────┐
                   │  Fotosíntesis Home    │
                   │  ┌─ Proveedor         │
                   │  ├─ Compra (Lote)     │
                   │  ├─ Inventario        │
                   │  └─ Ventas            │
                   └──────────┬────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐           ┌─────────┐           ┌─────────┐
   │PROVEEDOR│ ── crea ─▶│  COMPRA │ ── crea ─▶│INVENTARIO│
   └─────────┘           │  (LOTE) │           │ (N ítems)│
                         └─────────┘           └────┬────┘
                                                    │
                                                    ▼
                                              ┌──────────┐
                                              │  VENTAS  │
                                              │ (carnet) │
                                              └──────────┘
```

El flujo "feliz" es lineal pero cada módulo es navegable de forma independiente.

### 6.2 Módulo 1 · Proveedor

**Objetivo:** registrar / actualizar la información del proveedor que nos está enviando algo.

**Cuándo se usa:** primera vez que se compra a un proveedor nuevo, o cuando los datos del proveedor cambian (NIT actualizado, nueva dirección).

**Campos:**

| Campo | Tipo | Reglas |
|---|---|---|
| `nombreORazonSocial` | texto, requerido | mínimo 2 caracteres |
| `nit` o `cedula` | texto, requerido | acepta NIT con dígito de verificación o cédula; el sistema infiere cuál es |
| `direccion` | texto, opcional pero recomendado | una sola línea (ciudad + dirección) |
| `telefono` | texto, opcional | normaliza formato colombiano (+57 …) |
| `email` | email, opcional | validación de formato |
| `tipo` | enum `gemas` \| `joyas` \| `insumos` \| `otros` | dropdown |
| `notas` | textarea, opcional | observaciones libres del comprador |

**Acciones del módulo:**
- **Buscar proveedor existente** (autocomplete por nombre / NIT) — si ya existe, abre la ficha.
- **Crear proveedor nuevo** — formulario inline.
- **Editar proveedor** — drawer estilo `EditDrawer` actual.
- **Ver historial de compras del proveedor** — listado de lotes ordenado por fecha desc.

**Salida:** un `providerId` (Convex ID) que el siguiente módulo (Compra) hereda automáticamente.

### 6.3 Módulo 2 · Compra (Lote)

**Objetivo:** registrar la compra física que nos llegó del proveedor seleccionado.

**Cuándo se usa:** cada vez que entra una caja / sobre / paquete del proveedor.

**Campos:**

| Campo | Tipo | Reglas |
|---|---|---|
| `loteId` | texto autogenerado | Formato `B-{NNN}`. **Default por sistema**: siguiente consecutivo disponible. Editable solo en modo override admin. |
| `providerId` | ref `providers` | viene del módulo 1; mostrar nombre de proveedor en encabezado |
| `fechaRecepcion` | fecha | default = hoy |
| `pesoTotalQuilates` | número decimal | requerido si tipo de lote es gemas |
| `costoTotalCOP` | número entero | requerido |
| `unidades` | número entero ≥ 1 | requerido — **define cuántos ítems debe crear el siguiente módulo** |
| `formaPago` | enum `contado` \| `credito` \| `esmereogenesis` | requerido |
| `metodoContado` | enum `efectivo` \| `transferencia` | requerido si `formaPago === "contado"` |
| `fechaVencimiento` | fecha | requerido si `formaPago === "credito"` |
| `numeroCuotas` | entero ≥ 1 | opcional, solo aplica a crédito |
| `numeroFactura` | texto | opcional |
| `urlFactura` | URL Drive | opcional, generado por subida de archivo |
| `notas` | textarea | opcional |

**Reglas:**
1. `loteId` se autogenera al abrir el formulario. Si el último es `B-007`, este es `B-008`.
2. La numeración es **única globalmente** (no por proveedor).
3. Una vez creado el lote, **el botón "Crear ítems del lote"** lleva al módulo 3 con `loteId` y `unidadesDeclaradas` precargados.
4. El lote se considera **abierto** hasta que se hayan creado las N unidades; mientras esté abierto se muestra un badge `🟡 Abierto · ítems pendientes (X/N)`.

### 6.4 Módulo 3 · Inventario (Crear ítems)

**Objetivo:** crear los ítems individuales del lote con todos los datos necesarios para calificación, precio y conexión a la app pública.

**Pre-condición:** existe un `loteId` con `unidades = N`. El módulo abre con un wizard que recorre los N ítems uno por uno.

**Wizard (por ítem):**

#### Paso 0 · Encabezado (auto-llenado)

```
Ítem #002 / 003   ·   Lote B-008   ·   Mauro Confederados
```

- `itemId` se autogenera siguiendo la convención existente del proyecto (siguiente entero libre en `productInventory`).
- No editable manualmente en v1 (regla del usuario: "no puede ser que nosotros lo metamos manualmente").

#### Paso 1 · Tipo y nombre

| Campo | Tipo | Reglas |
|---|---|---|
| `tipo` | enum `gema` \| `lote` \| `joya` \| `insumo` | requerido |
| `nombre` | texto | requerido (e.g., "Sagrada Familia") |
| `preponderancia` | número 0-100 | requerido — % del `costoTotalCOP` que aporta este ítem |

**Validador `preponderancia`:**
- Por ítem: 0 < valor ≤ 100.
- A nivel lote: la suma de preponderancia de todos los ítems del lote debe ser **exactamente 100.00%**.
- El sistema muestra un contador acumulado en la cabecera del wizard: `Preponderancia acumulada: 67% / 100%`.
- **No se puede cerrar el lote** hasta que la suma sea 100%.

#### Paso 2 · Datos según tipo

**Si `tipo === "gema"`:**

| Campo | Tipo | Notas |
|---|---|---|
| `color` | enum (catálogo existente `quality-and-colors`) | requerido |
| `calidad` | enum A / AA / AAA / extra | requerido |
| `pesoQuilates` | decimal 2dp | requerido |
| `medidas` | texto libre `LxAxP` o estructurado | opcional pero recomendado |
| `talla` | enum (catálogo existente) | opcional |

**Si `tipo === "joya"`:**

| Campo | Tipo | Notas |
|---|---|---|
| `tipoJoya` | enum `anillo` \| `pulsera` \| `dije` \| `aretes` \| `topitos` | requerido |
| `pesoGramos` | decimal | requerido |
| `tecnica` | enum + free text `oro` \| `tejido` \| `tejido inglés` \| custom | requerido |
| `material1..5` | texto + opción "Crear casilla" | al menos uno requerido |

> **Nota sobre "Crear casilla más bien":** según la conversación, el usuario quiere poder agregar materiales arbitrarios. Solución: 5 slots fijos visibles + un botón **"+ agregar material"** que añade un slot adicional dinámico hasta el slot 10. Si el material no existe en el catálogo (`materials` en Convex) se crea inline.

**Si `tipo === "lote"`:** sub-lote dentro del lote — comportamiento futuro, no v1.

**Si `tipo === "insumo"`:** solo `nombre`, `cantidad`, `costoUnitario`, sin preponderancia ni precio.

#### Paso 3 · Foto y observación

| Campo | Tipo | Notas |
|---|---|---|
| `fotos[]` | upload Drive | mínimo 1, recomendado 3 (usa el mismo flow que `media-upload` actual) |
| `observacion` | textarea | opcional — descripción humana ("ojo de aceite", "suave brisa") |
| `mostrarEnCatalogo` | toggle | default `false`. Si `true`, el ítem aparece en el catálogo público al cerrar el lote. Si `false`, queda **en reserva oculta**. |

> **Default debate:** la conversación dice "puede ser que yo la llene, pero yo no la quiera lanzar todavía". Conclusión: **default `false`** para proteger la decisión comercial. Un botón "Publicar todo el lote ahora" en el resumen del lote permite activar todos en un click.

#### Paso 4 · Resumen del lote (al terminar el ítem N)

Al cerrar el ítem N de N, el wizard salta a una pantalla de confirmación:

```
Lote B-008 · Mauro Confederados · 3 unidades · 40 quilates · $500.000 COP

  ✓ Ítem 001 — Sagrada Familia      50%   $250.000   gema · A · 10ct
  ✓ Ítem 002 — Esperanza            30%   $150.000   gema · AA · 12ct
  ✓ Ítem 003 — Aurora               20%   $100.000   gema · AAA · 18ct

  Preponderancia: 100% ✓     Fotos: 3/3 ✓     Sincronización: 3/3 ✓

  [Publicar lote ahora] [Mantener en reserva] [Editar]
```

### 6.5 Módulo 4 · Ventas

**Objetivo:** registrar una venta con datos del comprador, forma de pago y producto del inventario, y exportar el "carnet" + certificado de origen.

**Pre-condición:** existe al menos un ítem `DISPONIBLE` o `ASESOR` en `productInventory`.

**Flujo:**

1. **Tipo de comprador** — toggle `embajador` / `cliente final`.
2. **Buscar comprador:**
   - Si embajador: autocomplete contra el directorio de asesores existente (`get-asesores` API). Auto-llena nombre, NIT, dirección, contacto, comisión.
   - Si cliente final: formulario nuevo similar al de proveedor — nombre, NIT/cédula, dirección, teléfono, email.
3. **Forma de pago de la venta:**
   - `esmereogenesis` (financiación interna existente): muestra plazo y cuotas.
   - `contado`: efectivo / transferencia.
   - `credito`: fecha de vencimiento + número de cuotas.
4. **Buscar producto:**
   - Buscador con autocomplete por `itemId`, `nombre`, `coleccion`. Solo muestra ítems `DISPONIBLE` o `ASESOR` (si aplica).
   - Al seleccionar, **se carga la "tarjeta del producto"** con foto destacada + datos (nombre, peso, color, calidad, preponderancia, lote de origen, proveedor, precio en COP).
5. **Resumen de venta:**
   - Ítem(s) vendido(s), precio acordado, descuento aplicado (si lo hay), total, comisión del asesor (si aplica).
   - Estado del ítem cambia a `VENDIDA` o se marca temporalmente `RESERVADA` si el pago aún no se confirma.
6. **Exportar:**
   - **Carnet PDF** (jsPDF + html2canvas, ya en stack): foto + nombre + ítem # + lote + precio + comprador + fecha.
   - **Certificado de origen**: documento estandarizado con peso, color, calidad, procedencia (Muzo / Cosquez / Chivor / Coscuez), inferida del lote o seleccionable manualmente.
   - Ambos van a Drive en `ventas/{año}/{mes}/{itemId}-{compradorSlug}.pdf` y se devuelven por email al comprador (vía `send-email`).

---

## 7. Reglas de negocio críticas

Estas son las invariantes que el sistema **debe** garantizar. Cualquier UI futura las respeta.

| ID | Regla | Capa donde se valida |
|---|---|---|
| BR-1 | `loteId` es único y consecutivo `B-001`, `B-002`, …, sin saltos. | Mutación Convex `lots.create` |
| BR-2 | Suma de `preponderancia` de los ítems de un lote = 100.00% (tolerancia ±0.01). | Mutación `lots.close` y validador frontend |
| BR-3 | Cantidad de `lotItems` con `loteId === L` = `lots[L].unidadesDeclaradas`. | Mutación `lots.close` |
| BR-4 | `itemId` único globalmente en `productInventory`. | (existe) `convex/products.ts:createProduct` |
| BR-5 | `costoBaseCOP` de un ítem = `lot.costoTotalCOP × (preponderancia / 100)`. Calculado, no editable. | Mutación `lotItems.create` |
| BR-6 | Una venta no puede referenciar un ítem `VENDIDA`. | Mutación `sales.create` |
| BR-7 | `formaPago === "credito"` requiere `fechaVencimiento`. | Validador frontend + Convex |
| BR-8 | Toda escritura en Convex se replica a Sheets en `lastPushedAt < 5min` o se marca `syncStatus: "error"`. | (existe) acción `pushToSheet` |

---

## 8. Modelo de datos (Convex + Sheets)

### 8.1 Tablas Convex nuevas

```ts
// convex/schema.ts — extensión

providers: defineTable({
  nombreORazonSocial: v.string(),
  nit: v.optional(v.string()),
  cedula: v.optional(v.string()),
  direccion: v.optional(v.string()),
  telefono: v.optional(v.string()),
  email: v.optional(v.string()),
  tipo: v.union(
    v.literal("gemas"),
    v.literal("joyas"),
    v.literal("insumos"),
    v.literal("otros"),
  ),
  notas: v.optional(v.string()),
  // sync
  rowIndex: v.number(),
  lastPulledAt: v.string(),
  lastPushedAt: v.optional(v.string()),
  syncStatus: v.union(v.literal("synced"), v.literal("pending"), v.literal("error")),
  syncError: v.optional(v.string()),
})
  .index("by_nit", ["nit"])
  .index("by_nombre", ["nombreORazonSocial"]),

lots: defineTable({
  loteId: v.string(),                              // "B-008"
  providerId: v.id("providers"),
  fechaRecepcion: v.string(),                      // ISO date
  pesoTotalQuilates: v.optional(v.number()),
  costoTotalCOP: v.number(),
  unidadesDeclaradas: v.number(),
  formaPago: v.union(
    v.literal("contado"),
    v.literal("credito"),
    v.literal("esmereogenesis"),
  ),
  metodoContado: v.optional(v.union(
    v.literal("efectivo"),
    v.literal("transferencia"),
  )),
  fechaVencimiento: v.optional(v.string()),
  numeroCuotas: v.optional(v.number()),
  numeroFactura: v.optional(v.string()),
  urlFactura: v.optional(v.string()),
  notas: v.optional(v.string()),
  estado: v.union(
    v.literal("abierto"),                          // ítems pendientes
    v.literal("cerrado"),                          // 100% preponderancia + N ítems
    v.literal("publicado"),                        // visible en catálogo
  ),
  // sync
  rowIndex: v.number(),
  lastPulledAt: v.string(),
  lastPushedAt: v.optional(v.string()),
  syncStatus: v.union(v.literal("synced"), v.literal("pending"), v.literal("error")),
  syncError: v.optional(v.string()),
})
  .index("by_loteId", ["loteId"])
  .index("by_provider", ["providerId"])
  .index("by_estado", ["estado"]),

lotItems: defineTable({
  loteId: v.string(),                              // FK a lots.loteId
  itemId: v.string(),                              // FK a productInventory.itemId
  preponderancia: v.number(),                      // 0..100
  costoBaseCOP: v.number(),                        // calculado
  ordenEnLote: v.number(),                         // 1..N
})
  .index("by_loteId", ["loteId"])
  .index("by_itemId", ["itemId"]),

clients: defineTable({
  nombre: v.string(),
  nit: v.optional(v.string()),
  cedula: v.optional(v.string()),
  direccion: v.optional(v.string()),
  telefono: v.optional(v.string()),
  email: v.optional(v.string()),
  tipo: v.union(v.literal("embajador"), v.literal("final")),
  asesorId: v.optional(v.string()),                // si tipo === "embajador"
  // sync...
})
  .index("by_nit", ["nit"])
  .index("by_email", ["email"]),

sales: defineTable({
  saleId: v.string(),                              // "V-0001"
  fechaVenta: v.string(),
  itemIds: v.array(v.string()),                    // permite venta múltiple
  clientId: v.id("clients"),
  precioAcordadoCOP: v.number(),
  descuentoCOP: v.optional(v.number()),
  totalCOP: v.number(),
  comisionCOP: v.optional(v.number()),
  formaPago: v.union(
    v.literal("contado"),
    v.literal("credito"),
    v.literal("esmereogenesis"),
  ),
  metodoContado: v.optional(v.union(
    v.literal("efectivo"),
    v.literal("transferencia"),
  )),
  fechaVencimiento: v.optional(v.string()),
  numeroCuotas: v.optional(v.number()),
  carnetUrl: v.optional(v.string()),               // PDF en Drive
  certificadoUrl: v.optional(v.string()),
  estado: v.union(
    v.literal("reservada"),
    v.literal("confirmada"),
    v.literal("cancelada"),
  ),
  // sync...
})
  .index("by_saleId", ["saleId"])
  .index("by_client", ["clientId"]),
```

### 8.2 Extensiones a `productInventory` existente

Sin migración destructiva. Campos opcionales nuevos:

```ts
loteId: v.optional(v.string()),                    // FK a lots.loteId
preponderancia: v.optional(v.number()),
costoBaseCOP: v.optional(v.number()),
mostrarEnCatalogo: v.optional(v.boolean()),        // gating de publicación
```

### 8.3 Hojas de cálculo correspondientes

| Convex table | Sheet tab | Modo de sync |
|---|---|---|
| `providers` | `Proveedores` | `pullFromSheet` cron + `pushToSheet` (append/patch) |
| `lots` | `Lotes` | idem |
| `lotItems` | (no se materializa en Sheet — vive solo en Convex; se reconstruye en `Inventario` sheet via campos `loteId` + `preponderancia`) | n/a |
| `clients` | `Clientes` | idem |
| `sales` | `Ventas` | idem |

Aprovechamos el patrón ya existente (`convex/products.ts` con `pushToSheet` modo `append/patch`). Cada tabla nueva requiere su propia acción `pushToSheet` específica del schema, o un helper genérico parametrizado por `tableName + columnMap`.

---

## 9. User stories priorizadas

### P0 — Must-have (no se lanza sin esto)

- **US-1.** Como Maritza, quiero **registrar un proveedor nuevo** con nombre, NIT, dirección y contacto, para tener trazabilidad contable de cada compra.
- **US-2.** Como Maritza, quiero **registrar un lote nuevo** con número auto-generado (`B-{NNN}`), peso, costo, unidades y forma de pago, para no inventar nombres.
- **US-3.** Como Maritza, quiero que **el sistema rechace cerrar el lote** si la suma de preponderancia ≠ 100% o si me faltan unidades, para que ningún lote quede a medias.
- **US-4.** Como Maritza, quiero **crear los N ítems de un lote en un wizard guiado** que se autonumere y herede el contexto del lote, para no equivocarme en el itemId ni en el lote.
- **US-5.** Como Maritza, quiero poder **dejar ítems "en reserva"** (no visibles en el catálogo) hasta que comercialmente decidamos publicarlos.
- **US-6.** Como Kevin, quiero que **toda escritura en Fotosíntesis se sincronice con Google Sheets** automáticamente, para que la contabilidad y los reportes sigan funcionando.
- **US-7.** Como Maritza, quiero **registrar una venta** indicando si es a embajador o cliente final, con auto-llenado de embajador, para no re-tipear datos.
- **US-8.** Como Kevin, quiero **exportar un "carnet" PDF** del producto vendido (foto + datos clave + certificado de origen) en un click, para enviarlo al cliente o al contador.

### P1 — Nice-to-have (fast follow)

- **US-9.** Como Maritza, quiero un **buscador global** en Fotosíntesis para encontrar un proveedor / lote / ítem / venta sin navegar por módulos.
- **US-10.** Como Kevin, quiero **ver el margen del lote** (suma de precios de venta − costo total del lote) en la vista de lote.
- **US-11.** Como Maritza, quiero **adjuntar la factura del proveedor** (PDF / foto) al lote.
- **US-12.** Como Maritza, quiero un **botón "Publicar lote ahora"** en el resumen para activar todos los ítems en reserva del lote.
- **US-13.** Como Kevin, quiero **ver el historial de compras a un proveedor** ordenado por fecha al abrir su ficha.

### P2 — Future considerations (no v1, pero diseñamos compatibles)

- **US-14.** Generación automática de factura electrónica DIAN.
- **US-15.** Reglas de comisión por embajador parametrizables.
- **US-16.** Reportes mensuales contables (compras por proveedor, ventas por embajador).
- **US-17.** Workflow de pagos a proveedor (avisos cuando vence un crédito).
- **US-18.** Integración con la herramienta de cotizaciones para "convertir cotización → venta" en un click.

---

## 10. Lineamientos UI/UX (alineados con `ui-ux-pro-max`)

### 10.1 Patrón base

Fotosíntesis v2 reusa el namespace de tokens **`foto`** existente (`getFoto(mode)`) y la tipografía atelier. La identidad visual ya está resuelta para `/admin/products`; v2 hereda y extiende.

- **Paleta:** `paper / vault` neutros + emerald como único acento cromático. Sin cream / umber.
- **Tipografía:** `atelier.type.headline` para títulos de módulo; `atelier.type.section` para sección dentro del módulo; `atelier.type.label` para campos.
- **Spacing:** ancho máximo 1240, gutter 16/24px, secciones 32px gap, campos 16px gap.
- **Depth:** borders-only. Sin sombras. Hairlines 1px en `foto.surfaces.edge`.

### 10.2 Layout sugerido

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER · Fotosíntesis · captura administrativa                │
│  [Proveedor] [Compra] [Inventario] [Ventas]   ⊙ B-008 abierto  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  CONTENT — depende del módulo activo                           │
│                                                                │
│  · Formulario / wizard / lista (segun el caso)                 │
│  · Validaciones inline en rojo bajo el campo                   │
│  · "Continuar" o "Guardar" sticky en el footer                 │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  FOOTER · ⓘ Sync · hace 4 min · Convex · Sheets                │
└────────────────────────────────────────────────────────────────┘
```

### 10.3 Componentes a crear

```
src/pages/admin/Fotosintesis/
├── FotosintesisShell.tsx              NEW — layout con tabs de módulo
├── modules/
│   ├── ProveedorModule.tsx            NEW
│   │   ├── ProveedorList.tsx
│   │   ├── ProveedorForm.tsx
│   │   └── ProveedorCard.tsx
│   ├── CompraModule.tsx               NEW
│   │   ├── LoteList.tsx
│   │   ├── LoteForm.tsx
│   │   └── LoteResumen.tsx
│   ├── InventarioModule.tsx           NEW (wizard N ítems)
│   │   ├── ItemWizard.tsx
│   │   ├── ItemTipoStep.tsx
│   │   ├── ItemDatosStep.tsx          (gema | joya según tipo)
│   │   ├── ItemFotoStep.tsx
│   │   └── PreponderanciaTracker.tsx  (siempre visible en wizard)
│   └── VentasModule.tsx               NEW
│       ├── VentaForm.tsx
│       ├── ProductoSearch.tsx
│       ├── ProductoCard.tsx
│       ├── CarnetPreview.tsx
│       └── exportCarnet.ts            (jsPDF + html2canvas)
└── hooks/
    ├── useNextLoteId.ts               NEW
    ├── usePreponderanciaTotal.ts      NEW
    ├── useLotItemCount.ts             NEW
    └── useProveedorSearch.ts          NEW
```

La **vista de consulta actual** (`ProductManagementPage` con FotoHero, Bandeja, etc.) se mantiene como **`/admin/products`** (ya existe). Fotosíntesis v2 vive en una ruta nueva: **`/admin/fotosintesis`** y es la herramienta de captura. El menú admin tendrá ambas: "Inventario" (consulta) y "Fotosíntesis" (captura).

> Decisión: no fusionar las dos vistas. Razón: la consulta es scanning-mode (escaneo, comparación, edición rápida); la captura es focus-mode (un solo proceso, sin distracciones). Forzarlas en la misma pantalla rompe los dos.

### 10.4 Estados clave

| Estado | Comportamiento |
|---|---|
| Lote abierto sin ítems | Botón "Crear ítems" prominente; no se puede hacer Venta del lote. |
| Preponderancia parcial (< 100%) | Tracker en cabecera muestra `67% / 100% — faltan 33%`; botón "Cerrar lote" deshabilitado. |
| Preponderancia excedida (> 100%) | Mismo tracker en rojo: `103% / 100% — exceso de 3%`; alert. |
| Conteo de ítems insuficiente | `2 / 3 ítems` rojo; CTA "Crear siguiente ítem". |
| Convex offline | Toast persistente "Sin conexión Convex — los cambios no se guardarán" + bloqueo de submits. |
| Push errored | Badge rojo en la fila; botón "Reintentar push" (existente en `retryPush`). |

### 10.5 Microcopy (es-CO)

- "Continuar" (no "Siguiente") en el wizard.
- "Guardar lote" / "Cerrar lote y publicar" / "Mantener en reserva".
- Errores en primera persona del comprador: "Te falta la dirección del proveedor."
- Confirmaciones cálidas pero precisas: "Lote B-008 cerrado · 3 ítems · sincronizando con la hoja…"

---

## 11. Métricas de éxito

### Leading indicators (semana 1–4)

| Métrica | Target | Cómo se mide |
|---|---|---|
| Lotes registrados por Fotosíntesis | 100% | `lots._creationTime` vs Sheets edit log |
| Lotes con preponderancia ≠ 100% | 0 | imposible por validación; auditoría aún así |
| Lotes con conteo de unidades incorrecto | 0 | imposible por validación |
| Tiempo medio para registrar lote 3-ítems | ≤ 8 min | timestamp `lots.createdAt → lots.estado="cerrado"` |
| Productos creados con foto | ≥ 95% | `productInventory.fotos.length > 0` |
| Ventas exportadas con carnet PDF | ≥ 90% | `sales.carnetUrl != null` |

### Lagging indicators (mes 1–3)

- **Reducción de tiempo de cierre contable mensual:** target -50% (de 4h a 2h).
- **Reducción de discrepancias entre Convex y Sheets:** target 0 errores `syncStatus: "error"` por más de 1h.
- **Adopción por todos los administradores:** 100% de los miembros con rol `admin` usan Fotosíntesis al menos 3 veces/semana.

### Métricas de calidad de datos

- **% lotes con factura adjunta:** target ≥ 80% al final del mes 2.
- **% ítems con observación capturada:** no es target — es señal de "el humano sí está describiendo cuando hay algo que decir".

---

## 12. Riesgos y preguntas abiertas

| ID | Riesgo / Pregunta | Owner | Bloqueante? |
|---|---|---|---|
| Q-1 | ¿Maritza tiene acceso `admin` o necesitamos un rol nuevo `captura` con permisos limitados? | Producto / auth | No bloqueante v1 — usar `admin` |
| Q-2 | ¿La numeración `B-{NNN}` se reinicia por año (`B-2026-001`) o es contínua? | Negocio (Maritza) | Sí — afecta `useNextLoteId` |
| Q-3 | Si un lote queda "abierto" y Maritza no termina hoy, ¿lo retomamos mañana sin perder datos? | Producto | No — usar autosave por paso del wizard |
| Q-4 | ¿Cómo se maneja "lote dentro de lote" (sub-lote)? | Negocio | No v1 — diferir |
| Q-5 | El multiplicador x2/x3/x4 (`CurrencyContext`) aplica al precio de venta — ¿también al `costoBaseCOP`? | Negocio | No — el costo es fijo en COP del proveedor |
| Q-6 | Certificado de origen — ¿plantilla legal aprobada o creamos una? | Legal / Kevin | Sí — afecta export |
| Q-7 | ¿Quién puede *force-override* un `loteId` (por errores históricos)? | Auth | No bloqueante v1 — dejarlo no disponible |
| Q-8 | Si una venta se cancela (`estado: "cancelada"`), ¿el ítem vuelve a `DISPONIBLE`? | Negocio | Sí — afecta UX. Decisión propuesta: sí, automático. |
| Q-9 | ¿Necesitamos versión mobile prioritaria para v1? | Producto | No — desktop-first; tablet aceptable |
| Q-10 | ¿Cómo importar el catálogo histórico de proveedores (Mauro existe, otros no están)? | Operativo | Pre-launch: Maritza crea Mauro como B-001 setup |

---

## 13. Plan de fases sugerido

| Fase | Alcance | Estimado |
|---|---|---|
| **F0 · Schema + sync** | Tablas `providers`, `lots`, `lotItems`, `clients`, `sales` en Convex + sheets correspondientes + acciones `pushToSheet` por tabla. | 3-4 días |
| **F1 · Proveedor** | Módulo Proveedor completo (list + form + edit + search). | 2 días |
| **F2 · Compra (Lote)** | Módulo Compra con autonum `B-{NNN}` + validador `useNextLoteId`. | 2-3 días |
| **F3 · Inventario (wizard)** | Wizard N ítems con `PreponderanciaTracker`, validación dura 100%, conteo de unidades, fotos. | 4-5 días |
| **F4 · Ventas + carnet** | Módulo Ventas + buscador de productos + ProductCard + export PDF (carnet) + certificado de origen. | 4-5 días |
| **F5 · QA + métricas** | E2E Playwright (4 specs nuevos: provider-create, lot-create, inventory-wizard, sale-export), unit tests, telemetría. | 3 días |

**Total estimado:** 18-22 días de trabajo (3-4 semanas calendario).

**Dependencias críticas:**
- F0 bloquea F1-F4.
- F1 y F2 pueden ir en paralelo después de F0.
- F4 depende de F3 (necesita ítems creados para vender).

---

## 14. Anexos

### 14.1 Wireframe textual — wizard de ítem (paso central)

```
┌──────────────────────────────────────────────────────────────┐
│ ◀ Lote B-008 · Mauro Confederados                            │
│   Ítem 002 / 003                                              │
│   Preponderancia acumulada · 50% / 100%                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ TIPO DE ÍTEM                                         │    │
│  │ ( ) Gema  (●) Joya  ( ) Lote  ( ) Insumo            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ NOMBRE                                               │    │
│  │ ┌──────────────────────────────────────────────┐    │    │
│  │ │ Esperanza                                    │    │    │
│  │ └──────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ PREPONDERANCIA (% del costo del lote)                │    │
│  │ ┌──────────┐                                         │    │
│  │ │   30   % │   = $150.000 COP costo base             │    │
│  │ └──────────┘                                         │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ JOYA · datos                                         │    │
│  │ Tipo:    [ Anillo ▾ ]                                │    │
│  │ Peso:    [ 12.4 ]   gramos                           │    │
│  │ Técnica: [ Tejido inglés ▾ ]                         │    │
│  │ Material 1: [ Plata 925 ▾ ]                          │    │
│  │ Material 2: [ Esmeralda Muzo ▾ ]                     │    │
│  │ + agregar material                                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  [Cancelar]                  [Guardar y siguiente ▶]          │
└──────────────────────────────────────────────────────────────┘
```

### 14.2 Ejemplo de carnet exportado (estructura)

```
┌──────────────────────────────────────────┐
│  TIERRA MADRE STUDIO                     │
│  Carnet de adquisición · V-0042          │
├──────────────────────────────────────────┤
│  ┌─────────┐                             │
│  │  FOTO   │   Esperanza                 │
│  │ 200x200 │   Ítem #045 · Lote B-008    │
│  └─────────┘   Esmeralda · Muzo · AA     │
│                12.4 ct · ojo de aceite   │
│                                          │
│  Comprador:  Ana Pérez (cédula 1.024…)   │
│  Fecha:      8 de mayo de 2026           │
│  Precio:     $4.500.000 COP              │
│  Pago:       Esmereogénesis · 6 cuotas   │
│                                          │
│  ──────────────────────────────────      │
│  [Certificado de origen adjunto ⤓]       │
└──────────────────────────────────────────┘
```

### 14.3 Glosario

- **Bach / Lote:** la unidad de compra al proveedor. Identificada por `B-{NNN}`.
- **Preponderancia:** porcentaje del costo total del lote que aporta cada ítem. Suma 100%.
- **Carnet:** PDF de una página con identidad del producto + comprador + venta.
- **Ojo de aceite / ojo de gato / suave brisa:** efectos ópticos de una esmeralda — campo libre en `observacion`.
- **Reserva oculta:** ítem creado pero `mostrarEnCatalogo === false`. No aparece en la app pública.
- **Esmereogénesis:** modalidad de financiación interna (existente).

---

## 15. Decisiones tomadas en esta PRD (snapshot)

1. **Fotosíntesis v2 vive en `/admin/fotosintesis`**, NO reemplaza `/admin/products`. Las dos vistas coexisten: una para captura (focus mode), otra para consulta (scan mode).
2. **`mostrarEnCatalogo` default `false`** — protege la decisión comercial.
3. **Numeración de lote contínua global** (no por año, no por proveedor) — pendiente de validación con Maritza (Q-2).
4. **Multiplicador de moneda no aplica al `costoBaseCOP`** — el costo es siempre COP del proveedor.
5. **Permiso `admin`** para v1; rol `captura` queda como mejora futura.
6. **Stack:** mantener React 18 + TS + MUI v6 + Convex + Sheets — sin nuevas dependencias.
7. **PDF export** vía jsPDF + html2canvas (ya en stack).
8. **Hojas de Sheets** se crean nuevas: `Proveedores`, `Lotes`, `Clientes`, `Ventas`. `Inventario` existente se extiende con `loteId` + `preponderancia` + `costoBaseCOP` + `mostrarEnCatalogo`.

---

> **Hecho con amor verde esmeralda en Colombia 💚**
> Versión 1.0 · 2026-05-08 · listo para revisión con Maritza
