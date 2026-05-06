/**
 * Patrón bucketing helpers — pure logic shared between the
 * Convex `patronesFor` / `patronesGlobalTop` queries and the
 * frontend hooks. Extracted to keep the bucketing rules
 * canonical (and unit-testable) in one place.
 *
 * - `qualityBucket`     normalizes calidad → 'AAA' | 'AA' | 'A' | null
 * - `caratBucket`       buckets a peso (ct) into a ±0.25 ct window
 * - `procedenciaBucket` extracts a known procedencia from coleccion
 * - `comboKey`          stable string key for procedencia × quality × carat
 */

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
