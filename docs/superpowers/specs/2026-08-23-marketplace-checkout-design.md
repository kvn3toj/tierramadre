# Checkout de marketplace — diseño integral para la app sin compuertas

**Fecha:** 2026-08-23
**Estado:** diseño para discusión — no aprobado, no implementado
**Alcance:** cómo se compra en la próxima versión de la app, donde no hay login ni
compuertas y todo se vende desde el catálogo.
**Reemplaza conceptualmente:** el mecanismo de «token de vitrina» como vía de venta
(fases 1-3, ya en producción). No lo borra: lo degrada de mecanismo central a caso especial.

---

## 1 · El cambio de marco

Las fases 1 a 3 resolvieron «cómo cobrar sin que el navegador decida el precio», y lo
resolvieron bien: el servidor busca un **registro** (vitrina o invitación) y aplica el
multiplicador guardado ahí. Ese diseño es correcto **para un mundo de links compartidos**,
donde cada cliente llega por una puerta con su precio negociado.

La próxima versión invierte esa premisa: **todo el mundo entra por la misma puerta y ve el
mismo catálogo.** En ese mundo, «¿de qué registro viene este comprador?» deja de tener
respuesta, porque no viene de ninguno.

Por eso esto no es «agregar botones de pago a más pantallas». Es cambiar dónde vive la
autoridad de precio: **del link al producto**.

---

## 2 · El hallazgo central: hoy el precio es privado

Medido el 2026-08-23 en `api/_lib/catalogProjection.ts:55`:

```ts
export const WITHHELD_KEYS = [
  'fechaIngreso', 'cantidad', 'costoTM',
  'precioCOP',            // ← acá
  'precioInternacional', 'ubicacion', 'asesor', 'estado', …
]
```

`precioCOP` **no se le manda al navegador de un visitante anónimo.** Un grant `vitrina`
devuelve el precio sólo para los ítems de ESE registro; todo lo demás sale sin precio.

Consecuencia comprobada en vivo: en `/v/363-176-565` (lista de ids, grant `anon`) las
tarjetas salen sin precio y sin botón de compra, correctamente — no se puede cobrar lo que
no tiene precio.

**Esto es el obstáculo, y también es la buena noticia:** explica por qué toda superficie
pública que no sea una vitrina con token es incapaz de vender hoy, y señala exactamente la
pieza a mover. Una app de marketplace **publica precios**. Ese es el cambio de fondo; casi
todo lo demás se deriva.

---

## 3 · Estado actual, medido

### Lo que YA cumple práctica estándar — no rehacer

| Práctica                                                        | Estado                                                                                                                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Checkout de invitado** (sin crear cuenta)                     | ✅ Ya es así. Sólo pide celular; nombre y correo opcionales.                                                                                               |
| **El servidor recalcula el precio, nunca confía en el cliente** | ✅ `resolverMultiplicador` + `precioConMarkup` en Convex. El navegador no manda ni precio ni multiplicador.                                                |
| **Reserva de inventario con TTL**                               | ✅ 30 min (`RESERVA_TTL_MS`), y **al crear la orden, no al agregar al carrito** — que es la práctica correcta: no se aparta stock mientras alguien navega. |
| **No sobrevender pieza única**                                  | ✅ `ITEM_RESERVED` probado en vivo: un segundo comprador es rechazado.                                                                                     |
| **Webhook idempotente**                                         | ✅ Replay devuelve `already-paid`, `paidAt` no se mueve, sin comisión duplicada.                                                                           |
| **No confiar en el cuerpo del webhook**                         | ✅ Se reconsulta la transacción real contra Wompi.                                                                                                         |
| **Confirmación asíncrona bien manejada**                        | ✅ `/pedido-confirmado/:saleId` distingue confirmando / confirmada / cancelada.                                                                            |
| **Auditoría del precio cobrado**                                | ✅ `precioBaseCOP` + `multiplicador` + `totalCOP` en cada venta.                                                                                           |

Ese es un cimiento sólido. El trabajo que sigue **no lo toca**.

### Lo que falta para un marketplace

