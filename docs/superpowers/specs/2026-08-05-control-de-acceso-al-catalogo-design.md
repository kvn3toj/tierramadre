# Control de acceso al catálogo (proyecto 1 de 2)

**Fecha:** 2026-08-05
**Estado:** diseño aprobado, listo para plan de implementación
**Precede a:** modo invitado sin OAuth (proyecto 2 — ver «Fuera de alcance»)

> **Un punto sin confirmar.** El precio en etiquetas QR se decidió primero como
> «solo enlaces firmados» y aquí quedó como «sin precio al escanear», tras medir el
> costo de firmar (ver esa sección). El cambio se asumió para no bloquear el
> diseño; **confirmar antes de implementar.** Volver a la decisión original es
> aditivo —un cuarto grant `item`—, no una reescritura.

## Problema

El catálogo completo es público hoy. Sin sesión, sin cookie, sin código de vitrina:

```
$ curl https://tierramadre.app/api/get-treasure-sheets
HTTP 200 — 287.502 bytes
{"item":1,"nombre":"Rey Midas","precioCOP":635000,
 "precioInternacional":200000,"ubicacion":"ASESOR",
 "asesor":"M.Campuzano","estado":"VENDIDA", ...}
```

Son ~300 piezas con precio nacional e internacional, ubicación, asesor asignado y
estado de venta. `get-newest-products` y `get-asesores` responden igual de abiertos.

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

| Decisión                         | Elegido                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| Entrada al modo invitado         | Abierta, un toque, sin OAuth ni código (proyecto 2)                     |
| Privacidad de precios            | **Del lado del servidor** — nunca se envían, no se ocultan en la UI     |
| Campos ocultos además del precio | Lote/trazabilidad, ubicación/estado/cantidad, asesor/proveedor          |
| Selector «Seleccionar Admin»     | Se elimina para todos (proyecto 2)                                      |
| Carrito para huésped             | Sí, como lista de deseos vía WhatsApp (proyecto 2)                      |
| Precio en etiquetas QR           | **Sin precio al escanear** — se descartó firmar los enlaces (ver abajo) |

### Por qué se descartó firmar los enlaces QR

La decisión inicial fue «solo enlaces firmados»: `/p/368.A1B2C3` mostraría precio,
`/p/368` no. Se descartó al medir el costo real.

`LabelPreview.tsx:100` codifica `HTTPS://TIERRAMADRE.APP/P/<id>` en mayúsculas a
propósito: así el QR entra en modo _alfanumérico_ y, con corrección de errores `M`,
queda en versión 2 (25×25) — la densidad que se lee sobre cinta de 12 mm. La
capacidad alfanumérica en nivel M es de **38 caracteres en v2 y 61 en v3**:

| Payload                                  | Caracteres | Versión QR |
| ---------------------------------------- | ---------- | ---------- |
| `HTTPS://TIERRAMADRE.APP/P/368`          | 29         | v2 (25×25) |
| `HTTPS://TIERRAMADRE.APP/P/368.A1B2C3`   | 36         | v2 (25×25) |
| `HTTPS://TIERRAMADRE.APP/P/368.<32 hex>` | 62         | v4 (33×33) |

Una firma completa como la de `cidSigning.ts` empuja el símbolo a 33×33, bastante
más denso sobre 12 mm. Cabía una firma de 6 hex (24 bits) sin cambiar la densidad,
pero el conjunto —módulo de firma nuevo, espejo en Convex, cambio de plantilla de
etiqueta, reimpresión de las etiquetas ya pegadas y una firma deliberadamente
corta— resultó mucha complejidad permanente para un solo beneficio: que un escaneo
muestre precio.

Se optó por que el escaneo muestre la pieza y el CTA de contacto, sin precio. **La
firma es aditiva:** si más adelante hace falta, se agrega un cuarto grant `item` sin
rehacer nada de lo aquí descrito.

## Modelo de grants

El servidor resuelve exactamente un grant por petición:

