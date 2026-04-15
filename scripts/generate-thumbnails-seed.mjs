#!/usr/bin/env node
/**
 * Pre-build step: snapshot the live thumbnail index into a static JSON
 * so the client can render a full product grid on cold start (first
 * visit, no localStorage cache) without waiting for get-batch-thumbnails.
 *
 * Strategy: hit the current production URL (the previous deploy still
 * serves thumbnails during this build). Thumbnails rarely change, so a
 * slightly-stale seed is always a better first-paint than an empty grid.
 *
 * Failure is non-fatal — writes an empty seed and continues. The app
 * already falls back to the API; we just lose the fast-path for that
 * build.
 *
 * Runs automatically before tsc/vite in `npm run build`.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outPath = join(rootDir, 'public', 'thumbnails-seed.json');

const API_URL =
  process.env.THUMBNAILS_SEED_URL ||
  'https://tierra-madre-studio.vercel.app/api/get-batch-thumbnails';

const FETCH_TIMEOUT_MS = 15_000;

function writeEmptySeed(reason) {
  const payload = { thumbnails: {}, generatedAt: null, reason };
  writeFileSync(outPath, JSON.stringify(payload), 'utf8');
  console.warn(`[seed] Wrote empty seed (${reason})`);
}

async function main() {
  console.log(`[seed] Fetching thumbnails from ${API_URL}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      headers: { 'user-agent': 'tm-studio-build-seed/1.0' },
      signal: controller.signal,
    });

    if (!res.ok) {
      writeEmptySeed(`http ${res.status}`);
      return;
    }

    const data = await res.json();
    if (!data?.success || !data?.thumbnails) {
      writeEmptySeed('invalid response shape');
      return;
    }

    const payload = {
      thumbnails: data.thumbnails,
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(outPath, JSON.stringify(payload), 'utf8');
    const count = Object.keys(data.thumbnails).length;
    console.log(`[seed] Wrote ${count} thumbnails to ${outPath}`);
  } catch (err) {
    writeEmptySeed(err?.name === 'AbortError' ? 'timeout' : err?.message || 'fetch error');
  } finally {
    clearTimeout(timeout);
  }
}

main();
