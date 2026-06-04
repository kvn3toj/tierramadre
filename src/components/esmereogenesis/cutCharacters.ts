/**
 * cutCharacters — maps an emerald CUT (TreasureItem.talla / corte) to its
 * Esmereogénesis cut-character art.
 *
 * Each cut has up to two growth-stage renders:
 *   - seed:  ancestral / mystic "beginning of growth" form (a 65-million-year-old
 *            spirit with deep, knowing eyes) shown at low progress.
 *   - grown: polished, luminous Pixar-"Soul" gem shown as the plan matures.
 *
 * Art is generated (Higgsfield z_image / CapCut Nano Banana Pro), background-
 * removed to transparent squares, and dropped into:
 *   src/assets/esmereogenesis/characters/{grown,seed}/<key>.png
 *
 * Files are resolved with import.meta.glob so a cut "lights up" automatically the
 * moment its PNG is added — no code change needed when new cuts arrive. Cuts
 * without art return null and LivingEmerald falls back to the product photo.
 */

// Eager URL imports of every character PNG that currently exists.
const FILES = import.meta.glob(
  "../../assets/esmereogenesis/characters/*/*.png",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

function pick(stage: "grown" | "seed", key: string): string | undefined {
  const match = Object.entries(FILES).find(([path]) =>
    path.includes(`/characters/${stage}/${key}.png`),
  );
  return match?.[1];
}

export type CutKey = "corazon" | "cushion" | "rectangular" | "canutillo";

export interface CutCharacter {
  key: CutKey;
  /** Polished "grown" stage art (present for every mapped cut we ship). */
  grown?: string;
  /** Ancestral / mystic "beginning of growth" art, when available. */
  seed?: string;
}

/** lowercase, strip accents + any non-alphanumerics → stable lookup token. */
function normalize(raw?: string | null): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Synonyms → canonical key. Covers the relevant entries from the project's
 * CORTES / TALLAS vocabularies (src/data/vocabularies.ts). "Emerald cut" maps
 * to the project's "Rectangular" step cut; "Esmeralda" (talla) is the same.
 */
const ALIASES: Record<string, CutKey> = {
  corazon: "corazon",
  heart: "corazon",
  cushion: "cushion",
  cojin: "cushion",
  rectangular: "rectangular",
  esmeralda: "rectangular",
  emerald: "rectangular",
  emeraldcut: "rectangular",
  baguette: "rectangular",
  canutillo: "canutillo",
};

/**
 * Resolve a cut string to its character art. Returns null when the cut isn't
 * mapped or has no art yet — callers should fall back to the product image.
 */
export function resolveCutCharacter(
  corte?: string | null,
): CutCharacter | null {
  const key = ALIASES[normalize(corte)] ?? "rectangular";
  const grown = pick("grown", key);
  const seed = pick("seed", key);
  if (!grown && !seed) return null;
  return { key, grown, seed };
}