| Grant     | Prueba                                          | Ve                                         |
| --------- | ----------------------------------------------- | ------------------------------------------ |
| `staff`   | `Authorization: Bearer <session token>`         | todo (idéntico a hoy)                      |
| `vitrina` | código de vitrina (`?cid=` firmado sigue igual) | precio curado de las piezas de esa vitrina |
| `anon`    | nada                                            | proyección pública                         |

`vitrina` es indispensable: un enlace de vitrina existe _para_ mostrar un precio
curado a un cliente concreto. No es una excepción incómoda, es el producto.

## Arquitectura

### Nuevos

**`api/_lib/catalogGrant.ts`** — `resolveGrant(req): Grant`. Lee `Authorization:
Bearer` y lo valida con `isSessionToken`/`verifySessionToken` (ya existentes); si no,
busca código de vitrina; si no, `anon`. Nunca lanza.

**`api/_lib/catalogProjection.ts`** — `toPublicItem(item)` y `projectForGrant(items,
grant)`.

> **Lista blanca, no lista negra.** `toPublicItem` **construye** un objeto nuevo
> nombrando los campos seguros, en vez de borrar los sensibles de una copia. Una
> lista negra falla _abierta_: quien agregue un campo y olvide clasificarlo crea una
> fuga silenciosa. La lista blanca falla _cerrada_: un campo nuevo es invisible
> hasta que alguien decida exponerlo. `get-treasure-sheets.ts:160` ya construye
> `TreasureItem` campo por campo desde cabeceras nombradas, así que la proyección
> pública es un segundo constructor más corto sobre el mismo ítem ya parseado.

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

Frontend:

Estos hooks adjuntan `Authorization: Bearer ${readFreshAuthToken()}` cuando hay
token:

| Hook                        | Llamada actual                                 |
| --------------------------- | ---------------------------------------------- |
| `useSheetsTreasure.ts:111`  | `fetchWithRetry(url, undefined, {...})`        |
| `useNewestProducts.ts:107`  | `fetchWithRetry(url, undefined, {...})`        |
| `useAsesores.ts:82`         | `fetchWithRetry(url, undefined, {...})`        |
| `useBatchThumbnails.ts:128` | `fetchWithRetry(url, undefined, {...})`        |
| `useAsesorCollection.ts:59` | `fetch(url)` — **sin init**, hay que agregarlo |

Los cuatro primeros ya pasan `undefined` como segundo argumento, así que el cambio
es uniforme. `useAsesorCollection` usa `fetch` pelado y es el único que necesita
introducir el objeto de opciones.

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
           (+ Bearer si hay sesión)               │
                                                  ▼
                                    projectForGrant(items, grant)
                                                  │
           ◀────────── payload proyectado ────────┘
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
  código de vitrina.
- **Integración**: `GET` anónimo a los siete endpoints, afirmando que ninguna clave
  sensible aparece en la respuesta. Es la red que atrapa el caso «alguien agregó un
  endpoint y lo olvidó».
- **E2E**: `/p/1` anónimo no muestra bloque `PRECIO`; `/vitrina/:code` sí; asesor
  con sesión sí.

## Fuera de alcance

- **Modo invitado (proyecto 2).** Entrada de un toque, navegación sin herramientas
  de asesor/embajador, carrito como lista de deseos, botón «Contactar» único al
  WhatsApp de Tierra Madre **+57 311 305 2755**, y eliminación de
  `AdminSelectDialog` (consumidores: `CartPage.tsx:412` y
  `ProductDetailPage.tsx:920`). Depende de este proyecto para que «sin precios»
  sea cierto en la red y no solo en la pantalla.
- **Lectura por pieza.** Hoy `/p/1` descarga 287 KB —el inventario entero— para
  mostrar una sola piedra: no existe un endpoint por ítem. Un `GET
/api/product/:id` volvería mínima por construcción la superficie del huésped y
  recortaría muchísimo la carga en móvil. Merece su propio proyecto.
- **Proyección en la capa de datos.** El destino natural es que el lector de
  Sheets/Convex no cargue columnas sensibles salvo que el grant lo permita. Se
  aplaza: hoy esos lectores se comparten con rutas de admin y Fotosíntesis en plena
  migración.
