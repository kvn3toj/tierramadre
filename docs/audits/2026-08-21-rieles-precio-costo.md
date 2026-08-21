# Auditoría de rieles precio/costo — SOT v3

> 2026-08-21 · 41 agentes, 5 rieles auditados, 13 hallazgos confirmados tras verificación adversarial.
> Generada con `Workflow` (auditoria-rieles-precio-costo). Detalle crudo por hallazgo al final.

# Informe para el dueño — riesgos vivos en el SOT v3 y sus rieles

Once hallazgos verificados; consolidados en **9 defectos** (se fusionaron tres pares que eran el mismo problema visto desde dos lados). Ordenados por daño real al negocio, no por elegancia técnica.

---

## 1. Cualquier persona en internet puede saber DÓNDE ESTÁ FÍSICAMENTE cada esmeralda publicada
**`convex/products.ts:576` — `publishedCatalog`** · Confirmado en producción, no es hipótesis.

**Qué se rompe.** La dirección del servidor de datos viaja dentro del código de la página web (es público por diseño). Con eso, sin contraseña ni sesión, se descarga el catálogo completo con campos que nunca debieron salir:

```
curl https://valuable-mule-753.convex.cloud/api/query  →  200 OK, 337 KB
```

**Qué se filtra hoy, medido sobre esa respuesta (443 piezas publicadas):**
- `ubicacion` en **409** piezas: OFI.CALI 217, ASESOR 130, OFI.BOGOTA 36, EMBAJADOR 23, RETORNADO 3
- `asesor` en **310** piezas, con nombres personales completos (una asesora aparece 44 veces)
- `caja` (estado contable) en **180**: "Legalizada" 113, "Pte Legalizar" 3, "Pte Fecha x Legalizar" 11
- `qr` en 428, `asesorActual` en 34, `estadoAsesor` en 54

El costo sí está protegido (`costoBaseCOP` no aparece en ninguna de las 443). El resto entró sin que nadie lo decidiera: el riel viejo (Google Sheets) borra esos mismos siete campos para todo el que no sea staff; el riel nuevo (Convex) los sirve a cualquiera. Además el navegador del visitante los **guarda en su disco** (caché local).

Para un negocio de esmeraldas esto no es un tema de privacidad: es un inventario geolocalizado de piedras de alto valor, abierto.

**Arreglo mínimo.** Borrar seis líneas de la proyección: `ubicacion`, `asesor`, `qr`, `caja`, `asesorActual`, `estadoAsesor`. Se queda `coleccion` (es público) y se queda `estado` (la web pinta "disponible/vendida" desde ahí). Verificado que **el staff no pierde nada**: sigue recibiendo esos campos por el riel autenticado de Sheets. Aplicar el mismo recorte a `getPublicByItem` (products.ts:368), que es su espejo. Agregar un test que exija lista blanca explícita, para que el próximo campo nuevo no se filtre solo.

---

## 2. El endpoint de cotizaciones no pide credencial: entrega teléfonos de clientes y permite borrar cotizaciones ajenas
**`api/cotizacion-save.ts:1104` (lectura) y `:1237` (borrado)** — mismo defecto, misma raíz: nunca se escribió la puerta.

**Qué se rompe.** Tres puertas abiertas, encadenables sin conocer nada de antemano:

1. `GET ?action=stats` → devuelve las 20 cotizaciones más recientes con **correo del asesor, nombre del cliente y monto**, más el ranking de asesores con sus correos. Con eso ya se tiene el roster.
2. `GET ?email=<asesor>` → por cada cotización de ese asesor: nombre del cliente, **teléfono del cliente**, monto, id.
3. `DELETE ?id=…&email=…` → con el par que el paso 2 acaba de entregar: **borra el PDF de Google Drive de forma permanente** (no va a papelera) y **limpia la fila de la hoja**. Sin bitácora, sin respaldo, sin forma de recuperarlo.

El endpoint hermano (`cotizacion-reports.ts`) ya tuvo exactamente este incidente y lo cerró — su propia cabecera documenta "un GET anónimo respondió 200 con 19 registros, 7 teléfonos, 3 correos". La misma información vive en `CotizacionesAsesores` y ahí la puerta nunca se puso. El POST tiene el mismo agujero en sentido de escritura (cualquiera puede insertar cotizaciones falsas con datos de cliente).

**Arreglo mínimo.** Copiar el candado que ya existe en `cotizacion-reports.ts` (verificación de token de sesión) y ponerlo como primera línea de GET, POST y DELETE. Clave: el `email` del parámetro **deja de ser la autorización** — el dueño se toma del token verificado. Requiere agregar la cabecera `Authorization` en cuatro archivos del front (mismo commit, si no se rompe el tablero). Aparte: cambiar el borrado permanente de Drive por "mover a papelera" y marcar la fila como anulada en vez de limpiarla, para que un borrado deje rastro recuperable.

---

## 3. Piezas DISPONIBLES que se muestran como VENDIDAS en los perfiles públicos de embajador
**`api/get-treasure-sheets.ts:269-283`** — fusión de tres hallazgos: es un solo bloque de código con un solo mecanismo.

**Qué se rompe.** Ese bloque lee la hoja **por posición de columna** con los números del libro viejo. El SOT v3 tiene dos columnas más en el medio, así que los números apuntan al vecino equivocado. Y se dispara no solo cuando falta el encabezado, sino **cada vez que la celda correcta está vacía** — que es el caso normal.

Medido leyendo la hoja de producción (576 filas):

| Campo que se pide | Columna que realmente lee | Filas afectadas hoy |
|---|---|---|
| `asesorActual` | **CAJA** | **195** |
| `coleccion` (público) | **ESTADO** | **204** |
| `caja` | QR | ~360 |
| `estadoAsesor` | preponderancia (un %) | 8 de 30 muestreadas |
| `estado` | UBICACIÓN | latente (hoy no dispara) |

**El daño concreto, con nombre y número:** cuando `asesorActual` hereda el valor de CAJA ("Legalizada", o incluso la URL `https://tierramadre.app/p/182`), el sistema concluye que la pieza fue transferida a otra persona y la marca **VENDIDA**, la saca del listado de comprables y la cuenta como no disponible.

- **16 piezas** están hoy en ese estado: DISPONIBLE + con asesor asignado + con el dato contaminado. 14 de TMÄ, 1 de Isa Portocarrero, 1 de Mario Gómez.
- Caso reproducible: **ítem 182 "Secreto de Tena"**, disponible, asignada a Isa (embajadora con perfil público) → su perfil la muestra vendida.

Además, `coleccion` es un campo **público**: los 204 ítems sin colección salen al visitante anónimo con la insignia "DISPONIBLE" / "VENDIDA" / "Retornado" como si fuera el nombre de una colección, y el desplegable de filtros del catálogo se llena con esos estados.

**Arreglo mínimo.** Una función de tres líneas que solo permita el respaldo posicional cuando el encabezado **no existe** (nunca cuando la celda está vacía), y aplicarla a todo el bloque. En el SOT todos los encabezados existen, así que el respaldo queda desactivado por completo; el libro viejo, si alguna vez se lee, sigue funcionando. Es un cambio estructural: cubre también el próximo campo que alguien agregue.

---

## 4. Las fórmulas de "Costo lote" de la hoja se están destruyendo — 72 filas ya rotas
**`api/admin-product-update.ts:219`** · Daño consumado, medido en el libro vivo.

**Qué se rompe.** El bloque de columnas AQ–BE está marcado en el código como "se leen; no se escriben nunca". La promesa no se cumple: el programa **lee esas celdas como texto de pantalla y las vuelve a escribir**. Una celda que contiene una fórmula vuelve convertida en el número (o el símbolo) que se veía.

Estado real de la columna AR ("Costo lote (fórmula)"), sobre 576 filas:
- **441** conservan la fórmula `=IFERROR(VLOOKUP(...)*U)` — sanas
- **72** ya no tienen fórmula: tienen el **texto literal `-`** (el guion que el formato contable muestra cuando el resultado es cero). Ítems 80, 89, 93, 97, 100, 170, 171, 172, 175, 182, 233, 234, 236, 241, 244, entre otros.
- **63** quedaron con la celda **vacía**: son las filas creadas por el alta de producto, que estampa blancos sobre todo el bloque.
- **4 celdas de plata** quedaron con el texto `-` en vez de número: AV/AW del ítem 276, AW del 339 y del 381.

Cada edición de admin sobre un ítem rompe una fila más. El bloque se ensanchó el 30 de julio; lleva ~3 semanas acumulando. Consecuencia: el costo del lote **deja de recalcularse** en esas filas y nadie se entera, porque el número que quedó parece correcto.

*(Dos temores del reporte original que descarté: las fechas no se corrompen por este camino, y el redondeo de montos hoy es teórico porque los pesos son enteros. Lo probado es la fórmula y el cero.)*

**Arreglo mínimo.** Que la escritura salte el bloque AQ–BE: en vez de escribir la fila entera de A a BF, escribir dos tramos (A–AP y BF) y no incluir nunca las columnas hoja-primero en el envío. Lo mismo en el alta de producto. Para lo que sí queda dentro del tramo escrito, leer con "formato fórmula" en vez de "texto de pantalla". **Reparación aparte** (script con respaldo y ensayo previo): restaurar la fórmula en las 72 filas copiándola de cualquiera de las 441 sanas, y poner 0 en las 4 celdas de plata.

---

## 5. Bomba armada: la próxima piedra nueva se escribe con el mapa de columnas equivocado — el PRECIO DE VENTA recibe la UBICACIÓN
**`convex/products.ts:1201`** — fusión de dos hallazgos idénticos.

**Qué se rompe.** El programa decide qué mapa de columnas usar según si la pieza pertenece a un lote: con lote usa el mapa nuevo, sin lote usa el mapa viejo de 21 columnas. Esa decisión tenía sentido cuando eran **dos libros distintos**. Hoy `SPREADSHEET_ID` y `FOTOSINTESIS_SPREADSHEET_ID` apuntan al **mismo libro y la misma pestaña** (verificado: `1oRw1KSh…`, pestaña "Inventario", única coincidencia). El mapa viejo escribiendo sobre la hoja nueva queda corrido dos columnas de la L en adelante:

- **M (PRECIO DE VENTA) ← la UBICACIÓN** ("Bóveda"), o en blanco si no hay ubicación
- O (UBICACIÓN) ← el estado · Q (ESTADO) ← la colección · R (QR) ← la caja · T (CAJA) ← el asesor · **U (preponderancia) ← el estado del asesor**

Segundo golpe encadenado: como el estado nunca llega a su columna, una **venta jamás vuelve al sistema** — la piedra sigue figurando disponible.

**Estado hoy: latente, no consumado.** Leí las 576 filas: **las 576 tienen lote**, la columna U no contiene ni un texto de estado y O solo tiene ubicaciones legítimas. No hay huella de que esto haya disparado.

**Pero está armado y con mecha corta:** el alta de producto ("+ Nueva piedra") **nunca asigna lote**, así que toda piedra nueva sale por el mapa viejo. Y cancelar un lote o quitarle un ítem deja la pieza sin lote: la siguiente edición o entrega a asesor le pisa el precio de venta.

**Arreglo mínimo.** Dos partes, en este orden: (a) una guarda de tres líneas que **rechace con error ruidoso** cualquier escritura con el mapa viejo cuando los dos identificadores de libro coinciden — así el error grita en vez de corromper en silencio; (b) eliminar la decisión por lote: un solo libro, un solo mapa. **Ojo:** (b) sin el arreglo del punto 6 abre otro agujero, porque el mapa nuevo sí escribe costo y precio. Van juntos.

---

## 6. El sistema puede borrar el costo que usted teclea a mano en la hoja
**`convex/products.ts:1255` y `:1276`**

**Qué se rompe.** Las columnas **L (costo)** y **M (precio)** son propiedad de la hoja desde el 23–24 de julio: un humano las teclea. Pero cada vez que el sistema empuja un cambio hacia la hoja, manda esas dos columnas igual, y cuando no las conoce **manda vacío** — lo que borra la celda.

El camino de vuelta (hoja → sistema) **no es automático**: los dos procesos programados están apagados y el pull diario ni siquiera trae esos dos campos. Solo suben cuando alguien aprieta "🔄 Convex Sync". Escenario: usted teclea el costo del ítem 0412, no aprieta el botón, y esa tarde alguien entrega la pieza a un asesor o le cambia una foto → el costo se borra, y como el sistema nunca lo aprendió, **no queda copia en ningún lado**.

Agravantes verificados: (a) al pegar una pieza existente dentro de un lote, el sistema empuja de inmediato con costo/precio vacíos; (b) el botón "🔄 Convex Sync" **no rescata** el dato si la pieza tiene un envío pendiente — se salta la fila en silencio, justo en el caso que importa; (c) las piezas nacen con costo 0 como marcador de "todavía no lo tecleé", y ese 0 es indistinguible de un costo real.

El código ya sabe cómo se resuelve: el campo `preponderancia` tiene exactamente esta protección desde hace tiempo. A las dos columnas de plata no se les aplicó.

**Arreglo mínimo.** Que el envío **omita** costo y precio cuando el sistema no los conoce (mismo patrón de `preponderancia`, dos líneas). Y que un costo 0 nunca gane contra un número tecleado en la hoja. Verificación obligatoria: no basta con que la operación responda "OK" — hay que releer la hoja por nombre de columna.

---

## 7. Una sincronización completa puede borrar de quién es la custodia de una pieza
**`convex/_lib/sheetPullMaps.ts:122`**

**Qué se rompe.** Es el mismo mecanismo que costó **9 fotos el 15 de agosto**: cuando la hoja trae una celda vacía, el sistema escribe el vacío en lugar de ignorarlo. Por eso las fotos se sacaron de la lista de campos sincronizados. `asesorActual` y `estadoAsesor` quedaron adentro, y hoy esos campos los escribe la app (al entregar una pieza a un asesor), no la hoja. Si esa celda está en blanco en la hoja, la próxima sincronización completa **borra el nombre de quien tiene la pieza**.

**Alcance real (más chico de lo reportado):** la pieza NO desaparece del listado de asesores ni del selector de devolución — eso lo verifiqué y es falso. Lo que sí pasa: el inventario pierde el nombre del custodio, el diálogo de devolución sale en blanco y el operador tiene que recordar a quién se la entregó — con riesgo de registrar la devolución a nombre equivocado. Y el kardex y el inventario dicen cosas distintas de la misma piedra.

**Arreglo mínimo.** Sacar esos dos campos de la lista de sincronización hacia el sistema, igual que ya se hizo dos veces en ese mismo archivo. Siguen bajando del sistema a la hoja; solo deja de subir la dirección contraria. Contrapartida asumida: una entrega anotada a mano en la hoja ya no sube sola — el canal es la app.

---

## 8. Una migración ya ejecutada sigue disparable y desordena un lote (bajo)
**`convex/migrations.ts:1382` — `migrateChatonesToC065`**

Mueve 9 ítems fijos (449, 454, 456, 458, 460, 463, 464, 465, 466) al lote C-065 **sin mirar dónde están hoy**. Si se vuelve a ejecutar: aunque ya estén donde deben, les asigna a los nueve **el mismo número de orden** dentro del lote (colapsa el orden), genera 9 registros de auditoría vacíos y 9 envíos innecesarios a la hoja. Y si alguno se reasignó a otro lote desde entonces, lo arranca de ahí. Su propia documentación dice "es idempotente" y no lo es.

**Arreglo mínimo.** Salida temprana: si la pieza ya está en el lote destino, no tocar nada. Y un parámetro "esperaba encontrarlo en C-039" que impida mover lo que ya fue reubicado a propósito.

---

## 9. Una tarea programada quedó abierta al público (bajo)
**`convex/clients.ts:398` — `pullAsesoresFromSheet`**

Está declarada como función pública sin credencial: cualquiera que conozca la dirección del servidor (que va en el código de la web) puede dispararla sin argumentos. No permite inyectar datos falsos —solo copia la hoja de Asesores— así que el daño es de **costo y cuota**: cada disparo consume una lectura completa de Google Sheets, una función de Vercel y una lectura de tabla entera. Filtra además el número de asesores.

*(Refuté la parte del reporte que decía que deja filas en estado pendiente: el comparador solo escribe lo que realmente cambió.)*

El patrón correcto ya existe tres archivos más allá (`products.ts`), donde la tarea programada usa una función **interna**.

**Arreglo mínimo.** Cambiar `action` por `internalAction` y apuntar la tarea programada al espacio interno. Dos líneas. Revisar en la misma pasada `clients._pushToSheet`, que también es pública pese al guion bajo.

---

## Orden de ejecución

**Esta semana, en este orden:**

1. **#1 y #2 juntos** (fugas). Son los únicos que exponen datos hacia afuera y no requieren coordinar con nadie: son recortes y candados, sin migración de datos. #1 es de una sola tarde. #2 obliga a tocar el front en el mismo commit (si no, se rompe el tablero de admin).
2. **#3** (piezas fantasma vendidas). Una función de tres líneas, arregla 195 filas y devuelve 16 piezas al circuito de venta el mismo día del despliegue. Mejor relación esfuerzo/retorno de la lista.
3. **#4** (fórmulas). Dos pasos: primero frenar la hemorragia (dejar de escribir el bloque AQ–BE), después reparar las 72 filas con un script con respaldo y ensayo previo. No reparar antes de frenar, o se vuelve a romper.

**La semana siguiente, como un solo bloque:**

4. **#6 y luego #5**, en ese orden estricto. Arreglar #5 sin #6 cambia un agujero por otro. Juntos cierran definitivamente la familia "el sistema borra la plata de la hoja".
5. **#7**, en el mismo despliegue que #6 si es posible (mismo archivo de reglas de sincronización, mismo criterio: un vacío nunca significa "borrá").

**Pueden esperar:**

6. **#8** — solo se activa si alguien vuelve a correr esa migración a mano. Basta con no correrla; el arreglo entra cuando se toque ese archivo por otra razón.
7. **#9** — costo, no datos. Dos líneas, entra en cualquier despliegue.

**Un criterio que atraviesa los nueve, y que ya costó tres incidentes:** *un cero, un blanco o un valor por defecto que rellena un campo vacío es un dato inventado con forma de dato* — y a las 24 horas no se distingue de uno medido. Cuatro de estos nueve defectos son esa misma frase, escrita en cuatro archivos distintos.

