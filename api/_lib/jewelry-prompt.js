/**
 * Jewelry Visualization Prompt Builder (shared)
 * ------------------------------------------------------------------
 * Single source of truth for turning a Colombian emerald's catalog
 * specs (talla / color / calidad / medidas / peso) — arriving in
 * Spanish — into a clean, English, text-to-image prompt that paints
 * the stone set into a piece of jewelry and worn.
 *
 * Consumers:
 *   - api/generate-jewelry-preview.js  → buildPrompt()        (Cotización, image-to-image capable)
 *   - scripts/jewelry-visualizer.mjs   → buildVisualizerPrompt() (batch, text-to-image via Pencil)
 *
 * buildVisualizerPrompt() is the batch builder: it fuses the full
 * catalog specs, the operator's direct VISUAL READ of the real photo,
 * and an explicit true-to-life scale clause — because Pencil's AI is
 * text-only and never sees the reference photograph.
 */

// =============================================================================
// SCENE / PROMPT DEFINITIONS
// =============================================================================

export const SCENES = {
  "ring-woman": {
    piece:
      "a refined cocktail ring with the emerald as the single hero centre stone, held in a secure four-prong setting on a slim, elegant band",
    subject:
      "worn on the ring finger of a graceful woman's hand, soft natural skin and a tasteful neutral manicure, fingers gently and naturally curved",
    framing:
      "intimate close-up of the hand at a flattering three-quarter angle",
    anatomy:
      "The hand is anatomically correct, with exactly five natural fingers and realistic, flawless skin",
  },
  "ring-man": {
    piece:
      "a substantial men's signet-style ring with the emerald as the bold centre stone in a clean bezel setting on a solid polished band",
    subject:
      "worn on the hand of a refined, well-groomed man in a natural, confident pose",
    framing: "close-up of the hand at a three-quarter angle",
    anatomy:
      "The hand is anatomically correct, with exactly five natural fingers and realistic skin",
  },
  necklace: {
    piece:
      "an elegant pendant on a fine, delicate chain, the emerald as the hanging hero stone framed by a subtle halo of tiny pavé diamonds",
    subject:
      "resting just below the collarbone on a woman's bare décolletage, smooth natural skin",
    framing: "front-on beauty crop from the collarbone to the upper chest",
    anatomy: "Skin is natural and realistic under flattering soft lighting",
  },
  earrings: {
    piece:
      "a perfectly matched symmetrical pair of drop earrings, each with an emerald as the hero stone above a small accent diamond",
    subject:
      "worn by an elegant woman, shown on her ear with hair tucked back to reveal the side of her face",
    framing: "side-profile close-up of the ear and jawline",
    anatomy: "The ear and skin are natural, realistic and flawless",
  },
};

export const METALS = {
  gold: "warm 18k yellow gold",
  silver: "bright polished sterling silver (925)",
};

// — Spanish (catalog) spec values → clean English gemological descriptors ——
// The product specs arrive in Spanish (talla/color/calidad). Spliced raw they
// produce broken prompts like "Verde intenso green tone" that confuse the
// text-to-image model — so normalize them to proper English here.

