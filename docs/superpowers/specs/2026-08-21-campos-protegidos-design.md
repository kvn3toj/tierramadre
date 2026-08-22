# Campos protegidos — que ninguna vía borre lo que subió otra

> **Estado:** diseño aprobado por el dueño el 2026-08-21. Implementación no empezada.
> **Iniciativa:** `TM-PRECIO-INTEGRIDAD` en el Constructor.
> **Origen:** el dueño reportó precios que «estaban hace unos días». Lo estaban.

---

## 1. El problema

El SOT v3 tiene **tres vías de escritura** — la app, la hoja de Google y anima-bot — y
**ningún árbitro entre ellas**. Cuando dos discrepan, gana la última que escribió. Y como
varias derivaciones producen `undefined` de forma legítima, «la última que escribió» a
menudo escribe un vacío encima de un dato real.

### Lo que ya pasó, medido contra producción el 2026-08-21

**41 ítems con costo ≤ 0 y sin `precioFinalManual` estaban TODOS sin precio.** Cero
excepciones sobre 41 no es una coincidencia: es la huella de una barrida.

El mecanismo, en tres pasos que por separado son correctos:

1. `computePrecioFinal(0)` devuelve `undefined` **a propósito** (`convex/_lib/pricing.ts:34`,
   «no phantom 0»): una pieza sin costo no debe mostrar `$0`.
2. Adjuntar un ítem a un lote lo re-deriva (`convex/lotItems.ts:427`, dentro de
   `lotItems._create`). Con costo 0, el precio pasa de `150000` a `undefined`.

   > **Corregido 2026-08-21 al mapear los sitios reales.** Una versión previa de esta spec
   > culpaba al «re-fan de lote». El re-fan **está desactivado desde 2026-07-24**
   > (`convex/lots.ts:327-334`: «the preponderancia-based derivation is fully deactivated…
   > `refanned` is kept in the return shape (always 0 now)»). El derivador vivo es el alta /
   > adjunción, que es coherente con los hechos: los cuatro dijes borrados son todos del
   > lote TM-001 y se publicaron en esa ventana.

3. El push a la hoja manda ese `undefined` como celda vacía (`convex/products.ts:1403`).

Resultado: **se borra en Convex y en la hoja a la vez**. Por eso al revisar después no hay
discrepancia entre los dos lados y todo parece indicar que el precio nunca existió.

La prueba fina está dentro de un solo lote, el mismo día, separada exactamente por el sello
`precioFinalManual`:

| ítem                    | último push | `precioFinalManual` | precio hoy     |
| ----------------------- | ----------- | ------------------- | -------------- |
| #580 #581 #582 #583     | 01:39–01:40 | ✅                  | $150.000 vivos |
| #585                    | 02:38       | ✅                  | $150.000 vivo  |
| **#577 #578 #579 #584** | **02:36**   | ❌                  | **vacío**      |

Mismo lote TM-001, mismo precio, misma madrugada. A los que el pull alcanzó a sellar les
sobrevivió el precio; a los cuatro empujados sin sello se lo comió el push.

### El segundo camino, en dirección contraria

`convex/products.ts:1382` y `:1403` mandan las dos columnas de plata con `?? ''`:

```ts
// PUSH-ONLY FIELD — do NOT collapse this to `?? ''`. preponderancia …
...(row.preponderancia !== undefined
  ? { preponderancia: row.preponderancia }
  : {}),
costoBaseCOP: row.costoBaseCOP ?? '',      // ← L
precioFinalCOP: row.precioFinalCOP ?? '',  // ← M
```

`preponderancia` **ya tiene** la protección, con un comentario que dice literalmente «do NOT
collapse this to `?? ''`». Las dos columnas que más importan están tres líneas abajo,
colapsadas. El escenario: tecleás el costo en la hoja, no apretás «🔄 Convex Sync», y esa
tarde alguien entrega la pieza a un asesor → el costo se borra, y como Convex nunca lo
aprendió, **no queda copia en ningún lado**.

Que esto no sea automático lo agrava: el pull del inventario es diario o manual, y el
backstop de reconciliación **ship OFF a propósito** (`convex/crons.ts`, «FREE-TIER POLICY»).

### Por qué una regla y no tres parches

La auditoría adversarial del 2026-08-21 (`docs/audits/2026-08-21-rieles-precio-costo.md`, 41
agentes, 13 hallazgos confirmados) encontró que **cuatro de los nueve defectos son la misma
frase escrita en cuatro archivos distintos** — la frase que ya está en el `CLAUDE.md` del
proyecto:

