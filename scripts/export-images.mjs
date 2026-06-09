#!/usr/bin/env node

/**
 * Export Cloudinary Images to CSV/HTML
 *
 * Run locally to generate export files that can be used to
 * manually upload images to Google Drive with proper naming.
 *
 * Usage:
 *   node scripts/export-images.mjs           # Generates JSON summary
 *   node scripts/export-images.mjs --csv     # Generates CSV file
 *   node scripts/export-images.mjs --html    # Generates HTML gallery
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fetch from production API
async function fetchCloudinaryImages() {
  const response = await fetch('https://tierramadre.app/api/check-cloudinary-images');
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// Generate CSV content
function generateCSV(productsByItem) {
  const lines = ['Item Number,Image Index,Suggested Filename,URL,Format'];

  const sortedItems = Object.keys(productsByItem)
    .map(Number)
    .sort((a, b) => a - b);

  for (const itemNumber of sortedItems) {
    const images = productsByItem[itemNumber];
    images.forEach((img, idx) => {
      const fileName = `product-${itemNumber}-${String(idx + 1).padStart(2, '0')}.${img.format}`;
      lines.push(`${itemNumber},${idx + 1},${fileName},"${img.url}",${img.format}`);
    });
  }

  return lines.join('\n');
}

// Generate HTML gallery
function generateHTML(productsByItem, summary) {
  const sortedItems = Object.keys(productsByItem)
    .map(Number)
    .sort((a, b) => a - b);

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
    .image-info a { display: inline-block; margin-top: 8px; background: #065f46; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.8rem; }
    .image-info a:hover { background: #047857; }
  </style>
</head>
<body>
  <h1>🌿 Tierra Madre - Image Export</h1>
  <p class="stats">${sortedItems.length} products • ${summary.totalProductImages} images</p>

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
    const images = productsByItem[itemNumber];
    html += `
  <div class="product">
    <h2>Product #${itemNumber} (${images.length} image${images.length > 1 ? 's' : ''})</h2>
    <div class="images">`;

    images.forEach((img, idx) => {
      const fileName = `product-${itemNumber}-${String(idx + 1).padStart(2, '0')}.${img.format}`;
      html += `
      <div class="image-card">
        <img src="${img.url}" alt="${fileName}" loading="lazy">
        <div class="image-info">
          <div class="filename">${fileName}</div>
          <a href="${img.url}" download="${fileName}" target="_blank">Download</a>
        </div>
      </div>`;
    });

    html += `
    </div>
  </div>`;
  }

  html += `
</body>
</html>`;

  return html;
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const format = args.includes('--csv') ? 'csv' : args.includes('--html') ? 'html' : 'json';

  console.log('🌿 Fetching Cloudinary images...');
  const data = await fetchCloudinaryImages();

  if (!data.success) {
    console.error('❌ Failed to fetch images:', data);
    process.exit(1);
  }

  console.log(`✅ Found ${data.summary.totalProductImages} images across ${data.summary.itemsWithProductImages} products`);

  const outputDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (format === 'csv') {
    const csv = generateCSV(data.productsByItem);
    const filePath = path.join(outputDir, 'tierramadre-images.csv');
    fs.writeFileSync(filePath, csv);
    console.log(`📄 CSV saved to: ${filePath}`);
  } else if (format === 'html') {
    const html = generateHTML(data.productsByItem, data.summary);
    const filePath = path.join(outputDir, 'tierramadre-images.html');
    fs.writeFileSync(filePath, html);
    console.log(`📄 HTML saved to: ${filePath}`);
    console.log(`\n🌐 Open in browser: file://${filePath}`);
  } else {
    // JSON summary
    const sortedItems = Object.keys(data.productsByItem)
      .map(Number)
      .sort((a, b) => a - b);

    console.log('\n📊 Images by Product:\n');
    for (const itemNumber of sortedItems) {
      const images = data.productsByItem[itemNumber];
      console.log(`  Product #${itemNumber}: ${images.length} image(s)`);
      images.forEach((img, idx) => {
        const fileName = `product-${itemNumber}-${String(idx + 1).padStart(2, '0')}.${img.format}`;
        console.log(`    → ${fileName}`);
      });
    }

    console.log('\n💡 Run with --csv or --html for export files');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
