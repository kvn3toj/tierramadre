#!/usr/bin/env node
/**
 * Google OAuth Setup Script
 *
 * This script helps you get a refresh token for Google Drive API access.
 *
 * Usage:
 * 1. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET env vars
 * 2. Run: node scripts/google-oauth-setup.mjs
 * 3. Follow the authorization URL
 * 4. Copy the refresh token to Vercel env vars
 */

import { google } from 'googleapis';
import http from 'http';
import open from 'open';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333/oauth-callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables');
  console.log('\nExample:');
  console.log('GOOGLE_OAUTH_CLIENT_ID=xxx GOOGLE_OAUTH_CLIENT_SECRET=yyy node scripts/google-oauth-setup.mjs');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive',
  ],
  prompt: 'consent', // Force consent to always get refresh token
});

console.log('\n=== Google OAuth Setup ===\n');
console.log('Opening browser to authorize...');
console.log('If browser does not open, visit this URL:');
console.log(`\n${authUrl}\n`);

// Create a simple server to receive the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:3333`);

  if (url.pathname === '/oauth-callback') {
    const code = url.searchParams.get('code');

    if (code) {
      try {
        const { tokens } = await oauth2Client.getToken(code);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
              <h1>✅ Authorization Successful!</h1>
              <p>Copy the refresh token below and add it to your Vercel environment variables:</p>
              <h3>GOOGLE_OAUTH_REFRESH_TOKEN</h3>
              <textarea style="width: 100%; height: 100px; font-family: monospace; padding: 10px;">${tokens.refresh_token}</textarea>
              <p style="color: gray;">You can close this window now.</p>
            </body>
          </html>
        `);

        console.log('\n✅ Authorization successful!\n');
        console.log('=== REFRESH TOKEN ===');
        console.log(tokens.refresh_token);
        console.log('=====================\n');
        console.log('Add this to Vercel as GOOGLE_OAUTH_REFRESH_TOKEN');

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);

      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error getting token: ' + error.message);
        console.error('Error getting token:', error.message);
      }
    } else {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('No code provided');
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(3333, () => {
  console.log('Listening on http://localhost:3333 for callback...');
  open(authUrl).catch(() => {
    console.log('Could not open browser automatically');
  });
});
