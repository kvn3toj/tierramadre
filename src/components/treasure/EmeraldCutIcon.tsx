/**
 * EmeraldCutIcon — line-icon silhouettes for gem cuts (talla), matched to the
 * app's lucide stroke style so a cut reads at badge size. Maps the many Spanish
 * spellings/synonyms in `item.talla` to one canonical shape, with a faceted-gem
 * fallback for unknown cuts. Purely presentational; no theme dependency.
 */
import React from 'react';

export interface EmeraldCutIconProps {
  /** Raw cut string from the item (e.g. "Esmeralda", "Ovalada", "Pera"). */
  cut?: string;
  size?: number;
  /** Stroke color — defaults to currentColor so it inherits the badge tone. */
  color?: string;
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();

/** Collapse the many cut spellings into one canonical shape key. */
export function cutShapeKey(cut?: string): string {
  const c = norm(cut || '');
  if (!c) return 'generic';
  if (/(esmeralda|emerald|rectang|baguet)/.test(c)) return 'emerald';
  if (/(redond|round|brillante)/.test(c)) return 'round';
  if (/oval/.test(c)) return 'oval';
  if (/(pera|gota|pear|drop|lagrima)/.test(c)) return 'pear';
  if (/(marq|navette)/.test(c)) return 'marquise';
  if (/(cojin|cushion|almohad)/.test(c)) return 'cushion';
  if (/(corazon|heart)/.test(c)) return 'heart';
  if (/(cuadrad|princes|square|asscher)/.test(c)) return 'square';
  if (/(trill|triang)/.test(c)) return 'trillion';
  if (/(cabuj|cabochon|domo)/.test(c)) return 'cabochon';
  return 'generic';
}

const SHAPES: Record<string, React.ReactNode> = {
  round: <circle cx="12" cy="12" r="8" />,
  oval: <ellipse cx="12" cy="12" rx="6" ry="8.5" />,
  // Emerald cut: octagon (rectangle with cut corners) — the step cut.
  emerald: <path d="M8 4h8l4 4v8l-4 4H8l-4-4V8z" />,
  square: <rect x="5.5" y="5.5" width="13" height="13" rx="1.5" />,
  cushion: <rect x="4.5" y="4.5" width="15" height="15" rx="5.5" />,
  pear: (
    <path d="M12 3.5c2.8 3 5.5 5.6 5.5 9.5a5.5 5.5 0 0 1-11 0c0-3.9 2.7-6.5 5.5-9.5z" />
  ),
  marquise: <path d="M12 4c4 3 6 5.5 6 8s-2 5-6 8c-4-3-6-5.5-6-8s2-5 6-8z" />,
  heart: (
    <path d="M12 19.5C6.5 15.6 4.5 12.7 4.5 10a3.7 3.7 0 0 1 7.5-1 3.7 3.7 0 0 1 7.5 1c0 2.7-2 5.6-7.5 9.5z" />
  ),
  trillion: <path d="M12 4.5 19.5 19H4.5z" />,
  cabochon: <path d="M4 16a8 6 0 0 1 16 0z" />,
  // Faceted gem for unknown cuts.
  generic: <path d="M7 4h10l4 6-9 10.5L3 10z" />,
};

export function EmeraldCutIcon({
  cut,
  size = 14,
  color = 'currentColor',
}: EmeraldCutIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {SHAPES[cutShapeKey(cut)]}
    </svg>
  );
}

export default EmeraldCutIcon;