---

## Anexo — hallazgos crudos con evidencia

### [ALTA] Todo push de un ítem SIN loteId escribe el layout legacy A:U de 21 columnas encima de la fila del SOT: la columna M (precio de venta) recibe la UBICACIÓN

- **Archivo:** `convex/products.ts:1201`
- **Familia:** posicional · **Confianza:** seguro

**Escenario.** `pushToSheet` elige el riel por la presencia de loteId: `const sheetTarget = row.loteId ? 'fotosintesis' : 'legacy';` (products.ts:1201). Del otro lado, `api/admin-product-update.ts:181-182` hace `const isFoto = target === 'fotosintesis' || Boolean(loteId); const spreadsheetId = isFoto ? FOTOSINTESIS_SPREADSHEET_ID : SPREADSHEET_ID;` — y HOY las dos envs apuntan al MISMO libro (SOT v3), y `targetSheet` se resuelve con el mismo `findSheetByPattern(['inventario'])`, o sea la MISMA pestaña. Con `isFoto === false` el endpoint arma `merged = new Array(21)` y hace `values.update` sobre `A{fila}:U{fila}` con el mapeo posicional del libro viejo, que a partir de L está corrido dos columnas respecto del SOT.

Daño exacto por push (el SOT es L=costoBaseCOP, M=precioFinalCOP, N=(sin uso), O=UBICACIÓN, P=ASESOR, Q=ESTADO, R=QR, S=Colección, T=CAJA, U=preponderancia):
 · M (precioFinalCOP) ← `fields.ubicacion` → el PRECIO DE VENTA queda reemplazado por «Bóveda» o, si la ubicación está vacía, por blanco.
 · N ← asesor · O (UBICACIÓN) ← estado · P (ASESOR) ← qr · Q (ESTADO) ← coleccion · R (QR) ← caja · T (CAJA) ← asesorActual · U (preponderancia) ← estadoAsesor.

Segundo golpe, encadenado: como `estado` cayó en O y no en Q, la venta NUNCA llega a la columna de estado. En el siguiente pull, `coerceCell('estadoInv', …)` lee la Q — que ahora tiene la `coleccion` — y `normalizeInvEstado('')` devuelve `'DISPONIBLE'` (sheetPullMaps.ts:335). La piedra vendida vuelve a Convex como disponible.

Entrada concreta que lo dispara: vender una pieza legacy. `sales._create` agenda `api.products.pushToSheet` para cada itemId (sales.ts:237-247); si esa fila de productInventory no tiene loteId, se toma el riel legacy. Mismo efecto con cualquier `products.saveEdit` / `saveEditMany` / `retryPush` / `saveEditViaBot` sobre una fila sin loteId. Que esas filas existen y son mayoría lo dice el propio código: `publishedCatalog` filtra «legacy/orphan rows without a loteId» contra «thousands of legacy rows» (products.ts:530, 520), y `_upsertManyFromSheet` inserta filas nuevas SIN loteId (products.ts:1885-1900). Además `lotItems._remove` y `lots._cancel` fabrican huérfanos nuevos poniendo `loteId: undefined`.

**Evidencia.**
```
convex/products.ts:1201
      const sheetTarget = row.loteId ? 'fotosintesis' : 'legacy';

api/admin-product-update.ts:181-182
    const isFoto = target === 'fotosintesis' || Boolean(loteId);
    const spreadsheetId = isFoto ? FOTOSINTESIS_SPREADSHEET_ID : SPREADSHEET_ID;

api/admin-product-update.ts:372-393 (rama legacy)
      merged = new Array(21).fill('');
      ...
      // Column M — ubicación
      if (fields.ubicacion !== undefined) merged[12] = s(fields.ubicacion);
      // Column N — asesor
      if (fields.asesor !== undefined) merged[13] = s(fields.asesor);
      // Column O — estado
      if (fields.estado !== undefined) merged[14] = s(fields.estado);

api/_lib/fotosintesis-inventory-columns.js:74-82 (lo que REALMENTE hay en esas columnas)
  { header: 'costoBaseCOP', key: 'costoBaseCOP', numeric: true }, // L
  { header: 'precioFinalCOP', key: 'precioFinalCOP', numeric: true }, // M
  { header: '(sin uso)', key: '_sinUso', preserve: true }, // N
  { header: 'UBICACIÓN', key: 'ubicacion' }, // O

api/_lib/constants.js:70-77
export const SPREADSHEET_ID = requireSheetId('SPREADSHEET_ID');            // «Catálogo + Asesores + Modelo-Precios → SOT v3»
export const FOTOSINTESIS_SPREADSHEET_ID = requireSheetId('FOTOSINTESIS_SPREADSHEET_ID'); // «SOT v3»
```

**Veredicto del verificador.** CONFIRMADO en los cuatro ejes.

(1) El código existe tal cual. convex/products.ts:1201 `const sheetTarget = row.loteId ? 'fotosintesis' : 'legacy';` y api/admin-product-update.ts:181-182 `const isFoto = target === 'fotosintesis' || Boolean(loteId); const spreadsheetId = isFoto ? FOTOSINTESIS_SPREADSHEET_ID : SPREADSHEET_ID;` son literales. ÚNICA imprecisión del hallazgo: la rama legacy no está en 372-393 sino en **274-321** (275 `merged = new Array(21).fill('')`, 306 `// Column M — ubicación / merged[12] = s(fields.ubicacion)`, 310 `merged[14] = s(fields.estado)`). Es un error de numeración, no una alucinación.

(2) No hay guard. El único filtro del endpoint es el shared secret `x-admin-sync-token`; después de eso nada compara SPREADSHEET_ID con FOTOSINTESIS_SPREADSHEET_ID, y `targetSheet` se resuelve con el MISMO `findSheetByPattern(sheetNames, ['inventario','inventory'])` en las dos ramas — misma pestaña. .env.local y .env.example llevan las dos variables al mismo id `1oRw1KSh8L…`. `verificaDestinoDeEscritura` (products.ts:1174) sólo impide que dev escriba al SOT; en prod deja pasar.

(3) La rama legacy NO es código muerto, y la prueba está en el propio archivo: el docstring del endpoint (líneas 14-15) todavía afirma que el layout A:U es «read by get-treasure-sheets for the public catalog», pero api/get-treasure-sheets.ts:379-380 lee `spreadsheetId: SPREADSHEET_ID, range: `${targetSheet}!A:${FOTO_INVENTARIO_LAST_COL}`` — el SOT con layout ancho. El libro legacy dejó de existir; quedó sólo la rama que lo escribe.

(4) Las filas sin loteId existen y se tocan a diario. `_pullFromSheet` (products.ts:1704) baja el SOT por get-treasure-sheets y `_upsertManyFromSheet` (1885-1900) inserta SIN loteId — el campo no está en `cleanedFields`. `products.list:155` lo dice literal: «Undefined on legacy rows (they predate the field)», y devuelve la tabla completa al drawer de /admin/products (ProductManagementPage.tsx:275 `convexApi.products.list`, :325 `saveEdit`). `sales._create` no exige loteId (sales.ts:190-204) y `asesorMovements` entrega tampoco (188-192); ambos agendan `api.products.pushToSheet`. Como el itemId sí está en la columna A del SOT (de ahí lo bajó el pull), `resolveRowTarget` encuentra la fila y hace `values.update` sobre `A{fila}:U{fila}` con el mapeo viejo.

El daño en M es incondicional, no depende de qué campo se editó: `pushToSheet` siempre manda `ubicacion: row.ubicacion ?? ''`, y la rama legacy escribe `merged[12]` cada vez que la clave está definida. La columna L sí se salva (precioCOP está retirado del push, `merged[11]` sale de `existingRow`).

DOS MATICES al hallazgo, ninguno lo tumba:
· El segundo golpe está ligeramente sobrevendido. La Q no queda en blanco sino con la `coleccion`; `normalizeInvEstado` (sheetPullMaps.ts:333-341) sólo devuelve 'DISPONIBLE' si la colección está vacía, y con colección no vacía devuelve `null`, con lo que el pull SALTA el campo y el estado queda congelado en el valor anterior. En ambos casos la venta jamás vuelve a Convex, que es lo que el hallazgo sostiene.
· El caso `willAppend` (itemId no encontrado en A) es igual de malo por otra vía: escribe una fila nueva de 21 celdas con el layout viejo dentro del SOT.

SALVEDAD: no consulté Convex de producción para contar cuántas filas sin loteId hay hoy. La evidencia de que existen es de código (inserción sin loteId en el pull, el comentario de products.ts:155, el filtro de publishedCatalog:530-532), no un censo.

**Corrección propuesta.** Arreglo mínimo, una línea, en api/admin-product-update.ts:181 — el ruteo debe reconocer que «legacy» ya no es otro libro:

    const isFoto =
      target === 'fotosintesis' ||
      Boolean(loteId) ||
      SPREADSHEET_ID === FOTOSINTESIS_SPREADSHEET_ID; // el libro legacy ya no existe: mismo libro ⇒ layout del SOT

Con eso toda escritura sobre el SOT v3 pasa por la rama `isFoto`, que arma la fila desde FOTO_INVENTARIO_COLUMNS por clave nombrada, respeta `preserve`, escribe numéricos como números y no puede correrse de columna. Cubre a TODOS los productores (sales, asesorMovements, saveEdit/saveEditMany/retryPush/saveEditViaBot, el bot), no sólo a `products.pushToSheet`.

Cinturón y tirantes, inmediatamente antes de `if (isFoto)` en la línea 240, para que el día que alguien vuelva a separar los libros el error salga ruidoso y no en forma de precios borrados:

    if (!isFoto && spreadsheetId === FOTOSINTESIS_SPREADSHEET_ID) {
      return sendError(res, 500, 'Layout legacy A:U apuntado al SOT v3: abortado (corrompería L–U)');
    }

Complementario, no sustituto, en convex/products.ts:1201: mientras las dos envs apunten al mismo libro, `sheetTarget` debe ser siempre `'fotosintesis'` — el `loteId` no describe el layout de la hoja, describe la pertenencia a un lote.

Y aparte del código: el docstring de api/admin-product-update.ts líneas 12-21 (y el de la línea 262 «legacy treasure sheet — positional A:U (unchanged behavior)») afirma algo que hoy es falso — que ese layout lo lee get-treasure-sheets. Corregirlo, porque es la creencia que sostuvo el defecto.

Antes de desplegar conviene un barrido de reparación: los ítems sin loteId que hayan recibido un push desde que los dos libros se unificaron tienen la M pisada con la ubicación y la Q con la colección. Se detectan leyendo la pestaña y buscando filas cuya M no sea numérica.

---

### [ALTA] El push con target="legacy" escribe el layout viejo A:U ENCIMA de la pestaña Inventario del SOT: borra el precio (M) y la preponderancia (U) de todo ítem sin loteId

- **Archivo:** `convex/products.ts:1201`
- **Familia:** posicional · **Confianza:** seguro

**Escenario.** `pushToSheet` enruta por `loteId`: `const sheetTarget = row.loteId ? 'fotosintesis' : 'legacy'` (convex/products.ts:1201). Con target 'legacy', `api/admin-product-update.ts:181-182` hace `isFoto=false` y usa `SPREADSHEET_ID` — que HOY es el MISMO libro que `FOTOSINTESIS_SPREADSHEET_ID` (verificado en .env.local: ambas = 1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U) — y `findSheetByPattern(['inventario','inventory'])` cae en la MISMA pestaña Inventario. Ahí arma una fila POSICIONAL de 21 celdas con la semántica del libro legacy y la escribe con `values.update` sobre A:U del SOT. Desde L en adelante los dos layouts ya no coinciden: legacy[11]=precioCOP cae en L=costoBaseCOP, legacy[12]=ubicacion cae en M=precioFinalCOP, [14]=estado cae en O=UBICACIÓN, [15]=qr en P=ASESOR, [16]=coleccion en Q=ESTADO, [17]=caja en R=QR, [19]=asesorActual en T=CAJA y [20]=estadoAsesor en U=preponderancia. Daño concreto, en cada push de un ítem sin loteId: (1) la columna M (PRECIO DE VENTA) queda con el texto de la ubicación, o VACÍA si `row.ubicacion` es undefined — `pushToSheet` manda siempre `ubicacion: row.ubicacion ?? ''`, así que M se pisa SIEMPRE; es exactamente el síntoma de los 41 ítems sin precio, por una segunda puerta todavía abierta. (2) La columna U (preponderancia) se pisa con `estadoAsesor ?? ''`; preponderancia es el único campo push-only, EXCLUIDO del allowlist de pull (comentario en products.ts:1244-1251), o sea que ese número no se puede recuperar de ningún lado. (3) Las columnas O–T quedan corridas una posición (estado escrito como ubicación, etc.). Rutas vivas que lo disparan sin que nadie edite un precio: `saveEdit`/`saveEditViaBot` sobre cualquier pieza del riel viejo (products.ts:987), `saveEditMany` (products.ts:1494), `createProduct` (products.ts:2485, además appendea la fila nueva con esa semántica corrida) y sobre todo `asesorMovements._register` → `api.products.pushToSheet` (asesorMovements.ts:252 y :364): entregar o devolver una pieza a un asesor le borra el precio de venta y la preponderancia en la hoja. El código sabe que 'legacy' es un destino equivocado —lotItems.ts:1373 dice «no empujamos el orphaning porque misrutearía al tab legacy»— pero la suposición de fondo (que legacy es OTRO libro de 21 columnas) dejó de ser cierta cuando se centralizó a un solo libro.

**Evidencia.**
```
convex/products.ts:1201 → `const sheetTarget = row.loteId ? 'fotosintesis' : 'legacy';`

api/admin-product-update.ts:181-182 →
`const isFoto = target === 'fotosintesis' || Boolean(loteId);`
`const spreadsheetId = isFoto ? FOTOSINTESIS_SPREADSHEET_ID : SPREADSHEET_ID;`

api/admin-product-update.ts:273-306 (rama legacy) →
`// Legacy treasure sheet — positional A:U (unchanged behavior).`
`merged = new Array(21).fill('');`
…
`// Column L — precioCOP`
`if (fields.precioCOP !== undefined) merged[11] = s(fields.precioCOP);`
`// Column M — ubicación`
`if (fields.ubicacion !== undefined) merged[12] = s(fields.ubicacion);`
…
`// Column U — estadoAsesor`
`if (fields.estadoAsesor !== undefined) merged[20] = s(fields.estadoAsesor);`

api/_lib/fotosintesis-inventory-columns.js:72-73,82 (lo que de verdad hay en esas posiciones del SOT) →
`{ header: 'costoBaseCOP', key: 'costoBaseCOP', numeric: true }, // L`
`{ header: 'precioFinalCOP', key: 'precioFinalCOP', numeric: true }, // M`
`{ header: 'preponderancia', key: 'preponderancia', numeric: true }, // U`

.env.local → `SPREADSHEET_ID="1oRw1KSh…"` y `FOTOSINTESIS_SPREADSHEET_ID="1oRw1KSh…"` (mismo libro).

Efecto lateral extra: en la rama legacy `lastCol='U'`, así que la guarda de fila ocupada de `writeNewRowGuarded` sólo mira A:U — una fila con dato humano en AQ–BE pero con la A vacía se considera libre y se le encima un ítem nuevo.
```

**Veredicto del verificador.** SOBREVIVE, pero con el alcance recortado y dos piezas de la evidencia refutadas.

QUÉ COMPROBÉ (código real, no parafraseado)

1. El fragmento existe tal cual. convex/products.ts:1201 → `const sheetTarget = row.loteId ? 'fotosintesis' : 'legacy';`. api/admin-product-update.ts:181-182 → `const isFoto = target === 'fotosintesis' || Boolean(loteId);` / `const spreadsheetId = isFoto ? FOTOSINTESIS_SPREADSHEET_ID : SPREADSHEET_ID;`. La rama legacy (api/admin-product-update.ts:273-306) arma `merged = new Array(21)` y escribe posicionalmente `merged[12] = s(fields.ubicacion)` y `merged[20] = s(fields.estadoAsesor)`.

2. Los dos libros SON el mismo, y la pestaña también — verificado leyendo el libro (solo lectura, con el OAuth de .env.local): `SPREADSHEET_ID === FOTOSINTESIS_SPREADSHEET_ID` → true (1oRw1KSh…). Pestañas del libro: ["Léeme","_SyncQueue","_Sync","Lotes","Sublotes","Proveedores","Clientes","Inventario","Ventas","Calidades","Listas","Asesores","Modelo-Precios"] — una sola coincide con `findSheetByPattern(['inventario','inventory'])`: "Inventario". Fila 1 real: A=Item … L=costoBaseCOP, M=precioFinalCOP, N=(sin uso), O=UBICACIÓN, P=ASESOR, Q=ESTADO, R=QR, S=Colección, T=CAJA, U=preponderancia, V=ASESOR ACTUAL, W=ESTADO ASESOR, X=loteId. O sea: la rama legacy escribiría A:U con semántica de 21 columnas sobre la misma pestaña que el SOT. Y no es hipótesis local: api/_lib/constants.js:26 documenta `SPREADSHEET_ID=<SOT v3>` como el estado deseado, y el defecto #2 ya confirmado en producción (get-treasure-sheets sirviendo `getByIndex(11)` = costoBaseCOP) prueba que en prod ese ID también resuelve al SOT.

3. No hay guard aguas arriba. `_saveEdit` (products.ts:987), `saveEditMany` (1495), `_createProduct` (2485) y `asesorMovements._register/_registerReturn` (252, 364) agendan `api.products.pushToSheet` sin mirar `loteId`. El único candado en pushToSheet es `verificaDestinoDeEscritura` (dev no escribe al SOT). El único guard real de la rama legacy es la convención de NO empujar el orphaning (lotItems.ts:1373-1381, lots.ts:529), que protege el instante del huérfano pero no la siguiente edición.

4. El camino está vivo, no es código muerto. `createProduct` NUNCA setea loteId (createProductFieldsArgs, products.ts:2413-2428 no lo incluye) ⇒ toda alta por "+ Nueva piedra" (botón real: src/pages/admin/ProductManagement/FotoHero.tsx:291 → handleCreateNew → ProductManagementPage.tsx:644 `createProduct(...)`) sale por target 'legacy' y appendea al SOT una fila corrida: `ubicacion` cae en M (precioFinalCOP), `estado` ('DISPONIBLE') en O (UBICACIÓN), `coleccion` en Q (ESTADO), `caja` en R (QR), `asesorActual` en T (CAJA), `estadoAsesor` en U (preponderancia). Y lots.cancel/lotItems.remove dejan el espejo con `loteId: undefined` mientras la fila de la hoja conserva X, M y U ⇒ cualquier saveEdit/entrega a asesor posterior sobre ese ítem hace `values.update` de A:U sobre su fila y pisa M con la ubicación (o con '' — `ubicacion: row.ubicacion ?? ''` siempre viaja definido) y U con `estadoAsesor ?? ''`. El riel v4 (convex/espejo.ts) es una cola aparte; no reemplazó a pushToSheet.

5. El efecto lateral extra también es cierto: api/_lib/sheet-new-row.ts:80,90-96 sondea la ocupación con el MISMO rango cerrado `A{n}:{lastCol}{n}`, y en la rama legacy `lastCol='U'`, así que una fila con dato humano en AQ–BE y A:U en blanco se considera libre.

QUÉ REFUTO DEL HALLAZGO (no cambia el veredicto, sí la severidad)

a) "legacy[11]=precioCOP cae en L=costoBaseCOP" es FALSO por esta ruta: `pushToSheet` ya no manda `precioCOP` (products.ts:1226-1228, "retired from the SOT mirror 2026-05-29"), así que `fields.precioCOP === undefined` y `merged[11]` conserva `existingRow[11]`. La columna L no se toca. El daño real es M, U y el corrimiento O–T.

b) "es exactamente el síntoma de los 41 ítems sin precio" es FALSO con los datos de hoy. Leí las 576 filas de Inventario: 576/576 tienen loteId en X (0 filas sin lote), las 59 filas con M vacía TODAS tienen loteId, U no contiene ni un solo texto de estado (0 casos de 'ASESOR'/'DISPONIBLE'/etc. en preponderancia) y O sólo tiene valores de ubicación legítimos (OFI.CALI 299, ASESOR 153, EMBAJADOR 30, OFI.BOGOTA 42, RETORNADO 3, vacío 49). No hay huella forense de que la rama legacy haya escrito nunca en esta pestaña. (Nota aparte, no es este defecto: T y V traen URLs `https://tierramadre.app/p/NN` en ~12 filas — otra corrupción, de otra fuente.)

