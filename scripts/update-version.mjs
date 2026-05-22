#!/usr/bin/env node
/**
 * Update version.json and index.html APP_VERSION for Safari cache busting
 * Runs automatically before each build
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Generate version: YYYY.MM.DD.N (N = build number for the day, based on hour)
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, "0");
const day = String(now.getDate()).padStart(2, "0");
const buildNum = Math.floor(now.getHours() * 60 + now.getMinutes()); // Unique per minute

const version = `${year}.${month}.${day}.${buildNum}`;
const buildTime = now.toISOString();

console.log(`📦 Updating version to: ${version}`);

// Update version.json
const versionJsonPath = join(rootDir, "public", "version.json");
const versionData = { version, buildTime };
writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + "\n");
console.log(`✅ Updated ${versionJsonPath}`);

// Update index.html APP_VERSION
const indexPath = join(rootDir, "index.html");
let indexContent = readFileSync(indexPath, "utf-8");

// Replace APP_VERSION in the script — matches either single or double quotes.
const versionRegex = /var APP_VERSION = ["']([^"']+)["']/;
if (versionRegex.test(indexContent)) {
  indexContent = indexContent.replace(
    versionRegex,
    `var APP_VERSION = "${version}"`,
  );
  writeFileSync(indexPath, indexContent);
  console.log(`✅ Updated APP_VERSION in index.html`);
} else {
  console.error(
    "❌ Could not find APP_VERSION in index.html — refusing to build (would cause refresh loop).",
  );
  process.exit(1);
}

console.log(`🚀 Build version: ${version}`);
