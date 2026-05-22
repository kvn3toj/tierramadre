/**
 * Cotización Save API
 *
 * Saves cotización images to Google Drive and metadata to Google Sheets.
 * Each asesor has their own folder: TM-Studio/cotizaciones/asesores/{email}/
 */

import type { sheets_v4 } from "@googleapis/sheets";
import type { drive_v3 } from "@googleapis/drive";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Readable } from "stream";
import {
  withApiHandler,
  SPREADSHEET_ID,
  APP_SPREADSHEET_ID,
  sendError,
  sendSuccess,
  getSheetNames,
  findSheetByPattern,
  findColumnIndex,
  formatDisplayName,
} from "./_lib/index.js";

// Sheet names for cotización data
const COTIZACIONES_SHEET = "CotizacionesAsesores";
const PRODUCTS_SHEET = "CotizacionProducts";

function firstQueryParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

interface CotizacionSheetRow {
  quotationNumber: string;
  asesorEmail: string;
  asesorName: string;
  clientName: string;
  clientPhone: string;
  productsCount: number;
  total: number | string;
  imageUrl: string;
  driveFileId: string;
  expiryDate: string;
}

interface CotizacionProductLine {
  itemNumber?: number;
  name?: string;
  precioCOP?: number;
}

interface CotizacionPostBody {
  quotationNumber?: string;
  asesorEmail?: string;
  asesorName?: string;
  clientName?: string;
  clientPhone?: string;
  productsCount?: number;
  total?: number;
  expiryDate?: string;
  imageBase64?: string;
  products?: CotizacionProductLine[];
}

/**
 * Get asesor names from the Asesores sheet, indexed by email
 * Returns a map of { email: name }
 */
