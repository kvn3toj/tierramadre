#!/usr/bin/env node
/**
 * Extract media from PPTX catalogs for in-app showroom
 * Creates organized folders with images from each catalog
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'fs';
import { join, basename, extname } from 'path';

const SLIDES_DIR = './public/slides';
const OUTPUT_DIR = './public/catalog-media';
const TEMP_DIR = '/tmp/pptx-extract-catalogs';

// Catalog mapping
const CATALOGS = {
  'ACCESO TOTAL ESMERLADAS EN BRUTO.pptx': {
    id: 'raw',
    name: 'Acceso Total',
  },
  'CÓMO LO HACEMOS REAL.pptx': {
    id: 'process',
    name: 'Proceso Real',
  },
  'Copia de EMERALD GIFTs_.pptx': {
    id: 'gifts',
    name: 'Gifts',
  },
  'EL PODER DE LA TIERRA MADRE_.pptx': {
    id: 'power',
    name: 'Poder',
  },
  'Integración ARE.pptx': {
    id: 'integration',
    name: 'Integración',
  },
  'LOTE ORIGEN ARE TRÜST.pptx': {
    id: 'trust',
    name: 'Trust',
  },
};

// Clean and create directories
if (existsSync(TEMP_DIR)) rmSync(TEMP_DIR, { recursive: true });
mkdirSync(TEMP_DIR, { recursive: true });
mkdirSync(OUTPUT_DIR, { recursive: true });

const catalogIndex = {};

// Process each PPTX file
for (const [filename, config] of Object.entries(CATALOGS)) {
  const pptxPath = join(SLIDES_DIR, filename);

  if (!existsSync(pptxPath)) {
    console.log(`⚠️  Skipping ${filename} - file not found`);
    continue;
  }

  console.log(`📦 Processing: ${config.name} (${filename})`);

  const extractDir = join(TEMP_DIR, config.id);
  const outputDir = join(OUTPUT_DIR, config.id);

  // Create output directory
  mkdirSync(outputDir, { recursive: true });

  try {
    // Extract PPTX (it's a ZIP file)
    execSync(`unzip -o -q "${pptxPath}" -d "${extractDir}"`);

    // Find and copy media files
    const mediaDir = join(extractDir, 'ppt', 'media');

    if (existsSync(mediaDir)) {
      const mediaFiles = readdirSync(mediaDir)
        .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
        .sort((a, b) => {
          // Sort by number in filename
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });

      const images = [];

      mediaFiles.forEach((file, index) => {
        const ext = extname(file).toLowerCase();
        const newName = `slide-${String(index + 1).padStart(2, '0')}${ext}`;
        const srcPath = join(mediaDir, file);
        const destPath = join(outputDir, newName);

        copyFileSync(srcPath, destPath);
        images.push(`/catalog-media/${config.id}/${newName}`);
      });

      catalogIndex[config.id] = {
        name: config.name,
        filename: filename,
        images: images,
        count: images.length,
      };

      console.log(`   ✅ Extracted ${images.length} images`);
    } else {
      console.log(`   ⚠️  No media directory found`);
      catalogIndex[config.id] = {
        name: config.name,
        filename: filename,
        images: [],
        count: 0,
      };
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

// Write index file
const indexPath = join(OUTPUT_DIR, 'index.json');
const indexContent = JSON.stringify(catalogIndex, null, 2);
await import('fs').then(fs => fs.promises.writeFile(indexPath, indexContent));

console.log('\n📚 Catalog Index:');
console.log(indexContent);
console.log(`\n✨ Done! Media extracted to ${OUTPUT_DIR}`);

// Cleanup
rmSync(TEMP_DIR, { recursive: true });
