# Reserva de inventario y endpoint público de checkout (fase 2 de 4)

**Fecha:** 2026-08-19
**Estado:** diseño aprobado, listo para plan de implementación
**Alcance:** cerrar la carrera de doble venta y abrir el primer endpoint de
escritura sin autenticar de la app. Sin UI.
**Depende de:** fase 1 (riel Wompi) — ya en `main` y desplegada.
**Precede a:** fase 3 (checkout in-app), fase 4 (Bre-B transferencia manual).

---

## Problema

Dos huecos reales, los dos vivos hoy en producción.

### 1 · `createOrder` mira si la piedra está disponible, pero no la aparta

`convex/ghl.ts:309` verifica `product.estado !== 'DISPONIBLE'` y nada más. No
escribe ninguna marca. Dos compradores pueden llegar los dos a una venta
`reservada` sobre la misma esmeralda única, y los dos pagar.

Con el rail del bot y el techo de 2M era tolerable. La fase 3 abre un checkout
público sin techo desde tres superficies, y ahí deja de serlo.

### 2 · Pagar no marca la piedra como vendida

`ghl.markOrderPaid` toca `sales`, `clients` y `commissions`. **Nunca toca
`productInventory`.** Una venta online pagada por completo deja la esmeralda en
`DISPONIBLE`, así que se puede volver a vender — sin ninguna carrera de por
medio, simplemente porque nadie la marcó.

Este segundo hueco es el más grave de los dos, y no necesita concurrencia para
dispararse.

### Lo que NO se puede hacer: colgar la reserva de `estado`

`productInventory.estado` está en el allowlist de pull desde la hoja
(`convex/_lib/sheetPullMaps.ts:118`), y la hoja es la fuente de verdad
declarada. Si Convex escribiera `RESERVADA` ahí, el pull diario —o el botón
manual «Resync from sheet», o el endpoint delta `/sync/foto`— lo pisaría y
**soltaría la piedra en medio de un pago**. En la dirección contraria,
empujar `RESERVADA` a la hoja ensucia el SOT con un estado transitorio.

Es la misma lección que los campos de pago de la fase 1 ya aprendieron
quedándose fuera de `COLUMN_MAPS`.

### Corrección a la nota de fase 1: no hay rate limiting en este repo

El boceto de fase 2 escrito durante la fase 1 decía que el patrón de rate
limiting «ya existe en `api/vault-unlock.ts`». **Es falso.** Ese archivo dice lo
contrario en un comentario (`api/vault-unlock.ts:23`):

> NOT rate-limited: matches every other endpoint in this codebase — none
> currently throttle by IP (no such infrastructure exists here).

No hay dependencia de rate limiting, ni configuración de firewall en
`vercel.json`. Para el primer endpoint de escritura sin autenticar hay que
diseñarlo, no copiarlo.

### El dato afortunado: el catálogo lee la hoja, pero el pedido lee Convex

El Treasure Browser del cliente lee los productos legacy de
`/api/get-treasure-sheets` —la hoja—, mientras que `createOrder` valida contra
`productInventory` **en Convex**. Esa separación juega a favor: un `VENDIDA`
escrito solo en Convex **bloquea un segundo pedido** aunque el catálogo siga
mostrando la piedra. La doble venta se cierra; que la vitrina siga mostrándola
es un problema de la fase 3.

---

## Diseño

### 1 · Reserva derivada — cero estado nuevo

Un ítem está reservado **si y solo si** alguna venta `reservada` más joven que
el TTL contiene su `itemId`. No se guarda nada.

**TTL: 30 minutos.** Alcanza para que un PSE o una transferencia bancaria
terminen, y suelta la piedra dentro de la misma sesión si el visitante se fue.
**El link de Wompi vence con la reserva, y esto es requisito, no adorno.** Tanto
`api/ghl-create-order.ts` como el endpoint nuevo pasan
`expirationTime = ahora + TTL` a `buildCheckoutUrl` (el parámetro ya existe
desde la fase 1 y ya entra en la firma de integridad). Si el link sobreviviera a
la reserva, alguien podría pagar 40 minutos después una piedra que ya se soltó
—y que quizá otro ya compró—, y el resultado sería un reembolso manual sobre
plata ya cobrada. Las dos nociones de vencimiento tienen que ser el mismo
número.

Se agrega **un índice compuesto** a `sales`:

```ts
.index('by_estado_fecha', ['estado', 'fechaVenta'])
```

y una función pura:

```ts
reservedItemIds(pendingSales: SaleLike[], now: number, ttlMs: number): Set<string>
```

