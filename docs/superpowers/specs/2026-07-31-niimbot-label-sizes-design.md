# Tamaños de etiqueta NIIMBOT + edición antes de imprimir

**Fecha:** 2026-07-31
**Estado:** diseño aprobado, listo para plan de implementación
**Antecede:** `2026-07-10-niimbot-label-printing-design.md`

## Problema

La pantalla `/admin/products/etiquetas` imprime un único formato: tira continua de
12 mm, altura fija de 96 px, ancho que crece con el contenido. El operador ahora
compra rollo **T15\*30-210 WHITE** — etiquetas troqueladas de 15 × 30 mm — y no hay
forma de seleccionarlo. Además no se puede corregir el nombre de una pieza antes de
imprimir: hay que editar el ítem en Convex, imprimir, y revertir.

## Hallazgo previo: la geometría y el modelo no coinciden

`useNiimbotPrinter.ts` fija `PrinterModel.D11_H`. Según la tabla de modelos de
`@mmote/niimbluelib` (`dist/cjs/printer_models.js`):

| Modelo                       | DPI     | Puntos de cabezal | Ancho imprimible |
| ---------------------------- | ------- | ----------------- | ---------------- |
| `D11`                        | 203     | 96                | 12.0 mm          |
| `D11_H` _(fijado en código)_ | **300** | **142**           | 12.0 mm          |
| `HI_D110` / `HI_NB_D11`      | 203     | 120               | 15.0 mm          |
| `C1` / `EP1C`                | 300     | 178               | 15.1 mm          |

Toda la geometría del código (`LABEL_HEIGHT_PX = 96`, `DEFAULT_PIXEL_RATIO = 203/96`)
está calculada para **`D11`**, no para `D11_H`. El diseño original ya contenía la
contradicción: su línea 23 dice «NIIMBOT D11 tape … at the printer's native 203 DPI»
mientras su línea 59 fija `"D11_H"`.

Consecuencia si la impresora física realmente es un D11_H: el nodo se rasteriza a
`scale: 1`, o sea 96 puntos, y a 300 DPI eso mide 96 / 300 in ≈ **8.1 mm** sobre cinta
de 12 mm — dos tercios del tamaño. Si es un D11, todo lo impreso hasta hoy es correcto
y el `PrinterModel` fijado es simplemente la etiqueta equivocada sobre un
comportamiento correcto.

**No resolvemos cuál es por inspección de código.** El diseño se hace tolerante a
ambos casos en vez de apostar por uno.

### Restricción de ancho

El cabezal del D11 y del D11_H mide 12.0 mm imprimibles. Una etiqueta de 15 mm en su
eje corto excede ese cabezal. Si la impresora del taller pertenece a la familia D11,
el rollo T15\*30 **no imprimirá completo** por más cambios de layout que se hagan — es
límite físico, no de software. Los modelos que sí cubren 15 mm son `HI_D110`,
`HI_NB_D11`, `C1` y `EP1C`.

El usuario confirmó el formato T15\*30-210 WHITE tras conocer este límite. El diseño
por tanto **no bloquea** la selección: advierte y deja imprimir.

## Decisiones de diseño

1. **Ambos tamaños, con selector.** 12 mm continua (actual, por defecto) y 15 × 30 mm.
2. **Layout de 15 × 30:** QR más grande + número de ítem + nombre + peso. Se elimina la
   marca Tierra Mädre — no hay ancho para ella en 30 mm.
3. **Edición previa a impresión:** override por impresión únicamente. Un campo de texto
   que afecta SOLO la etiqueta impresa, nunca `productInventory`. Se descarta al cerrar.
4. **La detección de modelo es consultiva, no autoritativa.** El comentario existente en
   `useNiimbotPrinter.ts` documenta que la autodetección de la librería es poco fiable —
   por eso se fijó el modelo. Mantenemos el modelo fijado para resolver la _tarea de
   impresión_ (`findPrintTask`), y usamos `client.getModelMetadata()` solo para mostrar
   una advertencia de ancho. Nunca impide imprimir.

## Arquitectura

### `labels/labelSizes.ts` (nuevo)

Registro único de formatos. Autoría en píxeles CSS a una **DPI de diseño fija de 203**,
no en milímetros convertidos en tiempo de render — así la vista previa en pantalla no
cambia de tamaño al conectar o desconectar la impresora.

```ts
export const DESIGN_DPI = 203;

export interface LabelSize {
  id: LabelSizeId; // 'T12_CONTINUOUS' | 'T15X30'
  label: string; // texto de UI
  stockCode?: string; // 'T15*30-210' — qué pedir al proveedor
  widthPx: number | null; // null = cinta continua, ancho según contenido
  heightPx: number; // eje corto, el que limita el cabezal
  qrPx: number;
  showLogo: boolean;
}
```

| id               | widthPx | heightPx | mm                | qrPx | logo |
| ---------------- | ------- | -------- | ----------------- | ---- | ---- |
| `T12_CONTINUOUS` | `null`  | 96       | 12 alto, continuo | 80   | sí   |
| `T15X30`         | 240     | 120      | 15 × 30           | 104  | no   |

