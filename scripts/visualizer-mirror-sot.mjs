/**
 * Espejo local de fotos de producto, resolviendo la carpeta como manda el SOT.
 * ---------------------------------------------------------------------------
 * Hermano de `visualizer-mirror-fotos.mjs`. La diferencia es de dónde sale la
 * carpeta de cada item, y no es un detalle: hay DOS árboles de fotos en Drive y
 * apuntan a sitios distintos.
 *
 *   products/<item> - <nombre>/            ← lo que resuelve la API de prod
 *   products/fotosintesis/<LOTE>/<item>/   ← donde están las fotos de verdad
 *
 * El primero lo crea `api/create-product-folders.js` y para casi todo el rango
 * 318-524 está VACÍO: se creó el andamiaje y nunca se subió nada ahí. El
 * segundo lo llena el flujo de Fotosíntesis, agrupando por lote de compra
 * (C-042, LC-07…) en vez de por número de item.
 *
 * La columna **BB "Carpeta fotos (Drive)"** de `Inventario` en el SOT v3 es la
 * que dice cuál es la carpeta buena de cada producto. Está poblada en las 513
 * filas. Este script la usa como fuente de verdad.
 *
 * Por qué el otro script no ve estas fotos: va por `/api/get-drive-images`, que
 * resuelve con `getProductFolderById` → `products/<item> - <nombre>`, o sea el
 * árbol vacío. Y `get-treasure-sheets` lee `A:AP`, así que corta ANTES de BB
 * (columna 54) y la URL buena nunca llega al front. Los dos son bugs vivos, no
 * sólo un problema de este mirror: el detalle de producto del catálogo tampoco
 * encuentra estas fotos.
 *
 * Requiere GOOGLE_SERVICE_ACCOUNT_KEY en .env/.env.local — lee Sheets y baja de
 * Drive directo, sin pasar por el proxy de prod.
 *
 * Salida idéntica a la del otro mirror, para que el resto del pipeline no note
 * la diferencia:
 *   docs/Visualizer/work/<item>/fotos/<archivo>
 *   docs/Visualizer/work/<item>/fotos/index.json
 *
 * Uso:
 *   node scripts/visualizer-mirror-sot.mjs [--items 472,477] [--desde 318]
 *                                          [--dry-run] [--force]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from 'google-auth-library';
import { drive_v3 } from '@googleapis/drive';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { sniffImageExt, transcodeHeicInPlace } from './lib/image.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const WORK_DIR = path.join(REPO_ROOT, 'docs', 'Visualizer', 'work');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const COL_BB = 53; // "Carpeta fotos (Drive)" — 0-indexado

config({ path: path.join(REPO_ROOT, '.env.local'), quiet: true });
config({ path: path.join(REPO_ROOT, '.env'), quiet: true });

const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i > -1 ? process.argv[i + 1] : null;
};
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const SOLO = arg('--items')?.split(',').map(Number).filter(Boolean) ?? null;
const DESDE = Number(arg('--desde') ?? 0);

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) {
  console.error('\n✖ Falta GOOGLE_SERVICE_ACCOUNT_KEY en .env / .env.local\n');
  process.exit(1);
}
const raw = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const auth = new GoogleAuth({
  credentials: JSON.parse(raw),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
});
const sheets = new sheets_v4.Sheets({ auth });
const drive = new drive_v3.Drive({ auth });

// ── 1. Leer la columna BB del SOT ────────────────────────────────────────────
const resp = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: 'Inventario!A:BZ',
});
const filas = resp.data.values || [];
const cabecera = filas[0] || [];
if (!/carpeta/i.test(String(cabecera[COL_BB] ?? ''))) {
  // Si alguien inserta una columna, esto se va a otro lado sin avisar.
  console.error(
    `\n✖ BB no es la carpeta de fotos, es ${JSON.stringify(cabecera[COL_BB])}.` +
      ` Revisá el orden de columnas del SOT antes de seguir.\n`,
  );
  process.exit(1);
}

const idDeUrl = (u) => (/folders\/([\w-]+)/.exec(String(u)) || [])[1] || null;
let productos = filas
  .slice(1)
  .map((f) => ({ item: Number(f[0]), folderId: idDeUrl(f[COL_BB]) }))
  .filter((p) => p.item && p.folderId);
if (SOLO) productos = productos.filter((p) => SOLO.includes(p.item));
if (DESDE) productos = productos.filter((p) => p.item >= DESDE);

console.log(`\n→ SOT v3 · columna BB "${cabecera[COL_BB]}"`);
console.log(`→ ${productos.length} productos con carpeta declarada\n`);

// ── 2. Bajar ─────────────────────────────────────────────────────────────────
let bajadas = 0,
  yaEstaban = 0,
  vacias = 0,
  videos = 0,
  rotos = 0;

for (const { item, folderId } of productos) {
  const destino = path.join(WORK_DIR, String(item), 'fotos');
  let archivos = [];
  try {
    const r = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,size)',
      pageSize: 200,
      orderBy: 'name',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    archivos = r.data.files || [];
  } catch (e) {
    console.log(
      `  ${String(item).padEnd(5)} ✖ ${String(e.message).slice(0, 60)}`,
    );
    rotos++;
    continue;
  }

  const imgs = archivos.filter((f) => f.mimeType?.startsWith('image/'));
  const vids = archivos.filter((f) => f.mimeType?.startsWith('video/'));
  videos += vids.length;
  if (!imgs.length) {
    vacias++;
    continue;
  }

  const index = {
    item,
    folderId,
    syncedAt: new Date().toISOString(),
    source: 'SOT v3 · Inventario!BB',
    images: [],
    broken: [],
    skipped: vids.map((v) => ({
      fileId: v.id,
      driveName: v.name,
      mimeType: v.mimeType,
      reason: 'video',
    })),
  };

  if (!DRY) fs.mkdirSync(destino, { recursive: true });

  for (const f of imgs) {
    // Un archivo roto no puede matar los que vienen detrás: se anota y sigue.
    if (Number(f.size) === 0) {
      index.broken.push({
        fileId: f.id,
        driveName: f.name,
        bytes: 0,
        reason: 'archivo vacío en Drive',
      });
      continue;
    }
    const base = f.name.replace(/\.[^.]+$/, '');
    const yaHay = fs.existsSync(destino)
      ? fs.readdirSync(destino).find((x) => x.startsWith(base + '.'))
      : null;
    if (yaHay && !FORCE) {
      index.images.push({
        fileId: f.id,
        driveName: f.name,
        file: yaHay,
        mimeType: f.mimeType,
      });
      yaEstaban++;
      continue;
    }
    if (DRY) {
      index.images.push({
        fileId: f.id,
        driveName: f.name,
        file: base + '.jpg',
        mimeType: f.mimeType,
      });
      bajadas++;
      continue;
    }
    try {
      const bin = await drive.files.get(
        { fileId: f.id, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' },
      );
      const buf = Buffer.from(bin.data);
      // El nombre en Drive miente seguido (.HEIC que ya viene JPEG, y al revés),
      // así que la extensión sale del contenido. `sniffImageExt` lee de disco,
      // no de memoria: se escribe a un temporal y recién ahí se bautiza.
      const tmp = path.join(destino, `.${base}.parcial`);
      fs.writeFileSync(tmp, buf);
      const ext = sniffImageExt(tmp) || 'jpg';
      let nombre = `${base}.${ext}`;
      fs.renameSync(tmp, path.join(destino, nombre));
      if (ext === 'heic') {
        // Convierte sobre el mismo path y devuelve true, no la ruta nueva: el
        // archivo queda con contenido JPEG y nombre .heic, así que hay que
        // rebautizarlo o cualquiera que confíe en la extensión se rompe.
        transcodeHeicInPlace(path.join(destino, nombre));
        const jpg = `${base}.jpg`;
        fs.renameSync(path.join(destino, nombre), path.join(destino, jpg));
        nombre = jpg;
      }
      index.images.push({
        fileId: f.id,
        driveName: f.name,
        file: nombre,
        mimeType: f.mimeType,
      });
      bajadas++;
    } catch (e) {
      index.broken.push({
        fileId: f.id,
        driveName: f.name,
        reason: String(e.message).slice(0, 80),
      });
      rotos++;
    }
  }

  if (!DRY)
    fs.writeFileSync(
      path.join(destino, 'index.json'),
      JSON.stringify(index, null, 2) + '\n',
    );
  console.log(
    `  ${String(item).padEnd(5)} ${String(index.images.length).padStart(2)} img` +
      (index.skipped.length ? ` · ${index.skipped.length} video` : '') +
      (index.broken.length ? ` · ${index.broken.length} roto` : ''),
  );
}

console.log(
  `\n${bajadas} bajadas · ${yaEstaban} ya estaban · ${videos} videos omitidos · ` +
    `${vacias} sin foto · ${rotos} con error`,
);
console.log(`\nDestino: docs/Visualizer/work/<item>/fotos/`);
if (DRY) console.log('(dry-run: no se escribió nada)');