CONCLUSIÓN: el mecanismo, la ausencia de guard y la alcanzabilidad son reales y verificados; lo que no es real es la atribución de daño ya consumado. Hoy el defecto está latente-pero-armado: dispara en la próxima alta por "+ Nueva piedra" y en la primera edición/entrega de un ítem huerfanado por lots.cancel o lotItems.remove.

**Corrección propuesta.** Arreglo mínimo en dos pasos (el orden importa):

1) Convertir la corrupción silenciosa en error ruidoso — api/admin-product-update.ts, justo después de la línea 182:

   if (!isFoto && spreadsheetId === FOTOSINTESIS_SPREADSHEET_ID) {
     return sendError(res, 409, `target="legacy" apunta al MISMO libro que el SOT (${spreadsheetId}); el layout A:U pisaría precioFinalCOP (M) y preponderancia (U). Push rechazado.`);
   }

   Es una guarda de 3 líneas, no toca ninguna ruta sana (todos los ítems con loteId siguen por la rama foto) y hace fallar el push con `syncError` visible en vez de escribir corrido.

2) Sacar el ruteo por loteId — convex/products.ts:1201:

   const sheetTarget = 'fotosintesis' as const;   // un solo libro, un solo layout

   OJO, sin esto el paso 2 abre otro agujero: en la rama foto se escribe toda clave presente-y-definida, y `pushToSheet` manda `costoBaseCOP: row.costoBaseCOP ?? ''` (products.ts:1252) y `precioFinalCOP: row.precioFinalCOP ?? ''` (1273). Un ítem huérfano (lots.cancel/lotItems.remove limpian costoBaseCOP y preponderancia en el espejo) blanquearía L y M. Así que en el mismo cambio hay que darles a esas dos claves el MISMO tratamiento que ya tiene `preponderancia` (spread condicional, products.ts:1243-1251):

   ...(row.costoBaseCOP !== undefined ? { costoBaseCOP: row.costoBaseCOP } : {}),
   ...(row.precioFinalCOP !== undefined ? { precioFinalCOP: row.precioFinalCOP } : {}),

   Regla de fondo, la misma del comentario de preponderancia: `undefined` en el espejo significa "Convex no lo sabe", nunca "el operador lo borró"; sólo `?? ''` los campos que el pull round-trippea.

3) (menor, mismo riel) api/_lib/sheet-new-row.ts — hacer que la guarda de fila ocupada sondee siempre el ancho real del SOT (`FOTO_INVENTARIO_LAST_COL`) aunque se escriba un rango más corto, para que una fila con dato humano en AQ–BE no se lea como vacía.

---

### [ALTA] El push manda '' en costoBaseCOP (L) y precioFinalCOP (M) cuando Convex no los conoce, y borra el costo/precio tecleado a mano en la hoja

- **Archivo:** `convex/products.ts:1255`
- **Familia:** borrado · **Confianza:** probable

**Escenario.** L y M son SHEET-OWNED desde el 2026-07-23/24 (convex/_lib/sheetPullMaps.ts:108-115: «un humano teclea el costo en la hoja y se sincroniza para acá»). Pero el push las manda SIEMPRE, colapsadas a cadena vacía cuando el espejo no las tiene: `costoBaseCOP: row.costoBaseCOP ?? ''` (products.ts:1255) y `precioFinalCOP: row.precioFinalCOP ?? ''` (products.ts:1276). Del lado de Vercel, `api/admin-product-update.ts:253-270` escribe cualquier clave presente-y-no-undefined; `''` no pasa el chequeo numérico y cae en `merged[i] = s('')`, o sea la celda queda VACÍA. La dirección hoja→Convex NO es automática: el reconcile completo viene APAGADO (`FOTO_RECONCILE_CRON !== 'on'`, convex/fotoSync.ts:543, cuyo propio comentario dice «un edit fuera de banda sólo reconcilia cuando alguien aprieta el botón») y el pull diario también (`INVENTORY_PULL_CRON`, products.ts:1813) — y ese pull diario ni siquiera trae costoBaseCOP/precioFinalCOP entre sus campos. Escenario: el operador teclea el costo en L (o el precio de lista en M) del ítem 0412 y no aprieta «🔄 Convex Sync» (o el flush del Apps Script se pierde en un pegado masivo). Cualquier evento posterior sobre ese ítem —un cambio de estado, una entrega a asesor, una actualización de fotos, un saveEditMany— agenda `pushToSheet`, que manda `''` en L y M y borra el dato tecleado. Como Convex nunca lo aprendió, no queda copia en ningún lado. Es exactamente la asimetría que el propio archivo documenta para `preponderancia` («undefined significa que Convex nunca lo supo, NO que el operador lo borró», products.ts:1244-1251) — pero ahí se resolvió omitiendo la clave, y a las dos columnas de plata no se les aplicó la misma cura. La justificación escrita («todos los demás campos los round-tripea el pull, así que `?? ''` significa vacío en los dos lados») es falsa mientras el pull sea manual.

