# Auditoría de inventario Tierra Mädre — resumen completo

**23–24 de agosto de 2026** · Reemplaza a `ESTADO-PENDIENTES-2026-08-23.md`

Hoja de trabajo:
[Inventario V5 · Disponibles](https://docs.google.com/spreadsheets/d/1Z9tMELBh3BTNx6ymNdUReiLsf0sgYK-IcSSMWCcmibc/edit)
— 7 pestañas: Disponibles V5 · Por completar · Insumos · Perfil de datos · Calidad de datos ·
Cruce Anima · Ventas y consignaciones · Auditoría de costos.

---

## 1. El titular

| | |
|---|---|
| Filas en el SOT v3 | 576 · 58 columnas · sin `Item` duplicado |
| Marcados DISPONIBLE | 320 |
| — insumos (no vendibles) | 30 |
| — producto | 290 |
| **Producto realmente disponible** | **264** |
| Con ficha completa (14 campos) | 46 de 290 — **el 16%** |

**Los conteos de ítems son firmes. Las cifras de plata NO son citables** — ver §5.

---

## 2. Certificados del Lote Origen

El «Lote Origen» es `C-017` (duplicado como `S-001`): 47,47 ct · 18 unidades · $378.000.000.
**Ningún ítem lo referencia por `loteId`** — el lote existe sin miembros.

Los certificados no están en el SOT ni en Anima. Viven solo en la presentación *"Ver lote Origen"*:
**18 reportes — 9 Extrafine NO OIL + 9 Fine F2**.

Al cruzarlos, **seis de los nueve NO OIL tenían la calidad mal** en el SOT. Los tres reportes GIA
imprimen literalmente `Clarity Enhanced (F1)`, lo que probó que **F1/F2 es la escala de aceitado**,
no de fracturas.

**Conflicto abierto:** #544, #545 y #550 los da NO OIL la presentación y `Clarity Enhanced (F1)`
el GIA de jun-2026, con medidas idénticas al centésimo. Son las tres piezas que sostienen la tarifa
Extrafine. **Congeladas hasta que decidas cuál laboratorio manda.**

**Subcosteo no aplicado — $29,98 M.** La tarifa se asignó por *serie de certificado*, no por el tier
que dice el certificado. Extrafine cruza las dos series, así que #551, #550, #553 y #483 —Extrafine
NO OIL— quedaron costeadas a tarifa Fine.

**8 certificados subidos a Drive** (`fotosintesis/{lote}/{item}-cert/`), PDF + JPG de la página 1,
permisos verificados con lectura anónima: 8/8 devuelven `image/jpeg` 200. Antes existían solo en el
contenedor efímero de la sesión.

---

## 3. Duplicados

**Literales: ninguno.** Ni un `Item` ni un QR repetido. Los 12 nombres repetidos son piezas
distintas.

**Lógicos: seis**, y esos sí cuestan. Registros-padre que Anima marcó RETIRADOS al despiezarlos y
que siguen DISPONIBLE junto con sus hijos:

| Ítem | Motivo | Costo | Precio |
|---|---|---|---|
| #339 Jardín Secreto | Padre de #429–#433 | $1.300.000 | — |
| #363 Igualdad | Despiece → #467–#470 | $735.000 | $1.392.140 |
| #471 Bellezas del Alba | Par → #467–#470 | $367.500 | $693.635 |
| #472 Guardianas Gemelas | Par → #467–#470 | $367.500 | $565.241 |
| #383 Shou | Fusionado a #381 | $210.000 | $394.456 |
| #93 Dos Luciérnagas | Separado en #93A y #93B | $0 | $0 |

En #363 el mismo costo está vivo en **tres niveles a la vez**: lote, par y piedra.

---

## 4. Vendidos que siguen figurando como disponibles

Aparecieron al abrir fuentes que no estaba mirando: la pestaña **Ventas**, las columnas **`Caja:*`**
del propio SOT v3, y **«Movimientos Asesor»** del SOT v2.

- **12 con `Caja: estado contable` = VENDIDO.** Las siete de Mitchel Moreno Marin (#128–#134)
  están **cobradas completas, saldo $0**, y siguen en el inventario.
- **3 en manos de terceros:** #238 y #246 con Pablo Loaiza; #239 pasó a Raquel Flores el 28-jul.
- **#370 Celeritas** tiene venta `VO-0002` en estado *reservada* del 2-jul que **no existe en la
  pestaña Ventas del v3** — se perdió en la migración. Igual que `VC-0002` y `VC-0003`.
- **4 con entrega neta sin devolución** (#151, #379, #419, #420) a Mauricio Echeverry, confirmado
  por dos fuentes independientes. **No eran pruebas de pasarela** — eso aplicaba solo a los 5 QA.

**Caso inverso — plata no cobrada:** 9 ítems marcados VENDIDA con saldo pendiente. El mayor:
**#212 Pulsera Tenis PT1, saldo $17.822.250 con M.Ruiz.**

---

## 5. ⚠️ Por qué el costo no es citable

**Seis piezas concentran el 65,2% del costo del producto disponible:**

| Ítem | Lote | Costo | $/ct |
|---|---|---|---|
| #193 Secretos del Sol | LC-03 | $357.923.077 | $17.307.692 |
| #192 Tayrona | LC-03 | $318.807.692 | $20.769.231 |
| #194 Gaia Imperial | LC-03 | $235.038.462 | $17.307.692 |
| #195 Luz de Eternidad | LC-03 | $162.750.000 | $40.384.615 |
| #203 Boyacá | LC-01 | $98.076.923 | $9.114.956 |
| #191 Nebulosa Verde | LC-03 | $87.692.308 | $23.076.923 |

Los otros 284 ítems suman $673.603.522 **entre todos**.

**El costo no viene de ninguna factura.** La nota del propio lote dice:

> *"Lote RECONSTRUIDO 2026-07-23 desde colección «Finas 29-Ene». costoTotalCOP = Σ costoBaseCOP de
> sus ítems (no es factura original: sin proveedor ni número de factura)."*

Y las once piezas caras arrastran la misma marca de conflicto —
*"Caja (snapshot) registra comprador M.Ruiz vs asesor actual M.Campuzano"*— mientras varias añaden
***"peso ct recuperado de serial Excel"***. Peso incierto dividiendo costo incierto: por eso #195 da
$40.384.615/ct y #200 da $1.317.270/ct **estando en la misma colección**.

**Rectificación.** Primero leí el «25× arriba» de la nota de SOT v4 como prueba de error de escala.
**No lo es.** La hoja «Formulación Comercializadora» (que *es* esa auditoría, $71.610.481) cubre
**solo lotes C-\***: cero líneas LC-*. Los 15 lotes LC-* llevan $1.723.416.425 —el 83% del costo—
y nunca entraron. La auditoría y el SOT nunca midieron lo mismo.

Lo que sí incrimina a las seis piezas es la ausencia de factura y el peso rescatado de un serial
corrupto — no la comparación de universos distintos.

**LC-03 dejó de conciliar:** declara $1.069.210.000 y sus piezas suman $1.233.703.846
(+$164.493.846). Como el total del lote *es* la suma de sus ítems por construcción, que hoy no
cuadre significa que alguien tocó costos después del 23-jul sin recalcular el lote.

---

## 6. Otros hallazgos de calidad de datos

- **27 ítems pesan exactamente 18,00 ct** — valor por defecto, no medición. 19 ya se vendieron, así
  que su precio se calculó sobre un peso inventado.
- **20 ítems publicados sin precio** y **34 publicados sin foto**.
- **40 ítems con `costoBaseCOP` = 0** — faltante disfrazado de dato.
- **21 de los 30 insumos están publicados en el catálogo** (postes, chatones, cadenas de baño).
- **19 ítems con un valor de ESTADO copiado en la columna Colección** — duplicación, no
  desplazamiento: el ESTADO está intacto.
- **9 ítems con ESTADO vacío** (#501, #503–#507, #511, #518, #519): ni disponibles ni vendidos.
- **5 columnas 100% vacías** y **12 ítems con `Colección` = 0.46597222222222223** (una fecha mal
  pegada: es la fracción de día de Sheets).
- **5 lotes declaran costo sin una sola pieza enlazada** — C-017 y S-001 con $378.000.000 cada uno.

---

## 7. Fuentes revisadas

| Fuente | Resultado |
|---|---|
| SOT v3 — 13 pestañas | Fuente de verdad. `Ventas` y `Caja:*` estaban sin cruzar |
| SOT v2 — 12 pestañas | Snapshot viejo y sucio. **Cero datos utilizables** para llenar huecos |
| Vault de Anima — 523 notas | Snapshot al 22-jul. Solo 17 valores rellenables; el valor real son las **69 secciones escritas a mano** |
| Presentación "Ver lote Origen" | Los 18 certificados. Única fuente |
| Formulación Comercializadora | El motor de precios. NO es un inventario |
| **SOT v4** | **No es una hoja**: es la rama Convex `feat/w1-w3-sot-v4`, sin mergear, en dev `flexible-wolverine-803` |
| `anima_TM_bot` | **No existe.** Solo `anima-bot-ops.md`, notas del daemon de Telegram |

**Sin abrir:** el segundo archivo que pasaste (`1mgnqTr2R3aSkV9t1xTZhddhHi-gQQcWW`) — HTTP 404 con
`comercial.aretrust@gmail.com`.

---

## 8. Decisiones que dependen de ti

1. **¿Las seis piezas de LC-03/LC-01 son reales o error de escala?** Bloquea toda cifra de plata.
2. **¿GIA o la presentación** en #544, #545, #550? Bloquea el recosteo de $29,98 M.
3. **¿Existe factura separada del Lote 170?** Si el rate salió de las tablas Extrafine/Fine y no de
   una factura, cuatro piedras están en la fila equivocada.
4. **¿Retiro los 6 duplicados lógicos y los 15 vendidos/entregados** del inventario disponible?
5. **¿Los 4 de Mauricio Echeverry** (#151, #379, #419, #420) siguen fuera?
6. **Nombre para #441 «Vida»**, que hoy colisiona con #311.
7. **¿De qué lote sale #484 Magia?** ($65 M del Lote Lágrima vs Lote 170.)

---

## 9. Trabajo pendiente de plataforma

- `certificadoUrl` es **un campo único**: no caben GIA y certificado propio a la vez.
- `ProductDetailPage.tsx:325` **descarta los PDF** del carrusel. Por eso subí también el JPG.
- Bug real en `wrap()` de `gen-etiquetas-tiras.py` (~95) y `gen-etiquetas-thermal.py` (~75):
  compara conteos de caracteres y `text.split()` normaliza espacios ⇒ "…" falso en #244, #89,
  #295, #218. Arreglo: `if " ".join(lines) != " ".join(text.split()):`
- Prompts entregados sin correr: `PROMPT-verificacion-estado.md`, `PROMPT-produccion-c068.md`,
  `PROMPT-etiquetas-nombre.md`.
- `PROMPT-correcciones-lote-origen.md` **sí se ejecutó** — la fuga de «Piso de negociación» quedó
  cerrada (0 ítems), pero #484 no se aplicó, #552 quedó con precio $9.000.000 escrito a mano y
  costo en 0, y a #554 le cambiaron el peso de 0,89 a 0,88 rompiendo su tarifa.