`createOrder` consulta por rango únicamente
`estado='reservada' AND fechaVenta >= now − 30min` (las fechas son ISO, y en ISO
el orden lexicográfico es el cronológico, así que el rango funciona sobre el
string), arma el conjunto reservado, y rechaza cualquier sku que esté ahí con
`ITEM_RESERVED:<sku>`.

Tres propiedades salen de esto, y son la razón de elegir este diseño sobre un
campo o una tabla de reservas:

- **La carrera se cierra sin candados.** Las mutations de Convex son
  serializables: leer y escribir dentro de la misma mutation es atómico. Dos
  `createOrder` concurrentes chocan en el conjunto de lectura, una reintenta, y
  la segunda ya ve la venta de la primera.
- **La lectura está acotada.** El rango del índice solo trae los últimos 30
  minutos, sin importar cuántos carritos abandonados se hayan acumulado
  históricamente. No hace falta un cron que limpie para que la consulta siga
  siendo barata.
- **No hay nada que el pull pueda pisar**, porque no se agregó ningún campo. El
  vencimiento ocurre por el paso del tiempo, no por un reaper que pueda fallar
  y dejar una piedra bloqueada para siempre.

`nudgeAbandoned` (`convex/ghl.ts:579`) queda como está: hoy solo registra, y con
la reserva derivada no necesita liberar nada.

### 2 · Marcar `VENDIDA` al pagar

En `markOrderPaid`, después de que la venta pasa a `confirmada` y dentro del
mismo guard de idempotencia que ya existe, por cada `itemId`:

```
productInventory: estado → 'VENDIDA', syncStatus → 'pending'
```

`'VENDIDA'` ya está en el union del schema — no hay cambio de schema. El
`syncStatus: 'pending'` es lo que impide que `_upsertFromSheet` lo pise en el
siguiente pull: ese handler devuelve temprano sin tocar el contenido cuando la
fila está `pending` o `error` (`convex/products.ts:2076`). Es el mecanismo que
el repo ya usa para toda edición originada en Convex, no uno nuevo.

Si el ítem no aparece, se registra y se sigue: la venta ya está comprometida y
no puede quedar a medias por un ítem faltante.

**Limitación que se declara en vez de taparse:** nada empuja `productInventory`
de vuelta a Sheets del lado del servidor — ese push sale de la UI de admin vía
`api/admin-product-update.ts`. Así que **la hoja no se entera sola**. Convex es
lo que bloquea un segundo pedido, así que la doble venta sí queda cerrada, pero
la reconciliación con la hoja sigue siendo manual. Se prefiere declararlo a
cablear un segundo escritor sobre el riel que el `CLAUDE.md` del proyecto
documenta como filoso (`values.append` anclando donde no debe, `syncStatus:
'synced'` sin probar aterrizaje).

### 3 · El endpoint público

`api/checkout-create-order.ts` — POST, **sin autenticar**, con CORS restringido
a los orígenes de la app.

Sigue el modelo de **proxy de confianza** que `api/vitrina.ts` ya documenta: el
endpoint guarda `ADMIN_SYNC_TOKEN` del lado del servidor y llama a la mutation
que ya está protegida por `requireServerSecret`. **No aparece ninguna superficie
de autenticación nueva en Convex** — la mutation sigue siendo inalcanzable
salvo a través de este proxy.

Cuerpo:

```jsonc
{
  "contact": { "celular": "...", "full_name": "...", "email": "..." },
  "items": [{ "sku": "...", "qty": 1 }],
  "ambassador_slug": "...", // opcional
  "canal_origen": "...", // opcional
}
```

Respuesta: `{ order_id, total_cop, checkout_url }` — la misma forma que
devuelve `api/ghl-create-order.ts` desde la fase 1.

Tres defensas van en el código mismo:

- **Tope de ítems por pedido: 10.** Un pedido legítimo de esmeraldas no llega
  ahí, y acota el daño de una llamada abusiva.
- **Sin techo de 2M**, por decisión explícita del dueño del producto — vía un
  argumento `skipLimit` en la mutation. Consecuencia que se nombra en vez de
  esconderse: un llamante anónimo puede crear un pedido arbitrariamente grande.
  No se mueve plata hasta que pague, pero es basura que alguien tendrá que
  limpiar.
- **Idempotencia por `(celular + itemIds ordenados)` dentro del TTL.** Un
  «Pagar» con doble clic devuelve la reserva que ya existe en vez de crear una
  segunda venta sobre la misma piedra.