export const CUT_MAP = [
  [
    /baguett?e|bagu[eé]t/i,
    "a baguette-cut (long, narrow rectangular step-cut) emerald",
  ],
  [/esmeralda|emerald|octag/i, "an emerald-cut (rectangular step-cut) emerald"],
  [/coj[ií]n|cushion/i, "a cushion-cut emerald"],
  [/oval/i, "an oval-cut emerald"],
  [/pera|pear|gota|l[áa]grima|teardrop/i, "a pear-cut (teardrop) emerald"],
  [/redond|round|brillante/i, "a round brilliant-cut emerald"],
  [/princes/i, "a princess-cut (square brilliant) emerald"],
  [/cuadrad|square|carr[ée]/i, "a square step-cut (carré) emerald"],
  [/marqu|navette/i, "a marquise-cut emerald"],
  [/coraz[óo]n|heart/i, "a heart-cut emerald"],
  [/asscher/i, "an Asscher-cut emerald"],
  [/trill?[íi]?[óo]n|triangle|trillion/i, "a trillion-cut emerald"],
  [
    /trapich/i,
    "a trapiche emerald cabochon — a fixed six-rayed black carbon star radiating from a green hexagonal core, six green sectors split by dark carbon spokes, domed and unfaceted (never a plain green cabochon or a faceted stone)",
  ],
  [
    /\biris\b/i,
    "an Iris-cut emerald slice — a thin, flat polished cross-section of trapiche-pattern rough showing a fixed six-rayed black carbon star radiating from a green hexagonal core, six green sectors split by dark carbon spokes; flat and unfaceted, like a thin polished window pane (never a plain green cabochon, a domed trapiche cabochon, or a faceted stone)",
  ],
  [
    /morralla|cabuj[óo]n|cabochon|pulid|tumbled|\bgola\b/i,
    "a polished cabochon (smooth-domed, unfaceted) emerald",
  ],
];

export function describeCut(cut) {
  if (cut) {
    for (const [re, label] of CUT_MAP) if (re.test(cut)) return label;
  }
  return "an emerald-cut (rectangular step-cut) emerald";
}

export function describeColor(color) {
  const c = (color || "").toLowerCase();
  // Anchor the exact hue so e.g. "Verde Limón" doesn't drift to deep blue-green.
  if (/lim[óo]n|limon|\blima\b|lime/.test(c))
    return "a bright lime, slightly yellowish green (NOT a deep blue-green)";
  if (/menta|mint/.test(c)) return "a light, fresh mint green";
  if (/muzo/.test(c))
    return "a deep, slightly bluish Muzo green (rich, not brightened or yellowed)";
  if (/chivor/.test(c)) return "a deep, slightly bluish Chivor green";
  if (/azul/.test(c)) return "a vivid, slightly bluish Colombian green";
  if (/oscuro|intens|profund|deep|fuerte|v[íi]vid/.test(c))
    return "a deep, richly saturated Colombian green";
  if (/claro|light|p[áa]lid|suave/.test(c))
    return "a bright, lively light Colombian green";
  return "a vivid, saturated Colombian green";
}

export function describeQuality(quality) {
  const q = (quality || "").toLowerCase();
  if (/aaa|fina|premium|excele|exception|gota|insignif/.test(q))
    return "with exceptional eye-clean transparency and a luminous internal glow";
  if (/\baa\b|alta|high/.test(q))
    return "with high clarity and bright, glassy transparency";
  if (/comercial|\ba\b|natural|baja|incl/.test(q))
    return "with natural transparency and characteristic fine jardín inclusions";
  return "with glassy transparency and natural depth";
}

// ── Professional (visualizer) descriptors ───────────────────────────────────
// Used by buildVisualizerPrompt only. Tuned for FACETED gem-quality emeralds
// and grade-accurate clarity, so the render never over-idealizes the stone.

/** Capitalize first letter (for sentence-leading clauses). */
function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** True when the cut denotes a non-faceted, domed/flat stone (bezel-friendly): morralla/cabochon/trapiche/iris/gola. */
export function isCabochonCut(cut) {
  return /morralla|cabuj[óo]n|cabochon|tumbled|pulid|trapich|\biris\b|\bgola\b/i.test(
    cut || "",
  );
}

/** Cut-appropriate setting: bezel hugs a cabochon, flush-frames a flat iris slice; claws show off a faceted gem. */
export function describeSetting(cut) {
  if (/\biris\b/i.test(cut || ""))
    return "in a smooth, flush bezel setting that frames the thin polished slice";
  return isCabochonCut(cut)
    ? "in a smooth, polished bezel setting that hugs the domed stone"
    : "held in a secure, fine four-prong claw setting that lifts and shows off the faceted stone";
}

/**
 * Grade-accurate clarity for a faceted gem. Checks the most specific grades
 * first so "Comercial Fina" reads as commercial (not premium), and avoids
 * promising glass-clean perfection that a natural emerald never has.
 */
