/**
 * Quick check: how much data is in Convex (invitations + productViews)?
 * Also compares inviterName distribution.
 *
 * Usage:
 *   CONVEX_URL=https://wandering-parrot-148.convex.cloud \
 *     npx tsx scripts/check-convex-state.ts
 *   CONVEX_URL=https://wandering-parrot-148.convex.cloud \
 *     npx tsx scripts/check-convex-state.ts --inviter "Kevin Pineda Perez"
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) throw new Error("CONVEX_URL not found");
const convex = new ConvexHttpClient(CONVEX_URL);

async function main() {
  const inviterArg = process.argv.find((_, i) => process.argv[i - 1] === "--inviter");
  const inviter = inviterArg || "Kevin Pineda Perez";
  console.log(`Convex: ${CONVEX_URL}\n`);

  const views = (await convex.query(api.productViews.guestActivity, {
    inviterName: inviter,
    limit: 1000,
  })) as Record<string, unknown>[];

  console.log(`=== productViews for inviter "${inviter}" ===`);
  console.log(`Count: ${views.length}`);
  if (views.length > 0) {
    console.log(`\nMost recent 5:`);
    for (const v of views.slice(0, 5)) {
      console.log(
        `  ${v.timestamp} | ${v.userName ?? "(anon)"} → item ${v.itemId} (${v.productName ?? ""})`
      );
    }

    const byGuest = new Map<string, number>();
    for (const v of views) {
      const name = String(v.userName ?? "(anon)");
      byGuest.set(name, (byGuest.get(name) ?? 0) + 1);
    }
    console.log(`\nGuests (top 10 by view count):`);
    const sorted = Array.from(byGuest.entries()).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sorted.slice(0, 10)) {
      console.log(`  ${count.toString().padStart(4)} views — ${name}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
