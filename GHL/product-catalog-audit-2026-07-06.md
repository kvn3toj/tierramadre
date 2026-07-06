# Product catalog audit — Inventario + Fotosíntesis SOT (2026-07-06)

> **Método:** lectura en vivo de los dos spreadsheets reales vía las APIs autenticadas
> del propio proyecto (`GET /api/get-treasure-sheets` público, `GET /api/get-inventory-rows`
> con el `ADMIN_SYNC_TOKEN` local), lectura completa de `convex/_lib/productSearch.ts` +
> `convex/ghl.ts` + `convex/schema.ts`, y verificación con la suite de tests real
> (`tests/productSearch.test.ts`). No se consultó `productInventory` en vivo directamente
> (bloqueado por el clasificador de seguridad — lectura de producción no autorizada
> explícitamente; ver nota al final).

## TL;DR

Hay **dos spreadsheets, no una** — y son **dos eras cronológicas del inventario**, no dos
vistas del mismo catálogo:

|                         | **Inventario** (legacy)                                                                           | **Fotosíntesis SOT**                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Ítems                   | **1–322** (322 filas)                                                                             | **323–394** (71 filas)                                                                           |
| Alimenta                | `/api/get-treasure-sheets` → cron `pullFromSheet` (cada 5 min) → `productInventory` (campos base) | Editor admin Fotosíntesis → `productInventory` (campos extendidos) + Apps Script de vuelta       |
| `categoria` es          | **Tipo de pieza** (Anillo en Plata, Topitos, Dije, Pulsera, Joyas, Gema, Piedras, Lote de Gemas)  | **Colección/corte de gema** (Gema Facetada, Muralla, Gola, Raíz, Piedra Natural, Piedra Cristal) |
| Elegible para María/GHL | Sí, vía la regla UNION `estado=DISPONIBLE` (sin `loteId`)                                         | Sí, vía `mostrarEnCatalogo=true`                                                                 |

**El mapeo `tipo_interes → categoria` que los docs previos (`tipo-interes-mapping-analysis.md`,
`VALIDATION-estado-vs-folder-2026-07-06.md`) marcaban como "no derivable" YA ESTÁ
implementado en código** (`convex/_lib/productSearch.ts::resolvedTipoPieza`, commits
`8ddf549`…`b5f45f4`, 4-6 jul) — pero **sin comitear/desplegar** hasta ahora (estaba en el
working tree). Hoy además:

1. Se verificó ese código contra los datos reales de AMBOS sheets (no contra el snapshot
   cacheado de 27-may que usaba el análisis anterior).
2. Se encontraron y arreglaron 3 brechas reales con TDD (7 tests nuevos, todos en verde):
   el vocabulario `categoria` del sheet **legacy** (Anillo en Plata/Topitos/Dije/Pulsera/
   Joyas/Gema/Piedras/Lote de Gemas) no estaba mapeado en absoluto; `Piedra Cristal` (un
   valor real y publicado del lado Fotosíntesis) tampoco; y una fila "fantasma" (sin nombre,
   con `precioCOP` residual) podía colarse como recomendación.
3. Cobertura de señal `tipo_interes` resultante: **legacy DISPONIBLE 0% → 96%** (109/113),
   **Fotosíntesis publicado 84% → 91%** (50/55).

**Trabajo concurrente en curso:** mientras se hacía esta auditoría, otra sesión (del propio
equipo) estaba editando ACTIVAMENTE el mismo archivo (`productSearch.ts`) para agregar dos
features nuevas — compartir piezas `VENDIDA` como "referencia de estilo" y una selección de
precio cualitativa ("precio moderado" → banda de precios) — ver §6.

---

## 1. Arquitectura real (antes no documentada así en ningún archivo de `GHL/`)

