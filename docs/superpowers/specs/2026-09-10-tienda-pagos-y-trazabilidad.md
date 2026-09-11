# Tienda pública: pagos y trazabilidad auditable

**Fecha:** 2026-09-10
**Estado:** diseño, sin implementar. Ningún archivo congelado fue tocado.
**Alcance:** qué hace falta para que la tienda pública cobre de verdad, y para que
cada transacción quede documentada de forma auditable.

> **Doctrina de verificación.** Toda afirmación negativa lleva el método que la
> estableció; todo riesgo lleva la fecha en que se midió. Lo que no se midió en
> esta sesión se marca como *aseverado*, no como medido.

---

## 1. El riel de Wompi NO está roto

Conviene decirlo primero porque la intuición contraria cuesta días. El riel está
**completo, probado y desplegado**, y desactivado a propósito en el borde:

- `api/_lib/wompi.ts` — checkout alojado (redirección), firma de integridad
  SHA256, conversión a centavos una sola vez, y `fetchTransaction` que **relee la
  transacción real** en vez de confiar en el cuerpo del webhook.
- `api/_lib/wompi-signature.ts` — validación de entrada con
  `crypto.timingSafeEqual`, resolviendo `signature.properties` en orden.
- `api/wompi-webhook.ts` — sin bearer, *el checksum es la autenticación*; ignora
  lo que no sea `transaction.updated`; devuelve 500 ante fallo de red para que
  Wompi reintente.
- `convex/ghl.ts` — `markOrderPaid` es idempotente.

**Lo que está apagado**, no defectuoso:

| Qué | Evidencia | Fecha |
|---|---|---|
| Regla WAF `checkout-publico-llaves-test` deniega `/api/checkout-create-order` | `docs/estado-sesiones.md:460` | publicada 2026-08-24 11:30 |
| Producción tiene llaves **de prueba** (`pub_test_`) con `PAYMENT_PROVIDER=wompi` | `docs/estado-sesiones.md:519-527`, confirmado por el dueño | 2026-08-24 00:10 |

*No verifiqué producción con `curl` ni con el panel de Vercel en esta sesión: ambas
filas son aseveradas desde el documento.* Medido localmente sí: `grep` de `WOMPI_`
y `PAYMENT_PROVIDER` sobre todos los `.env*` del repo → **0 líneas**, así que no
hay material de llaves versionado aquí (2026-09-10).

---

## 2. Por qué la tienda todavía no puede cobrar

No es configuración. Es que **el catálogo de la tienda no tiene identidad de
inventario**.

`convex/ghl.ts:381-387` resuelve una venta `by_itemId` donde `itemId === sku`,
exige `estado === 'DISPONIBLE'`, y en `markOrderPaid` quema esa fila a `VENDIDA`
(`:688-703`). Contra eso:

- `grep -n "sku\|itemId" src/types/tienda.ts` → **0 coincidencias** (2026-09-10).
  `StoreVariant` lleva `{metal, precioCOP, imagen?, disponibilidad}` y nada
  cruzable.
- `grep -n disponibilidad src/data/tienda.ts` → 11 variantes, **10
  `hecho-a-medida`**, 1 `en-stock`. El riel no sabe expresar «hecho a medida»:
  reserva por identidad de una pieza única, no por conteo de existencias.
- `src/data/tienda.ts:10`, en su propio docstring: «Los precios son de
  referencia, no de catálogo.»

Cobrar una tarjeta real contra eso sería **cobrar una cifra inventada por un
objeto que no existe como fila**. Es exactamente el fallo sobre el que este repo
ya escribió una regla tras el incidente de `normalizeCalidadForSheet`: un valor
que rellena un campo vacío es un dato inventado con forma de dato, y a las 24
horas ya no se distingue de uno medido.

### Decisión pendiente (bloquea todo lo demás)

¿Cada variante llega a ser una fila real de `productInventory`, o hace falta una
clase de venta paralela con existencias por conteo?

- **(A)** Fila real por variante — reusa `createOrder`/`markOrderPaid` tal cual,
  pero sólo es honesto para objetos físicos únicos.
- **(B)** Clase de venta paralela para hecho-a-medida y reponible — más trabajo,
  y la única forma que expresa el catálogo real.