**Evidencia.**
```
convex/products.ts:1255 → `costoBaseCOP: row.costoBaseCOP ?? '',`
convex/products.ts:1276 → `precioFinalCOP: row.precioFinalCOP ?? '',`

api/admin-product-update.ts:253-270 →
`} else if (col.key in fieldMap && fieldMap[col.key] !== undefined) {`
`  const value = fieldMap[col.key];`
`  if (col.numeric && value !== '' && value !== null && Number.isFinite(Number(value))) {`
`    merged[i] = Number(value);`
`  } else {`
`    merged[i] = s(value);   // '' ⇒ celda vaciada`
`  }`

convex/fotoSync.ts:543 → `if (process.env.FOTO_RECONCILE_CRON !== 'on') { return { skipped: true }; }`
convex/_lib/sheetPullMaps.ts:109-115 → «COST OWNERSHIP CHANGE (2026-07-24): costoBaseCOP (column L) is SHEET-OWNED… nothing in Convex re-derives or overwrites this value.» (el push sí la sobreescribe).

Contraste con el campo que sí está protegido (products.ts:1252-1254):
`...(row.preponderancia !== undefined ? { preponderancia: row.preponderancia } : {}),`
```

**Veredicto del verificador.** Verificado línea por línea; las cuatro pruebas lo dejan en pie. (1) Los fragmentos son literales: products.ts:1255 `costoBaseCOP: row.costoBaseCOP ?? ''`, products.ts:1276 `precioFinalCOP: row.precioFinalCOP ?? ''`, y api/admin-product-update.ts:251-269 con el orden exacto `col.preserve → continue` / `col.key in fieldMap && !== undefined` → `merged[i] = s(value)`, escrito luego con un `values.update` de la fila COMPLETA (A:lastCol), así que un '' vacía la celda de verdad. (2) No hay guard: el mecanismo de protección EXISTE y está aplicado a propósito en el mismo mapa (api/_lib/fotosintesis-inventory-columns.js marca `preserve: true` en B, N y todo el bloque AQ–BE, con el comentario «Se leen; no se escriben nunca»), pero L y M NO lo llevan — y el comentario de M sigue diciendo «DERIVED: costoBaseCOP × 2.6», desactualizado respecto del cambio de propiedad de 2026-07-23/24. (3) El camino está vivo: pushToSheet se agenda desde asesorMovements.ts:252,364 (entrega/retorno a asesor), lotItems.ts:464,627,726,1069,1186 y products._saveEdit. Precisión que el hallazgo omite y que acota el alcance sin anularlo: sólo llega a las columnas L/M del SOT si `row.loteId` está seteado (products.ts:1201, `sheetTarget = row.loteId ? 'fotosintesis' : 'legacy'`) — o sea, ítems de lote, que son justo los del riel Fotosíntesis. (4) El daño ocurre con los datos de hoy, y el propio código escribe el guion: lotItems.ts:262 y 371-375 crean el ítem con `const costoBaseCOP = 0` explicando «cost is sheet-owned (2026-07-24), typed into column L by hand and pulled back later» — y ese pull de vuelta es MANUAL: el Apps Script onEdit sólo encola en _SyncQueue sin red (scripts/apps-script/fotosintesis-convex-sync.gs:8,98) y sólo el ítem de menú dispara el POST; los dos crones están apagados por env (fotoSync.ts:543, products.ts:1806) y el pull diario ni siquiera lleva estos dos campos en su validador. DOS AGRAVANTES que el hallazgo no cita y que refuerzan: (a) `_attachExistingToLote` (lotItems.ts:602-630) es el caso puro del `?? ''` — toma un producto existente que puede no tener costoBaseCOP en el espejo, le pone loteId y agenda pushToSheet en el mismo tick, de modo que el routing recién pasa a 'fotosintesis' y L/M se escriben vacías sin que nadie las haya mirroreado nunca; (b) planRowPatch (convex/_lib/sheetPullMaps.ts:476-479) devuelve `action: 'protected'` para toda fila con syncStatus 'pending'/'error', así que apretar «🔄 Convex Sync» NO rescata el costo tecleado si el ítem tiene un push pendiente — la mitigación obvia falla en silencio justo en el caso que importa. SALVEDADES honestas: para L el clobber más frecuente hoy no es '' sino el 0 sentinela de lotItems.ts:375 (0 ?? '' es 0, el `??` no es la causa en ese camino; la causa es que la columna se escriba); y la mitad de M solapa con el vector de escritura del defecto #1 ya conocido (esa línea 1276 no fue tocada por el fix de backfillPrecioFinal). Lo genuinamente nuevo y no cubierto es la columna L / costoBaseCOP.

**Corrección propuesta.** Arreglo mínimo, en dos capas (la primera sola ya corta el borrado; la segunda corta el pisado con el 0 sentinela).

CAPA 1 — omitir la clave cuando el espejo no la conoce, exactamente el patrón que el mismo bloque ya usa para `preponderancia` (convex/products.ts:1251-1253). En convex/products.ts, reemplazar la línea 1255 y la 1276 por:

    ...(row.costoBaseCOP !== undefined ? { costoBaseCOP: row.costoBaseCOP } : {}),
    ...(row.precioFinalCOP !== undefined ? { precioFinalCOP: row.precioFinalCOP } : {}),

y corregir el comentario de las líneas 1249-1250 («Every other field here is round-tripped by the pull, so for those `?? ''` genuinely means "empty on both sides"»), que hoy es falso mientras el pull sea manual: L y M son hoja-propietarias desde 2026-07-23/24 y su pull de vuelta lo dispara una persona.

CAPA 2 — no pisar con el 0 de nacimiento. `lotItems._create` inserta costoBaseCOP = 0 a propósito como «todavía no lo teclearon»; en un push `mode:'patch'` ese 0 es indistinguible de un costo real de cero y vacía/cerea la celda que el operador acaba de llenar. Emitir la clave sólo cuando aporta información:

    ...(row.costoBaseCOP !== undefined && (pushMode === 'append' || row.costoBaseCOP > 0)
      ? { costoBaseCOP: row.costoBaseCOP }
      : {}),

(en 'append' la fila es nueva y no hay nada que preservar; en 'patch' un 0 no debe ganarle a un número tecleado en la hoja).

Actualizar de paso los comentarios desactualizados de api/_lib/fotosintesis-inventory-columns.js (L y M siguen anotadas como «DERIVED: costoBaseCOP × 2.6») para que digan hoja-propietaria, y dejar constancia de por qué NO se les pone `preserve: true`: con preserve el seed de precio de un ítem nuevo nunca llegaría a la hoja. Verificación mínima antes de dar por cerrado: en un ítem de prueba con L tecleada a mano y costoBaseCOP=0 en el espejo, disparar una entrega a asesor (asesorMovements) y comprobar leyendo la hoja por cabecera nombrada que L conserva el valor — no basta con que el POST devuelva 200 ni con syncStatus 'synced'.

---

### [MEDIA] Las columnas `preserve` (AQ–BE, N, B) no se preservan: se releen FORMATEADAS y se reescriben con USER_ENTERED — la fórmula de AR se convierte en literal y los montos se redondean al formato de pantalla

- **Archivo:** `api/admin-product-update.ts:219`
- **Familia:** otro · **Confianza:** probable

**Escenario.** El merge no deja las celdas intactas: las LEE y las VUELVE A ESCRIBIR. `values.get` se llama sin `valueRenderOption`, así que el default es FORMATTED_VALUE — devuelve el texto tal como se ve, no el valor ni la fórmula. Esos strings se copian a `merged` (línea 245) y toda la fila A:BF se reescribe con `values.update` + `valueInputOption: 'USER_ENTERED'` (líneas 353-358). Consecuencias sobre el bloque hoja-primero que el archivo de columnas jura que «se leen; no se escriben nunca»: (1) AR se llama literalmente «Costo lote (fórmula)» — si tiene una fórmula, el primer push de ese ítem la reemplaza por el número que mostraba, congelado; deja de recalcular y nadie se entera. Lo mismo aplica a cualquier fórmula en AT/AU/AW («Caja: saldo» es el candidato natural a ser un =venta−pagado). (2) Un monto con formato de moneda o con decimales recortados vuelve redondeado al formato de pantalla (p. ej. 1.234.567,6 mostrado como «$1.234.568» se reescribe como 1234568): deriva silenciosa en columnas de plata (AU «Caja: precio venta», AV «Caja: valor pagado», AW «Caja: saldo»). (3) B (fechaIngreso) viaja por el mismo camino: string formateado reinterpretado por el locale es-CO en cada push. El resto del repo ya sabe que esto es peligroso — todos los scripts quirúrgicos leen con `valueRenderOption: 'UNFORMATTED_VALUE'` (scripts/aplicar-costos-lote-origen.mjs:68 y una docena más); el endpoint que corre en producción es el único que no. No pude leer el libro vivo para confirmar cuáles de esas celdas son fórmulas, por eso no lo doy por seguro: el encabezado «(fórmula)» es la evidencia.

**Evidencia.**
```
api/admin-product-update.ts:218-223 (sin valueRenderOption ⇒ FORMATTED_VALUE) →
`const readRange = `${targetSheet}!A${foundRow}:${lastCol}${foundRow}`;`
`const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: readRange });`
`existingRow = (existing.data.values?.[0] ?? []) as string[];`

api/admin-product-update.ts:243-246 →
`merged = new Array(FOTO_COLUMNS.length).fill('');`
`for (let i = 0; i < FOTO_COLUMNS.length; i++) { merged[i] = s(existingRow[i] ?? ''); }`

api/admin-product-update.ts:352-358 →
`const writeRange = `${targetSheet}!A${foundRow}:${lastCol}${foundRow}`;`
`await sheets.spreadsheets.values.update({ …, valueInputOption: 'USER_ENTERED', requestBody: { values: [merged] } });`

api/_lib/fotosintesis-inventory-columns.js:123-128 →
`{ header: 'Costo lote (fórmula)', key: 'costoLoteCOP', numeric: true, preserve: true }, // AR — COSTO`
y :113-115 → «`preserve: true` … Se leen; no se escriben nunca.» (lo que en realidad ocurre es un round-trip formateado).
```

**Veredicto del verificador.** CONFIRMADO contra el libro vivo (lectura de sólo lectura al SOT 1oRw1KSh…, pestaña «Inventario», A1:BF600 con los tres valueRenderOption).

1) El fragmento existe tal cual. api/admin-product-update.ts:218-223 lee `${targetSheet}!A${foundRow}:${lastCol}${foundRow}` SIN `valueRenderOption` (default de la API = FORMATTED_VALUE); :243-246 copia ese texto a `merged`; :352-358 reescribe TODA la fila con `values.update` + `valueInputOption: 'USER_ENTERED'`. `col.preserve` sólo hace `continue` (:252), es decir «no lo pises con el payload» — NO «no lo escribas»: el valor releído formateado igual viaja en el array que se estampa.

2) No hay guard aguas arriba. El único guard del endpoint es el shared secret `x-admin-sync-token` (:141-153) y el 409 de identidad por columna A (:229-236). Ninguno toca el render/round-trip. `lastCol = FOTO_INVENTARIO_LAST_COL` = BF (58 columnas), así que el rango de escritura SÍ cubre AQ–BE.

3) El camino está vivo en prod: convex/products.ts `pushToSheet` (:1130 y sig.) POSTea a `${APP_URL}/api/admin-product-update` en cada guardado de admin (saveEdit / saveEditMany / retryPush / bot). No es código muerto.

4) EL DAÑO YA OCURRIÓ, medido en la hoja de hoy:
 · AR es de verdad una fórmula: 441 filas tienen `=IFERROR(VLOOKUP($X{n},Lotes!$A:$E,5,FALSE())*$U{n},"")`. Con formato contable, cuando da 0 se MUESTRA como «-» (FORMATTED_VALUE="-", UNFORMATTED=0).
 · 72 filas ya NO tienen fórmula en AR: tienen el TEXTO literal «-» (render FORMULA devuelve la cadena "-", no un 0 numérico). Ejemplos: fila 81/ítem 80, 90/89, 94/93, 98/97, 101/100, 171/170, 172/171, 173/172, 176/175, 183/182, 234/233, 235/234, 237/236, 242/241, 245/244. Esa cadena sólo la puede haber escrito algo que leyó el valor FORMATEADO y lo devolvió con USER_ENTERED. Ningún otro escritor toca AR: el espejo v4 (convex/_lib/espejoSheets.ts) escribe en OTRO libro y otras pestañas (Lotes/Casillas/Tablero) con RAW, y ningún script del repo escribe AR.
 · Además 4 celdas de plata quedaron con el texto «-» en vez de número: AV/AW de la fila 277 (ítem 276), AW de la 340 (ítem 339) y de la 381 (ítem 381).
 · Coherencia total del patrón: 63 filas tienen AR VACÍA (son las creadas por la rama append, que estampa '' sobre AQ–BE), 72 la tienen aplastada a «-» (rama update), 441 intactas. El bloque AQ–BE se ensanchó el 2026-07-30 (8e47c9e), así que el daño lleva ~3 semanas acumulándose a razón de un ítem por edición.

DOS SUB-AFIRMACIONES DEL HALLAZGO QUE **NO** SE SOSTIENEN (corregidas, no tumban el hallazgo):
 · La fecha B NO se corrompe por este camino. El locale del libro es es_MX y «31-oct-2025» sí re-parsea a serial: de las 72 filas con AR aplastada, 30 conservan B como serial numérico y 42 la tienen vacía; CERO tienen B texto. Las 47 filas con B texto conservan todas su fórmula en AR, o sea que vienen de otra fuente, no de este round-trip.
 · El «redondeo por formato» en AU/AV es hoy teórico: los montos son enteros en COP y «635,000» vuelve a parsear como 635000. Lo que sí está probado es la corrupción del CERO formateado como «-» (y la de la fórmula).

**Corrección propuesta.** Arreglo mínimo, en dos partes.

(1) Dejar de reescribir el bloque hoja-primero. En vez de un `values.update` sobre A:BF, usar `sheets.spreadsheets.values.batchUpdate` con dos rangos que saltean AQ–BE:
    `${targetSheet}!A${foundRow}:AP${foundRow}`  (merged.slice(0, 42))
    `${targetSheet}!BF${foundRow}:BF${foundRow}` (merged.slice(57, 58))
Los índices se derivan del mapa, no a mano: `const primerPreservado = FOTO_COLUMNS.findIndex(c => c.key === 'pesoGr'); const ultimoPreservado = FOTO_COLUMNS.findIndex(c => c.key === 'notasConflictos');`. Así AQ–BE nunca entra en un requestBody y la promesa del archivo de columnas («se leen; no se escriben nunca») pasa a ser cierta por construcción, no por convención. Aplicar lo mismo en la rama append (`writeNewRowGuarded`, :335-341), que hoy estampa '' sobre AQ–BE y por eso 63 filas nuevas nacieron sin la fórmula de AR.

(2) Para lo que SÍ sigue viajando en A:AP (B fechaIngreso y N `_sinUso`, ambos preserve), cambiar la lectura de :219-222 a render de fórmula, que es el único par round-trip-seguro con USER_ENTERED:
    const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: readRange, valueRenderOption: 'FORMULA' });
(UNFORMATTED_VALUE NO sirve acá: devolvería 0 para una celda con fórmula y la aplastaría igual, sólo que con un cero en vez de un guion.)

(3) Reparación de lo ya roto (script aparte, con respaldo y dry-run): restaurar en las 72 filas la fórmula `=IFERROR(VLOOKUP($X{n},Lotes!$A:$E,5,FALSE())*$U{n},"")` con {n} = número de fila, tomando como plantilla cualquiera de las 441 filas sanas; y poner 0 numérico en las 4 celdas AV/AW que quedaron con el texto «-» (filas 277, 340, 381). Verificar releyendo con valueRenderOption:'FORMULA' que las 576 filas con ítem quedan en 0 literales.

(4) Test de regresión: extender tests/saleSafe.test.ts con un caso que le pase al merge un `existingRow` con `'-'` en AR y afirme que ningún rango escrito incluye la columna AR.

---

### [ALTA] El respaldo posicional de `asesorActual` cae en la columna CAJA del SOT y marca las piezas como transferidas/vendidas

- **Archivo:** `api/get-treasure-sheets.ts:277`
- **Familia:** posicional · **Confianza:** seguro

**Escenario.** `getByIndex(19)` codifica el libro LEGACY de 21 columnas, donde el índice 19 era «ASESOR ACTUAL» (col T). En el SOT v3 —que es lo que hoy apunta SPREADSHEET_ID (1oRw1KSh…, ver .env.local:32 y api/_lib/constants.js:70)— el índice 19 es **CAJA** (api/_lib/fotosintesis-inventory-columns.js:81). El respaldo se dispara siempre que la celda «ASESOR ACTUAL» (col V, idx 21) está vacía, que es el caso normal (prod_inventory.json: 473/473 filas del espejo Convex sin `asesorActual`). Resultado: toda pieza con CAJA llena hereda `asesorActual = "Legalizada"` / «Pte Legalizar» / «Esmereogenesis» — 163 de 523 ítems tienen CAJA no vacía según el snapshot leído en vivo el 2026-08-11 (scripts/.backups/nota-sot-v3-antes.md:735-743: vacío 360, Legalizada 132, Pte Fecha x Legalizar 21, Pte Legalizar 6, Esmereogenesis 4).

Daño concreto en el riel del cliente: `api/ambassador-products.ts` mapea con ESTA misma función (línea 117) y llama `getAsesorProducts` → `getEffectiveEstado` (src/utils/asesorProductOwnership.ts:50-61). Con `currentOwner = "Legalizada"`, `matchesAsesorName("Legalizada", nombreDelAsesor)` es false, así que la función devuelve **'VENDIDA'**; `getOffer` la marca no comprable y la pieza sale de `availableItemIds`. El perfil público del embajador muestra como vendidas las piezas que sí están disponibles, y `isTransferredAway` queda en true. Para staff, `getEffectiveOwner` devuelve el nombre de la caja como dueño de la pieza.

**Evidencia.**
```
api/get-treasure-sheets.ts:277-278
    asesorActual:
      getValue(INVENTARIO_HEADERS.ASESOR_ACTUAL) || getByIndex(19) || '',

api/_lib/fotosintesis-inventory-columns.js:80-84 (layout REAL del SOT)
  { header: 'Colección', key: 'coleccion' }, // S  → idx 18
  { header: 'CAJA', key: 'caja' }, // T            → idx 19  ← lo que lee getByIndex(19)
  { header: 'preponderancia', ... }, // U          → idx 20
  { header: 'ASESOR ACTUAL', key: 'asesorActual' }, // V → idx 21 (el que se quería leer)

src/utils/asesorProductOwnership.ts:50-61
  const currentOwner = item.asesorActual?.trim();
  if (!currentOwner) return item.estado;
  if (matchesAsesorName(currentOwner, asesorName)) { ... }
  // Product was transferred to someone else
  return 'VENDIDA';
```

**Veredicto del verificador.** CONFIRMADO en los cuatro puntos, y verificado contra la hoja de producción en vivo (lectura sola, `spreadsheets.values.get` sobre `Inventario!A1:W700` con el refresh token de `.env.local`).

1) EL FRAGMENTO EXISTE TAL CUAL. api/get-treasure-sheets.ts:277-278:
   asesorActual:
     getValue(INVENTARIO_HEADERS.ASESOR_ACTUAL) || getByIndex(19) || '',
   (y el hermano estadoAsesor: `getValue(...ESTADO_ASESOR) || getByIndex(20)` en 279-283).
   El comentario-cabecera del archivo (líneas 52-72) documenta explícitamente el layout LEGACY: «R = CAJA (17) … T = ASESOR ACTUAL (19)». O sea, los índices están calibrados al libro viejo, tal como dice el hallazgo.

2) NO HAY GUARD AGUAS ARRIBA. `getByIndex` (api/get-treasure-sheets.ts:172-176) es incondicional: no comprueba si el encabezado se resolvió, sólo si la celda está vacía. Se dispara siempre que `getValue('asesor actual')` devuelve null — y `getValue` devuelve null tanto si falta el encabezado como si **la celda está vacía** (línea 163: `row[index] !== ''`). Ése es el caso normal. Nótese el contraste: `precioInternacional` (246-256), `ubicacion` (266) y `procedencia` (265) YA renunciaron al respaldo posicional por exactamente este motivo; `asesorActual` quedó afuera de esa poda.

3) EL CAMINO ES ALCANZABLE EN PRODUCCIÓN. `.env.local:32` y `:35` confirman SPREADSHEET_ID == FOTOSINTESIS_SPREADSHEET_ID == 1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U. Leí los encabezados reales de la pestaña `Inventario` de ESE libro y coinciden 1:1 con api/_lib/fotosintesis-inventory-columns.js: idx 17 = "QR", idx 18 = "Colección", **idx 19 = "CAJA"**, idx 20 = "preponderancia", **idx 21 = "ASESOR ACTUAL"**. Confirmado también que `api/ambassador-products.ts:48,117` importa y usa `mapRowToTreasureItem` de este mismo archivo, con el mismo rango `A:${FOTO_INVENTARIO_LAST_COL}` (A:BF), y que el endpoint es deliberadamente público (docstring líneas 32-33, ruta /ambassadors/:slug sin sesión).

4) EL DAÑO OCURRE CON LOS DATOS DE HOY. Conteo sobre las 576 filas vivas de `Inventario`:
   · CAJA (col T) no vacía: 220
   · ASESOR ACTUAL (col V) no vacía: 44
   · **Filas con CAJA llena y ASESOR ACTUAL vacía → el respaldo se dispara: 195**
   · Valores que se cuelan como `asesorActual`: Legalizada 125, Pte Fecha x Legalizar 21, Pte Legalizar 6, Esmereogenesis 4, y **39 filas donde CAJA contiene una URL tipo `https://tierramadre.app/p/<item>`**
   · De esas 195, con ESTADO = DISPONIBLE: 39. Con ESTADO = DISPONIBLE **y** ASESOR asignado (que es la condición para que `getAsesorProducts` las incluya): **16** — TMÄ 14, «Isa la Negra Vikinga Warrior Portocarrero» 1, «Mario Gomez» 1.
   Caso concreto reproducible: ítem **182 «Secreto de Tena»** — ASESOR = «Isa la Negra Vikinga Warrior Portocarrero» (ASE-008, «Embajador - Admin» en la pestaña Asesores, o sea con perfil público real), ESTADO = DISPONIBLE, col T = «https://tierramadre.app/p/182», col V vacía (la fila mide 20 celdas, idx 21 ni existe). El mapeo le pone `asesorActual = "https://tierramadre.app/p/182"`; `getEffectiveEstado` (src/utils/asesorProductOwnership.ts:44-60) ve `currentOwner` no vacío, `matchesAsesorName(url, "Isa…")` falso, y **retorna 'VENDIDA'**. La pieza queda fuera de `availableItemIds` y su perfil público la cuenta como vendida estando disponible.
   Contaminación adicional confirmada aguas abajo: `getEffectiveOwner` (líneas 33-35) devuelve «Legalizada» / la URL como dueño para staff, y src/hooks/useAsesores.ts:168-169 filtra el catálogo por `item.asesorActual` con la misma función.

DOS CORRECCIONES A LOS NÚMEROS DEL HALLAZGO (no lo tumban, lo afinan): son **195** filas afectadas, no 163 (la hoja creció y `caja` se llenó más desde el snapshot del 11-ago); y en 39 de ellas el valor heredado no es una etiqueta de caja sino la **URL del QR**, porque la columna CAJA guarda URLs en esas filas. La evidencia `prod_inventory.json` que citaba el agente NO prueba nada sobre `asesorActual` (ese export ni siquiera contiene las claves `asesor`/`asesorActual`, y trae campos de la era SOT v2 — está obsoleto); la prueba válida es la lectura en vivo de la hoja, arriba.

**Corrección propuesta.** Eliminar el respaldo posicional de `asesorActual` (y, por el mismo motivo, el de `estadoAsesor`) en api/get-treasure-sheets.ts:277-283, exactamente el mismo tratamiento que ya recibieron `ubicacion`, `procedencia`, `precioInternacional` y `precioCOP` en ese archivo.

Cambio mínimo:

    // Sólo por encabezado. `getByIndex(19)/(20)` codificaban el libro LEGACY
    // (T = ASESOR ACTUAL, U = ESTADO ASESOR). En el SOT v3 —que es a donde
    // apunta HOY SPREADSHEET_ID— el índice 19 es CAJA y el 20 es
    // preponderancia; el respaldo se disparaba en las 195 filas con CAJA
    // llena y ASESOR ACTUAL vacía, y estampaba «Legalizada» / la URL del QR
    // como dueño de la pieza.
    asesorActual: getValue(INVENTARIO_HEADERS.ASESOR_ACTUAL) || '',
    estadoAsesor: (
      getValue(INVENTARIO_HEADERS.ESTADO_ASESOR) || ''
    ).toUpperCase() as TreasureStatus | '',

Es seguro para el libro legacy: allí las columnas «ASESOR ACTUAL» (T) y «ESTADO ASESOR» (U) SÍ tienen encabezado nombrado —el propio comentario de cabecera del archivo lo documenta— así que `getValue` las resuelve por nombre y el posicional nunca era load-bearing (a diferencia de `asesor`/`getByIndex(13)`, que sí lo es y debe quedarse). Con `asesorActual = ''`, `getEffectiveEstado` cae por el early-return `if (!currentOwner) return item.estado` y la pieza vuelve a leerse DISPONIBLE.

Revisar de paso, con el mismo criterio, los tres posicionales vecinos que también quedaron calibrados al libro legacy y hoy apuntan a columnas corridas del SOT: `estado: getByIndex(14)` (idx 14 en el SOT es UBICACIÓN), `qr: getByIndex(15)` (es ASESOR), `coleccion: getByIndex(16)` (es ESTADO) y `caja: getByIndex(17)` (es QR) — hoy no se disparan porque sus encabezados existen y esas celdas rara vez están vacías, pero son la misma bomba con otra mecha. En particular `estado` es el más peligroso: si ESTADO estuviera vacío en alguna fila, tomaría el valor de UBICACIÓN.

---

### [MEDIA] `coleccion` (campo PÚBLICO) se rellena con el ESTADO cuando la columna Colección está vacía — 204 de 523 ítems

- **Archivo:** `api/get-treasure-sheets.ts:275`
- **Familia:** posicional · **Confianza:** seguro

**Escenario.** Mismo mecanismo que el anterior: `getByIndex(16)` apuntaba a «Colección» en el libro legacy; en el SOT v3 el índice 16 es **ESTADO** (col Q). Cuando la celda «Colección» (col S, idx 18) está vacía, el ítem sale del endpoint con `coleccion = "DISPONIBLE"` / "VENDIDA" / "LOTE X CT" / "Retornado" / "CONSIGNACION".

Medido contra el snapshot en vivo del 2026-08-11 (scripts/.backups/nota-sot-v3-antes.md): Colección vacía en **204/523 ítems (39.0%)** y ESTADO lleno en **523/523** (la distribución de la §3 suma 523 sin bucket «(vacío)»). O sea que el respaldo se dispara y produce un valor en las 204 filas.

A diferencia de `caja`/`qr`, `coleccion` está en PUBLIC_KEYS (api/_lib/catalogProjection.ts:37), así que esto lo ve **un visitante anónimo**: la insignia de colección de la tarjeta y, peor, el desplegable de colecciones que `useFilterOptions` construye desde `item.coleccion` (src/hooks/useFilterOptions.ts:69-74) se llena con «DISPONIBLE», «VENDIDA», «Retornado» como si fueran nombres de colección.

**Evidencia.**
```
api/get-treasure-sheets.ts:275
    coleccion: getValue(INVENTARIO_HEADERS.COLECCION) || getByIndex(16) || '',

api/_lib/fotosintesis-inventory-columns.js:76-80
  { header: 'UBICACIÓN', key: 'ubicacion' }, // O   idx 14
  { header: 'ASESOR', key: 'asesor' }, // P         idx 15
  { header: 'ESTADO', key: 'estado' }, // Q         idx 16  ← lo que lee getByIndex(16)
  { header: 'QR', key: 'qr' }, // R                 idx 17
  { header: 'Colección', key: 'coleccion' }, // S   idx 18 (el que se quería leer)

scripts/.backups/nota-sot-v3-antes.md:745-748
  | coleccion  | Ítems |     % |
  | (vacío)    |   204 | 39.0% |
```

**Veredicto del verificador.** Verificado en el código real, los cuatro puntos aguantan. (1) El fragmento existe tal cual en api/get-treasure-sheets.ts:275: `coleccion: getValue(INVENTARIO_HEADERS.COLECCION) || getByIndex(16) || '',`. (2) No hay guard aguas arriba: `getValue` (líneas 163-169) devuelve `null` cuando la celda está VACÍA (`row[index] !== ''`), no sólo cuando falta el encabezado — así que el `||` cae al posicional exactamente en las filas sin colección. `normalizeHeader` sólo minusculiza y colapsa espacios, así que 'Colección' (col S, idx 18) SÍ resuelve por nombre; el respaldo nunca puede ser útil, sólo puede devolver la columna vecina equivocada. En el libro que se lee, idx 16 = col Q = ESTADO (api/_lib/fotosintesis-inventory-columns.js:78). (3) El camino es alcanzable y público: el handler lee `SPREADSHEET_ID` con rango `Inventario!A:${FOTO_INVENTARIO_LAST_COL}` (líneas 379-380), y .env.local confirma que SPREADSHEET_ID y FOTOSINTESIS_SPREADSHEET_ID son el MISMO libro (1oRw1KSh8L1Cy…); `resolveGrant` admite grant `anon` y `toPublicItem` (api/_lib/catalogProjection.ts:127) copia `coleccion` tal cual porque está en PUBLIC_KEYS (línea 37). El hook vive: useSheetsTreasure.ts:137 pega a /api/get-treasure-sheets, useTreasure.ts lo consume y lo usan Home.tsx, TreasureBrowser, VitrinaPage, CotizacionGenerator, etc. `overlayConvexCatalogFields` (src/utils/catalogOverlay.ts) sólo añade `precioEspecial` y `publishedAt` — no corrige `coleccion`. useFilterOptions.ts:69-74 no tiene allowlist: cualquier `item.coleccion` no vacío entra al desplegable. (4) El daño ocurre con los datos de hoy: el snapshot (scripts/.backups/nota-sot-v3-antes.md §Colección) da 204/523 vacíos (39.0%), y §3 Estado suma 274+193+16+15+14+4+4+2+1 = 523 SIN bucket «(vacío)» — el mismo script sí emite ese bucket para Colección y para Caja, así que row[16] está poblado en todas las filas y el respaldo dispara en las 204. Agravante que el hallazgo no destaca: `estado` está en WITHHELD_KEYS (catalogProjection.ts:66) — el allowlist lo oculta a propósito al visitante anónimo, y esta línea lo vuelve a sacar disfrazado de `coleccion`, o sea que derrota la proyección en el 39% del catálogo. No refuto.

**Corrección propuesta.** Arreglo mínimo — borrar el respaldo posicional, igual que ya se hizo con `ubicacion` ("NO positional fallback here") y con `precioCOP`. En api/get-treasure-sheets.ts:275 cambiar:

    coleccion: getValue(INVENTARIO_HEADERS.COLECCION) || getByIndex(16) || '',

por:

    // Sólo por encabezado. `getByIndex(16)` codifica el layout legacy (Q =
    // Colección); en el SOT v3 el índice 16 es ESTADO (col Q), y como
    // `getValue` devuelve null también con la celda VACÍA, el respaldo se
    // disparaba en los 204 ítems sin colección y servía "DISPONIBLE" /
    // "VENDIDA" / "Retornado" como nombre de colección — a un visitante
    // anónimo, porque `coleccion` está en PUBLIC_KEYS y `estado` en
    // WITHHELD_KEYS. Colección vacía significa "sin colección", no "leé el
    // estado". En la legacy el encabezado "Colección" también existe (idx 16),
    // así que quitarlo es un no-op ahí.
    coleccion: getValue(INVENTARIO_HEADERS.COLECCION) || '',

Es un cambio de una línea, sin migración ni backfill: el valor correcto para esas 204 filas es la cadena vacía, que es lo que el nuevo código produce; la insignia de la tarjeta desaparece y el desplegable de useFilterOptions deja de listar estados.

Seguimiento aparte (no bloqueante, no expuesto al anónimo): los hermanos de las líneas 269-283 arrastran el mismo corrimiento de dos columnas contra el SOT — `estado: getByIndex(14)` → UBICACIÓN, `qr: getByIndex(15)` → ASESOR, `caja: getByIndex(17)` → QR, `asesorActual: getByIndex(19)` → CAJA, `estadoAsesor: getByIndex(20)` → preponderancia. Hoy no se disparan porque esos encabezados están poblados casi siempre, y los campos son WITHHELD, pero la vista de staff sí los vería mal en cuanto una celda quede en blanco. La misma poda aplica.

---

### [MEDIA] El resto de la cadena de respaldos posicionales legacy sigue viva: caja←QR, estadoAsesor←preponderancia, estado←UBICACIÓN, asesor←columna N

- **Archivo:** `api/get-treasure-sheets.ts:276`
- **Familia:** posicional · **Confianza:** seguro

**Escenario.** El bloque de `getByIndex` de `mapRowToTreasureItem` codifica entero el layout legacy A:U. Sólo se quitaron DOS: `ubicacion` (P0.3) y `precioCOP` (2026-08-21). Los demás siguen corridos +2 respecto del SOT porque el bloque de precios (L costoBaseCOP, M precioFinalCOP, N «(sin uso)») empujó todo:

· `caja` ← getByIndex(17) = **QR**. Con CAJA vacía en 360/523 filas (nota-sot-v3-antes.md:737-743) y QR lleno (36/36 filas de los respaldos del 12-ago traen `https://tierramadre.app/p/<n>`), `caja` sale con la URL pública del producto. Verificado sobre datos reales: en scripts/.backups/inventario-manuscrito-2026-08-12…json las 30 filas tienen idx17=URL y idx19="".
· `estadoAsesor` ← getByIndex(20) = **preponderancia** (un número, % del lote). Medido: 8/30 filas del mismo respaldo tienen ESTADO ASESOR vacío y preponderancia con valor → `estadoAsesor = "35.5"`. `toTreasureStatus` lo descarta, así que hoy sólo ensucia lo que se muestra a staff, pero es un número de negocio viajando en un campo de estado.
· `estado` ← getByIndex(14) = **UBICACIÓN**. Hoy LATENTE (ESTADO está lleno en 523/523), pero el día que una fila nueva llegue sin estado el ítem no cae en el default 'DISPONIBLE' sino en «OFI.CALI»/«BOVEDA OFI», que `TM_SELLABLE` no reconoce (src/utils/productOffer.ts:60,83) → la pieza pasa de vendible a no comprable y desaparece del filtro «disponibles».
· `asesor` ← getByIndex(13) = columna N **«(sin uso)»**, que hasta el refactor de precios del 2026-07-21 fue `precioConscienteCOP`. Hoy está vacía (0/30 filas con dato en el respaldo del 12-ago), pero cualquier residuo o reutilización de esa columna pondría un precio dentro del campo `asesor` — exactamente el reporte «Ubicación: 150820» que motivó quitar el respaldo de `ubicacion`.
· `medidasValores` (línea 210) es **puramente posicional**, sin ninguna búsqueda por encabezado: `getByIndex(9)`. Coincide hoy por suerte (J = «Medidas (valores)»), sin nada que lo garantice.

**Evidencia.**
```
api/get-treasure-sheets.ts:269-283
    estado: (
      getValue(INVENTARIO_HEADERS.ESTADO) ||
      getByIndex(14) ||            // SOT idx 14 = O = UBICACIÓN
      'DISPONIBLE'
    ).toUpperCase() as TreasureStatus,
    qr: getValue(INVENTARIO_HEADERS.QR) || getByIndex(15) || '',        // SOT idx 15 = P = ASESOR
    coleccion: getValue(INVENTARIO_HEADERS.COLECCION) || getByIndex(16) || '',
    caja: getValue(INVENTARIO_HEADERS.CAJA) || getByIndex(17) || '',    // SOT idx 17 = R = QR
    asesorActual:
      getValue(INVENTARIO_HEADERS.ASESOR_ACTUAL) || getByIndex(19) || '',
    estadoAsesor: (
      getValue(INVENTARIO_HEADERS.ESTADO_ASESOR) ||
      getByIndex(20) ||            // SOT idx 20 = U = preponderancia
      ''
    ).toUpperCase() as TreasureStatus | '',

api/get-treasure-sheets.ts:210
    medidasValores: getByIndex(9) || '',   // sin getValue: 100% posicional

Fila real del SOT (scripts/.backups/inventario-manuscrito-2026-08-12T20-04-46-369Z.json, ítem 89):
  idx14 "OFI.CALI" | idx15 "TMÄ" | idx16 "DISPONIBLE" | idx17 "https://tierramadre.app/p/89" | idx18 "Secretos del Bosque" | idx19 "" | idx20 "" | idx21 ""
```

**Veredicto del verificador.** CONFIRMADO en lo esencial, con tres recortes de exageración.

1) ¿El fragmento existe? Sí, las líneas de código son textuales (api/get-treasure-sheets.ts:210, 268-283). ATENCIÓN: los comentarios `// SOT idx 14 = O = UBICACIÓN`, `// SOT idx 15 = P = ASESOR`, `// SOT idx 17 = R = QR`, `// SOT idx 20 = U = preponderancia` NO están en el archivo — `grep -n "SOT idx" api/get-treasure-sheets.ts` no devuelve nada. Son anotaciones del reportante pegadas dentro de un bloque presentado como cita literal. El código sí es exacto.

2) ¿Hay guard aguas arriba? NO, y esa es la clave. `getValue` (líneas 165-171) devuelve `null` no sólo cuando falta el encabezado sino también cuando la CELDA ESTÁ VACÍA: `if (index >= 0 && row[index] !== undefined && row[index] !== '')`. Todos los encabezados del SOT resolvieron (verifiqué `normalizeHeader` en api/_lib/sheets-helpers.js:78 — sólo minúsculas + colapso de espacios, sin quitar acentos: "CAJA"→"caja", "UBICACIÓN"→"ubicación", "ESTADO ASESOR"→"estado asesor", todos hacen match exacto contra INVENTARIO_HEADERS). O sea que el respaldo posicional NO es código muerto: se dispara en cada fila con esa celda en blanco, y lee la columna del vecino. Es el mismo mecanismo exacto de los dos defectos ya corregidos.