> Un cero, un blanco o un valor por defecto que rellena un campo vacío es un dato inventado
> con forma de dato, y a las 24 horas ya no se distingue de uno medido.

Parchear los dos caminos conocidos (lo que hace el PR #146) deja vivo el tercero que todavía
no encontramos. Esta spec es la regla general.

---

## 2. La regla

**Un valor que existe nunca puede ser reemplazado por vacío. Cambiarlo por otro valor sí.**

```
precio 150.000 → (blanco)     ❌ bloqueado
precio 150.000 → 180.000      ✅ permitido
precio (blanco) → 150.000     ✅ permitido
costo 41.340.039 → 0          ❌ bloqueado
```

**Borrar es posible, pero hay que declararlo.** El caso legítimo existe y es frecuente: el
SOT retira a 0 el costo de los registros padre para no contar la misma plata dos veces
(#339 «Jardín Secreto», que se vende por sus piezas #429–433). Ese borrado se hace
declarando un motivo, y queda en la auditoría.

### Tabla de decisión, por origen de la escritura

| Origen                                   | Cambiar valor por otro | Vaciar sin motivo | Vaciar declarando motivo |
| ---------------------------------------- | :--------------------: | :---------------: | :----------------------: |
| `app` — `saveEdit` con sesión staff      |           ✅           |        ❌         |            ✅            |
| `bot` — `saveEditViaBot` con `botSecret` |           ✅           |        ❌         |            ✅            |
| `migracion` — script o `convex run`      |           ✅           |        ❌         |            ✅            |
| `hoja` — pull de `fotoSync`              |           ✅           |        ❌         |       ❌ **nunca**       |
| `derivacion` — alta y re-fan de lote     |           ✅           |        ❌         |       ❌ **nunca**       |

Las dos últimas filas son las que cierran el caso real:

- Una **derivación no tiene dónde poner un motivo** — no hay humano en el ciclo. Por
  construcción no puede borrar.
- Una **celda vacía en el Sheet deja de ser un borrado**. Es la misma doctrina que
  `sheetPullMaps.ts` ya aplicó dos veces (con `fotoUrl`, tras perder 9 fotos el 15 de agosto)
  y que nunca se extendió a las columnas de plata. Si vaciás una celda de M, el próximo push
  la restaura desde Convex y te llega el aviso.

### Qué cuenta como vacío

| clase    | vacío es                            |
| -------- | ----------------------------------- |
| `dinero` | `undefined`, `null`, `''` **y `0`** |
| `medida` | `undefined`, `null`, `''`           |

El `0` importa: el borrado del 20 de agosto fue un `0`, no un blanco. Contrapartida asumida:
una pieza de costo genuinamente 0 (regalo, insumo de marketing) necesita declarar motivo la
primera vez. Es fricción deliberada — hoy las piezas nacen con costo 0 como marcador de
«todavía no lo tecleé», y ese 0 es indistinguible de uno real.

---

## 3. Alcance — los campos protegidos

```ts
export const CAMPOS_PROTEGIDOS = {
  costoBaseCOP: { clase: 'dinero' }, // L — base de impuesto y comisión
  precioFinalCOP: { clase: 'dinero' }, // M — precio al cliente
  precioCOP: { clase: 'dinero' },
  precioEmbajadorCOP: { clase: 'dinero' },
  peso: { clase: 'medida' }, // D — quilates
  medidas: { clase: 'medida' }, // I — la buena; J está en desuso
} as const;
```

Criterio de inclusión: **campos que un humano teclea y que ninguna máquina puede reconstruir.**
Un precio borrado no se recupera de ningún lado; un `syncStatus` sí.

`medidas` entra porque la columna I se mide a mano pieza por pieza y hoy solo 211 de 576 la
tienen — perder una es perder una medición física. `preponderancia` **no** entra: la deriva
Convex desde el lote y es reconstruible.

Agregar un campo es **una línea en esta tabla**, no un parche en cuatro archivos. Ese es el
punto de que la tabla exista.

---

## 4. Arquitectura

### Un solo portero, cuatro llamadas

```
convex/_lib/camposProtegidos.ts      ← módulo PURO, sin IO de Convex
        ▲            ▲            ▲
        │            │            │
   _saveEdit    planRowPatch   lotItems     ← hacia Convex
   (app + bot)     (hoja)     (derivación)
        │
        └──────► pushToSheet                ← hacia la hoja
```

**Por qué un módulo puro y no un chequeo en cada sitio.** El comentario de
`mapRowToTreasureItem` en `api/get-treasure-sheets.ts` ya dejó escrita la lección del repo:
_«duplicar el mapeo es como los dos se separan la próxima vez que una columna se mueve»_. Los
dos defectos de hoy nacieron exactamente así. Un módulo puro además se prueba sin levantar
Convex, que es la única forma de fijar esta rama (no hay `convex-test` en el repo).

### API

```ts
export type Origen = 'app' | 'bot' | 'hoja' | 'derivacion' | 'migracion';

export type Rechazo = {
  campo: string;
  valorAnterior: unknown;
  valorIntentado: unknown;
  origen: Origen;
};

export function filtrarBorradosNoDeclarados(
  existente: Record<string, unknown>,
  patch: Record<string, unknown>,
  opts: { origen: Origen; motivoBorrado?: string },
): { patch: Record<string, unknown>; rechazos: Rechazo[] };
```

Devuelve el patch **ya sin** los borrados prohibidos, más la lista de lo que sacó.

**Nunca lanza y nunca falla la escritura entera.** Si una tanda de 9 correcciones trae 1
borrado indebido, se aplican las 8 buenas y se rechaza la 1. Fallar en bloque convertiría un
guard en un obstáculo, y el obstáculo se termina desactivando.

`motivoBorrado` se acepta solo si es una cadena no vacía de ≥ 10 caracteres útiles: un `"x"`
no es una declaración de intención.

---

## 5. Los cuatro puntos de aplicación

### 5.1 `_saveEdit` — app y bot (hacia Convex)

`convex/products.ts` (~1075). Hoy ya estampa `precioFinalManual: true` cuando el patch trae
`precioFinalCOP` (`:1085`). Se agrega el portero antes del `ctx.db.patch`, con
`origen: 'app' | 'bot'` según el llamador y `motivoBorrado` tomado de un argumento nuevo y
opcional de `saveEditPatchArgs`.

### 5.2 `planRowPatch` — la hoja (desde la hoja)

`convex/_lib/sheetPullMaps.ts` (~520). Con `origen: 'hoja'` y **sin** `motivoBorrado`, jamás.
Una celda vacía nunca significa «borrá».

> **La regla explícita para el caso inverso**, porque si no se escribe se reintroduce sola
> (planteado por `cronos` el 2026-08-22):
>
> **Cuando el SOT está vacío y el derivado tiene el dato, gana el derivado, y la hoja se
> re-llena desde él.** Nunca al revés.
>
> Suena contraintuitivo —la hoja es el SOT, lo natural sería que mandara— y por eso hay que
> decirlo. Una reconciliación escrita en la dirección «natural» hoja→Convex borraría #419
> ($260.000) y #420 ($280.000), que son precios manuales que Convex conserva y la hoja perdió.
> Sería el mismo defecto del hallazgo #6 del informe: **una ausencia tratada como un valor**.
>
> «El SOT manda» significa **el SOT manda sobre los valores que tiene**, no sobre los que le
> faltan. Un hueco no es una afirmación.
>
> Corolario para cualquier reconciliación futura (`fotoSync:runFull`, un backfill, un script de
> paridad): la comparación es de tres estados —igual / distinto / **ausente**— y `ausente` nunca
> se resuelve borrando. Modelarla como dos estados es cómo nace este bug.

Efecto secundario deseado: el sello `precioFinalManual` deja de ser la única defensa y pasa a
significar solo lo que su nombre dice — «no re-derives este precio».

### 5.3 `lotItems` y `lots` — las derivaciones

Dos sitios, con `origen: 'derivacion'`:

**a. `convex/lotItems.ts:427` (`lotItems._create`).** Al dar de alta un ítem **nuevo** no hay
valor anterior, así que la regla no se activa y el sembrado de precio sigue igual. Al
**adjuntar un ítem que ya existía**, sí lo hay — y ese es el camino que borró los cuatro
dijes.

**b. `convex/lots.ts:531` (cancelación de lote).** Encontrado al mapear los sitios, no estaba
en el diagnóstico original:

```ts
await ctx.db.patch(product._id, {
  loteId: undefined,
  preponderancia: undefined,
  costoBaseCOP: undefined, // ← borra el costo de CADA ítem del lote
  mostrarEnCatalogo: false,
});
```

Cancelar un lote **vacía el costo de todos sus miembros de una vez**, incluido el que alguien
tecleó a mano en la columna L. Es el borrado de mayor alcance de los tres, y es exactamente
la clase que esta regla existe para frenar: una derivación, sin motivo, sobre plata.

Decisión de diseño: **se bloquea**. Un lote cancelado deja de ser lote, pero sus piedras
siguen habiendo costado lo que costaron. Si el negocio realmente quiere olvidar ese costo,
que lo declare — la cancelación de lote pasa a mandar
`motivoBorrado: "lote <id> cancelado: <razón>"`, y entonces sí borra. Eso convierte el caso
en `origen: 'migracion'` (acción humana explícita), no en derivación.

`precioFinalRefanPatch` **no** necesita portero: ya devuelve `{}` cuando el precio es humano,
y su llamador (el re-fan) está desactivado desde 2026-07-24. Se deja como está.

### 5.4 `pushToSheet` — hacia la hoja

`convex/products.ts:1382` y `:1403`. Aquí el arreglo **no** es llamar al portero: es dejar de
colapsar a `''`. Se copia exactamente el patrón que `preponderancia` ya tiene tres líneas
arriba:

```ts
...(row.costoBaseCOP !== undefined ? { costoBaseCOP: row.costoBaseCOP } : {}),
...(row.precioFinalCOP !== undefined ? { precioFinalCOP: row.precioFinalCOP } : {}),
```

Si Convex no conoce el valor, **la celda no viaja** y la hoja conserva lo que tenga. El
portero cubre lo que se escribe; esto cubre lo que se omite.

---

## 6. Los rechazos: registro y aviso

### Registro — `productEdits`

Cada rechazo inserta una fila con `status: 'rechazado'`, el campo, el valor anterior, el
origen y el motivo (o su ausencia). Es la tabla de auditoría que ya existe y que
`products:editHistory` ya sabe leer.

### Aviso — Telegram

**Convex hoy no tiene salida hacia Telegram.** Solo recibe (`movimientosV4.ts`,
`saveEditViaBot`, todos con `botSecret`). No existe `api.telegram.org` ni `TELEGRAM_BOT_TOKEN`
en `convex/`. Hay que construir el canal, y hay dos formas:

|                                                                | Cómo                                                               | A favor                                                    | En contra                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **A ·** `internalAction` que hace `fetch` a `api.telegram.org` | 2 env vars nuevas (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`) | ~20 líneas, sin tocar anima-bot, funciona el mismo día     | Convex pasa a tener un secreto de Telegram y una dependencia de red saliente |
| **B ·** tabla `alertasOutbox` que anima-bot drena              | Sigue el patrón de `espejoOutbox`, que el repo ya usa              | Convex no habla con nadie afuera; el bot ya tiene el token | Cross-repo: no entra en una sola tanda                                       |

**Recomendación: A**, y B como evolución si aparecen más avisos. El aviso agrupa por corrida
(un mensaje con N rechazos, no N mensajes) y **nunca bloquea la escritura**: si Telegram falla,
el rechazo ya quedó registrado en `productEdits`.

Forma del mensaje:

```
⚠️ Bloqueado un borrado en el SOT

#544 Viaje Estelar
costoBaseCOP: $41.340.039 → 0
Origen: re-fan de lote TM-001

El valor NO se perdió.
```

---

## 7. Testing

Tres capas, en orden de importancia:

1. **Unitarias del módulo puro** — la tabla de decisión completa: 5 orígenes × (cambio /
   vaciado sin motivo / vaciado con motivo) × (dinero / medida), más el caso `0` para dinero
   y el caso «no hay valor anterior» (alta).

2. **Regresión con los datos reales del incidente.** El caso #577: existente
   `{ precioFinalCOP: 150000, costoBaseCOP: 0 }`, patch `{ precioFinalCOP: undefined }`,
   origen `derivacion` → el patch sale vacío y hay 1 rechazo. Si esto se rompe, el borrado del
   20 de agosto vuelve.

3. **Inspección de fuente — la que evita el quinto riel.** Un test que recorre `convex/` y
   falla si aparece un `ctx.db.patch` sobre `productInventory` que no pase por
   `filtrarBorradosNoDeclarados`. Mismo patrón que `tests/saleSafe.test.ts` ya usa para
   `omitFotosintesisOnly`. Es lo único que protege contra el riel que alguien escriba dentro
   de seis meses.

---

## 8. Qué NO cubre esta spec

Deliberadamente fuera de alcance, para que no crezca:

- **Marcas de tiempo por campo** (quién escribió qué y cuándo, con rechazo de escrituras
  viejas). Resolvería además las carreras entre dos personas editando a la vez, que hoy nadie
  detecta. Es la evolución natural; no entra ahora porque toca el esquema y las tres vías.
- **Los otros 7 defectos de la auditoría.** El mapa legacy A:U (#5), las fórmulas del bloque
  AQ–BE (#4), los respaldos posicionales de `get-treasure-sheets` (#3) y las dos fugas de
  datos (#1, #2) tienen sus propias correcciones. Esta spec solo cubre la familia «un vacío
  pisó un dato».
- **Reparar los 41 ítems ya sin precio.** 13 se repararon el 21 de agosto; los 28 restantes
  necesitan un precio tecleado, no una regla.

---

## 8b. Dos hallazgos del 2026-08-21 que endurecen el diseño

### `precioFinalManual` NO es un marcador de propiedad

Medido contra el respaldo de prod: **416 de 576 ítems (72%) lo tienen**. El pull lo estampa
cada vez que una celda de M cambia, así que en la práctica significa **«este valor pasó por la
hoja alguna vez»**, no «un humano lo eligió a mano».

Lo descubrió `tierramadre-fc` al aplicarlo como filtro en un repricing: filtrar por
`precioFinalManual !== true` dejó el script **inerte, cero ítems seleccionados**. La
recomendación original de esta sesión —usar el sello como criterio de propiedad— era **errada**,
y queda anotada acá para que nadie la repita leyendo el histórico.

**Consecuencia para este diseño: lo refuerza.** El portero **no consulta el sello en ningún
momento**. Compara el valor viejo contra el nuevo, y punto. Si dependiera del sello heredaría
un marcador que acierta el 72% de las veces. La regla «vacío nunca pisa a lleno» es
justamente la capa que no necesita saber quién es el dueño.

El sello conserva su único trabajo legítimo, el que le da el nombre: que el re-fan no
re-derive un precio. Nada más.

### El caso inverso: el SOT vacío y el derivado con el dato

**#419 «Pares de tópitos plata rodinada» y #420 «Lote de gemas redondas».** Convex tiene
precio ($260.000 y $280.000, los dos con `precioFinalManual: true`) y **la celda de la hoja
está vacía**. Detectado por esta sesión en la verificación de tres vías de la mañana y
reconfirmado de forma independiente por `tierramadre-fc` en su diff.

Es la misma familia leída al revés: acá el que perdió el dato fue **el SOT**, y el store
derivado es el que lo conserva.

**Este diseño lo repara solo, sin código extra.** Hoy el push manda `precioFinalCOP ?? ''` y
reescribe el vacío encima del vacío, así que la deriva se perpetúa. Con el cambio de §5.4 el
push manda el valor cuando Convex lo conoce —y acá lo conoce—, así que **el siguiente push de
#419 o #420 devuelve $260.000 y $280.000 a la columna M**. La hoja se auto-sana.

Va a las pruebas de aceptación: correr el push de #419 y verificar que la celda queda con
$260.000. Es el caso que demuestra que la regla no solo frena borrados, también revierte los
que ya ocurrieron.

---

## 9. Riesgo abierto

**El `0` como marcador.** Hoy las piezas nacen con `costoBaseCOP: 0` significando «todavía no
lo tecleé». Al tratar el `0` como vacío, la primera vez que alguien quiera dejar un costo
genuinamente en 0 va a chocar con el guard. Es el comportamiento correcto —obliga a declarar
que el cero es real— pero conviene decirlo antes de que alguien lo descubra en medio de una
carga. La salida limpia a futuro es que «sin costear» deje de representarse con `0` y pase a
ser ausencia de valor; no entra en esta tanda.

---

## Related

- [[TierraMadre]]
- `docs/audits/2026-08-21-rieles-precio-costo.md` — la auditoría que confirmó la familia
- PR #146 — los dos parches puntuales que este diseño generaliza
- `convex/_lib/pricing.ts` — la doctrina de propiedad del precio (2026-07-23)
- Anima: `decisions/2026-08-20-modelo-niveles-piso-lista-calibrado.md`
