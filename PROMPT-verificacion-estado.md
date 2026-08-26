# PROMPT — Verificación de estado (SOLO LECTURA)

**Contexto:** se acaba de correr el menú «🔄 Convex Sync → Sincronizar todo (completo)» en el SOT v3.
Este prompt verifica qué aterrizó realmente. **No escribas nada.** Ni en Convex, ni en la hoja, ni en Drive.
Si algo parece que hay que arreglar, repórtalo — no lo arregles.

SOT v3: `1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U`, pestaña `Inventario` (gid 1819792669).
Convex prod: `grand-hippopotamus-162`, tabla `productInventory`.

Entrega **un solo informe** al final con las seis secciones de abajo. Para cada check di
**PASA / FALLA / NO CONCLUYENTE** y muestra el valor real que encontraste.

---

## A. Fuga de datos (máxima prioridad)

1. Lista **todos** los ítems cuyo `observacion` contenga `Piso de negociación` o `INTERNO`,
   con su `itemId`, `nombre`, `mostrarEnCatalogo` y el texto completo.
2. Para cada uno que tenga `mostrarEnCatalogo = true`, llama `products:getPublicByItem`
   **sin credenciales** y confirma si `observacion` viaja en la respuesta.
3. Reporta el conteo. La cifra que traigo de la sesión anterior es **9 ítems publicados**.
   Si ahora son menos, di cuáles desaparecieron; si son más, cuáles se sumaron.

> No limpies nada. El orden correcto es limpiar primero y **después** correr
> `PROMPT-correcciones-546.md`, que escribe `observacion` en modo append y de otro modo
> conservaría y extendería la fuga.

---

## B. ¿El sync realmente aterrizó?

Para **cada** uno de estos ítems, imprime lado a lado el valor en **la hoja** y el valor en **Convex**:

`482, 483, 484, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554`

Campos: `nombre`, `peso`, `color`, `calidad`, `corte`, `medidas` (col I), `costoBaseCOP` (col L),
`precioFinalCOP` (col M), `certificadoUrl` (col AM), `subLote` (col AZ), `coleccion`.

Reglas:

- Localiza las columnas **por encabezado nombrado**, nunca por índice fijo.
- **No leas la columna J (`medidasValores`)** — está deprecada y tiene datos rancios que ya
  provocaron un falso duplicado entre #311 y #441.
- Marca toda fila donde hoja ≠ Convex. Eso es sync que no aterrizó, no un dato a corregir.

---

## C. Aritmética del lote C-090

1. `Lotes!C-090` → imprime `pesoTotalQuilates` y `costoTotalCOP`.
2. Suma el `peso` de los 11 ítems de C-090.
   - Esperado hoy: **21,25**. El lote dice **21,21**. La diferencia de 0,04 es el ajuste
     0,52 → 0,56 de #552. **PASA si reproduces el desfase**, no si coinciden.
3. Recalcula `costoBaseCOP / peso` para los 11 y agrúpalos por tarifa. Esperado:

   | Tarifa | $/ct | Ítems |
   |---|---|---|
   | Alta | 10.058.404 | 545, 546, 549 (544 desvía +0,24%) |
   | Baja | 3.723.563 | 547, 550, 551, 554 (553 desvía −2,33%) |
   | Sin costo | 0 | **548, 552** |

4. Recalcula `precioFinalCOP / costoBaseCOP`. Esperado **×4,5** en todos los que tengan ambos.
   Si alguno da **×2,6**, dilo explícitamente — significa que se le aplicó la fórmula canónica
   en vez de la del lote.
5. `Lotes!C-069` → confirma si `costoTotalCOP` sigue vacío.

---

## D. ¿Se corrió alguno de los 4 prompts pendientes?

Verifica por firma, no por lo que diga el log:

| Prompt | Firma a buscar |
|---|---|
| `PROMPT-correcciones-544.md` | los cambios que declara su payload `scripts/.data/correcciones-544.json` |
| `PROMPT-correcciones-546.md` | ídem con `correcciones-546.json` |
| `PROMPT-produccion-c068.md` | movimientos en `asesorMovements` para C-068 |
| `PROMPT-etiquetas-nombre.md` | `whiteSpace: 'nowrap'` en `LabelDuoPreview.tsx` (~línea 200) y el invariante de `labelSizes.test.ts` |

Para cada uno: **aplicado / no aplicado / parcialmente aplicado**, con la evidencia.

---

## E. Deuda estructural

1. Cuenta y lista los ítems donde `coleccion` contiene un valor que en realidad pertenece a
   `PRODUCT_ESTADOS` (ver `src/data/vocabularies.ts`). Traigo **22** de la sesión anterior
   (#350, #381, #425–#428, #441, #467, #482–#484, #498, #525–#532, …). Confirma el número actual.
2. `convex/schema.ts` → confirma que `certificadoUrl` sigue siendo **un solo campo string**.
   Varios ítems tienen certificado GIA *y* certificado propio de Tierra Mädre; con un campo único
   solo cabe uno.
3. `src/pages/treasure/ProductDetail/ProductDetailPage.tsx` (~línea 325) → confirma que sigue el
   descarte de PDFs:
   ```js
   if (/\.pdf(\?|#|$)/i.test(certUrl)) return mediaItems;
   ```
   Todos los certificados son PDF, así que hoy ninguno puede entrar al carrusel.
4. `scripts/gen-etiquetas-tiras.py` (~95-99) y `scripts/gen-etiquetas-thermal.py` (~75-79) →
   confirma si sigue el `if len(" ".join(lines)) < len(text):`. Compara conteos de caracteres,
   y `text.split()` normaliza dobles espacios y saltos de línea ⇒ "…" falso en #244, #89, #295, #218.

---

## F. Calidad vs. certificado

Los tres reportes GIA imprimen literalmente `Clarity Enhanced (F1)` — o sea **F1/F2 es la escala de
aceitado**, no de fracturas. Con eso:

| Ítem | Calidad en SOT | Lo que dice su certificado | |
|---|---|---|---|
| 544, 545, 550 | F1 | GIA: `Clarity Enhanced (F1)` | coincide |
| 551 | F1 | TM 028563: *"sin indicaciones de embellecimiento"* | **debería ser NO OIL** |
| 552 | F2 | TM 025888: *"sin indicaciones de embellecimiento"* | **debería ser NO OIL** |
| 483, 546 | NO OIL | *"sin indicaciones"* | coincide |
| 484 | Extra Fina F2 | TM 028619: *"**indicaciones** de embellecimiento"* | coincide |

**Lo que hay que verificar:** imprime la `calidad` actual de **549, 553 y 554**. Los tres dicen `F1`
y ninguno tiene certificado leído. Sospecho que ese `F1` se heredó del lote en vez de leerse de un
certificado. **No lo cambies** — solo confirma el valor y di si hay `certificadoUrl` que lo respalde.

---

## Formato de salida

Un informe en markdown, sección por sección, con los valores reales. Al final, una lista de
**lo que hay que arreglar**, ordenada por riesgo, con la fuga de la sección A de primera.
Cero escrituras.
