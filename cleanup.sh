#!/bin/bash
# =============================================================
# Tierra Madre Studio — Project Cleanup Script
# Run from project root: bash cleanup.sh
# =============================================================
# This script removes obsolete files identified during the
# architecture review. The docs/ reorganization has already
# been done — this handles deletions only.
# =============================================================

set -e
echo "🧹 Tierra Madre Studio — Cleanup Script"
echo "========================================="
echo ""

# --- 1. Remove build artifacts ---
echo "1/7 Removing build artifacts..."
rm -rf dist/ build/
rm -f tsconfig.tsbuildinfo tsconfig.node.tsbuildinfo
rm -f vite.config.js vite.config.d.ts
echo "  ✓ dist/, build/, tsbuildinfo, obsolete vite configs removed"

# --- 2. Remove root-level test files ---
echo "2/7 Removing obsolete root test files..."
rm -f test-blinking.cjs test-blinking-simple.cjs
rm -f test-api-loading.mjs test-product-views.mjs
rm -f test-invitation.mjs test-video-requests.mjs
echo "  ✓ 6 root test files removed"

# --- 3. Remove test/export artifacts ---
echo "3/7 Removing test screenshots, results, and exports..."
rm -rf test-screenshots/ test-results/ exports/
echo "  ✓ test-screenshots/, test-results/, exports/ removed"

# --- 4. Remove obsolete scripts (38 files) ---
echo "4/7 Removing obsolete scripts..."
cd scripts/
rm -f analyze-all-validations.mjs analyze-hoja2-cualificacion.mjs
rm -f apply-sheet-styling.mjs auto-fill-factor-calidad.mjs
rm -f check-column-alignment.mjs check-columns.mjs
rm -f check-local-images.js check-missing-prices.mjs
rm -f check-pricing-column-d.mjs check-pricing-dropdowns.mjs
rm -f check-treasure-column-o.mjs
rm -f create-asesores-sheet.mjs create-feedback-spreadsheet.js
rm -f download-all-images.mjs export-images.mjs extract-catalog-media.mjs
rm -f FeedbackAppsScript.gs google-apps-script-cloudinary.js
rm -f fix-calidad-typos.mjs fix-column-o-nacional.mjs
rm -f fix-data-validation.mjs fix-dropdown-columns.mjs
rm -f fix-hoja2-cualificacion.mjs fix-pricing-column-d.mjs
rm -f fix-pricing-dropdowns.mjs fix-tildes-treasure.mjs
rm -f fix-treasure-column-o.mjs fix-treasure-inconsistencies.mjs
rm -f fix-validation-q-r.mjs
rm -f run-setup-feedback.mjs setup-feedback-sheet.js
rm -f sync-prices-from-sheets.mjs sync-prices-to-sheets.mjs
rm -f sync-prices-to-treasure.mjs sync-pricing-from-treasure.mjs
rm -f test-carousel.mjs test-google-auth.mjs
rm -f update-headers.mjs upload-pdfs-cloudinary.mjs
cd ..
echo "  ✓ 38 obsolete scripts removed"
echo "  Kept: update-version.mjs, generate-refresh-token.mjs, migrate-sheets.mjs,"
echo "        get-oauth-token.js, google-oauth-setup.mjs, transfer-folder-ownership.mjs,"
echo "        prepare-ceo-videos.sh, generate-icons.mjs, collection-json-template.json,"
echo "        UPDATE_COLLECTION_JSON.md"

# --- 5. Remove miscellaneous obsolete files ---
echo "5/7 Removing misc obsolete files..."
rm -f product-management.plugin
rm -f .DS_Store docs/.DS_Store
echo "  ✓ Misc files removed"

# --- 6. Untrack gitignored files from git ---
echo "6/7 Removing gitignored files from git tracking..."
git rm -r --cached dist/ 2>/dev/null || true
git rm -r --cached build/ 2>/dev/null || true
git rm --cached tsconfig.tsbuildinfo 2>/dev/null || true
git rm --cached tsconfig.node.tsbuildinfo 2>/dev/null || true
git rm --cached vite.config.js 2>/dev/null || true
git rm --cached vite.config.d.ts 2>/dev/null || true
git rm --cached .DS_Store 2>/dev/null || true
git rm --cached "docs/.DS_Store" 2>/dev/null || true
git rm -r --cached test-screenshots/ 2>/dev/null || true
git rm -r --cached test-results/ 2>/dev/null || true
git rm -r --cached exports/ 2>/dev/null || true
git rm --cached product-management.plugin 2>/dev/null || true
git rm -r --cached .vercel/ 2>/dev/null || true
echo "  ✓ Gitignored files untracked"

# --- 7. Remove empty src directories ---
echo "7/7 Cleaning empty directories..."
find src/ -type d -empty -delete 2>/dev/null || true
echo "  ✓ Empty directories cleaned"

echo ""
echo "========================================="
echo "✅ Cleanup complete!"
echo ""
echo "Remaining structure:"
echo "  scripts/  → 10 active utility scripts"
echo "  docs/"
echo "    guides/    → How-to & setup documentation"
echo "    reference/ → Strategy docs, PRDs, plans"
echo "    media/     → Photos, videos, AI-generated images"
echo "    brand/     → Brand assets (existing)"
echo "    catallogs/ → Catalog PDFs (existing)"
echo "    inventario/→ Inventory data (existing)"
echo ""
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Stage all: git add -A"
echo "  3. Commit: git commit -m 'chore: clean project architecture — remove obsolete files, reorganize docs'"
echo "  4. Verify build: npm run build"
echo ""
echo "🗑️  This cleanup script can now be deleted: rm cleanup.sh"
