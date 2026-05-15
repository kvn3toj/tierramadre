import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
// PWA disabled - vite-plugin-pwa not generating files correctly
// import { VitePWA } from 'vite-plugin-pwa'

// VITE_TEST_MODE swaps the Convex client for an in-memory stub so
// Playwright specs can exercise the admin panel without a real Convex
// deployment. Production builds never see this branch.
const isTestMode = process.env.VITE_TEST_MODE === "1";
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const convexSafeStub = path.resolve(
  projectRoot,
  "src/lib/convex-safe.test-stub.ts",
);

export default defineConfig({
  base: "/",
  cacheDir: "/tmp/vite-deps-cache",
  plugins: [
    react(),
    // PWA temporarily disabled due to SW generation issues
    // Re-enable when vite-plugin-pwa is working correctly
    isTestMode && {
      // Custom resolver — runs before the default node-modules resolution
      // so any import that ends in `lib/convex-safe` (regardless of the
      // relative-segment depth) is rewritten to the in-memory stub. The
      // standard `resolve.alias` regex form was being skipped on relative
      // specifiers in Vite 5.4, hence this explicit hook.
      name: "tm-test-mode-stub",
      enforce: "pre" as const,
      resolveId(source: string) {
        if (/(?:^|\/)lib\/convex-safe(?:\.[jt]sx?)?$/.test(source)) {
          return convexSafeStub;
        }
        return null;
      },
    },
  ].filter(Boolean),
  server: {
    port: 3000,
    open: true,
    // Proxy API requests to production for local development
    // This allows local dev to fetch real data from Vercel serverless functions
    proxy: {
      "/api/": {
        target: "https://tierra-madre-studio.vercel.app",
        changeOrigin: true,
        secure: true,
        // Rewrite to ensure correct path
        rewrite: (path) => path,
      },
    },
  },
  optimizeDeps: {
    include: [
      "@emotion/react",
      "@emotion/styled",
      "@mui/material",
      "@mui/material/styles",
    ],
  },
  build: {
    // Let Vite handle chunk splitting automatically
    // Custom manualChunks was causing "Cannot access uninitialized variable" errors
    // due to incorrect module ordering in the bundled output
    chunkSizeWarningLimit: 800,
  },
});
