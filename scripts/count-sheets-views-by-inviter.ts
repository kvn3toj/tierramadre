/**
 * Count productViews rows in Sheets grouped by inviterName.
 * Helps verify what the migration will surface in /mi-perfil.
 */

import { sheets_v4 } from "@googleapis/sheets";
import { OAuth2Client } from "google-auth-library";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APP_SPREADSHEET_ID =
  process.env.APP_SPREADSHEET_ID?.trim() || "1DuOhuPcHFBhliGJG_imKWA_Yyx4dAmvmmKr4Dp2TXoM";

function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^["']|["']$/g, "").replace(/\\n/g, "").replace(/[\r\n]/g, "").trim();
}

async function main() {
  const clientId = cleanEnv(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const refreshToken = cleanEnv(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);
  const auth = new OAuth2Client(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  const sheets = new sheets_v4.Sheets({ auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: APP_SPREADSHEET_ID,
    range: `'ProductViews'!A:L`,
  });

  const rows = res.data.values ?? [];
  const dataRows = rows.slice(1);

  const byInviter = new Map<string, number>();
  let noInviter = 0;
  for (const row of dataRows) {
    const inviterName = String(row[11] ?? "").trim();
    if (!inviterName) {
      noInviter++;
      continue;
    }
    byInviter.set(inviterName, (byInviter.get(inviterName) ?? 0) + 1);
  }

  console.log(`Total views: ${dataRows.length}`);
  console.log(`Without inviter: ${noInviter}`);
  console.log(`With inviter: ${dataRows.length - noInviter}\n`);

  const sorted = Array.from(byInviter.entries()).sort((a, b) => b[1] - a[1]);
  console.log(`Views by inviter:`);
  for (const [name, count] of sorted) {
    console.log(`  ${count.toString().padStart(4)} — ${name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
