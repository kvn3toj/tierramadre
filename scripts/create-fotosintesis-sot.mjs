/**
 * Create the new Fotosíntesis Source-of-Truth spreadsheet.
 *
 * Uses OAuth refresh token (project owner's account) to create the sheet,
 * then shares editor access with the service account so Fotosíntesis APIs
 * (which authenticate via service account) can read/write it.
 *
 * Run: node scripts/create-fotosintesis-sot.mjs
 */

import { OAuth2Client, GoogleAuth } from "google-auth-library";
import { sheets_v4 } from "@googleapis/sheets";
import { drive_v3 } from "@googleapis/drive";
import dotenv from "dotenv";
import fs from "fs";

// Prefer .env.local (developer machine) over .env.production.local (Vercel)
dotenv.config({ path: ".env.local" });
if (!process.env.GOOGLE_OAUTH_REFRESH_TOKEN)
  dotenv.config({ path: ".env.production.local" });
if (!process.env.GOOGLE_OAUTH_REFRESH_TOKEN) dotenv.config();

const TITLE = "Inventario-Fotosíntesis · SOT v2";
const SHARE_EMAILS_NOTIFY = ["seguimientoproduccion1@gmail.com"];

function cleanEnv(v) {
  if (!v) return v;
  return v
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "")
    .replace(/[\r\n]/g, "")
    .trim();
}

// ─────────────────────────────────────────────────────────────────
// Schemas (must match api/_lib/admin-table-config.ts + get-treasure-sheets.ts)
// ─────────────────────────────────────────────────────────────────

const PROVEEDORES_HEADERS = [
  "nombreORazonSocial",
  "nit",
  "cedula",
  "direccion",
  "telefono",
  "email",
  "tipo",
  "notas",
];
const LOTES_HEADERS = [
  "loteId",
  "providerNombre",
  "fechaRecepcion",
  "pesoTotalQuilates",
  "costoTotalCOP",
  "unidadesDeclaradas",
  "formaPago",
  "metodoContado",
  "fechaVencimiento",
  "numeroCuotas",
  "numeroFactura",
  "urlFactura",
  "notas",
  "estado",
];
const INVENTARIO_HEADERS = [
  "Item",
  "FECHA INGRESO INVENTARIO",
  "Nombre",
  "Peso (ct)",
  "Color",
  "Calidad",
  "Cant.",
  "Talla",
  "Medidas",
  "Medidas",
  "Categoría",
  "Precio COP",
  "UBICACIÓN",
  "ASESOR",
  "ESTADO",
  "QR",
  "Colección",
  "CAJA",
  "preponderancia",
  "ASESOR ACTUAL",
  "ESTADO ASESOR",
];
const CLIENTES_HEADERS = [
  "nombre",
  "nit",
  "cedula",
  "direccion",
  "telefono",
  "email",
  "tipo",
  "asesorId",
];
const VENTAS_HEADERS = [
  "saleId",
  "fechaVenta",
  "itemIdsJoined",
  "clientNombre",
  "precioAcordadoCOP",
  "descuentoCOP",
  "totalCOP",
  "comisionCOP",
  "formaPago",
  "metodoContado",
  "fechaVencimiento",
  "numeroCuotas",
  "carnetUrl",
  "certificadoUrl",
  "estado",
];

const SEED = {
  Proveedores: [
    [
      "Edwin Mauricio Ruiz",
      "80.179.071",
      "",
      "carrera 6#14-74 Edificio sprinter oficina 904",
      "+573142978350",
      "",
      "gemas",
      "Migrado desde GENESIS · Item 319 · ingresado 2026-05-21",
    ],
  ],
  Lotes: [
    [
      "B-001",
      "Edwin Mauricio Ruiz",
      "2026-05-21",
      "37.3",
      "4900000",
      "190",
      "contado",
      "transferencia",
      "",
      "",
      "CMP-1",
      "",
      "Migrado desde GENESIS · originalmente C001",
      "abierto",
    ],
  ],
  Inventario: [
    [
      "1",
      "2026-05-21",
      "Lluvia de Oportunidades - Calibrada",
      "Cristal",
      "Verde Natural",
      "Extrafina F1",
      "",
      "Variado",
      "3,5",
      "",
      "Aretes",
      "",
      "Lote B-001",
      "",
      "DISPONIBLE",
      "",
      "Lote de Gemas",
      "",
      "30%",
      "",
      "",
    ],
    [
      "2",
      "2026-05-21",
      "Lluvia de Oportunidades - no Calibrada",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Lote de Gemas",
      "",
      "Lote B-001",
      "",
      "DISPONIBLE",
      "",
      "Lote de Gemas",
      "",
      "",
      "",
      "",
    ],
  ],
  Clientes: [],
  Ventas: [],
};

