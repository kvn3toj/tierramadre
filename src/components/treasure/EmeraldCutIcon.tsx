/**
 * EmeraldCutIcon — faceted gem silhouettes for gem cuts (talla), ported from the
 * DS3 "Cortes de esmeralda" lab (docs/tierra-madre-ds3-cortes.html). Each cut is
 * a filled emerald-gradient gem with facet highlights, designed to read even at
 * badge size. Maps the many Spanish spellings/synonyms in `item.talla` to one
 * silhouette, falling back to the signature emerald cut for unknowns.
 *
 * viewBox is the lab's 64×80 (portrait gem). The gradient gets a per-instance id
 * so a grid can render many icons without id collisions. Rendered as JSX (no
 * dangerouslySetInnerHTML) — every value here is static.
 */
import React, { useId } from 'react';

export interface EmeraldCutIconProps {
  /** Raw cut string from the item (e.g. "Esmeralda", "Ovalada", "Pera"). */
  cut?: string;
  /** Rendered width in px; height follows the 64×80 gem ratio. */
  size?: number;
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Collapse the many cut spellings into one lab silhouette key. */
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

/** Silhouette per cut — ported verbatim from the lab; `fill` is the gem gradient. */
const GEMS: Record<CutKey, (fill: string) => React.ReactNode> = {
  esmeralda: (fill) => (
    <>
      <polygon
        points="18,3 46,3 61,18 61,62 46,77 18,77 3,62 3,18"
        fill={fill}
      />
      <polygon
        points="25,13 39,13 51,25 51,55 39,67 25,67 13,55 13,25"
        fill="#fff"
        opacity={0.15}
      />
      <polygon points="61,18 61,62 46,77 46,3" fill="#000" opacity={0.12} />
    </>
  ),
  redondo: (fill) => (
    <>
      <circle cx="32" cy="40" r="29" fill={fill} />
      <circle cx="32" cy="40" r="13" fill="#fff" opacity={0.16} />
      <path d="M32 11A29 29 0 0 1 61 40L32 40Z" fill="#fff" opacity={0.08} />
      <path d="M32 69A29 29 0 0 1 3 40L32 40Z" fill="#000" opacity={0.12} />
    </>
  ),
  pera: (fill) => (
    <>
      <path
        d="M32 4C40 22 58 30 58 48C58 64 46 77 32 77C18 77 6 64 6 48C6 30 24 22 32 4Z"
        fill={fill}
      />
      <path
        d="M32 17C38 31 50 37 50 49C50 60 42 69 32 69C22 69 14 60 14 49C14 37 26 31 32 17Z"
        fill="#fff"
        opacity={0.13}
      />
      <path
        d="M32 4C40 22 58 30 58 48C58 64 46 77 32 77Z"
        fill="#000"
        opacity={0.1}
      />
    </>
  ),
  baguette: (fill) => (
    <>
      <polygon
        points="13,25 51,25 58,31 58,49 51,55 13,55 6,49 6,31"
        fill={fill}
      />
      <polygon
        points="19,31 45,31 50,35 50,45 45,49 19,49 14,45 14,35"
        fill="#fff"
        opacity={0.14}
      />
      <polygon points="13,25 51,25 58,31 6,31" fill="#fff" opacity={0.08} />
      <polygon points="6,49 58,49 51,55 13,55" fill="#000" opacity={0.13} />
    </>
  ),
  canutillo: (fill) => (
    <>
      <polygon points="32,2 55,15 55,65 32,78 9,65 9,15" fill={fill} />
      <polygon points="32,2 32,78 9,65 9,15" fill="#fff" opacity={0.1} />
      <polygon points="32,2 32,78 55,65 55,15" fill="#000" opacity={0.13} />
      <line
        x1="9"
        y1="15"
        x2="55"
        y2="15"
        stroke="#fff"
        strokeWidth={1.4}
        opacity={0.18}
      />
    </>
  ),
  marquesa: (fill) => (
    <>
      <path
        d="M32 4C46 20 54 32 54 40C54 48 46 60 32 76C18 60 10 48 10 40C10 32 18 20 32 4Z"
        fill={fill}
      />
      <line
        x1="32"
        y1="8"
        x2="32"
        y2="72"
        stroke="#fff"
        strokeWidth={1.2}
        opacity={0.2}
      />
      <path
        d="M32 4C46 20 54 32 54 40C54 48 46 60 32 76Z"
        fill="#000"
        opacity={0.1}
      />
    </>
  ),
  ovalo: (fill) => (
    <>
      <ellipse cx="32" cy="40" rx="22" ry="35" fill={fill} />
      <ellipse cx="32" cy="40" rx="11" ry="20" fill="#fff" opacity={0.14} />
      <path d="M32 5A22 35 0 0 1 54 40L32 40Z" fill="#fff" opacity={0.07} />
      <path d="M32 75A22 35 0 0 1 10 40L32 40Z" fill="#000" opacity={0.11} />
    </>
  ),
  cojin: (fill) => (
    <>
      <rect x="7" y="15" width="50" height="50" rx="17" fill={fill} />
      <rect
        x="17"
        y="25"
        width="30"
        height="30"
        rx="10"
        fill="#fff"
        opacity={0.13}
      />
      <polygon points="57,15 57,65 40,55 40,25" fill="#000" opacity={0.08} />
    </>
  ),
  trillon: (fill) => (
    <>
      <polygon points="32,8 57,68 7,68" fill={fill} />
      <polygon points="32,8 32,68 7,68" fill="#fff" opacity={0.11} />
      <polygon points="32,8 32,68 57,68" fill="#000" opacity={0.14} />
      <polygon points="32,21 44,44 20,44" fill="#fff" opacity={0.17} />
    </>
  ),
  corazon: (fill) => (
    <>
      <path
        d="M32 75C7 55 6 32 20 25C28 21 32 27 32 31C32 27 36 21 44 25C58 32 57 55 32 75Z"
        fill={fill}
      />
      <path
        d="M32 65C15 51 15 35 23 31C28 29 32 33 32 36C32 33 36 29 41 31C49 35 49 51 32 65Z"
        fill="#fff"
        opacity={0.12}
      />
    </>
  ),
};

export function EmeraldCutIcon({ cut, size = 14 }: EmeraldCutIconProps) {
  const uid = 'emcut-' + useId().replace(/[:]/g, '');
  return (
    <svg
      width={size}
      height={Math.round((size * 80) / 64)}
      viewBox="0 0 64 80"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#5CE9C0" />
          <stop offset=".45" stopColor="#0C9068" />
          <stop offset="1" stopColor="#00503B" />
        </linearGradient>
      </defs>
      {GEMS[cutShapeKey(cut)](`url(#${uid})`)}
    </svg>
  );
}

export default EmeraldCutIcon;
