/**
 * The Tierra Mädre mark, prepared for THERMAL PRINTING and inlined as a data
 * URI. Not a copy of `/logo-symbol.png` — a different rendering of it, for two
 * reasons the brand asset cannot satisfy on a label:
 *
 *  1. COLOUR. The brand symbol is emerald green. A NIIMBOT head is 1-bit: it
 *     burns a dot or it doesn't. Emerald's luminance sits near the threshold,
 *     so the green asset prints as a broken ghost or vanishes outright. This
 *     one is pure black with the shape carried entirely in the alpha channel,
 *     so it thresholds to solid ink at any exposure setting.
 *
 *  2. FETCH TIMING. `exportLabel` rasterizes an off-screen node; an <img> that
 *     is still loading rasterizes blank. `waitForImages` guards that, but a
 *     data URI removes the race (and the per-label network round-trip) rather
 *     than waiting it out — the same reasoning behind logoDataUri.ts, resolved
 *     at build time instead of at runtime.
 *
 * Authored at 96 px: 4.8x the 20 px footprint on a 203 DPI head, and 3.2x the
 * ~30 px a 300 DPI head asks for after `printScaleFor` — enough that the
 * browser is always downscaling (which anti-aliases cleanly) and never
 * upscaling (which would soften the strokes into grey the head then drops).
 *
 * Do NOT shrink the printed footprint below ~18 px. Verified against a 1-bit
 * simulation of the head: at 16 px the four loops close up and the four dots
 * disappear, and the mark stops reading as the mark.
 */
export const LABEL_MARK_DATA_URI =
  'data:image/png;base64,' +
  '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';
