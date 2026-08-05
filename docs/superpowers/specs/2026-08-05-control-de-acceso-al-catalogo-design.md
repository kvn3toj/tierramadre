# Control de acceso al catálogo (proyecto 1 de 2)

**Fecha:** 2026-08-05
**Estado:** diseño aprobado, listo para plan de implementación
**Precede a:** modo invitado sin OAuth (proyecto 2 — ver «Fuera de alcance»)

## Problema

El catálogo completo es público hoy. Sin sesión, sin cookie, sin código de vitrina:

```
$ curl https://tierramadre.app/api/get-treasure-sheets
HTTP 200 — 287.502 bytes
```

Las 23 claves que devuelve por pieza, a cualquiera:

```
item, fechaIngreso, nombre, peso, color, calidad, cantidad, talla, medidas,
medidasValores, categoria, precioCOP, precioInternacional, ubicacion, asesor,
estado, qr, coleccion, caja, asesorActual, estadoAsesor, isJewelry, sheetRow
```

Son ~300 piezas con precio nacional e internacional, ubicación, caja, asesor
asignado, asesor actual y estado de venta. Incluye `sheetRow` — el índice de fila
en la hoja de cálculo, puro detalle interno. `get-newest-products` y `get-asesores`
responden igual de abiertos.

Esto **no lo causa** el modo invitado: ya está así. Pero el modo invitado exige que
el huésped no vea precios, y esa exigencia es imposible de cumplir mientras el
payload los traiga. De ahí que este proyecto vaya primero: sin él, el modo invitado
oculta precios en la UI mientras los sigue enviando por la red.

### La misma página decide cosas opuestas

`/p/:itemId` (el alias corto que imprimen las etiquetas QR) y `/product/:itemId`
resuelven a `PublicProductPage` → `VitrinaContent` → `PublicProductView`. Verificado
en producción con un navegador limpio, sin sesión:

```
Rey Midas · 1.47 CT · ESMERALDA
PRECIO
$ 635.000
[ Consultar por WhatsApp ]
```

`PublicProductView.tsx:115` calcula `formatVitrinaPrice(product.precioCOP, pricing,
trmRate)` y lo pinta en `:261`. Como `PublicProductPage` (`VitrinaPage.tsx:377`) no
lleva vitrina asociada — su propio comentario dice «default pricing» — cae al
`precioCOP` crudo de la hoja.

Es decir: **un visitante anónimo en una página de producto es exactamente el mismo
camino de código que usará un huésped.** «Ocultar precios al huésped» y «mantener
precios al escanear una etiqueta» son la misma página tomando decisiones contrarias.

## Decisiones tomadas

| Decisión                         | Elegido                                                             |
| -------------------------------- | ------------------------------------------------------------------- |
| Entrada al modo invitado         | Abierta, un toque, sin OAuth ni código (proyecto 2)                 |
| Privacidad de precios            | **Del lado del servidor** — nunca se envían, no se ocultan en la UI |
| Campos ocultos además del precio | Lote/trazabilidad, ubicación/estado/cantidad, asesor/proveedor      |
| Selector «Seleccionar Admin»     | Se elimina para todos (proyecto 2)                                  |
| Carrito para huésped             | Sí, como lista de deseos vía WhatsApp (proyecto 2)                  |
| Precio en etiquetas QR           | Sin precio al escanear — **cae solo**, ver «El id no es credencial» |

## Modelo de grants

El servidor resuelve exactamente un grant por petición:

| Grant     | Prueba                                       | Ve                                         |
| --------- | -------------------------------------------- | ------------------------------------------ |
| `staff`   | `Authorization: Bearer <session token>`      | todo (idéntico a hoy)                      |
| `vitrina` | **token estateful de Convex** (`/v/<token>`) | precio curado de las piezas de esa vitrina |
| `anon`    | nada                                         | proyección pública                         |

### El id no es credencial

`VitrinaContent` (`VitrinaPage.tsx:198`) distingue dos formas de vitrina:

```js
const ID_LIST_RE = /^\d+([-,]\d+)*$/;
const isIdList = ID_LIST_RE.test(code); // "368" o "368,412,517"
// si no es id-list → token estateful, se busca en Convex:
//   convexApi.vitrinas.getByToken → {itemIds, currency, multiplier, senderSlug}
```

Y `PublicProductPage` (`VitrinaPage.tsx:379`) llama `<VitrinaContent code={itemId}>`.
O sea: **`/p/368` es, literalmente, una vitrina sin estado de un solo ítem.** Por eso
muestra precio hoy.

De ahí la regla, que es una sola y resuelve dos problemas:

- Una **lista de ids es adivinable** — cualquiera escribe `/v/368,412`. No
  prueba nada, así que **no otorga grant**: resuelve a `anon`.
- Un **token estateful sí es credencial** — es una cadena impredecible (`AB3K9P2Q4R7S`)
  que solo existe si alguien con sesión la acuñó, y el servidor la resuelve contra
  Convex. **Otorga grant `vitrina`** para las piezas que ese documento lista.

