# Kardex de consignación de catálogo vivo — Design

**Fecha:** 2026-07-16
**Estado:** aprobado, pendiente de plan de implementación
**Destinatario del primer kardex:** Juan Manuel Escobar Ramírez (comercializador externo, sin cuenta en el sistema)

## Problema

Dos "catálogos vivos" (estuches viajeros) salieron en consignación hacia el mismo comercializador
externo. Hoy solo existen como notas en Anima (`Wings/Projects/TierraMadre/inventario/`): no hay
ningún movimiento registrado en Fotosíntesis, y por lo tanto no hay comprobante que respalde qué
piezas tiene esa persona en su poder.

Se necesita emitir el recibo de kardex y hacérselo llegar.

## Qué ya existe (no se reconstruye)

La exploración del 2026-07-16 encontró que el kardex de consignación multi-ítem **ya está
construido y probado**:

| Pieza                                | Ubicación                                                   | Qué hace                                                                                                |
| ------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `registerHandoffBatch`               | `convex/asesorMovements.ts:455`                             | "One form, one recipient, one printed comprobante, N items" → N filas con un `kardexEventId` compartido |
| `destino: 'consignacion'`            | `convex/asesorMovements.ts` (registerArgs)                  | Estado `CONSIGNACION` para comercializador externo sin cuenta                                           |
| `listByKardexEventId`                | `convex/asesorMovements.ts:519`                             | Alimenta el PDF del comprobante                                                                         |
| `MovimientoKardexPreview`            | `src/pages/admin/Fotosintesis/components/`                  | Renderiza el comprobante                                                                                |
| `exportAndUploadMovimientoKardexPdf` | `src/pages/admin/Fotosintesis/exportMovimientoKardexPdf.ts` | Captura → Drive `movimientos-asesor/YYYY/MM`                                                            |
| `requireBotSecret` / `*ViaBot`       | `convex/_lib/botAuth.ts`                                    | Puente autenticado anima-bot → Convex                                                                   |

**No se escribe lógica de negocio nueva.** El trabajo real es: sanear datos + un comando en el bot.

## Decisiones de arquitectura

### 1. El origen es la admin page, no las hojas de cálculo ni el bot

`captureNodeToPdf` (`src/pages/admin/Fotosintesis/captureNodeToPdf.ts`) usa `html2canvas` sobre un
nodo DOM vivo. El anima-bot es un demonio Node sin DOM: **no puede renderizar este PDF**. El
navegador genera y archiva a Drive; el bot solo entrega el resultado.

Esto cierra la pregunta original ("admin page o spreadsheets"): tiene que ser la admin page.

### 2. El bot entrega al owner, no al destinatario

Telegram no permite que un bot inicie conversación con quien nunca le ha escrito, y
`src/telegram/gateway.ts` además restringe la admisión a _owner / trusted en DM, o un único grupo_.
El bot manda el PDF al DM del owner; el owner lo reenvía a Juan Manuel por el canal que prefiera.

No se toca la puerta de admisión y no se le pide nada al destinatario.

### 3. Un solo kardex para los dos catálogos

Ambos estuches van al mismo destinatario. Un `registerHandoffBatch` → un `kardexEventId` → un PDF.

Esto además esquiva un dato que no existe: no hay forma de saber cuáles anillos van en cuál
estuche (no hay corte registrado para dividirlos). Un recibo único dice qué tiene esa persona **en
total**, que es exactamente lo que protege al negocio. Cada línea anota su catálogo en `notas`.

### 4. M-001 / M-002 son etiquetas, no `loteId`

El prefijo de lote **codifica la sede**, no un tipo de documento
(`convex/sequences.ts:94`, y `Anima/Wings/Projects/TierraMadre/architecture/2026-05-22-lote-id-prefix-city-inventory.md`):

```ts
export type Sede = 'B' | 'C' | 'S' | 'M' | (string & {});
// lot:C / lot:S / lot:M → Cali, Secreta, Marketing
```

