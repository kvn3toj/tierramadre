/**
 * Verify Inventory Images Script
 *
 * This script checks which inventory items have images in Cloudinary
 * vs which items are showing placeholders.
 *
 * Usage: node verify-inventory.cjs
 */

const https = require('https');

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dyam6g2os';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

// Items from the base inventory that should have images
const INVENTORY_ITEMS = [
  { item: 46, nombre: 'Amor Platonico' },
  { item: 47, nombre: 'Corazón Tierra Madre' },
  { item: 45, nombre: 'Diosa Tierra Madre' },
  { item: 49, nombre: 'Rapunzel' },
  { item: 50, nombre: 'Blanca Nieves' },
  { item: 52, nombre: 'Pocahontas' },
  { item: 53, nombre: 'Aurora' },
  { item: 55, nombre: 'Daenerys' },
  { item: 56, nombre: 'Anna' },
  { item: 61, nombre: 'Princesa Azul' },
  { item: 62, nombre: 'La Reina Margot' },
  { item: 63, nombre: 'La Reina Isabell' },
  { item: 64, nombre: 'Gota del Pacifico' },
  { item: 65, nombre: 'Raiz de Gaia' },
  { item: 67, nombre: 'Hercules' },
  { item: 69, nombre: 'Chispa Divina' },
  { item: 70, nombre: 'Apolo' },
  { item: 71, nombre: 'Firmamento' },
  { item: 72, nombre: 'Troya' },
  { item: 73, nombre: 'Ventana al cielo' },
  { item: 74, nombre: 'Fuego' },
  { item: 75, nombre: 'Aria' },
  { item: 76, nombre: 'Ojos del Universo' },
  { item: 77, nombre: 'Dos Pequitas' },
  { item: 78, nombre: 'Cleopatra' },
  { item: 79, nombre: 'Ojo de Afrodita' },
  { item: 80, nombre: 'Grecia' },
  { item: 81, nombre: 'Lalala' },
  { item: 82, nombre: 'La Diva' },
  { item: 84, nombre: 'Instante Perfecto' },
  { item: 85, nombre: 'Viento del Pacifico' },
  { item: 68, nombre: 'Adan y Eva' },
  { item: 8, nombre: 'Bambu' },
  { item: 10, nombre: 'Jazmin' },
  { item: 14, nombre: 'Leticia' },
  { item: 42, nombre: 'Anillo de Plata ARE' },
  { item: 44, nombre: 'Bombon Superpoderosa ARE' },
  { item: 48, nombre: 'Anillo Con Dorado ARE' },
];

/**
 * Check if a Cloudinary folder has images
 */
async function checkCloudinaryFolder(itemNumber) {
  return new Promise((resolve) => {
    // This is a public URL check - won't work without API creds for listing
    // But we can check if a specific URL returns a valid image
    const testUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/tierramadre/product-${itemNumber}/`;

    // For now, just report that we need the Sheet data
    resolve({ itemNumber, hasFolder: 'unknown' });
  });
}

/**
 * List resources in Cloudinary (requires API credentials)
 */
async function listCloudinaryResources() {
  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.log('\n⚠️  No Cloudinary API credentials found.');
    console.log('   Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to check cloud storage.\n');
    return null;
  }

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');

    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image?prefix=tierramadre/product-&max_results=500`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('🔍 Tierra Madre Inventory Image Verification\n');
  console.log('=' .repeat(50));

  // Try to list Cloudinary resources
  const cloudinaryData = await listCloudinaryResources();

  if (cloudinaryData && cloudinaryData.resources) {
    console.log(`\n☁️  Found ${cloudinaryData.resources.length} images in Cloudinary:\n`);

    // Group by product folder
    const byProduct = {};
    cloudinaryData.resources.forEach(resource => {
      const match = resource.public_id.match(/product-(\d+)/);
      if (match) {
        const itemNum = parseInt(match[1]);
        if (!byProduct[itemNum]) byProduct[itemNum] = [];
        byProduct[itemNum].push(resource.secure_url);
      }
    });

    const itemsWithImages = Object.keys(byProduct).map(Number).sort((a, b) => a - b);
    console.log(`📦 Items with images: ${itemsWithImages.join(', ')}\n`);

    // Find items WITHOUT images
    const allItemNumbers = INVENTORY_ITEMS.map(i => i.item);
    const itemsWithoutImages = allItemNumbers.filter(num => !itemsWithImages.includes(num));

    if (itemsWithoutImages.length > 0) {
      console.log('❌ Items MISSING images in Cloudinary:');
      itemsWithoutImages.forEach(num => {
        const item = INVENTORY_ITEMS.find(i => i.item === num);
        console.log(`   - Item #${num}: ${item?.nombre || 'Unknown'}`);
      });
    } else {
      console.log('✅ All inventory items have images in Cloudinary!');
    }

    // Show image counts per product
    console.log('\n📊 Image count per product:');
    itemsWithImages.forEach(num => {
      const item = INVENTORY_ITEMS.find(i => i.item === num);
      console.log(`   - Item #${num} (${item?.nombre || 'Unknown'}): ${byProduct[num].length} image(s)`);
    });

  } else {
    console.log('\n📋 Manual verification needed:');
    console.log('   1. Check Google Sheet "URL Imagen" column for Cloudinary URLs');
    console.log('   2. Check localStorage in browser DevTools:');
    console.log('      - tierramadre-inventory-media');
    console.log('      - tierramadre-inventory-gallery');
    console.log('\n   Items that may be missing images based on screenshot:');
    console.log('   - Leticia');
    console.log('   - Princesa Azul');
    console.log('   - Bombon Superpoderosa ARE');
    console.log('   - Other items showing gem placeholder icon\n');
  }

  console.log('\n' + '=' .repeat(50));
  console.log('💡 To upload images: Use the app\'s image upload feature');
  console.log('   or add URLs to Google Sheet "URL Imagen" column.\n');
}

main().catch(console.error);
