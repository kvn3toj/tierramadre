# Renacer — el pivote del 31-08 y la Fase 2 (diseño)

> **Vehículo:** spec NUEVO, no enmienda al de 08-25 (ratificado en D-0831-14).
> **Escrito:** 2026-09-01. **Lleva fecha 08-31** porque es el nombre que D-0831-14, la nota
> `Anima/…/TierraMadre/decisions/2026-08-31-renacer-flujo-reunion-pivote.md` §9.3 y el echo
> del Constructor ya citan por ruta; renombrarlo rompería tres referencias vivas.
> **⚠️ "Fase 2" está sobrecargado.** El spec de 08-25 §8.4 llama Fase 2 al _tablero de operaciones
> y despacho por turno_; la reunión del 31-08 llama Fase 2 a la _mitad comercial_. **Este documento
> es la segunda.** El tablero de operaciones es un riel aparte, entregado a otra ventana el
> 2026-09-01. Si una sesión futura busca "Fase 2" y encuentra dos cosas, son dos cosas.
>
> **Estado:** DISEÑO. Ninguna tarea de acá recibe hand-off de ejecución hasta que las
> decisiones del §3 estén cerradas.
> **Predecesor:** `2026-08-25-renacer-qr-flow-design.md`. Ese documento NO se borra ni se
> reescribe: §3.4 (la compuerta de lo impreso) queda congelada verbatim allá y este spec la
> hereda intacta. La tabla del §2 dice, decisión por decisión, qué hereda / qué reemplaza /
> qué difiere.

---

## 0 · Por qué existe este documento

El 2026-08-25 se ratificó un diseño completo: cuatro kits fijos, un código por kit comprado,
la manilla como vehículo del vínculo aportador↔beneficiario. El 2026-08-31, en reunión, ese
modelo **pivotó**: el beneficiario ya no llega por una manilla comprada sino por la invitación
de una **raíz** (líder comunitario que Tierra Mädre conoce y que está en territorio), y el
aportador ya no elige entre cuatro kits sino entre tres caminos.

La Fase 1 de ese pivote está construida y corre en localhost (17 pantallas, commit `9274198`
sobre `feat/renacer-pivote`). Lo que **no** está construido es la mitad comercial: el símbolo
de esperanza, el aporte por producto, la causa elegible al comprar, y el recaudo en los
contadores. Eso es la Fase 2, y es lo que este documento diseña.

**El riesgo que este documento existe para evitar:** que la mitad comercial se construya
re-litigando decisiones que ya se tomaron y se pagaron. Tres de las cuatro piezas de Fase 2
tocan el riel de pago, que está **congelado** y que ya produjo un incidente de WAF 403 el
2026-08-24. Una sesión que llegue a esto sin la tabla del §2 va a "arreglar" algo que se
decidió a propósito.

---

## 1 · La cerca de alcance

**Este spec cubre:**

1. El **símbolo de esperanza** — un producto-regalo de precio único, su SKU, su compra, su
   tarjeta física y el QR que cierra el bucle contra el muro de gratitud que ya existe.
2. El **aporte por producto** — que cada compra del catálogo mueva una bolsa común.
3. La **causa elegible** — el pop-up "¿a qué causa querés aportar?" y su default.
4. El **recaudo** en los contadores y en el tablero público.

**Este spec NO cubre, y lo dice para que nadie lo asuma:**

- **Lo impreso.** §3.4 del spec de 08-25 está congelada. `https://tierramadre.app/renacer/k/{codigo}`
  sigue siendo el único string irreversible del plan. La tarjeta del símbolo introduce un
  SEGUNDO artefacto impreso y por lo tanto una segunda compuerta — §5.3 de este documento.
- **Los envíos internacionales.** D-0831-6, diferido a Fase 4. Contradicción viva y registrada
  (ver §2, decisión 12).
- **El embudo a CoomÜnity.** §8.4 del spec viejo; sigue siendo dirección, no alcance.
- **Las pantallas de Fase 1**, salvo donde Fase 2 las modifica (el hub y el tablero).
- **El hosting del video.** Tarea suelta, no de este riel.

---

## 2 · Hereda / reemplaza / difiere — contra el spec del 2026-08-25

Requisito explícito de D-0831-14. Se recorre la tabla normativa §2 del spec viejo, decisión
por decisión, sin saltarse ninguna: una decisión ratificada que desaparece sin decir que
desapareció es la forma en que un diseño se pierde.