- **(C)** Partido: la única variante `en-stock` va por el riel A; el resto queda
  en consulta hasta tener fila.

**Recomendación: (C) ahora, convergiendo a (B).** No elegir (A) por defecto sólo
porque reutiliza más código. Nota medida: `qty` empuja el mismo sku N veces a
`itemIds` (`convex/ghl.ts:409`) mientras `markOrderPaid` deduplica con un `Set`
(`:666`) — con lo cual **`qty: 2` cobra dos veces y vende una**. Doblar
`reservas.ts` para fingir un conteo rompería la parte del riel que hoy está mejor
resuelta.

---

## 3. El tope por transacción ya lo cruza el catálogo

Wompi limita **COP 2.500.000** por transacción a persona natural (Reglamento 6.3;
investigado 2026-09-09, no re-verificado contra el sitio de Wompi en esta sesión).
La variante más cara del fixture es **COP 3.680.000**.

Y el fallo no ocurre en nuestro dominio: la reserva ya bloqueó la pieza treinta
minutos cuando el comprador ve un error en `checkout.wompi.co`.

**Implementado hoy** (`src/utils/tienda.ts` → `superaTopeDeTransaccion`): una
pieza por encima del tope no ofrece «comprar», ofrece consulta. Cualquier
activación real necesita antes el aumento de cupo por escrito.

---

## 4. «Auditable» hoy es imposible

Dos lectores independientes corrieron los mismos greps el 2026-09-10:

- `grep -rn "paymentEvents|webhookEvent|rawEvent|idempotencyKey|paymentAttempts" api/ convex/ src/` → **0**
- `grep -n defineTable convex/schema.ts` → 28 tablas, **ninguna** con forma de
  evento, webhook, pago, ledger o auditoría.
- `api/wompi-webhook.ts:45-50` desestructura cuatro campos y **nunca persiste el
  cuerpo**.

Es decir: el webhook valida lo que Wompi mandó y lo descarta. No hay evidencia
ante un contracargo, ni forma de reconstruir una transacción si el estado de
Convex quedó mal.

Exposición legal fechada: Ley 527 art. 12 y Reglamento Wompi 6.9.5 (**5 días
hábiles** para aportar evidencia), según
`docs/audits/2026-09-09-wompi-legal-y-trazabilidad.md` (investigado 2026-09-09).

> ⚠️ **Ese documento vive sólo en un worktree efímero** (`.claude/worktrees/marco-legal/`).
> `ls docs/audits/` sobre `main` hoy → 8 archivos, **ninguno** es ése. La
> convención del repo borra los worktrees al mergear. Rescatarlo es acción de
> orden cero, y cuesta cinco minutos.

### 4.1 La tabla que falta

```ts
// convex/schema.ts — SOLO Convex. Nunca se espeja a Sheets.
paymentEvents: defineTable({
  // Identidad del evento tal como llegó
  provider: v.string(),                 // 'wompi' | 'mercadopago'
  providerTxId: v.optional(v.string()),
  saleId: v.optional(v.string()),       // el `reference`
  eventType: v.string(),                // 'transaction.updated', ...
  providerStatus: v.optional(v.string()),// APPROVED | DECLINED | VOIDED | ERROR

  // Veredicto propio, ANTES de actuar
  checksumValido: v.boolean(),
  resultado: v.string(),                // 'aplicado'|'ignorado'|'rechazado'|'desajuste-monto'
  motivo: v.optional(v.string()),

  // Evidencia
  rawEvent: v.string(),                 // el cuerpo entero, verbatim
  receivedAmountInCents: v.optional(v.number()),
  receivedCurrency: v.optional(v.string()),
  recibidoEn: v.number(),

  // Idempotencia
  dedupeKey: v.string(),                // `${txId}:${status}:${event.timestamp}`
})
  .index('by_dedupeKey', ['dedupeKey'])
  .index('by_saleId', ['saleId'])
  .index('by_providerTxId', ['providerTxId'])
  .index('by_recibidoEn', ['recibidoEn'])
```

Cuatro reglas que hacen la diferencia entre un log y una prueba:

