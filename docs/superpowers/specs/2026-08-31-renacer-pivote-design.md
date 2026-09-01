# Renacer — el pivote del 31-08 y la Fase 2 (diseño)

> **Vehículo:** spec NUEVO, no enmienda al de 08-25 (ratificado en D-0831-14).
> **Escrito:** 2026-09-01. **Lleva fecha 08-31** porque es el nombre que D-0831-14, la nota
> `Anima/…/TierraMadre/decisions/2026-08-31-renacer-flujo-reunion-pivote.md` §9.3 y el echo
> del Constructor ya citan por ruta; renombrarlo rompería tres referencias vivas.
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

| Opción                                       | Qué habilita                                                                                       | Qué cuesta                                                                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **(a)** `tierramadre.app/renacer/gracias`     | Una sola plancha para toda la tirada. Imprime hoy. Ya funciona.                                    | El mensaje de gratitud **no se puede atribuir** al aportador que lo provocó: cae en el muro general. El aportador lee "las familias", no "la suya". |
| **(b)** `…/renacer/gracias/{token}`           | Cierra el bucle de verdad: la gratitud queda ligada a esa compra y el aportador recibe **la suya**. | Cada tarjeta es única ⇒ impresión variable (QR distinto por unidad), y un token por orden que hay que generar, imprimir y no perder.       |
| **(c)** `…/renacer/g/{codigo-corto}`          | Intermedio: código corto dictable, como los de invitación.                                         | Adivinable — y acá lo adivinable permite **escribir** en nombre de otro, que es peor que leer.                                             |

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
en términos inequívocos: *"estoy mamada de la narrativa del 10% de nuestras compras"*. El aporte
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

Lo que este spec **NO** verificó y por lo tanto **no afirma** — si una sesión futura necesita
estos hechos, los mide, no los hereda de acá:

- Cómo se comporta hoy exactamente el riel de pago bajo el filo `skip_limit` (§5.3 del spec
  viejo) **en el código actual**, no en el spec.
- Si `productInventory` tiene o no un campo utilizable para el aporte por producto.
- Si existe alguna noción de producto no ligado a un ítem físico de esmeralda (necesaria para
  un SKU de símbolo).

> Estas tres son justo las que deciden el tamaño de Fase 2. Están marcadas como **UNKNOWN a
> propósito**: un spec que las adivina produce un plan que se rompe en la primera tarea.