async function getAsesorNamesByEmail(
  sheets: sheets_v4.Sheets,
): Promise<Record<string, string>> {
  try {
    const sheetNames = await getSheetNames(sheets);

    // Locate the asesores sheet by name first; fall back to legacy index 2.
    const asesoresSheet =
      findSheetByPattern(sheetNames, ["asesor", "embajador"]) ||
      sheetNames[2] ||
      sheetNames[0];

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${asesoresSheet}'!A:Z`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return {};

    const headers = rows[0] as string[];
    const nameIndex = findColumnIndex(headers, [
      "nombre",
      "name",
      "asesor",
      "vendedor",
    ]);
    const emailIndex = findColumnIndex(headers, ["instagram", "ig", "email"]);

    if (nameIndex === -1 || emailIndex === -1) return {};

    const namesByEmail: Record<string, string> = {};
    for (const row of rows.slice(1)) {
      const name = row[nameIndex];
      const email = row[emailIndex];
      if (name && email) {
        const cleanEmail = String(email).trim().toLowerCase();
        namesByEmail[cleanEmail] = formatDisplayName(String(name));
      }
    }

    return namesByEmail;
  } catch (error) {
    console.error("[CotizacionSave] Error fetching asesor names:", error);
    return {};
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get or create the asesores cotizaciones folder structure
 * TM-Studio/cotizaciones/asesores/{email}/
 */
async function getAsesorCotizacionesFolder(
  drive: drive_v3.Drive,
  sharedDriveId: string,
  asesorEmail: string,
): Promise<string> {
  // Sanitize email for folder name
  const sanitizedEmail = asesorEmail
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@._-]/g, "_");

  // Find or create cotizaciones folder
  let cotizacionesFolderId: string;
  const cotizacionesQuery = await drive.files.list({
    q: `name = 'cotizaciones' and '${sharedDriveId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const cotFiles = cotizacionesQuery.data.files ?? [];
  if (cotFiles.length > 0 && cotFiles[0].id) {
    cotizacionesFolderId = cotFiles[0].id;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: "cotizaciones",
        mimeType: "application/vnd.google-apps.folder",
        parents: [sharedDriveId],
      },
      fields: "id",
      supportsAllDrives: true,
    });
    cotizacionesFolderId = folder.data.id!;
  }

  // Find or create asesores subfolder
  let asesoresFolderId: string;
  const asesoresQuery = await drive.files.list({
    q: `name = 'asesores' and '${cotizacionesFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const asesFiles = asesoresQuery.data.files ?? [];
  if (asesFiles.length > 0 && asesFiles[0].id) {
    asesoresFolderId = asesFiles[0].id;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: "asesores",
        mimeType: "application/vnd.google-apps.folder",
        parents: [cotizacionesFolderId],
      },
      fields: "id",
      supportsAllDrives: true,
    });
    asesoresFolderId = folder.data.id!;
  }

  // Find or create asesor's personal folder
  let asesorFolderId: string;
  const asesorQuery = await drive.files.list({
    q: `name = '${sanitizedEmail}' and '${asesoresFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const asesorFiles = asesorQuery.data.files ?? [];
  if (asesorFiles.length > 0 && asesorFiles[0].id) {
    asesorFolderId = asesorFiles[0].id;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: sanitizedEmail,
        mimeType: "application/vnd.google-apps.folder",
        parents: [asesoresFolderId],
      },
      fields: "id",
      supportsAllDrives: true,
    });
    asesorFolderId = folder.data.id!;
  }

  return asesorFolderId;
}

/**
 * Upload base64 image to Drive
 */
async function uploadImageToDrive(
  drive: drive_v3.Drive,
  folderId: string,
  imageBase64: string,
  quotationNumber: string,
) {
  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const fileName = `${quotationNumber}.png`;

  const uploadedFile = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: "image/png",
      body: Readable.from(buffer),
    },
    fields: "id, name, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  const newFileId = uploadedFile.data.id;
  if (!newFileId) {
    throw new Error("Drive upload did not return a file id");
  }

  // Make file viewable
  await drive.permissions.create({
    fileId: newFileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
    supportsAllDrives: true,
  });

  return {
    fileId: newFileId,
    fileName: uploadedFile.data.name,
    viewUrl: uploadedFile.data.webViewLink,
    downloadUrl: uploadedFile.data.webContentLink,
    proxyUrl: `/api/serve-drive-image?fileId=${newFileId}`,
  };
}

/**
 * Ensure the cotizaciones sheet exists with headers
 */
async function ensureCotizacionesSheet(
  sheets: sheets_v4.Sheets,
): Promise<boolean> {
  try {
    // Check if sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: APP_SPREADSHEET_ID,
    });

    const sheetExists = spreadsheet.data.sheets?.some(
      (s) => s.properties?.title === COTIZACIONES_SHEET,
    );

    if (!sheetExists) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: APP_SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: COTIZACIONES_SHEET,
                },
              },
            },
          ],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: APP_SPREADSHEET_ID,
        range: `${COTIZACIONES_SHEET}!A1:L1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "ID",
              "QuotationNumber",
              "AsesorEmail",
              "AsesorName",
              "ClientName",
              "ClientPhone",
              "ProductsCount",
              "Total",
              "ImageUrl",
              "DriveFileId",
              "CreatedAt",
              "ExpiryDate",
            ],
          ],
        },
      });

      console.log("[CotizacionSave] Created CotizacionesAsesores sheet");
    }

    return true;
  } catch (error) {
    console.error("[CotizacionSave] Error ensuring sheet:", error);
    throw error;
  }
}

/**
 * Ensure the products sheet exists with headers
 */
async function ensureProductsSheet(sheets: sheets_v4.Sheets): Promise<boolean> {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: APP_SPREADSHEET_ID,
    });

    const sheetExists = spreadsheet.data.sheets?.some(
      (s) => s.properties?.title === PRODUCTS_SHEET,
    );

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: APP_SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: PRODUCTS_SHEET,
                },
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: APP_SPREADSHEET_ID,
        range: `${PRODUCTS_SHEET}!A1:F1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "CotizacionId",
              "ItemNumber",
              "ProductName",
              "Price",
              "AsesorEmail",
              "CreatedAt",
            ],
          ],
        },
      });

      console.log("[CotizacionSave] Created CotizacionProducts sheet");
    }

    return true;
  } catch (error) {
    console.error("[CotizacionSave] Error ensuring products sheet:", error);
    throw error;
  }
}

/**
 * Save cotización metadata to sheet
 */
async function saveCotizacionToSheet(
  sheets: sheets_v4.Sheets,
  data: CotizacionSheetRow,
): Promise<string> {
  await ensureCotizacionesSheet(sheets);

  const id = `cot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const row = [
    id,
    data.quotationNumber,
    data.asesorEmail,
    data.asesorName,
    data.clientName,
    data.clientPhone || "",
    data.productsCount,
    data.total,
    data.imageUrl,
    data.driveFileId,
    new Date().toISOString(),
    data.expiryDate || "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `${COTIZACIONES_SHEET}!A:L`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });

  return id;
}

/**
 * Save cotización products to sheet
 */