export function describeQualityPro(quality) {
  const q = (quality || "").toLowerCase();
  if (/morralla/.test(q))
    return "a translucent commercial stone — keep its real milky zones and visible jardín inclusions; do NOT idealize into a clean gemmy stone";
  if (
    /extrafina|extra fina|sublime|premium|excele|exception|insignif|\baaa\b/.test(
      q,
    )
  )
    return "with exceptional, near eye-clean transparency, vivid saturation and a luminous internal glow";
  if (/comercial/.test(q))
    return "a transparent but visibly included natural emerald — keep its real milky zones and fine jardín (garden) inclusions; do NOT idealize into a flawless gemmy stone, and avoid an exaggerated luminous glow";
  if (/\baa\b|\balta\b|\bfina\b|high/.test(q))
    return "with high clarity, bright glassy transparency and only minor natural inclusions";
  return "transparent with the characteristic fine jardín inclusions of a natural Colombian emerald, not flawless";
}

/** Strip unit words / stray punctuation from a carat value. */
export function cleanCarats(carats) {
  return String(carats)
    .replace(/\s*(cts?|ct\.|quilates?|carats?|kt)\b/gi, "")
    .replace(/[^\d.,]/g, "")
    .replace(/[.,]$/, "")
    .trim();
}

/**
 * Parse a measures string into millimetre numbers.
 * Tolerates every separator seen in the catalog: "8.5 x 6.2 x 4.1",
 * "8,5 x 6.2", "12x8mm", newline-separated "8.6\n5.1\n3.5", spaces, "10*7",
 * and stray unit words. A bare "0" yields all nulls. Extracts up to three
 * positive numbers (length, width, depth) in order of appearance.
 *
 * @param {string} [medidasValores]
 * @returns {{ lengthMm: number|null, widthMm: number|null, depthMm: number|null }}
 */
export function parseMeasures(medidasValores) {
  const empty = { lengthMm: null, widthMm: null, depthMm: null };
  if (medidasValores == null) return empty;

  const nums = (
    String(medidasValores)
      .toLowerCase()
      .replace(/mm|mil[ií]metros?/g, " ")
      .replace(/(\d),(\d)/g, "$1.$2") // comma decimals → dot (only between digits)
      .match(/\d+(?:\.\d+)?/g) || []
  )
    .map(Number)
    .filter((n) => !Number.isNaN(n) && n > 0);

  return {
    lengthMm: nums[0] ?? null,
    widthMm: nums[1] ?? null,
    depthMm: nums[2] ?? null,
  };
}

/**
 * Build an explicit, true-to-life scale clause from parsed mm + carats.
 * Empty string when nothing is parseable (so the prompt never says
 * "undefined mm"). Scene-agnostic on purpose — proportion-to-body is
 * handled separately in the main template.
 *
 * @param {{ measures?: string, carats?: (string|number) }} args
 * @returns {string}
 */
export function buildRealSizeCue({ measures, carats } = {}) {
  const { lengthMm, widthMm, depthMm } = parseMeasures(measures);
  const caratNum = parseFloat(String(carats ?? "").replace(",", "."));
  const ct = caratNum > 0 ? cleanCarats(carats) : "";

  if (!lengthMm && !widthMm && !ct) return "";

  const dims = [];
  if (lengthMm) dims.push(`${lengthMm} mm long`);
  if (widthMm) dims.push(`${widthMm} mm wide`);
  if (depthMm) dims.push(`${depthMm} mm deep`);
  const dimText = dims.length ? dims.join(" by ") : "";

  const caratText = ct
    ? `${dims.length ? ", " : ""}approximately ${ct} carats`
    : "";

  // Tiered, comparator-based anchor — a bare "fingernail ≈ 12 mm" note wasn't
  // enough to stop the model enlarging sub-carat stones into hero gems.
  const maxMm = Math.max(lengthMm || 0, widthMm || 0);
  let tier = "";
  if ((maxMm && maxMm < 4.5) || (caratNum && caratNum < 0.3))
    tier =
      " This is a VERY SMALL accent stone — no larger than a lentil and clearly under half a fingernail's width (an adult fingernail is ~12 mm wide). Render it petite and discreet on the body; never a large hero stone.";
  else if ((maxMm && maxMm < 7) || (caratNum && caratNum < 0.7))
    tier =
      " This is a small, modest stone — well under a fingernail's width (an adult fingernail is ~12 mm wide). Keep it dainty and realistically wearable, not enlarged.";
  else if (maxMm && maxMm <= 12)
    tier =
      " This is a modest mid-size stone (an adult fingernail is ~12 mm wide); keep it comfortably wearable, never oversized.";
  else if (maxMm)
    tier =
      " This is a substantial statement stone; still render it in believable proportion to the body.";

  return (
    `True-to-life scale is critical: the emerald measures ${dimText}${caratText}. ` +
    `Render the stone at its exact physical size in correct proportion to the surrounding body and metal setting — ` +
    `neither enlarged for drama nor shrunk.${tier}`
  );
}

