/**
 * Tierra Madre Design System — Quiet Emerald
 *
 * "Una joya en calma" — the v2 redesign language.
 *
 * A quiet, editorial system: grayscale from edge to edge, generous air, and a
 * SINGLE saturated color in the whole product — the brand emerald, reserved for
 * primary actions and moments of brand. Everything else is a true, cool neutral.
 *
 * The values below are the AUTHORITATIVE token map from the handoff
 * (Phone.dc.html `themes()` / design_handoff_quiet_emerald/README.md) — a cool,
 * green-tinted grayscale with distinct --border / --hairline and a three-step
 * emerald (accent · accent-strong · accent-pure), light + dark.
 *
 * Type roles:
 *   - serif (Cormorant)        → editorial display: piece names, page titles
 *   - ui    (Hanken Grotesk)   → body, navigation, everything functional
 *   - mono  (DM Mono)          → data & gemology: carats, prices, specs, codes
 *
 * Imported from claude.ai/design project "Tierra Madre design evolution".
 * See design/redesign-v2/README.md + the handoff README for the full spec.
 */

// =============================================================================
// EMERALD — the only saturated color in the system
// =============================================================================

export const qeEmerald = {
  /** Brightest emerald — dots / trust indicators, brand moments (accent-pure) */
  primary: '#00AF84',
  /** Accent green — labels, links, active state (light-mode --accent) */
  dark: '#00785C',
  /** Lighter emerald — dark-mode accent, subtle tints */
  light: '#34C99B',
} as const;

/**
 * Three-step emerald per mode.
 *   accent  → labels / links / active state
 *   strong  → primary button fill (deliberately darkened light for WCAG AA)
 *   pure    → brightest — dots / trust indicators only
 *   on      → text/icon color ON an accent-strong fill
 */
export const qeAccent = {
  light: {
    accent: '#00785C',
    strong: '#006F52',
    pure: '#00AF84',
    on: '#FFFFFF',
  },
  dark: {
    accent: '#34C99B',
    strong: '#00AF84',
    pure: '#34C99B',
    on: '#06140E',
  },
} as const;

// =============================================================================
// NEUTRALS — a cool, green-tinted grayscale (light-mode reference ramp)
//   #FFFFFF · #F6F7F7 · #EBEDEC · #E4E7E5 · #C9CECB · #9AA09D · #5C6360 · #3A403E · #14181A
// =============================================================================

export const qeGray = {
  0: '#FFFFFF',
  50: '#F7F8F8',
  100: '#F1F2F2',
  150: '#EBEDEC',
  200: '#E4E7E5',
  300: '#C9CECB',
  400: '#9AA09D',
  500: '#8C928F',
  600: '#5C6360',
  700: '#3A403E',
  800: '#272C2B',
  900: '#14181A',
  950: '#0E1110',
} as const;

// =============================================================================
// SEMANTIC SURFACES (light) — quiet, editorial
// =============================================================================

export const qeLight = {
  /** App background */
  base: '#F7F8F8',
  /** Card / raised surface */
  surface: '#FFFFFF',
  /** Image "well" behind a piece (--surface-2) — soft neutral so the emerald pops */
  well: '#F1F2F2',
  /** 1px component borders / thumb outline (--border) */
  border: '#E4E7E5',
  /** 1px row dividers / section rules (--hairline) */
  hairline: '#EBEDEC',
  /** Primary text — near-black */
  text: '#14181A',
  /** Secondary text, body copy (--muted) */
  muted: '#5C6360',
  /** Captions, mono labels, placeholder (--subtle) */
  subtle: '#8C928F',
  // ---- back-compat aliases (previous API) ----
  /** @deprecated use `muted` */
  textMuted: '#5C6360',
  /** @deprecated use `subtle` */
  textFaint: '#8C928F',
} as const;

// =============================================================================
// DARK MODE — same system on near-black; emerald stays the only color
// =============================================================================

export const qeDark = {
  /** App background */
  base: '#0E1110',
  /** Card surface */
  surface: '#15191A',
  /** Higher surface / image well (--surface-2) */
  surfaceRaised: '#1B1F1F',
  /** 1px component borders (--border) */
  border: '#272C2B',
  /** 1px dividers (--hairline) */
  hairline: '#222726',
  /** Primary text on dark */
  text: '#EAEDEB',
  /** Secondary text (--muted) */
  textMuted: '#9AA09D',
  /** Captions / placeholder (--subtle) */
  subtle: '#6B726F',
} as const;

// =============================================================================
// SHADOWS — used very sparingly
// =============================================================================

export const qeShadow = {
  light: '0 18px 40px -24px rgba(13,30,24,0.30)',
  dark: '0 20px 46px -26px rgba(0,0,0,0.8)',
} as const;

// =============================================================================
// RAW TOKEN MAP — mirrors the handoff themes() exactly (direct hex access)
// =============================================================================

export const qeTokens = {
  light: {
    bg: '#F7F8F8',
    surface: '#FFFFFF',
    surface2: '#F1F2F2',
    border: '#E4E7E5',
    hairline: '#EBEDEC',
    text: '#14181A',
    muted: '#5C6360',
    subtle: '#8C928F',
    accent: '#00785C',
    accentStrong: '#006F52',
    onAccent: '#FFFFFF',
    accentPure: '#00AF84',
    shadow: qeShadow.light,
  },
  dark: {
    bg: '#0E1110',
    surface: '#15191A',
    surface2: '#1B1F1F',
    border: '#272C2B',
    hairline: '#222726',
    text: '#EAEDEB',
    muted: '#9AA09D',
    subtle: '#6B726F',
    accent: '#34C99B',
    accentStrong: '#00AF84',
    onAccent: '#06140E',
    accentPure: '#34C99B',
    shadow: qeShadow.dark,
  },
} as const;