// ─────────────────────────────────────────────────────────────────
async function main() {
  // Idempotency guard — the SOT was created once on 2026-05-21. Re-running
  // would mint a duplicate sheet under the user's Drive and leave the env
  // pointer pointing at the old one. Pass `--force` to override.
  const ID_FILE = "docs/specs/2026-05-21-fotosintesis-sot-id.txt";
  const force = process.argv.includes("--force");
  if (fs.existsSync(ID_FILE) && !force) {
    const existing = fs.readFileSync(ID_FILE, "utf8").split("\n")[0].trim();
    console.error(`❌ SOT already exists (${existing}).`);
    console.error(`   Re-running would create a duplicate spreadsheet.`);
    console.error(
      `   To override, run with --force. To inspect: cat ${ID_FILE}`,
    );
    process.exit(1);
  }

  const clientId = cleanEnv(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const refreshToken = cleanEnv(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);
  if (!clientId || !clientSecret || !refreshToken) {
    console.error("❌ OAuth env missing");
    process.exit(1);
  }

  // OAuth client (creates sheet under user's Drive)
  const oauth = new OAuth2Client(clientId, clientSecret);
  oauth.setCredentials({ refresh_token: refreshToken });
  await oauth.refreshAccessToken();
  const sheetsOAuth = new sheets_v4.Sheets({ auth: oauth });
  const driveOAuth = new drive_v3.Drive({ auth: oauth });

  // Find owner email for logs
  let ownerEmail = "unknown";
  try {
    const r = await oauth.request({
      url: "https://www.googleapis.com/oauth2/v2/userinfo",
    });
    ownerEmail = r.data.email;
  } catch {}
  console.log("👤 OAuth user (sheet owner):", ownerEmail);

  // Service account email — for sharing access after creation
  let saEmail = null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const keyText = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\s+/g, "");
    const creds = JSON.parse(Buffer.from(keyText, "base64").toString("utf8"));
    saEmail = creds.client_email;
    console.log("🤖 Service account to grant access:", saEmail);
  }

  // 1. Create the spreadsheet (with default tab) via Sheets API
  console.log("\n📝 Creando spreadsheet...");
  const create = await sheetsOAuth.spreadsheets.create({
    resource: {
      properties: { title: TITLE, locale: "es_CO", timeZone: "America/Bogota" },
      sheets: [
        {
          properties: {
            title: "Proveedores",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: { title: "Lotes", gridProperties: { frozenRowCount: 1 } },
        },
        {
          properties: {
            title: "Inventario",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Clientes",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Ventas",
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    },
  });
  const spreadsheetId = create.data.spreadsheetId;
  const spreadsheetUrl = create.data.spreadsheetUrl;
  const sheetIds = {};
  for (const s of create.data.sheets ?? []) {
    sheetIds[s.properties.title] = s.properties.sheetId;
  }
  console.log("✅ Created. ID:", spreadsheetId);

  // 2. Write headers + seeds
  console.log("\n📋 Sembrando headers + datos...");
  await sheetsOAuth.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: "Proveedores!A1",
          values: [PROVEEDORES_HEADERS, ...SEED.Proveedores],
        },
        { range: "Lotes!A1", values: [LOTES_HEADERS, ...SEED.Lotes] },
        {
          range: "Inventario!A1",
          values: [INVENTARIO_HEADERS, ...SEED.Inventario],
        },
        { range: "Clientes!A1", values: [CLIENTES_HEADERS, ...SEED.Clientes] },
        { range: "Ventas!A1", values: [VENTAS_HEADERS, ...SEED.Ventas] },
      ],
    },
  });
  console.log("✅ Datos sembrados");

  // 3. Format headers
  console.log("\n🎨 Formateando headers...");
  const formatReqs = Object.entries(sheetIds).flatMap(([title, sheetId]) => [
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
              foregroundColor: { red: 1, green: 1, blue: 1 },
            },
            backgroundColor: { red: 0, green: 0.55, blue: 0.38 },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields:
          "userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy)",
      },
    },
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: 25,
        },
      },
    },
  ]);
  await sheetsOAuth.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests: formatReqs },
  });
  console.log("✅ Formato aplicado");

  // 4. Share with service account (writer) + co-owner email
  if (saEmail) {
    console.log("\n🔗 Compartiendo con service account...");
    try {
      await driveOAuth.permissions.create({
        fileId: spreadsheetId,
        sendNotificationEmail: false,
        resource: { type: "user", role: "writer", emailAddress: saEmail },
      });
      console.log(`   ✓ ${saEmail} (writer)`);
    } catch (e) {
      console.warn(`   ⚠ falló compartir con ${saEmail}: ${e.message}`);
    }
  }
  for (const email of SHARE_EMAILS_NOTIFY) {
    try {
      await driveOAuth.permissions.create({
        fileId: spreadsheetId,
        sendNotificationEmail: false,
        resource: { type: "user", role: "writer", emailAddress: email },
      });
      console.log(`   ✓ ${email} (writer)`);
    } catch (e) {
      console.warn(`   ⚠ ${email}: ${e.message}`);
    }
  }

  // 5. Output
  console.log("\n" + "=".repeat(72));
  console.log("🎉 SOT v2 LISTO");
  console.log("=".repeat(72));
  console.log(`📊 URL: ${spreadsheetUrl}`);
  console.log(`🔑 SPREADSHEET_ID: ${spreadsheetId}`);
  console.log("=".repeat(72));

  fs.mkdirSync("docs/specs", { recursive: true });
  fs.writeFileSync(
    "docs/specs/2026-05-21-fotosintesis-sot-id.txt",
    `${spreadsheetId}\n${spreadsheetUrl}\n`,
  );
}

main().catch((e) => {
  console.error("❌", e.message);
  if (e.response?.data) console.error(JSON.stringify(e.response.data, null, 2));
  process.exit(1);
});