**B = Bogotá, C = Cali, S = Secreta, M = Marketing.** El `C-0001` original colisionaba
conceptualmente con los lotes de Cali, y por eso se renombra — pero **no puede convertirse en un
lote `M-001` real**: en este sistema `loteId` es la _procedencia de compra_ de la pieza, y de ella
depende el costeo (`costoBaseCOP = lot.costoTotalCOP × preponderancia%`).

Los ítems ya tienen lote propio: Koru `C-018`, Namek `C-010`, Mellizas/Guardianas `C-042`, Rocas
Lunares `C-034`, Brújula Sagrada `C-007`, Amor de Verano `C-008`, Teia `C-019`. Reasignarlos a
`M-001` **borraría de dónde vino cada pieza y rompería su costeo**.

Decisión: `M-001` y `M-002` son etiquetas legibles que viajan en `notas` por línea y en el título
del PDF. La identidad real del evento es el `kardexEventId` (`KDX-<ts>-<hash>`) que el sistema ya
genera. Ningún `loteId` se toca.

## Contenido del recibo

### 20 líneas auditables

**M-001 (Catálogo vivo #1) — 8**

| Ítem | Pieza                                 | Lote  | `cantidad` en producción |
| ---- | ------------------------------------- | ----- | ------------------------ |
| #437 | Rocas Lunares — Sub-lote 4            | C-034 | 4                        |
| #264 | Pegasus                               | —     | 1                        |
| #472 | Mellizas del Alba (par: #469 + #470)  | C-042 | 2                        |
| #471 | Guardianas Gemelas (par: #467 + #468) | C-042 | 2                        |
| #427 | Namek                                 | C-010 | 4 ⚠️                     |
| #373 | Koru                                  | C-018 | 17 ⚠️                    |
| #80  | Grecia                                | —     | 1                        |
| #298 | Libélulas de la Sabana                | —     | 1                        |

**Anillos de plata de mujer (COLECCIÓN Fenix) — 7**

| Ítem | Pieza           | Talla | `precioCOP` |
| ---- | --------------- | ----- | ----------- |
| #118 | Sara Connor     | 6     | 420.000     |
| #119 | Arya Stark      | 9     | 380.000     |
| #120 | Jessica Jones   | 5     | 270.000     |
| #121 | Claris Starlin  | 8     | 380.000     |
| #122 | Amy Dunne       | 0 ⚠️  | 410.000     |
| #123 | Hermione        | 0 ⚠️  | 400.000     |
| #167 | Anillo de Plata | 7     | 570.000     |

**M-002 (Catálogo vivo #2) — 5**

| Ítem | Pieza                       | Lote  | `cantidad` en producción |
| ---- | --------------------------- | ----- | ------------------------ |
| #342 | Brújula Sagrada             | C-007 | —                        |
| #348 | Amor de Verano              | C-008 | —                        |
| #170 | Gotas del Amazonas          | —     | 2 ⚠️                     |
| #382 | Teia                        | C-019 | 5                        |
| #315 | Libélulas de la Sabana Gola | —     | 1                        |

### 4 líneas en texto libre (`condicion`)

Irresolubles hoy — los datos no existen en ningún sistema:

- **Luciérnaga 1 y 2** ("93A"/"93B"): no resuelven a ningún ítem. **#93 es "Julieta"**; no hay
  ninguna "Luciérnaga" en producción.
- **508-B — sub-lote "Innombradas"**: no existe el sub-lote `508-B`, ni el ítem `#508`, ni
  contenido en `C-067` (vacío). Los itemIds saltan de #499 a #520.
- **#151 Mariposas de la Montaña**: ya está en `CONSIGNACION` con `cantidad: 17` — ya fue
  entregada a alguien. Si es a Juan Manuel, hay un movimiento previo sin registrar aquí; si es a
  otro, hay un conflicto físico. **Sin resolver.**

### 1 línea descartada

- **#469** (Mellizas del Alba — Piedra 3): está **contenida en #472** (el par, `cantidad: 2` =
  #469 + #470). Los catálogos la listaban por separado además del par → doble conteo de la misma
  piedra física. Se registra solo #472.

## Saneamiento previo (requerido)

`_registerHandoff` exige `estado === 'DISPONIBLE'` y lanza excepción si no
(`convex/asesorMovements.ts:174`). Los 7 anillos Fenix están en `Retornado`.

**Cambio:** los 7 pasan `Retornado` → `DISPONIBLE` antes del batch. No es un parche: el propietario
verificó físicamente que esas piezas están en el estuche; el estado simplemente está
desactualizado. La edición se audita vía `productEdits` como cualquier otra y se sincroniza a la
hoja con el `products.pushToSheet` existente.

Los otros 8 anillos de plata en producción quedan fuera: #52 Pocahontas es `COLECCIÓN Princesas`,
está `DISPONIBLE` y vive en `OFI.CALI` (los 7 Fenix son `OFI.BOGOTÁ`); #442 Poseidón es de hombre.

## Verificación física pendiente — cantidades

**El kardex imprimirá el `cantidad` de producción salvo instrucción contraria.** Eso significa que
el papel afirmaría que el destinatario tiene 17 unidades de Koru y 2 Gotas del Amazonas.

| Ítem                    | Producción | Realidad conocida                                          |
| ----------------------- | ---------- | ---------------------------------------------------------- |
| #373 Koru               | 17         | sin verificar                                              |
| #427 Namek              | 4          | la foto muestra **5** (discrepancia confirmada en el dato) |
| #170 Gotas del Amazonas | 2          | solo **1** confirmada físicamente                          |
| #437 Rocas Lunares      | 4          | sin verificar                                              |
| #382 Teia               | 5          | la foto muestra 5 ✓                                        |

**Riesgo:** si el estuche tiene menos de lo que dice el recibo, el documento compromete al
destinatario a devolver piezas que nunca recibió. Requiere conteo físico antes de firmar.

## Hallazgos colaterales (fuera de alcance, documentados)

- **El lote C-053 no existe en Convex.** Los 9 anillos que Anima documenta como C053 (Grecia #80,
  Ra #241, Capricornio #263, Andrómeda #237, Misterio de la Noche #239, Encantada #238, Danza del
  Bosque #246, Boreal Divina #250, Luz del Sol) están en producción como `categoria: "Gema"` con
  `loteId: null`. Los lotes saltan de `C-049` a `C-054`. Anima y Convex no coinciden sobre qué es
  ese lote.
- **El campo `talla` tiene dos significados.** En los anillos preexistentes guarda la talla del
  anillo (5–9); en las gemas de C053 guarda el **corte** ("Ovalo", "Cuadrada", "Esmeralda",
  "Varias"). Y `medidas` suele contener el literal `"Largo x Ancho"` — el encabezado de la
  plantilla, no un valor.
- **Discrepancias de corte Anima ↔ Convex:** Danza del Bosque #246 — Anima dice "Cuadrada",
  Convex dice "Esmeralda". Capricornio #263 — Anima dice que el corte nunca se dictó, Convex dice
  "Cuadrada".
- **Identificaciones nuevas:** Brújula Sagrada = **#342** (Gola, C-007) y Amor de Verano = **#348**
  (Gema Facetada, C-008). Las notas de Anima los tenían sin número de ítem.
- **No existe dato de corte "pera/gota" en producción.** Las notas describen 6 anillos "pera/gota";
  la palabra no aparece en ningún registro. La asignación de los 7 Fenix se sostiene en la
  confirmación física del propietario, no en el dato.

## Componentes a construir

1. **Saneamiento de estado** — pasar 7 ítems `Retornado` → `DISPONIBLE` (auditado).
2. **Emisión del kardex** — `registerHandoffBatch` con las 20 líneas, `destino: 'consignacion'`,
   `condicion` con las 4 líneas de texto libre + la condición de devolución, `notas` por línea con
   M-001/M-002.
3. **Comando del bot** — dado un `kardexEventId`, resolver el enlace de Drive del comprobante y
   enviarlo al DM del owner. Único componente genuinamente nuevo.

## Fuera de alcance

- Identificar las Luciérnagas, 508-B, o resolver #151.
- Reconciliar C-053 entre Anima y Convex.
- Normalizar el doble significado de `talla`.
- Ampliar la puerta de admisión del bot para terceros.
- Cualquier reasignación de `loteId`.