Esto hace innecesario firmar los enlaces QR. `/p/368` pierde el precio no por una
regla especial de etiquetas, sino porque un id numérico nunca fue una credencial. Se
descarta así el módulo de firma, su espejo en Convex, el cambio de plantilla de
etiqueta y la reimpresión de las etiquetas ya pegadas.

> **Consecuencia a aceptar:** los enlaces **estateless** de lista de ids dejan de
> mostrar precio. El diálogo actual «Compartir con cliente»
> (`VitrinaShareDialog.tsx`) ya acuña tokens estateful `/v/<token>`, así que lo que
> se comparta de hoy en adelante sigue igual; lo que se rompe son enlaces de
> lista-de-ids ya repartidos. Si alguno está en circulación con un cliente activo,
> hay que re-compartirlo desde el diálogo.

### El token tiene que llegar al API

Hoy **no llega**. `VitrinaContent` conoce el `code` como parámetro de ruta de React,
pero los datos vienen de `useTreasure()` → `/api/get-treasure-sheets`, una llamada
que no lo lleva. Tal como está, un visitante de vitrina resolvería a `anon` y
perdería el precio — rompiendo el producto.

El diseño incluye por tanto: **`useTreasure()` acepta un token de vitrina opcional y
lo envía como `?vitrina=<token>`**, y `VitrinaContent` se lo pasa cuando el `code`
no es id-list. Sin esta pieza el grant `vitrina` es inalcanzable.

## Arquitectura

### Nuevos

**`api/_lib/catalogGrant.ts`** — `resolveGrant(req): Grant`. Lee `Authorization:
Bearer` y lo valida con `isSessionToken`/`verifySessionToken` (ya existentes); si no,
lee `?vitrina=<token>`, descarta lo que haga match con `ID_LIST_RE` y resuelve el
resto contra Convex; si no, `anon`. Nunca lanza.

**`api/_lib/catalogProjection.ts`** — `toPublicItem(item)` y `projectForGrant(items,
grant)`.

> **Lista blanca, no lista negra.** `toPublicItem` **construye** un objeto nuevo
> nombrando los campos seguros, en vez de borrar los sensibles de una copia. Una
> lista negra falla _abierta_: quien agregue un campo y olvide clasificarlo crea una
> fuga silenciosa. La lista blanca falla _cerrada_: un campo nuevo es invisible
> hasta que alguien decida exponerlo. `get-treasure-sheets.ts:160` ya construye
> `TreasureItem` campo por campo desde cabeceras nombradas, así que la proyección
> pública es un segundo constructor más corto sobre el mismo ítem ya parseado.

#### `PUBLIC_KEYS` — lo único que ve `anon`

| Público          | Por qué                              |
| ---------------- | ------------------------------------ |
| `item`           | identidad, ya va en la URL           |
| `nombre`         | identidad                            |
| `peso`           | característica de venta              |
| `color`          | característica de venta              |
| `calidad`        | característica de venta              |
| `talla`          | característica de venta              |
| `medidas`        | característica de venta              |
| `medidasValores` | característica de venta              |
| `categoria`      | navegación/filtrado                  |
| `coleccion`      | navegación/filtrado                  |
| `isJewelry`      | derivado de `peso`, decide el render |

Excluidos, con el motivo por el que no son obvios:

| Excluido                                 | Motivo                                        |
| ---------------------------------------- | --------------------------------------------- |
| `precioCOP`, `precioInternacional`       | la decisión central                           |
| `ubicacion`, `caja`                      | dónde está físicamente la piedra              |
| `estado`, `cantidad`                     | qué hay disponible y cuánto                   |
| `asesor`, `asesorActual`, `estadoAsesor` | quién vende qué                               |
| `fechaIngreso`                           | antigüedad de inventario — señal comercial    |
| `sheetRow`                               | índice interno de la hoja, nunca debió salir  |
| `qr`                                     | derivable de `item`; se omite por minimalismo |

Los campos de media (`imagen`, `thumbnailUrl`, `videoUrl`, `posterUrl`, `tinyThumb`,
`galleryCount`) no los emite este endpoint — llegan por `get-batch-thumbnails` y
`get-drive-images`, que sirven imágenes sin datos sensibles y por eso **no** se
tocan ni requieren cabecera.

### Modificados

Aplican `projectForGrant` antes de responder:

- `api/get-treasure-sheets.ts`
- `api/get-newest-products.js`
- `api/get-inventory-rows.ts`
- `api/get-table.ts`
- `api/get-table-rows.ts`
- `api/get-collection.js`
- `api/get-asesores.ts` — el directorio de asesores es sensible por sí mismo; un
  anónimo no debería poder enumerar la fuerza de ventas.

Frontend — adjuntan `Authorization: Bearer ${readFreshAuthToken()}` cuando hay token:

