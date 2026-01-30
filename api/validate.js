/**
 * Vercel Serverless Function - Unified Validation API
 *
 * Validates users against Asesores or Proveedores sheets.
 * Also provides list endpoints for providers.
 *
 * Query params:
 * - email: User email to validate (required for validation)
 * - type: 'user' | 'provider' | 'both' (default: 'both')
 * - action: 'validate' | 'list-providers' (default: 'validate')
 */

import {
  getSheetsClient,
  isGoogleConfigured,
  initApi,
  sendError,
  sendSuccess,
  SPREADSHEET_ID,
  getSheetNames,
  findSheetByPattern,
  findColumnIndex,
} from './_lib/index.js';

/**
 * Validate user against Asesores sheet
 */
async function validateUser(sheets, normalizedEmail, sheetNames) {
  let asesoresSheet = sheetNames[2];
  if (!asesoresSheet) {
    asesoresSheet = findSheetByPattern(sheetNames, ['asesor', 'embajador']) || sheetNames[0];
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${asesoresSheet}'!A:Z`,
  });

  const rows = response.data.values || [];
  if (!rows || rows.length === 0) return null;

  const headers = rows[0];
  const nameColumnIndex = findColumnIndex(headers, ['nombre', 'name', 'asesor']);
  const roleIndex = findColumnIndex(headers, ['datos', 'rol', 'role', 'tipo']);
  const emailIndex = findColumnIndex(headers, ['email', 'correo', 'instagram']);
  const estadoIndex = findColumnIndex(headers, ['estado', 'status']);

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

      let accessLevel = 'asesor'; // Default to asesor (lowest staff level)
      const roleLower = role.toLowerCase();

      if (roleLower.includes('admin') || roleLower.includes('administrador')) {
        accessLevel = 'admin';
      } else if (roleLower.includes('proveedor') || roleLower.includes('provider')) {
        accessLevel = 'provider';
      } else if (roleLower.includes('embajador') || roleLower.includes('ambassador')) {
        accessLevel = 'embajador';
      }
      // 'asesor' remains as default for any other role

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
  const proveedoresSheet = findSheetByPattern(sheetNames, ['proveedores', 'proveedor']);

  if (!proveedoresSheet) {
    return [];
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${proveedoresSheet}'!A:H`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return [];

  const headers = rows[0];
  const idIndex = findColumnIndex(headers, ['id']);
  const nombreIndex = findColumnIndex(headers, ['nombre', 'name']);
  const emailIndex = findColumnIndex(headers, ['email', 'correo']);
  const contactoIndex = findColumnIndex(headers, ['contacto', 'contact']);
  const whatsappIndex = findColumnIndex(headers, ['whatsapp', 'telefono']);
  const especialidadIndex = findColumnIndex(headers, ['especialidad', 'specialty']);
  const estadoIndex = findColumnIndex(headers, ['estado', 'status']);
  const fechaIndex = findColumnIndex(headers, ['fecha', 'registeredat']);

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
  const proveedoresSheet = findSheetByPattern(sheetNames, ['proveedores', 'proveedor']);

  if (!proveedoresSheet) return null;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${proveedoresSheet}'!A:H`,
  });

  const rows = response.data.values || [];
  if (!rows || rows.length <= 1) return null;

  const headers = rows[0];
  const idIndex = findColumnIndex(headers, ['id']);
  const nombreIndex = findColumnIndex(headers, ['nombre', 'name']);
  const emailIndex = findColumnIndex(headers, ['email', 'correo']);
  const contactoIndex = findColumnIndex(headers, ['contacto', 'contact']);
  const whatsappIndex = findColumnIndex(headers, ['whatsapp', 'telefono']);
  const especialidadIndex = findColumnIndex(headers, ['especialidad', 'specialty']);
  const estadoIndex = findColumnIndex(headers, ['estado', 'status']);
  const fechaIndex = findColumnIndex(headers, ['fecha', 'registeredat']);

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

export default async function handler(req, res) {
  if (initApi(req, res, { methods: ['GET', 'POST', 'OPTIONS'] })) return;

  const action = req.query.action || req.body?.action || 'validate';
  const email = req.method === 'GET' ? req.query.email : req.body?.email;
  const type = req.query.type || req.body?.type || 'both';

  // List providers action - no email required
  if (action === 'list-providers') {
    try {
      const sheets = getSheetsClient();
      const sheetNames = await getSheetNames(sheets);
      const providers = await listProviders(sheets, sheetNames);
      return sendSuccess(res, { providers });
    } catch (error) {
      console.error('Error listing providers:', error);
      return sendError(res, 500, 'Failed to fetch providers');
    }
  }

  // Validation actions require email
  if (!email) {
    return sendError(res, 400, 'Email is required');
  }

  if (!isGoogleConfigured()) {
    return sendError(res, 500, 'Google OAuth not configured');
  }

  try {
    const sheets = getSheetsClient();
    const sheetNames = await getSheetNames(sheets);
    const normalizedEmail = email.toLowerCase().trim();

    if (type === 'user') {
      const user = await validateUser(sheets, normalizedEmail, sheetNames);
      return sendSuccess(res, {
        isAuthorized: !!user,
        user: user || undefined,
        error: user ? undefined : 'Email not found in authorized users list',
      });
    }

    if (type === 'provider') {
      const provider = await validateProvider(sheets, normalizedEmail, sheetNames);
      return sendSuccess(res, {
        isProvider: !!provider,
        provider: provider || undefined,
        error: provider ? undefined : 'Email not found in providers list',
      });
    }

    // Default: check both (user first, then provider)
    const user = await validateUser(sheets, normalizedEmail, sheetNames);
    if (user) {
      return sendSuccess(res, {
        isAuthorized: true,
        user,
        accountType: 'user',
      });
    }

    const provider = await validateProvider(sheets, normalizedEmail, sheetNames);
    if (provider) {
      return sendSuccess(res, {
        isProvider: true,
        provider,
        accountType: 'provider',
      });
    }

    return sendSuccess(res, {
      isAuthorized: false,
      isProvider: false,
      error: 'Email not found in any authorized list',
    });

  } catch (error) {
    console.error('Error validating:', error);
    return sendError(res, 500, 'Failed to validate', error.message);
  }
}
