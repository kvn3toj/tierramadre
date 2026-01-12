/**
 * Vercel Serverless Function - Unified Validation API
 *
 * Validates users against Asesores or Proveedores sheets.
 * Also provides list endpoints for providers.
 * Replaces: validate-user.js, validate-provider.js, providers.js
 *
 * Query params:
 * - email: User email to validate (required for validation)
 * - type: 'user' | 'provider' | 'both' (default: 'both')
 * - action: 'validate' | 'list-providers' (default: 'validate')
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

/**
 * Initialize Google Sheets API with service account credentials
 */
function getSheetsClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return new sheets_v4.Sheets({ auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

/**
 * Validate user against Asesores sheet
 */
async function validateUser(sheets, normalizedEmail, sheetNames) {
  // Use sheet 3 (index 2) for asesores data
  let asesoresSheet = sheetNames[2];
  if (!asesoresSheet) {
    asesoresSheet = sheetNames.find(name =>
      name.toLowerCase().includes('asesor') ||
      name.toLowerCase().includes('embajador')
    ) || sheetNames[0];
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${asesoresSheet}'!A:Z`,
  });

  const rows = response.data.values || [];
  if (!rows || rows.length === 0) return null;

  const headers = rows[0].map(h => h ? h.toLowerCase().trim() : '');
  const nameColumnIndex = headers.findIndex(h =>
    h === 'nombre' || h === 'name' || h.includes('asesor')
  );
  const roleIndex = headers.findIndex(h =>
    h === 'datos' || h === 'rol' || h === 'role' || h === 'tipo'
  );
  const emailIndex = headers.findIndex(h =>
    h.includes('email') || h.includes('correo') || h.includes('instagram')
  );
  const estadoIndex = headers.findIndex(h => h === 'estado' || h === 'status');

  const dataRows = rows.slice(1);

  for (const row of dataRows) {
    if (estadoIndex !== -1) {
      const estado = String(row[estadoIndex] || '').toLowerCase();
      if (estado === 'inactivo' || estado === 'inactive') continue;
    }

    const userEmail = emailIndex !== -1 ? String(row[emailIndex] || '').toLowerCase().trim() : '';

    if (userEmail === normalizedEmail) {
      const name = nameColumnIndex !== -1 ? row[nameColumnIndex] : '';
      const role = roleIndex !== -1 ? (row[roleIndex] || 'Asesor').trim() : 'Asesor';

      let accessLevel = 'full';
      const roleLower = role.toLowerCase();

      if (roleLower.includes('admin') || roleLower.includes('administrador')) {
        accessLevel = 'admin';
      }

      return {
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role,
        accessLevel,
      };
    }
  }

  return null;
}

/**
 * List all active providers
 */
async function listProviders(sheets, sheetNames) {
  const proveedoresSheet = sheetNames.find(name =>
    name.toLowerCase() === 'proveedores' ||
    name.toLowerCase().includes('proveedor')
  );

  if (!proveedoresSheet) {
    return [];
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${proveedoresSheet}'!A:H`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return [];

  const headers = rows[0].map(h => h ? h.toLowerCase().trim() : '');
  const idIndex = headers.findIndex(h => h === 'id');
  const nombreIndex = headers.findIndex(h => h === 'nombre' || h === 'name');
  const emailIndex = headers.findIndex(h => h === 'email' || h === 'correo');
  const contactoIndex = headers.findIndex(h => h === 'contacto' || h === 'contact');
  const whatsappIndex = headers.findIndex(h => h === 'whatsapp' || h === 'telefono');
  const especialidadIndex = headers.findIndex(h => h === 'especialidad' || h === 'specialty');
  const estadoIndex = headers.findIndex(h => h === 'estado' || h === 'status');
  const fechaIndex = headers.findIndex(h => h.includes('fecha') || h === 'registeredat');

  return rows.slice(1)
    .map(row => ({
      id: idIndex !== -1 ? row[idIndex] : '',
      name: nombreIndex !== -1 ? row[nombreIndex] : '',
      email: emailIndex !== -1 ? row[emailIndex] : '',
      contactPerson: contactoIndex !== -1 ? row[contactoIndex] : '',
      whatsapp: whatsappIndex !== -1 ? row[whatsappIndex] : '',
      specialty: especialidadIndex !== -1 ? row[especialidadIndex] : '',
      status: estadoIndex !== -1 ? row[estadoIndex] : 'ACTIVO',
      registeredAt: fechaIndex !== -1 ? row[fechaIndex] : '',
    }))
    .filter(p => p.email && p.status?.toUpperCase() === 'ACTIVO');
}

/**
 * Validate user against Proveedores sheet
 */
async function validateProvider(sheets, normalizedEmail, sheetNames) {
  const proveedoresSheet = sheetNames.find(name =>
    name.toLowerCase() === 'proveedores' ||
    name.toLowerCase().includes('proveedor')
  );

  if (!proveedoresSheet) return null;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${proveedoresSheet}'!A:H`,
  });

  const rows = response.data.values || [];
  if (!rows || rows.length <= 1) return null;

  const headers = rows[0].map(h => h ? h.toLowerCase().trim() : '');
  const idIndex = headers.findIndex(h => h === 'id');
  const nombreIndex = headers.findIndex(h => h === 'nombre' || h === 'name');
  const emailIndex = headers.findIndex(h => h === 'email' || h === 'correo');
  const contactoIndex = headers.findIndex(h => h === 'contacto' || h === 'contact');
  const whatsappIndex = headers.findIndex(h => h === 'whatsapp' || h === 'telefono');
  const especialidadIndex = headers.findIndex(h => h === 'especialidad' || h === 'specialty');
  const estadoIndex = headers.findIndex(h => h === 'estado' || h === 'status');
  const fechaIndex = headers.findIndex(h => h.includes('fecha') || h === 'registeredat');

  const dataRows = rows.slice(1);

  for (const row of dataRows) {
    const providerEmail = emailIndex !== -1 ? String(row[emailIndex] || '').toLowerCase().trim() : '';

    if (providerEmail === normalizedEmail) {
      if (estadoIndex !== -1) {
        const estado = String(row[estadoIndex] || '').toUpperCase();
        if (estado === 'INACTIVO' || estado === 'INACTIVE') return null;
      }

      return {
        id: idIndex !== -1 ? row[idIndex] : '',
        name: nombreIndex !== -1 ? row[nombreIndex] : '',
        email: normalizedEmail,
        contactPerson: contactoIndex !== -1 ? row[contactoIndex] : '',
        whatsapp: whatsappIndex !== -1 ? row[whatsappIndex] : '',
        specialty: especialidadIndex !== -1 ? row[especialidadIndex] : '',
        status: estadoIndex !== -1 ? row[estadoIndex] : 'ACTIVO',
        registeredAt: fechaIndex !== -1 ? row[fechaIndex] : '',
      };
    }
  }

  return null;
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = req.query.action || req.body?.action || 'validate';
  const email = req.method === 'GET' ? req.query.email : req.body?.email;
  const type = req.query.type || req.body?.type || 'both';

  // List providers action - no email required
  if (action === 'list-providers') {
    try {
      const sheets = getSheetsClient();
      const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheetNames = metadata.data.sheets.map(s => s.properties.title);
      const providers = await listProviders(sheets, sheetNames);
      return res.status(200).json({ success: true, providers });
    } catch (error) {
      console.error('Error listing providers:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch providers' });
    }
  }

  // Validation actions require email
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({ success: false, error: 'Google Service Account not configured' });
  }

  try {
    const sheets = getSheetsClient();
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetNames = metadata.data.sheets.map(s => s.properties.title);
    const normalizedEmail = email.toLowerCase().trim();

    // Validate based on type
    if (type === 'user') {
      const user = await validateUser(sheets, normalizedEmail, sheetNames);
      return res.status(200).json({
        success: true,
        isAuthorized: !!user,
        user: user || undefined,
        error: user ? undefined : 'Email not found in authorized users list',
      });
    }

    if (type === 'provider') {
      const provider = await validateProvider(sheets, normalizedEmail, sheetNames);
      return res.status(200).json({
        success: true,
        isProvider: !!provider,
        provider: provider || undefined,
        error: provider ? undefined : 'Email not found in providers list',
      });
    }

    // Default: check both (user first, then provider)
    const user = await validateUser(sheets, normalizedEmail, sheetNames);
    if (user) {
      return res.status(200).json({
        success: true,
        isAuthorized: true,
        user,
        accountType: 'user',
      });
    }

    const provider = await validateProvider(sheets, normalizedEmail, sheetNames);
    if (provider) {
      return res.status(200).json({
        success: true,
        isProvider: true,
        provider,
        accountType: 'provider',
      });
    }

    return res.status(200).json({
      success: true,
      isAuthorized: false,
      isProvider: false,
      error: 'Email not found in any authorized list',
    });

  } catch (error) {
    console.error('Error validating:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate',
      message: error.message,
    });
  }
}