/**
 * Silhouette / aspect-ratio clause for elongated cuts (baguette, pear, marquise),
 * which the model tends to widen into a blocky shape. Empty when the stone is
 * not notably elongated or the measures are missing.
 *
 * @param {{ measures?: string, cut?: string }} args
 * @returns {string}
 */
export function buildSilhouetteCue({ measures, cut } = {}) {
  const { lengthMm, widthMm } = parseMeasures(measures);
  if (!lengthMm || !widthMm) return "";
  const ratio = lengthMm / widthMm;
  if (ratio < 1.5) return "";
  const r = ratio.toFixed(1);
  const c = (cut || "").toLowerCase();
  const shape = /baguett/.test(c)
    ? "baguette"
    : /pera|pear|gota|l[áa]grima/.test(c)
      ? "pear/teardrop"
      : /marqu|navette/.test(c)
        ? "marquise"
        : "stone";
  return (
    `Silhouette is critical: this is a slender, elongated ${shape}, about ${r}x longer than wide ` +
    `(${lengthMm} x ${widthMm} mm) — keep that exact long, narrow proportion; do NOT widen it into a blocky, square or rounder shape.`
  );
}

// =============================================================================
// PROMPT BUILDERS
// =============================================================================

/**
 * Cotización prompt (unchanged behaviour). In `photo` mode the reference
 * image governs the real gem; in `specs` mode it is painted from catalog data.
 */
export function buildPrompt({ scene, metal, mode, specs = {}, productName }) {
  const s = SCENES[scene] || SCENES["ring-woman"];
  const metalText = METALS[metal] || METALS.gold;

  let stone;
  if (mode === "photo") {
    stone =
      "The centre stone is the exact Colombian emerald from the provided reference photograph — " +
      "faithfully preserve its real colour, saturation, cut, proportions and natural inclusions; do not invent a different gem.";
  } else {
    const sizeBits = [];
    if (specs.carats) {
      const ct = cleanCarats(specs.carats);
      if (ct) sizeBits.push(`approximately ${ct} carats`);
    }
    if (specs.measures) sizeBits.push(`measuring about ${specs.measures} mm`);
    const size = sizeBits.length ? `, ${sizeBits.join(", ")}` : "";
    stone =
      `The centre stone is ${describeCut(specs.cut)}${size}, ` +
      `${describeColor(specs.color)} ${describeQuality(specs.quality)}, ` +
      "with crisp step facets and bright, realistic light reflections.";
  }

  const name = productName ? `Inspired by the "${productName}" emerald.` : "";

  return [
    "Professional luxury jewelry product photography, hyper-realistic, editorial catalog quality.",
    `${s.framing}: ${s.piece}, set in ${metalText}, ${s.subject}.`,
    stone,
    "The piece is in natural, believable proportion to the body — refined and comfortably wearable, not oversized.",
    name,
    `${s.anatomy}.`,
    "Shot on an 85mm macro lens at f/2.8, soft diffused studio softbox lighting, gentle highlights on the metal, shallow depth of field with the emerald in razor-sharp focus, clean softly-blurred neutral background.",
    "Square 1:1 composition. No text, no watermark, no logos, no extra jewelry.",
  ]
    .filter(Boolean)
    .join(" ");
}