```
Sheet "Inventario" (legacy, items 1-322)          Sheet "Fotosíntesis SOT" → tab "Inventario" (items 323+)
  api/get-treasure-sheets.ts (público)              api/get-inventory-rows.ts (ADMIN_SYNC_TOKEN)
         │                                                   │
         │ cron pullFromSheet (5 min)                        │ admin panel (createProduct/saveEdit)
         │ SOLO campos base                                  │ push→sheet vía admin-product-update.ts
         │ (nombre,peso,color,calidad,                       │ Apps Script → convex/fotoSync.ts (vuelta)
         │  categoria,precioCOP,estado,…)                    │ campos extendidos (tipoJoya,subtipoForm,
         ▼                                                   ▼  mostrarEnCatalogo,nivelRareza,…)
              productInventory (Convex, tabla única)
                         │
                         ▼
    convex/ghl.ts::searchProducts — universo elegible (2026-07-04 fix):
      UNION( mostrarEnCatalogo=true , loteId=undefined AND estado=DISPONIBLE )
                         │
                         ▼
        convex/_lib/productSearch.ts::rankProducts (filtro + ranking)
```

Puntos clave que ningún doc anterior conectaba explícitamente:

- El **cron de 5 min NUNCA toca el sheet Fotosíntesis SOT** — pull-from-sheet llama a
  `/api/get-treasure-sheets` (el legacy), no a `get-inventory-rows`. Los ítems 323+ entran a
  `productInventory` únicamente por creación/edición directa desde el panel admin.
- El sheet Fotosíntesis SOT **ya no tiene columna `precioCOP`** (retirada 2026-05-29 por
  ~82% vacía) — los ítems 323+ solo tienen `costoBaseCOP`/`precioEmbajadorCOP`/
  `precioConscienteCOP` en el sheet. El `precioCOP` real que usa el bot para estos ítems se
  escribe por otra vía (UI de captura), y por eso **no se pudo auditar su cobertura de
  precio desde el sheet** — solo desde `productInventory` directamente (bloqueado, ver §7).
- `mostrarEnCatalogo` **nunca se hereda del sheet legacy** (ese sheet no tiene esa columna) —
  por eso la regla de elegibilidad de `searchProducts` trata "sin `loteId` + DISPONIBLE" como
  el equivalente de "publicado" para los ítems legacy. Esto es lo que el comentario del
  código llama "UNION legacy items… ~82% del inventario".

## 2. Taxonomía completa — sheet legacy "Inventario" (322 filas, 113 DISPONIBLE)

| `categoria` (todas las filas) | count |     | `categoria` (solo DISPONIBLE) | count |
| ----------------------------- | ----- | --- | ----------------------------- | ----- |
| Gema                          | 199   |     | Gema                          | 76    |
| Anillo en Plata               | 29    |     | Lote de Gemas                 | 11    |
| Topitos                       | 26    |     | Topitos                       | 6     |
| Lote de Gemas                 | 25    |     | Pulsera                       | 6     |
| Anillo en Oro                 | 11    |     | Piedras                       | 4     |
| Piedras                       | 13    |     | (vacío)                       | 4     |
| Pulsera                       | 8     |     | Joyas                         | 3     |
| (vacío)                       | 4     |     | Anillo en Plata               | 1     |
| Joyas                         | 3     |     | Anillo en Oro                 | 1     |
| Aretes                        | 2     |     | Dije                          | 1     |
| Dije                          | 2     |     |                               |       |

`estado`: VENDIDA 163 · DISPONIBLE 113 · LOTE X CT 27 · RETORNADO 10 · varios menores 7.
`isJewelry` (flag derivado): true 84 / false 238. `precioCOP > 0`: 305/322 (94.7%), y de los
113 DISPONIBLE, 110/113 (97.3%) — los 3 restantes son las filas "fantasma" 320-322 (ver §5).
`coleccion`: 26 valores distintos (nombres de campaña de venta, no relevantes para el mapeo
de tipo de pieza).

## 3. Taxonomía completa — sheet Fotosíntesis SOT (71 filas, 55 publicadas)

