/**
 * Open Graph Meta Tags Generator for Product Sharing
 *
 * When social media crawlers (Facebook, WhatsApp, Twitter, etc.) access a
 * product URL, Vercel rewrites route them here. The endpoint returns HTML
 * with proper OG meta tags so the product image appears in link previews
 * instead of the generic site logo.
 *
 * Regular users are never routed here (vercel.json `has` condition filters
 * by crawler User-Agent), but as a safety net the page includes a
 * <meta http-equiv="refresh"> redirect to the SPA.
 */

import {
  withApiHandler,
  SPREADSHEET_ID,
  CACHE,
  getSheetNames,
  findSheetByPattern,
  normalizeHeader,
  getProductsFolderId,
  getProductFolderById,
  getFirstImageOrVideoThumbnail,
  getProxyUrl,
} from './_lib/index.js';

const BASE_URL = process.env.APP_URL || 'https://tierramadre.app';

/**
 * Fetch a single product row from the Inventario sheet
 */
async function getProduct(sheets, itemNumber) {
  const sheetNames = await getSheetNames(sheets);
  const targetSheet =
    findSheetByPattern(sheetNames, ['inventario', 'inventory']) || sheetNames[0];

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${targetSheet}!A:Z`,
  });

  const rows = data.values;
  if (!rows || rows.length < 2) return null;

  const headers = rows[0].map(normalizeHeader);
  const col = (name) => headers.indexOf(name);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const item = parseInt(row[col('item')] || row[0] || '0');
    if (item === parseInt(itemNumber)) {
      return {
        item,
        nombre: row[col('nombre')] || row[2] || '',
        peso: row[col('peso (ct)')] || row[3] || '',
        color: row[col('color')] || row[4] || '',
        calidad: row[col('calidad')] || row[5] || '',
        estado: (row[col('estado')] || row[14] || 'DISPONIBLE').toUpperCase(),
      };
    }
  }
  return null;
}

/**
 * Get the proxy URL for the first image in the product's Drive folder
 */
async function getProductImageUrl(drive, sharedDriveId, itemNumber) {
  try {
    const productsFolderId = await getProductsFolderId(drive, sharedDriveId);
    const folderId = await getProductFolderById(drive, productsFolderId, String(itemNumber));
    if (!folderId) return null;

    const result = await getFirstImageOrVideoThumbnail(drive, folderId);
    if (!result) return null;

    // Use 'medium' size (800px) for a good-quality OG image
    const proxyPath = getProxyUrl(result.file.id, result.isVideo, 'medium');
    return `${BASE_URL}${proxyPath}`;
  } catch (err) {
    console.warn('OG: could not fetch product image:', err.message);
    return null;
  }
}

function displayName(nombre) {
  return nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
}

function buildHTML(product, imageUrl) {
  const name = displayName(product.nombre);
  const url = `${BASE_URL}/product/${product.item}`;
  const fallback = `${BASE_URL}/icon-inicio-gris-512.png`;
  const ogImage = imageUrl || fallback;

  const desc = [product.calidad, product.color].filter(Boolean).join(' · ')
    + (product.peso ? ` | ${product.peso} ct` : '')
    + ' | Colombian Emeralds — Tierra Madre';

  const title = `${name} — Tierra Madre Studio`;

  // Escape for safe HTML embedding
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<meta property="og:type" content="product">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="800">
<meta property="og:image:height" content="800">
<meta property="og:image:alt" content="${esc(name)}">
<meta property="og:site_name" content="Tierra Madre Studio">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<meta http-equiv="refresh" content="0;url=${esc(url)}">
</head>
<body style="margin:0;background:#000;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh">
<a href="${esc(url)}" style="color:#00C992;font-size:1.2rem">${esc(name)} — Ver producto</a>
</body>
</html>`;
}

export default withApiHandler(async (req, res, { sheets, drive, sharedDriveId }) => {
  const { itemNumber } = req.query;

  if (!itemNumber) {
    res.writeHead(302, { Location: BASE_URL });
    return res.end();
  }

  // Fetch product data and thumbnail in parallel
  const [product, imageUrl] = await Promise.all([
    getProduct(sheets, itemNumber),
    getProductImageUrl(drive, sharedDriveId, itemNumber),
  ]);

  if (!product) {
    res.writeHead(302, { Location: `${BASE_URL}/treasure` });
    return res.end();
  }

  const html = buildHTML(product, imageUrl);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}, {
  methods: ['GET', 'OPTIONS'],
  cache: CACHE.MEDIUM,
  provideSheets: true,
  provideDrive: true,
  requireDriveId: true,
  errorPrefix: 'OGProduct',
});
