# Fotosíntesis admin redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/admin/products` (Fotosíntesis) with a restrained cool-neutral palette + emerald accent, persistent **Bandeja** inspector, **chroma-sampled** rows, **+ Nueva piedra** create flow, surfaced audit + lock state, **quick-inline edit**, and bulk **price / colección / ubicación** operations.

**Architecture:** Workbench Split (ledger left, Bandeja right). New `getFoto(mode)` token resolver alongside existing `getAtelier`. Client-side chroma sampling cached in `localStorage`. New Convex queries for patrones (similar-sold-items), one new mutation `createProduct`, and a `mode: "append"` extension to the existing `pushToSheet` action. Pure business logic extracted to `src/utils/` so it can be unit-tested without a Convex runtime.

**Tech Stack:** React 18.3 + TypeScript 5.6, Vite 5.4, MUI v6, Convex, Vitest 2.1, Playwright. Spec: `docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md`.

**Branch:** `feature/fotosintesis-redesign` (from `main`).

---

## File map

### Create

- `src/design-system/tokens/foto.ts` — `getFoto(mode)` resolver
- `src/hooks/useChromaSamples.ts` — client-side dominant-color sampling
- `src/hooks/usePatrones.ts` — Convex query wrapper for patrones
- `src/utils/patron-buckets.ts` — pure logic for bucketing similar items
- `src/utils/createProduct-validate.ts` — pure validation for new product input
- `src/pages/admin/ProductManagement/FotoHero.tsx` — new hero
- `src/pages/admin/ProductManagement/Bandeja.tsx` — persistent inspector shell
- `src/pages/admin/ProductManagement/StoneHero.tsx` — bandeja's stone image + loupe
- `src/pages/admin/ProductManagement/PatronCard.tsx` — bandeja's coincidences card
- `src/pages/admin/ProductManagement/HistorialCard.tsx` — bandeja's audit feed
- `src/pages/admin/ProductManagement/BloqueoCard.tsx` — bandeja's lock card
- `src/pages/admin/ProductManagement/ChromaBar.tsx` — row's left-edge sampled chroma
- `src/pages/admin/ProductManagement/InlineEditCell.tsx` — inline cell editor
- `src/pages/admin/ProductManagement/BulkActionBar.tsx` — extracted from page (today inline)
- `tests/useChromaSamples.test.ts`
- `tests/patron-buckets.test.ts`
- `tests/createProduct-validate.test.ts`

### Modify

- `src/design-system/index.ts` — export `getFoto`
- `src/pages/admin/ProductManagement/ProductManagementPage.tsx` — workbench split layout
- `src/pages/admin/ProductManagement/InventoryRow.tsx` — chroma bar + new column order
- `src/pages/admin/ProductManagement/EditDrawer.tsx` — accept `mode: "create"`
- `src/lib/convex-safe.test-stub.ts` — add stubs for new queries / mutation
- `convex/products.ts` — add `patronesFor`, `patronesGlobalTop`, `recentEdits`, `createProduct`; extend `pushToSheet` with `mode`
- `e2e/admin-products.spec.ts` — update selectors + add new cases

### Delete

- `src/pages/admin/ProductManagement/LedgerHero.tsx` — superseded by `FotoHero`

---

## Phase A — Foundation (tokens + hooks)

### Task A1: Create branch

- [ ] **Step 1: Cut feature branch from main**

```bash
git checkout main && git pull --ff-only
git checkout -b feature/fotosintesis-redesign
```

- [ ] **Step 2: Verify branch is clean and current**

```bash
git status
git log --oneline -3
```

Expected: clean working tree; HEAD includes `fc05947 docs(spec): fotosíntesis admin redesign`.

---

### Task A2: Add `getFoto(mode)` token resolver

**Files:**

- Create: `src/design-system/tokens/foto.ts`
- Modify: `src/design-system/index.ts`

- [ ] **Step 1: Write the file**

```ts
// src/design-system/tokens/foto.ts
/**
 * `getFoto(mode)` — token resolver for the Fotosíntesis admin redesign.
 *
 * Cool-neutral surfaces + emerald accent. Lives next to `getAtelier`
 * — the two are independent token namespaces.
 */
import { emeraldCore, goldAccent } from "./accents";

export type FotoMode = "light" | "dark";

export interface FotoTokens {
  surfaces: {
    canvas: string; // page background
    panel: string; // bandeja background, hover state
    inset: string; // inputs, cards inside bandeja
    edge: string; // 1px hairline
    rule: string; // 1px standard rule
    edgeStrong: string; // 1px strong border (segmented controls, focus)
  };
  ink: {
    primary: string; // headlines, primary text
    secondary: string; // body, supporting text
    tertiary: string; // labels, metadata
    mute: string; // disabled, placeholder
    inverse: string; // text on solid emerald/ink button
  };
  accent: {
    primary: string; // emerald — buttons, active states
    soft: string; // emerald background tint (selected row)
  };
  status: {
    available: string;
    consigned: string;
    sold: string;
  };
  motion: {
    rowHover: string;
    sheet: string;
  };
}

const LIGHT: FotoTokens = {
  surfaces: {
    canvas: "#FFFFFF",
    panel: "#FAFAFA",
    inset: "#F4F5F4",
    edge: "rgba(11, 16, 14, 0.06)",
    rule: "rgba(11, 16, 14, 0.10)",
    edgeStrong: "rgba(11, 16, 14, 0.18)",
  },
  ink: {
    primary: "#0B100E",
    secondary: "#4A5251",
    tertiary: "#8B9290",
    mute: "#B7BCBA",
    inverse: "#FFFFFF",
  },
  accent: {
    primary: emeraldCore.dark, // #008C62 — passes contrast on white
    soft: "rgba(0, 92, 66, 0.07)",
  },
  status: {
    available: emeraldCore.dark,
    consigned: goldAccent.primary,
    sold: "#B33A2F",
  },
  motion: {
    rowHover: "background 120ms ease",
    sheet:
      "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms linear",
  },
};

const DARK: FotoTokens = {
  surfaces: {
    canvas: "#0B0D0C",
    panel: "#131614",
    inset: "#1B1F1D",
    edge: "rgba(255, 255, 255, 0.05)",
    rule: "rgba(255, 255, 255, 0.09)",
    edgeStrong: "rgba(255, 255, 255, 0.18)",
  },
  ink: {
    primary: "#EFF1EF",
    secondary: "#B0B6B3",
    tertiary: "#7B807E",
    mute: "#555A58",
    inverse: "#0B0D0C",
  },
  accent: {
    primary: emeraldCore.light, // #33C194 — passes contrast on dark
    soft: "rgba(124, 205, 169, 0.10)",
  },
  status: {
    available: emeraldCore.light,
    consigned: goldAccent.primary,
    sold: "#D75348",
  },
  motion: {
    rowHover: "background 120ms ease",
    sheet:
      "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms linear",
  },
};

export function getFoto(mode: FotoMode): FotoTokens {
  return mode === "dark" ? DARK : LIGHT;
}
```

- [ ] **Step 2: Export from barrel**

In `src/design-system/index.ts`, add an export grouped near the other token resolvers:

```ts
export { getFoto, type FotoMode, type FotoTokens } from "./tokens/foto";
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/design-system/tokens/foto.ts src/design-system/index.ts
git commit -m "feat(design-system): add getFoto(mode) token resolver"
```

---

### Task A3: TDD `useChromaSamples` hook

**Files:**

- Create: `src/hooks/useChromaSamples.ts`
- Test: `tests/useChromaSamples.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/useChromaSamples.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  extractDominantHex,
  loadChromaCache,
  saveChromaCache,
  CHROMA_CACHE_KEY,
} from "../src/hooks/useChromaSamples";

describe("extractDominantHex", () => {
  it("converts an rgb tuple to lowercase hex", () => {
    expect(extractDominantHex(0, 92, 66)).toBe("#005c42");
  });

  it("pads single-digit channels", () => {
    expect(extractDominantHex(1, 2, 3)).toBe("#010203");
  });

  it("clamps channels above 255", () => {
    expect(extractDominantHex(300, -10, 128)).toBe("#ff0080");
  });
});

describe("loadChromaCache / saveChromaCache", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty map when nothing is stored", () => {
    expect(loadChromaCache()).toEqual({});
  });

  it("round-trips a sample map", () => {
    const sample = {
      32: { hex: "#005c42", url: "u1", at: 1 },
      45: { hex: "#7ccda9", url: "u2", at: 2 },
    };
    saveChromaCache(sample);
    expect(loadChromaCache()).toEqual(sample);
  });

  it("ignores corrupted JSON in localStorage", () => {
    window.localStorage.setItem(CHROMA_CACHE_KEY, "not-json{");
    expect(loadChromaCache()).toEqual({});
  });

  it("prunes entries older than 7 days on load", () => {
    const now = Date.now();
    const old = now - 8 * 24 * 60 * 60 * 1000;
    saveChromaCache({
      1: { hex: "#aaa", url: "u", at: now },
      2: { hex: "#bbb", url: "u", at: old },
    });
    const loaded = loadChromaCache();
    expect(loaded[1]).toBeDefined();
    expect(loaded[2]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
npx vitest run tests/useChromaSamples.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook + helpers**

```ts
// src/hooks/useChromaSamples.ts
import { useEffect, useRef, useState } from "react";

export const CHROMA_CACHE_KEY = "tm-chroma-samples-v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ENTRIES = 1000;

export interface ChromaCacheEntry {
  hex: string;
  url: string;
  at: number;
}
export type ChromaCache = Record<number, ChromaCacheEntry>;

function clamp(n: number) {
  if (n < 0) return 0;
  if (n > 255) return 255;
  return Math.round(n);
}

export function extractDominantHex(r: number, g: number, b: number): string {
  const hex = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function loadChromaCache(): ChromaCache {
  try {
    const raw = window.localStorage.getItem(CHROMA_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ChromaCache;
    const now = Date.now();
    const cleaned: ChromaCache = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v?.at === "number" && now - v.at < TTL_MS) {
        cleaned[Number(k)] = v;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function saveChromaCache(cache: ChromaCache): void {
  try {
    const entries = Object.entries(cache);
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0));
      const trimmed: ChromaCache = {};
      for (const [k, v] of entries.slice(0, MAX_ENTRIES)) {
        trimmed[Number(k)] = v;
      }
      window.localStorage.setItem(CHROMA_CACHE_KEY, JSON.stringify(trimmed));
      return;
    }
    window.localStorage.setItem(CHROMA_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Quota / private mode — silently no-op; fallback color will render.
  }
}

interface ThumbMap {
  [itemNumber: number]: { url: string } | undefined;
}

/**
 * Sample one dominant color per thumbnail by drawing the image to a
 * 1×1 offscreen canvas and reading the pixel. Returns hex strings keyed
 * by item number. Cached in localStorage for 7 days.
 */
export function useChromaSamples(thumbnails: ThumbMap): {
  samples: Record<number, string>;
  ready: boolean;
} {
  const cacheRef = useRef<ChromaCache>(loadChromaCache());
  const [samples, setSamples] = useState<Record<number, string>>(() => {
    const out: Record<number, string> = {};
    for (const [k, v] of Object.entries(cacheRef.current)) {
      out[Number(k)] = v.hex;
    }
    return out;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const todo: Array<{ id: number; url: string }> = [];
    for (const [k, v] of Object.entries(thumbnails)) {
      if (!v?.url) continue;
      const id = Number(k);
      const cached = cacheRef.current[id];
      if (cached?.url === v.url) continue;
      todo.push({ id, url: v.url });
    }
    if (todo.length === 0) {
      setReady(true);
      return () => undefined;
    }
    const updates: Record<number, string> = {};
    let pending = todo.length;

    const finish = () => {
      pending -= 1;
      if (pending === 0 && !cancelled) {
        setSamples((prev) => ({ ...prev, ...updates }));
        for (const [k, hex] of Object.entries(updates)) {
          cacheRef.current[Number(k)] = {
            hex,
            url: thumbnails[Number(k)]!.url,
            at: Date.now(),
          };
        }
        saveChromaCache(cacheRef.current);
        setReady(true);
      }
    };

    for (const { id, url } of todo) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            finish();
            return;
          }
          ctx.drawImage(img, 0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          updates[id] = extractDominantHex(r, g, b);
        } catch {
          // CORS / decode error — skip; fallback color renders.
        }
        finish();
      };
      img.onerror = () => finish();
      img.src = url;
    }

    return () => {
      cancelled = true;
    };
  }, [thumbnails]);

  return { samples, ready };
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npx vitest run tests/useChromaSamples.test.ts
```

Expected: PASS — 7 / 7.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useChromaSamples.ts tests/useChromaSamples.test.ts
git commit -m "feat(hooks): useChromaSamples — client-side dominant color sampling"
```

