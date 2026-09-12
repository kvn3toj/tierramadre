# Ingreso de los ítems remanentes — hoja "Inventario 12 Agosto"

Cuarta corrida sobre el SOT v3. Las tres anteriores ya aterrizaron; esta cierra la hoja
**"Inventario 12 Agosto"** (`1SsKJYwEpoA_pnzXkXF4pT6cs8e3Ycdoa46sXVm77YmA`, pestaña `Gemas`,
32 filas). De esas, **19 cruzan con el SOT y 13 no existen**.

- **Destino:** `1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U`, pestañas `Inventario`, `Lotes` y `Listas`.
- **Payload:** `scripts/.data/remanentes-12ago.json`
- **Estado del SOT al generar esto:** 532 ítems, itemId hasta **#541**, lotes hasta **C-089**.
- Reglas de siempre: dry-run por defecto, localizar por cabecera nombrada y por clave, backup en `scripts/.backups/`, `observacion` se **anexa**, no se escribe en J, la col Y no se toca desde la hoja.
- Script sugerido: `scripts/aplicar-remanentes-12ago.mjs`.

## Orden de ejecución — importa

### Paso 1 · Prerrequisito en `Listas`

Tres cortes del papel **no existen en el vocabulario**: **`Octogonal`, `Trapecio`, `Esfera`**.
Si se escriben antes de agregarlos, la validación de datos marca esas celdas en rojo. Agregarlos a
la columna de cortes de la pestaña `Listas` **antes** de tocar `Inventario`.

### Paso 2 · Crear el lote `C-090`

Las 11 gemas Verde Muzo (21,21 ct) no pertenecen a ningún lote existente. Se crea `C-090` siguiendo
el patrón de los lotes "Recuperado" que ya hay en la hoja (`C-070`, `C-074`): `estado: abierto`,
sin proveedor ni costo, con la nota explicando qué falta.

**Las 2 gemas Verde Chivor van a `C-070`**, no a `C-090`. La evidencia: las otras cinco Chivor del
mismo papel — #309, #310, #311, #312, #313 — son todas de `C-070` ("Intuición", 13 ítems). Es una
inferencia fuerte pero **confirmala** antes de aplicar.

### Paso 3 · Las 13 altas

itemId **#542 a #554**. Todas nacen `DISPONIBLE`, `cantidad 1`, `UBICACIÓN OFI.CALI`,
`preponderancia 0`, `mostrarEnCatalogo FALSE` y **sin `costoBaseCOP` ni `precioFinalCOP`** — la hoja
no trae la columna de costos llena. Vacío es un hecho, no un hueco: **no inventar un costo ni
sembrar un precio**. Quedan como no ofertables hasta costear, igual que los 30 disponibles sin
precio que ya existen.

| itemId | Nombre | ct | Medidas | Corte | Calidad | Color | Lote |
|---|---|---|---|---|---|---|---|
| 542 | Caja de Sueños | 1.42 | 6.8 × 6.6 mm | Cuadrada | F2 | Verde Chivor | C-070 |
| 543 | Cuarteto de Nos | 1.08 | 6.6 × 6.2 mm | Semicuadrada | F2 | Verde Chivor | C-070 |
| 544 | Viaje Estelar | 4.1 | 12.91 × 6.78 mm | Octogonal | F1 | Verde Muzo | C-090 |
| 545 | Sentir de la Montaña | 2.15 | 10.09 × 5.59 mm | Octogonal | F1 | Verde Muzo | C-090 |
| 546 | Planeta Verde | 3.87 | 13.41 × 6.46 mm | Octogonal | F1 | Verde Muzo | C-090 |
| 547 | Tiempo | 1.83 | 8.69 × 7.27 mm | Corazón | F2 | Verde Muzo | C-090 |
| 548 | Semilla | 2.2 | 7.99 × 7.49 mm | Cushion | F1 | Verde Muzo | C-090 |
| 549 | Luz de la Montaña | 2.29 | 9.86 × 5.54 mm | Octogonal | F1 | Verde Muzo | C-090 |
| 550 | Libertad | 1 | 6.78 × 5.44 mm | Octogonal | F1 | Verde Muzo | C-090 |
| 551 | Latido de la Tierra | 1.48 | 9.5 × 7 mm | Lágrima | F1 | Verde Muzo | C-090 |
| 552 | Corazón Valiente | 0.56 | 5.46 × 5.02 mm | Corazón | F2 | Verde Muzo | C-090 |
| 553 | Alma Ancestral | 0.84 | 8.37 × 5.72 mm | Trapecio | F1 | Verde Muzo | C-090 |
| 554 | Arrecife | 0.89 | 9.96 × 5.84 mm | Rectangular | F1 | Verde Muzo | C-090 |

