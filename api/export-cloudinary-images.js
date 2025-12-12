/**
 * Vercel Serverless Function - Export Cloudinary Images List
 *
 * Generates a downloadable list of all product images with proper labels.
 * Can be used to manually import into Google Drive or other systems.
 *
 * GET /api/export-cloudinary-images - JSON format
 * GET /api/export-cloudinary-images?format=csv - CSV format
 * GET /api/export-cloudinary-images?format=html - HTML gallery with download links
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dyam6g2os',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Get all product images from Cloudinary
 */
async function getAllCloudinaryImages() {
  const allImages = [];
  let nextCursor = null;

  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'tierramadre/product-',
      max_results: 500,
      next_cursor: nextCursor,
    });

    allImages.push(...result.resources);
    nextCursor = result.next_cursor;
  } while (nextCursor);

  // Group by product and sort
  const productImages = {};
  for (const image of allImages) {
    const match = image.public_id.match(/tierramadre\/product-(\d+)\//);
    if (match) {
      const itemNumber = parseInt(match[1]);
      if (!productImages[itemNumber]) {
        productImages[itemNumber] = [];
      }
      productImages[itemNumber].push({
        url: image.secure_url,
        publicId: image.public_id,
        format: image.format,
        width: image.width,
        height: image.height,
        bytes: image.bytes,
        createdAt: image.created_at,
      });
    }
  }

  // Sort by item number
  const sortedItems = Object.keys(productImages)
    .map(Number)
    .sort((a, b) => a - b);

  return { productImages, sortedItems };
}

/**
 * Generate CSV content
 */
function generateCSV(productImages, sortedItems) {
  const lines = ['Item Number,Image Index,Suggested Filename,URL,Format,Dimensions,Size (KB),Created'];

  for (const itemNumber of sortedItems) {
    const images = productImages[itemNumber];
    images.forEach((img, idx) => {
      const fileName = `product-${itemNumber}-${String(idx + 1).padStart(2, '0')}.${img.format}`;
      const sizeKB = Math.round(img.bytes / 1024);
      lines.push(`${itemNumber},${idx + 1},${fileName},"${img.url}",${img.format},${img.width}x${img.height},${sizeKB},${img.createdAt}`);
    });
  }

  return lines.join('\n');
}

/**
 * Generate HTML gallery
 */
function generateHTML(productImages, sortedItems) {
  const totalImages = sortedItems.reduce((sum, item) => sum + productImages[item].length, 0);

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tierra Madre - Image Export</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    h1 { color: #065f46; margin-bottom: 10px; }
    .stats { color: #666; margin-bottom: 30px; }
    .instructions { background: #e0f2fe; border-radius: 8px; padding: 15px; margin-bottom: 30px; }
    .instructions h3 { color: #0369a1; margin-bottom: 10px; }
    .instructions ol { margin-left: 20px; }
    .instructions li { margin: 5px 0; }
    .product { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .product h2 { color: #065f46; font-size: 1.2rem; margin-bottom: 15px; border-bottom: 2px solid #d1fae5; padding-bottom: 10px; }
    .images { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
    .image-card { background: #f9fafb; border-radius: 8px; overflow: hidden; }
    .image-card img { width: 100%; height: 150px; object-fit: cover; }
    .image-info { padding: 10px; }
    .image-info .filename { font-weight: 600; color: #1f2937; font-size: 0.9rem; word-break: break-all; }
    .image-info .meta { color: #6b7280; font-size: 0.75rem; margin-top: 4px; }
    .image-info a { display: inline-block; margin-top: 8px; background: #065f46; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; }
    .image-info a:hover { background: #047857; }
    .download-all { position: fixed; bottom: 20px; right: 20px; background: #065f46; color: white; padding: 15px 25px; border-radius: 30px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .download-all:hover { background: #047857; }
  </style>
</head>
<body>
  <h1>🌿 Tierra Madre - Image Export</h1>
  <p class="stats">${sortedItems.length} products • ${totalImages} images</p>

  <div class="instructions">
    <h3>📥 How to Download to Google Drive</h3>
    <ol>
      <li>Right-click on an image → "Save image as..." → Use the suggested filename</li>
      <li>Or click "Download" under each image</li>
      <li>Upload saved images to your Google Drive folder</li>
      <li>Images are named: <code>product-{item}-{index}.jpg</code></li>
    </ol>
  </div>
`;

  for (const itemNumber of sortedItems) {
    const images = productImages[itemNumber];
    html += `
  <div class="product">
    <h2>Product #${itemNumber} (${images.length} image${images.length > 1 ? 's' : ''})</h2>
    <div class="images">`;

    images.forEach((img, idx) => {
      const fileName = `product-${itemNumber}-${String(idx + 1).padStart(2, '0')}.${img.format}`;
      const sizeKB = Math.round(img.bytes / 1024);
      html += `
      <div class="image-card">
        <img src="${img.url}" alt="${fileName}" loading="lazy">
        <div class="image-info">
          <div class="filename">${fileName}</div>
          <div class="meta">${img.width}×${img.height} • ${sizeKB}KB</div>
          <a href="${img.url}" download="${fileName}">Download</a>
        </div>
      </div>`;
    });

    html += `
    </div>
  </div>`;
  }

  html += `
  <a href="/api/export-cloudinary-images?format=csv" class="download-all">📄 Download CSV List</a>
</body>
</html>`;

  return html;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { format = 'json' } = req.query;
    const { productImages, sortedItems } = await getAllCloudinaryImages();
    const totalImages = sortedItems.reduce((sum, item) => sum + productImages[item].length, 0);

    // CSV format
    if (format === 'csv') {
      const csv = generateCSV(productImages, sortedItems);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="tierramadre-images.csv"');
      return res.status(200).send(csv);
    }

    // HTML gallery format
    if (format === 'html') {
      const html = generateHTML(productImages, sortedItems);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    }

    // JSON format (default)
    const images = [];
    for (const itemNumber of sortedItems) {
      const productImgs = productImages[itemNumber];
      productImgs.forEach((img, idx) => {
        images.push({
          itemNumber,
          imageIndex: idx + 1,
          suggestedFilename: `product-${itemNumber}-${String(idx + 1).padStart(2, '0')}.${img.format}`,
          url: img.url,
          format: img.format,
          width: img.width,
          height: img.height,
          sizeKB: Math.round(img.bytes / 1024),
          createdAt: img.createdAt,
        });
      });
    }

    return res.status(200).json({
      success: true,
      summary: {
        totalProducts: sortedItems.length,
        totalImages,
      },
      images,
      downloadLinks: {
        csv: '/api/export-cloudinary-images?format=csv',
        html: '/api/export-cloudinary-images?format=html',
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({
      error: 'Export failed',
      message: error.message,
    });
  }
}
