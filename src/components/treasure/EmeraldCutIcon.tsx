/**
 * EmeraldCutIcon — line-art facet diagrams for gem cuts (talla).
 *
 * Drawn the way a gemological certificate draws a cut: a thin girdle outline,
 * the table (the flat top facet) inset inside it, and the facet lines that
 * connect the two. Strokes only — no solid fills — so the glyph reads as a
 * technical drawing beside the piece name rather than as a second, competing
 * gem. Replaces the earlier filled-gradient silhouettes.
 *
 * Colour: girdle and facets take `currentColor` (the emerald, set by the
 * caller); one facet per cut is drawn in `--tm-subtle` to suggest a silver
 * glint catching an edge. Because these are hairlines rather than filled
 * shapes, the emerald stays jewellery, not paint — it never competes with the
 * actual stone in the photograph above it.
 *
 * viewBox is 64×80 (portrait gem). Stroke widths are in viewBox units and
 * scale with `size`, so they stay legible at 13–16px. All values are static.
 */
import React from 'react';

export interface EmeraldCutIconProps {
  /** Raw cut string from the item (e.g. "Esmeralda", "Ovalada", "Pera"). */
  cut?: string;
  /** Rendered width in px; height follows the 64×80 gem ratio. */
  size?: number;
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Collapse the many cut spellings into one silhouette key. */
export function cutShapeKey(cut?: string): CutKey {
  const c = norm(cut || '');
  if (!c) return 'esmeralda';
  if (/(baguet|baguette)/.test(c)) return 'baguette';
  if (/(canutillo|canuti)/.test(c)) return 'canutillo';
  if (/(esmeralda|emerald|rectang|octag)/.test(c)) return 'esmeralda';
  if (/(redond|round|brillante)/.test(c)) return 'redondo';
  if (/oval/.test(c)) return 'ovalo';
  if (/(pera|gota|pear|drop|lagrima)/.test(c)) return 'pera';
  if (/(marq|navette)/.test(c)) return 'marquesa';
  if (/(cojin|cushion|almohad|cabuj|cabochon|domo)/.test(c)) return 'cojin';
  if (/(corazon|heart)/.test(c)) return 'corazon';
  if (/(trill|triang)/.test(c)) return 'trillon';
  // square-family (cuadrada/princesa/asscher) reads closest to the step cut
  if (/(cuadrad|princes|square|asscher)/.test(c)) return 'esmeralda';
  return 'esmeralda';
}

type CutKey =
  | 'esmeralda'
  | 'redondo'
  | 'pera'
  | 'baguette'
  | 'canutillo'
  | 'marquesa'
  | 'ovalo'
  | 'cojin'
  | 'trillon'
  | 'corazon';

/**
 * The mark is drawn entirely in one silver-grey (`currentColor`, set by the
 * caller to a neutral token) — no green. Depth comes from TONE, not hue: the
 * girdle is the most present line, the table a step back, the facets barely
 * there, and a single facet at full strength reads as the light catching an
 * edge. Silverpoint, not paint. Keeping it greyscale also protects the One
 * Voice rule — the only saturated thing near the card stays the actual stone.
 *
 * `miter` joins keep cut corners sharp; rounded joins soften an octagon into a
 * capsule at 14px.
 */
const OUT = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3.2,
  strokeLinejoin: 'miter' as const,
  strokeMiterlimit: 6,
  strokeLinecap: 'round' as const,
  opacity: 0.85,
  // Each cut is scaled by a different factor to normalise its size (see BBOX),
  // so the stroke must NOT scale with it — otherwise a barrel cut would draw
  // 40% thinner lines than a cushion. This pins line weight across all ten.
  vectorEffect: 'non-scaling-stroke' as const,
};
/** Table (top facet) — a step back. */
const TAB = { ...OUT, strokeWidth: 2.2, opacity: 0.6 };
/** Facet connectors — barely there. */
const FCT = { ...OUT, strokeWidth: 1.8, opacity: 0.38 };
/** The glint: the one facet at full strength, catching the light. */
const LIT = { ...OUT, strokeWidth: 2.2, opacity: 1 };

