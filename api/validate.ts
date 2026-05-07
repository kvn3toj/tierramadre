/**
 * Vercel Serverless Function - Unified Validation API
 *
 * Validates users against Asesores or Proveedores sheets.
 * Also provides list endpoints for providers.
 */

import type { sheets_v4 } from "@googleapis/sheets";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  withApiHandler,
  sendError,
  sendSuccess,
  SPREADSHEET_ID,
  getSheetNames,
  findSheetByPattern,
  findColumnIndex,
} from "./_lib/index.js";

type Sheets = sheets_v4.Sheets;

interface ValidatedUser {
  name: string;
  email: string;
  role: string;
  accessLevel: string;
}

interface ProviderRow {
  id: string;
  name: string;
  email: string;
  contactPerson: string;
  whatsapp: string;
  specialty: string;
  status: string;
  registeredAt: string;
}

/**
 * Validate user against Asesores sheet
 */
async function validateUser(
  sheets: Sheets,
  normalizedEmail: string,
  sheetNames: string[],
): Promise<ValidatedUser | null> {
  // Pattern-based lookup first — robust against sheet reordering.
  // Falls back to legacy positional index, then first sheet.
  const asesoresSheet =
    findSheetByPattern(sheetNames, ["asesor", "embajador"]) ||
    sheetNames[2] ||
    sheetNames[0];

  if (!asesoresSheet) return null;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${asesoresSheet}'!A:Z`,
  });

  const rows = response.data.values || [];
  if (!rows || rows.length === 0) return null;

  const headers = rows[0] as string[];
  const nameColumnIndex = findColumnIndex(headers, [
    "nombre",
    "name",
    "asesor",
  ]);
  const roleIndex = findColumnIndex(headers, ["datos", "rol", "role", "tipo"]);
  const emailIndex = findColumnIndex(headers, ["email", "correo", "instagram"]);
  const estadoIndex = findColumnIndex(headers, ["estado", "status"]);

  const dataRows = rows.slice(1);

  for (const row of dataRows) {
    if (estadoIndex !== -1) {
      const estado = String(row[estadoIndex] || "").toLowerCase();
      if (estado === "inactivo" || estado === "inactive") continue;
    }

    const userEmail =
      emailIndex !== -1
        ? String(row[emailIndex] || "")
            .toLowerCase()
            .trim()
        : "";

    if (userEmail === normalizedEmail) {
      const name = nameColumnIndex !== -1 ? row[nameColumnIndex] : "";
      const role =
        roleIndex !== -1 ? String(row[roleIndex] || "Asesor").trim() : "Asesor";

      let accessLevel = "asesor";
      const roleLower = role.toLowerCase();

      if (roleLower.includes("admin") || roleLower.includes("administrador")) {
        accessLevel = "admin";
      } else if (
        roleLower.includes("proveedor") ||
        roleLower.includes("provider")
      ) {
        accessLevel = "provider";
      } else if (
        roleLower.includes("embajador") ||
        roleLower.includes("ambassador")
      ) {
        accessLevel = "embajador";
      }

      return {
        name: String(name || normalizedEmail.split("@")[0]),
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
async function listProviders(
  sheets: Sheets,
  sheetNames: string[],
): Promise<ProviderRow[]> {
  const proveedoresSheet = findSheetByPattern(sheetNames, [
    "proveedores",
    "proveedor",
  ]);

  if (!proveedoresSheet) {
    return [];
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${proveedoresSheet}'!A:H`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return [];

  const headers = rows[0] as string[];
  const idIndex = findColumnIndex(headers, ["id"]);
  const nombreIndex = findColumnIndex(headers, ["nombre", "name"]);
  const emailIndex = findColumnIndex(headers, ["email", "correo"]);
  const contactoIndex = findColumnIndex(headers, ["contacto", "contact"]);
  const whatsappIndex = findColumnIndex(headers, ["whatsapp", "telefono"]);
  const especialidadIndex = findColumnIndex(headers, [
    "especialidad",
    "specialty",
  ]);
  const estadoIndex = findColumnIndex(headers, ["estado", "status"]);
  const fechaIndex = findColumnIndex(headers, ["fecha", "registeredat"]);

  return rows
    .slice(1)
    .map((row) => ({
      id: idIndex !== -1 ? String(row[idIndex] ?? "") : "",
      name: nombreIndex !== -1 ? String(row[nombreIndex] ?? "") : "",
      email: emailIndex !== -1 ? String(row[emailIndex] ?? "") : "",
      contactPerson:
        contactoIndex !== -1 ? String(row[contactoIndex] ?? "") : "",
      whatsapp: whatsappIndex !== -1 ? String(row[whatsappIndex] ?? "") : "",
      specialty:
        especialidadIndex !== -1 ? String(row[especialidadIndex] ?? "") : "",
      status:
        estadoIndex !== -1 ? String(row[estadoIndex] ?? "ACTIVO") : "ACTIVO",
      registeredAt: fechaIndex !== -1 ? String(row[fechaIndex] ?? "") : "",
    }))
    .filter((p) => p.email && p.status?.toUpperCase() === "ACTIVO");
}

/**
 * Validate user against Proveedores sheet
 */
async function validateProvider(
  sheets: Sheets,
  normalizedEmail: string,
  sheetNames: string[],
): Promise<ProviderRow | null> {
  const proveedoresSheet = findSheetByPattern(sheetNames, [
    "proveedores",
    "proveedor",
  ]);

  if (!proveedoresSheet) return null;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${proveedoresSheet}'!A:H`,
  });

  const rows = response.data.values || [];
  if (!rows || rows.length <= 1) return null;

  const headers = rows[0] as string[];
  const idIndex = findColumnIndex(headers, ["id"]);
  const nombreIndex = findColumnIndex(headers, ["nombre", "name"]);
  const emailIndex = findColumnIndex(headers, ["email", "correo"]);
  const contactoIndex = findColumnIndex(headers, ["contacto", "contact"]);
  const whatsappIndex = findColumnIndex(headers, ["whatsapp", "telefono"]);
  const especialidadIndex = findColumnIndex(headers, [
    "especialidad",
    "specialty",
  ]);
  const estadoIndex = findColumnIndex(headers, ["estado", "status"]);
  const fechaIndex = findColumnIndex(headers, ["fecha", "registeredat"]);

  const dataRows = rows.slice(1);

  for (const row of dataRows) {
    const providerEmail =
      emailIndex !== -1
        ? String(row[emailIndex] || "")
            .toLowerCase()
            .trim()
        : "";

    if (providerEmail === normalizedEmail) {
      if (estadoIndex !== -1) {
        const estado = String(row[estadoIndex] || "").toUpperCase();
        if (estado === "INACTIVO" || estado === "INACTIVE") return null;
      }

      return {
        id: idIndex !== -1 ? String(row[idIndex] ?? "") : "",
        name: nombreIndex !== -1 ? String(row[nombreIndex] ?? "") : "",
        email: normalizedEmail,
        contactPerson:
          contactoIndex !== -1 ? String(row[contactoIndex] ?? "") : "",
        whatsapp: whatsappIndex !== -1 ? String(row[whatsappIndex] ?? "") : "",
        specialty:
          especialidadIndex !== -1 ? String(row[especialidadIndex] ?? "") : "",
        status:
          estadoIndex !== -1 ? String(row[estadoIndex] ?? "ACTIVO") : "ACTIVO",
        registeredAt: fechaIndex !== -1 ? String(row[fechaIndex] ?? "") : "",
      };
    }
  }

  return null;
}

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    context: Record<string, unknown>,
  ) => {
    const sheets = context.sheets as Sheets;
    const action =
      (req.query.action as string) || req.body?.action || "validate";
    const email = req.method === "GET" ? req.query.email : req.body?.email;
    const type = (req.query.type as string) || req.body?.type || "both";

    if (action === "list-providers") {
      const sheetNames = await getSheetNames(sheets);
      const providers = await listProviders(sheets, sheetNames);
      return sendSuccess(res, { providers });
    }

    if (!email || typeof email !== "string") {
      return sendError(res, 400, "Email is required");
    }

    const sheetNames = await getSheetNames(sheets);
    const normalizedEmail = email.toLowerCase().trim();

    if (type === "user") {
      const user = await validateUser(sheets, normalizedEmail, sheetNames);
      return sendSuccess(res, {
        isAuthorized: !!user,
        user: user || undefined,
        error: user ? undefined : "Email not found in authorized users list",
      });
    }

    if (type === "provider") {
      const provider = await validateProvider(
        sheets,
        normalizedEmail,
        sheetNames,
      );
      return sendSuccess(res, {
        isProvider: !!provider,
        provider: provider || undefined,
        error: provider ? undefined : "Email not found in providers list",
      });
    }

    const user = await validateUser(sheets, normalizedEmail, sheetNames);
    if (user) {
      return sendSuccess(res, {
        isAuthorized: true,
        user,
        accountType: "user",
      });
    }

    const provider = await validateProvider(
      sheets,
      normalizedEmail,
      sheetNames,
    );
    if (provider) {
      return sendSuccess(res, {
        isProvider: true,
        provider,
        accountType: "provider",
      });
    }

    return sendSuccess(res, {
      isAuthorized: false,
      isProvider: false,
      error: "Email not found in any authorized list",
    });
  },
  {
    methods: ["GET", "POST", "OPTIONS"],
    provideSheets: true,
    errorPrefix: "Validate",
  },
);
