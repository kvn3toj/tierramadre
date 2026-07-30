/**
 * Mide qué tan grande salió la piedra en un render, para poder elegir entre
 * varias variantes sin mirarlas una por una.
 *
 * El modelo agranda la gema: nunca la hemos visto salir más pequeña de lo real,
 * siempre más grande, y con mucha varianza entre corridas del mismo prompt. Con
 * 3 variantes por slot hace falta un criterio barato y repetible para quedarse
 * con la mejor, y "cuántos píxeles verdes ocupa la piedra" lo resuelve: la gema
 * es lo único verde en un encuadre de piel, metal y fondo neutro.
 *
 * Devuelve el ancho del bounding box del verde como fracción del ancho de la
 * imagen. No es una medida en mm — es comparable sólo entre variantes del mismo
 * slot, que es justo para lo que se usa.
 *
 * Uso:
 *   node scripts/visualizer-medir-escala.mjs <img1> <img2> ...
 *   node scripts/visualizer-medir-escala.mjs --json <img1> ...
 */

import fs from 'fs';
import sharp from 'sharp';

const SAMPLE_W = 320; // suficiente para el bbox y ~10x más rápido que el original

/**
 * ¿Es un píxel de esmeralda? Verde dominante sobre los otros dos canales y con
 * algo de fuerza. La piel tira a rojo/naranja y el oro a amarillo (r≈g), así
 * que exigir g claramente por encima de r los descarta a ambos.
 */
function esVerde(r, g, b) {
  return g > r * 1.12 && g > b * 1.06 && g > 55;
}

export async function medirEscala(absPath) {
  const { data, info } = await sharp(absPath)
    .resize({ width: SAMPLE_W })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let minX = width,
    maxX = -1,
    minY = height,
    maxY = -1,
    count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (!esVerde(data[i], data[i + 1], data[i + 2])) continue;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return { found: false, widthFrac: 0, areaFrac: 0 };

  const stoneW = maxX - minX + 1;

  // Lo natural sería medir contra el ancho del dedo, que es como está escrito
  // el objetivo en el prompt. Se intentó — recorrer la piel a izquierda y
  // derecha desde la fila central de la piedra — y no sirve: el recorrido se
  // corta en el aro, en las sombras entre dedos y en los reflejos del metal.
  // Sobre cuatro renders de la misma piedra dio 13/17/15/n-d, sin relación con
  // el tamaño real. Queda la fracción contra el frame, que sí ordenó bien esos
  // mismos cuatro. Es un proxy y sólo vale COMPARANDO VARIANTES DEL MISMO SLOT,
  // donde el encuadre lo fija el mismo prompt de escena.
  return {
    found: true,
    widthFrac: stoneW / width,
    heightFrac: (maxY - minY + 1) / height,
    // Sirve para descartar variantes rotas (piedra tapada o ausente), no para
    // ordenar por tamaño: depende de cuánta mesa pálida tenga la piedra.
    areaFrac: count / (width * height),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const asJson = process.argv.includes('--json');
  const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const out = [];
  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.error(`  ! no existe: ${f}`);
      continue;
    }
    const m = await medirEscala(f);
    out.push({ file: f, ...m });
    if (!asJson) {
      console.log(
        `${f.split('/').pop().padEnd(34)} ancho=${(m.widthFrac * 100).toFixed(1).padStart(5)}%  ` +
          `área=${(m.areaFrac * 100).toFixed(2)}%`,
      );
    }
  }
  if (asJson) console.log(JSON.stringify(out, null, 2));
}