| Hook                        | Llamada actual                                 |
| --------------------------- | ---------------------------------------------- |
| `useSheetsTreasure.ts:111`  | `fetchWithRetry(url, undefined, {...})`        |
| `useNewestProducts.ts:107`  | `fetchWithRetry(url, undefined, {...})`        |
| `useAsesores.ts:82`         | `fetchWithRetry(url, undefined, {...})`        |
| `useAsesorCollection.ts:59` | `fetch(url)` — **sin init**, hay que agregarlo |

Los tres primeros ya pasan `undefined` como segundo argumento, así que el cambio es
uniforme. `useAsesorCollection` usa `fetch` pelado y es el único que necesita
introducir el objeto de opciones. `useSheetsTreasure` además acepta y reenvía el
token de vitrina (ver «El token tiene que llegar al API»).

### Fuga local: la caché sobrevive al logout

`logout()` (`AuthContext.tsx:192`) llama `clearStoredAuth()` y borra la clave de
invitado, pero **no** toca `TREASURE_SHEETS_CACHE`. El catálogo completo —precios,
asesor, ubicación— queda en `localStorage` después de cerrar sesión.

Sin arreglar esto, todo el trabajo de servidor queda anulado en cualquier equipo
donde un asesor haya iniciado sesión antes: el huésped lee los precios de la caché.
Por eso el diseño incluye:

- la clave de caché incorpora el grant (`treasure:<grant>`), y
- `logout()` limpia las cachés de catálogo.

## Flujo

```
navegador ──GET /api/get-treasure-sheets──▶ resolveGrant(req)
        (+ Bearer si hay sesión                    │
         + ?vitrina=<token> si aplica)             ▼
                                    projectForGrant(items, grant)
                                                   │
        ◀────────── payload proyectado ────────────┘
                    │
                    ▼
           caché bajo `treasure:<grant>`
```

## Manejo de errores

`resolveGrant` nunca lanza: un token mal formado, vencido o falsificado resuelve a
`anon`. Las lecturas de catálogo siguen disponibles, solo traen menos.

Con un matiz: si **se presentó** un Bearer y fue rechazado, la respuesta lo indica
(`tokenRejected: true`) para que el cliente llame `ensureAppSession()` y reintente
una vez. Sin esto, a un asesor cuyo token de 30 días venció en silencio se le
esfumarían los precios y creería que la app se rompió.

Un `?vitrina=<token>` inexistente o vencido en Convex también cae a `anon`, sin
error: el cliente ve la pieza sin precio, no una pantalla rota.

## Despliegue

Las URLs no cambian y ningún consumidor de servidor se ve afectado — verificado:
`ghl-search-products.ts` lee Convex directo y ya está protegido por `bearerMatches`;
`og-product.js` no toca precios. El radio de impacto es solo el navegador.

Dos despliegues, sin bandera que limpiar después:

1. Publicar los endpoints con la proyección `staff` idéntica al payload de hoy;
   confirmar por logs que los asesores están enviando el token.
2. Activar la proyección `anon`.

## Pruebas

- **`toPublicItem`**: `Object.keys(salida) ⊆ PUBLIC_KEYS`, más una comprobación de
  exhaustividad a nivel de tipos que **no compile** cuando `TreasureItem` gane un
  campo sin clasificar. Esto es lo que hace que el diseño falle cerrado.
- **`resolveGrant`**: matriz de sin cabecera / mal formada / vencida / válida /
  `?vitrina=` con id-list (debe dar `anon`) / `?vitrina=` con token real.
- **Integración**: `GET` anónimo a los siete endpoints, afirmando que ninguna clave
  sensible aparece en la respuesta. Es la red que atrapa el caso «alguien agregó un
  endpoint y lo olvidó».
- **E2E**: `/p/1` anónimo no muestra bloque `PRECIO`; `/v/<token>` sí; asesor con
  sesión sí.

## Fuera de alcance

- **Modo invitado (proyecto 2).** Entrada de un toque, navegación sin herramientas
  de asesor/embajador, carrito como lista de deseos, botón «Contactar» único al
  WhatsApp de Tierra Madre **+57 311 305 2755**, y eliminación de
  `AdminSelectDialog` (consumidores: `CartPage.tsx:412` y
  `ProductDetailPage.tsx:920`). Depende de este proyecto para que «sin precios» sea
  cierto en la red y no solo en la pantalla.
- **Lectura por pieza.** Hoy `/p/1` descarga 287 KB —el inventario entero— para
  mostrar una sola piedra: no existe un endpoint por ítem. Un `GET /api/product/:id`
  volvería mínima por construcción la superficie del huésped y recortaría muchísimo
  la carga en móvil. Merece su propio proyecto.
- **Proyección en la capa de datos.** El destino natural es que el lector de
  Sheets/Convex no cargue columnas sensibles salvo que el grant lo permita. Se
  aplaza: hoy esos lectores se comparten con rutas de admin y Fotosíntesis en plena
  migración.