// =============================================================================
// TYPOGRAPHY — three roles, three families
// =============================================================================

export const qeFont = {
  /** Editorial display serif — piece names, titles ("Una joya en calma") */
  serif:
    '"EB Garamond", "Cormorant Garamond", Georgia, "Times New Roman", serif',
  /** Functional UI sans — body, nav, buttons, labels */
  ui: '"Libre Franklin", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  /**
   * Data & gemology face — carats, prices, specs, codes.
   *
   * NOT a monospace. High-jewelry catalogues (Sotheby's, Net-a-Porter, 1stDibs,
   * Brilliant Earth) set prices in the same sans as the card metadata, never in
   * a monospace — fixed-width digit cells read mechanical, like code, which is
   * the opposite of hand-craft. Alignment comes from the OpenType `tnum`
   * (tabular figures) feature on a proportional face, not from a mono. The key
   * is kept as `mono` so every existing `qeFont.mono` / `--tm-font-mono`
   * reference picks up the new face without a rename sweep.
   */
  mono: '"Libre Franklin", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;

/** Type role presets (composable sx fragments). */
export const qeType = {
  /** Large editorial display (page heroes) — pair with clamp() sizing at call site */
  display: {
    fontFamily: qeFont.serif,
    fontWeight: 500,
    lineHeight: 1.05,
    letterSpacing: '-0.01em',
  },
  /** Piece / card title */
  title: {
    fontFamily: qeFont.serif,
    fontWeight: 500,
    lineHeight: 1.15,
    letterSpacing: '0',
  },
  /** Body copy */
  body: {
    fontFamily: qeFont.ui,
    fontWeight: 400,
    lineHeight: 1.55,
    letterSpacing: '0',
  },
  /** Overline / section label — uppercase mono, wide tracking */
  overline: {
    fontFamily: qeFont.mono,
    fontWeight: 500,
    fontSize: '0.6875rem',
    lineHeight: 1.4,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
  },
  /** Gemology / spec line — mono, muted */
  spec: {
    fontFamily: qeFont.mono,
    fontWeight: 400,
    fontSize: '0.6875rem',
    lineHeight: 1.4,
    letterSpacing: '0.05em',
  },
  /** Price / numeric data — tabular mono */
  data: {
    fontFamily: qeFont.mono,
    fontWeight: 500,
    letterSpacing: '0',
    fontVariantNumeric: 'tabular-nums' as const,
  },
} as const;

// =============================================================================
// SHAPE & MOTION — restrained
// =============================================================================

export const qeRadius = {
  /** Image wells / small cards (spec 4–5px) */
  xs: '5px',
  sm: '8px',
  md: '12px',
  lg: '18px',
  xl: '24px',
  pill: '999px',
} as const;

export const qeMotion = {
  /** Quiet, confident easing */
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fast: '160ms',
  base: '240ms',
  slow: '420ms',
} as const;

// =============================================================================
// MODE-AWARE ACCESSOR
// =============================================================================

export type QEMode = 'light' | 'dark';

export interface QESurfaces {
  /** App background (--bg) */
  base: string;
  /** Card surface (--surface) */
  surface: string;
  /** Image well (--surface-2) */
  well: string;
  /** Component border (--border) */
  border: string;
  /** Row divider / section rule (--hairline) */
  hairline: string;
  /** Primary text (--text) */
  text: string;
  /** Secondary text (--muted) */
  muted: string;
  /** Caption / label (--subtle) */
  subtle: string;
  /** @deprecated alias of `muted` */
  textMuted: string;
  /** @deprecated alias of `subtle` */
  textFaint: string;
  /** Emerald for labels / links / active (--accent) */
  accent: string;
  /** Emerald primary-button fill (--accent-strong) */
  accentStrong: string;
  /** Brightest emerald — dots / trust only (--accent-pure) */
  accentPure: string;
  /** Text/icon color on an accent-strong fill (--on-accent) */
  onAccent: string;
  /** @deprecated brand emerald primary — prefer accent/accentPure */
  emerald: string;
  /** @deprecated */
  emeraldDark: string;
  /** @deprecated */
  emeraldLight: string;
  /** Editorial drop shadow (used sparingly) */
  shadow: string;
}

/** Resolve the full Quiet Emerald token set for a given theme mode. */
export function getQuietEmerald(mode: QEMode): QESurfaces {
  const t = qeTokens[mode];
  return {
    base: t.bg,
    surface: t.surface,
    well: t.surface2,
    border: t.border,
    hairline: t.hairline,
    text: t.text,
    muted: t.muted,
    subtle: t.subtle,
    textMuted: t.muted,
    textFaint: t.subtle,
    accent: t.accent,
    accentStrong: t.accentStrong,
    accentPure: t.accentPure,
    onAccent: t.onAccent,
    emerald: qeEmerald.primary,
    emeraldDark: qeEmerald.dark,
    emeraldLight: qeEmerald.light,
    shadow: t.shadow,
  };
}

// =============================================================================
// COMPOSITE
// =============================================================================

export const quietEmerald = {
  emerald: qeEmerald,
  accent: qeAccent,
  gray: qeGray,
  dark: qeDark,
  light: qeLight,
  tokens: qeTokens,
  shadow: qeShadow,
  font: qeFont,
  type: qeType,
  radius: qeRadius,
  motion: qeMotion,
  get: getQuietEmerald,
} as const;

export default quietEmerald;
