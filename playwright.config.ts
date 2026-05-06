/**
 * Playwright configuration for end-to-end specs.
 *
 * Specs live under `e2e/`. The dev server is started in `VITE_TEST_MODE`
 * which swaps the Convex client for an in-memory stub so we don't talk
 * to a real backend.
 *
 * Run locally:
 *   npx playwright install (one-time)
 *   npm run test:e2e
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    actionTimeout: 8_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...(process.env as Record<string, string>),
      VITE_TEST_MODE: "1",
    },
  },
});