async function saveCotizacionProducts(
  sheets: sheets_v4.Sheets,
  cotizacionId: string,
  products: CotizacionProductLine[],
  asesorEmail: string,
): Promise<void> {
  if (!products || products.length === 0) return;

  await ensureProductsSheet(sheets);

  const createdAt = new Date().toISOString();
  const rows = products.map((product) => [
    cotizacionId,
    product.itemNumber || 0,
    product.name || "",
    product.precioCOP || 0,
    asesorEmail,
    createdAt,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `${PRODUCTS_SHEET}!A:F`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: rows,
    },
  });

  console.log(
    `[CotizacionSave] Saved ${products.length} products for ${cotizacionId}`,
  );
}

/**
 * Get cotizaciones for an asesor
 */
async function getCotizacionesByAsesor(
  sheets: sheets_v4.Sheets,
  asesorEmail: string,
) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `${COTIZACIONES_SHEET}!A:L`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return []; // Only headers or empty

    const normalizedEmail = asesorEmail.toLowerCase().trim();

    // Skip header row, filter by email
    const cotizaciones = rows
      .slice(1)
      .filter((row) => row[2]?.toLowerCase().trim() === normalizedEmail)
      .map((row) => ({
        id: row[0],
        quotationNumber: row[1],
        asesorEmail: row[2],
        asesorName: row[3],
        clientName: row[4],
        clientPhone: row[5],
        productsCount: parseInt(row[6]) || 0,
        total: parseFloat(row[7]) || 0,
        imageUrl: row[8],
        driveFileId: row[9],
        createdAt: row[10],
        expiryDate: row[11],
      }))
      .sort(
        (a, b) =>
          new Date(String(b.createdAt)).getTime() -
          new Date(String(a.createdAt)).getTime(),
      ); // Most recent first

    return cotizaciones;
  } catch (error: unknown) {
    // Sheet might not exist yet
    const err = error as { code?: number; message?: string };
    if (err.code === 400 || err.message?.includes("Unable to parse range")) {
      return [];
    }
    throw error;
  }
}

/**
 * Get product statistics from CotizacionProducts sheet
 */
async function getProductStats(sheets: sheets_v4.Sheets) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `${PRODUCTS_SHEET}!A:F`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return { topProducts: [], productsByAsesor: [] };
    }

    const dataRows = rows.slice(1).filter((row) => row[0]); // Skip header

    // Aggregate products
    const productStats: Record<
      string,
      { itemNumber: number; name: string; count: number; totalValue: number }
    > = {};
    const asesorProducts: Record<
      string,
      Record<
        string,
        { itemNumber: number; name: string; count: number; totalValue: number }
      >
    > = {};

    for (const row of dataRows) {
      const itemNumber = parseInt(row[1]) || 0;
      const productName = row[2] || "";
      const price = parseFloat(row[3]) || 0;
      const asesorEmail = row[4] || "";

      // Global product stats
      const productKey = `${itemNumber}-${productName}`;
      if (!productStats[productKey]) {
        productStats[productKey] = {
          itemNumber,
          name: productName,
          count: 0,
          totalValue: 0,
        };
      }
      productStats[productKey].count += 1;
      productStats[productKey].totalValue += price;

      // Per-asesor stats
      if (asesorEmail) {
        if (!asesorProducts[asesorEmail]) {
          asesorProducts[asesorEmail] = {};
        }
        if (!asesorProducts[asesorEmail][productKey]) {
          asesorProducts[asesorEmail][productKey] = {
            itemNumber,
            name: productName,
            count: 0,
            totalValue: 0,
          };
        }
        asesorProducts[asesorEmail][productKey].count += 1;
        asesorProducts[asesorEmail][productKey].totalValue += price;
      }
    }

    // Top products globally
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Products by asesor (top 5 per asesor)
    const productsByAsesor = Object.entries(asesorProducts)
      .map(([email, products]) => ({
        email,
        topProducts: Object.values(products)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      }))
      .sort((a, b) => {
        const aTotal = a.topProducts.reduce((sum, p) => sum + p.count, 0);
        const bTotal = b.topProducts.reduce((sum, p) => sum + p.count, 0);
        return bTotal - aTotal;
      })
      .slice(0, 10);

    return { topProducts, productsByAsesor };
  } catch (error: unknown) {
    // Sheet might not exist yet
    const err = error as { code?: number; message?: string };
    if (err.code === 400 || err.message?.includes("Unable to parse range")) {
      return { topProducts: [], productsByAsesor: [] };
    }
    throw error;
  }
}

