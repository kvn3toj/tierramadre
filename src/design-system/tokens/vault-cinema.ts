// src/design-system/tokens/vault-cinema.ts
/**
 * Design tokens for the cinematic Bóveda Secreta lockscreen.
 * See docs/superpowers/specs/2026-04-22-boveda-secreta-rediseno-cinematografico-design.md
 */

export const vaultCinema = {
  color: {
    // Backgrounds
    ink: '#000000',
    nightDeep: '#030808',
    nightShadow: '#0a1a14',
    nightHint: '#152820',

    // Metal (oro envejecido, no saturado)
    goldAged: '#8a7329',
    champagne: '#c9a961',
    champagneBright: '#dfc383',

    // Gem
    emerald: '#00AE7A',
    emeraldLight: '#4de0b0',
    emeraldDeep: '#004a33',

    // Failure
    coral: '#C94C4C',

    // Interior reveal (ámbar cálido tras la puerta)
    interiorWarm: 'rgba(255, 200, 120, 0.6)',
    interiorMid: 'rgba(120, 70, 30, 0.4)',
    interiorDark: 'rgba(20, 10, 4, 0.8)',
  },

  alpha: {
    rimSoft: 0.18,
    rimMedium: 0.28,
    rimStrong: 0.4,
    inactiveLabel: 0.28,
    nearLabel: 0.6,
    activeLabel: 1.0,
    makerMark: 0.4,
  },

  typography: {
    family: '"Playfair Display", serif',
    metaFamily: '"DM Sans", system-ui, sans-serif',
    centerSymbolSize: 11,
    centerNumberSize: 34,
    centerNumberSizeLg: 42,
    dialDigitSize: 16,
    dialDigitSizeActive: 20,
    dialSymbolSize: 13,
    dialSymbolSizeActive: 14,
    makerMarkSize: 8,
    makerMarkLetterSpacing: '0.5em',
    centerSymbolLetterSpacing: '0.3em',
  },

  layout: {
    /** Diámetro virtual base — escala responsive desde aquí */
    wheelBase: 440,
    outerRingInset: '5%',
    innerRingDiameter: '56%',
    pointerHeight: 20,
    pointerWidth: 1,
    gemSize: 7,
    gemSizePulse: 9,
    cardinalGemSize: 5,
    rimHairlineWidth: 1,
  },
} as const;

export type VaultCinemaTokens = typeof vaultCinema;