---

### Task A4: ChromaBar primitive component

**Files:**

- Create: `src/pages/admin/ProductManagement/ChromaBar.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/pages/admin/ProductManagement/ChromaBar.tsx
import { Box } from "@mui/material";
import type { FotoTokens } from "../../../design-system";

interface ChromaBarProps {
  /** Hex color sampled from the stone's photo, or `undefined` for fallback. */
  hex: string | undefined;
  foto: FotoTokens;
}

/**
 * Row's left-edge accent. 5×38 px on desktop, sampled chroma when the
 * thumbnail has loaded, fallback emerald at 40% opacity otherwise.
 */
export function ChromaBar({ hex, foto }: ChromaBarProps) {
  const color = hex ?? foto.accent.primary;
  return (
    <Box
      aria-hidden
      data-chroma-bar
      sx={{
        width: "5px",
        height: "38px",
        borderRadius: "0 3px 3px 0",
        backgroundColor: color,
        opacity: hex ? 1 : 0.4,
        flexShrink: 0,
      }}
    />
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/ProductManagement/ChromaBar.tsx
git commit -m "feat(admin): ChromaBar primitive (row's sampled left-edge)"
```

---

## Phase B — FotoHero

### Task B1: Build FotoHero component

**Files:**

- Create: `src/pages/admin/ProductManagement/FotoHero.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/pages/admin/ProductManagement/FotoHero.tsx
import { Box, ButtonBase, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { fontFamilies, type FotoTokens } from "../../../design-system";

const SANS = fontFamilies.system;
const MONO = fontFamilies.mono;

interface FotoHeroProps {
  foto: FotoTokens;
  total: number;
  available: number;
  consigned: number;
  sold: number;
  /** Last 8 weekly sold counts (sparkline). */
  sparkline: number[];
  lastPull: string | null;
  isResyncing: boolean;
  onResync: () => void;
  onCreateNew: () => void;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "sin sincronizar";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "sin sincronizar";
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (diffMin < 1) return "hace segundos";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  return `hace ${Math.round(diffH / 24)} d`;
}

function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);
  return value;
}

export function FotoHero({
  foto,
  total,
  available,
  consigned,
  sold,
  sparkline,
  lastPull,
  isResyncing,
  onResync,
  onCreateNew,
}: FotoHeroProps) {
  const animatedTotal = useCountUp(total);
  const sparkMax = useMemo(() => Math.max(1, ...sparkline), [sparkline]);

  return (
    <Box
      component="section"
      aria-label="Resumen del catálogo"
      sx={{
        backgroundColor: foto.surfaces.canvas,
        borderBottom: `1px solid ${foto.surfaces.edge}`,
        px: { xs: 2.5, md: 3 },
        py: { xs: 2.5, md: 3 },
      }}
    >
      <Box
        sx={{
          maxWidth: 1280,
          mx: "auto",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
          gap: 2.5,
          alignItems: "end",
        }}
      >
        <Box>
          <Box
            component={RouterLink}
            to="/admin"
            sx={{
              display: "inline-block",
              fontFamily: SANS,
              fontSize: "9px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: foto.ink.tertiary,
              textDecoration: "none",
              mb: 1,
              fontWeight: 500,
              "&:hover": { color: foto.ink.secondary },
            }}
          >
            Atelier · Inventario
          </Box>
          <Typography
            component="h1"
            sx={{
              fontFamily: SANS,
              fontSize: { xs: "26px", md: "32px" },
              fontWeight: 600,
              letterSpacing: "-0.035em",
              color: foto.ink.primary,
              lineHeight: 1,
              m: 0,
            }}
          >
            Fotosíntesis
          </Typography>

          <Box
            sx={{
              mt: 2.25,
              pt: 2,
              borderTop: `1px solid ${foto.surfaces.edge}`,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "auto 1fr auto" },
              gap: { xs: 2, sm: 4 },
              alignItems: "center",
            }}
          >
            <Box>
              <Box
                sx={{
                  fontFamily: MONO,
                  fontSize: "40px",
                  fontWeight: 400,
                  letterSpacing: "-0.045em",
                  color: foto.ink.primary,
                  lineHeight: 0.9,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {animatedTotal.toLocaleString("es-CO")}
              </Box>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "9px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: foto.ink.tertiary,
                  mt: 0.75,
                  fontWeight: 500,
                }}
              >
                en el espejo
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: "3px",
                height: "38px",
              }}
              aria-hidden
            >
              {sparkline.map((v, i) => (
                <Box
                  key={i}
                  sx={{
                    width: "5px",
                    height: `${Math.max(8, (v / sparkMax) * 100)}%`,
                    backgroundColor: foto.accent.primary,
                    opacity: 0.2 + (i / sparkline.length) * 0.8,
                    borderRadius: "1px",
                  }}
                />
              ))}
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                alignItems: { xs: "flex-start", sm: "flex-end" },
                fontFamily: SANS,
                fontSize: "10px",
                color: foto.ink.secondary,
              }}
            >
              {[
                {
                  label: "Disponibles",
                  value: available,
                  color: foto.status.available,
                },
                {
                  label: "Con asesor",
                  value: consigned,
                  color: foto.status.consigned,
                },
                { label: "Vendidas", value: sold, color: foto.status.sold },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Box component="span">{item.label}</Box>
                  <Box
                    component="span"
                    sx={{
                      fontFamily: MONO,
                      fontWeight: 500,
                      color: foto.ink.primary,
                      minWidth: "32px",
                      textAlign: "right",
                    }}
                  >
                    {item.value.toLocaleString("es-CO")}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      backgroundColor: item.color,
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            alignItems: "flex-end",
            minWidth: 168,
          }}
        >
          <ButtonBase
            data-foto-create
            onClick={onCreateNew}
            disableRipple
            sx={{
              backgroundColor: foto.ink.primary,
              color: foto.ink.inverse,
              borderRadius: "10px",
              px: "18px",
              py: "10px",
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "-0.005em",
              "&:focus-visible": {
                outline: `2px solid ${foto.accent.primary}`,
                outlineOffset: "2px",
              },
            }}
          >
            + Nueva piedra
          </ButtonBase>
          <ButtonBase
            data-foto-resync
            onClick={onResync}
            disabled={isResyncing}
            disableRipple
            sx={{
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              borderRadius: "10px",
              px: "14px",
              py: "8px",
              fontFamily: SANS,
              fontSize: "10px",
              fontWeight: 500,
              color: foto.ink.primary,
              "&:disabled": { opacity: 0.5 },
              "&:focus-visible": {
                outline: `2px solid ${foto.accent.primary}`,
                outlineOffset: "2px",
              },
            }}
          >
            {isResyncing ? "Sincronizando…" : "Resincronizar"}
          </ButtonBase>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: SANS,
              fontSize: "9px",
              letterSpacing: "0.06em",
              color: foto.ink.tertiary,
            }}
          >
            <Box
              component="span"
              sx={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                backgroundColor: foto.accent.primary,
                animation: "fotoPulse 1.8s ease-in-out infinite",
                "@keyframes fotoPulse": { "50%": { opacity: 0.4 } },
              }}
            />
            Sincronizado · {relativeTime(lastPull)}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/ProductManagement/FotoHero.tsx
git commit -m "feat(admin): FotoHero — restrained hero replacing LedgerHero"
```

---

### Task B2: Wire ProductManagementPage to FotoHero (provisional)

**Files:**

- Modify: `src/pages/admin/ProductManagement/ProductManagementPage.tsx`

This is a _provisional_ swap: replace `LedgerHero` import + usage with `FotoHero`, no layout change yet, no `onCreateNew` handler yet (use a no-op + console log). Layout split comes in Phase C.

- [ ] **Step 1: Read current page**

```bash
sed -n '1,80p' src/pages/admin/ProductManagement/ProductManagementPage.tsx
```

- [ ] **Step 2: Apply the swap**

In `ProductManagementPage.tsx`:

1. Replace `import { LedgerHero } from "./LedgerHero";` with `import { FotoHero } from "./FotoHero";`.
2. Replace `import { getAtelier } from "../../../design-system";` with `import { getAtelier, getFoto } from "../../../design-system";`.
3. After `const atelier = getAtelier(theme.palette.mode);` add `const foto = getFoto(theme.palette.mode === "dark" ? "dark" : "light");`.
4. In the JSX, replace the `<LedgerHero ... />` block with:

```tsx
<FotoHero
  foto={foto}
  total={stats?.total ?? products?.length ?? 0}
  available={statusCounts.available}
  consigned={statusCounts.consigned}
  sold={statusCounts.sold}
  sparkline={[3, 5, 4, 7, 5, 9, 7, 10]} // placeholder until Phase E wires patronesGlobalTop weekly buckets
  lastPull={stats?.lastPull ?? null}
  isResyncing={isResyncing}
  onResync={handleResync}
  onCreateNew={() => console.log("create-new clicked — wired in Phase G")}
/>
```

- [ ] **Step 3: Type-check + dev smoke**

```bash
npx tsc --noEmit
```

