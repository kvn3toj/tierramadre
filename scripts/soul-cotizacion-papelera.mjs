/**
 * Manda a la papelera una copia fallida de la cotización (recuperable desde
 * Drive → Papelera durante 30 días; no es borrado permanente).
 *
 * Uso: node scripts/soul-cotizacion-papelera.mjs <fileId>
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const fileId = process.argv[2];
if (!fileId) {
  console.error('Falta el fileId');
  process.exit(1);
}

const tk = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  }),
}).then((r) => r.json());

const r = await fetch(
  `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&fields=id,name,trashed`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tk.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  },
);

console.log(r.status, (await r.text()).slice(0, 200));