| Campo                          | Distribución (n=71)                                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categoria`                    | Gema Facetada 29 · (vacío) 16 · Muralla 9 · Raíz 6 · Gola 6 · Piedra Cristal 4 · Piedra Natural 1                                                                                         |
| `subtipoForm`                  | Gema 40 · (vacío) 13 · Joya 13 · Lote 3 · variantes "Lote de joyas" 2                                                                                                                     |
| `tipoJoya`                     | (vacío) 54 · Topitos 8 · Anillo Mujer 3 · **Murralla** 2 (⚠️ typo — nombre de colección mal capturado en el campo de tipo de pieza) · Dije 1 · Topitos Peq 1 · Aretes 1 · Anillo Hombre 1 |
| `tecnicaJoya`                  | (vacío) 56 · Engaste 11 · varios 4                                                                                                                                                        |
| `estado`                       | DISPONIBLE 58 · VENDIDA 13                                                                                                                                                                |
| `mostrarEnCatalogo`            | TRUE 55 · FALSE 14 · (vacío) 2                                                                                                                                                            |
| `procedencia`                  | Boyacá 33 · (vacío) 17 · Muzo 15 · Chivor 6                                                                                                                                               |
| `color`                        | Verde Muzo 16 · Verde Natural 15 · Verde Turquesa 7 · Verde Intenso 6 · Verde Aguamarina 5 · Verde Chivor 5 · Verde Menta 1 · (vacío) 16                                                  |
| `calidad`                      | F1 21 · COMERCIAL FINA 16 · COMERCIAL SÚPER FINA 13 · F2 6 · resto 15                                                                                                                     |
| `nivelRareza` / `calificacion` | escalas 1-6, ~31% sin llenar en ambas                                                                                                                                                     |
| `coleccion`                    | prácticamente vacía (69/71) — no se usa en este sheet, a diferencia del legacy                                                                                                            |

**Solo 17/71 filas (24%) tienen `tipoJoya` real** — el resto son piedra suelta (`subtipoForm=Gema`,
40 filas) o directamente sin clasificar. Esto confirma, con datos frescos, la conclusión
cualitativa del análisis de 2 jul (`tipo-interes-mapping-analysis.md`): el lado Fotosíntesis
del catálogo sigue siendo ~93% piedra suelta y la señal de "tipo de pieza" ahí es escasa por
naturaleza del negocio (más piedras sueltas que joyas terminadas), no por un bug.

## 4. El mapeo `tipo_interes` — qué ya existía en código vs. qué se agregó hoy

`convex/_lib/productSearch.ts::resolvedTipoPieza` resuelve el "tipo de pieza" real de un
producto en este orden: `tipoJoya` (allowlist) → `tipo` de captura (`gema`/`bruto` →
`gema_suelta`) → `categoria` Fotosíntesis (`GEMA_CATEGORIAS`) → **`categoria` legacy (nuevo,
hoy)**. Comparado contra el `tipo_interes` real que declara el cliente
(`topito/candonga/anillo/dije/gema_suelta/set/otro`).

**Ya implementado (commits `8ddf549`, `9e1d43e`, `bb4343b`, `b5f45f4` — sin comitear más allá
de HEAD, sin desplegar):**

- Dejar de comparar `tipo_interes` directamente contra el `categoria` de colección
  (imposible por construcción — ejes distintos, exactamente el diagnóstico de
  `tipo-interes-mapping-analysis.md`).
- `TIPOJOYA_TO_TIPO_INTERES` (allowlist de valores limpios de `tipoJoya`) + `GEMA_CATEGORIAS`
  (colecciones Fotosíntesis → `gema_suelta`) + degradación en 4 pasos (tipo estricto+precio
  estricto → tipo estricto → precio estricto → todo relajado).
- Unión de elegibilidad legacy+Fotosíntesis (ver §1).
- Piso de precio 0.8×-1.2× (evita ofrecer una pieza de 250k a un cliente con presupuesto de 5M).
- Guardia de precio positivo (evita recomendar filas con `precioCOP:0`).

**Agregado hoy (TDD, 7 tests nuevos, ver `tests/productSearch.test.ts`), con datos en vivo:**

1. **`LEGACY_CATEGORIA_TO_TIPO_INTERES`** — el vocabulario del sheet legacy (`Anillo en
Plata/Oro`→anillo, `Topitos`→topito, `Dije`→dije, `Gema`/`Piedras`/`Lote de Gemas`→
   gema_suelta, `Pulsera`/`Joyas`→otro) NO estaba cubierto por ningún mapeo existente — cada
   ítem legacy (113 DISPONIBLE hoy) resolvía "sin señal" y solo llegaba al cliente vía el
   boost secundario de substring (nunca al filtro estricto). No es un mapeo inferido/adivinado:
   es el vocabulario controlado propio del sheet (mismo que `JEWELRY_CATEGORIES` en
   `api/get-treasure-sheets.ts`), la clase de señal que el análisis de 2 jul recomendaba
   buscar en vez de adivinar por texto libre.
2. **`Piedra Cristal`** añadido a `GEMA_CATEGORIAS` — 4 ítems publicados y en vivo (items
   326-329) con ese `categoria` no resolvían nada; ahora resuelven `gema_suelta`.
3. **Guardia "sin nombre"** — una fila sin `Nombre` (ítem 319 real: nombre vacío, categoría
   vacía, `precioCOP:521` residual) podía sobrevivir el filtro de precio positivo y, sin
   presupuesto declarado, ganar el desempate "más barato primero" — el bot no puede mostrar
   una línea de WhatsApp ni una página de Vitrina para una pieza sin nombre.

**Cobertura resultante (contra los datos reales de hoy, no un snapshot cacheado):**

| Universo elegible                 | Antes de hoy | Después de hoy    |
| --------------------------------- | ------------ | ----------------- |
| Legacy DISPONIBLE (113 ítems)     | 0% (0/113)   | **96% (109/113)** |
| Fotosíntesis publicado (55 ítems) | 84% (46/55)† | **91% (50/55)**   |

† Ya cubierto por el trabajo previo (`tipoJoya`/`GEMA_CATEGORIAS`/`tipo`); el 7% adicional de
hoy es exclusivamente el fix de `Piedra Cristal`.

Los 4 restantes sin señal en legacy son las filas fantasma 319-322 (ver §5, ya excluidas por
otros filtros salvo 319). Los 5 restantes sin señal en Fotosíntesis son 1 fila sin
`categoria`/`tipoJoya` en absoluto y 4 filas `tipoJoya=Topitos` con `categoria` vacía — un
error de captura real, no un vacío de mapeo (deberían resolver `topito` vía `tipoJoya`, y de
hecho SÍ resuelven — están contados como cubiertos arriba; el ítem realmente huérfano es solo
uno, "Corazón de la trinidad", sin ningún campo de tipo).

## 5. Calidad de datos — hallazgos concretos

- **Filas fantasma en el sheet legacy (ítems 319-322):** `Nombre` y `categoria` vacíos,
  `estado` cae al default `"DISPONIBLE"` de `get-treasure-sheets.ts` cuando la celda ESTADO
  está vacía (`mapRowToTreasureItem`, línea ~169: `... || "DISPONIBLE"`). El ítem 319 además
  tiene `precioCOP:521` (residual, no un precio real) — sin el nuevo guard de "sin nombre",
  esa fila ganaría el desempate "más barato primero" cuando no hay presupuesto declarado,
  repitiendo la clase de incidente que ya se vio con las filas `$0` el mismo día de hoy.
  **Recomendación adicional (no implementada, fuera del alcance de este parche):** revisar
  si conviene que `get-treasure-sheets.ts` NO defaultee `estado` a `"DISPONIBLE"` cuando la
  fila completa está vacía — hoy cualquier consumidor de ese endpoint (no solo el bot) hereda
  el mismo riesgo.
- **`tipoJoya: "Murralla"` (2 filas, Fotosíntesis)** — típo de captura: el nombre de una
  colección ("Muralla") terminó en el campo de tipo de pieza. El código ya lo trata
  correctamente como "sin señal" (no está en el allowlist) — comportamiento correcto, solo
  se deja constancia para que alguien limpie la captura en el admin.
- **`precioCOP` para ítems Fotosíntesis (323+) no auditable desde el sheet** — esa columna no
  existe en el SOT desde el 29-may; solo vive en Convex. No se pudo confirmar cobertura de
  precio para el lado Fotosíntesis sin acceso directo a `productInventory` (ver §7).
- **Cobertura de `tipoJoya` en Fotosíntesis: 24% (17/71)** — no es un bug, es reflejo de que
  la mayoría de la captura reciente es piedra suelta, consistente con `subtipoForm` (40/71
  = "Gema").

## 6. ⚠️ Trabajo concurrente en el mismo archivo (a tener en cuenta, no arreglado aquí)

Mientras se hacía esta auditoría, **otra sesión activa del equipo** (mismo repo, mismo
archivo `convex/_lib/productSearch.ts`) implementó en vivo dos features nuevas, sin relación
con el mapeo de tipo de pieza:

1. **`SHAREABLE_ESTADOS` (DISPONIBLE + VENDIDA)** — piezas `VENDIDA` ahora se comparten como
   "referencia de estilo" para categorías con poco stock (ej. anillos de compromiso), con
   `disponible:false` para que el cliente sepa que es un ejemplo, no comprable.
2. **Selección de precio cualitativa** (`PriceTier`, `tierBand`, `spreadAcross`,
   `selectByPrice`) — cuando el cliente da una pista cualitativa ("precio moderado") en vez
   de un número, el bot ahora reparte 3 opciones a lo largo de la banda de precio en vez de
   agrupar 3 casi-idénticas.

Esto **cambió el comportamiento del camino "sin presupuesto numérico"** (ya no es
"más barato primero", ahora es "muestreo repartido dentro del grupo de mejor tipo de pieza").
Al momento de escribir esto, **2 tests pre-existentes de `tests/productSearch.test.ts`
seguían en rojo** por este cambio (los que asumían el comportamiento viejo) — la otra sesión
los estaba corrigiendo en tiempo real (se vio pasar de 3 a 2 fallos, con un test ya
reescrito). **No se tocó esa lógica ni esos tests** — son de esa sesión, no de esta
auditoría. Antes de comitear cualquier cosa de `productSearch.ts`, correr
`npx vitest run tests/productSearch.test.ts` para confirmar que ambos trabajos conviven en
verde.

## 7. Lo que NO se pudo verificar

- **`productInventory` en vivo directamente** — el intento de consultarlo vía
  `ConvexHttpClient` fue bloqueado por el clasificador de seguridad de la sesión ("lectura de
  producción no autorizada explícitamente por el usuario"). Todo lo de este reporte se
  verificó reconstruyendo la lógica real de `resolvedTipoPieza`/`eligibleProducts` contra los
  DOS sheets fuente (que son, por diseño, la fuente de la que `productInventory` se
  alimenta) — es una proxy fiel para `categoria`/`tipoJoya`/`estado`/`mostrarEnCatalogo`,
  pero no confirma 1:1 los campos que solo existen en Convex (ver `precioCOP` de
  Fotosíntesis, arriba). Si se quiere una auditoría 100% exacta de `productInventory`, pedir
  explícitamente `npx convex run products:list '{}'` desde una sesión con
  `CONVEX_DEPLOYMENT` configurado, o autorizar la consulta directa.
- **Anima (Obsidian) / Mempalace** — sin hallazgos específicos de GHL/catálogo más allá de lo
  que ya vive en `GHL/` (ver banner de `ESTADO-Y-PROXIMOS-PASOS.md`, sección de memoria).

## 8. Recomendaciones (orden sugerido)

1. **Revisar y comitear** `convex/_lib/productSearch.ts` + `tests/productSearch.test.ts`
   (junto con el trabajo concurrente de §6 una vez esté en verde) — hoy todo vive sin
   comitear en el working tree. `npx convex deploy` queda pendiente de decisión explícita
   (afecta producción en vivo, WF-04 ya está Published).
2. **Confirmar con el negocio** el mapeo `Joyas → otro` (no `set`) y `Aretes/Pulsera → otro`
   — son las únicas decisiones semánticas de este parche que no son 1:1 obvias (todas las
   demás, anillo/topito/dije/gema_suelta, son traducciones literales del nombre de la
   categoría).
3. **Limpieza de captura:** corregir el `tipoJoya: "Murralla"` (2 filas) en el admin
   Fotosíntesis, y decidir si `get-treasure-sheets.ts` debe dejar de defaultear `estado` a
   `DISPONIBLE` en filas completamente vacías.
4. Ver `GHL/ESTADO-Y-PROXIMOS-PASOS.md` (banner del 6 jul) y
   `VALIDATION-estado-vs-folder-2026-07-06.md` para el resto del roadmap priorizado (pool de
   agentes, plantillas Meta, WF-02/07/09/10/12).

## 9. Update — dos features nuevas ya en código (misma sesión, trabajo concurrente cerrado)

El trabajo concurrente descrito en §6 terminó: **`VENDIDA` compartible como referencia de
estilo** y **precio cualitativo** ("precio moderado" → banda de precio repartida) quedaron
implementados, con 553/553 tests en verde y typecheck limpio en los archivos tocados. Sigue
todo sin comitear/desplegar. Verificado en código (no solo en la narración de esa sesión):
`convex/ghl.ts::searchProducts` ahora también escanea `estado=VENDIDA` (vía la misma unión
legacy) y devuelve `productos[].disponible` (`true` solo si `estado==='DISPONIBLE'`);
`api/ghl-search-products.ts` acepta un `priceTier` explícito en el body O lo infiere de un
`presupuesto` no-numérico vía `parsePriceTier` (`api/_lib/parseBudget.ts`).

**Dos brechas de cableado GHL (Progresy), ninguna tocada aquí — requieren editar la cuenta en
vivo, fuera de alcance de esta sesión (solo lectura del repo):**

1. **`presupuesto_declarado` es un campo tipo `Number` en GHL** (`SETUP-SPEC-HTML.md:190`,
   `manual-ghl-paso-a-paso.html:339`). El fallback de `parsePriceTier(body.presupuesto)`
   (inferir el tier de un `presupuesto` en texto libre, "precio moderado") solo puede
   dispararse si ese campo realmente llega a guardar texto no-numérico — incierto sin probar
   en vivo si el escritor de campos de la IA de Conversación respeta el tipo de campo tan
   estrictamente como el formulario manual. **Recomendación robusta:** crear un campo nuevo
   tipo Texto (ej. `precio_tier`) que María llene cuando el cliente responde con una palabra
   en vez de un número, y agregar `"priceTier":"{{contact.precio_tier}}"` al body del webhook
   de WF-04 (`api/ghl-search-products.ts` ya acepta ese campo explícito — no requiere cambio
   de código, solo el campo + el merge tag en Progresy). Actualizar también el prompt de
   María (fuente canónica `output/bot-maria-prompt.md`) para que sepa escribir ahí.
2. **El WhatsApp de WF-04 no tiene merge tag para `disponible`.** Hoy el mensaje usa
   `.0.nombre`/`.0.precio_cop`/`.0.web_link` (y `.1./.2.`) pero nada de `.0.disponible` — un
   cliente puede recibir una pieza `VENDIDA` (mostrada como "referencia de estilo") sin
   ninguna indicación de que no está disponible para comprar. **Recomendación: sí hace falta
   un badge/aviso explícito antes de publicar esto en vivo** — el propio código ya declara esa
   intención ("para que un cliente no intente comprar una pieza vendida"), así que omitir el
   aviso deja la feature a medio terminar y con riesgo real de confusión/reclamo del cliente.
   Agregar `.0.disponible` a los merge tags del mensaje + condicionar el texto (ej. "(pieza de
   referencia, ya vendida — pregúntame por una similar)" cuando `disponible=false`).

Ninguno de los dos requiere más cambios de código — son configuración de Progresy/GHL (campo
nuevo + edición del webhook body + edición del mensaje de WhatsApp + ajuste del prompt de
María), la misma clase de trabajo que el resto de WF-04 y fuera del alcance de una sesión sin
Chrome/Progresy en vivo.