Helpers: `mmToDots(mm, dpi)`, `printableMm(meta)`, `fitsPrinter(size, meta)`.

### Corrección de escala en impresión directa

`renderLabelCanvas(node, { scale })` ya acepta `scale`. Hoy todos los llamadores usan el
valor por defecto `1`, correcto solo a 203 DPI. Pasa a ser:

```ts
scale = (modelMeta?.dpi ?? DESIGN_DPI) / DESIGN_DPI;
```

- D11 (203 DPI) → `scale: 1` — comportamiento idéntico al actual, sin regresión.
- D11_H (300 DPI) → `scale: 1.478` → 96 px × 1.478 = 142 puntos = 12 mm correctos.

Esto corrige el bug de escala **sin** cambiar nada si la impresora resulta ser un D11.

`DEFAULT_PIXEL_RATIO = 203/96` en `exportLabel.ts` se conserva con su valor numérico
(≈ 2.115): es un factor de sobremuestreo deliberado para que el PNG se vea nítido al
reimportarlo en el editor de NIIMBOT a zoom arbitrario. Solo se corrige el comentario,
que hoy lo describe como «native DPI ÷ CSS-px label height» — una expresión sin sentido
dimensional que invita a «arreglarlo» por error.

### `LabelPreview`

Nueva prop `size?: LabelSizeId`, por defecto `'T12_CONTINUOUS'`. Los otros dos
consumidores (`EditItemDrawer.tsx:789`, `LoteResumenPage.tsx:497`) no se tocan.

Para tamaños troquelados el contenedor pasa de `inline-flex` (encoge al contenido) a
ancho fijo, y la columna de texto recibe `flex: 1; minWidth: 0` con el nombre recortado
por elipsis dentro del troquel en vez de desbordarlo.

`inline-flex` se conserva para la cinta continua — es una restricción documentada de
html2canvas, no una preferencia de estilo (ver cabecera de `LabelPreview.tsx`).

### `useNiimbotPrinter`

Expone `modelMeta: PrinterModelMeta | null`, poblado tras `connect()` vía
`client.getModelMetadata()`. `findPrintTask(PRINTER_MODEL)` sigue usando la constante
fijada. Si la detección devuelve `undefined`, `modelMeta` queda `null` y la UI
simplemente no muestra advertencia de ancho.

### `EtiquetasPage`

- Selector de tamaño en la barra de acciones, persistido en `localStorage`
  (`tm.etiquetas.labelSize`) — se imprime por tandas, no tiene sentido re-elegir.
- Se pasa `size` a ambas instancias de `LabelPreview` (galería y nodo oculto).
- Banda de advertencia cuando `modelMeta` existe y el tamaño elegido excede el cabezal:
  «El rollo de 15 mm supera el cabezal de 12 mm de esta impresora — puede imprimirse
  recortado.» Advierte; no deshabilita.
- Diálogo de override: al pulsar «Imprimir» en una tarjeta se abre un campo con el
  nombre actual; al confirmar se imprime con ese texto. Sin mutación.

### Fuera de alcance

- **Exportación a Excel** (`downloadLabelsSpreadsheet`). NIIMBOT genera el QR desde una
  columna de URL con su propia plantilla; el tamaño se elige allí, no aquí.
- **Selector de modelo de impresora.** Sigue habiendo una sola impresora.
- **Otros formatos NIIMBOT.** El registro admite más, pero solo se declaran los dos en uso.

## Manejo de errores

Sin rutas de error nuevas. La advertencia de ancho es informativa. Los fallos de
impresión siguen por `notify(..., 'error')` con el ZIP como alternativa, tal como hoy.

Un `labelSize` inválido en `localStorage` (rollo retirado del registro, valor manipulado)
cae al tamaño por defecto en vez de romper el render.

## Pruebas

`labelSizes.test.ts` (Vitest, unitario):

- `mmToDots` a 203 y 300 DPI: 12 mm → 96 y 142 puntos.
- `printableMm` para D11 y D11_H → 12.0 mm en ambos.
- `fitsPrinter(T15X30, D11)` → `false`; `fitsPrinter(T12_CONTINUOUS, D11)` → `true`.
- La escala de impresión a 203 DPI es exactamente `1` (garantía de no-regresión).
- Un id desconocido resuelve al tamaño por defecto.

El layout en sí es visual: se verifica renderizando, no afirmando píxeles.

## Riesgo abierto

Cuál es el modelo físico sigue sin confirmarse. Se resuelve midiendo con una regla una
etiqueta impresa: **≈ 8 mm de alto ⇒ es un D11_H** y el arreglo de escala de este
diseño corrige impresiones que hoy salen pequeñas; **≈ 12 mm ⇒ es un D11**, todo lo
impreso hasta hoy es correcto y el `PrinterModel` fijado es solo una etiqueta errónea.
En ambos casos el código de este diseño se comporta bien; la medición solo dice cuál de
los dos efectos se observará.
