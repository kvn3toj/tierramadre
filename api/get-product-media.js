/**
 * Vercel Serverless Function - Get Product Media from Cloudinary
 *
 * Fetches all media files for a specific product from Cloudinary folder
 */

import { v2 as cloudinary } from 'cloudinary';

export const config = {
  api: {
    bodyParser: true,
  },
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dyam6g2os',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

  const { itemNumber } = req.query;

  if (!itemNumber) {
    return res.status(400).json({ error: 'itemNumber is required' });
  }

  try {
    // Search for all resources in the product folder
    const folder = `tierramadre/product-${itemNumber}`;

    // Get images
    const imageResult = await cloudinary.search
      .expression(`folder:${folder}`)
      .sort_by('created_at', 'asc')
      .max_results(30)
      .execute();

    const media = imageResult.resources.map((resource, index) => ({
      id: resource.public_id,
      url: resource.secure_url,
      type: resource.resource_type === 'video' ? 'video' : 'image',
      thumbnailUrl: resource.resource_type === 'video'
        ? resource.secure_url.replace('/upload/', '/upload/so_1,w_400,h_300,c_fill/')
        : undefined,
      category: 'producto',
      alt: `Producto ${itemNumber} - ${index + 1}`,
      order: index,
      createdAt: resource.created_at,
    }));

    return res.status(200).json({
      success: true,
      media,
      folder,
    });

  } catch (error) {
    console.error('Error fetching media:', error);
    return res.status(500).json({
      error: 'Failed to fetch media',
      message: error.message,
    });
  }
}
