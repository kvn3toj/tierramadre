#!/usr/bin/env node

/**
 * Download All Cloudinary Images
 *
 * Downloads all product images organized into subfolders with product names:
 *   downloads/
 *   ├── product-8-Rey-Esmeralda/
 *   │   ├── product-8-Rey-Esmeralda-01.jpg
 *   │   └── product-8-Rey-Esmeralda-02.jpg
 *   ├── product-32-Luna-Verde/
 *   │   └── product-32-Luna-Verde-01.jpg
 *   └── ...
 *
 * Usage:
 *   node scripts/download-all-images.mjs
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

// Fetch inventory to get product names
async function fetchInventory() {
  const response = await fetch('https://tierramadre.app/api/get-inventory-sheets');
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// Sanitize filename (remove special characters)
function sanitizeName(name) {
  if (!name) return 'Sin-Nombre';
  return name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 30);
}

// Download a single image
async function downloadImage(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
}

// Main
async function main() {
  console.log('🌿 Tierra Madre - Image Downloader\n');

  // Fetch images and inventory in parallel
  console.log('📡 Fetching data...');
  const [imageData, inventoryData] = await Promise.all([
    fetchCloudinaryImages(),
    fetchInventory(),
  ]);

  if (!imageData.success) {
    console.error('❌ Failed to fetch images:', imageData);
    process.exit(1);
  }

  // Create product name lookup
  const productNames = {};
  if (inventoryData.success && inventoryData.inventory) {
    for (const item of inventoryData.inventory) {
      productNames[item.item] = item.nombre;
    }
  }

  const sortedItems = Object.keys(imageData.productsByItem)
    .map(Number)
    .sort((a, b) => a - b);

  const totalImages = sortedItems.reduce(
    (sum, item) => sum + imageData.productsByItem[item].length,
    0
  );

  console.log(`✅ Found ${totalImages} images across ${sortedItems.length} products\n`);

  // Create downloads folder
  const downloadsDir = path.join(__dirname, '..', 'downloads');
  if (fs.existsSync(downloadsDir)) {
    console.log('🗑️  Cleaning previous downloads...');
    fs.rmSync(downloadsDir, { recursive: true });
  }
  fs.mkdirSync(downloadsDir, { recursive: true });

  let downloaded = 0;
  let failed = 0;

  console.log('📥 Downloading images...\n');

  for (const itemNumber of sortedItems) {
    const images = imageData.productsByItem[itemNumber];
    const productName = sanitizeName(productNames[itemNumber]);
    const folderName = `product-${itemNumber}-${productName}`;
    const productDir = path.join(downloadsDir, folderName);
    fs.mkdirSync(productDir, { recursive: true });

    console.log(`\n📁 ${folderName}/`);

    for (let idx = 0; idx < images.length; idx++) {
      const img = images[idx];
      const fileName = `product-${itemNumber}-${productName}-${String(idx + 1).padStart(2, '0')}.${img.format}`;
      const filePath = path.join(productDir, fileName);

      process.stdout.write(`   ├── ${fileName}...`);

      try {
        await downloadImage(img.url, filePath);
        downloaded++;
        console.log(' ✓');
      } catch (err) {
        failed++;
        console.log(` ✗ (${err.message})`);
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n✅ Download complete!`);
  console.log(`   📁 Location: ${downloadsDir}`);
  console.log(`   📊 Downloaded: ${downloaded}/${totalImages} images`);
  if (failed > 0) {
    console.log(`   ⚠️  Failed: ${failed}`);
  }

  // Show summary
  console.log('\n📋 Summary:');
  for (const itemNumber of sortedItems) {
    const images = imageData.productsByItem[itemNumber];
    const productName = productNames[itemNumber] || 'Sin Nombre';
    console.log(`   #${itemNumber} "${productName}" - ${images.length} image(s)`);
  }

  console.log(`\n💡 Now you can upload the 'downloads' folder to Google Drive`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