// Decoupled scenes for the visualizer: pieceBase carries NO setting word (the
// setting is derived from the cut via describeSetting), so faceted gems get
// claws and cabochons get a bezel. "studio" is a clean, model-free product shot.
const VISUALIZER_SCENES = {
  "ring-woman": {
    pieceBase:
      "a refined solitaire ring with the emerald as the single hero centre stone on a slim, elegant polished band",
    subject:
      "worn on the ring finger of an elegant woman's hand, soft natural skin and a neat neutral manicure, fingers gently and naturally curved",
    framing: "an intimate three-quarter close-up of the hand",
    anatomy:
      "the hand is anatomically correct, with exactly five natural fingers and realistic, flawless skin",
  },
  "ring-man": {
    pieceBase:
      "a substantial men's ring with the emerald as the bold centre stone on a solid, polished band",
    subject:
      "worn on the hand of a refined, well-groomed man in a natural, confident pose",
    framing: "a three-quarter close-up of the hand",
    anatomy:
      "the hand is anatomically correct, with exactly five natural fingers and realistic skin",
  },
  necklace: {
    pieceBase:
      "an elegant pendant on a fine, delicate chain, the emerald as the single hanging hero stone",
    subject:
      "resting just below the collarbone on a woman's décolletage, smooth natural skin",
    framing: "a front-on beauty crop from the collarbone to the upper chest",
    anatomy: "the skin is natural and realistic under soft lighting",
  },
  bracelet: {
    pieceBase:
      "a delicate chain bracelet with the emerald as a single hero station, the stone set alone on a fine, polished link chain",
    subject:
      "worn on a woman's wrist, soft natural skin, the wrist relaxed and gently turned",
    framing: "a three-quarter close-up of the wrist and lower forearm",
    anatomy: "the wrist, hand and skin are natural and realistic",
  },
  earrings: {
    pieceBase:
      "a perfectly matched, symmetrical pair of drop earrings, each with an emerald as the single hero stone",
    subject:
      "worn by an elegant woman, shown on her ear with hair tucked back to reveal the side of her face",
    framing: "a side-profile close-up of the ear and jawline",
    anatomy: "the ear and skin are natural and realistic",
  },
  studio: {
    pieceBase:
      "a refined solitaire ring with the emerald as the single hero centre stone on a slim, polished band",
    subject:
      "presented on its own on a clean, matte neutral surface — no hands or models, a pure catalog product shot",
    framing: "a crisp three-quarter product close-up of the piece",
    anatomy: "",
  },
};

export const VISUALIZER_SCENE_KEYS = Object.keys(VISUALIZER_SCENES);

/**
 * Batch visualizer prompt (text-to-image, no reference image).
 *
 * Fidelity rides entirely on the prompt, so this leads with the operator's
 * direct VISUAL READ of the real photo (authoritative), backs it with the
 * catalog gemological descriptors, the exact mm + carat, a tiered true-to-life
 * scale clause, and an aspect-ratio silhouette clause for elongated cuts.
 *
 * @param {Object}  args
 * @param {string}  args.scene        'ring-woman' | 'ring-man' | 'necklace' | 'bracelet' | 'earrings' | 'studio'
 * @param {string}  args.metal        'gold' | 'silver'
 * @param {Object}  args.specs        { cut, measures, carats, color, quality }
 * @param {string} [args.productName] nombre
 * @param {string} [args.visualRead]  free text describing the real stone seen in its photo
 * @param {string} [args.realSizeCue] optional precomputed scale clause; derived from specs when omitted
 * @param {boolean}[args.pair]        true for a PAR lot (two matched loose stones) → ring/necklace/bracelet
 *                                     combine both stones into one piece; earrings put one stone per ear
 *                                     (same single-stone-per-shot convention as a solitaire)
 * @returns {string}
 */
