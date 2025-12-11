/**
 * Vercel Serverless Function - Check Cloudinary Images
 *
 * Lists all images in the Tierra Madre Cloudinary folders
 * to verify what's stored in the cloud.
 *
 * GET /api/check-cloudinary-images
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dyam6g2os',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
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

  // Check if API credentials are configured
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({
      error: 'Cloudinary API not configured',
      message: 'Please set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET environment variables',
    });
  }

  try {
    // Fetch all resources from the tierramadre folder
    const [inventoryImages, productImages] = await Promise.all([
      // Images uploaded from Google Sheets
      cloudinary.api.resources({
        type: 'upload',
        prefix: 'tierramadre/inventory',
        max_results: 500,
      }),
      // Images uploaded from the React app
      cloudinary.api.resources({
        type: 'upload',
        prefix: 'tierramadre/product-',
        max_results: 500,
      }),
    ]);

    // Group product images by item number
    const productsByItem = {};
    (productImages.resources || []).forEach(resource => {
      const match = resource.public_id.match(/product-(\d+)/);
      if (match) {
        const itemNum = parseInt(match[1]);
        if (!productsByItem[itemNum]) {
          productsByItem[itemNum] = [];
        }
        productsByItem[itemNum].push({
          url: resource.secure_url,
          publicId: resource.public_id,
          format: resource.format,
          createdAt: resource.created_at,
        });
      }
    });

    // Parse inventory images
    const inventoryByName = {};
    (inventoryImages.resources || []).forEach(resource => {
      // Extract product name from public_id (format: tierramadre/inventory/name_timestamp)
      const parts = resource.public_id.split('/');
      const filename = parts[parts.length - 1];
      const name = filename.replace(/_\d+$/, ''); // Remove timestamp

      if (!inventoryByName[name]) {
        inventoryByName[name] = [];
      }
      inventoryByName[name].push({
        url: resource.secure_url,
        publicId: resource.public_id,
        format: resource.format,
        createdAt: resource.created_at,
      });
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalInventoryImages: inventoryImages.resources?.length || 0,
        totalProductImages: productImages.resources?.length || 0,
        itemsWithProductImages: Object.keys(productsByItem).length,
        uniqueInventoryNames: Object.keys(inventoryByName).length,
      },
      productsByItem,
      inventoryByName,
      lastChecked: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error checking Cloudinary:', error);
    return res.status(500).json({
      error: 'Failed to check Cloudinary',
      message: error.message,
    });
  }
}
