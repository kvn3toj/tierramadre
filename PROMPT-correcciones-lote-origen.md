# PROMPT — Correcciones del Lote Origen (calidad, medidas, peso, costeo de #552)

**Payload:** `scripts/.data/correcciones-lote-origen.json`
**Generado:** 23-ago-2026 · **Fuente:** presentación "Ver lote Origen" (18 certificados) + PDFs leídos directamente

Lee el payload y aplícalo. Todo lo que hay que escribir está ahí; **no inventes valores** y no
extrapoles a ítems que no estén listados. Si algo no cuadra con lo que ves en la hoja, **detente y
reporta** en vez de improvisar.

SOT v3: `1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U`, pestaña `Inventario` (gid 1819792669).
Convex prod: `grand-hippopotamus-162`, tabla `productInventory`.

---

## De dónde sale esto

Los `F1`/`F2` que tiene el SOT **no son estos certificados** — son otro sistema de calidad interno.
Los certificados reales del Lote Origen no están ni en el SOT ni en Anima: viven solo en la
presentación *"Ver lote Origen"*, que tiene **18 reportes: 9 Extrafine NO OIL + 9 Fine F2 moderado**.

Al cruzar esos 18 contra el inventario aparecieron seis ítems con la calidad mal etiquetada, un peso
mal, y el certificado que resuelve el costeo de #552.

---

## Paso 0 — LIMPIEZA DE LA FUGA (obligatorio, va primero)

Nueve ítems publicados llevan en `observacion` la frase literal
*"Piso de negociación $X (× N) — INTERNO, no se anuncia"*, y **`products:getPublicByItem` la
devuelve sin autenticación**. Cualquiera con el número de ítem lee el piso de negociación.

Ítems afectados: **482, 544, 545, 546, 549, 550, 551, 553, 554**.

Elimina esa frase de `observacion` en los nueve (regex en `paso_0_limpieza_fuga.regex_a_eliminar`).
El resto del texto de `observacion` **se conserva íntegro** — solo se quita esa frase.

Si el piso de negociación debe conservarse como dato, **muévelo a un campo interno que
`getPublicByItem` no proyecte**. No lo dejes en `observacion`.

**Verificación antes de seguir:** llama `products:getPublicByItem` sin credenciales sobre los nueve
y confirma que ni `Piso de negociación` ni `INTERNO` aparecen en la respuesta.

> Este paso va primero porque todo lo que sigue **escribe `observacion` en modo APPEND**. Si corres
> los appends antes de limpiar, conservas y extiendes la fuga.

---

## Paso 1 — Correcciones (7 ítems)

Aplica `correcciones[]`. Cada entrada trae `cambios` (con el valor `de` esperado y el valor `a` a
escribir), la `evidencia`, y el texto exacto para `observacion_append`.

| Ítem | Cambio |
|---|---|
| #549 Luz de la Montaña | calidad `F1` → `NO OIL` |
| #551 Latido de la Tierra | calidad `F1` → `NO OIL` · medidas → `9.58 × 7.01 × 4.16 mm` |
| #553 Alma Ancestral | calidad `F1` → `NO OIL` · **peso `0.86` → `0.84`** |
| #552 Corazón Valiente | calidad `F2` → `NO OIL` · medidas → `5.01 × 5.45 × 4.08 mm` · **`costoBaseCOP = 5632706`** · **`precioFinalCOP = 25347177`** |
| #554 Arrecife | calidad `F1` → `F2` |
| #484 Magia | calidad `Extra Fina F2` → `Fine F2` |
| #483 Gratitud | color → `Verde Vívido` · medidas → `6.02 × 6.78 × 4.35 mm` |

Reglas de escritura:

- **Verifica el valor `de` antes de escribir.** Si el valor actual no coincide, **no escribas ese
  campo** — repórtalo y sigue con el resto.
- `observacion` es **APPEND**, separador ` · `. Nunca reemplaces.
- Las medidas van a la **columna I (`medidas`)**. **No toques la columna J (`medidasValores`)** —
  está deprecada y sus datos rancios ya provocaron un falso duplicado entre #311 y #441.
- **No toques `mostrarEnCatalogo`** (columna Y): es propiedad de Convex, el flujo es Convex → hoja.
- Localiza columnas **por encabezado nombrado**, nunca por índice fijo.
- El orden de ejes de los certificados **se preserva tal cual** (#483 y #552 listan ancho antes de
  largo, natural en corte corazón). No lo "corrijas".

### Sobre #552 — por qué el costo es ese

Su reporte es el **025888**, que cae dentro del bloque del Lote Origen (025887–025893), **no** en la
serie 0285xx del Lote 170. La nota que el ítem ya traía dejaba las dos hipótesis abiertas
(*"Lote 170 → $1.936.253, Lote Origen → $5.230.370"*) y ese $5.230.370 es exactamente
0,52 × $10.058.404. El certificado resuelve la decisión; con el peso corregido a 0,56 ct:

```
costoBaseCOP  = 0,56 × 10.058.404 = 5.632.706
precioFinalCOP = 5.632.706 × 4,5   = 25.347.177   (markup del lote, no el ×2,6 canónico)
```

---

## Paso 1-bis — `certificadoUrl` (8 ítems)

Los certificados **ya están subidos a Drive** (23-ago-2026), con la misma convención que usan los
368 ítems que ya tenían certificado: `fotosintesis/{lote}/{item}-cert/`. Cada carpeta contiene el
**PDF original** y un **JPG de la página 1**.