3) ¿Alcanzable en prod? Sí. `SPREADSHEET_ID` = `1oRw1KSh8L1Cy…` (.env.local:32), el MISMO libro que `FOTOSINTESIS_SPREADSHEET_ID` (.env.local:35), y `requireSheetId` (api/_lib/constants.js:59-69) ya no admite caer en la legacy. `get-treasure-sheets` es el endpoint vivo del catálogo (src/hooks/useSheetsTreasure.ts:137) y `mapRowToTreasureItem` está exportado y reusado por `api/ambassador-products.ts`.

4) ¿El daño ocurre hoy? Verifiqué contra respaldos reales del libro 1oRw1KSh. Las cabeceras del SOT son idx11 costoBaseCOP, 12 precioFinalCOP, 13 "(sin uso)", 14 UBICACIÓN, 15 ASESOR, 16 ESTADO, 17 QR, 18 Colección, 19 CAJA, 20 preponderancia, 21 ASESOR ACTUAL, 22 ESTADO ASESOR — es decir, los `getByIndex(13..20)` están corridos exactamente como dice el hallazgo.
 · `caja` ← idx17 (QR): CONFIRMADO ACTIVO. En inventario-manuscrito-2026-08-12 las 30/30 filas tienen idx19 (CAJA) vacío e idx17 con `https://tierramadre.app/p/<n>`; en remanentes-12ago, 5/12 (ej. ítem 80: idx17 `https://tierramadre.app/p/80`, idx19 `''`). Y nota-sot-v3-antes.md:737 confirma CAJA vacía en 360/523 (68.8%) del libro entero. El payload servido devuelve la URL pública dentro del campo que la hoja usa para "Legalizada / Pte legalizar".
 · `estadoAsesor` ← idx20 (preponderancia): CONFIRMADO ACTIVO, 8/30 filas. Pero el valor de ejemplo del hallazgo ("35.5") es INVENTADO: los valores reales son fracciones — 0.5, 0.5, 0.1743, 0.1481, 0.1089, 0.4255, 0.2766, 0.1702. El conteo 8/30 sí es correcto.
 · `estado` ← idx14 (UBICACIÓN): LATENTE, y más latente de lo que el hallazgo sugiere. Las 2 filas del respaldo con ESTADO vacío (ítems 501 y 504) tienen TAMBIÉN idx14 vacío, así que hoy caen en el default 'DISPONIBLE' correctamente. El riesgo es real (470/523 filas tienen ubicación con valor, y TM_SELLABLE en src/utils/productOffer.ts:60 no reconoce "OFI.CALI") pero no está disparando.
 · `asesor` ← idx13 y `medidasValores` ← idx9: LATENTES. idx13 "(sin uso)" está vacío en 30/30 filas; idx9 coincide por suerte con "Medidas (valores)".

