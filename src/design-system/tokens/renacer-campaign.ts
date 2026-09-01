/**
 * Renacer — la piel de campaña ("noche esmeralda").
 *
 * Nace de la landing del 22-08 (`feat/landing-renacer`): esmeralda profunda, símbolo blanco,
 * titular Montserrat, tarjetas de vidrio, un solo acento verde brote. Allá vivía en literales
 * dentro de la página; acá es un módulo de tokens del design-system, que es donde los
 * literales pueden existir. Las páginas de `src/pages/renacer` no escriben un solo hex: leen
 * `useRenacerTokens()`, que devuelve este objeto con LAS MISMAS CLAVES que `qeTokens`
 * (bg, surface, text, accent…) más las propias de la campaña (glass, glow, deep).
 *
 * Reglas de uso: el acento (`sprout`) es para acciones y progreso, no para decorar; el
 * vidrio es una superficie, no un efecto; el titular es Montserrat 800 con tracking
 * negativo y el cuerpo sigue siendo la sans funcional de la casa.
 */

export const renacerPalette = {
  deep: '#04150F',
  forest: '#0A2A1E',
  emerald: '#0E5B3A',
  sprout: '#7FE07F',
  sproutStrong: '#95E895',
  ink: '#FFFFFF',
} as const;

export const renacerFont = {
  display: '"Montserrat", "Hanken Grotesk", -apple-system, BlinkMacSystemFont, sans-serif',
  ui: '"Libre Franklin", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: '"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

/** Radios: pastillas para acciones, 20px para tarjetas, 12px para campos. */
export const renacerRadius = { pill: 999, card: 20, field: 12, chip: 999 } as const;

export const renacerTokens = {
  // ── claves compartidas con qeTokens (las páginas ya las consumen) ──
  bg: renacerPalette.deep,
  surface: 'rgba(255,255,255,0.05)',
  surface2: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.14)',
  hairline: 'rgba(255,255,255,0.10)',
  text: renacerPalette.ink,
  muted: 'rgba(255,255,255,0.74)',
  /** Medido 2026-09-01: 0.60 da 4.84:1 sobre el punto más claro del degradado. No aclarar por gusto. */
  subtle: 'rgba(255,255,255,0.60)',
  accent: renacerPalette.sprout,
  accentStrong: renacerPalette.sproutStrong,
  onAccent: renacerPalette.deep,
  accentPure: renacerPalette.sprout,
  shadow: '0 18px 48px rgba(0,0,0,0.35)',
  // ── propias de la campaña ──
  deep: renacerPalette.deep,
  forest: renacerPalette.forest,
  emerald: renacerPalette.emerald,
  glass: 'rgba(255,255,255,0.05)',
  glassStrong: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.14)',
  /** Bordes que SIGNIFICAN (campos, chips, botones) — 3.29:1, distinto del hairline decorativo. */
  controlBorder: 'rgba(255,255,255,0.36)',
  track: 'rgba(255,255,255,0.36)',
  /** Errores: nunca en el verde del éxito. */
  alert: '#F5B183',
  glow: '0 0 0 1px rgba(127,224,127,0.35), 0 12px 32px rgba(127,224,127,0.18)',
  focus: '0 0 0 3px rgba(127,224,127,0.35)',
  /** El fondo del hero: la luz entra desde arriba y se apaga hacia lo profundo. */
  heroGradient: `radial-gradient(120% 70% at 50% -10%, ${renacerPalette.emerald}80 0%, ${renacerPalette.forest} 42%, ${renacerPalette.deep} 100%)`,
  /** Grano fino: textura, no ruido. Se pinta encima con opacidad baja. */
  grain:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.06'/></svg>\")",
  logo: '/logo-symbol-white.png',
  modo: 'oscuro' as const,
} as const;

/**
 * La versión clara — "amanecer esmeralda". Misma estructura, misma luz desde arriba, pero
 * sobre papel menta: tinta bosque, acciones en esmeralda profunda (el brote sobre claro no
 * contrasta), vidrio en tinta al 5%. Es la misma marca a otra hora del día.
 */
export const renacerTokensLight = {
  bg: '#F5F5F1',
  surface: 'rgba(255,255,255,0.78)',
  surface2: 'rgba(10,42,30,0.08)',
  border: 'rgba(10,42,30,0.14)',
  hairline: 'rgba(10,42,30,0.09)',
  text: renacerPalette.forest,
  muted: 'rgba(10,42,30,0.72)',
  /** Medido 2026-09-01: 0.66 da 4.93:1 sobre el papel (AA). 0.52 daba 3.28:1 y fallaba. */
  subtle: 'rgba(10,42,30,0.66)',
  accent: '#0E7A4E',
  accentStrong: '#0B6640',
  onAccent: '#FFFFFF',
  accentPure: renacerPalette.sprout,
  shadow: '0 16px 40px rgba(10,42,30,0.12)',
  deep: renacerPalette.deep,
  forest: renacerPalette.forest,
  emerald: renacerPalette.emerald,
  glass: 'rgba(255,255,255,0.78)',
  glassStrong: 'rgba(255,255,255,0.96)',
  glassBorder: 'rgba(10,42,30,0.12)',
  controlBorder: 'rgba(10,42,30,0.54)',
  track: 'rgba(10,42,30,0.54)',
  alert: '#9A4B1F',
  glow: '0 0 0 1px rgba(14,122,78,0.22), 0 10px 26px rgba(14,122,78,0.20)',
  focus: '0 0 0 3px rgba(14,122,78,0.26)',
  /**
   * Papel de lino con apenas un resplandor brote en el borde superior — se apaga en el
   * primer tercio. La identidad la llevan el símbolo y el acento, no el fondo.
   */
  heroGradient: `radial-gradient(110% 38% at 50% -18%, rgba(127,224,127,0.22) 0%, rgba(127,224,127,0.07) 45%, rgba(245,245,241,0) 100%)`,
  grain:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0.2 0 0 0 0 0.1 0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.04'/></svg>\")",
  logo: '/logo-symbol.png',
  modo: 'claro' as const,
} as const;

export type RenacerTokens = typeof renacerTokens | typeof renacerTokensLight;