| Hueco                                       | Medido                                                     | Por qué importa                                                                                                                      |
| ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **El precio es privado**                    | `precioCOP` en `WITHHELD_KEYS`                             | Sin precio público no hay catálogo que venda. **Es el bloqueo raíz.**                                                                |
| **La autoridad de precio vive en el link**  | Sólo `vitrinas.multiplier` e `invitations.guestMultiplier` | Sin vitrina no hay precio de venta que el servidor pueda probar. Es lo que hoy impide cobrar desde el Treasure Browser.              |
| **El carrito muere al cerrar el navegador** | `sessionStorage` (`useCart.ts:25`)                         | Un carrito que no sobrevive es una venta que no vuelve. Tampoco cruza dispositivos.                                                  |
| **El carrito no es un contexto**            | Cada `useCart()` tiene su propio estado                    | Ya obligó a levantar el estado a mano en cada superficie. No escala a una app donde el carrito está en todas partes.                 |
| **No hay modelo de costos extra**           | `sales` no tiene envío / seguro / impuesto                 | **48 % de los abandonos** son por costos que aparecen recién al final. Hoy no aparecen nunca, lo que es peor: aparecen por WhatsApp. |
| **No hay dónde consultar un pedido**        | Sin cuenta y sin búsqueda por número                       | El comprador paga y queda sin forma de volver a ver su pedido.                                                                       |
| **Recuperación de abandono sólo loguea**    | `nudgeAbandoned` imprime la lista y nada más               | La secuencia de recuperación es de lo más rentable del checkout.                                                                     |
| **Redirección en vez de widget**            | `CHECKOUT_URL = 'https://checkout.wompi.co/p/'`            | Wompi ofrece **Widget embebido**; sacar al cliente del sitio cuesta conversión.                                                      |
| **Sin techo de monto**                      | `skip_limit: true`                                         | Hoy cualquiera puede ordenar cualquier monto. Es intencional pero no está decidido en voz alta.                                      |

---

## 4 · Diseño

### 4.1 · La pieza que se mueve: el precio pasa a ser del producto

Hoy el precio de venta se decide **por link**. En el diseño nuevo se decide **por pieza**, y
se publica.

```
productInventory
  costoTM            ← sigue privado, siempre
  precioCOP          ← el precio BASE, sigue privado
  precioPublicoCOP   ← NUEVO: el precio de lista. PÚBLICO.
```

`precioPublicoCOP` lo calcula y guarda el servidor, con la política de precio que ya existe
(`convex/_lib/motorPrecios.ts`, que ya sabe de IVA de gema y de joya). **El navegador nunca
lo calcula.** Publicarlo es seguro porque es el número que cualquiera vería en una vitrina;
lo que sigue oculto es el costo y el margen.

Con eso, la regla de cobro se vuelve una sola frase:

> **Se cobra `precioPublicoCOP`, salvo que exista un registro de origen que diga otra cosa.**

Y las vitrinas dejan de ser el mecanismo de venta para pasar a ser lo que siempre debieron
ser: **una excepción con nombre** — un precio especial para un cliente concreto, auditado.

Esto también resuelve, sin diseño nuevo, la pregunta que quedó abierta hoy («¿a qué precio
cobra el Treasure Browser?»): al precio público, como todos.

### 4.2 · Carrito del lado del servidor

```
carts (nuevo)
  cartId        ← id anónimo, en cookie httpOnly
  items[]       ← itemIds
  createdAt / updatedAt
  contacto?     ← si lo dejó
```

Tres cosas que hoy no se pueden y pasan a poder:

- **Sobrevive** al cierre del navegador y cruza pestañas sin trucos.
- **El servidor conoce el carrito**, así que puede recalcular precios y disponibilidad en el
  momento de cobrar, sin confiar en lo que manda el cliente.
- **Habilita la recuperación de abandono**, porque hay a quién escribirle y qué recordarle.

El `useCart` de `sessionStorage` se conserva como **caché optimista** para que la UI no
espere al servidor, pero deja de ser la fuente de verdad.

### 4.3 · Costos visibles antes del final

Es la causa #1 de abandono medida por Baymard, y hoy no la tenemos modelada.

```
sales
  subtotalCOP     ← suma de precioPublicoCOP
  envioCOP        ← política de envío (posiblemente 0 con umbral)
  seguroCOP       ← si aplica al transportar piedra
  totalCOP        ← lo que se cobra  (ya existe)
```

El carrito muestra el desglose completo **antes** de que el cliente toque «Pagar», no en la
pantalla de pago.

### 4.4 · Reserva: lo que ya hay, con la ventana ajustada

El mecanismo actual es correcto y **no se rehace**. Dos ajustes:

