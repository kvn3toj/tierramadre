/**
 * Vercel Serverless Function - Validate Invitation Token
 *
 * Validates a JWT invitation token and activates the 1-hour timer on first access.
 * Returns validity status and remaining time.
 *
 * Stateless implementation - no database required.
 */

import jwt from 'jsonwebtoken';

const INVITATION_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get token from query params (GET) or body (POST)
  const token = req.method === 'GET' ? req.query.token : req.body?.token;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required',
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      error: 'JWT_SECRET not configured',
    });
  }

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const now = Date.now();

    // Check if token is already activated (has activatedAt)
    if (decoded.activatedAt) {
      const expiresAt = new Date(decoded.expiresAt).getTime();
      const timeRemaining = expiresAt - now;

      if (timeRemaining <= 0) {
        // Token has expired
        return res.status(200).json({
          success: true,
          isValid: false,
          status: 'expired',
          error: 'This invitation has expired',
        });
      }

      // Token is still valid
      return res.status(200).json({
        success: true,
        isValid: true,
        status: 'active',
        activatedAt: decoded.activatedAt,
        expiresAt: decoded.expiresAt,
        timeRemaining,
        timeRemainingMinutes: Math.ceil(timeRemaining / 60000),
        createdBy: decoded.creatorName || decoded.creatorEmail,
      });
    }

    // First access - activate the token
    const activatedAt = new Date().toISOString();
    const expiresAt = new Date(now + INVITATION_DURATION_MS).toISOString();

    // Create a new token with activation info
    // Remove iat and exp from decoded to avoid conflicts
    const { iat, exp, ...payloadWithoutTiming } = decoded;

    const activatedToken = jwt.sign(
      {
        ...payloadWithoutTiming,
        activatedAt,
        expiresAt,
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' } // Token itself expires in 2h (buffer for 1h session)
    );

    return res.status(200).json({
      success: true,
      isValid: true,
      status: 'active',
      activatedAt,
      expiresAt,
      timeRemaining: INVITATION_DURATION_MS,
      timeRemainingMinutes: 60,
      createdBy: decoded.creatorName || decoded.creatorEmail,
      activatedToken, // Client should use this token for subsequent validations
    });

  } catch (error) {
    console.error('Error validating invitation:', error);

    // Handle different JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(200).json({
        success: true,
        isValid: false,
        status: 'expired',
        error: 'This invitation has expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(200).json({
        success: true,
        isValid: false,
        status: 'expired',
        error: 'Invalid invitation link',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to validate invitation',
      message: error.message,
    });
  }
}
