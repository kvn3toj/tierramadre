import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const sizes = [
  { name: 'pwa-192x192.png', size: 192, padding: 20 },
  { name: 'pwa-512x512.png', size: 512, padding: 50 },
  { name: 'apple-touch-icon.png', size: 180, padding: 18 },
];

async function generateIcons() {
  const logoPath = join(publicDir, 'logo-tierra-madre.png');

  for (const { name, size, padding } of sizes) {
    // Get logo metadata
    const logoMeta = await sharp(logoPath).metadata();

    // Calculate resize dimensions to fit within the icon with padding
    const availableSize = size - (padding * 2);
    const scale = Math.min(availableSize / logoMeta.width, availableSize / logoMeta.height);
    const newWidth = Math.round(logoMeta.width * scale);
    const newHeight = Math.round(logoMeta.height * scale);

    // Resize the logo
    const resizedLogo = await sharp(logoPath)
      .resize(newWidth, newHeight, { fit: 'inside' })
      .toBuffer();

    // Create dark background and composite logo centered
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 18, g: 18, b: 18, alpha: 1 } // #121212 dark background
      }
    })
      .composite([{
        input: resizedLogo,
        gravity: 'center'
      }])
      .png()
      .toFile(join(publicDir, name));

    console.log(`Generated ${name}`);
  }
  console.log('All icons generated with Tierra Madre logo!');
}

generateIcons().catch(console.error);