/** Eight points around an ellipse, used for radial (brilliant) facets. */
function radial(rx: number, ry: number): Array<[number, number]> {
  const k = 0.7071;
  return [
    [32 + rx, 40],
    [32 + rx * k, 40 - ry * k],
    [32, 40 - ry],
    [32 - rx * k, 40 - ry * k],
    [32 - rx, 40],
    [32 - rx * k, 40 + ry * k],
    [32, 40 + ry],
    [32 + rx * k, 40 + ry * k],
  ];
}

/** Radial facet lines between an outer and an inner ellipse. */
function spokes(rxO: number, ryO: number, rxI: number, ryI: number) {
  const o = radial(rxO, ryO);
  const i = radial(rxI, ryI);
  return o.map(([ox, oy], n) => (
    <line
      key={n}
      x1={i[n][0]}
      y1={i[n][1]}
      x2={ox}
      y2={oy}
      {...(n === 3 ? LIT : FCT)}
    />
  ));
}

const GEMS: Record<CutKey, React.ReactNode> = {
  // Step cut — octagonal girdle, stepped table, cut corners.
  esmeralda: (
    <>
      <polygon points="18,3 46,3 61,18 61,62 46,77 18,77 3,62 3,18" {...OUT} />
      <polygon
        points="25,13 39,13 51,25 51,55 39,67 25,67 13,55 13,25"
        {...TAB}
      />
      <line x1="61" y1="18" x2="51" y2="25" {...FCT} />
      <line x1="61" y1="62" x2="51" y2="55" {...FCT} />
      <line x1="3" y1="62" x2="13" y2="55" {...FCT} />
      <line x1="3" y1="18" x2="13" y2="25" {...LIT} />
    </>
  ),
  // Round brilliant — girdle, table, eight crown facets.
  redondo: (
    <>
      <circle cx="32" cy="40" r="29" {...OUT} />
      <circle cx="32" cy="40" r="13" {...TAB} />
      {spokes(29, 29, 13, 13)}
    </>
  ),
  pera: (
    <>
      <path
        d="M32 4C40 22 58 30 58 48C58 64 46 77 32 77C18 77 6 64 6 48C6 30 24 22 32 4Z"
        {...OUT}
      />
      <path
        d="M32 18C38 31 49 37 49 48C49 59 42 68 32 68C22 68 15 59 15 48C15 37 26 31 32 18Z"
        {...TAB}
      />
      <line x1="32" y1="4" x2="32" y2="18" {...FCT} />
      <line x1="58" y1="48" x2="49" y2="48" {...FCT} />
      <line x1="6" y1="48" x2="15" y2="48" {...LIT} />
    </>
  ),
  baguette: (
    <>
      <polygon
        points="13,25 51,25 58,31 58,49 51,55 13,55 6,49 6,31"
        {...OUT}
      />
      <polygon
        points="19,31 45,31 50,35 50,45 45,49 19,49 14,45 14,35"
        {...TAB}
      />
      <line x1="58" y1="31" x2="50" y2="35" {...FCT} />
      <line x1="58" y1="49" x2="50" y2="45" {...FCT} />
      <line x1="6" y1="49" x2="14" y2="45" {...FCT} />
      <line x1="6" y1="31" x2="14" y2="35" {...LIT} />
    </>
  ),
  // Hexagonal barrel — girdle plus the inner ridge.
  canutillo: (
    <>
      <polygon points="32,2 55,15 55,65 32,78 9,65 9,15" {...OUT} />
      <polygon points="32,12 47,21 47,59 32,68 17,59 17,21" {...TAB} />
      <line x1="55" y1="15" x2="47" y2="21" {...FCT} />
      <line x1="55" y1="65" x2="47" y2="59" {...FCT} />
      <line x1="9" y1="65" x2="17" y2="59" {...FCT} />
      <line x1="9" y1="15" x2="17" y2="21" {...LIT} />
    </>
  ),
  marquesa: (
    <>
      <path
        d="M32 4C46 20 54 32 54 40C54 48 46 60 32 76C18 60 10 48 10 40C10 32 18 20 32 4Z"
        {...OUT}
      />
      <path
        d="M32 17C42 27 46 34 46 40C46 46 42 53 32 63C22 53 18 46 18 40C18 34 22 27 32 17Z"
        {...TAB}
      />
      <line x1="32" y1="4" x2="32" y2="17" {...FCT} />
      <line x1="32" y1="76" x2="32" y2="63" {...FCT} />
      <line x1="54" y1="40" x2="46" y2="40" {...FCT} />
      <line x1="10" y1="40" x2="18" y2="40" {...LIT} />
    </>
  ),
  ovalo: (
    <>
      <ellipse cx="32" cy="40" rx="22" ry="35" {...OUT} />
      <ellipse cx="32" cy="40" rx="11" ry="18" {...TAB} />
      {spokes(22, 35, 11, 18)}
    </>
  ),
  cojin: (
    <>
      <rect x="7" y="15" width="50" height="50" rx="17" {...OUT} />
      <rect x="17" y="25" width="30" height="30" rx="10" {...TAB} />
      <line x1="50" y1="22" x2="43" y2="29" {...FCT} />
      <line x1="50" y1="58" x2="43" y2="51" {...FCT} />
      <line x1="14" y1="58" x2="21" y2="51" {...FCT} />
      <line x1="14" y1="22" x2="21" y2="29" {...LIT} />
    </>
  ),
  trillon: (
    <>
      <polygon points="32,8 57,68 7,68" {...OUT} />
      <polygon points="32,26 47,62 17,62" {...TAB} />
      <line x1="32" y1="8" x2="32" y2="26" {...FCT} />
      <line x1="57" y1="68" x2="47" y2="62" {...FCT} />
      <line x1="7" y1="68" x2="17" y2="62" {...LIT} />
    </>
  ),
  corazon: (
    <>
      <path
        d="M32 75C7 55 6 32 20 25C28 21 32 27 32 31C32 27 36 21 44 25C58 32 57 55 32 75Z"
        {...OUT}
      />
      <path
        d="M32 64C16 51 16 36 23 32C28 30 32 34 32 37C32 34 36 30 41 32C48 36 48 51 32 64Z"
        {...TAB}
      />
      <line x1="32" y1="31" x2="32" y2="37" {...LIT} />
    </>
  ),
};

