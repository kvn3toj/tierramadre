/**
 * Vercel Serverless Function - Generate Invitation Link
 *
 * Creates a JWT invitation token for Embajadores/Admins to share.
 * The 1-hour timer starts when the guest opens the link, not when created.
 *
 * Stateless implementation - no database required.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      error: 'JWT_SECRET not configured',
    });
  }

  try {
    // Create token payload
    const payload = {
      id: crypto.randomUUID(),
      creatorEmail: email,
      creatorName: email.split('@')[0], // Use email prefix as name
      createdAt: new Date().toISOString(),
      // activatedAt and expiresAt will be set when guest first opens the link
    };

    // Sign token (7 days max lifetime for unused invitations)
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Generate the invitation URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://tierra-madre-studio.vercel.app';
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return res.status(200).json({
      success: true,
      token,
      url: inviteUrl,
      createdAt: payload.createdAt,
      createdBy: {
        email: payload.creatorEmail,
        name: payload.creatorName,
        role: 'embajador',
      },
    });

  } catch (error) {
    console.error('Error generating invitation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate invitation',
      message: error.message,
    });
  }
}