Dos de estas — **#548 Semilla (2,20 ct)** y **#547 Tiempo (1,83 ct)** — ya están montadas en anillo
según la pestaña `Joyería` de la misma hoja. Por la **Regla B** (`precio = precio de la gema + costo
de joyería`, dictada el 2026-07-22) la gema tiene que existir **antes** que el anillo, así que este
paso las habilita. Los anillos **no** van en esta corrida.

### Paso 4 · Los 20 updates seguros

Filas donde la columna del SOT estaba vacía, o donde el cambio es menor a 0,05 ct.

| itemId | Nombre en SOT | Col | Campo | Valor actual | Valor nuevo |
|---|---|---|---|---|---|
| 248 | Reflejo del Alba | D | Peso (ct) | 0.70 | 0.68 |
| 248 | Reflejo del Alba | I | Medidas | (vacío) | 5.7 × 4.4 mm |
| 527 | Eco del Tiempo | D | Peso (ct) | 0.35 | 0.345 |
| 527 | Eco del Tiempo | E | Color | Verde Vívido | Verde Chivor |
| 265 | Taurus | H | Corte | Semicuadrada | Esmeralda |
| 350 | Órbita Lunar | D | Peso (ct) | 1.43 | 1.45 |
| 310 | Génesis | I | Medidas | (vacío) | 8.4 × 5.3 mm |
| 485 | Bosque Profundo | D | Peso (ct) | 0.74 | 0.76 |
| 485 | Bosque Profundo | E | Color | (vacío) | Verde Chivor |
| 492 | Lágrima | I | Medidas | (vacío) | 8.1 × 5.8 mm |
| 492 | Lágrima | E | Color | (vacío) | Verde Chivor |
| 492 | Lágrima | C | Nombre | Lágrima | Cariñito |
| 492 | Lágrima | AA | observacion | (vacío) | Nombre anterior: 492. Renombrado 12-ago-2026 desde la hoja " |
| 309 | Grandiosidad | D | Peso (ct) | 1.22 | 1.21 |
| 309 | Grandiosidad | I | Medidas | (vacío) | 9.6 × 6.2 mm |
| 313 | Espejo del alma | H | Corte | Esmeralda | Lágrima |
| 175 | L:A Hechizo Verde | D | Peso (ct) | 1.28 | 1.27 |
| 263 | Capricornio | D | Peso (ct) | 0.22 | 0.23 |
| 263 | Capricornio | I | Medidas | 3.7 × 3.7 mm | 3.8 × 3.8 mm |
| 80 | L:A-104 Grecia | D | Peso (ct) | 0.70 | 0.69 |

## ⚠️ Los 20 updates que NO van sin tu visto bueno

| itemId | Nombre en SOT | Col | Campo | Valor actual | Valor nuevo | Por qué |
|---|---|---|---|---|---|---|
| 248 | Reflejo del Alba | F | Calidad | COMERCIAL SÚPER FINA | FINA COMERCIAL | ⚠ cambia el factor de precio |
| 527 | Eco del Tiempo | I | Medidas | 4.9 x 3.5 x 2.7 mm | 5 × 3.5 mm | ⚠ REGRESIÓN — el SOT tiene 3 ejes, el papel 2 |
| 265 | Taurus | I | Medidas | 5.3 × 4.7 × 2.8 mm | 5.4 × 4.8 mm | ⚠ REGRESIÓN — el SOT tiene 3 ejes, el papel 2 |
| 350 | Órbita Lunar | I | Medidas | 6.9×9×3.8 mm | 9.2 × 7 mm | ⚠ REGRESIÓN — el SOT tiene 3 ejes, el papel 2 |
| 350 | Órbita Lunar | F | Calidad | F2 | F1 | ⚠ cambia el factor de precio |
| 310 | Génesis | D | Peso (ct) | 1.09 | 1.9 | ⚠ Δ grande 0.81 |
| 310 | Génesis | F | Calidad | FINA SUBLIME | F2 | ⚠ cambia el factor de precio |
| 485 | Bosque Profundo | I | Medidas | 7.7 x 5.0 x 3.6 | 7.7 × 5.1 mm | ⚠ REGRESIÓN — el SOT tiene 3 ejes, el papel 2 |
| 485 | Bosque Profundo | F | Calidad | F1 | F2 | ⚠ cambia el factor de precio |
| 492 | Lágrima | D | Peso (ct) | 0.00 | 1.12 | ⚠ Δ grande 1.12 |
| 492 | Lágrima | F | Calidad | (vacío) | F2 | ⚠ cambia el factor de precio |
| 309 | Grandiosidad | F | Calidad | FINA SUBLIME | F1 | ⚠ cambia el factor de precio |
| 312 | Esencial | I | Medidas | 8.6 × 5.1 × 3.5 mm | 8.7 × 5.2 mm | ⚠ REGRESIÓN — el SOT tiene 3 ejes, el papel 2 |
| 312 | Esencial | F | Calidad | FINA SUBLIME | F1 | ⚠ cambia el factor de precio |
| 313 | Espejo del alma | I | Medidas | 8.6 × 5.1 × 3.5 mm | 8.3 × 5.6 mm | ⚠ REGRESIÓN — el SOT tiene 3 ejes, el papel 2 |
| 313 | Espejo del alma | F | Calidad | FINA SUBLIME | F1 | ⚠ cambia el factor de precio |
| 175 | L:A Hechizo Verde | I | Medidas | 7.8 × 5.5 × 3.9 mm | 8.8 × 6.1 mm | ⚠ REGRESIÓN — el SOT tiene 3 ejes, el papel 2 |
| 175 | L:A Hechizo Verde | F | Calidad | COMERCIAL FINA | FINA | ⚠ cambia el factor de precio |
| 263 | Capricornio | F | Calidad | COMERCIAL SÚPER FINA | FINA ESENCIAL | ⚠ cambia el factor de precio |
| 80 | L:A-104 Grecia | F | Calidad | COMERCIAL SUPERIOR | COMERCIAL ESTÁNDAR | ⚠ cambia el factor de precio |