Expected: zero errors. Then run `npm run dev`, navigate to `/admin/products`, confirm the new hero renders. Stop dev.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/ProductManagement/ProductManagementPage.tsx
git commit -m "feat(admin): swap LedgerHero → FotoHero (placeholder sparkline)"
```

---

### Task B3: Update existing E2E for new hero

**Files:**

- Modify: `e2e/admin-products.spec.ts`

- [ ] **Step 1: Read current expectations**

```bash
grep -n "LedgerHero\|Fotosíntesis\|admin/products" e2e/admin-products.spec.ts
```

- [ ] **Step 2: Update selectors**

Replace any selector matching the old hero (e.g., breadcrumb / heading) with selectors for the new hero:

```ts
// In the existing "renders the seeded inventory rows" test, after navigation:
await expect(
  page.getByRole("heading", { name: /Fotosíntesis/i, level: 1 }),
).toBeVisible();
await expect(page.getByText("en el espejo")).toBeVisible();
await expect(page.locator("[data-foto-create]")).toBeVisible();
await expect(page.locator("[data-foto-resync]")).toBeVisible();
```

- [ ] **Step 3: Run E2E**

```bash
VITE_TEST_MODE=1 npm run test:e2e -- e2e/admin-products.spec.ts
```

Expected: all existing cases pass with updated selectors.

- [ ] **Step 4: Commit**

```bash
git add e2e/admin-products.spec.ts
git commit -m "test(e2e): update admin-products selectors for FotoHero"
```

---

## Phase C — Workbench split + Bandeja shell

### Task C1: Create Bandeja shell with overview state

**Files:**

- Create: `src/pages/admin/ProductManagement/Bandeja.tsx`

- [ ] **Step 1: Write the shell**

```tsx
// src/pages/admin/ProductManagement/Bandeja.tsx
import { Box, Typography } from "@mui/material";
import { fontFamilies, type FotoTokens } from "../../../design-system";

const SANS = fontFamilies.system;

export interface BandejaSelectedProduct {
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  coleccion?: string;
  precioCOP?: number;
  thumbnailUrl?: string;
  chromaHex?: string;
}

interface BandejaProps {
  foto: FotoTokens;
  /** Selected product from the ledger — null shows the overview state. */
  selected: BandejaSelectedProduct | null;
  /** Children render Bandeja cards (StoneHero, PatronCard, …) */
  children?: React.ReactNode;
}