| #   | Decisión de 08-25                                                       | Estado tras el pivote     | Por qué                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Roles: **aportador** / **beneficiario**, nunca "donante"                | ✅ **HEREDA**             | El pivote no tocó el vocabulario. Sigue siendo lenguaje de compra.                                                                                                                                                                                                                                      |
| 2   | **Un código por kit**; el código ES la relación aportador↔beneficiario  | ❌ **REEMPLAZA**          | Ahora el código lo emite una **raíz** por bloque y expresa la relación **raíz↔beneficiario**. La relación aportador↔beneficiario **ya no existe** — y su desaparición es el cambio de fondo del pivote, no un detalle. Los códigos de kit ya emitidos siguen resolviendo (tabla `kits`, camino legado). |
| 3   | Web primero, app después                                                | ✅ **HEREDA**             | Sin cambios.                                                                                                                                                                                                                                                                                            |
| 4   | **4 kits fijos** (1+1, 1+5, 1+10, 1+100), cuadrícula sin calculadora    | ❌ **REEMPLAZA**          | El hub del aportador ofrece **tres caminos**, no una cuadrícula de kits. El símbolo de esperanza es UN producto de precio único.                                                                                                                                                                        |
| 5   | Pasarela **Wompi**, enganchada al riel TM-PAGOS-APP ya vivo             | ✅ **HEREDA** — crítico   | Fase 2 **no inventa otro riel**. Ver §4.                                                                                                                                                                                                                                                                |
| 6   | Flujo beneficiario **mediado en campo**, no self-serve                  | ✅ **HEREDA**             | Reforzado: ahora la mediación es la raíz, con nombre y bloque.                                                                                                                                                                                                                                          |
| 7   | **Necesidades ANTES que datos**                                         | ⚠️ **HEREDA, en disputa** | La reunión del 31-08 dibujó el orden inverso sin registrar que revertía una decisión escrita "no negociable". Vive el orden de 08-25. **D-0831-4**, conmutable en `src/pages/renacer/flujo.ts`.                                                                                                         |
| 8   | Lista de necesidades **abierta / texto libre**, sin categorías forzadas | ✅ **HEREDA, ampliada**   | El texto libre sigue siendo el dato. Las "bolsas" son una etiqueta **opcional** encima, para agrupar — no un formulario cerrado.                                                                                                                                                                        |
| 9   | **Carnet digital** con QR y número, "como la cédula"                    | ✅ **HEREDA**             | Construido. `/renacer/b/{n}?t=` con token opaco (D-1).                                                                                                                                                                                                                                                  |
| 10  | **Turno** — FIFO dentro de tipo de necesidad                            | ✅ **HEREDA**             | `needs.createdAt` sigue siendo el turno. La `prioridad` que la persona escribe informa, **no reordena el despacho**.                                                                                                                                                                                    |
| 11  | URL en dominio TM con ruta `/renacer`                                   | ✅ **HEREDA**             | Congelado en §3.4.                                                                                                                                                                                                                                                                                      |
| 12  | **Internacional sin envíos, nunca**; se resuelve con narrativa          | 🔴 **EN CONFLICTO**       | La reunión del 31-08 pidió tabla de tarifas DHL/Coordinadora con costo visible antes de pagar. Contradice una decisión ratificada. **D-0831-6**, diferido a Fase 4. **Este spec no lo resuelve y no debe leerse como si lo hubiera resuelto.**                                                          |
| 13  | **Precio kit 1+1: $222.000 manillas / $333.000 dijes**                  | ❌ **REEMPLAZA**          | No hay kits. El símbolo es **un** producto a **precio único** para manillas y dijes por igual — la sala fue explícita: "todo va a tener el mismo precio". Cuál es ese precio: **D-0831-1, ABIERTA**.                                                                                                    |
| 14  | Target: colombianos fuera de Colombia                                   | ✅ **HEREDA**             | Y es justo lo que vuelve viva la contradicción de la #12: el target vive afuera y la regla dice que no se le envía.                                                                                                                                                                                     |
| 15  | **Doctrina de tono**: abre por el terremoto, nunca por CoomÜnity        | ✅ **HEREDA**             | Bajo test (`tests/renacerCopy.test.ts`).                                                                                                                                                                                                                                                                |
| 16  | Entrada a CoomÜnity **por mérito**; primero aportadores                 | ⚠️ **DIFIERE**            | El pivote agrega voluntarios (`voluntarios`), que hicieron mérito sin comprar. Quién entra primero se re-decide en Fase 3, no acá.                                                                                                                                                                      |