/**
 * Get cotización data for a specific product (by itemNumber)
 * Returns who quoted this product and when
 */
async function getProductCotizaciones(
  sheets: sheets_v4.Sheets,
  itemNumber: string | string[],
) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `${PRODUCTS_SHEET}!A:F`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return {
        itemNumber: parseInt(String(itemNumber), 10),
        productName: null,
        totalCotizaciones: 0,
        totalValue: 0,
        quotedBy: [],
        recentQuotes: [],
      };
    }

    // Filter rows by itemNumber
    const targetItemNumber = parseInt(String(itemNumber), 10);
    const dataRows = rows
      .slice(1)
      .filter((row) => parseInt(String(row[1]), 10) === targetItemNumber);

    if (dataRows.length === 0) {
      return {
        itemNumber: targetItemNumber,
        productName: null,
        totalCotizaciones: 0,
        totalValue: 0,
        quotedBy: [],
        recentQuotes: [],
      };
    }

    // Get product name from first row
    const productName = dataRows[0][2] || null;

    type AsesorAgg = {
      email: string;
      name: string;
      count: number;
      totalValue: number;
      firstQuote: string;
      lastQuote: string;
    };
    const asesorStats: Record<string, AsesorAgg> = {};
    const allQuotes: {
      cotizacionId: string | number | boolean | undefined;
      asesorEmail: string;
      price: number;
      createdAt: string;
    }[] = [];

    for (const row of dataRows) {
      const cotizacionId = row[0];
      const price = parseFloat(row[3]) || 0;
      const asesorEmail = row[4] || "";
      const createdAt = row[5] || "";

      // Add to all quotes for recent activity
      allQuotes.push({
        cotizacionId,
        asesorEmail,
        price,
        createdAt,
      });

      // Aggregate by asesor
      if (asesorEmail) {
        if (!asesorStats[asesorEmail]) {
          asesorStats[asesorEmail] = {
            email: asesorEmail,
            name: asesorEmail.split("@")[0],
            count: 0,
            totalValue: 0,
            firstQuote: createdAt,
            lastQuote: createdAt,
          };
        }
        asesorStats[asesorEmail].count += 1;
        asesorStats[asesorEmail].totalValue += price;

        // Track first and last quote dates
        if (createdAt) {
          const createdTime = new Date(createdAt).getTime();
          const firstTime = new Date(
            asesorStats[asesorEmail].firstQuote,
          ).getTime();
          const lastTime = new Date(
            asesorStats[asesorEmail].lastQuote,
          ).getTime();

          if (createdTime < firstTime || !asesorStats[asesorEmail].firstQuote) {
            asesorStats[asesorEmail].firstQuote = createdAt;
          }
          if (createdTime > lastTime || !asesorStats[asesorEmail].lastQuote) {
            asesorStats[asesorEmail].lastQuote = createdAt;
          }
        }
      }
    }

    // Sort asesors by count (descending)
    const quotedBy = Object.values(asesorStats).sort(
      (a, b) => b.count - a.count,
    );

    // Sort all quotes by date (most recent first)
    const recentQuotes = allQuotes
      .sort(
        (a, b) =>
          new Date(String(b.createdAt)).getTime() -
          new Date(String(a.createdAt)).getTime(),
      )
      .slice(0, 20);

    // Calculate totals
    const totalValue = quotedBy.reduce((sum, a) => sum + a.totalValue, 0);

    return {
      itemNumber: targetItemNumber,
      productName,
      totalCotizaciones: dataRows.length,
      totalValue,
      uniqueAsesores: quotedBy.length,
      quotedBy,
      recentQuotes,
    };
  } catch (error: unknown) {
    // Sheet might not exist yet
    const err = error as { code?: number; message?: string };
    if (err.code === 400 || err.message?.includes("Unable to parse range")) {
      return {
        itemNumber: parseInt(String(itemNumber), 10),
        productName: null,
        totalCotizaciones: 0,
        totalValue: 0,
        quotedBy: [],
        recentQuotes: [],
      };
    }
    throw error;
  }
}

/**
 * Get aggregate cotización statistics
 */
