/**
 * Generate a new OAuth2 refresh token for Google APIs
 *
 * Usage: node scripts/generate-refresh-token.mjs
 *
 * Opens browser for Google consent, captures the code,
 * exchanges it for a refresh token.
 */

import http from 'http';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
const REDIRECT_URI = 'http://localhost:3000/oauth-callback';
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in .env.local');
  process.exit(1);
}

// Allow passing email as argument: node scripts/generate-refresh-token.mjs user@gmail.com
const loginHint = process.argv[2] || '';

const params = new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: 'code',
  scope: SCOPES,
  access_type: 'offline',
  prompt: 'consent select_account',
});
if (loginHint) params.set('login_hint', loginHint);

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

console.log('\n🔑 Opening browser for Google OAuth consent...\n');

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth-callback')) return;

  const url = new URL(req.url, 'http://localhost:3000');
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400);
    res.end('No authorization code received');
    return;
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('\n❌ Token exchange failed:', tokens.error_description || tokens.error);
      res.writeHead(400);
      res.end('Token exchange failed: ' + (tokens.error_description || tokens.error));
      server.close();
      process.exit(1);
    }

    console.log('\n✅ New refresh token obtained!\n');
    console.log('GOOGLE_OAUTH_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\nAccess token expires in:', tokens.expires_in, 'seconds');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>✅ Token generated!</h1><p>You can close this tab.</p></body></html>');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    res.writeHead(500);
    res.end('Error: ' + err.message);
    server.close();
    process.exit(1);
  }
});

server.listen(3000, () => {
  console.log('Listening on http://localhost:3000 for callback...');
  console.log('Auth URL:', authUrl, '\n');
  execSync(`open "${authUrl}"`);
});