Escribe en la **columna AM (`certificadoUrl`)** el valor `certificados.items[].certificadoUrl` del
payload. **Usa siempre la URL del JPG**, no la del PDF: `ProductDetailPage.tsx:325` descarta los PDF,
así que un PDF ahí no llega nunca al carrusel.

| Ítem | Lab | Reporte | Carpeta |
|---|---|---|---|
| #483 | Tierra Mädre | 028564 | `C-069/483-cert` |
| #484 | Tierra Mädre | 028619 | `C-069/484-cert` |
| #544 | GIA | 2231993415 | `C-090/544-cert` |
| #545 | GIA | 2235993538 | `C-090/545-cert` |
| #546 | Tierra Mädre | 025893 | `C-090/546-cert` |
| #550 | GIA | 2235993408 | `C-090/550-cert` |
| #551 | Tierra Mädre | 028563 | `C-090/551-cert` |
| #552 | Tierra Mädre | 025888 | `C-090/552-cert` |

Notas:

- La carpeta **`C-090` no existía en Drive** y se creó en esta pasada.
- Los permisos son `anyone / reader / allowFileDiscovery=false`, iguales a los certificados
  existentes. Verificado con lectura anónima: **8/8 devuelven `image/jpeg` 200**.
- **Cada ítem tiene exactamente un certificado subido**, así que la limitación de `certificadoUrl`
  como campo único no estorba todavía. Estorbará en cuanto un ítem tenga GIA *y* certificado propio.
- Esto **sí se aplica a #544, #545 y #550**, aunque su `calidad` esté congelada por el conflicto de
  laboratorio. Adjuntar el certificado no toma partido en la disputa — al contrario, la documenta.

---

## Paso 2 — Lote C-090

`pesoTotalQuilates: 21,21 → 21,25`.

**Ojo:** ese 21,25 asume #552 en 0,56 y #553 todavía en 0,86. Como el paso 1 también baja #553 a
0,84, **recalcula la suma de los 11 ítems después de aplicar las correcciones** y escribe el
resultado real (debería dar **21,23**). No copies un número a ciegas — súmalo.

---

## Paso 3 — NO TOCAR (congelados por conflicto de laboratorio)

**#544 Viaje Estelar, #545 Sentir de la Montaña, #550 Libertad.**

La presentación los da como Extrafine **NO OIL**, pero sus reportes GIA de jun-2026 dicen
`Clarity Enhanced (F1)`:

| Ítem | Presentación | GIA |
|---|---|---|
| #544 | 025890 · NO OIL | 2231993415 · `Clarity Enhanced (F1)` |
| #545 | 025891 · NO OIL | 2235993538 · `Clarity Enhanced (F1)` |
| #550 | 028565 · NO OIL | 2235993408 · `Clarity Enhanced (F1)` |

Las medidas coinciden al centésimo en los tres ⇒ son las mismas piedras. **Deja su `calidad` como
está** (`F1`) hasta que Kevin resuelva cuál laboratorio manda. Tampoco cargues las profundidades
GIA de #545 (4,80 mm) ni #550 (4,16 mm): entran junto con esa resolución.

Lo único que sí se les hace es la limpieza del paso 0.

---

## Paso 4 — TAMPOCO incluido: el recosteo de $29,98 M

**No lo apliques.** Queda documentado aquí para que no se pierda.

La tarifa se asignó **por serie de certificado**, no por el tier que dice el certificado: toda la
serie 0258xx cobró Extrafine ($10.058.404/ct) y toda la 0285xx/0286xx cobró Fine ($3.723.563/ct).
Pero Extrafine cruza las dos series — 028562, 028563, 028564 y 028565 son **Extrafine NO OIL** y
quedaron costeadas a tarifa Fine:

| Ítem | Costo hoy | A tarifa Extrafine | Diferencia |
|---|---|---|---|
| #551 | $5.510.873 | $14.886.438 | +$9.375.565 |
| #550 | $3.723.563 | $10.058.404 | +$6.334.841 |
| #553 | $3.127.793 | $8.449.059 | +$5.321.266 |
| #483 | $0 | $8.951.980 | +$8.951.980 |
| | | **total** | **$29.983.652** |

Bloqueado por dos preguntas abiertas: **(a)** ¿existe factura separada del Lote 170? Si el rate salió
de las tablas Extrafine/Fine y no de una factura, estas cuatro están en la fila equivocada.
**(b)** el conflicto GIA del paso 3, que podría mover la tarifa Extrafine en la dirección contraria.

---

## Paso 5 — Sincronizar y verificar

1. Corre a mano el menú **«🔄 Convex Sync → Sincronizar todo (completo)»**.
   `onEdit` es un trigger simple y **no dispara con escrituras de API**.
2. **Vuelve a leer la hoja** y localiza cada ítem por encabezado nombrado.
   `syncStatus: 'synced'` **no** prueba que aterrizó — en esta misma investigación ya mintió una vez.
3. Confirma que el autofiltro cubre todas las filas con datos. Si el rango se queda corto, los ítems
   nuevos caen fuera del orden y del filtro.

---

## Informe final

Entrega una tabla con: ítem · campo · valor anterior · valor nuevo · **escrito / omitido** · motivo si
se omitió. Más:

- resultado de la verificación anónima del paso 0 (la prueba de que la fuga se cerró);
- el `pesoTotalQuilates` real que calculaste para C-090;
- cualquier valor `de` que no haya coincidido con la hoja.
