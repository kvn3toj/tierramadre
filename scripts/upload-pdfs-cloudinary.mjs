/**
 * Upload PDF catalogs to Cloudinary using unsigned uploads
 *
 * This script uploads all PDFs from public/catalogs to Cloudinary
 * Uses the unsigned upload preset 'tierramadre' (no API keys needed)
 *
 * Run: node scripts/upload-pdfs-cloudinary.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cloudinary config - using unsigned uploads
const CLOUDINARY_CLOUD_NAME = 'dyam6g2os';
const CLOUDINARY_UPLOAD_PRESET = 'tierramadre';
const CLOUDINARY_FOLDER = 'tierramadre/catalogs';

// PDF to friendly ID mapping
const PDF_MAPPINGS = {
  'ACCESO TOTAL ESMERLADAS EN BRUTO-2.pdf': 'acceso-total',
  'CÓMO LO HACEMOS REAL.pdf': 'vision-compartida',
  'Copia de EMERALD GIFTs .pdf': 'gifts',
  'EL PODER DE LA TIERRA MADRE -2.pdf': 'tierra-madre',
  'LOTE ORIGEN ARE TRÜST.pdf': 'exportadores',
};

function uploadPDFManual(filePath, publicId) {
  return new Promise((resolve, reject) => {
    const filename = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

    // Build multipart form data manually
    const parts = [];

    // Add upload_preset
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="upload_preset"\r\n\r\n` +
      `${CLOUDINARY_UPLOAD_PRESET}\r\n`
    );

    // Add folder
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="folder"\r\n\r\n` +
      `${CLOUDINARY_FOLDER}\r\n`
    );

    // Add public_id
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="public_id"\r\n\r\n` +
      `${publicId}\r\n`
    );

    // Add the file
    const fileHeader =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: application/pdf\r\n\r\n`;

    const closing = `\r\n--${boundary}--\r\n`;

    // Combine all parts
    const headerBuffer = Buffer.from(parts.join('') + fileHeader, 'utf8');
    const closingBuffer = Buffer.from(closing, 'utf8');
    const body = Buffer.concat([headerBuffer, fileBuffer, closingBuffer]);

    const options = {
      hostname: 'api.cloudinary.com',
      port: 443,
      path: `/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(result);
          } else {
            reject(new Error(result.error?.message || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function uploadPDF(filePath, publicId) {
  console.log(`\nUploading: ${path.basename(filePath)}`);
  console.log(`  -> Public ID: ${publicId}`);
  console.log(`  -> Size: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`);

  try {
    const result = await uploadPDFManual(filePath, publicId);

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
  console.log('Cloud Name:', CLOUDINARY_CLOUD_NAME);
  console.log('Upload Preset:', CLOUDINARY_UPLOAD_PRESET);
  console.log('Folder:', CLOUDINARY_FOLDER);

  const catalogsDir = path.join(__dirname, '../public/catalogs');

  if (!fs.existsSync(catalogsDir)) {
    console.error('❌ Catalogs directory not found:', catalogsDir);
    process.exit(1);
  }

  const pdfFiles = fs.readdirSync(catalogsDir)
    .filter(file => file.endsWith('.pdf') && !file.includes('.pptx'));

  console.log(`\nFound ${pdfFiles.length} PDF files`);

  const results = [];

  for (const pdfFile of pdfFiles) {
    const publicId = PDF_MAPPINGS[pdfFile];

    if (!publicId) {
      console.log(`\n⏭️  Skipping: ${pdfFile} (not in mapping)`);
      continue;
    }

    const filePath = path.join(catalogsDir, pdfFile);
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

  for (const r of results) {
    console.log(`\n${r.originalName}:`);
    console.log(`  Public ID: ${r.publicId}`);
    console.log(`  Pages: ${r.pages || 'N/A'}`);
    console.log(`  URL: ${r.url}`);
  }

  if (results.length > 0) {
    // Generate update for CLOUDINARY_CATALOGS
    console.log('\n\n📝 Update CLOUDINARY_CATALOGS in CloudinaryShowroom.tsx:');
    console.log('=========================================================\n');
    console.log('export const CLOUDINARY_CATALOGS: Record<string, { publicId: string; pages: number; name: string }> = {');
    for (const r of results) {
      const cleanName = r.originalName.replace('.pdf', '').replace(/-\d+$/, '').trim();
      console.log(`  '${r.publicId}': { publicId: '${r.publicId}', pages: ${r.pages || 10}, name: '${cleanName}' },`);
    }
    console.log('};');
  }

  console.log('\n✅ All done!');
}

main().catch(console.error);
