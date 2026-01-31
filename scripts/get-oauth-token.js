#!/usr/bin/env node
/**
 * Get Google OAuth Refresh Token
 *
 * Run this script to authorize and get a new refresh token:
 *   node scripts/get-oauth-token.js
 *
 * Then follow the URL and paste the authorization code.
 */

import { OAuth2Client } from 'google-auth-library';
import readline from 'readline';

// Load from environment variables or .env.local
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET');
  console.error('Set them in your environment or run with:');
  console.error('  GOOGLE_OAUTH_CLIENT_ID=xxx GOOGLE_OAUTH_CLIENT_SECRET=xxx node scripts/get-oauth-token.js');
  process.exit(1);
}

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Scopes needed for Drive + Sheets operations
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // Force consent to get refresh token
});

console.log('\n========================================');
console.log('Google OAuth Authorization');
console.log('========================================\n');
console.log('1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Sign in with your Google account (the one with TM-Studio folder)');
console.log('3. Grant the requested permissions');
console.log('4. Copy the authorization code and paste it below\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the authorization code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());

    console.log('\n========================================');
    console.log('SUCCESS! New tokens obtained:');
    console.log('========================================\n');

    console.log('Access Token (expires in ~1 hour):');
    console.log(tokens.access_token.substring(0, 50) + '...\n');

    console.log('Refresh Token (save this to Vercel):');
    console.log(tokens.refresh_token);
    console.log('\n');

    console.log('========================================');
    console.log('Next steps:');
    console.log('========================================');
    console.log('1. Update your .env.local:');
    console.log(`   GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n2. Update Vercel env var:');
    console.log(`   vercel env rm GOOGLE_OAUTH_REFRESH_TOKEN -y`);
    console.log(`   echo "${tokens.refresh_token}" | vercel env add GOOGLE_OAUTH_REFRESH_TOKEN production`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\nError getting tokens:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }

  rl.close();
});