Tres razones distintas, y conviene no mezclarlas:

**Regresión de medidas (7 casos).** El SOT guarda tres ejes y el papel solo dos. Escribirlo
**pierde la profundidad**, que es justo el dato que costó recuperar en el fix de la columna I del
11-ago. Mi recomendación: no escribir ninguna de las 7, salvo que la discrepancia sea real y no
un redondeo — mirá `#350` (`6.9×9×3.8` vs `9.2 × 7`) y `#175` (`7.8 × 5.5` vs `8.8 × 6.1`), que
difieren de verdad.

**Cambios de calidad (11 casos).** El papel reclasifica con el vocabulario de claridad (F1/F2) donde
el SOT usa el comercial (FINA SUBLIME, COMERCIAL SÚPER FINA). No es ruido: `CALIDAD_FACTORS` cambia
y con él el precio sugerido. Confirmá que la reclasificación es deliberada.

**Dos saltos de peso grandes.** `#310 Génesis` 1,09 → 1,90 y `#492` 0,00 → 1,12. El de #492 es
esperable (estaba en cero); el de #310 no.

## ⛔ Las 6 filas bloqueadas — no las toques

| Fila | itemId | Motivo |
|---|---|---|
| 2 | 526 | peso imposible |
| 3 | 287 | peso imposible |
| 6 | 170 | match ambiguo |
| 12 | 311 | duplicado #311/#441 sin resolver |
| 13 | 73 | ítem VENDIDA |
| 32 | 446 | cant 3 vs 2 |

- **#526 y #287:** los pesos del papel (1,75 ct en 4 × 3 mm y 2,00 ct en 5,4 × 3 mm) son **físicamente imposibles** — 6,5× y 5,5× la densidad mediana calibrada con 119 piedras del propio inventario. Los del SOT (0,18 y 0,21) son los correctos.
- **#73 Ventana al Cielo** está VENDIDA y el papel le recaptura peso y calidad.
- **#311 / #441 "Vida":** dos filas idénticas (0,54 ct, Lágrima, Verde Chivor, F2) en lotes distintos. El papel trae **una sola piedra**, lo que confirma el doble registro que el vault sospecha desde el 24-jul. Hay que decidir cuál se retira antes de escribir.
- **#446 Esferas del Dragón:** sube de peso (21,27 → 22,02) pero baja de cantidad (3 → 2). Falta una cuenta.
- **Fila 6 "Gota del Amazonas":** el match es ambiguo entre `#170` (Gotas del Amazonas, cant 2, Verde Muzo) y `#13` (Amazonas, VENDIDA).

## Después de escribir

1. Sync: «🔄 Convex Sync → Sincronizar todo (completo)». El `onEdit` no dispara por API.
2. Verificar leyendo la hoja de vuelta, localizando por cabecera nombrada.
3. Confirmar `inventoryStats.total` = **545** (532 + 13) y que `C-090` existe en `Lotes`.
4. Las 13 nuevas quedan sin costo: **no deben aparecer como ofertables**.

## Qué me devolvés

Dry-run con el diff completo, las 13 altas listadas, los 20 updates dudosos separados de los
20 seguros, y las 6 filas bloqueadas con su motivo. **No corras `--apply`** sin que yo
confirme, en particular el lote de las dos Chivor y la reclasificación de calidades.