- **TTL de 30 → 15 minutos.** La referencia de la industria ronda los 5-15; 30 minutos sobre
  pieza única bloquea demasiado stock ante un abandono.
- **Contador visible** en el checkout: «apartada por 14:32». Es honesto con el comprador y
  es presión de compra legítima.

### 4.5 · Widget embebido en vez de redirección

Wompi soporta **Widget**, que cobra sin sacar al cliente del sitio. El riel actual
(`buildCheckoutUrl` → `checkout.wompi.co/p/`) sigue existiendo como respaldo, pero el camino
principal deja de expulsar al comprador en el momento de mayor fricción.

La firma de integridad y la validación del webhook **no cambian** — el widget usa la misma.

### 4.6 · Consulta de pedido sin cuenta

`/pedido/:saleId` + últimos 4 dígitos del celular. Sin cuenta, sin contraseña, sin
compuerta — coherente con la app sin login. Reusa la query pública `sales.estadoPublico` que
ya existe, ampliada con el detalle de piezas.

### 4.7 · Recuperación de abandono

El cron ya existe y ya identifica los carritos fríos; sólo **loguea**. Conectarlo al riel de
GHL que ya está vivo (WhatsApp) cierra el ciclo. Es la mejora de mayor retorno por línea de
código de todo este plan.

---

### 4.8 · Las vitrinas vencen, y al vencer piden cotización

Una vitrina **es** una cotización, y una cotización con precio negociado que no vence es una
promesa sin fecha. Hoy `vitrinas` no tiene ningún campo de expiración (medido: `token`,
`itemIds`, `currency`, `multiplier`, `senderSlug`, `createdAt`, `createdByEmail` — nada más),
así que los 48 links vivos honran su precio para siempre.

Eso hace desaparecer el conflicto de la decisión §6.2: si las vitrinas vencen, no hay
vitrina vieja compitiendo contra el precio público.

**El link vencido no muere: pide cotización de nuevo.**

```
/v/:token vencida
  ├─ «Esta cotización ya venció»
  ├─ las piezas que contenía  (foto + nombre, SIN el precio viejo)
  └─ [Pedir cotización actualizada por WhatsApp]
       → mensaje precargado con los itemIds de ESA vitrina
```

Dos reglas que sostienen el diseño:

- **El registro NO se borra.** «Vencida» es un estado, no una baja. Sin el registro no hay
  `itemIds` con qué armar el mensaje, y el link vencido se degrada al 404 que queríamos evitar.
- **No se muestra el precio viejo.** Mostrarlo obliga a una de dos cosas malas: honrarlo, o
  explicar por qué no. La pieza y la foto alcanzan para que el cliente reconozca lo que estaba
  mirando.

**Cómo se aplica a las 48 que ya existen — medido el 2026-08-23:**

| antigüedad  | vitrinas |
| ----------- | -------- |
| ≤ 7 días    | 8        |
| 8 a 30 días | 40       |
| > 30 días   | 0        |

Ninguna pasa de 30 días; la más nueva tiene 2 y la más nueva **con markup** tiene 4. No son
archivo muerto: son conversaciones abiertas. **Apagarlas todas el día del cambio corta ocho
conversaciones de esta semana.**

Por eso el TTL se aplica **retroactivo desde `createdAt`**, no desde el día del despliegue.
Con un TTL de 30 días el parque entero se vacía solo en menos de un mes, las recientes
conservan lo que les queda de ventana, y no hay un día de corte donde alguien pierda una
negociación en curso. El precio público (fase A) tampoco llega hoy, así que las dos cosas se
cruzan sin colisión.

**Queda por decidir el número del TTL.** 30 días vacía el parque sin cortar nada; 15 es más
disciplina comercial y apaga hoy mismo unas cuantas. Es decisión de negocio, no técnica.

---

## 5 · Fases sugeridas

| #     | Qué                                             | Desbloquea                                             |
| ----- | ----------------------------------------------- | ------------------------------------------------------ |
| **A** | `precioPublicoCOP` + sacarlo de `WITHHELD_KEYS` | **Todo lo demás.** Sin esto no hay catálogo que venda. |
| **B** | Carrito en servidor con cookie anónima          | Persistencia, recálculo confiable, recuperación        |
| **C** | Desglose de costos + TTL 15 min + contador      | Ataca la causa #1 de abandono                          |
| **D** | Widget de Wompi embebido                        | Conversión en el momento de pagar                      |
| **E** | Consulta de pedido + recuperación por WhatsApp  | Post-venta y rescate                                   |
| **F** | Vencimiento de vitrinas + pantalla de «cotización vencida» (§4.8) | Quita el conflicto entre precio público y precio negociado viejo. **Puede ir antes que A.** |

