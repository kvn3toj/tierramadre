/**
 * OAuth Callback Handler
 * Exchanges authorization code for refresh token
 */

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>OAuth Error</h1>
          <p>${error}</p>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>No Authorization Code</h1>
          <p>No code parameter found in the URL.</p>
        </body>
      </html>
    `);
  }

  // Exchange code for tokens
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = 'https://tierra-madre-studio.vercel.app/oauth-callback';

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).send(`
        <html>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1>Token Exchange Error</h1>
            <p><strong>Error:</strong> ${data.error}</p>
            <p>${data.error_description || ''}</p>
          </body>
        </html>
      `);
    }

    // Success! Show the refresh token
    return res.status(200).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; max-width: 800px; margin: 0 auto;">
          <h1 style="color: green;">OAuth Success!</h1>
          <h2>Refresh Token (copy this):</h2>
          <textarea style="width: 100%; height: 150px; font-family: monospace; padding: 10px;" readonly onclick="this.select()">${data.refresh_token || 'No refresh token returned'}</textarea>
          <p style="margin-top: 20px; color: #666;">
            <strong>Access Token:</strong> ${data.access_token ? '(received)' : 'none'}<br>
            <strong>Expires In:</strong> ${data.expires_in || 'N/A'} seconds
          </p>
          <p style="background: #fffbdd; padding: 15px; border-radius: 5px;">
            Copy the refresh token above and provide it to update the GOOGLE_OAUTH_REFRESH_TOKEN environment variable.
          </p>
        </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>Server Error</h1>
          <p>${err.message}</p>
        </body>
      </html>
    `);
  }
}