export function buildVisualizerPrompt({
  scene,
  metal,
  specs = {},
  productName,
  visualRead,
  realSizeCue,
  pair = false,
}) {
  const s = VISUALIZER_SCENES[scene] || VISUALIZER_SCENES["ring-woman"];
  const metalText = METALS[metal] || METALS.gold;
  const setting = describeSetting(specs.cut);
  const cue =
    realSizeCue ??
    buildRealSizeCue({ measures: specs.measures, carats: specs.carats });
  const silhouette = buildSilhouetteCue({
    measures: specs.measures,
    cut: specs.cut,
  });

  // Catalog spec line: exact size + cut + colour + grade-accurate clarity.
  const sizeBits = [];
  const caratNum = parseFloat(String(specs.carats ?? "").replace(",", "."));
  if (caratNum > 0) {
    const ct = cleanCarats(specs.carats);
    if (ct) sizeBits.push(`${ct} ct`);
  }
  if (specs.measures) sizeBits.push(`${specs.measures} mm`);
  const sizeText = sizeBits.length ? `${sizeBits.join(", ")}; ` : "";

  // The real stone — the authoritative visual read leads; fidelity is mandatory.
  // Earrings are already a natural two-piece pair (one stone per ear), so a PAR
  // lot maps one loose stone per earring — same single-stone-per-shot convention
  // as a solitaire. Combining both stones into one earring reads as incoherent
  // (mismatched double-stone clutter on one ear), so only ring/necklace/bracelet
  // scenes get the "combine both stones into one piece" instruction.
  const combinePairInScene = pair && scene !== "earrings";
  const lead = combinePairInScene
    ? "The hero is a MATCHED PAIR of two well-matched emeralds shown in the reference photograph"
    : pair
      ? "The reference photograph shows a closely matched pair of loose stones; this piece is set with one of that matched pair"
      : "The single hero centre stone is the REAL Colombian emerald shown in its reference photograph";
  const pairTail = combinePairInScene
    ? " Render BOTH stones as a symmetric matched pair — keep it a two-stone pair, never a single solitaire."
    : "";
  const stone =
    visualRead && visualRead.trim()
      ? `${lead}: ${visualRead.trim()}. ` +
        `Reproduce the exact silhouette, cut form, colour, tone, saturation, translucency, surface finish and natural jardín inclusions — do NOT idealize, clean up, recut or substitute it.${pairTail}`
      : `${lead}.${pairTail}`;

  const catalog =
    `Catalog data: ${describeCut(specs.cut)}; ${sizeText}` +
    `${describeColor(specs.color)}, ${describeQualityPro(specs.quality)}.`;

  const piece = `${s.pieceBase}, ${setting}, in ${metalText}`;
  const subjectClause = s.subject ? `, ${s.subject}` : "";
  const anatomy = s.anatomy ? ` ${cap(s.anatomy)}.` : "";
  const name = productName ? ` Inspired by the "${productName}" emerald.` : "";

  return [
    "Professional fine-jewelry catalog photograph of a single Colombian emerald set in jewelry — hyper-realistic, editorial quality, colour-accurate.",
    `${cap(s.framing)}: ${piece}${subjectClause}.`,
    stone,
    catalog,
    silhouette,
    cue,
    `The piece is in natural, believable proportion to the body and comfortably wearable, never oversized.${name}${anatomy}`,
    "Lit with soft, diffused studio lighting; 85mm macro lens at f/4; the emerald in razor-sharp focus with true-to-life colour; gentle highlights on the polished metal; clean, softly blurred neutral background; balanced 1:1 square composition.",
    "Avoid: any text, watermark or logo; extra gemstones, halos or added sparkle the real stone does not have; turning a faceted gem into a cabochon or vice-versa; over-cleaning a commercial stone into a flawless gem; plastic, glassy-fake or over-saturated results. Preserve the emerald's authentic natural character.",
  ]
    .filter(Boolean)
    .join(" ");
}
