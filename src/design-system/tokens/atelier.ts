/**
 * Atelier Tokens — Admin Product Management
 *
 * The back-of-house companion to the customer Treasure Browser. Where the
 * showroom wears emerald and gold, the atelier wears parchment, iron-gall
 * ink, and aged brass. Color is restricted: the only saturated hues are
 * the three status marks (emerald-stamp, ruby-mark, topaz-mark), and they
 * appear only as the status pip — the signature element of the panel.
 *
 * Depth strategy: borders-only. No decorative shadows.
 * Spacing: 4px grid (deterministic for tabular density).
 *
 * These tokens DO NOT replace existing design-system tokens. They live
 * alongside emeraldCore / goldAccent / iosSemantic and are used only by
 * `src/pages/admin/ProductManagement/*` and its sub-components.
 */

// =============================================================================
// SURFACES — parchment (light) / vault (dark)
// =============================================================================

export const atelierSurfaces = {
  light: {
    /** Page canvas — warm cream, the color of a gemological certificate */
    canvas: '#F4EEE2',
    /** Row surface — same as canvas (sidebars + content share one ground) */
    row: '#F4EEE2',
    /** Row hover — barely-there warmth shift */
    rowHover: '#EFE7D6',
    /** Row selected / active drawer target */
    rowActive: '#E9DFC8',
    /** Drawer + elevated panels — one notch lighter than canvas */
    panel: '#FAF6EC',
    /** Inset surfaces (inputs, search) — slightly darker, "receives content" */
    inset: '#EAE2D2',
    /** Divider / hairline — the edge of the page */
    edge: 'rgba(14, 20, 16, 0.08)',
    /** Stronger divider — section break */
    edgeStrong: 'rgba(14, 20, 16, 0.14)',
  },
  dark: {
    /** Vault canvas — charcoal with green undertone, velvet-lined case */
    canvas: '#16201B',
    row: '#16201B',
    rowHover: '#1B2721',
    rowActive: '#23302A',
    panel: '#1F2A24',
    inset: '#121A16',
    edge: 'rgba(244, 238, 226, 0.08)',
    edgeStrong: 'rgba(244, 238, 226, 0.14)',
  },
} as const;

// =============================================================================
// TEXT — iron-gall ink hierarchy
// =============================================================================

export const atelierInk = {
  light: {
    /** Primary text — iron-gall ink (deep with green undertone, not pure black). 17:1 on parchment. */
    primary: '#0E1410',
    /** Secondary text — ledger margin notes. ~7.5:1 on parchment. */
    secondary: '#3A4640',
    /** Tertiary text — metadata, item numbers. 4.6:1 on parchment (WCAG AA). */
    tertiary: '#5A6863',
    /** Muted text — placeholders only (decorative, ~3:1). Don't put real content here. */
    muted: '#7E8983',
    /** Inverted (on dark accent) */
    inverse: '#F4EEE2',
  },
  dark: {
    primary: '#F4EEE2',
    secondary: '#C7C0B0',
    /** ~5:1 on vault canvas */
    tertiary: '#A1A89F',
    /** ~3:1 on vault canvas — placeholders only */
    muted: '#7C8278',
    inverse: '#0E1410',
  },
} as const;

// =============================================================================
// ACCENTS — restricted palette
// =============================================================================

/**
 * Brass — the aged brass of jeweler's weighing scales.
 * Used for hover borders and dividers. Never a fill, never a brand color.
 */
export const atelierBrass = {
  /** Primary brass — divider emphasis */
  base: '#9B7A3F',
  /** Soft brass — for hover borders */
  soft: 'rgba(155, 122, 63, 0.32)',
  /** Whisper brass — for resting borders on cards */
  whisper: 'rgba(155, 122, 63, 0.16)',
} as const;

/**
 * Status marks — the ONLY saturated colors in the panel.
 * Each appears only as the 6×6 status pip and as a faint background
 * tint behind the row (4% alpha) when the status is active.
 *
 * These are intentionally desaturated relative to typical UI status colors —
 * they read as ledger ink, not as "warning toasts".
 */
export const atelierStatus = {
  /** DISPONIBLE — emerald stamp (mine-fresh muzo, but desaturated) */
  available: {
    pip: '#0E6B4A',
    pipDark: '#3DA47C',
    rowTint: 'rgba(14, 107, 74, 0.04)',
    rowTintDark: 'rgba(61, 164, 124, 0.06)',
    label: 'Disponible',
  },
  /** VENDIDA — oxblood (deep, not bright red) */
  sold: {
    pip: '#7C2A2A',
    pipDark: '#B85959',
    rowTint: 'rgba(124, 42, 42, 0.04)',
    rowTintDark: 'rgba(184, 89, 89, 0.06)',
    label: 'Vendida',
  },
  /** ASESOR — antiqued amber (consigned out) */
  consigned: {
    pip: '#A86E2C',
    pipDark: '#D5A05E',
    rowTint: 'rgba(168, 110, 44, 0.04)',
    rowTintDark: 'rgba(213, 160, 94, 0.06)',
    label: 'Con asesor',
  },
} as const;