/**
 * Natural bounding box of each girdle in the coordinates the shapes are drawn
 * in. The cuts were drawn at their own comfortable sizes (a barrel spans 76
 * units tall, a cushion only 50) and not all were centred — the heart sits at
 * cy 48, the trilliant at 38. Rather than redraw ten shapes by hand, each is
 * normalised at render: scaled so its longest side is TARGET, then centred.
 */
const BBOX: Record<CutKey, { cx: number; cy: number; w: number; h: number }> = {
  esmeralda: { cx: 32, cy: 40, w: 58, h: 74 },
  redondo: { cx: 32, cy: 40, w: 58, h: 58 },
  pera: { cx: 32, cy: 40.5, w: 52, h: 73 },
  baguette: { cx: 32, cy: 40, w: 52, h: 30 },
  canutillo: { cx: 32, cy: 40, w: 46, h: 76 },
  marquesa: { cx: 32, cy: 40, w: 44, h: 72 },
  ovalo: { cx: 32, cy: 40, w: 44, h: 70 },
  cojin: { cx: 32, cy: 40, w: 50, h: 50 },
  trillon: { cx: 32, cy: 38, w: 50, h: 60 },
  corazon: { cx: 32, cy: 48, w: 52, h: 54 },
};

/** Longest side every cut is normalised to, inside the 64×64 box. */
const TARGET = 48;

export function EmeraldCutIcon({ cut, size = 14 }: EmeraldCutIconProps) {
  const key = cutShapeKey(cut);
  const { cx, cy, w, h } = BBOX[key];
  const scale = TARGET / Math.max(w, h);
  // Centre the shape's own box on the square viewBox's centre, then scale it.
  const transform = `translate(32 32) scale(${scale.toFixed(4)}) translate(${-cx} ${-cy})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
    >
      <g transform={transform}>{GEMS[key]}</g>
    </svg>
  );
}

export default EmeraldCutIcon;
