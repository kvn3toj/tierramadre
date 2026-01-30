/**
 * API Shared Library - Main Export
 *
 * Re-exports all shared utilities for convenient importing.
 *
 * Usage in API files:
 * import { getSheetsClient, setCorsHeaders, SPREADSHEET_ID } from './_lib/index.js';
 */

// Constants
export * from './constants.js';

// Google API Clients
export * from './google-clients.js';

// CORS and Response Helpers
export * from './cors.js';

// Google Drive Helpers
export * from './drive-helpers.js';

// Google Sheets Helpers
export * from './sheets-helpers.js';

// API Handler Wrapper
export * from './with-api-handler.js';