// =============================================================================
// FOCUS — the only emerald moment in the panel
// =============================================================================

export const atelierFocus = {
  light: {
    ring: '#0E6B4A',
    ringSoft: 'rgba(14, 107, 74, 0.32)',
  },
  dark: {
    ring: '#3DA47C',
    ringSoft: 'rgba(61, 164, 124, 0.36)',
  },
} as const;

// =============================================================================
// GRID — 4px tabular density
// =============================================================================

/** Atelier base unit — 4px. Multiples: 4, 8, 12, 16, 20, 24, 32, 40, 56. */
export const atelierGrid = 4;

export const atelierSpacing = {
  pip: 6,
  pipGap: 4,
  rowPaddingY: 12,
  rowPaddingX: 16,
  rowMinHeight: 48,
  rowGap: 1,           // 1px hairline between rows
  drawerWidth: 480,
  drawerPaddingX: 24,
  drawerPaddingY: 20,
  fieldGap: 16,
  sectionGap: 32,
  toolbarHeight: 56,
  contentMaxWidth: 1240,
} as const;

// =============================================================================
// TYPE — ledger typography
// =============================================================================

/**
 * Atelier typography overrides. Inherits family from existing `fontFamilies`,
 * but defines specific sizes/weights/letter-spacing for the panel.
 *
 * Numerical data uses tabular monospace so columns align like a ledger.
 * Labels use uppercase with letter-spacing — like a stamp on a parcel.
 */
export const atelierType = {
  /** Item number, weight, price — tabular, monospace */
  data: {
    fontFamily: '"SF Mono", "JetBrains Mono", ui-monospace, Menlo, monospace',
    fontFeatureSettings: '"tnum" 1, "zero" 1',
    fontSize: '13px',
    lineHeight: 1.4,
    fontWeight: 500,
    letterSpacing: '-0.005em',
  },
  /** Product name in row */
  rowTitle: {
    fontSize: '14px',
    lineHeight: 1.35,
    fontWeight: 500,
    letterSpacing: '-0.005em',
  },
  /** Field labels — stamp on a parcel */
  label: {
    fontSize: '10px',
    lineHeight: 1.2,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  /** Section title in drawer */
  section: {
    fontSize: '11px',
    lineHeight: 1.2,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
  },
  /** Drawer headline — product name */
  headline: {
    fontSize: '20px',
    lineHeight: 1.25,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  /** Toolbar / breadcrumb */
  meta: {
    fontSize: '12px',
    lineHeight: 1.4,
    fontWeight: 500,
    letterSpacing: '0',
  },
} as const;

// =============================================================================
// MOTION — minimal, deceleration only
// =============================================================================

/**
 * Atelier motion is restrained. No spring, no bounce. The drawer slides in
 * with deceleration like a card pulling out of a box. Hover transitions are
 * fast color shifts, nothing else.
 */
export const atelierMotion = {
  /** Row hover — fast color transition only */
  rowHover: 'background-color 120ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  /** Drawer open/close */
  drawer: 'transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms linear',
  /** Pip state change (after save) */
  pip: 'background-color 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  /** Save button pressed */
  press: 'transform 80ms linear',
} as const;

// =============================================================================
// MODE RESOLVER
// =============================================================================

export type AtelierMode = 'light' | 'dark';

/**
 * Resolve the full atelier palette for a given mode. Use this in components
 * that already know whether they're in light or dark mode.
 *
 * @example
 * const atelier = getAtelier(theme.palette.mode);
 * <Box sx={{ bgcolor: atelier.surfaces.canvas, color: atelier.ink.primary }} />
 */
export function getAtelier(mode: AtelierMode) {
  return {
    surfaces: atelierSurfaces[mode],
    ink: atelierInk[mode],
    brass: atelierBrass,
    focus: atelierFocus[mode],
    status: {
      available: {
        pip: mode === 'light' ? atelierStatus.available.pip : atelierStatus.available.pipDark,
        rowTint:
          mode === 'light'
            ? atelierStatus.available.rowTint
            : atelierStatus.available.rowTintDark,
        label: atelierStatus.available.label,
      },
      sold: {
        pip: mode === 'light' ? atelierStatus.sold.pip : atelierStatus.sold.pipDark,
        rowTint:
          mode === 'light' ? atelierStatus.sold.rowTint : atelierStatus.sold.rowTintDark,
        label: atelierStatus.sold.label,
      },
      consigned: {
        pip: mode === 'light' ? atelierStatus.consigned.pip : atelierStatus.consigned.pipDark,
        rowTint:
          mode === 'light'
            ? atelierStatus.consigned.rowTint
            : atelierStatus.consigned.rowTintDark,
        label: atelierStatus.consigned.label,
      },
    },
    spacing: atelierSpacing,
    type: atelierType,
    motion: atelierMotion,
    grid: atelierGrid,
  };
}

export type Atelier = ReturnType<typeof getAtelier>;