**Lectura de la tabla:** de 16 decisiones ratificadas, 9 se heredan intactas, 3 se reemplazan
(las tres son consecuencia directa de que el kit dejó de ser el vehículo), 2 quedan en disputa
registrada (#7, #12) y 2 se difieren. **Ninguna se descarta en silencio.**

---

## 3 · Las decisiones que este spec necesita antes de convertirse en plan

Un spec cuyo alcance depende de una decisión abierta no se ejecuta: se espera. Estas son, con
su fila en la cola y lo que cada una bloquea.

| Decisión     | Qué falta                       | Qué bloquea exactamente                                                                                                                                        | Dueño |
| ------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **D-0831-1** | Precio del símbolo              | El SKU no se puede crear. Sin SKU no hay compra, sin compra no hay tarjeta, sin tarjeta no hay QR de gratitud. **Es la raíz de la mitad del §5.**              | Kevin |
| **D-0831-2** | ¿Hay algo impreso ya?           | Si la respuesta es "nada" (el registro está vacío), la compuerta de la tarjeta del símbolo se abre limpia. Si hay tirada previa, entra como legado.            | Kevin |
| **D-0831-6** | Envíos internacionales          | Si se abre, Fase 2 crece con carrier, tarifas y aduana. Si se mantiene cerrada, el símbolo solo se entrega en Colombia y el copy debe decirlo ANTES de cobrar. | Kevin |
| **D-0831-7** | Aporte por producto + causa     | Toca `productInventory`, `sales` y el checkout congelado. Sin ruling no se abre el riel.                                                                       | Kevin |
| **D-0901-3** | Fecha de arranque de la campaña | El contador de días existe y no se pinta. No bloquea Fase 2, pero es de un minuto.                                                                             | Kevin |

---

## 4 · El riel de pago — lo que ya existe, y por qué no sirve tal cual

Row 5 de la tabla del §2 dice "Fase 2 **no inventa otro riel**. Ver §4". Esta es §4, y su
conclusión es incómoda: **el riel existe, funciona, y su modelo de datos es incompatible con
vender el mismo producto dos veces.**

### 4.1 Lo que hay (verificado en el código, 2026-09-01)

| Pieza                         | Dónde                                       | Estado                                                          |
| ----------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| Endpoint público de compra    | `api/checkout-create-order.ts` (285 líneas) | **CONGELADO** (§5.1 del spec 08-25, dueño TM-PAGOS-APP)         |
| Creación de orden             | `convex/ghl.ts:287-530` `createOrder`       | Congelado                                                       |
| Confirmación de pago          | `convex/ghl.ts:548` `markOrderPaid`         | Congelado. **Idempotente** — un replay devuelve `updated:false` |
| Link de pago                  | `api/_lib/wompi.ts`, `checkoutLink.ts`      | Wompi, **solo COP**, link expira a los 30 min                   |
| Única superficie de pago (UI) | `src/components/checkout/CheckoutSheet.tsx` | **NO congelada** — se monta en `CartPage` y `PublicProductView` |

### 4.2 Los cuatro filos, en orden de cuánto duelen

**(1) 🔴 El riel es estructuralmente de UNIDAD ÚNICA. Este es el hallazgo del documento.**

`markOrderPaid` recorre `sale.itemIds` y marca **cada uno** `estado: 'VENDIDA'`
(`convex/ghl.ts:653-694`). Antes de eso, `createOrder` rechaza con `ITEM_RESERVED` cualquier
ítem que otra venta tenga reservado en los últimos 30 minutos
(`convex/_lib/reservas.ts:72-85`, `convex/ghl.ts:484-488`).

Traducido a la campaña: **si el símbolo es UN SKU que compran muchas personas, el segundo
comprador ve "Alguien más está pagando esta pieza en este momento" durante 30 minutos, y
después de la primera compra el SKU queda VENDIDA para siempre.** El riel fue diseñado para
esmeraldas, y una esmeralda es única por definición.

Tres salidas honestas, y hay que elegir una **en este spec**:

| Opción                                                                                           | A favor                                                                                                                              | En contra                                                                                                          |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **(a) Una fila de `productInventory` por unidad** — un stock de N manillas, cada una su `itemId` | Encaja con el riel **sin tocar un archivo congelado**. La reserva y el `VENDIDA` pasan a ser correctos: cada unidad física ES única. | Hay que reponer stock como operación. Si se agotan, la compra falla con `NOT_AVAILABLE` en vez de "agotado".       |
| **(b) `api/renacer-create-order.ts` hermano** que no reserva ni toca `estado`                    | Es la forma que el spec de 08-25 ya anticipó (§5.1: "un endpoint nuevo al lado").                                                    | Duplica la lógica de pago, y hoy **no existe** ninguna ruta de orden que no reserve.                               |
| **(c) Bandera `fungible` en el código congelado**                                                | La más limpia conceptualmente.                                                                                                       | Toca `createOrder` y `markOrderPaid`, que están congelados y ya produjeron un incidente. **Descartada por ahora.** |

**Recomendación: (a).** No porque sea elegante, sino porque es la única que **no toca código
congelado** y porque resulta ser verdad: si TM va a mandar a hacer 200 manillas, esas 200
manillas existen, son objetos, y el inventario ya sabe modelar objetos. La "reposición" que
parece un costo es simplemente decir cuántas hay.

**(2) 🔴 Ninguna compra funciona hoy en producción.** Medido el 2026-09-01:
`POST https://tierramadre.app/api/checkout-create-order` → **403**, con el sobre de error de
Vercel (`{"error":{"code":"403",…}}`), no el de la app (`{success:false,…}`) — o sea, el WAF, no
el handler. Control en la misma medición: `GET /api/health` → 200. La regla es
`checkout-publico-llaves-test`, puesta el 2026-08-24 porque **producción tiene llaves
`pub_test_` de Wompi** y "cualquiera con un link de vitrina puede marcar una esmeralda como
vendida sin pagar".

⇒ **Levantar el WAF es prerequisito de TM-PAGOS-APP, no tarea de Fase 2**, y depende del corte
a llaves `prod_`. Fase 2 puede diseñarse y construirse detrás de eso, pero no puede venderse
nada hasta que ocurra.

**(3) El precio que cobra el checkout NO es el precio que muestra el catálogo.**
`createOrder` lee **`product.precioCOP`** (`convex/ghl.ts:379`) y lanza `PRECIO_NO_DISPONIBLE`
si es 0. El catálogo público muestra **`precioFinalCOP`**. Y `precioCOP` **perdió su columna en
la hoja** (`convex/schema.ts:200-204`): ya no se espeja ni se jala del SOT.

⇒ **El SKU del símbolo tiene que llevar `precioCOP` positivo en Convex.** Ponerle el precio en
la hoja lo hace _verse_ bien y hace que la primera compra falle. Es el error más fácil de
cometer en toda la Fase 2 y por eso queda escrito acá.

**(4) `parseCheckoutBody` es una lista blanca que descarta en silencio.**
Devuelve solo `{contact, items, ambassador_slug, canal_origen, origen}`
(`api/_lib/checkoutBody.ts:176-189`). Una `causa` o una `dedicatoria` añadidas al body **no dan
error: desaparecen.** Ese es el peor modo de falla posible para un dato que el comprador cree
haber dado.

⇒ La causa y la dedicatoria **no pueden viajar en el body actual** sin descongelar el archivo.
Con la opción (a) del filo (1), la salida limpia es que el aporte y la causa se resuelvan
**en el servidor** a partir del SKU y de una elección registrada aparte — nunca aceptando
cifras del cliente, que es además la doctrina de autoridad de precio del 20-08.

### 4.3 Lo que Fase 2 NO va a hacer

No va a arreglar `skip_limit` (§5.3 del spec viejo). REN-1 lo esquivó a propósito porque el
archivo está congelado, y Fase 2 hereda ese esquive: con un SKU de precio fijo validado contra
una tabla del servidor, el techo de 2M deja de ser el control que importa.

## 5 · El símbolo de esperanza

### 5.1 Qué es

Un producto-regalo: una manilla **o** un dije, **a un mismo precio** ("todo va a tener el mismo
precio", sala 31-08). No es un kit, no tiene escalones, no tiene calculadora. Lo compra un
aportador y llega a otra persona, con una tarjeta que dice quién lo sembró.

Lo que el aportador compra no es el objeto: es **el gesto de nombrar a alguien**. Ese es el
motivo por el que la tarjeta y el QR no son accesorios del empaque sino el producto mismo, y
por el que se especifican acá y no en "packaging".

### 5.2 El bucle completo, y qué parte ya existe

```
aportador compra el símbolo          ⏳ no existe — necesita SKU (D-0831-1)
   → escribe una dedicatoria          ⏳ no existe — campo en el checkout
   → TM imprime la tarjeta            ⏳ no existe — artefacto físico
      «Esta esperanza fue sembrada por {nombre}»  + QR
   → el símbolo llega a una persona   ⏳ operación, no software
   → esa persona escanea el QR        ⏳ el QR no existe
      → deja su gratitud en la web    ✅ EXISTE — /renacer/gracias, muro `gratitud`
         → el aportador la lee        ✅ EXISTE — enlazado desde /renacer/ayudar
```

**Cinco de siete pasos no existen; los dos que sí son el final del bucle.** Eso es deliberado y
conviene que la próxima sesión lo entienda: el destino se construyó primero (2026-09-01) porque
era lo único que no dependía de un precio. El QR ya tiene a dónde apuntar.

### 5.3 🚧 SEGUNDA COMPUERTA — la tarjeta impresa

> §3.4 del spec de 08-25 congeló **una** URL impresa: `/renacer/k/{codigo}`. La tarjeta del
> símbolo introduce **la segunda**, y por lo tanto el segundo string irreversible del proyecto.
> Esta subsección NO está ratificada. Nadie manda nada a imprenta hasta que lo esté.

Lo que hay que decidir, y las opciones con lo que cada una foreclosa:

**G-B.1 · ¿A dónde apunta el QR de la tarjeta?**

| Opción                                    | Qué habilita                                                                                        | Qué cuesta                                                                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a)** `tierramadre.app/renacer/gracias` | Una sola plancha para toda la tirada. Imprime hoy. Ya funciona.                                     | El mensaje de gratitud **no se puede atribuir** al aportador que lo provocó: cae en el muro general. El aportador lee "las familias", no "la suya". |
| **(b)** `…/renacer/gracias/{token}`       | Cierra el bucle de verdad: la gratitud queda ligada a esa compra y el aportador recibe **la suya**. | Cada tarjeta es única ⇒ impresión variable (QR distinto por unidad), y un token por orden que hay que generar, imprimir y no perder.                |
| **(c)** `…/renacer/g/{codigo-corto}`      | Intermedio: código corto dictable, como los de invitación.                                          | Adivinable — y acá lo adivinable permite **escribir** en nombre de otro, que es peor que leer.                                                      |

**Recomendación: (b)**, y la razón no es técnica. Toda la campaña está construida sobre que el
vínculo tenga nombre — la raíz que invita, el código que dice de qué comunidad viene la familia.
Un agradecimiento que cae en un muro anónimo es la única pieza del sistema que **rompe** ese
principio justo en el momento en que más importa. Si el costo de impresión variable resulta
prohibitivo, la respuesta correcta es (a) **como primera tirada explícitamente provisional**,
no (c): un token opaco impreso es seguro, un código corto impreso que autoriza a escribir no.

**G-B.2 · ¿Qué dice la tarjeta, exactamente?** Copy de kira, pero el spec fija dos límites:
el nombre del aportador aparece **solo si lo autorizó en el checkout** (es su nombre, no el de
TM para usar), y la tarjeta **no lleva datos de quien recibe** — quien entrega ya está ahí, la
misma regla que mantiene la dirección fuera del carnet.

**G-B.3 · ¿Qué pasa si el símbolo se regala a alguien fuera de la campaña?** La sala habló de
"alguien que te quiera mucho acá en Colombia" (decisión 12 de 08-25). Esa persona no es
damnificada y no tiene carnet, así que **no puede escribir en el muro de gratitud** tal como
está construido hoy (`muro.publicar` exige credencial de carnet, `lib/guardas.ts`). O la
tarjeta de ese caso no lleva QR, o el muro acepta un segundo tipo de autor. Sin decidir.

---

## 6 · Aporte por producto, y la causa elegible

### 6.1 El requisito, en las palabras de la sala

> «Es importante que por cada producto sepamos cuánto se va a aportar. […] estos cinco mil
> pesos, estos diez mil, estos treinta mil.»
> «Estoy mamada de la narrativa del _10% de nuestras compras_. Me la pela. Ni por el putas
> quiero caer ahí.»

Eso fija dos cosas: el aporte es una **cifra en pesos, visible por producto**, y **no es un
porcentaje**. Un porcentaje es precisamente lo que la campaña está tratando de no ser.

### 6.2 Dónde vive la cifra — tres candidatos, y por qué gana el segundo

Hoy no existe: `grep -Eic "aporte|donaci|contribu|recaudo|bolsa|causa"` sobre `convex/schema.ts`,
`sales.ts`, `products.ts`, `ghl.ts`, `checkout-create-order.ts`, `checkoutBody.ts`,
`checkoutLink.ts`, `CheckoutSheet.tsx` y `CartPage.tsx` → **0 en los nueve archivos**.

| Candidato                                       | Costo real                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Campo `aporteCOP` en `productInventory`** | `tests/catalogoPublicoSinUbicacion.test.ts:60-61,85` afirma que público ∪ reservado es **exactamente** el esquema. Un campo nuevo pone el test en rojo hasta clasificarlo, y abre la pregunta de si entra al espejo de Sheets. Toca la tabla caliente.                                                                                             |
| **(b) Tramo derivado de `tipo` / `categoria`**  | `tipo` ya existe (`convex/schema.ts:263`: gema \| bruto \| joya \| insumo \| lote). Una tabla `{tipo → COP}` versionada cuesta **cero cambios en la tabla caliente**. Precedente exacto: `configPrecios` (`schema.ts:513-535`), versionada `by_vigenteDesde`, diseñada para que una corrección entre como fila NUEVA y no reprecie lo ya cotizado. |
| **(c) Solo al momento de la venta**             | Necesario igual (ver 6.3), pero insuficiente solo: sin tramo no hay qué mostrar en la ficha ANTES de comprar, que es el requisito.                                                                                                                                                                                                                 |

**Decisión de diseño: (b) + (c).** El tramo por tipo, versionado como `configPrecios`; y el
**monto resuelto se congela sobre la venta** al confirmar el pago. Las dos cosas, porque cumplen
requisitos distintos: (b) es lo que la ficha promete, (c) es lo que la contabilidad puede
auditar tres meses después sin depender de que el tramo no haya cambiado.

Para (c) hay patrón exacto en la casa: `sales.manualItems` y `sales.lineItems`
(`convex/schema.ts:1128-1155`) son **solo-Convex, jamás empujados a la hoja, jamás pisados por
un pull** — igual que `paymentProvider`, `precioBaseCOP` y `multiplicador` (`:1189-1207`). El
aporte entra por esa puerta y **no toca el espejo de Sheets**, que es donde viven los dos
incidentes de 2026-08-03.

### 6.3 La causa — y la trampa del conjunto abierto

Las bolsas existen y son importables a través de la frontera:
`convex-renacer/convex/lib/bolsas.ts:15-27`, 11 sugeridas, con `normalizarBolsa()` que pliega
acentos y mayúsculas y **crea una bolsa nueva si ninguna encaja**. `api/_lib/renacer-convex.ts:52`
ya re-exporta un módulo de ese directorio, así que el camino técnico está probado.

Pero hay un desajuste semántico que **no se puede pasar por alto**: `BOLSAS_SUGERIDAS` es una
lista **abierta** — el beneficiario escribe la suya. Un destino de dinero necesita un conjunto
**cerrado**: si el comprador puede elegir una bolsa que una sola familia inventó ayer, el
recaudo queda atado a una categoría que puede desaparecer, escribirse distinto, o quedar vacía.

**Decisión de diseño:** la causa que ve el comprador es el subconjunto **cerrado** de las
`BOLSAS_SUGERIDAS` (las 11 canónicas), **nunca** las escritas a mano. Una necesidad en una
bolsa inventada sigue existiendo y sigue en el turno; simplemente no es un destino de dinero
hasta que operaciones la promueva a canónica. Y el **default es la bolsa común** — no una
categoría concreta: por defecto el aporte va al fondo general y elegir es opcional.
Preseleccionar una causa concreta sería decidir por el comprador y desbalancear el reparto
hacia lo que aparezca primero en una lista.

### 6.4 Dónde va el selector

`src/components/checkout/CheckoutSheet.tsx` (378 líneas, 4 `useState`) **no está congelado** y
se monta en exactamente dos lugares (`CartPage.tsx:510`, `PublicProductView.tsx:535`). Añadir un
selector es un cambio contenido en un archivo propio.

Lo caro no es la UI: es que **el valor no tiene a dónde ir** (§4.2 filo 4 — el body lo descarta
en silencio) y que `sales` no tiene campo. Por eso el orden de construcción del §8 pone el
backend antes que el selector: un selector que se pinta y no persiste es peor que no tenerlo,
porque el comprador cree que eligió.

---

## 7 · El recaudo

### 7.1 Lo que hay que cruzar

El recaudo es **el primer objeto del sistema que cruza los dos Convex**, y cruza cuatro
fronteras, no una:

1. **Deployment** — el dinero vive en `valuable-mule-753` (`sales`); el contador lo pinta
   `/renacer/ayudar` y `/renacer/tablero`, que leen `savory-malamute-505`.
2. **Team y facturación** — las lecturas se cobran a `semilla`, que ya está **por encima del
   límite del plan gratis** (medido 2026-08-25: 1.28 GB de lecturas contra 13.5 MB de escrituras).
3. **Auth** — TM usa `ADMIN_SYNC_TOKEN`; Renacer usa `RENACER_APP_TOKEN`/`OPS`. Ninguna
   credencial abarca las dos.
4. **Disparo** — el único instante en que la plata se vuelve real es
   `convex/ghl.ts:548 markOrderPaid`, llamado desde `api/wompi-webhook.ts` / `api/mp-webhook.ts`.

Método: `grep -rln "renacer-convex" api/` → 9 archivos, todos `api/renacer-*.ts`; ninguno importa
`_lib/convex-client` (el cliente de TM). Hoy **nada habla con los dos**.

### 7.2 El diseño

**El webhook de pago empuja; el tablero nunca jala.**

```
Wompi/MP webhook → markOrderPaid (TM, idempotente: replay ⇒ updated:false)
   → si la venta lleva aporte: POST interno → stats.sumarRecaudo (Renacer, ops-token)
      → stats.recaudoCOP += monto            ← 1 documento, patch incremental
         → /api/renacer-contadores lo sirve  ← 1 lectura, caché 60 s
```

Tres propiedades que esto compra y que **no son negociables**:

- **`markOrderPaid` ya es idempotente** (`convex/ghl.ts:626-628`): un reintento del webhook
  devuelve `updated:false`. Es exactamente lo que un contador de dinero necesita — es la razón
  por la que el disparo va ahí y no en otro lado.
- **Nunca un `collect()` sobre `sales`, nunca un `useQuery` vivo sobre `sales`.** `sales` se
  escribe en cada reserva y en cada pago; una suscripción reactiva encima re-lee en cada
  escritura, para cada espectador. Con el team ya sobre el límite, eso no es una ineficiencia,
  es la factura. Se mantiene incremental con el patrón `sumarStat` que ya existe
  (`convex-renacer/convex/stats.ts:31-49`).
- **El campo es aditivo** sobre una tabla de un solo documento que ya se lee a costo 1.

### 7.3 El recaudo hereda la regla del contador de días

`stats.recaudoCOP` arranca **ausente**, no en cero, y la pantalla **no pinta la baldosa** hasta
que haya un peso real — misma regla que `diasDeCampana` (D-0901-3,
`convex-renacer/convex/lib/campana.ts`). Un "$0 recaudado" el primer día no informa: desanima, y
además es indistinguible de "el contador está roto".

### 7.4 Esto revierte una decisión escrita, y hay que decirlo

D-0831-7 difirió el recaudo a **Fase 3**. Este spec lo trae a Fase 2. La razón: el recaudo sin
el aporte por producto no tiene qué contar, y el aporte por producto sin recaudo no tiene dónde
verse — separarlos entrega dos mitades que no funcionan solas. **Se reabre D-0831-7 con esa
razón, no en silencio.**

---

## 8 · Orden de construcción

Cada rebanada termina en algo verificable, y ninguna depende de una decisión abierta que no se
haya cerrado antes de empezarla.

| #   | Rebanada                                                                                                           | Bloqueada por          |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| 0   | **Corte a llaves `prod_` + bajar el WAF.** No es Fase 2; es TM-PAGOS-APP. Sin esto no se vende nada.               | Kevin + TM-PAGOS-APP   |
| 1   | Tabla de tramos versionada (`{tipo → aporteCOP}`), + el aporte visible en la ficha del producto.                   | **D-0831-7**           |
| 2   | `sales.aporteCOP` + `sales.causa` (solo-Convex, fuera del espejo), resueltos **en el servidor**.                   | rebanada 1             |
| 3   | Selector de causa en `CheckoutSheet` (conjunto cerrado, default = bolsa común).                                    | rebanada 2             |
| 4   | `stats.recaudoCOP` + el empuje desde `markOrderPaid` + la baldosa en hub y tablero.                                | rebanada 2             |
| 5   | **El símbolo:** N filas de inventario (§4.2 opción a) con `precioCOP` positivo, `RUTA_SIMBOLO` deja de ser `null`. | **D-0831-1** (precio)  |
| 6   | Dedicatoria + tarjeta impresa + QR de gratitud.                                                                    | rebanada 5 + **G-B.1** |

**La rebanada 0 no es nuestra y es la que manda.** Hoy `POST /api/checkout-create-order`
devuelve 403 desde el WAF (medido 2026-09-01). Todo lo demás se puede construir detrás de eso,
pero nada se puede cobrar.

## 9 · Anexo de objeciones — lo que haría equivocado a este spec

Mismo mecanismo que §12 del spec de 08-25: una sesión futura que crea que algo de acá está mal
lo escribe aquí y **se detiene**. No rediseña alrededor.

**O-1 · "El símbolo debería tener escalones de precio, no uno solo."** Es tentador: más
escalones, más recaudo. Se rechaza porque la sala lo cerró explícitamente y porque el escalón
reintroduce la calculadora que la decisión 4 de 08-25 quitó a propósito. Si el precio único
resulta ser un techo comercial real y medido, esta objeción se reabre **con la medición**.

**O-2 · "Si cada compra aporta, el símbolo sobra."** No: el símbolo es el único camino para
quien quiere aportar **sin comprarse nada a sí mismo**. Quitarlo deja a esa persona sin puerta.

**O-3 · "El muro de gratitud debería aceptar audio o foto."** Probablemente mejor para quien
escribe con dificultad. Se difiere porque duplica la superficie de moderación de un muro
público escrito por personas en crisis, y hoy la moderación es un comando de operador. Primero
la moderación tiene que ser barata; después el medio puede ser más rico.

**O-4 · "El aporte por producto puede calcularse como un % del precio."** Rechazado por la sala
en términos inequívocos: _"estoy mamada de la narrativa del 10% de nuestras compras"_. El aporte
es una **cifra en pesos, visible por producto**. Un porcentaje es exactamente lo que la campaña
está tratando de no ser.

---

## 10 · Verificación — el método de cada afirmación de este documento

Este spec afirma cosas sobre código que otras sesiones van a tratar como hechos establecidos.
El contrato es el de la casa: **toda afirmación negativa carga el método que la estableció.**

Lo verificado por lectura directa, con su método, al 2026-09-01:

- **"El muro de gratitud existe y funciona"** — `/renacer/gracias` responde; `muro:mensajes`
  con `wall:'gratitud'` devuelve 2 mensajes y con `wall:'desahogo'` devuelve 1, conjuntos
  distintos (control negativo corrido contra el deployment `savory-malamute-505`).
- **"Escribir exige credencial de carnet"** — `muro.publicar` llama `resolverBeneficiario`
  (`convex-renacer/convex/muro.ts`), que compara `cardToken` en tiempo constante
  (`lib/guardas.ts`). No hay otro camino de escritura al muro: `grep -n "wallMessages" ` sobre
  `convex-renacer/convex/*.ts` da hits solo en `schema.ts` y `muro.ts`.
- **"El símbolo está deshabilitado, no roto"** — `RUTA_SIMBOLO = null` en
  `src/pages/renacer/flujo.ts`; la tarjeta se pinta con nota honesta, no enlaza.
- **"Los contadores no llevan recaudo"** — `stats.leer` devuelve 5 campos y ninguno es dinero
  (`convex-renacer/convex/stats.ts`); el comentario del archivo dice por qué.

Las tres que decidían el tamaño de Fase 2 estaban marcadas UNKNOWN en el primer borrador de
este documento y **quedaron establecidas** antes de publicarlo:

- **`skip_limit` sigue en el código**, `api/checkout-create-order.ts:112` → `convex/ghl.ts:403`.
  Fase 2 lo esquiva igual que REN-1, con SKU de precio fijo validado en servidor (§4.3).
- **`productInventory` NO tiene campo de aporte**, y ninguna de las tablas de pago tampoco:
  `grep -Eic "aporte|donaci|contribu|recaudo|bolsa|causa"` sobre nueve archivos
  (`convex/schema.ts`, `sales.ts`, `products.ts`, `ghl.ts`, `checkout-create-order.ts`,
  `checkoutBody.ts`, `checkoutLink.ts`, `CheckoutSheet.tsx`, `CartPage.tsx`) → **0 en los nueve**.
- **Sí existe precedente de producto no-esmeralda** (`tipo: 'insumo'`, `convex/migrations.ts:612`),
  pero **siempre `mostrarEnCatalogo:false`**. No hay precedente de una fila publicada, vendible
  y repetible: el símbolo sería la primera. De ahí el filo (1) del §4.2.

Lo que **sigue sin establecerse**, y este spec por lo tanto **no afirma**:

- **La cobertura real de `precioCOP` en producción.** El único dato disponible es un snapshot
  commiteado el **2026-07-14** (`prod_inventory.json`): 136 de 238 filas `DISPONIBLE` con
  `precioCOP > 0`. Es de julio, no de hoy. Medirlo requiere consultar `valuable-mule-753`.
- **Si existe un deployment de Renacer en PRODUCCIÓN.** `CLAUDE.md:345-348` lista solo el de
  dev (`savory-malamute-505`), y `vercel env` no se consultó. Hoy `/api/renacer-*` responde
  404 en producción — la campaña entera está sin desplegar.
- **El estado de las 40 plantillas de WhatsApp.** Sin plantillas aprobadas por Meta no se puede
  iniciar conversación (`GHL/05-META-WHATSAPP.md:13,27`), y la aprobación tarda 24-48 h. Entregado
  a la ventana del panel de operaciones el 2026-09-01 para que lo establezca, no lo asuma.

> **`docs/estado-sesiones.md` de este worktree está 9 días atrasado** y dice que `main` es
> indesplegable, lo cual es falso desde el 2026-08-25. El documento vivo está en la rama
> `docs/estado-sesiones`. Una sesión de Fase 2 que lea la copia del worktree va a creer que no
> puede desplegar.
