/**
 * CORS and Response Helpers
 *
 * Standardized CORS headers and response utilities for API functions.
 * Optimized for Chrome browser compatibility.
 */

import { CACHE } from './constants.js';

/**
 * Set standard CORS headers on response
 * Optimized for Chrome with preflight caching and proper header exposure
 *
 * @param {object} res - Vercel response object
 * @param {string[]} methods - Allowed HTTP methods (default: GET, OPTIONS)
 */
export function setCorsHeaders(res, methods = ['GET', 'OPTIONS']) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Cache-Control, If-None-Match, x-requester-email');
  // Chrome caches preflight for up to 2 hours (7200s max)
  res.setHeader('Access-Control-Max-Age', '7200');
}

/**
 * Set cache control headers
 * @param {object} res - Vercel response object
 * @param {string} cacheType - Cache type from CACHE constants
 */
export function setCacheHeaders(res, cacheType = CACHE.NONE) {
  res.setHeader('Cache-Control', cacheType);
  // Vary header for proper CDN caching across browsers
  res.setHeader('Vary', 'Accept, Accept-Encoding');

  if (cacheType === CACHE.NONE) {
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
}

/**
 * Handle OPTIONS preflight request
 * Chrome sends preflight for non-simple requests
 *
 * @param {object} req - Vercel request object
 * @param {object} res - Vercel response object
 * @returns {boolean} True if handled (caller should return)
 */
export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    // Return 204 No Content for preflight (more efficient than 200)
    res.status(204).end();
    return true;
  }
  return false;
}

/**
 * Send standardized error response
 * @param {object} res - Vercel response object
 * @param {number} status - HTTP status code
 * @param {string} error - Error message
 * @param {string} [message] - Optional detailed message
 */
export function sendError(res, status, error, message = null) {
  const response = { success: false, error };
  if (message) response.message = message;
  // Explicit charset for Chrome
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(response);
}

/**
 * Send standardized success response
 * @param {object} res - Vercel response object
 * @param {object} data - Response data
 * @param {number} [status=200] - HTTP status code (default: 200)
 */
export function sendSuccess(res, data, status = 200) {
  // Explicit charset for Chrome
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json({ success: true, ...data });
}

/**
 * Check if method is allowed
 * @param {object} req - Vercel request object
 * @param {object} res - Vercel response object
 * @param {string[]} allowedMethods - Array of allowed methods
 * @returns {boolean} True if method not allowed (caller should return)
 */
export function checkMethod(req, res, allowedMethods) {
  if (!allowedMethods.includes(req.method)) {
    sendError(res, 405, 'Method not allowed');
    return true;
  }
  return false;
}

/**
 * Standard API initialization - sets CORS and handles OPTIONS
 * @param {object} req - Vercel request object
 * @param {object} res - Vercel response object
 * @param {object} options - Configuration options
 * @param {string[]} options.methods - Allowed HTTP methods
 * @param {string} options.cache - Cache type from CACHE constants
 * @returns {boolean} True if request was handled (caller should return)
 */
/**
 * Validate that the requester is an admin based on ADMIN_EMAILS env var.
 * Reads the requester's email from the `x-requester-email` request header.
 *
 * @returns {boolean} true if access is granted, false if 401 was sent
 */
export function requireAdminEmail(req, res) {
  const email = (req.headers['x-requester-email'] || '').trim().toLowerCase();

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  // Graceful degradation: if env var is missing, allow with a warning
  if (adminEmails.length === 0) {
    console.warn('[Auth] ADMIN_EMAILS not configured — admin check skipped');
    return true;
  }

  if (!email || !adminEmails.includes(email)) {
    sendError(res, 401, 'Unauthorized');
    return false;
  }

  return true;
}

export function initApi(req, res, options = {}) {
  const { methods = ['GET', 'OPTIONS'], cache = null } = options;

  setCorsHeaders(res, methods);

  if (cache) {
    setCacheHeaders(res, cache);
  }

  if (handleOptions(req, res)) {
    return true;
  }

  if (checkMethod(req, res, methods)) {
    return true;
  }

  return false;
}