A es prerrequisito de todo. B a E son independientes entre sí.

---

## 6 · Decisiones que este documento NO toma

1. **¿Cuál es el precio público de una pieza?** ¿`precioCOP` tal cual, o `precioCOP` por un
   multiplicador de política? Hoy 9 de 48 vitrinas usan markup (2 a 4×), así que **hay un
   markup real en uso** y hay que decidir cuál es el de lista.
2. ~~**¿Qué pasa con las vitrinas existentes?**~~ **RESUELTO** por §4.8: vencen, y al vencer
   piden cotización nueva por WhatsApp. Queda sólo **el número del TTL** (30 días no corta
   ninguna conversación viva; 15 apaga varias hoy).
3. **¿Techo de monto?** Hoy no hay. Para una app de marketplace conviene una decisión
   explícita, aunque sea «sin techo».
4. **¿Envío y seguro?** No existe la política. Sin ella no se puede mostrar el costo total,
   que es justamente lo que evita la mitad de los abandonos.
5. **¿El staff cobra por acá?** Con precio público la pregunta se simplifica —cobra el precio
   de lista— pero queda si un asesor puede aplicar descuento y con qué autoridad.

---

## 7 · Riesgos

1. **Publicar el precio es irreversible en la práctica.** Una vez que el catálogo muestra
   precios, esconderlos otra vez es un retroceso visible. La decisión #1 debe estar tomada
   antes de tocar `WITHHELD_KEYS`.
2. **`precioPublicoCOP` es un dato derivado, y los datos derivados se desincronizan.** Debe
   recalcularse en el mismo lugar donde hoy se calcula el precio, nunca a mano.
3. **La cookie de carrito es dato personal.** Anónima, pero identifica un dispositivo entre
   sesiones. Conviene decidir su vida útil y decirlo en la política del sitio.
4. **El widget corre en nuestro dominio**, así que un error de integración es visible en
   nuestra marca en vez de en la de Wompi. Vale la pena mantener la redirección como
   respaldo.

---

## 8 · Referencias

- [Baymard / estadísticas de abandono 2026](https://www.shno.co/marketing-statistics/checkout-conversion-statistics) — 70,19 % de abandono; **19 %** por cuenta obligatoria; **48 %** por costos inesperados.
- [Shopify · Checkout optimization](https://www.shopify.com/blog/ecommerce-checkout-optimization) — invitado por defecto, costos visibles, velocidad.
- [Salesforce · Ecommerce checkout best practices](https://www.salesforce.com/commerce/online-payment-solution/checkout-guide/) — recálculo en servidor, intención de pago firmada, token atado a la orden.
- [Sylius · máquinas de estado en e-commerce](https://sylius.com/blog/what-is-state-machine-and-why-is-it-useful-in-modeling-ecommerce-processes/) — estados y guardas del pedido.
- [commercetools · reservar stock en el carrito](https://docs.commercetools.com/tutorials/reserve-stock-on-cart) — reserva blanda con TTL obligatorio, conversión a dura al pagar.
- [Shopify Engineering · escalar reservas de inventario](https://shopify.engineering/scaling-inventory-reservations) — reservas con expiración a escala.
- [Wompi · Widget y Checkout Web](https://docs.wompi.co/en/docs/colombia/widget-checkout-web/) — widget embebido sin redirección.

## 9 · Lo que ya está construido y este plan reusa

- `convex/ghl.ts` — `createOrder` (reserva, precio, `ORIGEN_INVALIDO`) y `markOrderPaid` (idempotente)
- `convex/_lib/precioVitrina.ts` — resolución pura del multiplicador
- `convex/_lib/motorPrecios.ts` — política de precio con IVA
- `api/_lib/wompi*.ts` — firma de integridad, checksum de eventos, reconsulta de transacción
- `api/checkout-create-order.ts` — endpoint público con allowlist de origen y saneo de errores
- `src/components/checkout/` — `CheckoutSheet`, mensajes de error, guardas
- `docs/checkout-publico-proteccion.md` · `docs/wompi-setup.md`
