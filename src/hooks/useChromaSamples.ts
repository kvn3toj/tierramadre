/**
 * useChromaSamples — client-side dominant-color sampling for product
 * thumbnails. Loads each thumbnail once, draws to a 1×1 offscreen
 * canvas, reads the pixel, and persists the resulting hex map in
 * localStorage for 7 days.
 *
 * The exported helpers (`extractDominantHex`, `loadChromaCache`,
 * `saveChromaCache`) are unit-tested. The React effect itself relies
 * on `Image` + `<canvas>` in the browser and degrades gracefully when
 * either is unavailable: rows fall back to the emerald accent at 40%
 * opacity inside `ChromaBar`.
 *
 * Spec: docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md
 */

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

function clamp(n: number): number {
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
    if (!parsed || typeof parsed !== "object") return {};
    const now = Date.now();
    const cleaned: ChromaCache = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (
        v &&
        typeof v === "object" &&
        typeof v.at === "number" &&
        typeof v.hex === "string" &&
        typeof v.url === "string" &&
        now - v.at < TTL_MS
      ) {
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
      // Keep most recent — sort desc by `at` and trim.
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
    // Quota / private mode — silently no-op; fallback color renders.
  }
}

interface ThumbMap {
  [itemNumber: number]: { url: string } | undefined;
}

export interface UseChromaSamplesResult {
  /** itemNumber → hex string (e.g., `#005c42`). */
  samples: Record<number, string>;
  /** True after the initial sweep finishes (or no thumbnails were given). */
  ready: boolean;
}

/**
 * Hook: returns a map of item-number → dominant hex, populated from
 * the localStorage cache synchronously, and lazily expanded as new
 * thumbnails arrive.
 */
export function useChromaSamples(thumbnails: ThumbMap): UseChromaSamplesResult {
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
    if (typeof window === "undefined" || typeof Image === "undefined") {
      setReady(true);
      return;
    }
    let cancelled = false;
    const todo: Array<{ id: number; url: string }> = [];
    for (const [k, v] of Object.entries(thumbnails)) {
      if (!v?.url) continue;
      const id = Number(k);
      if (!Number.isFinite(id)) continue;
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
        if (Object.keys(updates).length > 0) {
          setSamples((prev) => ({ ...prev, ...updates }));
          for (const [k, hex] of Object.entries(updates)) {
            const id = Number(k);
            const t = thumbnails[id];
            if (t?.url) {
              cacheRef.current[id] = { hex, url: t.url, at: Date.now() };
            }
          }
          saveChromaCache(cacheRef.current);
        }
        setReady(true);
      }
    };

    for (const { id, url } of todo) {
      const img = new Image();
      // Note: don't set `crossOrigin = "anonymous"`. For same-origin
      // thumbnails (served by /api/serve-drive-image) it forces a CORS
      // preflight whose headers the proxy doesn't reliably set, making
      // `img.onerror` fire and we never sample. Without it, the image
      // loads; canvas may be tainted; `getImageData` throws — the
      // catch below handles that case and the row falls back to the
      // emerald-at-40% accent in `ChromaBar`.
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
          const data = ctx.getImageData(0, 0, 1, 1).data;
          updates[id] = extractDominantHex(data[0], data[1], data[2]);
        } catch {
          // CORS / decode error — skip; fallback color will render.
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
