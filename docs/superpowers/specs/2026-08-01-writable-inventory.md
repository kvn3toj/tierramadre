# Inventario de campos WRITABLE — qué pasa con cada uno en SOT v4

- **Fecha:** 2026-08-01 · **Task:** E2 del plan `2026-08-01-w1-w3-sot-v4-fase1.md`
- **Alcance:** SOLO DOCUMENTO. No se cambió ni una línea del pull de v3.

## Por qué existe este doc

En v3 la hoja es la fuente y el pull trae columnas de vuelta a Convex. En v4 la
hoja es un espejo y **nunca es origen** (§4.3 de la spec de wizards). Cada campo
que hoy puede bajar de la hoja tiene entonces que resolverse: o gana su control
en la UI de Fotosíntesis y sale del pull, o se documenta como excepción temporal
con detección de deriva.

La lista sale de `convex/_lib/sheetPullMaps.ts#WRITABLE`, leída el 2026-08-01.

## El resumen

De los **46 campos** que hoy pueden bajar de la hoja al inventario, la mayoría son
descriptivos y ya tienen dónde capturarse en la app. Los que importan de verdad
son **cuatro**, y tres de ellos son dinero.

| Campo                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Hoy                            | Destino propuesto en v4                                                                                     | Por qué                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `costoBaseCOP`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | sheet-owned desde 2026-07-24   | **Muere.** Lo reemplaza `costoUnitarioRealCOP`, capturado en la casilla (W2)                                | Es la regla dura §4.2. El costo por pieza es de quien clasifica, no de una celda                                                                                      |
| `precioFinalCOP`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | sheet-owned desde 2026-07-23   | **Sale del pull.** Lo calcula el motor (`_lib/motorPrecios`) desde el costo capturado y la categoría fiscal | Hoy es un precio a mano que nadie puede auditar; el motor da el mismo número con su cadena visible                                                                    |
| `precioFinalManual`                                                                                                                                                                                                                                                                                                                                                                                                                                                               | bandera del pull               | **Muere con `precioFinalCOP`**                                                                              | Sin pull no hay arbitraje de dueño de columna, que es lo único que esta bandera resuelve                                                                              |
| `estado`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | writable (`coerce: estadoInv`) | **Sale del pull.** Lo mueven los movimientos de W3                                                          | Un estado editable a mano es cómo se vende dos veces la misma pieza                                                                                                   |
| `mostrarComoLote` (lots, subLotes)                                                                                                                                                                                                                                                                                                                                                                                                                                                | writable                       | **Gana control en la UI** y sale del pull                                                                   | Mismo caso que `mostrarEnCatalogo`, que ya se excluyó el 2026-07-30                                                                                                   |
| `loteId`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | writable con `flag`            | **Sale del pull.** La membresía vive en `lotItems`                                                          | Ya está marcado como flag: reasignar lote es una operación de app, no una celda                                                                                       |
| Bloque AQ–BE (14 campos: `pesoGr`, `costoLoteCOP`, `precioObjetivoCOP`, `caja*`, `subLote`, `productoUrl`, `carpetaFotosUrl`, `animaNotas`, `fuentes`, `notasConflictos`)                                                                                                                                                                                                                                                                                                         | 100% sheet-owned, solo bajan   | **Excepción temporal documentada.** Son columnas del SOT que la app nunca escribe                           | Varias son de la contabilidad de Vikinga. Su destino depende de la decisión abierta #4 (libros de Vikinga): si se congelan, estas columnas se migran una vez y mueren |
| Descriptivos (`nombre`, `peso`, `color`, `calidad`, `cantidad`, `talla`, `medidas`, `medidasValores`, `categoria`, `ubicacion`, `asesor`, `qr`, `coleccion`, `caja`, `asesorActual`, `estadoAsesor`, `procedencia`, `observacion`, `rendimientoEsperado`, `cantidadEstimada`, `nivelRareza`, `calificacion`, `tipoEsmeralda`, `subtipoForm`, `tipoJoya`, `tecnicaJoya`, `minerales`, `complementos`, `fotoUrl`, `certificadoUrl`, `formulaGema`, `formulaJoya`, `rangoDescuento`) | writable                       | **Salen del pull.** Todos tienen campo en la casilla de W2 o en el editor de ítem                           | Son datos de clasificación: nacen en la app                                                                                                                           |

### Ya excluidos (precedente a seguir)

- `mostrarEnCatalogo` — excluido el 2026-07-30 tras el incidente: Convex tenía
  416 piezas publicadas y la hoja decía 131; el siguiente sync habría ocultado
  285 piezas de la vitrina. La lección está escrita en el propio allowlist y es
  el argumento general de v4: **un pull masivo lee estado, no intención**, y no
  puede distinguir «alguien lo puso en FALSE a propósito» de «nunca se escribió».
- `preponderancia` — excluido por derivado.
- `totalCOP`, `comisionCOP` (sales) — excluidos por dinero derivado.
- `_sinUso2` — hueco posicional sin encabezado.

## La secuencia propuesta (NO ejecutada aquí)

1. Nada se toca mientras v3 sea la fuente. Cambiar el allowlist ahora rompería
   la operación viva.
2. En la Fase 2 (doble corrida), el reporte de excepciones del script de
   migración muestra cuántas filas dependen todavía de cada campo.
3. En el cutover (Fase 3), el pull de v3 se apaga entero — no se van quitando
   campos de a uno. Quitar campos sueltos deja el peor de los dos mundos: media
   hoja gobernando y media app, sin que nadie sepa cuál manda.
4. El bloque AQ–BE se migra una sola vez con la decisión #4 resuelta.

## Detección de deriva — implementada y probada

`convex/espejo.ts#reportarDeriva` compara el libro de PRUEBAS contra Convex por
cabecera nombrada y reporta cada celda que no coincide. No corrige nada, a
propósito: absorber la edición reintroduce el pull, y pisarla en silencio le hace
perder el trabajo a quien la hizo.

Probado el 2026-08-01 contra el libro real:

- Estado limpio → `derivas: 0`.
- Editando a mano `Lotes!E2` a `777777` → reporta
  `B-002 · costoCompraCOP · hoja: 777777 · Convex: 941022`.
- Tras re-empujar desde Convex → vuelve a `0`.

**El job encontró un defecto real durante su primera corrida:** publicar un lote
cambiaba el estado en Convex y dejaba la hoja diciendo `abierto`. No era una
edición humana: era el espejo quedándose viejo, porque `_publicar` no re-encolaba
la fila. Ya está corregido (`casillas.ts#encolarLote`). La regla general que deja:
**toda mutación que cambie un campo espejado tiene que re-encolar**, o el espejo
miente en silencio.
