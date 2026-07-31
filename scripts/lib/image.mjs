/**
 * Utilidades de imagen para los scripts que bajan fotos de producto desde Drive:
 * detectar el formato real de un archivo y convertir HEIC a JPEG.
 *
 * Casi todas las fotos de las esmeraldas se toman con iPhone y llegan a Drive
 * como HEIC. `serve-drive-image` normalmente devuelve un JPEG (mete en su lugar
 * la miniatura que genera Drive), pero ese fallback depende de que Drive haya
 * generado el `thumbnailLink` — cuando no lo hizo, el proxy deja pasar el HEIF
 * crudo y sharp, compilado sin el plugin HEIF, revienta con `bad seek`.
 *
 * `sips` viene con macOS y decodifica HEIC de forma nativa, así que rescata esos
 * bytes. Solo transcodifica: sin resize y sin tocar los píxeles más allá del
 * encode JPEG, porque estos archivos son la verdad de campo para la lectura
 * visual de cada piedra.
 */

import fs from 'fs';
import { execFileSync } from 'child_process';

/** Los primeros bytes del archivo, para identificar el formato real. */
function readHead(absPath, n = 16) {
  const fd = fs.openSync(absPath, 'r');
  const head = Buffer.alloc(n);
  const read = fs.readSync(fd, head, 0, n, 0);
  fs.closeSync(fd);
  return read < n ? head.slice(0, read) : head;
}

/**
 * Extensión según el contenido real, no según el nombre.
 *
 * Hace falta porque `serve-drive-image` convierte los HEIC a JPEG al vuelo pero
 * el archivo en Drive sigue llamándose `IMG_1234.HEIC`: guardarlo con ese nombre
 * deja un JPEG con extensión mentirosa, y cualquier consumidor local que confíe
 * en la extensión se rompe.
 *
 * @param {string} absPath
 * @returns {'jpg'|'png'|'webp'|'gif'|'heic'|null} null si no se reconoce
 */
export function sniffImageExt(absPath) {
  const h = readHead(absPath);
  if (h.length < 12) return null;

  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return 'jpg';
  if (
    h
      .slice(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'png';
  if (
    h.slice(0, 4).toString('latin1') === 'RIFF' &&
    h.slice(8, 12).toString('latin1') === 'WEBP'
  )
    return 'webp';
  if (h.slice(0, 3).toString('latin1') === 'GIF') return 'gif';
  if (isHeic(absPath)) return 'heic';
  return null;
}

/**
 * ¿Los primeros bytes son ISO-BMFF con marca HEIF/HEIC?
 * @param {string} absPath
 * @returns {boolean}
 */
export function isHeic(absPath) {
  const head = readHead(absPath, 12);
  if (head.length < 12) return false;

  // bytes 4-8 son 'ftyp', 8-12 la marca: heic/heix/heif/mif1/msf1.
  return (
    head.slice(4, 8).toString('latin1') === 'ftyp' &&
    /^(heic|heix|heif|hevc|mif1|msf1)$/.test(
      head.slice(8, 12).toString('latin1'),
    )
  );
}

/**
 * Convierte el archivo a JPEG en su mismo path si es HEIC. No-op si no lo es.
 *
 * @param {string} absPath
 * @returns {boolean} true si convirtió
 */
export function transcodeHeicInPlace(absPath) {
  if (!isHeic(absPath)) return false;

  const tmpPath = `${absPath}.heic`;
  fs.renameSync(absPath, tmpPath);
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', tmpPath, '--out', absPath], {
      stdio: 'ignore',
    });
  } catch (err) {
    fs.renameSync(tmpPath, absPath); // devolver el original antes de fallar
    throw new Error(
      `la foto es HEIC y sips no pudo convertirla (${absPath}): ${err.message}`,
    );
  }
  fs.unlinkSync(tmpPath);
  return true;
}