Dos atenuantes que el hallazgo no menciona y que bajan la severidad (sin volverlo falso):
 · NO hay fuga a no-staff. `caja`, `qr`, `estado`, `asesor`, `estadoAsesor` están todos en WITHHELD_KEYS (api/_lib/catalogProjection.ts:60-66), así que anon/vitrina nunca los reciben. Sólo se ensucia el payload de staff.
 · NO hay camino de vuelta a la hoja. Ningún consumidor del catálogo renderiza `TreasureItem.caja` (el único uso en UI es src/pages/admin/ProductManagement/*, que lee de Convex vía useFotosintesisCatalog, no de este endpoint), y `estadoAsesor="0.5"` lo descarta `toTreasureStatus` (src/utils/asesorProductOwnership.ts:17-22, VALID_STATUSES) cayendo a `item.estado`. Es decir: payload incorrecto, no pantalla incorrecta ni SOT corrompido.

Veredicto: real. Es exactamente la familia (c) que se pidió buscar — un respaldo posicional sobre un libro cuya forma ya no es la que ese índice supone — y en dos campos está demostrado con datos de producción, no en hipótesis. Vender el `caja`←QR como equivalente al defecto de precio sería exagerar; dejarlo vivo sería repetir por tercera vez el patrón que ya costó dos incidentes.

**Corrección propuesta.** Un solo cambio, en api/get-treasure-sheets.ts, que mata los siete respaldos corridos de una vez y además preserva el soporte legacy que el comentario de las líneas 256-260 declara load-bearing para `asesor`.

La raíz no es "hay respaldos posicionales": es que `getValue` confunde «encabezado ausente» con «celda vacía», y sólo el primer caso justifica leer por índice. Añadir junto a `getValue` (después de la línea 178):

    // El respaldo posicional codifica el layout legacy A:U. Sólo tiene sentido
    // cuando el libro NO tiene el encabezado. Una celda vacía con encabezado
    // presente significa "sin valor", no "leé la columna de al lado" — y en el
    // SOT v3 la de al lado es otra cosa (QR, preponderancia, UBICACIÓN…).
    const getByIndexIfNoHeader = (headerName: string, index: number) =>
      getColumnIndex(headerName) < 0 ? getByIndex(index) : null;

y reemplazar en el bloque 268-283:

    asesor: getValue(H.ASESOR) || getByIndexIfNoHeader(H.ASESOR, 13) || '',
    estado: (getValue(H.ESTADO) || getByIndexIfNoHeader(H.ESTADO, 14) || 'DISPONIBLE').toUpperCase() as TreasureStatus,
    qr: getValue(H.QR) || getByIndexIfNoHeader(H.QR, 15) || '',
    coleccion: getValue(H.COLECCION) || getByIndexIfNoHeader(H.COLECCION, 16) || '',
    caja: getValue(H.CAJA) || getByIndexIfNoHeader(H.CAJA, 17) || '',
    asesorActual: getValue(H.ASESOR_ACTUAL) || getByIndexIfNoHeader(H.ASESOR_ACTUAL, 19) || '',
    estadoAsesor: (getValue(H.ESTADO_ASESOR) || getByIndexIfNoHeader(H.ESTADO_ASESOR, 20) || '').toUpperCase() as TreasureStatus | '',

(y por consistencia los de arriba: ITEM 0, FECHA_INGRESO 1, NOMBRE 2, PESO 3, COLOR 4, CALIDAD 5, CANTIDAD 6, CORTE/TALLA 7, MEDIDAS 8, CATEGORIA 10 — hoy inofensivos porque idx 0-10 coinciden en ambos libros, pero quedan blindados ante la próxima columna insertada).

Para `medidasValores`, que hoy es 100% posicional sin ningún encabezado, agregar la clave y usarla primero:

    MEDIDAS_VALORES: 'medidas (valores)',   // en INVENTARIO_HEADERS
    medidasValores: getValue(H.MEDIDAS_VALORES) || getByIndexIfNoHeader(H.MEDIDAS_VALORES, 9) || '',

Efecto en el SOT v3: como TODOS esos encabezados existen en el libro vivo, `getByIndexIfNoHeader` devuelve `null` siempre y ningún campo vuelve a leer la columna del vecino. Efecto en un libro legacy sin encabezado `asesor`: el índice 13 sigue funcionando igual que hoy. Cero regresión, y el arreglo es estructural — cubre también el próximo campo que alguien agregue con respaldo posicional.

Verificación mínima antes de mergear: correr el endpoint contra el SOT y comprobar que ningún ítem devuelve `caja` empezando por `https://` y que ningún `estadoAsesor` parsea como número.

---

### [ALTA] GET /api/cotizacion-save no tiene ninguna autenticación: sirve teléfono y nombre de cliente de cualquier asesor, y el tablero de stats completo, a un anónimo

- **Archivo:** `api/cotizacion-save.ts:1104`
- **Familia:** fuga-de-datos · **Confianza:** seguro

**Escenario.** El propio archivo desactivó `action=public` por IDOR («devolvía cualquier cotización — nombre y teléfono del cliente + precios — por su número, que es enumerable», línea 1119-1125), pero dejó abiertas las otras DOS rutas del mismo GET, que son peores porque no hay que enumerar nada:

1. `GET /api/cotizacion-save?email=<asesor>` → `getCotizacionesByAsesor` devuelve, por cada cotización de ese asesor, `clientName`, **`clientPhone`**, `asesorEmail`, `total`, `driveFileId` e `id`. Sin sesión, sin token, sin nada.
2. `GET /api/cotizacion-save?action=stats` → `getCotizacionStats` devuelve `recentCotizaciones` (las 20 últimas con `asesorEmail`, `clientName`, `total`), `topAsesores` con correos, `uniqueClients`, `totalValue` y `topProducts` con valor acumulado por producto y por asesor.

`withApiHandler` no aporta ninguna puerta: su única verificación es `requireGoogle`, que comprueba la configuración del SERVIDOR, no al llamante (api/_lib/with-api-handler.js:67-70). No hay `verifiedSessionEmail`, ni `bearerMatches`, ni `ADMIN_SYNC_TOKEN` en todo el archivo (`grep -c` sobre cotizacion-save.ts: 0 coincidencias de sessionToken/bearer).

Es exactamente el defecto que api/cotizacion-reports.ts documenta como YA CORREGIDO en su propia cabecera («un GET anónimo respondió 200 con 19 registros con clientPhone, clientEmail — clientes reales, 7 teléfonos, 3 correos»). La misma PII vive en `CotizacionesAsesores` y ahí la puerta nunca se escribió. El correo del asesor no es secreto (basta un `?email=` por cada asesor del roster, que /api/get-asesores publica por slug y nombre).

**Evidencia.**
```
api/cotizacion-save.ts:1104-1145 (rama GET completa, sin un solo chequeo de credencial)
    if (req.method === 'GET') {
      const email = firstQueryParam(req.query?.email …);
      const action = firstQueryParam(req.query?.action …);
      …
      if (action === 'public' && quotationNumber) {
        return sendError(res, 404, 'Cotización no encontrada');   // ← lo único cerrado
      }
      if (action === 'stats') {
        const stats = await getCotizacionStats(sheets);
        return sendSuccess(res, stats);
      }
      …
      const cotizaciones = await getCotizacionesByAsesor(sheets, email);
      return sendSuccess(res, { cotizaciones, count: cotizaciones.length });

api/cotizacion-save.ts:536-547 (lo que devuelve)
        asesorEmail: row[2],
        asesorName: row[3],
        clientName: row[4],
        clientPhone: row[5],
        total: parseFloat(row[7]) || 0,
        driveFileId: row[9],

api/_lib/with-api-handler.js:67-70
    if (requireGoogle && !isGoogleConfigured()) {
      return sendError(res, 500, 'Google OAuth not configured');
    }   // ← única "puerta": config del servidor, no del llamante
```

**Veredicto del verificador.** CONFIRMADO en las cuatro comprobaciones. (1) Los fragmentos existen textualmente: la rama GET completa está en api/cotizacion-save.ts:1103-1147 con el early-return 404 de `action=public` y su comentario de IDOR, seguida de `action=stats` y del `getCotizacionesByAsesor(sheets, email)` sin ningún chequeo; el mapeo `asesorEmail: row[2]` / `clientPhone: row[5]` está en las líneas 538 y 541; api/_lib/with-api-handler.js:67-70 es literal. (2) No hay guard aguas arriba: `grep -n "sessionToken|extractBearer|Bearer|authorization|Authorization|ADMIN_SYNC_TOKEN|verifiedSession" api/cotizacion-save.ts` sale con exit 1 — cero coincidencias en 1266 líneas. `withApiHandler` sólo hace CORS, cache headers, `isGoogleConfigured()` (config del SERVIDOR) y construcción de clientes; `initApi` (api/_lib/cors.js:138-153) sólo hace setCorsHeaders + handleOptions + checkMethod. No existe middleware.ts y vercel.json no tiene más que `maxDuration`. (3) El camino es alcanzable en producción: api/cotizacion-save.ts está declarado en vercel.json y lo llaman tres hooks vivos — useCotizacionStats.ts:74 y useAllActivity.ts:103 con `?action=stats`, useCotizacionHistory.ts:111 con `?email=` — todos con un `fetch()` pelado, SIN header Authorization. Eso prueba que hoy el endpoint responde a peticiones anónimas; si no lo hiciera, el propio tablero de admin estaría roto. (4) El daño ocurre de verdad y es peor de lo que dice el hallazgo: no hace falta /api/get-asesores para conocer los correos de los asesores, porque `action=stats` los entrega él mismo (`topAsesores[].email` ~línea 960 y `recentCotizaciones[].asesorEmail` línea 973). Un solo GET anónimo a `?action=stats` da el roster de correos; un `?email=` por cada uno devuelve nombre, TELÉFONO, total y driveFileId de cada cliente. El bucle de enumeración se cierra con conocimiento previo cero. Ambas rutas leen `CotizacionesAsesores!A:L` de APP_SPREADSHEET_ID y devuelven la fila sin filtrar. Único punto no verificable desde aquí (mandato de sólo lectura, sin credenciales de prod): el conteo actual de filas en la hoja viva; pero api/cotizacion-reports.ts:9-17 documenta 19 registros reales con 7 teléfonos en la hoja hermana del mismo libro, y CotizacionesAsesores es el log principal que escribe el POST de este mismo archivo en cada cotización — una hoja vacía no es un estado plausible. ADEMÁS (fuera del alcance del hallazgo pero en la misma superficie): `action=productCotizaciones` (~línea 1136) también está abierto, y el DELETE (líneas 1236-1254) es igualmente anónimo: toma `id` y `email` del query string y `deleteCotizacion` borra el archivo de Drive y la fila de la hoja — es un camino de ESCRITURA destructiva alcanzable con el mismo `id` que la fuga de `?email=` acaba de entregar.

**Corrección propuesta.** Arreglo mínimo, calcado del patrón que api/cotizacion-reports.ts ya usa (no inventar mecanismo nuevo):

1. En api/cotizacion-save.ts, importar el verificador que ya existe:
   `import { extractBearer } from './_lib/bearer.js';`
   `import { isSessionToken, verifySessionToken } from './_lib/sessionToken.js';`
   y copiar el helper `verifiedSessionEmail(authHeader)` de api/cotizacion-reports.ts:69-74 (o exportarlo desde _lib para no duplicarlo).

2. Como PRIMERA línea dentro de `if (req.method === 'GET') {` (línea 1103), antes de leer un solo query param y antes de cualquier llamada a Sheets:

   const sessionEmail = verifiedSessionEmail(req.headers['authorization']);
   if (!sessionEmail) return sendError(res, 401, 'Unauthorized');

3. Scoping por rama, para que un asesor autenticado no lea la cartera de otro:
   - `action=stats` y `action=productCotizaciones`: exigir admin —
     `if (!isAdminEmail(sessionEmail)) return sendError(res, 403, 'Forbidden');`
     reutilizando `isAdminEmail` de api/invitations.ts:283 (moverlo a _lib).
   - rama `?email=`: ignorar el parámetro como fuente de verdad —
     `const target = isAdminEmail(sessionEmail) ? (email ?? sessionEmail) : sessionEmail;`
     y pasar `target` a `getCotizacionesByAsesor`. Así el `?email=` de un tercero deja de ser una llave.

4. Mismo gate en la rama DELETE (línea 1236), que hoy borra archivo de Drive + fila de hoja con sólo `id`+`email` anónimos: exigir sesión y que `deleteCotizacion` reciba `sessionEmail`, no el `email` del query string.

5. Cambio de cliente obligatorio (si no, se rompe el tablero): añadir `Authorization: Bearer <token tms1>` a los tres fetch — src/hooks/useCotizacionStats.ts:74, src/hooks/useAllActivity.ts:103, src/hooks/useCotizacionHistory.ts:111/148/230 — y a src/pages/admin/ProductViewers/ProductViewersPage.tsx:95, usando el mismo mecanismo de token que ya usan invitations/product-views.

NOTA: `requireAdminEmail` de api/_lib/cors.js:115 NO sirve como puerta aquí — lee el correo de la cabecera `x-requester-email` (falsificable por cualquiera) y, si `ADMIN_EMAILS` no está configurada, hace `return true` (línea 126-128). Usar el token `tms1` verificado, no esa función.

---

### [ALTA] DELETE /api/cotizacion-save tampoco pide credencial: cualquiera borra la cotización de cualquier asesor, con el id que el GET abierto le acaba de entregar

- **Archivo:** `api/cotizacion-save.ts:1237`
- **Familia:** borrado · **Confianza:** seguro

**Escenario.** La rama DELETE sólo exige los parámetros `id` y `email` de la query. `deleteCotizacion` los usa como si fueran la autorización: busca la fila cuyo id coincide Y cuyo `asesorEmail` (row[2]) coincide, y si la encuentra **borra el archivo de Drive** (`drive.files.delete`) y **limpia la fila de la hoja** (`values.clear` sobre A:L). Ese par no es un secreto: la rama GET del mismo archivo (hallazgo anterior) lo entrega sin autenticación — `id` y `asesorEmail` vienen juntos en cada objeto de `getCotizacionesByAsesor`.

Cadena completa, sin credencial en ningún paso:
  GET /api/cotizacion-save?email=<asesor>   → [{ id: 'cot-…', asesorEmail: '<asesor>' }, …]
  DELETE /api/cotizacion-save?id=cot-…&email=<asesor>  → fila borrada + PDF de Drive borrado

El borrado es `values.clear` sobre el rango de la fila, así que no queda ni la fila vacía marcada: la cotización desaparece de los reportes, de las stats y del histórico del asesor, y el PDF en Drive se va con ella. No hay respaldo ni bitácora en el camino.

(La rama POST, líneas 1152+, tiene el mismo agujero en sentido de escritura: appendea `clientName`/`clientPhone` a la hoja sin autenticar — la misma puerta de inyección de PII que cotizacion-reports.ts cerró explícitamente en su POST por este motivo.)

**Evidencia.**
```
api/cotizacion-save.ts:1237-1255
    if (req.method === 'DELETE') {
      if (!drive) { return sendError(res, 500, 'Google Drive not available'); }
      const id = firstQueryParam(req.query?.id …);
      const email = firstQueryParam(req.query?.email …);
      if (!id || !email) {
        return sendError(res, 400, 'ID and email parameters required');
      }
      await deleteCotizacion(drive, sheets, id, email);   // ← sin verificar quién llama
      return sendSuccess(res, { deleted: true });

api/cotizacion-save.ts:1055-1074 (dentro de deleteCotizacion)
    if (driveFileId) {
      await drive.files.delete({ fileId: driveFileId, supportsAllDrives: true });
    }
    await sheets.spreadsheets.values.clear({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `${COTIZACIONES_SHEET}!A${rowIndex}:L${rowIndex}`,
    });
```

**Veredicto del verificador.** Intenté refutarlo por las cuatro vías y ninguna lo tumba.

1) EL FRAGMENTO EXISTE, casi textual (api/cotizacion-save.ts:1233-1252):

    if (req.method === 'DELETE') {
      if (!drive) { return sendError(res, 500, 'Google Drive not available'); }
      const id = firstQueryParam(req.query?.id as string | string[] | undefined);
      const email = firstQueryParam(req.query?.email as string | string[] | undefined);
      if (!id || !email) { return sendError(res, 400, 'ID and email parameters required'); }
      await deleteCotizacion(drive, sheets, id, email);
      return sendSuccess(res, { deleted: true });
    }

y deleteCotizacion (api/cotizacion-save.ts:1025-1078) hace exactamente lo descrito: busca `rows[i][0] === cotizacionId && rows[i][2]?.toLowerCase().trim() === normalizedEmail`, y con eso `drive.files.delete({ fileId: driveFileId, supportsAllDrives: true })` (borrado permanente, no papelera) + `sheets.spreadsheets.values.clear({ range: `${COTIZACIONES_SHEET}!A${rowIndex}:L${rowIndex}` })`.

Dos matices menores del informe (ninguno lo invalida): el `drive.files.delete` está envuelto en try/catch con `console.warn`, así que si Drive falla igual se limpia la fila; y `values.clear` deja la fila física vacía (no desplaza índices), pero como `getCotizacionesByAsesor` filtra por row[2] y `getCotizacionStats` por `filter(row => row[0])`, el efecto es el que dice: desaparece del histórico, de las stats y de los reportes.

2) NO HAY GUARD AGUAS ARRIBA. Los imports de api/cotizacion-save.ts:12-22 son solo withApiHandler, SPREADSHEET_ID, APP_SPREADSHEET_ID, sendError, sendSuccess, getSheetNames, findSheetByPattern, findColumnIndex, formatDisplayName — cero `bearer`, cero `sessionToken`. Leí `withApiHandler` (api/_lib/with-api-handler.js:57-100): sus seis pasos son CORS/preflight/método (`initApi`), cache headers, `isGoogleConfigured`, `getSharedDriveId`, creación de clientes y try/catch. Ningún paso de autenticación. `initApi` (api/_lib/cors.js:138-156) solo pone cabeceras CORS y valida el método — CORS no detiene un curl. No existe `middleware.ts` en la raíz ni ningún matcher de auth en `vercel.json`.

El contraste que confirma que el proyecto sabe cómo se hace: api/cotizacion-reports.ts:42-43 importa `extractBearer` / `verifySessionToken`, define `verifiedSessionEmail` (líneas 69-76) y corta ANTES de tocar Sheets (líneas 144-147):
    if (!verifiedSessionEmail(req.headers['authorization'])) {
      return sendError(res, 401, 'Inicia sesión para ver esta información.');
    }
El endpoint hermano, sobre el MISMO libro `APP_SPREADSHEET_ID`, tiene el candado. Éste no.

3) EL CAMINO ES ALCANZABLE EN PRODUCCIÓN, no es código muerto. `vercel.json` declara `"api/cotizacion-save.ts": { "maxDuration": 30 }`, y el cliente vivo lo llama: src/hooks/useCotizacionHistory.ts:229-232 hace `fetch(`/api/cotizacion-save?id=…&email=…`, { method: 'DELETE' })` sin cabecera alguna — la ausencia de Authorization en el cliente prueba que el servidor tampoco la exige.

4) LA CADENA DE ADQUISICIÓN DEL PAR (id, email) ES AÚN MÁS CORTA DE LO QUE DICE EL INFORME. No hace falta conocer el email de un asesor: `GET /api/cotizacion-save?action=stats` no pasa por ningún gate (líneas 1127-1131) y `getCotizacionStats` devuelve `recentCotizaciones` con `{ id: row[0], …, asesorEmail: row[2] }` (líneas 967-975) para las 20 más recientes. Un solo GET anónimo entrega 20 pares listos para DELETE. Eso refuerza el hallazgo, no lo refuta.

ÚNICA INCERTIDUMBRE, y no toca la conclusión: no puedo leer la pestaña `CotizacionesAsesores` de producción desde aquí, así que no verifiqué el conteo de filas de hoy. Pero la pestaña es la que alimenta el histórico del asesor, las stats del dashboard (useCotizacionStats.ts:74, useAllActivity.ts:103) y la vista de ProductViewersPage — y el POST del mismo archivo la sigue appendeando. Que esté poblada es lo esperable; en el peor caso el daño es futuro, no inexistente.

Nota sobre el paréntesis del POST: también es cierto (líneas 1156-1210, ni una verificación de identidad antes de `saveCotizacionToSheet` con `clientName`/`clientPhone`), pero es un segundo defecto de la misma raíz, no evidencia del borrado. Repórtese junto, arréglese con el mismo gate.

**Corrección propuesta.** Arreglo mínimo: poner en api/cotizacion-save.ts el MISMO gate que ya usa api/cotizacion-reports.ts, y exigir que el email del token —no el de la query— sea el dueño.

1. Importar el helper (junto a los imports de la línea 12):

    import { extractBearer } from './_lib/bearer.js';
    import { isSessionToken, verifySessionToken } from './_lib/sessionToken.js';

    function verifiedSessionEmail(authHeader?: string | string[]): string | null {
      const token = extractBearer(authHeader);
      if (!token || !isSessionToken(token)) return null;
      return verifySessionToken(token)?.email ?? null;
    }

2. En la rama DELETE (línea 1233), derivar el dueño del token y NO de la query — así el `email` deja de ser la autorización y pasa a ser irrelevante:

    if (req.method === 'DELETE') {
      const callerEmail = verifiedSessionEmail(req.headers['authorization']);
      if (!callerEmail) return sendError(res, 401, 'Inicia sesión para continuar.');
      if (!drive) return sendError(res, 500, 'Google Drive not available');
      const id = firstQueryParam(req.query?.id as string | string[] | undefined);
      if (!id) return sendError(res, 400, 'ID parameter required');
      await deleteCotizacion(drive, sheets, id, callerEmail);  // ← dueño = token
      return sendSuccess(res, { deleted: true });
    }

El `deleteCotizacion` ya compara row[2] contra el email recibido y lanza 'not owned by this asesor', así que con el token como fuente el chequeo de propiedad pasa a ser real sin tocar esa función. (Si un admin debe poder borrar de otros, agregar ahí una comprobación explícita de rol, nunca un bypass por query param.)

3. Mismo gate al tope de POST (línea 1156) y de la rama GET por email (línea 1103), usando `callerEmail` como `asesorEmail` en vez del que venga en el body/query — es la misma puerta y cerrarla en un solo lado deja la enumeración de pares (id, asesorEmail) intacta vía `action=stats` y `action=productCotizaciones`, que también deben quedar detrás del 401 igual que en cotizacion-reports.ts (gate ANTES de cualquier llamada a Sheets, para no gastar cuota con un no autorizado).

4. Cliente: `useCotizacionHistory.ts` (líneas 111, 148 y 229-232) y `useCotizacionStats.ts:74` / `useAllActivity.ts:103` / `ProductViewersPage.tsx:95` deben mandar la cabecera. Ya existe el patrón en el repo: `src/utils/catalogAuthHeaders.ts` (`Authorization: Bearer ${token}`), usado igual en useProductViews.ts:105 y useCreatorInvitations.ts:52. Sin este paso el gate rompe la UI, así que va en el mismo commit.

5. Endurecimiento aparte, no bloqueante: cambiar `drive.files.delete` por `drive.files.update({ fileId, requestBody: { trashed: true } })` y `values.clear` por marcar la fila como anulada (columna de estado + timestamp + quién), para que un borrado deje rastro recuperable. Hoy no hay bitácora ni respaldo en ningún punto del camino.

---

### [MEDIA] `products:publishedCatalog` publica ubicacion, asesor, caja, asesorActual y estado a cualquier lector anónimo — los mismos campos que el riel de Sheets clasifica como WITHHELD

- **Archivo:** `convex/products.ts:576`
- **Familia:** fuga-de-datos · **Confianza:** seguro

**Escenario.** En Convex una `query({})` es PÚBLICA y la URL del deployment viaja en el bundle del cliente (`VITE_CONVEX_URL`) — el propio archivo lo demuestra dos queries más arriba, donde `fotosintesisFields` tuvo que cerrarse con `ADMIN_SYNC_TOKEN` tras comprobar que un `new ConvexHttpClient(url).query(...)` sin credencial devolvía las 513 filas (convex/products.ts:275-292). `publishedCatalog` no tiene ninguna puerta y proyecta a mano —campo por campo— `ubicacion`, `asesor`, `estado`, `qr`, `caja`, `asesorActual` y `estadoAsesor`.

Esos siete están, literalmente, en `WITHHELD_KEYS` de api/_lib/catalogProjection.ts:60-67: el riel de Sheets los borra para todo llamante que no sea staff, y el bloqueo se diseñó a propósito («measured against production… `asesor` / `asesorActual` / `estado` / `precioCOP` appear in 0 of them», api/ambassador-products.ts:9-12). El riel de Convex sirve los mismos campos a cualquiera. El comentario de la query sólo razona sobre `costoBaseCOP` («intentionally NOT projected so the public can't see cost») — el resto entró sin que nadie lo decidiera.

Qué se filtra en concreto: **dónde está físicamente cada esmeralda publicada** (`ubicacion`: OFI.CALI, OFI.BOGOTA, BOVEDA…, 45.9%/8.0% del inventario según el snapshot del 11-ago), en qué caja contable está, y a qué asesor se le atribuye. El hook lo consume sin filtrar y además lo **persiste en localStorage** del visitante (useFotosintesisCatalog.ts:287, `writeCatalogCache`), con `PublishedRow` declarando los campos uno a uno (líneas 69-76).

**Evidencia.**
```
convex/products.ts:515-518 y 576-584
export const publishedCatalog = query({
  args: {},                       // ← sin sessionToken, sin secret
  handler: async (ctx) => {
  …
        ubicacion: row.ubicacion,
        asesor: row.asesor,
        estado: row.estado,
        qr: row.qr,
        coleccion: row.coleccion,
        caja: row.caja,
        asesorActual: row.asesorActual,
        estadoAsesor: row.estadoAsesor,

api/_lib/catalogProjection.ts:55-67 (los MISMOS campos, del otro lado)
export const WITHHELD_KEYS = [
  … 'ubicacion', 'asesor', 'estado', 'asesorActual', 'estadoAsesor', 'caja', 'qr', …
] as const;

src/hooks/useFotosintesisCatalog.ts:69-76 (llegan al browser tal cual)
  ubicacion?: string;
  asesor?: string;
  estado?: string;
  qr?: string;
  coleccion?: string;
  caja?: string;
  asesorActual?: string;
  estadoAsesor?: string;
```

**Veredicto del verificador.** Intenté refutarlo por las cuatro vías y ninguna lo tumba; al contrario, lo confirmé empíricamente contra producción.

1) EL FRAGMENTO EXISTE TAL CUAL. convex/products.ts:515-517 `export const publishedCatalog = query({ args: {}, handler: async (ctx) => {` — sin `secret`, sin `sessionToken`. Y la proyección literal en 576-584: `ubicacion: row.ubicacion,` / `asesor: row.asesor,` / `estado: row.estado,` / `qr: row.qr,` / `coleccion: row.coleccion,` / `caja: row.caja,` / `asesorActual: row.asesorActual,` / `estadoAsesor: row.estadoAsesor,`. Nada parafraseado. WITHHELD_KEYS en api/_lib/catalogProjection.ts:60-67 contiene esos mismos nombres, también literal.

2) NO HAY GUARD AGUAS ARRIBA. Ni en la query ni en el cliente. El único guard que encontré es de PINTADO, no de datos: src/pages/treasure/ProductDetail/components/AdditionalInfo.tsx:49 `{isAdmin && !product.isLote && (` esconde Ubicación/Asesor en pantalla — exactamente el patrón «filtrar en el cliente» que el proyecto ya declaró insuficiente el 2026-08-05 («Depende de este proyecto para que “sin precios” sea cierto en la red y no solo en la pantalla», docs/superpowers/specs/2026-08-05-control-de-acceso-al-catalogo-design.md, sección Fuera de alcance).

3) ALCANZABLE EN PRODUCCIÓN — VERIFICADO, NO INFERIDO. La URL del deployment de prod viaja en el bundle público: `curl https://tierramadre.app/assets/index-CQsBvIkk.js` contiene `const Sre="https://valuable-mule-753.convex.cloud"`. Con eso, sin credencial ninguna:
   curl -s -X POST 'https://valuable-mule-753.convex.cloud/api/query' -H 'Content-Type: application/json' -d '{"path":"products:publishedCatalog","args":{},"format":"json"}'
   → HTTP 200, 337.864 bytes, `{"status":"success","value":[{"asesor":"M.Campuzano","asesorActual":"","caja":"Legalizada",…,"estado":"VENDIDA",…}]`. (Solo lectura; no corrí nada que escriba.)

4) EL DAÑO OCURRE CON LOS DATOS DE HOY. Conteo sobre esa misma respuesta anónima (443 filas publicadas): `ubicacion` poblada en 409 — OFI.CALI 217, ASESOR 130, OFI.BOGOTA 36, EMBAJADOR 23, RETORNADO 3; `asesor` en 310, con nombres personales completos («Isa la Negra Vikinga Warrior Portocarrero» ×44, «Alvaro Pelaez» ×12, «M.Campuzano» ×28); `caja` en 180 — «Legalizada» ×113, «Pte Legalizar» ×3, «Pte Fecha x Legalizar» ×11; `qr` en 428; `asesorActual` en 34; `estadoAsesor` en 54. Es decir: dónde está físicamente cada piedra publicada, a quién se le atribuye y en qué estado contable está, servido a cualquiera. `costoBaseCOP` sí está ausente en las 443 (ese sí lo cubre el comentario de la query — el resto entró sin decisión).

CONTRAARGUMENTOS QUE SOPESÉ Y NO ALCANZAN:
· «Estar en WITHHELD_KEYS no prueba fuga»: cierto, y es el mejor contraargumento. `procedencia`, `mina`, `tratamiento`, `nivelRareza`, `tipoJoya`, `publishedAt` también están en WITHHELD_KEYS y `publishedCatalog` los proyecta A PROPÓSITO («surfaced publicly per product decision 2026-06-30», products.ts:554-555). Los dos rieles divergen por diseño. PERO ese bloque tiene su decisión escrita al lado; el bloque ubicacion/asesor/caja/qr no tiene ninguna, y no es «característica de la gema»: es logística interna, atribución comercial y estado contable.
· «getPublicByItem dice “the same public-safe fields as publishedCatalog” (products.ts:359-360), luego alguien lo clasificó como seguro»: ese comentario razona SOLO sobre costo/consciente/sync («Price is limited to the public ambassador tier; cost/consciente/sync stay internal»). No es una decisión sobre ubicacion/caja/asesor — es la misma omisión, propagada a una segunda query. Cuenta como superficie extra, no como refutación.
· «Quizá es código muerto»: no. src/hooks/useFotosintesisCatalog.ts:282 lo llama one-shot para todo visitante y persiste el payload íntegro en localStorage (`writeCatalogCache`, línea 287; `PublishedRow` declara los ocho campos en 69-76; `mapRowToTreasureItem` los copia a TreasureItem en 152-159).

MATIZ HONESTO, que cambia el arreglo pero no el hallazgo: `estado` SÍ es funcionalmente público en este riel — tests/catalogSentinelWiring.test.ts:38-40 lo dice explícito («`estado` is projected by `products.publishedCatalog` and the client paints availability from it»), y si se quita, mapRowToTreasureItem:153 cae a `'DISPONIBLE'` y una piedra vendida vuelve a mostrarse disponible. Así que `estado` no debe borrarse a ciegas. Los otros siete no tienen esa excusa.

**Corrección propuesta.** Arreglo mínimo, en convex/products.ts, dentro del `.map` de `publishedCatalog` (líneas 576-583):

1. BORRAR seis líneas — no tienen consumidor público alguno:
   `ubicacion: row.ubicacion,`
   `asesor: row.asesor,`
   `qr: row.qr,`
   `caja: row.caja,`
   `asesorActual: row.asesorActual,`
   `estadoAsesor: row.estadoAsesor,`
   (`coleccion` se queda: está en PUBLIC_KEYS, catalogProjection.ts:36.)

2. DEJAR `estado: row.estado,` con un comentario que fije la decisión («público a propósito: el cliente pinta disponibilidad desde acá — ver tests/catalogSentinelWiring.test.ts:38»). Si se prefiere no publicar la palabra VENDIDA, la sustitución equivalente es `disponible: (row.estado ?? 'DISPONIBLE').toUpperCase() === 'DISPONIBLE'` y adaptar mapRowToTreasureItem:153 — pero eso es una decisión de producto separable, no parte del cierre de la fuga.

Por qué NO rompe nada:
· `caja` y `qr`: cero consumidores del lado público. `grep -rn "\.caja" src/` y `"\.qr"` solo devuelven useFotosintesisCatalog.ts (que los recibe y no los usa) y pantallas de /admin que leen de otras queries.
· `ubicacion` / `asesor`: su único render es AdditionalInfo.tsx:49-63, tras `isAdmin`, y el staff NO los pierde — useTheasure hace ganar la fila de Sheets cuando el id existe en ambos rieles y solo superpone `precioEspecial`/`publishedAt` (src/hooks/useTreasure.ts:87-96 + utils/catalogOverlay.ts). El staff los recibe con grant `staff` desde get-treasure-sheets, que lee el MISMO libro y la MISMA pestaña `Inventario` que ambassador-products (api/get-treasure-sheets.ts:379-380 y api/ambassador-products.ts:101-104).
· `asesor` / `asesorActual`: la propiedad para perfiles de embajador ya se responde server-side por /api/ambassador-products, que existe justo porque esos campos están vedados al navegador (api/ambassador-products.ts:9-31).

Dos remates baratos, en el mismo cambio:
3. Aplicar el mismo recorte a `getPublicByItem` (products.ts:368+), que se declara espejo de esta proyección y por tanto arrastra la misma fuga por ítem.
4. Añadir un test estructural análogo a catalogSentinelWiring: afirmar que el set de claves que `publishedCatalog` proyecta ⊆ una allowlist explícita en el propio archivo. Sin eso, el riel de Convex sigue siendo un denylist implícito que falla ABIERTO — exactamente lo que catalogProjection.ts:1-9 evitó a propósito en el riel de Sheets.

Nota operativa: quedan copias del payload viejo en el localStorage de visitantes (clave STORAGE_KEYS.PUBLISHED_CATALOG_CACHE). Se purgan solas al primer refetch tras el deploy (TTL 5 min / bump del centinela), pero conviene saberlo antes de declarar cerrada la fuga.

---

### [MEDIA] asesorActual / estadoAsesor con coerce 'str': una celda vacía BORRA la custodia que la app posee

- **Archivo:** `convex/_lib/sheetPullMaps.ts:122`
- **Familia:** borrado · **Confianza:** seguro

**Escenario.** `coerceCell('str', '')` devuelve `{skip:false, value:''}` — ESCRIBE la cadena vacía, no la salta. Es el mismo mecanismo, literal, que costó 9 fotos en producción el 15-ago y por el que `fotoUrl`/`certificadoUrl` se sacaron del allowlist treinta líneas más abajo (comentario 154-177). Pero `asesorActual` (V) y `estadoAsesor` (W) siguen dentro, y hoy son de CONVEX: `asesorMovements._registerHandoff` los escribe al entregar una pieza a un asesor (línea 242-243) y su propio doc dice que la app dejó de ser «sheet-only» para esos campos. Una fila con V/W en blanco — fila nunca empujada, celda limpiada a mano, o push que aterrizó en la fila equivocada — hace que un `runFull` patchee `asesorActual: ''` y `estadoAsesor: ''`: la pieza deja de aparecer en `enAsesor`, el selector de devolución no la muestra, y el kardex dice que Isa la tiene mientras el inventario dice que no la tiene nadie. Combinado con el hallazgo del `estado` vacío, la misma corrida puede dejar una pieza consignada como DISPONIBLE y sin dueño.

**Evidencia.**
```
convex/_lib/sheetPullMaps.ts:122-123
  asesorActual: { coerce: 'str' },
  estadoAsesor: { coerce: 'str' },

convex/_lib/sheetPullMaps.ts:397-398 (str NUNCA salta el vacío)
    case 'str':
      return { skip: false, value: String(raw).trim() };

convex/_lib/sheetPullMaps.ts:156-159 (el mismo defecto, ya diagnosticado para otro campo)
  // Mismo mecanismo que `mostrarEnCatalogo` treinta líneas más arriba, un año
  // de campos después. Estuvieron en el allowlist, y como `coerce: 'str'`
  // devuelve `{skip:false, value:''}` para una celda vacía — la ESCRIBE, no la
  // salta — cada pull pisaba con vacío la foto que Convex acababa de guardar.

convex/asesorMovements.ts:240-245 (la app es hoy la dueña del campo)
    await ctx.db.patch(product._id, {
      estado: targetEstado,
      asesorActual: trimmedAsesor,
      estadoAsesor: targetEstado,
```

**Veredicto del verificador.** VERIFICADO — el mecanismo es real, aunque el escenario de daño está EXAGERADO en dos de sus tres afirmaciones y hay que corregirlo.

1) Las citas existen textuales, no hay paráfrasis:
   · convex/_lib/sheetPullMaps.ts:122-123 → `asesorActual: { coerce: 'str' },` / `estadoAsesor: { coerce: 'str' },` (dentro de INVENTORY, el allowlist de pull).
   · convex/_lib/sheetPullMaps.ts:397-398 → `case 'str': return { skip: false, value: String(raw).trim() };` — en efecto ESCRIBE `''`, a diferencia de `'num'` (:406 `if (t === '') return { skip: true }; // never clear a number from a blanked cell`).
   · convex/asesorMovements.ts:240-243 → `ctx.db.patch(product._id, { estado: targetEstado, asesorActual: trimmedAsesor, estadoAsesor: targetEstado, ...})`. La app es hoy escritora del campo; el propio header (:19-22) lo dice: «`asesorActual`/`estadoAsesor` were only ever settable by editing the Google Sheet directly. This module: 1. Lets the app set…».

2) NO hay guard aguas arriba que lo impida en modo FULL. Verifiqué la cadena completa:
   · api/get-inventory-rows.ts:~100 → `obj[keys[j]] = String(row[j] ?? '');` — la celda vacía viaja como `''`, no como `undefined`.
   · convex/fotoSync.ts:~482 (runFull) → `for (const k of writableKeys) { if (r[k] !== undefined) cells[k] = String(r[k]); }` — `''` !== undefined, así que entra al plan.
   · planRowPatch (:486-529) sólo tiene dos escudos: `syncStatus === 'pending' | 'error'` ⇒ `protected` (:477) y el desvío por columna A (fotoSync.ts:200-207). Ninguno cubre el caso: tras un push exitoso el doc queda `synced`, o sea DESPROTEGIDO. `sameValue('', 'Isa')` es false ⇒ `patch.asesorActual = ''`.
   Es exactamente el mismo camino, línea por línea, que el comentario de :154-177 documenta para `fotoUrl`/`certificadoUrl` («cada pull pisaba con vacío la foto que Convex acababa de guardar… costó 9 fotos en producción el 2026-08-15»). El remedio aplicado entonces (sacarlos del allowlist) no se aplicó a estos dos.

3) Alcanzable en producción: convex/http.ts:81-84 expone `runFull` por POST /sync/foto con `mode:"full"` (el botón «Sincronizar todo (completo)»), autenticado con SHEET_SYNC_TOKEN. Es el mismo disparador que causó el incidente del 15-ago. No es código muerto.

CORRECCIONES AL ESCENARIO (dos de las tres consecuencias descritas son FALSAS y no las verificó quien reportó):
   · «la pieza deja de aparecer en `enAsesor`» — FALSO. `enAsesor` es `products.list({ estado: 'ASESOR' })` (src/pages/admin/Fotosintesis/MovimientosKardexPage.tsx:219-222): filtra por `estado`, no por `asesorActual`.
   · «el selector de devolución no la muestra» — FALSO. El pool de devolución es `[...enAsesor, ...enConsignacion].filter(p => currentlyHeldItemIds.has(p.itemId))` (MovimientosKardexPage.tsx:269-271), y `currentlyHeldItemIds` sale de la tabla kardex `asesorMovements.listByAsesor` (append-only, que el pull no toca). Además `_registerReturn` (asesorMovements.ts:~320) sólo exige `estado ∈ {ASESOR, CONSIGNACION}` y resuelve el nombre con `asesorNombre.trim() || product.asesorActual || ''`, así que la devolución sigue siendo posible.
   El daño que SÍ ocurre, y alcanza para justificar el arreglo: el inventario pierde el nombre de quien tiene la pieza (queda `''`), el prefill del diálogo de devolución sale vacío (AsesorMovementPanel.tsx:166 `setAsesorNombre(kind === 'devolucion' ? (asesorActual ?? '') : '')` ⇒ el operador tiene que recordar y re-teclear a quién se la entregó, con el riesgo de registrar la devolución a nombre equivocado), `handleGraduateToSale` pierde el `recipient` prellenado (:180), y el kardex y el inventario quedan diciendo cosas distintas sobre la misma pieza.

GENERADOR DE DIVERGENCIA (hallazgo colateral que hace el escenario concreto, no sólo teórico): convex/products.ts:1201 `const sheetTarget = row.loteId ? 'fotosintesis' : 'legacy';` y api/admin-product-update.ts:176-181 `const isFoto = target === 'fotosintesis' || Boolean(loteId); const spreadsheetId = isFoto ? FOTOSINTESIS_SPREADSHEET_ID : SPREADSHEET_ID;`. Para un ítem SIN `loteId`, el push cae en la rama legacy posicional de 21 columnas (`merged[19] = s(fields.asesorActual)` :354-356, `merged[20] = estadoAsesor` :321-323) — o sea escribe en T/U — pero SPREADSHEET_ID hoy apunta al mismo libro SOT (lo confirma el comentario de api/get-treasure-sheets.ts:220-223, el mismo que motivó el fix del índice 11). La columna V/W del SOT queda en blanco aunque el push responda 200, y el siguiente `runFull` borra la custodia en Convex. NO pude verificar contra datos si hoy quedan ítems sin `loteId` (existe scripts/asignar-lotes-items-sin-lote.mjs, que sugiere que se asignaron); eso queda como incertidumbre declarada. El resto del hallazgo se sostiene sin ese camino: basta una celda V limpiada a mano o una fila nunca empujada.

**Corrección propuesta.** Arreglo mínimo (1 edición, mismo patrón ya aplicado dos veces en este archivo): sacar `asesorActual` y `estadoAsesor` del allowlist de pull en convex/_lib/sheetPullMaps.ts:122-123, reemplazándolos por un comentario de exclusión igual al de `mostrarEnCatalogo` (:124-141) y al de `fotoUrl`/`certificadoUrl` (:154-177):

  // EXCLUIDAS (2026-08-21): asesorActual (V) y estadoAsesor (W) son de CONVEX.
  // Desde asesorMovements._registerHandoff/_registerReturn la app las escribe
  // (asesorMovements.ts:240-243 y :354-357) y el kardex es su fuente de verdad.
  // Con `coerce: 'str'` una celda vacía devuelve {skip:false, value:''} — la
  // ESCRIBE, no la salta —, así que un runFull sobre una fila cuya V está en
  // blanco (push que aterrizó en otra columna/fila, celda limpiada a mano)
  // borra la custodia también en Convex. El push las sigue escribiendo desde
  // api/_lib/fotosintesis-inventory-columns.js (columnas V y W, sin `preserve`),
  // así que la dirección queda en un solo sentido: Convex → hoja.

El push NO se toca: `asesorActual`/`estadoAsesor` viven en api/_lib/fotosintesis-inventory-columns.js:83-84 sin `preserve`, igual que `mostrarEnCatalogo` sigue escribiéndose en la Y estando excluida del pull. Tradeoff explícito y ya asumido dos veces: una entrega registrada tecleando la V a mano en la hoja dejaría de subir a Convex; el canal para eso es la app (AsesorMovementPanel), no el sincronizador de estado.

Si se prefiere no perder ese sentido de subida, la alternativa es un flag por campo en FieldSpec (p. ej. `blankSkips: true`) que en planRowPatch haga `if (fs.blankSkips && coerced.value === '') continue;` — pero entonces no habría forma de vaciar el campo desde la hoja y quedan dos políticas conviviendo; la exclusión es la coherente con el resto del archivo.

Aparte, y como asunto propio (no parte de este arreglo): revisar convex/products.ts:1201 — un ítem sin `loteId` empuja por la rama legacy posicional A:U contra el MISMO libro SOT (api/admin-product-update.ts:176-181), lo que además de dejar V/W vacías escribe `ubicacion` en la columna M del SOT, que es `precioFinalCOP`. Eso merece verificación contra datos antes que cualquier otra cosa.

---

### [BAJA] migrateChatonesToC065 re-disparable: arrastra 9 ítems de vuelta a C-065 sin mirar dónde están hoy

- **Archivo:** `convex/migrations.ts:1382`
- **Familia:** migracion-armada · **Confianza:** probable

**Escenario.** `migrateChatonesToC065` llama a `_moveItemToLote` para los 9 itemIds hardcodeados (449, 454, 456, 458, 460, 463, 464, 465, 466) sin comprobar su lote actual: `_moveItemToLote` sólo verifica que el ítem y el lote destino existan, y luego patchea `lotItems.loteId` y `productInventory.loteId` a C-065, inserta una fila de audit, deja el ítem en `syncStatus: 'pending'` y agenda un push a la hoja. Si desde el 12-ago alguno de esos ítems se reasignó a otro lote desde la app (o se le corrigió la membresía a mano), un re-disparo lo arranca de ahí y lo devuelve a C-065 en los dos lados — y el `ordenEnLote` se recalcula como `sib.length + 1` sobre un lote que ya los contiene, generando órdenes duplicadas. Además deja los 9 en 'pending', lo que los congela frente al pull hasta que el push agendado los devuelva a 'synced'. Menor que los otros, pero es una migración cumplida que hoy no puede distinguir «hay que moverlos» de «ya están donde deben».

**Evidencia.**
```
convex/migrations.ts:1394-1408
    for (const it of ['449','454','456','458','460','463','464','465','466']) {
      out.push(
        await ctx.runMutation(internal.migrations._moveItemToLote, {
          itemId: it,
          toLoteId: 'C-065',
        }),
      );

convex/migrations.ts:1312-1330 (sin guard de "ya está en ese lote")
  export const _moveItemToLote = internalMutation({
    ...
    if (!product) throw new Error(`item ${itemId} no existe`);
    const toLot = ...
    if (!toLot) throw new Error(`lote ${toLoteId} no existe`);
    ...
    if (li) {
      await ctx.db.patch(li._id, { loteId: toLoteId, ordenEnLote: sib.length + 1 });
```

**Veredicto del verificador.** Intenté tumbarlo por las cuatro vías y ninguna aguanta.

(1) CITA — exacta, no alucinada. `convex/migrations.ts:1382` es `export const migrateChatonesToC065 = internalAction({`; el bucle está en 1394-1411 con los 9 itemIds hardcodeados ('449','454','456','458','460','463','464','465','466') llamando a `internal.migrations._moveItemToLote` con `toLoteId: 'C-065'`. `_moveItemToLote` está en 1312. (El agente pegó el bucle en su forma pre-prettier de una línea; el archivo hoy está multilínea. Cosmético, la semántica es idéntica y también pegó la forma real del `runMutation`.)

(2) GUARD AGUAS ARRIBA — no hay. Refuté primero la salida más obvia: que un re-disparo abortara al intentar recrear C-065. No aborta: `_createLoteExplicit` (migrations.ts:1059-1062) es idempotente por diseño y hace `if (ex) return { loteId: a.loteId, created: false };` — devuelve, no lanza. La acción sigue derecho al bucle. Dentro de `_moveItemToLote` los únicos chequeos son de existencia (`if (!product) throw`, `if (!toLot) throw`); no hay comparación contra `product.loteId` ni contra `li.loteId`, ni `clientToken`, ni allowlist. Su propio docblock (línea 1310) afirma «Idempotent-ish: moving to the same lote is a no-op patch» y eso es falso: aunque el loteId no cambie, sí patchea `ordenEnLote: sib.length + 1`, inserta fila en `productEdits`, pone `syncStatus: 'pending'` y agenda `api.products.pushToSheet`.

(3) ALCANZABLE — sí, no es código muerto. `convex/migrations.ts` viaja entero en cada `npx convex deploy` (documentado en CLAUDE.md, sección «Migraciones de un solo uso vivas en prod»), y el propio docblock línea 1380 trae el comando: `npx convex run --prod migrations:migrateChatonesToC065 '{}'`. Es la misma clase de riesgo que el proyecto ya reconoce para `seedBucketC`; de hecho esta migración se agregó DESPUÉS de esa auditoría del 03-ago y no figura en la tabla, o sea que se sumó sin `clientToken` justo contra el criterio que esa sección dejó escrito.

(4) DAÑO REAL — hay un tramo incondicional y otro condicional, y el condicional tiene vector vivo.
  · Incondicional (aunque los 9 sigan en C-065): los nueve reciben `ordenEnLote = sib.length + 1` con `sib` = los 13 ítems del lote, o sea el MISMO número para los nueve → colapso del orden. Se usa para ordenar en `lotItems.ts:82`, `products.ts:720`, `casillas.ts:110/299`. Además 9 filas de auditoría con before === after, 9 ítems a `pending` y 9 pushes a la hoja.
  · El `pending` sí congela: verifiqué `products.ts:1932-1938` y `products.ts:2075-2079` — con `syncStatus` en 'pending' o 'error' el pull solo refresca `rowIndex`/`lastPulledAt` y hace `continue`, no baja contenido. Es transitorio si el push aterriza, permanente si queda en 'error'.
  · Condicional (arrancar un ítem de otro lote): el vector existe y es el camino operativo normal. Verifiqué `_lib/sheetPullMaps.ts:183-186` — `loteId` está en el allowlist de pull con `coerce: 'str'` y un `flag`, y en `buildPlan` (líneas 519-528) el `flag` NO saltea el patch: primero corre `patch[schemaKey] = value` y recién después `flags.push(fs.flag)`. Es decir, editar a mano la columna LOTE en el SOT sí reasigna `productInventory.loteId` en Convex. Un re-disparo lo devuelve a C-065 en Convex y, vía el `pushToSheet` agendado en migrations.ts:1367-1371, también en la hoja.

Salvedad honesta: por el mandato de solo lectura no consulté prod, así que no puedo afirmar que alguno de los 9 ya se haya reasignado desde el 12-ago. El arranque de lote es riesgo con vector vivo, no corrupción observada. El tramo incondicional (orden colapsado + pending + 9 pushes espurios) sí ocurre con certeza en cualquier re-disparo.

**Corrección propuesta.** Arreglo mínimo, dos líneas de guard, sin tocar nada más.

A) Idempotencia real en `_moveItemToLote` (convex/migrations.ts:1312). Subir la búsqueda de `li` por encima de la de `sib` y cortar temprano cuando ya no hay nada que mover, ANTES de cualquier patch/audit/schedule:

    const li = await ctx.db.query('lotItems')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId)).first();
    if (product.loteId === toLoteId && li?.loteId === toLoteId) {
      return { itemId, from: fromLoteId, to: toLoteId, moved: false,
               reason: 'ya está en el lote' };
    }

Esto elimina de un golpe el colapso de `ordenEnLote`, las filas de auditoría con before === after, el flip a 'pending' y los pushes espurios a la hoja — y hace verdadera la afirmación del docblock línea 1310, que hoy miente.

B) Que la migración no pueda arrancar un ítem que ya no está donde suponía. Agregar a `_moveItemToLote` un arg opcional `expectedFromLoteId: v.optional(v.string())` y, si viene y no coincide, no mover:

    if (expectedFromLoteId !== undefined && fromLoteId !== expectedFromLoteId) {
      return { itemId, from: fromLoteId, to: toLoteId, moved: false,
               reason: `no está en ${expectedFromLoteId}` };
    }

y en el bucle de `migrateChatonesToC065` (línea 1406) pasar `expectedFromLoteId: 'C-065'`... no: pasar `'C-039'`, que es el origen que el propio docblock (línea 1377) declara. Así el re-disparo solo mueve lo que todavía está en C-039 y deja quieto todo lo que ya fue reubicado a propósito.

C) Opcional pero alineado con el criterio ya escrito en CLAUDE.md: sellar `migrateChatonesToC065` con un `clientToken` en `commitTokens`, como ya hace `lotItems.create` (líneas 470-478), para que la corrida completa sea irrepetible y no solo idempotente por ítem.

Nota aparte, fuera del alcance de este hallazgo pero contigua: si un ítem fue huerfanado antes por `lotItems._remove` (limpia `loteId`, `preponderancia` y `costoBaseCOP`, líneas 1379-1384), la rama `else` de `_moveItemToLote` (línea 1345) insertaría el lotItem con `costoBaseCOP: product.costoBaseCOP ?? 0` — un costo 0 que alimenta la familia del defecto #1. El guard (A) no cubre ese caso; vale mirarlo por separado.

---

### [BAJA] El cron de asesores apunta a una action PÚBLICA sin autenticación (api.clients.pullAsesoresFromSheet)

- **Archivo:** `convex/clients.ts:398`
- **Familia:** otro · **Confianza:** probable

**Escenario.** `crons.ts:47-52` es el único llamador legítimo, pero la función está declarada como `action` pública y sin argumentos ni `idToken` — a diferencia de `clients.create` y `clients.update`, que en el mismo archivo sí exigen `requireAccessLevel(idToken, ['admin'])`. Toda función pública de Convex es invocable por cualquiera que conozca la URL del deployment (que viaja en el bundle del front), sin credenciales y sin argumentos que adivinar. El disparo hace un fetch a `/api/get-asesores` con el `ADMIN_SYNC_TOKEN` del servidor, upsertea filas en `clients` y agenda un push por cada fila cambiada al SOT. No permite inyectar datos del atacante (copia la hoja), así que el daño es de disponibilidad y costo — bandwidth de Sheets/Vercel/Convex y escrituras repetidas dejando filas en `syncStatus: 'pending'` — pero es una escritura de backend que hoy no tiene puerta.

**Evidencia.**
```
convex/crons.ts:47-52
  crons.interval(
    'pull asesores from sheet',
    { hours: 24 },
    api.clients.pullAsesoresFromSheet,
    {},
  );

convex/clients.ts:398-400 (pública, sin args, sin authz)
  export const pullAsesoresFromSheet = action({
    args: {},
    handler: async (

convex/clients.ts:93-99 (la convención del propio archivo, para comparar)
  export const create = action({
    ...
      await requireAccessLevel(idToken, ['admin']);
```

**Veredicto del verificador.** SOBREVIVE los cuatro controles, con UNA corrección al escenario.

1) ¿El fragmento existe tal cual? SÍ, verbatim.
   - `convex/crons.ts:47-52`:
       crons.interval(
         'pull asesores from sheet',
         { hours: 24 },
         api.clients.pullAsesoresFromSheet,
         {},
       );
   - `convex/clients.ts:398-400`: `export const pullAsesoresFromSheet = action({ args: {}, handler: async ( ctx, ) => ...`
   - `convex/clients.ts:93-99` (`create`) y `130-137` (`update`) sí llaman `await requireAccessLevel(idToken, ['admin'])`. La asimetría citada es real.

2) ¿Hay guard aguas arriba? NO. `action` viene de `./_generated/server` (clients.ts:1-6), o sea función PÚBLICA. El handler (clients.ts:400-444) no toma `idToken` ni `sessionToken`, no llama `requireAccessLevel` ni `isStaffSession`, y no tiene early return: va directo a leer `APP_URL`/`ADMIN_SYNC_TOKEN`, hacer `fetch(${appUrl}/api/get-asesores, { headers: { Authorization: Bearer ${syncToken} } })` y `ctx.runMutation(internal.clients._upsertManyAsesores, ...)`. No existe `convex/auth.config.*` en el repo, así que tampoco hay puerta de plataforma.

3) ¿Alcanzable en prod? SÍ. `.env.production:43` publica `VITE_CONVEX_URL="https://grand-hippopotamus-162.convex.cloud"` y `src/main.tsx:22` lo lee, o sea la URL del deployment viaja en el bundle. Una función pública de Convex sin argumentos es invocable anónimamente contra esa URL. No es código muerto: el cron corre cada 24 h y `grep` confirma que `crons.ts:50` es el ÚNICO llamador — no hay uso desde el front.

   Corroboración fuerte de que esto es un descuido y no una decisión: en el MISMO cron file, la pull hermana usa `internal.products._pullFromSheetCron` (crons.ts:33), y `convex/products.ts:1783-1818` implementa exactamente el patrón correcto — `pullFromSheet` público con `args: { idToken }` + `requireAccessLevel(idToken, ['admin'])`, delegando a un `internalAction` que es el que consume el cron, con el comentario "also used by the unauthenticated cron". `clients.pullAsesoresFromSheet` es la única de las dos que no hizo ese split.

4) ¿El daño ocurre? PARCIALMENTE — hay que recortar una frase del escenario.
   - REAL: amplificación no autenticada. Cada invocación anónima = 1 invocación de la función Vercel `/api/get-asesores` con el `ADMIN_SYNC_TOKEN` del servidor (leyendo la pestaña Asesores entera vía Sheets API) + 1 `ctx.db.query('clients').collect()` (full-table read) en `_upsertManyAsesores` (clients.ts:330). Costo/cuota Sheets/Vercel/Convex quemables por un tercero sin credenciales. Fuga menor: la respuesta devuelve los conteos `{ pulled, created, updated, unchanged, skipped }`, o sea el número de asesores.
   - REFUTADO: "escrituras repetidas dejando filas en syncStatus: 'pending'". `planAsesorUpsert` (`convex/_lib/asesorSync.ts:69-124`) es un diff puro: match por nombre normalizado, sólo parchea campos no vacíos que DIFIEREN (`if (email !== undefined && email !== match.email) patch.email = email`), y si `Object.keys(patch).length === 0` cuenta `unchanged++`. Con la hoja sin cambios, N llamadas seguidas producen `toInsert=[]` y `toUpdate=[]` → CERO escrituras y CERO filas en `pending`. Tampoco pisa datos: un blanco de la hoja nunca borra un valor existente ("treat blanks as 'no opinion', not 'delete'"), así que NO es de la familia (a) ni (e) en su sentido destructivo.

   Conclusión: el hallazgo es cierto pero su severidad es la mitad de lo escrito — puerta de backend abierta con daño de costo/disponibilidad, no de corrupción de datos. Eso no lo tumba: es una escritura de backend con token de servicio disparable por cualquiera, y el propio repo ya define el patrón correcto tres archivos más allá.

**Corrección propuesta.** Arreglo mínimo (3 líneas, sin romper nada — el cron es el único llamador):

1. `convex/clients.ts:398` — cambiar `action` por `internalAction` y agregar el import:
   ```ts
   import { query, action, internalAction, internalMutation, internalQuery } from './_generated/server';
   ...
   export const pullAsesoresFromSheet = internalAction({
     args: {},
   ```
   (opcional pero coherente con products.ts: renombrar a `_pullAsesoresFromSheetCron`.)

2. `convex/crons.ts:50` — apuntar al namespace interno:
   ```ts
   internal.clients.pullAsesoresFromSheet,
   ```
   `internal` ya está importado en crons.ts:2, no hay import nuevo.

3. Si alguna vez se quiere un botón "Resync asesores" en el admin, agregar el wrapper público con puerta, calcado de `products.ts:1788-1797`:
   ```ts
   export const pullAsesores = action({
     args: { idToken: v.string() },
     handler: async (ctx, { idToken }) => {
       await requireAccessLevel(idToken, ['admin']);
       return await ctx.runAction(internal.clients.pullAsesoresFromSheet, {});
     },
   });
   ```

Nota aparte, misma clase, NO parte de este hallazgo pero visible al arreglarlo: `convex/clients.ts:169` declara `export const _pushToSheet = action({...})` — pública pese al guion bajo, y agendada desde `_create`/`_update`/`_upsertManyAsesores`. Vale auditarla en la misma pasada.

Al reportar, corregir el escenario: quitar la frase "escrituras repetidas dejando filas en syncStatus: 'pending'" (refutada por el diff de `planAsesorUpsert`) y dejar el daño como amplificación de costo/cuota no autenticada + fuga del conteo de asesores.
