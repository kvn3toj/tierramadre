# Etiquetas: el nombre se corta ("Sentir de la M…")

Dos arreglos independientes, en dos rieles distintos. **No hay payload JSON** — esto es
código, no datos, y no toca el SOT ni Convex.

## Contexto

`#545 Sentir de la Montaña` imprime como **"Sentir de la M…"** en el rollo 2-up `T15X30_DUO`.
El nombre en el SOT está limpio (`'Sentir de la Montaña'`, sin espacios dobles ni saltos), así
que no es un problema de datos.

---

# Parte 1 · La vista NIIMBOT (la que produjo el PNG)

**Archivos:** `src/pages/admin/Fotosintesis/labels/LabelDuoPreview.tsx` ·
`src/pages/admin/Fotosintesis/labels/labelSizes.ts` ·
`src/pages/admin/Fotosintesis/labels/labelSizes.test.ts`

## La causa

`LabelDuoPreview.tsx:171-187` dibuja el nombre en la columna rotada 90° con
`whiteSpace: 'nowrap'` + `textOverflow: 'ellipsis'`, a `nombrePx: 11`. El largo disponible es
el del QR (`qrPx: 82`), o sea **~15 caracteres**. El nombre tiene 20.

## El arreglo: bajar el peso al footer

Hoy la columna de `textColPx: 24` se reparte entre nombre (`nombreLeadingPx: 13`) y peso
(`pesoLeadingPx: 11`). Si el peso baja al footer —donde **sobra más de la mitad del ancho**,
como se ve en el PNG: la marca (20 px) + `#545` (~45 px) de 120— la columna entera queda para
el nombre en **dos líneas**.

Eso da ~30 caracteres en vez de 15, **sin tocar el QR y sin bajar el tipo** — que es
justamente lo que los comentarios del archivo dicen que no se puede hacer (8 px se probó y se
rechazó porque a 203 DPI los dígitos se cierran).

### Cambios

**`labelSizes.ts` — `DUO_LAYOUT`:**

| clave | de | a | por qué |
|---|---|---|---|
| `textColPx` | 24 | **26** | dos líneas de nombre: 2 × `nombreLeadingPx` (13) |
| `gutterX` | 5 | **4** | financia 1 de los 2 px nuevos |
| `padRight` | 4 | **3** | financia el otro |

La suma del eje horizontal se mantiene: `5 + 82 + 4 + 26 + 3 = 120` ✅
El eje vertical **no se toca**: `5 + 82 + 8 + 20 + 5 = 120`.

Actualizá también el comentario de `padRight` — hoy dice *"1 px tighter than the rest, to fund
the text column's 24th pixel"*.

**`LabelDuoPreview.tsx`:**

1. En el bloque del nombre (≈171-187): quitar `whiteSpace: 'nowrap'` y poner clamp de 2 líneas
   — `display: '-webkit-box'`, `WebkitBoxOrient: 'vertical'`, `WebkitLineClamp: 2`,
   `overflow: 'hidden'`. Que siga truncando, pero recién pasadas las dos líneas.
2. Sacar el bloque de `peso` (≈190-207) de la columna rotada.
3. Ponerlo en el footer, después de `#{item.itemId}`, horizontal, a `pesoPx` (9). Con
   `marginLeft: 'auto'` para que se apoye en el borde derecho y no compita con el número.

**`labelSizes.test.ts`:** el test *"sizes the text column to exactly the two line boxes"*
(≈167) asegura `nombreLeadingPx + pesoLeadingPx === textColPx`. Esa invariante ya no describe
el layout — ahora la columna son **dos líneas de nombre**. Cambialo a
`nombreLeadingPx * 2 === textColPx` y ajustá el título del test. Los dos tests de las sumas de
ejes deben seguir pasando sin tocarlos.

## Riesgo que quiero que verifiques

El `#545` es a propósito *"the largest text on the cell"* — es lo que un humano lee cuando el
QR se raya. **El peso en el footer no puede competir con él.** A 9 px horizontal debería estar
bien (horizontal a 203 DPI no cierra los dígitos como sí lo hacía rotado), pero generá el PNG
de `#545` y miralo antes de dar por bueno.

## Lo que NO arregla

Nombres de más de ~30 caracteres se van a seguir cortando. Para eso ya existe
`nombreOverrides` en `EtiquetasPage.tsx` (líneas 206, 355, 371, 921): afecta solo a la
etiqueta impresa y nunca escribe en Convex.

---

# Parte 2 · Un `…` espurio en los generadores de Python

**Archivos:** `scripts/gen-etiquetas-tiras.py` (≈95-99) · `scripts/gen-etiquetas-thermal.py` (≈75-79)

Los dos tienen la misma función `wrap()` con la misma guarda:

```python
if len(" ".join(lines)) < len(text):
    ...
    lines[-1] = lines[-1].rstrip() + "…"
```

Compara **cantidad de caracteres** del texto rearmado contra el original. Pero `text.split()`
normaliza espacios dobles y saltos de línea, así que cualquier nombre con espacios sucios da
longitudes distintas **aunque no se haya truncado nada** — y le pega un `…` de mentira.

Verificado contra nombres reales del SOT:

| nombre | len original | len normalizado | |
|---|---|---|---|
| `Canto \nde la Selva` (#244) | 18 | 17 | `…` espurio |
| `Hadas   del Bosque` (#89) | 18 | 16 | `…` espurio |

Y hay más con el mismo vicio heredado de la hoja legacy: **#295 `Portal del \nAlma`,
#218 `Dinastía \nReal`, #171, #245, #234**.

### El arreglo — una línea, en los dos archivos

```python
if " ".join(lines) != " ".join(text.split()):
```

Compara el contenido, no la longitud. Aplicalo en `gen-etiquetas-tiras.py` y en
`gen-etiquetas-thermal.py` — el bloque es idéntico.

---

# Qué me devolvés

1. El diff de los cinco archivos.
2. El PNG de `#545` en `T15X30_DUO` regenerado, con el nombre completo y el peso en el footer.
3. `npm run test:unit` sobre `labelSizes.test.ts` en verde.
4. Un PNG de `#244` o `#89` desde `gen-etiquetas-tiras.py`, para confirmar que el `…` espurio
   desapareció.

No hagas commit ni push sin que yo lo confirme.