1. **Se escribe ANTES de tomar la decisión.** Un evento forjado que falla el
   checksum también queda grabado: *ese rechazo ES la evidencia de fraude*. Un
   log que sólo guarda lo que aceptó no sirve ante un contracargo.
2. **Append-only.** Nada actualiza una fila; un estado nuevo es una fila nueva.
3. **`dedupeKey` con el patrón `commitTokens` que ya existe** (`convex/schema.ts:709-716`).
   Wompi reintenta ante 500, así que la reentrada es el caso normal.
4. **Todo campo ausente se queda ausente.** Ningún default rellena un hueco. Es
   la misma regla del incidente de la calidad.

### 4.2 Dos junturas rotas, ya medidas

- `markOrderPaid` escribe una fila en `productEdits` **sin `saleId` ni
  `providerTxId`**: la auditoría de inventario y la de pago no se pueden cruzar.
- `markOrderPaid` **no agenda `sales._pushToSheet`**: la hoja del equipo nunca ve
  ingresos en línea.

### 4.3 Métricas

`grep` de términos COP sobre `src/components/analytics/**` → la analítica de admin
**no tiene dimensión de dinero** (2026-09-10). Con `paymentEvents` y `sales`
existiendo, las métricas mínimas son: intentos vs aprobados por día, tiempo entre
`reservada` y `confirmada` (mide la latencia real del webhook), desajustes de
monto, y eventos con checksum inválido (señal de sondeo).

### 4.4 Conciliación

No existe nada que compare los registros de Wompi contra los nuestros
(`grep` sobre `scripts/` y `convex/`, 2026-09-10). Un cron diario hermano de
`reconcileBackstop` que traiga las transacciones del día y marque divergencias es
el cierre del circuito.

---

## 5. Lo que NO se debe tocar

`api/checkout-create-order.ts`, `api/_lib/wompi.ts`, `api/wompi-webhook.ts` están
**congelados, dueño TM-PAGOS-APP**
(`docs/superpowers/plans/2026-08-25-renacer-app-en-la-web.md:90`, con verificación
de aceptación en `:352` y `:400`: `git diff --stat` sobre los tres → vacío).

El precedente que Renacer ya sentó: todo trabajo nuevo de servidor es un endpoint
**nuevo al lado** de ellos, con su propio allowlist de cuerpo. Este documento se
entrega como diseño, no como diff.

Dos avisos operativos medidos:

- `skip_limit: true` está fijo en `api/checkout-create-order.ts:112`: **levantar
  la WAF también quita el techo de 2M COP** en pedidos anónimos.
- `PAYMENT_PROVIDER` cae en silencio a `mercadopago` ante cualquier valor
  irreconocible (`checkoutLink.ts:40-45`): una errata no falla, **cambia de riel**.
- Convex debe desplegar **antes** que Vercel, siempre (`docs/wompi-setup.md:82-109`).

---

## 6. Orden recomendado

0. Rescatar `2026-09-09-wompi-legal-y-trazabilidad.md` a `main` antes de que se
   borre el worktree.
1. Mergear `feat/checkout-ds3-y-cutover-wompi` (71 archivos, +4816/−780): ya
   rehízo CheckoutSheet, CartPage y PedidoConfirmadoPage en DS3 y en seis
   idiomas, arregló el `reference` único de Wompi y añadió el bloque `payments`
   de `/api/health`, que es lo único que permite verificar el cambio de llaves
   sin entrar al panel.
2. Resolver la decisión de identidad de inventario (§2).
3. Capa legal en el checkout (Ley 1480 / Ley 1581). Es lo más barato del listado
   y es trabajo de UI en la superficie que ya se está diseñando. **La copia legal
   la aporta el dueño**: NIT real, procedimiento de retracto real, enlace SIC
   real. Redactarla por nuestra cuenta sería inventar una representación legal.
4. `paymentEvents` + las dos junturas de §4.2, por TM-PAGOS-APP.
5. Cupo por escrito con Wompi (§3), y sólo entonces cambio de llaves y retiro de
   la regla WAF.

Hasta el paso 5, la tienda cobra en **simulación** (`/tienda/pago`), que recorre
los tres estados reales del esquema (`reservada` · `confirmada` · `cancelada`) sin
mover un peso.
