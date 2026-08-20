# Checkout dentro de la app (fase 3 de 4)

**Fecha:** 2026-08-20
**Estado:** diseño aprobado, listo para plan de implementación
**Alcance:** la primera superficie donde un cliente entrega dinero dentro de la
app, y la autoridad de precio que la hace correcta.
**Depende de:** fase 2 (`feat/reserva-y-checkout-publico`, PR #133, sin mergear).
Esta rama sale de ahí, no de `main`.
**Precede a:** fase 4 (Bre-B por transferencia manual).

---

## Problema

Las fases 1 y 2 dejaron el servidor listo: hay riel de pago, hay reserva, hay un
endpoint público que no confía en el cliente. Falta la parte que ve el
comprador. Hoy no existe: `src/pages/CartPage.tsx` abre WhatsApp, y
`/pedido-confirmado/:saleId` —a donde ya redirigen los dos rieles de pago
(`api/_lib/checkoutLink.ts:74`)— devuelve 404.

Pero al ir a construirla aparece un problema que no es de interfaz.

### El precio en pantalla no es el precio que cobraríamos

Lo que ve el cliente **no** es `precioCOP`. Es:

```
COP → Math.round(precioCOP × multiplicador)
USD → Math.round((precioCOP / TRM) × multiplicador)
```

(`src/utils/vitrinaPrice.ts`, `computeVitrinaPrice`.) El multiplicador va de
**x1 a x4 en pasos de 0,1**.

`ghl.createOrder` —la mutation que la fase 2 acaba de blindar— cobra
`precioCOP` pelado, sin multiplicador. Una vitrina compartida a 2,6× mostraría
un número y **cobraría el precio base de Tierra Madre**, perdiendo el markup
entero en cada venta online.

### Lo que el esquema ya había resuelto

El multiplicador **ya se guarda del lado del servidor**, y a propósito. El
comentario de `vitrinas` en `convex/schema.ts` lo dice con todas las letras:

> El multiplicador se guarda AQUÍ (no en la URL) para que el markup elegido
> nunca quede expuesto ni editable por el destinatario.

- `vitrinas.multiplier` (`convex/schema.ts:107`) — por vitrina
- `invitations.guestMultiplier` (`convex/schema.ts:40`) — por invitación

Alguien ya pensó este problema y lo resolvió del lado correcto. Leer el
multiplicador del navegador para cobrar sería deshacer esa decisión: vive en
`sessionStorage`/`localStorage`, y un cliente que lo edita de 2,6 a 1 compra una
esmeralda al costo. No es un riesgo teórico, es editar un campo en las
DevTools.

### La regla de negocio no está implementada

**Solo admins y embajadores pueden usar el multiplicador.** Hoy el código no lo
sostiene, en dos lugares:

1. `src/components/ios/IOSSettingsSheet.tsx` expone el slider del multiplicador
   **sin ninguna comprobación de rol** — ese archivo no importa permisos.
   Cualquier asesor puede navegar a x4.
2. `canShareVitrina: isStaff || isInvitadoEspecial`
   (`src/hooks/usePermissions.ts:35`) — un **asesor**, e incluso un **invitado
   especial**, puede acuñar una vitrina con el multiplicador que quiera.

Lo segundo deja de ser cosmético en el momento en que el checkout cobra
`vitrinas.multiplier`: **quien acuña la vitrina fija el precio de venta.** Un
asesor podría acuñar a x1 y vender al costo, no necesariamente por malicia sino
por no saber que ese control ahora mueve dinero.

Ya existe el precedente exacto para la regla:
`canUseManualProduct: isAdmin || isEmbajador` (`src/hooks/usePermissions.ts:33`).

---

## Diseño

### 1 · Autoridad de precio: el servidor resuelve, el navegador nunca

El checkout **no manda un precio ni un multiplicador**. Manda el **origen**: el
token de la vitrina, o la invitación del huésped. El servidor busca ese registro
y aplica su multiplicador.

```
POST /api/checkout-create-order
  { contact, items, origen: { tipo: 'vitrina',    token } }
  { contact, items, origen: { tipo: 'invitacion', token } }
```

En los dos casos `token` es un identificador que el cliente **ya tiene**: el de
la vitrina viene en la URL `/v/:code`; el del invitado vive en su sesión
(`INVITATION_STORAGE_KEYS.TOKEN`, `src/types/invitation.ts:123`) y el servidor
lo verifica contra `invitations.boundToken`. Nunca viaja un multiplicador ni un
precio.

`ghl.createOrder` resuelve el multiplicador contra `vitrinas.multiplier` o
`invitations.guestMultiplier` y calcula `Math.round(precioCOP × multiplicador)`
por pieza.

**Origen ausente y origen inválido NO son lo mismo, y confundirlos sería el
agujero.** Si no viene origen, el multiplicador es 1 (ver abajo). Pero si viene
un origen que **no resuelve** —token inexistente, vitrina borrada, invitación
vencida— la orden se **rechaza**, no se cobra a x1. Tratar un token basura como
«sin markup» convertiría el propio campo en la forma de comprar al costo:
bastaría mandar `origen: { tipo: 'vitrina', token: 'cualquier-cosa' }`. Un
origen que se afirma y no se puede probar es un error, nunca un descuento.

Esto conserva intacto el principio que la fase 2 defendió: los precios se
recargan siempre en el servidor, y nada de lo que manda el cliente toca el
monto. El multiplicador es ahora parte de ese cálculo, no una excepción.

**El default de 1 no contradice la tabla de §4.** El checkout in-app siempre
manda origen; el que llama sin origen es el **riel del bot**
(`api/ghl-create-order.ts`), que hoy cobra `precioCOP` y debe seguir haciéndolo.
El default existe para que ese riel no cambie de precio al pasar por el mismo
código, y como defensa en profundidad si alguna vez llega una petición sin
origen. No es una puerta para cobrar sin registro: es la ausencia de markup
donde nunca se eligió uno.

### 2 · Se cobra en COP, aunque se muestre en USD

Wompi cobra **solo en COP** (verificado en la fase 1; sus métodos de recaudo son
todos COP). Una vitrina en USD muestra `(precioCOP / TRM) × multiplicador`.

**El monto cobrado es siempre `Math.round(precioCOP × multiplicador)` en COP.**

Convertir el USD mostrado de vuelta a COP con la misma TRM **no** devuelve la
misma cifra —hay dos redondeos y la TRM se mueve entre que se comparte la
vitrina y se paga—, así que el checkout tiene que **mostrar el monto en COP que
se va a cobrar** antes de que el cliente confirme, con el USD como referencia si
la vitrina estaba en USD. Un cliente que ve `$471 USD` y termina con un cargo en
pesos que nunca aprobó es un contracargo esperando a ocurrir.

### 3 · La compuerta al acuñar, en el servidor

Fijar un multiplicador distinto de 1 al crear una vitrina queda restringido a
`admin` o `embajador`, verificado en `api/vitrina.ts` — el proxy que **ya**
valida el token de Google y **ya** registra `createdByEmail`
(`api/vitrina.ts:161`). El rol se resuelve ahí, del lado del servidor.

Un asesor puede seguir compartiendo vitrinas; simplemente salen a x1. Si pide
un markup, el proxy responde 403 y no acuña.

La comprobación en la UI (ocultar o deshabilitar el slider) es cortesía para no
ofrecer algo que va a fallar. **La del proxy es la que cuenta**, porque el
diálogo de compartir es código de cliente y se puede saltar.

`usePermissions` gana `canUseMultiplier: isAdmin || isEmbajador`, con la misma
forma que `canUseManualProduct` ya tiene.

### 4 · Dónde aparece «Pagar»

| Superficie             | ¿Checkout? | Por qué                                                |
| ---------------------- | ---------- | ------------------------------------------------------ |
| `/v/:code`             | **Sí**     | La vitrina lleva su multiplicador y su moneda          |
| `/cart` de un invitado | **Sí**     | La invitación lleva `guestMultiplier`                  |
| `/cart` de staff       | No         | El staff no es el comprador; ya cierra por WhatsApp    |
| `/p/:itemId` suelto    | No         | No hay markup elegido: no sabes a qué precio ofreciste |

Las dos superficies que quedan fuera conservan el flujo actual de WhatsApp sin
cambios. `DEFAULT_VITRINA_PRICING` ya documenta esa postura para los links
sueltos: «x1 … no markup is implied where none was chosen».

No es una restricción del negocio: la vitrina **es** el movimiento de venta.

### 5 · `<CheckoutSheet>`

Un componente compartido por las dos superficies. Responsabilidad única:
convertir una selección de piezas en un link de pago.

- **Resumen**: las piezas y el total, en las mismas cifras que el cliente venía
  viendo, más el monto en COP que se va a cobrar (§2).
- **Contacto**: celular obligatorio; nombre y correo opcionales. Los opcionales
  vacíos se **omiten, nunca se mandan como `null`** — el validador de la fase 2
  (`api/_lib/checkoutBody.ts`) rechaza `null` con un 400, igual que el validador
  de Convex.
- **Acción**: llama a `/api/checkout-create-order` y redirige a `checkout_url`.

Estado de carga con el botón bloqueado: sin eso, el doble clic es el camino
normal, no el raro.

### 6 · Los estados de error son la mitad del trabajo

| Respuesta                      | Qué ve el cliente                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `409 ITEM_RESERVED`            | «Alguien más está pagando esta pieza en este momento», nombrando la pieza. Puede reintentar en unos minutos: la reserva dura 30.       |
| `409 PRODUCT_UNAVAILABLE`      | La pieza ya se vendió. Ofrecer volver al catálogo.                                                                                     |
| `409 ORIGEN_INVALIDO`         | El link de la vitrina o la invitación ya no es válido. Ofrecer contacto por WhatsApp; **nunca** reintentar sin markup.                  |
| `400` de validación            | El mensaje del campo, junto al campo.                                                                                                  |
| `500`                          | Mensaje genérico. La fase 2 ya sanea este cuerpo a propósito.                                                                          |
| `201` con `checkout_url: null` | El proveedor de pago falló pero **el pedido existe**. Nunca decir «error»: decir que el pedido quedó y que se contactará por WhatsApp. |
| `reused: true`                 | **No** es un error. El cliente vuelve a la reserva que ya tenía; se sigue al mismo link sin crear nada.                                |

Ese último es el que se rompe si nadie lo piensa: sin manejarlo, un doble clic
parece un fallo cuando en realidad todo salió bien.

### 7 · `/pedido-confirmado/:saleId`

La ruta que hoy da 404 y a la que ya redirigen los dos rieles.

**La expectativa que hay que manejar:** el pago se confirma por webhook, de
forma asíncrona. Cuando el cliente aterriza aquí, la venta **puede seguir en
`reservada`** — el webhook quizá no ha llegado. La página debe decir «estamos
confirmando tu pago» y refrescar, no gritar un error sobre un pago que sí se
hizo.

- `confirmada` → confirmación, con el número de pedido.
- `reservada` → «confirmando», con re-consulta periódica.
- `cancelada` → estado claro y contacto.

Se lee por una query pública acotada por `saleId`, que devuelve **solo** estado,
número de pedido y total. Nada de datos del cliente ni de la comisión: cualquiera
con el link la puede llamar.

### 8 · La venta guarda las tres cifras

En `sales`, solo en Convex, **fuera de `COLUMN_MAPS`** — igual que los campos de
pago de la fase 1:

```ts
precioBaseCOP:   v.optional(v.number()),  // suma de precioCOP sin markup
multiplicador:   v.optional(v.number()),  // el aplicado, resuelto en servidor
// totalCOP ya existe: es lo que se cobró
```

Sin esto no se puede auditar después si una venta online salió a x1 o a x2,6, y
reconstruirlo más tarde es imposible: el multiplicador de la vitrina pudo
cambiar.

**Pregunta de negocio que este spec NO decide:** hoy la comisión del embajador es
un porcentaje de `totalCOP` (`convex/_lib/commission.ts`). Si `totalCOP` pasa a
incluir el markup, el embajador empieza a cobrar sobre el markup también. Puede
ser lo deseado o no; queda señalado, no resuelto, y no bloquea esta fase.

### 9 · Pruebas

Puras y unitarias, con el estilo del repo (Vitest, sin mocks):

- **Resolución de precio**: multiplicador de vitrina, de invitación, y el
  default 1 sin origen; el redondeo COP; que un multiplicador mandado por el
  cliente se ignora.
- **Compuerta del multiplicador**: `canUseMultiplier` para cada rol.
- **Mapeo de errores**: cada respuesta del endpoint a su mensaje, incluido
  `reused: true` como éxito y `checkout_url: null` como «pedido guardado».
- Componentes con `.test.tsx` bajo jsdom, como ya hace el repo.

---

## Fuera de alcance

- **Bre-B por transferencia manual** — fase 4.
- **Empujar `VENDIDA` a la hoja** — limitación declarada en la fase 2.
- **Que el catálogo legacy deje de mostrar una piedra vendida** — lee la hoja;
  el pedido ya lo bloquea Convex.
- **Rediseñar la comisión** — señalado en §8, no resuelto aquí.
- **Checkout en `/p/:itemId` y en el carrito de staff** — §4.
- **Cerrar el slider sin permisos de `IOSSettingsSheet`** — es un tema de
  visualización; la fase 3 lo vuelve irrelevante para el dinero al no confiar
  nunca en el navegador. Se deja señalado para cerrarlo aparte.

## Archivos (referencia)

Existentes que se tocan:

- `convex/schema.ts` — `precioBaseCOP`, `multiplicador` en `sales`
- `convex/ghl.ts` — `createOrder` resuelve el origen y aplica el multiplicador
- `api/checkout-create-order.ts` — acepta y reenvía `origen`
- `api/_lib/checkoutBody.ts` — valida `origen`
- `api/vitrina.ts` — 403 si un no-admin/embajador pide multiplicador ≠ 1
- `src/hooks/usePermissions.ts` — `canUseMultiplier`
- `src/pages/CartPage.tsx` — «Pagar» para invitados
- `src/pages/vitrina/PublicProductView.tsx` — «Pagar»
- `src/App.tsx` — ruta `/pedido-confirmado/:saleId`

Nuevos:

- `src/components/checkout/CheckoutSheet.tsx`
- `src/pages/PedidoConfirmadoPage.tsx`
- `convex/_lib/precioVitrina.ts` — resolución pura del precio
- `tests/precioVitrina.test.ts`, `tests/checkoutErrores.test.ts`

## Referencias

- `docs/superpowers/specs/2026-08-19-reserva-y-checkout-publico-design.md` — fase 2
- `docs/checkout-publico-proteccion.md` — el WAF que protege el endpoint
- `src/utils/vitrinaPrice.ts` — la fórmula que este spec vuelve autoritativa en servidor