async function getCotizacionStats(sheets: sheets_v4.Sheets) {
  try {
    // Fetch asesor names from Asesores sheet (lookup by email)
    const asesorNameLookup = await getAsesorNamesByEmail(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: APP_SPREADSHEET_ID,
      range: `${COTIZACIONES_SHEET}!A:L`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return {
        totalCotizaciones: 0,
        totalValue: 0,
        todayCotizaciones: 0,
        weekCotizaciones: 0,
        uniqueAsesores: 0,
        uniqueClients: 0,
        topAsesores: [],
        recentCotizaciones: [],
        topProducts: [],
        productsByAsesor: [],
      };
    }

    const dataRows = rows.slice(1).filter((row) => row[0]); // Skip header, filter empty rows
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

    let totalValue = 0;
    let todayCotizaciones = 0;
    let weekCotizaciones = 0;
    const asesorCounts: Record<string, number> = {};
    const clientSet = new Set<string>();

    for (const row of dataRows) {
      const asesorEmail = row[2] || "";
      const clientName = row[4] || "";
      const total = parseFloat(row[7]) || 0;
      const createdAt = row[10] ? new Date(row[10]).getTime() : 0;

      totalValue += total;

      if (createdAt >= todayStart) todayCotizaciones++;
      if (createdAt >= weekStart) weekCotizaciones++;

      if (asesorEmail) {
        asesorCounts[asesorEmail] = (asesorCounts[asesorEmail] || 0) + 1;
      }

      if (clientName) {
        clientSet.add(clientName.toLowerCase().trim());
      }
    }

    // Helper to get asesor display name (lookup from Asesores sheet, fallback to email)
    const getAsesorDisplayName = (
      email: string | number | boolean | undefined,
    ) => {
      const e = String(email ?? "");
      const normalizedEmail = e.toLowerCase().trim();
      return asesorNameLookup[normalizedEmail] || e.split("@")[0] || "Asesor";
    };

    // Top asesores by count (use name from Asesores sheet)
    const topAsesores = Object.entries(asesorCounts)
      .map(([email, count]) => ({
        email,
        count,
        name: getAsesorDisplayName(email),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent cotizaciones (use name from Asesores sheet instead of stored name)
    const recentCotizaciones = dataRows
      .map((row) => ({
        id: row[0],
        quotationNumber: row[1],
        asesorEmail: row[2],
        asesorName: getAsesorDisplayName(row[2]), // Lookup from Asesores sheet
        clientName: row[4],
        productsCount: parseInt(row[6]) || 0,
        total: parseFloat(row[7]) || 0,
        createdAt: row[10],
      }))
      .sort(
        (a, b) =>
          new Date(String(b.createdAt)).getTime() -
          new Date(String(a.createdAt)).getTime(),
      )
      .slice(0, 20);

    // Get product stats
    const { topProducts, productsByAsesor } = await getProductStats(sheets);

    return {
      totalCotizaciones: dataRows.length,
      totalValue,
      todayCotizaciones,
      weekCotizaciones,
      uniqueAsesores: Object.keys(asesorCounts).length,
      uniqueClients: clientSet.size,
      topAsesores,
      recentCotizaciones,
      topProducts,
      productsByAsesor,
    };
  } catch (error: unknown) {
    // Sheet might not exist yet
    const err = error as { code?: number; message?: string };
    if (err.code === 400 || err.message?.includes("Unable to parse range")) {
      return {
        totalCotizaciones: 0,
        totalValue: 0,
        todayCotizaciones: 0,
        weekCotizaciones: 0,
        uniqueAsesores: 0,
        uniqueClients: 0,
        topAsesores: [],
        recentCotizaciones: [],
        topProducts: [],
        productsByAsesor: [],
      };
    }
    throw error;
  }
}

/**
 * Delete a cotización
 */
async function deleteCotizacion(
  drive: drive_v3.Drive,
  sheets: sheets_v4.Sheets,
  cotizacionId: string,
  asesorEmail: string,
): Promise<boolean> {
  // Get all rows to find the one to delete
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `${COTIZACIONES_SHEET}!A:L`,
  });

  const rows = response.data.values || [];
  const normalizedEmail = asesorEmail.toLowerCase().trim();

  // Find the row index (1-based for sheets)
  let rowIndex = -1;
  let driveFileId: string | null | undefined = null;

  for (let i = 1; i < rows.length; i++) {
    if (
      rows[i][0] === cotizacionId &&
      rows[i][2]?.toLowerCase().trim() === normalizedEmail
    ) {
      rowIndex = i + 1; // 1-based
      driveFileId = rows[i][9];
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error("Cotización not found or not owned by this asesor");
  }

  // Delete from Drive
  if (driveFileId) {
    try {
      await drive.files.delete({
        fileId: driveFileId,
        supportsAllDrives: true,
      });
    } catch (error: unknown) {
      console.warn(
        "[CotizacionSave] Could not delete Drive file:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  // Delete from Sheet (clear the row)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `${COTIZACIONES_SHEET}!A${rowIndex}:L${rowIndex}`,
  });

  return true;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    ctx: Record<string, unknown>,
  ) => {
    const { sheets, oauthDrive, sharedDriveId } = ctx as {
      sheets: sheets_v4.Sheets;
      oauthDrive: drive_v3.Drive | null;
      sharedDriveId: string | undefined;
    };
    const drive = oauthDrive;

    // ==========================================================================
    // GET - Fetch cotizaciones for an asesor or aggregate stats
    // ==========================================================================
    if (req.method === "GET") {
      const email = firstQueryParam(
        req.query?.email as string | string[] | undefined,
      );
      const action = firstQueryParam(
        req.query?.action as string | string[] | undefined,
      );
      const itemId = firstQueryParam(
        req.query?.itemId as string | string[] | undefined,
      );

      // Stats endpoint for analytics dashboard
      if (action === "stats") {
        const stats = await getCotizacionStats(sheets);
        return sendSuccess(res, stats);
      }

      // Product cotizaciones endpoint - who quoted a specific product
      if (action === "productCotizaciones" && itemId) {
        const productData = await getProductCotizaciones(sheets, itemId);
        return sendSuccess(res, productData);
      }

      // Asesor-specific cotizaciones
      if (!email) {
        return sendError(res, 400, "Email parameter required");
      }

      const cotizaciones = await getCotizacionesByAsesor(sheets, email);

      return sendSuccess(res, {
        cotizaciones,
        count: cotizaciones.length,
      });
    }

    // ==========================================================================
    // POST - Save a new cotización
    // ==========================================================================
    if (req.method === "POST") {
      if (!drive || !sharedDriveId) {
        return sendError(res, 500, "Google Drive not available");
      }

      const {
        quotationNumber,
        asesorEmail,
        asesorName,
        clientName,
        clientPhone,
        productsCount,
        total,
        expiryDate,
        imageBase64,
        products, // Array of { itemNumber, name, precioCOP }
      } = req.body as CotizacionPostBody;

      // Validate required fields
      if (!quotationNumber || !asesorEmail || !asesorName || !imageBase64) {
        return sendError(
          res,
          400,
          "Missing required fields: quotationNumber, asesorEmail, asesorName, imageBase64",
        );
      }

      // Get or create asesor's folder
      const asesorFolderId = await getAsesorCotizacionesFolder(
        drive,
        sharedDriveId,
        asesorEmail,
      );

      // Upload image
      const uploadResult = await uploadImageToDrive(
        drive,
        asesorFolderId,
        imageBase64,
        quotationNumber,
      );

      // Save metadata to sheet
      const cotizacionId = await saveCotizacionToSheet(sheets, {
        quotationNumber,
        asesorEmail,
        asesorName,
        clientName: clientName || "",
        clientPhone: clientPhone || "",
        productsCount: productsCount || products?.length || 0,
        total: total || 0,
        expiryDate: expiryDate || "",
        imageUrl: uploadResult.proxyUrl,
        driveFileId: uploadResult.fileId,
      });

      // Save products to separate sheet for analytics
      if (products && Array.isArray(products) && products.length > 0) {
        await saveCotizacionProducts(
          sheets,
          cotizacionId,
          products,
          asesorEmail,
        );
      }

      return sendSuccess(
        res,
        {
          id: cotizacionId,
          quotationNumber,
          imageUrl: uploadResult.proxyUrl,
          driveFileId: uploadResult.fileId,
        },
        201,
      );
    }

    // ==========================================================================
    // DELETE - Delete a cotización
    // ==========================================================================
    if (req.method === "DELETE") {
      if (!drive) {
        return sendError(res, 500, "Google Drive not available");
      }

      const id = firstQueryParam(
        req.query?.id as string | string[] | undefined,
      );
      const email = firstQueryParam(
        req.query?.email as string | string[] | undefined,
      );

      if (!id || !email) {
        return sendError(res, 400, "ID and email parameters required");
      }

      await deleteCotizacion(drive, sheets, id, email);

      return sendSuccess(res, { deleted: true });
    }

    return sendError(res, 405, "Method not allowed");
  },
  {
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    provideSheets: true,
    provideOAuthDrive: true,
    errorPrefix: "CotizacionSave",
  },
);
