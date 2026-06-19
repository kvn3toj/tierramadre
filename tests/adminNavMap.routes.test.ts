import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ADMIN_NAV_MAP } from "../src/config/adminNavMap";

/**
 * Drift guard: the admin/staff route registry (`src/config/adminNavMap.ts`) must
 * stay in sync with the `<Route>` definitions in `src/App.tsx`. A new admin/staff
 * route added without a registry entry — or a registry entry pointing at a route
 * that no longer exists — fails this test instead of silently going un-navigable.
 *
 * Assumption (documented): the only relative (nested) `<Route>` block in App.tsx is
 * under `/admin/fotosintesis`, so relative path literals are prefixed with it.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_TSX = resolve(__dirname, "../src/App.tsx");
const FOTOSINTESIS_BASE = "/admin/fotosintesis";

/** Prefixes that define the admin + staff back-office surface (excludes /provider + public). */
function isAdminStaffPath(p: string): boolean {
  return (
    p.startsWith("/admin/") ||
    p.startsWith("/cuentas") ||
    p === "/solicitudes" ||
    p === "/mi-perfil" ||
    p.startsWith("/mi-perfil/")
  );
}

function extractRoutePaths(source: string): Set<string> {
  const paths = new Set<string>();
  const re = /path="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const raw = m[1];
    if (raw === "*") continue;
    if (raw.startsWith("/")) {
      paths.add(raw);
    } else {
      // Nested (relative) route → only the Fotosíntesis block uses these.
      paths.add(`${FOTOSINTESIS_BASE}/${raw}`);
    }
  }
  return paths;
}

describe("adminNavMap ↔ App.tsx route drift", () => {
  const source = readFileSync(APP_TSX, "utf8");
  const routePaths = extractRoutePaths(source);
  const registryPaths = new Set(ADMIN_NAV_MAP.map((e) => e.path));

  it("App.tsx yielded a non-trivial set of routes", () => {
    expect(routePaths.size).toBeGreaterThan(20);
  });

  it("every registry path exists as a route in App.tsx (no dangling entries)", () => {
    const dangling = [...registryPaths].filter((p) => !routePaths.has(p));
    expect(dangling).toEqual([]);
  });

  it("every admin/staff route in App.tsx has a registry entry", () => {
    const adminStaffRoutes = [...routePaths].filter(isAdminStaffPath);
    const unmapped = adminStaffRoutes.filter((p) => !registryPaths.has(p));
    expect(unmapped).toEqual([]);
  });

  it("registry ids and paths are unique", () => {
    const ids = ADMIN_NAV_MAP.map((e) => e.id);
    const paths = ADMIN_NAV_MAP.map((e) => e.path);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("dynamic flag matches presence of :params in the path", () => {
    for (const e of ADMIN_NAV_MAP) {
      const hasPlaceholder = /:[A-Za-z]/.test(e.path);
      expect(e.dynamic).toBe(hasPlaceholder);
      if (hasPlaceholder) {
        expect(e.params?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });
});
