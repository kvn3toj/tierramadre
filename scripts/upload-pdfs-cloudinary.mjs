/**
 * Upload PDF catalogs to Cloudinary
 *
 * This script uploads all PDFs from public/catalogs to Cloudinary
 * Run: node scripts/upload-pdfs-cloudinary.mjs
 */

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dyam6g2os',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// PDF to friendly ID mapping
const PDF_MAPPINGS = {
  'ACCESO TOTAL ESMERLADAS EN BRUTO-2.pdf': 'acceso-total',
  'CÓMO LO HACEMOS REAL.pdf': 'vision-compartida',
  'Copia de EMERALD GIFTs .pdf': 'gifts',
  'EL PODER DE LA TIERRA MADRE -2.pdf': 'tierra-madre',
  'LOTE ORIGEN ARE TRÜST.pdf': 'exportadores',
  'Integración ARE.pdf': 'integracion-are',
};

async function uploadPDF(filePath, publicId) {
  console.log(`\nUploading: ${path.basename(filePath)}`);
  console.log(`  -> Public ID: ${publicId}`);

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'image',  // PDFs are uploaded as images for page conversion
      public_id: publicId,
      folder: 'tierramadre/catalogs',
      overwrite: true,
      pages: true,  // Enable multi-page PDF support
    });

    console.log(`  ✅ Uploaded successfully!`);
    console.log(`  URL: ${result.secure_url}`);
    console.log(`  Pages: ${result.pages || 'N/A'}`);

    return result;
  } catch (error) {
    console.error(`  ❌ Upload failed:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting PDF upload to Cloudinary...\n');
  console.log('Cloud Name:', cloudinary.config().cloud_name);

  const catalogsDir = path.join(__dirname, '../public/catalogs');

  if (!fs.existsSync(catalogsDir)) {
    console.error('❌ Catalogs directory not found:', catalogsDir);
    process.exit(1);
  }

  const pdfFiles = fs.readdirSync(catalogsDir)
    .filter(file => file.endsWith('.pdf') && !file.includes('.pptx'));

  console.log(`Found ${pdfFiles.length} PDF files\n`);

  const results = [];

  for (const pdfFile of pdfFiles) {
    const filePath = path.join(catalogsDir, pdfFile);
    const publicId = PDF_MAPPINGS[pdfFile] || pdfFile.replace('.pdf', '').toLowerCase().replace(/\s+/g, '-');

    const result = await uploadPDF(filePath, publicId);
    if (result) {
      results.push({
        originalName: pdfFile,
        publicId,
        url: result.secure_url,
        pages: result.pages,
      });
    }
  }

  console.log('\n\n📋 Upload Summary:');
  console.log('==================');

  // Generate the catalog config
  console.log('\n// Add this to your catalog config:\n');
  console.log('const CLOUDINARY_CATALOGS = {');
  for (const r of results) {
    const pageUrl = r.url.replace('/upload/', '/upload/pg_1/');
    console.log(`  '${r.publicId}': {`);
    console.log(`    publicId: 'tierramadre/catalogs/${r.publicId}',`);
    console.log(`    pages: ${r.pages || 10}, // Update with actual page count`);
    console.log(`    baseUrl: '${r.url.replace(r.publicId + '.pdf', '')}',`);
    console.log(`  },`);
  }
  console.log('};');

  console.log('\n✅ All done!');
}

main().catch(console.error);
