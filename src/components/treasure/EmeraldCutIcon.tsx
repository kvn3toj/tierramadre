/**
 * EmeraldCutIcon — filigree outlines of the gem cuts (talla).
 *
 * Just the essential silhouette of each cut, drawn as one fine line. An earlier
 * pass added the table and the facet connectors the way a gemological
 * certificate would; at 14px that internal linework only read as noise and
 * crowded the glyph. What identifies a cut at this size is its outline — an
 * octagon, a pear, a marquise — so that is all that is drawn. Filigree, not
 * diagram.
 *
 * Colour is a single silver-grey via `currentColor` (the caller sets a neutral
 * token), never green: the only saturated thing beside the card must stay the
 * actual stone in the photograph.
 *
 * The ten cuts were drawn at their own comfortable sizes and not all were
 * centred, so each is normalised at render (see BBOX): scaled so its longest
 * side hits TARGET, then centred on a square 64×64 viewBox. `non-scaling-stroke`
 * pins the line weight so a heavily-scaled cut doesn't draw a thinner line than
 * a lightly-scaled one. All values are static.
 */
import React from 'react';

export interface EmeraldCutIconProps {
  /** Raw cut string from the item (e.g. "Esmeralda", "Ovalada", "Pera"). */
  cut?: string;
  /** Rendered width in px; the glyph is square. */
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
 * The one line. `miter` joins keep the cut corners sharp — rounded joins soften
 * an octagon into a capsule at 14px.
 */
const LINE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.8,
  strokeLinejoin: 'miter' as const,
  strokeMiterlimit: 6,
  strokeLinecap: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
};

/** The essential silhouette of each cut — outline only. */
const GEMS: Record<CutKey, React.ReactNode> = {
  // Step cut — octagonal girdle with cut corners.
  esmeralda: (
    <polygon points="18,3 46,3 61,18 61,62 46,77 18,77 3,62 3,18" {...LINE} />
  ),
  redondo: <circle cx="32" cy="40" r="29" {...LINE} />,
  pera: (
    <path
      d="M32 4C40 22 58 30 58 48C58 64 46 77 32 77C18 77 6 64 6 48C6 30 24 22 32 4Z"
      {...LINE}
    />
  ),
  baguette: (
    <polygon points="13,25 51,25 58,31 58,49 51,55 13,55 6,49 6,31" {...LINE} />
  ),
  // Hexagonal barrel.
  canutillo: <polygon points="32,2 55,15 55,65 32,78 9,65 9,15" {...LINE} />,
  marquesa: (
    <path
      d="M32 4C46 20 54 32 54 40C54 48 46 60 32 76C18 60 10 48 10 40C10 32 18 20 32 4Z"
      {...LINE}
    />
  ),
  ovalo: <ellipse cx="32" cy="40" rx="22" ry="35" {...LINE} />,
  cojin: <rect x="7" y="15" width="50" height="50" rx="17" {...LINE} />,
  trillon: <polygon points="32,8 57,68 7,68" {...LINE} />,
  corazon: (
    <path
      d="M32 75C7 55 6 32 20 25C28 21 32 27 32 31C32 27 36 21 44 25C58 32 57 55 32 75Z"
      {...LINE}
    />
  ),
};

/**
 * Natural bounding box of each silhouette in the coordinates it is drawn in.
 * The cuts were drawn at their own comfortable sizes (a barrel spans 76 units
 * tall, a cushion only 50) and not all were centred — the heart sits at cy 48,
 * the trilliant at 38. Rather than redraw ten shapes by hand, each is
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