### 4 · Protección contra abuso

El endpoint es el primero que cualquiera puede llamar con `curl`, sin
credenciales. Cada llamada hace trabajo real: crea una venta `reservada` (que
con la reserva derivada **aparta piedras por 30 minutos**), hace upsert de una
fila en `clients` (que fluye hacia GHL y el espejo de Sheets), y gasta ancho de
banda de Convex —el mismo que la política de free-tier del proyecto raciona a
propósito, bajando el pull de inventario de 15 min a diario.

El daño, entonces, no es robo: es **denegación de venta más un CRM sucio**.

**Decisión: Vercel WAF (rate limiting) + BotID.** Bloquea en el edge, antes de
que la función corra, así que una avalancha cuesta cero ancho de banda de
Convex y no ensucia GHL. Sin código de aplicación y sin dependencia nueva. El
contador en Convex tiene la propiedad opuesta: cada request abusivo tiene que
_llegar_ a Convex para ser contado, gastando justo lo que se quiere proteger.

El plan de implementación documenta la regla exacta a aplicar en el dashboard;
la configuración la aplica el dueño de la cuenta. **Verificar primero que el
plan de Vercel incluya rate limiting del WAF** — algunas funciones del firewall
son de Pro en adelante. Si no lo incluye, el fallback es el contador en Convex,
con ventana deslizante por teléfono e IP.

La ventaja real que sí tiene el contador —limitar por número de teléfono, que un
atacante rotando IPs esquivaría en el edge— vale la pena solo si aparece abuso
de verdad. YAGNI hasta entonces.

### 5 · Manejo de errores

- **`ITEM_RESERVED:<sku>`** → 409, con el sku en el cuerpo para que la fase 3
  pueda decir cuál piedra se acaba de ir.
- **`PRODUCT_NOT_FOUND` / `NOT_AVAILABLE`** → 409, igual que hoy.
- **Más de 10 ítems** → 400, antes de tocar Convex.
- **Pedido duplicado dentro del TTL** → 200 con la venta existente, nunca una
  segunda venta.
- **Ítem faltante al marcar `VENDIDA`** → se registra y se sigue; la venta ya
  está comprometida.

### 6 · Pruebas

Puras y unitarias, con el estilo que ya usa el repo (Vitest, sin mocks):

- `reservedItemIds` — el borde del TTL en las dos direcciones (justo dentro,
  justo fuera), conjunto vacío, ventas con varios ítems, ventas `confirmada` y
  `cancelada` que no deben reservar nada.
- Detección de pedido duplicado — mismo teléfono y mismos ítems en otro orden
  debe reconocerse como el mismo pedido; teléfono distinto no.
- Tope de ítems.

El cableado de las mutations se verifica con la suite completa en verde.

---

## Fuera de alcance

- **Toda la UI**, incluida la ruta `/pedido-confirmado/:saleId` que todavía
  devuelve 404 — **fase 3**.
- **Bre-B por transferencia directa** con confirmación manual — **fase 4**.
- **Empujar `VENDIDA` a la hoja** automáticamente — declarado arriba como
  limitación conocida, no como trabajo de esta fase.
- **El contador de rate limiting en Convex** — solo si el plan de Vercel no
  cubre el WAF, o si aparece abuso real.
- **Que el catálogo deje de mostrar una piedra vendida** — el catálogo legacy
  lee la hoja; el pedido ya queda bloqueado por Convex.

---

## Archivos del código (referencia)

Existentes que se tocan:

- `convex/schema.ts` — índice `by_estado_fecha` en `sales`
- `convex/ghl.ts` — `createOrder` (chequeo de reserva, `skipLimit`),
  `markOrderPaid` (marcar `VENDIDA`)
- `api/ghl-create-order.ts` — pasar `expirationTime = ahora + TTL` a
  `buildCheckoutUrl`, para que el link del bot venza junto con la reserva
- `vercel.json` — `maxDuration` del endpoint nuevo

Nuevos:

- `convex/_lib/reservas.ts` — `reservedItemIds` y la detección de duplicados,
  puras
- `api/checkout-create-order.ts`
- `tests/reservas.test.ts`

## Referencias

- `docs/superpowers/specs/2026-08-19-wompi-payment-rail-design.md` — fase 1
- `docs/wompi-setup.md` — runbook del riel de pago
- `convex/_lib/sheetPullMaps.ts` — allowlist de pull que hace inviable usar `estado`
- `api/vitrina.ts` — el modelo de proxy de confianza que este endpoint reusa
