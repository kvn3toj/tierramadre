import type { VaultSymbolId } from '../../types/vault';

interface VaultSymbolProps {
  id: VaultSymbolId;
  size?: number;
  color?: string;
  className?: string;
  'aria-hidden'?: boolean;
}

/** 12 SVG paths — each uses currentColor; size is 24x24 viewBox. */
const SYMBOL_PATHS: Record<VaultSymbolId, string> = {
  esmeralda:
    'M12 2 L20 9 L17 20 L7 20 L4 9 Z M12 2 L12 9 M4 9 L20 9',
  sol:
    'M12 5 A4 4 0 1 1 11.99 5 Z M12 1 L12 3 M12 21 L12 23 M4.22 4.22 L5.64 5.64 M18.36 18.36 L19.78 19.78 M1 12 L3 12 M21 12 L23 12 M4.22 19.78 L5.64 18.36 M18.36 5.64 L19.78 4.22',
  luna:
    'M20 15 A8 8 0 1 1 9 4 A6 6 0 0 0 20 15 Z',
  montana:
    'M3 20 L9 8 L13 14 L16 10 L21 20 Z',
  rio:
    'M2 8 Q6 4 10 8 T18 8 T22 8 M2 16 Q6 12 10 16 T18 16 T22 16',
  arbol:
    'M12 2 C8 5 7 9 8 12 L10 12 L10 20 L14 20 L14 12 L16 12 C17 9 16 5 12 2 Z',
  ojo:
    'M2 12 Q7 4 12 4 Q17 4 22 12 Q17 20 12 20 Q7 20 2 12 Z M12 8 A4 4 0 1 1 11.99 8 Z M12 10 A2 2 0 1 1 11.99 10 Z',
  estrella:
    'M12 2 L14 9 L21 9 L15.5 13.5 L17.5 20.5 L12 16 L6.5 20.5 L8.5 13.5 L3 9 L10 9 Z',
  condor:
    'M2 14 Q6 8 12 10 Q18 8 22 14 L20 16 Q15 12 12 13 Q9 12 4 16 Z M12 10 L12 18',
  jaguar:
    'M4 4 L8 4 L8 8 L4 8 Z M10 6 L14 6 L14 10 L10 10 Z M16 4 L20 4 L20 8 L16 8 Z M4 12 L8 12 L8 16 L4 16 Z M10 14 L14 14 L14 18 L10 18 Z M16 12 L20 12 L20 16 L16 16 Z',
  espiral:
    'M12 12 m0 -8 A8 8 0 1 1 4 12 A6 6 0 1 1 12 6 A4 4 0 1 1 10 12 A2 2 0 1 1 12 10',
  corazon_verde:
    'M12 20 L4 12 A4 4 0 0 1 12 7 A4 4 0 0 1 20 12 Z',
};

/**
 * Renders one of the 12 Tierra Mädre vault symbols as an inline SVG.
 * Uses `currentColor` for fill/stroke — pass `color` to tint.
 */
export function VaultSymbol({
  id,
  size = 28,
  color,
  className,
  'aria-hidden': ariaHidden = true,
}: VaultSymbolProps) {
  const d = SYMBOL_PATHS[id];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={color ? { color } : undefined}
      aria-hidden={ariaHidden}
      focusable="false"
    >
      <path
        d={d}
        fill={id === 'rio' || id === 'sol' ? 'none' : 'currentColor'}
        stroke="currentColor"
        strokeWidth={id === 'rio' ? 1.8 : 1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
