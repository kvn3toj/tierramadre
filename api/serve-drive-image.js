/**
 * Vercel Serverless Function - Serve Image from Google Drive
 *
 * This endpoint proxies images from Google Drive through the service account,
 * allowing access to files without requiring public sharing.
 */

import {
  getDriveClient,
  isGoogleConfigured,
  initApi,
  sendError,
  CACHE,
} from './_lib/index.js';

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'OPTIONS'] })) return;

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google Service Account not configured');
  }

  try {
    const { fileId, thumbnail } = req.query;

    if (!fileId) {
      return sendError(res, 400, 'fileId is required');
    }

    const drive = getDriveClient();

    // Get file metadata first
    const metadataResponse = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,size',
      supportsAllDrives: true,
    });

    const { mimeType, name } = metadataResponse.data;

    // For thumbnail requests (videos), fetch and proxy the thumbnail
    if (thumbnail === 'true') {
      const thumbResponse = await drive.files.get({
        fileId,
        fields: 'thumbnailLink',
        supportsAllDrives: true,
      });

      if (thumbResponse.data.thumbnailLink) {
        const thumbnailUrl = thumbResponse.data.thumbnailLink.replace(/=s\d+/, '=s800');
        try {
          const thumbFetch = await fetch(thumbnailUrl);

          if (thumbFetch.ok) {
            const thumbBuffer = Buffer.from(await thumbFetch.arrayBuffer());
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', thumbBuffer.length);
            res.setHeader('Cache-Control', CACHE.LONG);
            return res.status(200).send(thumbBuffer);
          }
        } catch (thumbError) {
          console.warn('Thumbnail fetch failed:', thumbError.message);
        }
      }

      // If thumbnail fetch fails for a video, return a 404
      if (mimeType.startsWith('video/')) {
        return res.status(404).json({
          error: 'Thumbnail not available',
          message: 'No thumbnail available for this video',
        });
      }
      // For images, fall through to serve the original file
    }

    // Download the file
    const response = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', CACHE.LONG);
    res.setHeader('Content-Disposition', `inline; filename="${name}"`);

    return res.status(200).send(buffer);

  } catch (error) {
    console.error('Error serving Drive image:', error);

    if (error.code === 404) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file was not found or is not accessible',
      });
    }

    if (error.code === 403) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'The service account does not have permission to access this file',
      });
    }

    return sendError(res, 500, 'Failed to serve image', error.message);
  }
}
