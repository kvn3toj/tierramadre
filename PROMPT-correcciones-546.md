# #546 Planeta Verde — correcciones desde el certificado 025893

Quinta corrida sobre el SOT v3. Es chica — **un solo ítem, 6 celdas** — pero una de ellas cambia
la categoría comercial de la piedra.

- **Hoja:** `1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U`, pestaña `Inventario` (gid `1819792669`).
- **Payload:** `scripts/.data/correcciones-546.json`
- **Fuente:** certificado de laboratorio **nº 025893**, 6-dic-2024, aportado por el dueño el 23-ago-2026.
- Reglas de siempre: dry-run por defecto, localizar por cabecera nombrada y por `itemId`, backup en `scripts/.backups/`, `observacion` se **anexa**, no se escribe en J, la col Y no se toca desde la hoja.
- Script sugerido: `scripts/aplicar-correcciones-546.mjs`.

## El hallazgo

El certificado dice **"Sin indicaciones de embellecimiento de claridad / No indications of clarity
enhancement"**. Eso es **NO OIL** — el tope de `CALIDADES`. El SOT la tiene como **F1**, que implica
tratamiento leve. No es un matiz de vocabulario: es la diferencia entre una piedra aceitada y una que
nunca se aceitó, que es justo lo que un comprador informado paga por encima de todo lo demás.

Dos correcciones más del mismo certificado. El **color es "Verde Vívido"**, no "Verde Muzo" — y en
Origen el certificado solo pone **"Colombia"**, sin atribuir mina. (Compárese con el cert. 028619 de
`#484 Magia`, que sí dice explícitamente "características gemológicas de la formación Muzo".) Y la
**forma es "Esmeralda / Emerald"**, no "Octogonal".

Las **medidas** del SOT estaban incompletas: `13.41 × 6.46 mm`, dos ejes, invertidos respecto al
certificado y sin profundidad. Con los tres ejes reales — 13,40 × 6,47 × 5,48 — el peso calculado da
**3,88 ct contra 3,87 declarados, 100% de ajuste**. La ficha ahora se valida sola.

## Los 6 updates

| # | Col | Campo | Valor actual | Valor nuevo | Modo |
|---|---|---|---|---|---|
| 1 | F | Calidad | F1 | NO OIL | replace |
| 2 | E | Color | Verde Muzo | Verde Vívido | replace |
| 3 | I | Medidas | 13.41 × 6.46 mm | 13.40 × 6.47 × 5.48 mm | replace |
| 4 | H | Corte | Octogonal | Esmeralda | replace |
| 5 | AA | observacion | Alta 12-ago-2026 desde la hoja "Inventar […] | Certificado 025893 (6-dic-2024) leído 23-ago-2026: SIN indic […ver payload] | append |
| 6 | AM | certificadoUrl | (vacío) | <URL_DRIVE_CERT_025893> | replace |

La última está **bloqueada**: hay que subir el PDF del certificado a Drive y poner el enlace real en
lugar del placeholder. **No apliques esa celda con el texto `<URL_DRIVE_CERT_025893>`.** Sin
certificado enlazado no se sostiene un precio de US$14.849/ct frente a un comprador — y 368 de los
545 ítems ya tienen `certificadoUrl`, así que este es la excepción, no la norma.

## Lo que NO se toca

| Campo | Valor | Por qué |
|---|---|---|
| costoBaseCOP | 38.926.022 | VERIFICADO: $38.926.022 ÷ 3,87 ct = $10.058.404/ct exacto, igual a lo declarado en la observación. No se toca. |
| precioFinalCOP | 175.167.099 | Queda como está. Pasar de F1 a NO OIL sube la banda de mercado (la referencia dice que "no oil" cotiza 60–100% sobre "minor oil"), pero subir el precio es decisión comercial, no una corrección de dato. Ver Pendiente 3. |

El costo quedó **verificado**: $38.926.022 ÷ 3,87 ct = **$10.058.404/ct exacto**, idéntico a lo que
declara la observación del ítem. Y el "report 025893" que esa observación ya citaba **es este
certificado** — la trazabilidad cierra sola.

## Pendientes — dejalos en el output, no los resuelvas

| # | Tema | Detalle |
|---|---|---|
| 1 | "Octogonal" vs "Esmeralda" en las otras 5 | #544, #545, #549, #550 declaran corte Octogonal igual que #546. Si sus certificados también dicen "Esmeralda", hay que unificar — y entonces `Octogonal`, que agregamos a Listas el 12-ago, sobra y bifurca el vocabulario. |
| 2 | Las 11 de C-090 dicen "Verde Muzo" sin respaldo | El único certificado que tenemos (el de #546) no atribuye mina. Si los otros diez tampoco, llamarlas Muzo en el catálogo es una afirmación de origen que ningún laboratorio respaldó. En esmeraldas eso es delicado comercialmente. |
| 3 | Revisar el multiplicador de precio para NO OIL | CALIDAD_FACTORS solo premia +15% al pasar de F1 (1,00) a NO OIL (1,15), y el propio código lo marca como "seeded defaults, not blessed numbers". El mercado premia 60–100%. Con el precio actual de US$14.849/ct la piedra queda conservadora; la banda defendible sería $280M–$350M. |
| 4 | Las 11 fichas tienen solo 2 ejes y ningún certificadoUrl | Todas se cargaron desde la hoja del 12-ago, que traía largo × ancho. Los certificados tienen los 3 ejes. Hay que recuperar profundidad y enlazar certificado en las 11. |
| 5 | Desvíos de tarifa ya detectados en C-090 | #544 +0,24%, #549 +0,87%, #553 −2,33% respecto de las dos tarifas del lote ($10.058.404/ct y $3.723.563/ct). #548 y #552 siguen en costo 0. Y C-090 tiene costoTotalCOP = 0 en Lotes mientras sus ítems suman $147.616.861. |

El pendiente 1 tiene una ironía que vale mirar: agregamos `Octogonal` a la pestaña `Listas` el 12-ago
para poder cargar estas piedras, y resulta que **`Esmeralda` ya existía y era el término correcto**.
Si los certificados de #544, #545, #549 y #550 también dicen "Esmeralda", `Octogonal` sobra.

## Después de escribir

1. Sync: «🔄 Convex Sync → Sincronizar todo (completo)». El `onEdit` no dispara por API.
2. Verificar leyendo la hoja de vuelta, localizando por cabecera nombrada.
3. Confirmar que `#546` quedó en `NO OIL` y que `costoBaseCOP` y `precioFinalCOP` siguen intactos.

## Qué me devolvés

Dry-run con las 6 celdas, el aviso de que `certificadoUrl` quedó bloqueada esperando la URL real, y
los 5 pendientes. No corras `--apply` sin que yo lo confirme.