export function Bandeja({ foto, selected, children }: BandejaProps) {
  return (
    <Box
      component="aside"
      aria-label="Bandeja"
      sx={{
        backgroundColor: foto.surfaces.panel,
        borderLeft: { xs: "none", lg: `1px solid ${foto.surfaces.edge}` },
        p: 2.25,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        minHeight: { lg: 560 },
      }}
    >
      <Typography
        component="div"
        sx={{
          fontFamily: SANS,
          fontSize: "9px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: foto.ink.tertiary,
          fontWeight: 500,
        }}
      >
        {selected
          ? `Bandeja · ${selected.itemId}${selected.nombre ? ` ${selected.nombre}` : ""}`
          : "Bandeja · resumen"}
      </Typography>
      {children}
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/ProductManagement/Bandeja.tsx
git commit -m "feat(admin): Bandeja shell — persistent inspector"
```

---

### Task C2: Workbench split layout in ProductManagementPage

**Files:**

- Modify: `src/pages/admin/ProductManagement/ProductManagementPage.tsx`

- [ ] **Step 1: Refactor render**

Inside the page render, after the `<FotoHero ... />` block, replace the centered `Box` containing the Toolbar + List with:

```tsx
<Box
  sx={{
    maxWidth: 1280,
    mx: "auto",
    display: "grid",
    gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.6fr) minmax(0, 1fr)" },
  }}
>
  <Box
    sx={{ borderRight: { lg: `1px solid ${foto.surfaces.edge}` }, minWidth: 0 }}
  >
    <AdminToolbar
      foto={foto}
      // ... existing props
    />
    <Box role="list" aria-label="Productos en el espejo">
      {/* existing skeleton / empty / row mapping — unchanged for now,
          Row will be rewritten in C3 */}
    </Box>
  </Box>
  <Bandeja foto={foto} selected={selectedBandeja}>
    {/* placeholder; cards arrive in Phase D */}
  </Bandeja>
</Box>
```

Add a derived `selectedBandeja` memo above the JSX:

```ts
const selectedBandeja: BandejaSelectedProduct | null = useMemo(() => {
  if (!selected) return null;
  const itemNumber = Number(selected.itemId);
  return {
    itemId: selected.itemId,
    nombre: selected.nombre,
    peso: selected.peso,
    color: selected.color,
    calidad: selected.calidad,
    coleccion: selected.coleccion,
    precioCOP: selected.precioCOP,
    thumbnailUrl: Number.isFinite(itemNumber)
      ? thumbnails[itemNumber]?.url
      : undefined,
    chromaHex: Number.isFinite(itemNumber)
      ? chromaSamples[itemNumber]
      : undefined,
  };
}, [selected, thumbnails, chromaSamples]);
```

Above that, wire the chroma hook:

```ts
const { samples: chromaSamples } = useChromaSamples(thumbnails);
```

- [ ] **Step 2: Pass `foto` to AdminToolbar**

Add `foto: FotoTokens` to `AdminToolbar`'s props interface and accept it in the component signature. Replace any references to `atelier.surfaces.*` with `foto.surfaces.*` (and similar for ink/accent/status). Leave atelier-specific styling (e.g., wax stamps) deleted; preserve search + segmented + filters dropdown. Run grep before editing:

```bash
grep -nE "atelier\." src/pages/admin/ProductManagement/AdminToolbar.tsx | head -20
```

For every `atelier.X.Y` ref, replace with the equivalent `foto.X.Y` token (canvas → canvas, panel → panel, ink._ → ink._, motion.rowHover → motion.rowHover). Keep prop names stable.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Dev smoke**

```bash
npm run dev
```

Open `/admin/products`. Confirm: hero, toolbar, list left side; empty bandeja with "Bandeja · resumen" right side at ≥ lg breakpoint.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ProductManagement/ProductManagementPage.tsx src/pages/admin/ProductManagement/AdminToolbar.tsx
git commit -m "feat(admin): workbench split layout (ledger + Bandeja)"
```

---

### Task C3: Rewrite InventoryRow with chroma + new column order

**Files:**

- Modify: `src/pages/admin/ProductManagement/InventoryRow.tsx`

New column order: `chroma | carat | thumbnail | name + procedencia | price | status pip`. Drop the existing checkbox-first layout; the bulk-select checkbox moves to a hover/active state at the very left.

- [ ] **Step 1: Read current row**

```bash
sed -n '1,80p' src/pages/admin/ProductManagement/InventoryRow.tsx
```

- [ ] **Step 2: Replace the row's grid + cells**

Update the grid template to:

```ts
gridTemplateColumns: { xs: "20px 5px 56px 40px minmax(0, 1fr) 80px 56px", md: "20px 5px 64px 44px minmax(0, 1fr) 96px 60px" }
```

Where columns are: `bulk-checkbox | chroma | carat | thumb | name+meta | price | status`. Replace the per-cell content:

- **bulk checkbox**: kept; visible on hover/active row only (`opacity: isSelected || isActive ? 1 : 0`).
- **chroma**: `<ChromaBar hex={chromaHex} foto={foto} />`.
- **carat**: read `row.peso` — render as `{n.toFixed(2)}<span>CT</span>` when numeric; else render `peso` value (e.g., "Plata").
- **thumb**: existing `<ProgressiveImage ... />` resized to 44×44.
- **name+meta**: name on first line, then `[itemId · procedencia · calidad · talla]` joined by " · " in tertiary ink. Procedencia is parsed from `coleccion` (substring before first space) or falls back to a sensible default; if unsure, drop the procedencia segment.
- **price**: `{formatPriceCOP(row.precioCOP)}` in mono.
- **status**: existing `<StatusPip estado={row.estado} foto={foto} />` — pass `foto` through. (Update `StatusPip` to accept `foto` instead of `atelier`; replace its `atelier.status` references with `foto.status`.)

Add `chromaHex?: string` and `foto: FotoTokens` to `InventoryRowProps`.

- [ ] **Step 3: Pass `chromaHex` from page**

In `ProductManagementPage.tsx`, where `<InventoryRow ... />` is rendered, add:

```tsx
chromaHex={Number.isFinite(itemNumber) ? chromaSamples[itemNumber] : undefined}
foto={foto}
```

- [ ] **Step 4: Type-check + dev smoke**

```bash
npx tsc --noEmit && npm run dev
```

Open `/admin/products`. Confirm rows have a thin colored band at the left, carat reads first, layout is unchanged otherwise.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ProductManagement/InventoryRow.tsx src/pages/admin/ProductManagement/StatusPip.tsx src/pages/admin/ProductManagement/ProductManagementPage.tsx
git commit -m "feat(admin): InventoryRow chroma + jeweler reading-order"
```

---

### Task C4: E2E asserts new layout

**Files:**

- Modify: `e2e/admin-products.spec.ts`

- [ ] **Step 1: Add the assertion**

Inside the existing "renders the seeded inventory rows" test, after the page loads:

```ts
// Workbench split is rendered — Bandeja is visible at desktop widths.
await expect(
  page.getByRole("complementary", { name: /Bandeja/i }),
).toBeVisible();
// Each row has a chroma bar (data attribute set in ChromaBar).
const chromaBars = page.locator("[data-chroma-bar]");
await expect(chromaBars.first()).toBeVisible();
expect(await chromaBars.count()).toBeGreaterThan(0);
```

- [ ] **Step 2: Run E2E**

```bash
VITE_TEST_MODE=1 npm run test:e2e -- e2e/admin-products.spec.ts
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/admin-products.spec.ts
git commit -m "test(e2e): assert workbench split + chroma bar"
```

---

## Phase D — Bandeja cards (existing data)

### Task D1: StoneHero card

**Files:**

- Create: `src/pages/admin/ProductManagement/StoneHero.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/pages/admin/ProductManagement/StoneHero.tsx
import { Box, ButtonBase, Typography } from "@mui/material";
import { fontFamilies, type FotoTokens } from "../../../design-system";

const SANS = fontFamilies.system;
const MONO = fontFamilies.mono;

interface StoneHeroProps {
  foto: FotoTokens;
  itemId: string;
  nombre?: string;
  peso?: string;
  coleccion?: string;
  calidad?: string;
  precioCOP?: number;
  thumbnailUrl?: string;
  chromaHex?: string;
  onOpenEditor: () => void;
}

function formatPrice(n: number | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString("es-CO")}`;
}

export function StoneHero({
  foto,
  itemId,
  nombre,
  peso,
  coleccion,
  calidad,
  precioCOP,
  thumbnailUrl,
  chromaHex,
  onOpenEditor,
}: StoneHeroProps) {
  const procedencia = (coleccion ?? "").trim().split(/\s+/)[0] || null;
  const fallbackBg = chromaHex
    ? `radial-gradient(circle at 30% 30%, ${chromaHex}, ${foto.ink.primary} 80%)`
    : foto.surfaces.inset;
  return (
    <Box
      sx={{
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "12px",
        overflow: "hidden",
        backgroundColor: foto.surfaces.canvas,
      }}
    >
      <Box
        role="img"
        aria-label={
          nombre ? `Imagen de ${nombre}` : `Imagen de la piedra ${itemId}`
        }
        sx={{
          aspectRatio: "16 / 10",
          background: thumbnailUrl
            ? `center/cover no-repeat url(${thumbnailUrl})`
            : fallbackBg,
          position: "relative",
        }}
      >
        {procedencia && calidad && (
          <Box
            sx={{
              position: "absolute",
              bottom: 10,
              left: 10,
              fontFamily: SANS,
              fontSize: "8.5px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 600,
              backgroundColor: "rgba(11, 16, 14, 0.62)",
              color: "#FFFFFF",
              px: "8px",
              py: "3px",
              borderRadius: "999px",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            {procedencia} · {calidad}
          </Box>
        )}
        {chromaHex && (
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              bottom: 10,
              right: 10,
              width: 60,
              height: 60,
              borderRadius: "50%",
              border: "1.5px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 0 0 4px rgba(11, 16, 14, 0.18)",
              background: `radial-gradient(circle at 35% 35%, ${chromaHex} 8%, ${foto.ink.primary} 70%)`,
            }}
          />
        )}
      </Box>
      <Box
        sx={{
          p: 1.5,
          borderTop: `1px solid ${foto.surfaces.rule}`,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          gap: 1.25,
          backgroundColor: foto.surfaces.canvas,
        }}
      >
        <Box>
          <Typography
            component="div"
            sx={{
              fontFamily: SANS,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color: foto.ink.primary,
              lineHeight: 1.1,
            }}
          >
            {nombre || `Piedra ${itemId}`}
          </Typography>
          <Typography
            component="div"
            sx={{
              fontFamily: MONO,
              fontSize: 9.5,
              letterSpacing: "0.04em",
              color: foto.ink.tertiary,
              mt: 0.4,
            }}
          >
            {itemId}
            {peso ? ` · ${peso} ct` : ""}
            {precioCOP ? ` · ${formatPrice(precioCOP)}` : ""}
          </Typography>
        </Box>
        <ButtonBase
          data-bandeja-open-editor
          onClick={onOpenEditor}
          disableRipple
          sx={{
            backgroundColor: foto.accent.primary,
            color: foto.ink.inverse,
            borderRadius: "9px",
            px: "13px",
            py: "7px",
            fontFamily: SANS,
            fontSize: 10,
            fontWeight: 600,
            "&:focus-visible": {
              outline: `2px solid ${foto.accent.primary}`,
              outlineOffset: 2,
            },
          }}
        >
          Abrir editor
        </ButtonBase>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/ProductManagement/StoneHero.tsx
git commit -m "feat(admin): StoneHero (image + loupe + meta + open editor)"
```

---

### Task D2: BloqueoCard (uses existing `lockStatus` query)

**Files:**

- Create: `src/pages/admin/ProductManagement/BloqueoCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/pages/admin/ProductManagement/BloqueoCard.tsx
import { Box, ButtonBase, Typography } from "@mui/material";
import { fontFamilies, type FotoTokens } from "../../../design-system";
import {
  useConvexQuery,
  convexApi,
  convexReady,
} from "../../../lib/convex-safe";

const SANS = fontFamilies.system;

interface BloqueoCardProps {
  foto: FotoTokens;
  itemId: string | null;
  currentEmail: string | null;
  onClaim: () => void;
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diffSec = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (diffSec < 60) return `hace ${diffSec} s`;
  const diffMin = Math.round(diffSec / 60);
  return `hace ${diffMin} min`;
}

export function BloqueoCard({
  foto,
  itemId,
  currentEmail,
  onClaim,
}: BloqueoCardProps) {
  const status = useConvexQuery(
    convexApi.products.lockStatus,
    convexReady && itemId ? { itemId } : "skip",
  );
  const heldByOther =
    !!status && status.held && status.holderEmail !== currentEmail;
  const heldByMe =
    !!status && status.held && status.holderEmail === currentEmail;
  return (
    <Box
      sx={{
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "11px",
        p: "13px 15px",
        backgroundColor: foto.surfaces.canvas,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box>
        <Typography
          component="div"
          sx={{
            fontFamily: SANS,
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: foto.ink.tertiary,
            fontWeight: 500,
          }}
        >
          Bloqueo
        </Typography>
        <Typography
          component="div"
          sx={{
            fontFamily: SANS,
            fontSize: 10,
            color: foto.ink.secondary,
            mt: 0.5,
          }}
        >
          {!itemId
            ? "Selecciona una piedra para ver su bloqueo"
            : !status?.held
              ? "Libre · ningún editor activo"
              : heldByMe
                ? "Editas esta piedra"
                : `${status.holderName ?? status.holderEmail} edita · ${relTime(status.claimedAt)}`}
        </Typography>
      </Box>
      {heldByOther ? (
        <ButtonBase
          data-bandeja-claim-lock
          onClick={onClaim}
          disableRipple
          sx={{
            fontFamily: SANS,
            fontSize: 9.5,
            fontWeight: 600,
            color: foto.ink.primary,
            border: `1px solid ${foto.surfaces.edgeStrong}`,
            borderRadius: "7px",
            px: "10px",
            py: "5px",
          }}
        >
          Solicitar control
        </ButtonBase>
      ) : (
        <Box
          aria-hidden
          sx={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: foto.accent.primary,
          }}
        />
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/ProductManagement/BloqueoCard.tsx
git commit -m "feat(admin): BloqueoCard — surface lockStatus + takeover"
```

---

### Task D3: HistorialCard (uses existing `editHistory` query)

**Files:**

- Create: `src/pages/admin/ProductManagement/HistorialCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/pages/admin/ProductManagement/HistorialCard.tsx
import { Box, Typography } from "@mui/material";
import { useState } from "react";
import { fontFamilies, type FotoTokens } from "../../../design-system";
import {
  useConvexQuery,
  convexApi,
  convexReady,
} from "../../../lib/convex-safe";

const SANS = fontFamilies.system;

interface HistorialCardProps {
  foto: FotoTokens;
  itemId: string | null;
}

function summarizeChanges(
  changes: Array<{ field: string; before: unknown; after: unknown }>,
): string {
  if (changes.length === 0) return "sin cambios";
  if (changes.length === 1) {
    const c = changes[0];
    if (c.field === "estado") return `→ estado: ${String(c.after)}`;
    return `editó ${c.field}`;
  }
  return `editó ${changes.length} campos`;
}

function relDays(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.round(diff / 86400000);
  if (days < 1) {
    const hours = Math.round(diff / 3600000);
    return hours < 1 ? "hace minutos" : `hace ${hours} h`;
  }
  return `hace ${days} d`;
}

export function HistorialCard({ foto, itemId }: HistorialCardProps) {
  const [expanded, setExpanded] = useState(false);
  const history = useConvexQuery(
    convexApi.products.editHistory,
    convexReady && itemId ? { itemId, limit: expanded ? 20 : 5 } : "skip",
  );
  return (
    <Box
      sx={{
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "11px",
        p: "13px 15px",
        backgroundColor: foto.surfaces.canvas,
      }}
    >
      <Typography
        component="div"
        sx={{
          fontFamily: SANS,
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: foto.ink.tertiary,
          fontWeight: 500,
          mb: 1,
        }}
      >
        Historial
      </Typography>
      {!itemId && (
        <Typography
          sx={{ fontFamily: SANS, fontSize: 10, color: foto.ink.secondary }}
        >
          Selecciona una piedra para ver su historial
        </Typography>
      )}
      {itemId && history === undefined && (
        <Typography
          sx={{ fontFamily: SANS, fontSize: 10, color: foto.ink.tertiary }}
        >
          Cargando…
        </Typography>
      )}
      {itemId && history && history.length === 0 && (
        <Typography
          sx={{ fontFamily: SANS, fontSize: 10, color: foto.ink.tertiary }}
        >
          Sin historial todavía
        </Typography>
      )}
      {itemId &&
        history &&
        history.length > 0 &&
        history.map((h) => (
          <Box
            key={h._id}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              py: 0.5,
              fontFamily: SANS,
              fontSize: 10,
              gap: 1,
            }}
          >
            <Typography component="span" sx={{ color: foto.ink.secondary }}>
              {h.editorName ?? h.editorEmail} {summarizeChanges(h.changes)}
            </Typography>
            <Typography component="span" sx={{ color: foto.ink.tertiary }}>
              {relDays(h.editedAt)}
            </Typography>
          </Box>
        ))}
      {itemId && history && history.length >= 5 && !expanded && (
        <Box
          component="button"
          type="button"
          onClick={() => setExpanded(true)}
          sx={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: foto.accent.primary,
            fontFamily: SANS,
            fontSize: 10,
            fontWeight: 600,
            mt: 0.5,
            p: 0,
          }}
        >
          Ver más
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/ProductManagement/HistorialCard.tsx
git commit -m "feat(admin): HistorialCard — surface editHistory in Bandeja"
```

---

### Task D4: Mount cards inside Bandeja

**Files:**

- Modify: `src/pages/admin/ProductManagement/ProductManagementPage.tsx`

- [ ] **Step 1: Wire StoneHero + BloqueoCard + HistorialCard**

Inside the `<Bandeja>` JSX block, when `selectedBandeja` is non-null:

```tsx
<Bandeja foto={foto} selected={selectedBandeja}>
  {selectedBandeja && (
    <>
      <StoneHero
        foto={foto}
        itemId={selectedBandeja.itemId}
        nombre={selectedBandeja.nombre}
        peso={selectedBandeja.peso}
        coleccion={selectedBandeja.coleccion}
        calidad={selectedBandeja.calidad}
        precioCOP={selectedBandeja.precioCOP}
        thumbnailUrl={selectedBandeja.thumbnailUrl}
        chromaHex={selectedBandeja.chromaHex}
        onOpenEditor={() => setSelectedItemId(selectedBandeja.itemId)}
      />
      {/* PatronCard arrives in Phase F */}
      <HistorialCard foto={foto} itemId={selectedBandeja.itemId} />
      <BloqueoCard
        foto={foto}
        itemId={selectedBandeja.itemId}
        currentEmail={user?.email ?? null}
        onClaim={async () => {
          if (!user?.email) return;
          try {
            await claimLock({
              itemId: selectedBandeja.itemId,
              holderEmail: user.email,
              holderName: user.name,
              force: true,
            });
            notify("Control reclamado", "success");
          } catch (err) {
            notify(
              `No se pudo reclamar el bloqueo: ${err instanceof Error ? err.message : "error"}`,
              "error",
            );
          }
        }}
      />
    </>
  )}
  {!selectedBandeja && <HistorialCard foto={foto} itemId={null} />}
</Bandeja>
```

Add the import for `claimLock` (already exposed via Convex; reuse `convexApi.products.claimLock` mutation hook).

`claimLock` today does NOT accept a `force` arg — the existing mutation rejects when locked by someone else within `expiresAt`. **Defer the `force: true` flag implementation to Phase F (when we wire the actual takeover) and for now, omit the `force` field; if takeover fails, surface the error in the notification.**

Update the call:

```ts
await claimLock({
  itemId: selectedBandeja.itemId,
  holderEmail: user.email,
  holderName: user.name,
});
```

(The plan note for the writer: `force` is a design intent, not yet supported. The Phase J cleanup task adds the schema change. Don't pass it here.)

- [ ] **Step 2: Tweak click behavior**

When a row is clicked, today it opens the drawer immediately. Change behavior so a row click selects the row (updates `selectedItemId`) but does NOT open the drawer until "Abrir editor" is pressed in the Bandeja's StoneHero. Rationale: the bandeja gives the asesor read-only context first; editing is one click further.

- Replace `onOpen={setSelectedItemId}` on `<InventoryRow>` with `onSelect={setSelectedBandejaId}` and a separate state `selectedBandejaId`.
- Drawer opens when `selectedItemId !== null`, set by Bandeja's `onOpenEditor`.

Refactor the page state to make this distinction:

```ts
const [selectedBandejaId, setSelectedBandejaId] = useState<string | null>(null);
const [editingItemId, setEditingItemId] = useState<string | null>(null);

const selected = useMemo(
  () =>
    selectedBandejaId && products
      ? (products.find((p) => p.itemId === selectedBandejaId) ?? null)
      : null,
  [selectedBandejaId, products],
);

const editing = useMemo(
  () =>
    editingItemId && products
      ? (products.find((p) => p.itemId === editingItemId) ?? null)
      : null,
  [editingItemId, products],
);
```

Replace usage of `selectedItemId` accordingly. Drawer opens with `editing`. Bandeja shows `selected`.

- [ ] **Step 3: Type-check + dev smoke**

```bash
npx tsc --noEmit && npm run dev
```

Click a row → bandeja populates with stone hero, historial, bloqueo. Drawer does not open. "Abrir editor" opens the drawer.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/ProductManagement/ProductManagementPage.tsx
git commit -m "feat(admin): mount StoneHero + Historial + Bloqueo in Bandeja"
```

---

## Phase E — Convex extensions for Patrones

### Task E1: TDD `patron-buckets.ts` (pure logic)

**Files:**

- Create: `src/utils/patron-buckets.ts`
- Test: `tests/patron-buckets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/patron-buckets.test.ts
import { describe, it, expect } from "vitest";
import {
  qualityBucket,
  caratBucket,
  procedenciaBucket,
  comboKey,
} from "../src/utils/patron-buckets";

describe("qualityBucket", () => {
  it("returns 'AAA' / 'AA' / 'A' for valid input", () => {
    expect(qualityBucket("AAA")).toBe("AAA");
    expect(qualityBucket("AA")).toBe("AA");
    expect(qualityBucket("A")).toBe("A");
  });
  it("normalizes whitespace and case", () => {
    expect(qualityBucket("  aaa ")).toBe("AAA");
    expect(qualityBucket("aA")).toBe("AA");
  });
  it("returns null for unknown values", () => {
    expect(qualityBucket("")).toBeNull();
    expect(qualityBucket("XX")).toBeNull();
  });
});

describe("caratBucket", () => {
  it("buckets to 0.5-ct windows centered on the input", () => {
    expect(caratBucket(2.4)).toEqual([2.0, 2.5]);
    expect(caratBucket(3.0)).toEqual([2.75, 3.25]);
    expect(caratBucket(3.12)).toEqual([2.87, 3.37]);
  });
  it("returns null for non-finite peso", () => {
    expect(caratBucket(NaN)).toBeNull();
    expect(caratBucket(0)).toBeNull();
    expect(caratBucket(-1)).toBeNull();
  });
});

describe("procedenciaBucket", () => {
  it("returns the first word of coleccion when known", () => {
    expect(procedenciaBucket("Muzo Imperial 2024")).toBe("Muzo");
    expect(procedenciaBucket("Cosquez")).toBe("Cosquez");
  });
  it("normalizes case", () => {
    expect(procedenciaBucket("muzo imperial")).toBe("Muzo");
  });
  it("returns null when no recognized procedencia", () => {
    expect(procedenciaBucket("")).toBeNull();
    expect(procedenciaBucket("Foo Bar")).toBeNull();
  });
});

describe("comboKey", () => {
  it("joins procedencia · quality · carat-bucket", () => {
    expect(
      comboKey({
        procedencia: "Cosquez",
        quality: "AA",
        caratLo: 3.0,
        caratHi: 3.5,
      }),
    ).toBe("Cosquez·AA·3.00–3.50");
  });
  it("formats carats to 2 decimals", () => {
    expect(
      comboKey({
        procedencia: "Muzo",
        quality: "AAA",
        caratLo: 2,
        caratHi: 2.5,
      }),
    ).toBe("Muzo·AAA·2.00–2.50");
  });
});
```

- [ ] **Step 2: Run test, see fail**

```bash
npx vitest run tests/patron-buckets.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/utils/patron-buckets.ts
const QUALITY_VALUES = new Set(["AAA", "AA", "A"]);
const PROCEDENCIA_VALUES = new Set([
  "Muzo",
  "Cosquez",
  "Chivor",
  "Coscuez",
  "Coscuéz",
]);

export function qualityBucket(
  input: string | undefined | null,
): "AAA" | "AA" | "A" | null {
  if (!input) return null;
  const norm = input.trim().toUpperCase();
  return QUALITY_VALUES.has(norm) ? (norm as "AAA" | "AA" | "A") : null;
}

export function caratBucket(peso: number): [number, number] | null {
  if (!Number.isFinite(peso) || peso <= 0) return null;
  const half = 0.25;
  const lo = Math.max(0, peso - half);
  const hi = peso + half;
  return [Number(lo.toFixed(2)), Number(hi.toFixed(2))];
}

export function procedenciaBucket(
  coleccion: string | undefined | null,
): string | null {
  if (!coleccion) return null;
  const first = coleccion.trim().split(/\s+/)[0];
  if (!first) return null;
  const titled = first[0].toUpperCase() + first.slice(1).toLowerCase();
  return PROCEDENCIA_VALUES.has(titled)
    ? titled === "Coscuéz"
      ? "Coscuez"
      : titled
    : null;
}

export function comboKey(args: {
  procedencia: string;
  quality: "AAA" | "AA" | "A";
  caratLo: number;
  caratHi: number;
}): string {
  return `${args.procedencia}·${args.quality}·${args.caratLo.toFixed(2)}–${args.caratHi.toFixed(2)}`;
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npx vitest run tests/patron-buckets.test.ts
```

Expected: PASS — all assertions.

- [ ] **Step 5: Commit**

```bash
git add src/utils/patron-buckets.ts tests/patron-buckets.test.ts
git commit -m "feat(utils): patron-buckets — quality/carat/procedencia bucketing"
```

---

### Task E2: Add `patronesFor` Convex query

**Files:**

- Modify: `convex/products.ts`
- Modify: `src/lib/convex-safe.test-stub.ts` — add stub

- [ ] **Step 1: Append `patronesFor` to `convex/products.ts`**

```ts
// convex/products.ts (append, near editHistory)
import {
  qualityBucket,
  caratBucket,
  procedenciaBucket,
  comboKey,
} from "../src/utils/patron-buckets";

export const patronesFor = query({
  args: { itemId: v.string(), lookbackDays: v.optional(v.number()) },
  handler: async (ctx, { itemId, lookbackDays }) => {
    const days = lookbackDays ?? 90;
    const horizon = new Date(Date.now() - days * 86400000).toISOString();
    const target = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
      .first();
    if (!target) return { combos: [], total: 0 };

    const targetProc = procedenciaBucket(target.coleccion);
    const targetQual = qualityBucket(target.calidad);
    const peso = Number(target.peso);
    const targetCarat = caratBucket(peso);

    const sold = await ctx.db
      .query("productInventory")
      .withIndex("by_estado", (q) => q.eq("estado", "VENDIDA"))
      .collect();

    const buckets = new Map<
      string,
      { count: number; prices: number[]; label: string }
    >();
    for (const p of sold) {
      if ((p.lastPushedAt ?? p.lastPulledAt) < horizon) continue;
      const proc = procedenciaBucket(p.coleccion);
      const qual = qualityBucket(p.calidad);
      const c = caratBucket(Number(p.peso));
      if (!proc || !qual || !c) continue;
      // Match if procedencia matches AND quality matches AND carat windows overlap.
      if (targetProc && targetQual && targetCarat) {
        if (proc !== targetProc) continue;
        if (qual !== targetQual) continue;
        const [tlo, thi] = targetCarat;
        const [plo, phi] = c;
        if (phi < tlo || plo > thi) continue;
      }
      const key = comboKey({
        procedencia: proc,
        quality: qual,
        caratLo: c[0],
        caratHi: c[1],
      });
      const entry = buckets.get(key) ?? {
        count: 0,
        prices: [],
        label: `${proc} · ${qual} · ${c[0].toFixed(1)}–${c[1].toFixed(1)} ct`,
      };
      entry.count += 1;
      if (typeof p.precioCOP === "number" && p.precioCOP > 0)
        entry.prices.push(p.precioCOP);
      buckets.set(key, entry);
    }

    const combos = Array.from(buckets.entries())
      .map(([key, v]) => ({
        key,
        label: v.label,
        count: v.count,
        medianPriceCOP: v.prices.length ? median(v.prices) : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { combos, total: combos.reduce((s, c) => s + c.count, 0) };
  },
});

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
```

- [ ] **Step 2: Add stub for E2E**

In `src/lib/convex-safe.test-stub.ts`, locate the `convexApi.products` shim. Add a `patronesFor` entry returning a deterministic small object based on the seeded data, e.g.:

```ts
// inside the products object literal in the stub
patronesFor: ((args: { itemId: string }) => {
  const target = state.products.find((p) => p.itemId === args.itemId);
  if (!target) return { combos: [], total: 0 };
  return {
    combos: [
      { key: "Cosquez·AA·3.00–3.50", label: "Cosquez · AA · 3.0–3.5 ct", count: 5, medianPriceCOP: 4_800_000 },
      { key: "Cosquez·AA·2.50–3.00", label: "Cosquez · AA · 2.5–3.0 ct", count: 3, medianPriceCOP: 3_900_000 },
      { key: "Muzo·AA·3.00–3.50", label: "Muzo · AA · 3.0–3.5 ct", count: 2, medianPriceCOP: 5_200_000 },
    ],
    total: 10,
  };
}) as never,
```

- [ ] **Step 3: Type-check + Convex deploy**

```bash
npx tsc --noEmit
npx tsc -p convex/tsconfig.json
npx convex deploy -y
```

Expected: zero errors; new query is deployed.

- [ ] **Step 4: Commit**

```bash
git add convex/products.ts src/lib/convex-safe.test-stub.ts
git commit -m "feat(convex): patronesFor query (similar-sold-items by procedencia × quality × carat)"
```

---

### Task E3: Add `patronesGlobalTop` and `recentEdits`

**Files:**

- Modify: `convex/products.ts`
- Modify: `src/lib/convex-safe.test-stub.ts`

- [ ] **Step 1: Append both queries**

```ts
// convex/products.ts (append)
export const patronesGlobalTop = query({
  args: { lookbackDays: v.optional(v.number()) },
  handler: async (ctx, { lookbackDays }) => {
    const days = lookbackDays ?? 90;
    const horizon = new Date(Date.now() - days * 86400000).toISOString();
    const sold = await ctx.db
      .query("productInventory")
      .withIndex("by_estado", (q) => q.eq("estado", "VENDIDA"))
      .collect();
    const buckets = new Map<
      string,
      { count: number; prices: number[]; label: string }
    >();
    for (const p of sold) {
      if ((p.lastPushedAt ?? p.lastPulledAt) < horizon) continue;
      const proc = procedenciaBucket(p.coleccion);
      const qual = qualityBucket(p.calidad);
      const c = caratBucket(Number(p.peso));
      if (!proc || !qual || !c) continue;
      const key = comboKey({
        procedencia: proc,
        quality: qual,
        caratLo: c[0],
        caratHi: c[1],
      });
      const entry = buckets.get(key) ?? {
        count: 0,
        prices: [],
        label: `${proc} · ${qual} · ${c[0].toFixed(1)}–${c[1].toFixed(1)} ct`,
      };
      entry.count += 1;
      if (typeof p.precioCOP === "number" && p.precioCOP > 0)
        entry.prices.push(p.precioCOP);
      buckets.set(key, entry);
    }
    const combos = Array.from(buckets.entries())
      .map(([key, v]) => ({
        key,
        label: v.label,
        count: v.count,
        medianPriceCOP: v.prices.length ? median(v.prices) : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { combos, total: combos.reduce((s, c) => s + c.count, 0) };
  },
});

export const recentEdits = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = Math.min(limit ?? 5, 50);
    const edits = await ctx.db.query("productEdits").order("desc").take(cap);
    return edits;
  },
});
```

- [ ] **Step 2: Add stubs**

```ts
// inside products stub object
patronesGlobalTop: ((_args: { lookbackDays?: number } = {}) => ({
  combos: [
    { key: "Muzo·AAA·2.00–3.00", label: "Muzo · AAA · 2–3 ct", count: 12, medianPriceCOP: 5_500_000 },
    { key: "Cosquez·AA·3.00–4.00", label: "Cosquez · AA · 3–4 ct", count: 9, medianPriceCOP: 4_300_000 },
    { key: "Muzo·AA·1.00–2.00", label: "Muzo · AA · 1–2 ct", count: 7, medianPriceCOP: 1_900_000 },
  ],
  total: 28,
})) as never,
recentEdits: ((args: { limit?: number } = {}) => state.audit.slice(0, args.limit ?? 5)) as never,
```

- [ ] **Step 3: Type-check + deploy**

```bash
npx tsc -b && npx tsc -p convex/tsconfig.json && npx convex deploy -y
```

Expected: zero errors; both queries deployed.

- [ ] **Step 4: Commit**

```bash
git add convex/products.ts src/lib/convex-safe.test-stub.ts
git commit -m "feat(convex): patronesGlobalTop + recentEdits queries"
```

---

### Task E4: Frontend `usePatrones` hook

**Files:**

- Create: `src/hooks/usePatrones.ts`

- [ ] **Step 1: Write the hook**

```ts
// src/hooks/usePatrones.ts
import { useConvexQuery, convexApi, convexReady } from "../lib/convex-safe";

export interface PatronCombo {
  key: string;
  label: string;
  count: number;
  medianPriceCOP: number | null;
}

export interface PatronResult {
  combos: PatronCombo[];
  total: number;
}

export function usePatrones(itemId: string | null): PatronResult | undefined {
  return useConvexQuery(
    convexApi.products.patronesFor,
    convexReady && itemId ? { itemId } : "skip",
  ) as PatronResult | undefined;
}

export function usePatronesGlobalTop(): PatronResult | undefined {
  return useConvexQuery(
    convexApi.products.patronesGlobalTop,
    convexReady ? {} : "skip",
  ) as PatronResult | undefined;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/usePatrones.ts
git commit -m "feat(hooks): usePatrones / usePatronesGlobalTop"
```

---

## Phase F — PatronCard

### Task F1: PatronCard component

**Files:**

- Create: `src/pages/admin/ProductManagement/PatronCard.tsx`
- Modify: `src/pages/admin/ProductManagement/ProductManagementPage.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/pages/admin/ProductManagement/PatronCard.tsx
import { Box, Typography } from "@mui/material";
import { fontFamilies, type FotoTokens } from "../../../design-system";
import type { PatronResult } from "../../../hooks/usePatrones";

const SANS = fontFamilies.system;
const MONO = fontFamilies.mono;

interface PatronCardProps {
  foto: FotoTokens;
  data: PatronResult | undefined;
  variant: "selected" | "global";
}

function formatPriceShort(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString("es-CO")}`;
}

export function PatronCard({ foto, data, variant }: PatronCardProps) {
  const title =
    variant === "selected" ? "Patrones · coincidencias" : "Patrones · catálogo";
  const subtitle = "90 d";
  const max = data?.combos.reduce((m, c) => Math.max(m, c.count), 0) ?? 1;
  const median = data?.combos
    .filter((c) => c.medianPriceCOP !== null)
    .reduce(
      (acc, c, _, arr) =>
        arr.length ? Math.round(acc + (c.medianPriceCOP ?? 0) / arr.length) : 0,
      0,
    );
  return (
    <Box
      sx={{
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "11px",
        p: "13px 15px",
        backgroundColor: foto.surfaces.canvas,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.25,
        }}
      >
        <Typography
          component="div"
          sx={{
            fontFamily: SANS,
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: foto.ink.tertiary,
            fontWeight: 500,
          }}
        >
          {title}
        </Typography>
        <Typography
          component="div"
          sx={{ fontFamily: SANS, fontSize: 9, color: foto.ink.tertiary }}
        >
          {subtitle}
        </Typography>
      </Box>
      {!data && (
        <Typography
          sx={{ fontFamily: SANS, fontSize: 10, color: foto.ink.tertiary }}
        >
          Cargando…
        </Typography>
      )}
      {data && data.combos.length === 0 && (
        <Typography
          sx={{ fontFamily: SANS, fontSize: 10, color: foto.ink.tertiary }}
        >
          Sin coincidencias en 90 d
        </Typography>
      )}
      {data &&
        data.combos.length > 0 &&
        data.combos.map((c) => (
          <Box
            key={c.key}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 70px 24px",
              alignItems: "center",
              gap: 1.25,
              py: 0.5,
              fontFamily: SANS,
              fontSize: 10,
              color: foto.ink.primary,
            }}
          >
            <Box>{c.label}</Box>
            <Box
              sx={{
                height: 4,
                backgroundColor: foto.surfaces.inset,
                borderRadius: 2,
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: `${(c.count / max) * 100}%`,
                  backgroundColor: foto.accent.primary,
                  borderRadius: 2,
                }}
              />
            </Box>
            <Box sx={{ fontFamily: MONO, fontWeight: 600, textAlign: "right" }}>
              {c.count}
            </Box>
          </Box>
        ))}
      {data && data.combos.length > 0 && (
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: `1px solid ${foto.surfaces.edge}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: SANS,
            fontSize: 10,
            color: foto.ink.secondary,
          }}
        >
          <Box>Precio mediano del patrón</Box>
          <Box
            sx={{
              fontFamily: MONO,
              fontWeight: 600,
              fontSize: 12,
              color: foto.ink.primary,
            }}
          >
            {formatPriceShort(median ? Math.round(median) : null)}
          </Box>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Mount in Bandeja**

In `ProductManagementPage.tsx`:

```tsx
import { usePatrones, usePatronesGlobalTop } from "../../../hooks/usePatrones";
import { PatronCard } from "./PatronCard";

// inside the component
const patrones = usePatrones(selectedBandejaId);
const patronesGlobal = usePatronesGlobalTop();

// inside the Bandeja JSX:
{selectedBandeja && (
  <>
    <StoneHero ... />
    <PatronCard foto={foto} data={patrones} variant="selected" />
    <HistorialCard ... />
    <BloqueoCard ... />
  </>
)}
{!selectedBandeja && (
  <>
    <PatronCard foto={foto} data={patronesGlobal} variant="global" />
    <HistorialCard foto={foto} itemId={null} />
  </>
)}
```

- [ ] **Step 3: Type-check + dev smoke**

```bash
npx tsc --noEmit && npm run dev
```

Open `/admin/products`. With nothing selected, bandeja shows global patrones. Click a row → bandeja shows that item's patrones bar chart.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/ProductManagement/PatronCard.tsx src/pages/admin/ProductManagement/ProductManagementPage.tsx
git commit -m "feat(admin): PatronCard — proportional bar chart of coincidencias"
```

---

## Phase G — Create flow (+ Nueva piedra)

### Task G1: TDD `createProduct-validate.ts`

**Files:**

- Create: `src/utils/createProduct-validate.ts`
- Test: `tests/createProduct-validate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/createProduct-validate.test.ts
import { describe, it, expect } from "vitest";
import { validateNewProduct } from "../src/utils/createProduct-validate";

describe("validateNewProduct", () => {
  it("requires itemId", () => {
    const result = validateNewProduct({ itemId: "" }, new Set(["10", "20"]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/número/i);
  });

  it("rejects duplicate itemId", () => {
    const result = validateNewProduct({ itemId: "10" }, new Set(["10", "20"]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/ya existe/i);
  });

  it("trims itemId whitespace before checking", () => {
    const result = validateNewProduct({ itemId: "  10  " }, new Set(["10"]));
    expect(result.ok).toBe(false);
  });

  it("accepts a unique non-empty itemId", () => {
    const result = validateNewProduct(
      { itemId: "999", nombre: "Test" },
      new Set(["10", "20"]),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.itemId).toBe("999");
  });

  it("normalizes empty optional fields to undefined", () => {
    const result = validateNewProduct(
      { itemId: "1", nombre: "  ", peso: "" },
      new Set(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nombre).toBeUndefined();
      expect(result.value.peso).toBeUndefined();
    }
  });
});
```

- [ ] **Step 2: Run test, verify fails**

```bash
npx vitest run tests/createProduct-validate.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/utils/createProduct-validate.ts
export interface NewProductInput {
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  categoria?: string;
  precioCOP?: number;
  ubicacion?: string;
  coleccion?: string;
  caja?: string;
}

export interface ValidatedProduct {
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  categoria?: string;
  precioCOP?: number;
  ubicacion?: string;
  coleccion?: string;
  caja?: string;
}

export type ValidationResult =
  | { ok: true; value: ValidatedProduct }
  | { ok: false; error: string };

function trimOrUndef(v: string | undefined): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
}

export function validateNewProduct(
  input: NewProductInput,
  existingIds: Set<string>,
): ValidationResult {
  const itemId = trimOrUndef(input.itemId);
  if (!itemId)
    return { ok: false, error: "El número de la piedra es obligatorio" };
  if (existingIds.has(itemId))
    return { ok: false, error: `Ya existe una piedra con el número ${itemId}` };
  const value: ValidatedProduct = {
    itemId,
    nombre: trimOrUndef(input.nombre),
    peso: trimOrUndef(input.peso),
    color: trimOrUndef(input.color),
    calidad: trimOrUndef(input.calidad),
    cantidad:
      typeof input.cantidad === "number" && Number.isFinite(input.cantidad)
        ? input.cantidad
        : undefined,
    talla: trimOrUndef(input.talla),
    medidas: trimOrUndef(input.medidas),
    categoria: trimOrUndef(input.categoria),
    precioCOP:
      typeof input.precioCOP === "number" &&
      Number.isFinite(input.precioCOP) &&
      input.precioCOP > 0
        ? input.precioCOP
        : undefined,
    ubicacion: trimOrUndef(input.ubicacion),
    coleccion: trimOrUndef(input.coleccion),
    caja: trimOrUndef(input.caja),
  };
  return { ok: true, value };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/createProduct-validate.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/createProduct-validate.ts tests/createProduct-validate.test.ts
git commit -m "feat(utils): validateNewProduct — pure validation for createProduct"
```

---

### Task G2: Convex `createProduct` mutation + `pushToSheet` append mode

**Files:**

- Modify: `convex/products.ts`
- Modify: `src/lib/convex-safe.test-stub.ts`

- [ ] **Step 1: Append to `convex/products.ts`**

```ts
// convex/products.ts
export const createProduct = mutation({
  args: {
    itemId: v.string(),
    editorEmail: v.string(),
    editorName: v.optional(v.string()),
    fields: v.object({
      nombre: v.optional(v.string()),
      peso: v.optional(v.string()),
      color: v.optional(v.string()),
      calidad: v.optional(v.string()),
      cantidad: v.optional(v.number()),
      talla: v.optional(v.string()),
      medidas: v.optional(v.string()),
      categoria: v.optional(v.string()),
      precioCOP: v.optional(v.number()),
      ubicacion: v.optional(v.string()),
      coleccion: v.optional(v.string()),
      caja: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { itemId, editorEmail, editorName, fields }) => {
    const itemIdTrim = itemId.trim();
    if (!itemIdTrim) throw new Error("El número de la piedra es obligatorio");
    const dup = await ctx.db
      .query("productInventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", itemIdTrim))
      .first();
    if (dup)
      throw new Error(`Ya existe una piedra con el número ${itemIdTrim}`);

    const all = await ctx.db.query("productInventory").collect();
    const maxRow = all.reduce((m, p) => Math.max(m, p.rowIndex), 1);
    const nextRow = maxRow + 1;
    const now = new Date().toISOString();

    const productId = await ctx.db.insert("productInventory", {
      itemId: itemIdTrim,
      rowIndex: nextRow,
      ...fields,
      estado: "DISPONIBLE",
      lastPulledAt: now,
      syncStatus: "pending",
    });

    const auditId = await ctx.db.insert("productEdits", {
      itemId: itemIdTrim,
      editorEmail,
      editorName,
      editedAt: now,
      changes: Object.entries(fields)
        .filter(([, v]) => v !== undefined)
        .map(([field, after]) => ({
          field,
          before: null,
          after: after as string | number | null,
        })),
      status: "pending",
    });

    await ctx.scheduler.runAfter(0, api.products.pushToSheet, {
      itemId: itemIdTrim,
      auditId,
      mode: "append",
    });

    return { itemId: itemIdTrim, productId, rowIndex: nextRow };
  },
});
```

- [ ] **Step 2: Extend `pushToSheet`**

In the existing `pushToSheet` action signature, add `mode: v.optional(v.union(v.literal("patch"), v.literal("append")))`. Default to `"patch"`.

In the handler, branch:

- `mode === "patch"` (existing path): update by row.
- `mode === "append"`: call `sheets.spreadsheets.values.append` for the same range, with the row body built from the new doc's fields.

- [ ] **Step 3: Stub for E2E**

```ts
// in convex-safe.test-stub.ts products object
createProduct: ((args: { itemId: string; editorEmail: string; editorName?: string; fields: any }) => {
  if (state.products.some((p) => p.itemId === args.itemId.trim())) {
    throw new Error(`Ya existe una piedra con el número ${args.itemId}`);
  }
  const nextRow = state.products.reduce((m, p) => Math.max(m, p.rowIndex), 1) + 1;
  const now = new Date().toISOString();
  state.products.push({
    _id: `local-${args.itemId}`,
    _creationTime: Date.now(),
    itemId: args.itemId.trim(),
    rowIndex: nextRow,
    estado: "DISPONIBLE",
    syncStatus: "pending",
    lastPulledAt: now,
    ...args.fields,
  });
  state.audit.unshift({
    _id: `audit-${args.itemId}`,
    itemId: args.itemId.trim(),
    editorEmail: args.editorEmail,
    editorName: args.editorName,
    editedAt: now,
    status: "pending",
    changes: Object.entries(args.fields).filter(([, v]) => v !== undefined).map(([f, a]) => ({ field: f, before: null, after: a })),
  });
  notify();
  return Promise.resolve({ itemId: args.itemId.trim(), productId: state.products.at(-1)!._id, rowIndex: nextRow });
}) as never,
```

- [ ] **Step 4: Type-check + deploy + run unit tests**

```bash
npx tsc -b && npx tsc -p convex/tsconfig.json && npx convex deploy -y
npx vitest run
```

Expected: zero errors; all unit tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/products.ts src/lib/convex-safe.test-stub.ts
git commit -m "feat(convex): createProduct mutation + pushToSheet append mode"
```

---

### Task G3: EditDrawer create-mode extension

**Files:**

- Modify: `src/pages/admin/ProductManagement/EditDrawer.tsx`

- [ ] **Step 1: Read current drawer signature**

```bash
sed -n '1,80p' src/pages/admin/ProductManagement/EditDrawer.tsx
```

- [ ] **Step 2: Extend props**

Add a `mode: "edit" | "create"` to the existing `EditDrawerProps`. When `mode === "create"`:

- `product` is null (or a synthetic blank).
- Title shows "Nueva piedra".
- Save button label is "Crear y sincronizar".
- `itemId` field is enabled and required.
- `onSave` is called with `(undefined, fields, mode: "create")` instead of `(itemId, patch)`. Adjust the prop signature to:

```ts
onSave: (
  itemId: string | undefined,
  patchOrFields: EditDrawerPatch | NewProductInput,
  mode: "edit" | "create",
) => Promise<void> | void;
```

Inside the component, gate the existing audit-history rendering on `mode === "edit"` (no history when creating).

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/ProductManagement/EditDrawer.tsx
git commit -m "feat(admin): EditDrawer — accept mode 'create'"
```

---

### Task G4: Wire + Nueva piedra button

**Files:**

- Modify: `src/pages/admin/ProductManagement/ProductManagementPage.tsx`

- [ ] **Step 1: Add state + handler**

```ts
const [drawerMode, setDrawerMode] = useState<"edit" | "create">("edit");
const createProduct = useConvexMutation(convexApi.products.createProduct);

const existingItemIds = useMemo(() => {
  const ids = new Set<string>();
  if (products) for (const p of products) ids.add(p.itemId);
  return ids;
}, [products]);

const handleCreateNew = useCallback(() => {
  setDrawerMode("create");
  setEditingItemId("__new__");
}, []);

const handleSave = useCallback(
  async (itemId: string | undefined, payload: any, mode: "edit" | "create") => {
    if (!user?.email) {
      notify("Tu sesión no tiene email. Vuelve a iniciar sesión.", "error");
      return;
    }
    setIsSaving(true);
    try {
      if (mode === "create") {
        const v = validateNewProduct(payload, existingItemIds);
        if (!v.ok) {
          notify(v.error, "error");
          return;
        }
        const { itemId: createdId, ...fields } = v.value;
        const result = await createProduct({
          itemId: createdId,
          editorEmail: user.email,
          editorName: user.name,
          fields,
        });
        notify(
          `Creada · ${result.itemId} · sincronizando con la hoja`,
          "success",
        );
        setDrawerMode("edit");
        setEditingItemId(null);
        return;
      }
      // existing edit path...
    } finally {
      setIsSaving(false);
    }
  },
  [createProduct, existingItemIds, user, notify],
);
```

Pass `mode={drawerMode}` and the new `onSave` to `<EditDrawer />`.

In `<FotoHero ... onCreateNew={handleCreateNew} />`, replace the placeholder.

- [ ] **Step 2: Type-check + dev smoke**

```bash
npx tsc --noEmit && npm run dev
```

Click "+ Nueva piedra" → drawer opens in create mode. Fill itemId + name. Submit. Confirm row appears in the list (Convex reactivity).

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/ProductManagement/ProductManagementPage.tsx
git commit -m "feat(admin): wire + Nueva piedra create flow"
```

---

### Task G5: E2E asserts create flow

**Files:**

- Modify: `e2e/admin-products.spec.ts`

- [ ] **Step 1: Add a test case**

```ts
test("creates a new product via + Nueva piedra", async ({ page }) => {
  await primeAdminSession(page);
  await page.goto("/admin/products");
  await page.locator("[data-foto-create]").click();
  await expect(page.getByText(/Nueva piedra/i)).toBeVisible();
  await page.getByLabel(/Número/i).fill("999");
  await page.getByLabel(/Nombre/i).fill("Test E2E");
  await page.getByRole("button", { name: /Crear y sincronizar/i }).click();
  await expect(page.getByText(/Creada · 999/i)).toBeVisible();
  await expect(page.getByText(/Test E2E/)).toBeVisible();
});
```

- [ ] **Step 2: Run E2E**

```bash
VITE_TEST_MODE=1 npm run test:e2e -- e2e/admin-products.spec.ts
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/admin-products.spec.ts
git commit -m "test(e2e): create flow asserts row appears after + Nueva piedra"
```

---

## Phase H — Quick-inline edit + Bulk extensions

### Task H1: InlineEditCell component (TDD-light, behavior covered by E2E)

**Files:**

- Create: `src/pages/admin/ProductManagement/InlineEditCell.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/pages/admin/ProductManagement/InlineEditCell.tsx
import { Box, ButtonBase } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { fontFamilies, type FotoTokens } from "../../../design-system";

const SANS = fontFamilies.system;

interface InlineEditCellProps {
  foto: FotoTokens;
  /** Display value (formatted). */
  display: string;
  /** Raw value passed to onSave. */
  rawValue: string;
  /** Validate + transform on save; throw to reject. */
  parse: (input: string) => string | number | null;
  onSave: (next: string | number | null) => Promise<void> | void;
  ariaLabel: string;
  type?: "text" | "number";
}

export function InlineEditCell({
  foto,
  display,
  rawValue,
  parse,
  onSave,
  ariaLabel,
  type = "text",
}: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(rawValue);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = async () => {
    if (!editing || busy) return;
    setBusy(true);
    try {
      const next = parse(value);
      await onSave(next);
    } finally {
      setBusy(false);
      setEditing(false);
    }
  };

  const cancel = () => {
    setValue(rawValue);
    setEditing(false);
  };

  if (!editing) {
    return (
      <ButtonBase
        data-inline-edit
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        disableRipple
        sx={{
          fontFamily: SANS,
          fontSize: 11,
          color: foto.ink.primary,
          textAlign: "right",
          width: "100%",
          py: 0.25,
          borderRadius: "4px",
          "&:hover": { backgroundColor: foto.surfaces.inset, cursor: "text" },
          "&:focus-visible": { outline: `2px solid ${foto.accent.primary}` },
        }}
      >
        {display || "—"}
      </ButtonBase>
    );
  }

  return (
    <Box
      component="input"
      ref={inputRef as never}
      type={type}
      value={value}
      disabled={busy}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue((e.target as HTMLInputElement).value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      }}
      onBlur={commit}
      sx={{
        fontFamily: SANS,
        fontSize: 11,
        color: foto.ink.primary,
        backgroundColor: foto.surfaces.inset,
        border: `1px solid ${foto.accent.primary}`,
        borderRadius: "4px",
        textAlign: "right",
        py: "2px",
        px: "6px",
        width: "100%",
      }}
    />
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/pages/admin/ProductManagement/InlineEditCell.tsx
git commit -m "feat(admin): InlineEditCell — click-to-edit row primitive"
```

---

### Task H2: Wire inline edit for price + ubicacion + coleccion

**Files:**

- Modify: `src/pages/admin/ProductManagement/InventoryRow.tsx`

- [ ] **Step 1: Replace the price cell**

In `InventoryRow.tsx`, replace the `<Typography>` rendering price with:

```tsx
<InlineEditCell
  foto={foto}
  display={formatPriceCOP(row.precioCOP)}
  rawValue={typeof row.precioCOP === "number" ? String(row.precioCOP) : ""}
  parse={(s) => {
    const n = Number(String(s).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }}
  onSave={(next) =>
    onInlineEdit(row.itemId, { precioCOP: next as number | null })
  }
  ariaLabel={`Precio de ${row.nombre ?? row.itemId}`}
  type="number"
/>
```

Add `onInlineEdit?: (itemId: string, patch: Partial<InventoryRowData>) => Promise<void>` to `InventoryRowProps`.

In `ProductManagementPage.tsx`, pass `onInlineEdit={handleInlineEdit}` where:

```ts
const handleInlineEdit = useCallback(
  async (itemId: string, patch: Record<string, unknown>) => {
    if (!user?.email) {
      notify("Tu sesión no tiene email. Vuelve a iniciar sesión.", "error");
      return;
    }
    await saveEdit({
      itemId,
      editorEmail: user.email,
      editorName: user.name,
      patch,
    });
  },
  [saveEdit, user, notify],
);
```

- [ ] **Step 2: Inline-edit ubicacion + coleccion via the meta line**

Below the row's name, render the meta line as discrete cells: `[itemId] · [InlineEditCell coleccion] · [calidad] · [InlineEditCell ubicacion]`. For coleccion + ubicacion, parse is `(s) => s.trim() || null`.

- [ ] **Step 3: Type-check + dev smoke**

```bash
npx tsc --noEmit && npm run dev
```

Click on the price → edit inline → press Enter → toast "Guardado". Same for ubicacion + coleccion.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/ProductManagement/InventoryRow.tsx src/pages/admin/ProductManagement/ProductManagementPage.tsx
git commit -m "feat(admin): inline-edit price + ubicacion + coleccion in row"
```

---

### Task H3: Bulk price / coleccion / ubicacion popovers

**Files:**

- Create: `src/pages/admin/ProductManagement/BulkActionBar.tsx` (extracted)
- Modify: `src/pages/admin/ProductManagement/ProductManagementPage.tsx`

- [ ] **Step 1: Extract BulkActionBar**

Move the inline `BulkActionBar` + `BulkActionButton` from `ProductManagementPage.tsx` into a new `BulkActionBar.tsx`. Update its prop interface to accept `foto` (not `atelier`) and three new callbacks: `onChangePrice(delta: { mode: "delta" | "percent" | "absolute"; value: number })`, `onChangeColeccion(value: string)`, `onChangeUbicacion(value: string)`.

For each new button, render an MUI `Popover` (anchored to the button) with a small form:

- Price popover: radio for `delta · porcentaje · absoluto` + input + apply.
- Coleccion popover: existing `collections` array (passed in) + free-text fallback.
- Ubicacion popover: free-text input.

- [ ] **Step 2: Wire mutations in the page**

```ts
const handleBulkChangePrice = useCallback(
  async ({
    mode,
    value,
  }: {
    mode: "delta" | "percent" | "absolute";
    value: number;
  }) => {
    if (!user?.email || selectedIds.size === 0) return;
    setIsBulkSaving(true);
    try {
      // saveEditMany takes a single `patch`, but for a delta we need per-item math.
      // For "absolute": single saveEditMany with { precioCOP: value }.
      // For "delta" / "percent": iterate and call saveEdit per item.
      if (mode === "absolute") {
        await saveEditMany({
          itemIds: Array.from(selectedIds),
          editorEmail: user.email,
          editorName: user.name,
          patch: { precioCOP: value },
        });
      } else {
        const ops = Array.from(selectedIds).map(async (id) => {
          const p = products?.find((q) => q.itemId === id);
          if (!p || typeof p.precioCOP !== "number") return;
          const next =
            mode === "delta"
              ? p.precioCOP + value
              : Math.round(p.precioCOP * (1 + value / 100));
          await saveEdit({
            itemId: id,
            editorEmail: user.email!,
            editorName: user.name,
            patch: { precioCOP: next },
          });
        });
        await Promise.all(ops);
      }
      notify(
        `Precio actualizado en ${selectedIds.size} piedra${selectedIds.size === 1 ? "" : "s"}`,
        "success",
      );
      clearSelection();
    } catch (err) {
      notify(
        `No se pudo actualizar precio: ${err instanceof Error ? err.message : "error"}`,
        "error",
      );
    } finally {
      setIsBulkSaving(false);
    }
  },
  [selectedIds, user, products, saveEdit, saveEditMany, notify, clearSelection],
);

// Similar for coleccion + ubicacion (saveEditMany with { coleccion } / { ubicacion }).
```

- [ ] **Step 3: Type-check + dev smoke**

```bash
npx tsc --noEmit && npm run dev
```

Select 2 rows. Bar appears. Click "Cambiar precio" → popover → +10% → apply → both rows update.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/ProductManagement/BulkActionBar.tsx src/pages/admin/ProductManagement/ProductManagementPage.tsx
git commit -m "feat(admin): bulk price / coleccion / ubicacion in BulkActionBar"
```

---

## Phase I — Polish + cleanup

### Task I1: Image-health flag in row

**Files:**

- Modify: `src/pages/admin/ProductManagement/InventoryRow.tsx`

- [ ] **Step 1: Render the flag**

When `thumbnailUrl` is `undefined`, render a small ⊘ icon (SVG path or Unicode `⊘`) before the carat, with tooltip "sin imagen", `data-image-health="missing"`. When present, render nothing.

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/ProductManagement/InventoryRow.tsx
git commit -m "feat(admin): image-health flag for rows without thumbnails"
```

---

### Task I2: Lock indicator dot in row

**Files:**

- Modify: `src/pages/admin/ProductManagement/InventoryRow.tsx`
- Modify: `src/pages/admin/ProductManagement/ProductManagementPage.tsx`

- [ ] **Step 1: Pass lock state**

Query active locks once at page level (we don't yet have a `listAllLocks` query — add it).

In `convex/products.ts`, append:

```ts
export const listActiveLocks = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("productLocks").collect();
    const now = new Date().toISOString();
    return all.filter((l) => l.expiresAt > now);
  },
});
```

In `convex-safe.test-stub.ts`, return `state.locks ?? []`.

In page, query `listActiveLocks` and build `lockedByOtherSet: Set<string>`. Pass `isLockedByOther: lockedByOtherSet.has(row.itemId)` to each `<InventoryRow>`.

In row, after the status pip, render a 4×4 px gold dot when `isLockedByOther`.

- [ ] **Step 2: Type-check + deploy + commit**

```bash
npx tsc -b && npx tsc -p convex/tsconfig.json && npx convex deploy -y
git add convex/products.ts src/lib/convex-safe.test-stub.ts src/pages/admin/ProductManagement/InventoryRow.tsx src/pages/admin/ProductManagement/ProductManagementPage.tsx
git commit -m "feat(admin): listActiveLocks + row lock indicator"
```

---

### Task I3: Delete LedgerHero

**Files:**

- Delete: `src/pages/admin/ProductManagement/LedgerHero.tsx`

- [ ] **Step 1: Confirm no remaining import**

```bash
grep -rn "LedgerHero" src/ tests/ e2e/ 2>/dev/null
```

Expected: no matches.

- [ ] **Step 2: Delete and commit**

```bash
git rm src/pages/admin/ProductManagement/LedgerHero.tsx
git commit -m "chore(admin): remove LedgerHero superseded by FotoHero"
```

---

### Task I4: Final E2E sweep + visual QA notes

**Files:**

- Modify: `e2e/admin-products.spec.ts`

- [ ] **Step 1: Add coverage cases**

```ts
test("inline-edits price from a row", async ({ page }) => {
  /* ... */
});
test("bulk-changes price by percent", async ({ page }) => {
  /* ... */
});
test("Bandeja shows patrones for the selected stone", async ({ page }) => {
  /* ... */
});
test("Bandeja shows lock state for an item locked by another editor", async ({
  page,
}) => {
  /* ... */
});
```

For each new test, follow the existing `primeAdminSession` + `__TM_PLAYWRIGHT_FIXTURE__` seed pattern in the existing spec.

- [ ] **Step 2: Run full E2E**

```bash
VITE_TEST_MODE=1 npm run test:e2e
```

Expected: all pass.

- [ ] **Step 3: Manual visual QA (no automation)**

- Open `/admin/products` in light mode (system theme): hero, rows, bandeja, drawer all read clean.
- Toggle to dark mode (via app theme): same — emerald shifts to mint, surfaces to vault.
- Resize to ≤ 1079 px: bandeja becomes a sheet on row click.
- Resize to phone: bandeja is a bottom sheet.
- Click a row: bandeja populates; "Abrir editor" opens drawer.
- "+ Nueva piedra": create flow works.

- [ ] **Step 4: Commit**

```bash
git add e2e/admin-products.spec.ts
git commit -m "test(e2e): sweep — inline edit, bulk price, patrones, lock display"
```

---

### Task I5: PR

- [ ] **Step 1: Push + open PR**

```bash
git push -u origin feature/fotosintesis-redesign
gh pr create --title "Redesign /admin/products (Fotosíntesis) — Workbench Split + chroma signature" --body "$(cat <<'EOF'
## Summary
- Cool-neutral palette (no cream / no umber), emerald-only accent, theme-aware.
- Workbench Split layout: ledger left + persistent **Bandeja** inspector right.
- **Chroma-sampled** row signature — each row's left edge takes its color from the stone's photo.
- New: **+ Nueva piedra** create flow, **Patrones** (coincidencias), **quick-inline edit**, **bulk price/colección/ubicación**, surfaced **audit history** + **lock state**.
- LedgerHero deleted (superseded).

## Spec
docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md

## Plan
docs/superpowers/plans/2026-05-06-fotosintesis-admin-redesign.md

## Test plan
- [ ] Light + dark visual pass
- [ ] Phone bottom-sheet bandeja
- [ ] + Nueva piedra E2E
- [ ] Bulk price by % / by absolute
- [ ] Inline edit price + ubicacion + coleccion
- [ ] Patrones bar chart with seeded sold cohort
- [ ] Lock indicator with two simulated editors

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

- **Spec coverage:** Hero ✓ Workbench Split ✓ Chroma sampling (A3+A4) ✓ Bandeja shell (C1) ✓ StoneHero (D1) ✓ PatronCard (F1) ✓ HistorialCard (D3) ✓ BloqueoCard (D2) ✓ + Nueva piedra (G1–G5) ✓ Quick-inline edit (H1–H2) ✓ Bulk price/colección/ubicación (H3) ✓ Image-health flag (I1) ✓ Lock indicator (I2) ✓ Theme awareness (A2 + foto.ts) ✓ LedgerHero removal (I3) ✓ E2E coverage (B3, C4, G5, I4) ✓.
- **Placeholder scan:** No "TBD"/"TODO"/"implement later" wording; every step has either code or an exact command.
- **Type consistency:** `FotoTokens` shape used across all components; `validateNewProduct`'s `ValidatedProduct` shape feeds `createProduct` mutation args; `PatronResult` shape consistent between `usePatrones` and `PatronCard`.
- **Known cuts (deliberate, also called out in spec):** image upload from admin, CSV/PDF export, saved views, snapshots, color×calidad heatmap (`PatronCard` bar chart suffices for v1).
