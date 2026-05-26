/**
 * `getFoto(mode)` — token resolver for the Fotosíntesis admin redesign
 * (`/admin/products`).
 *
 * Cool-neutral surfaces + emerald accent. Lives next to `getAtelier`
 * — the two are independent token namespaces. Theme-aware via the MUI
 * palette mode passed in.
 *
 * Spec: docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md
 */

import { emeraldCore, goldAccent } from "./colors";

export type FotoMode = "light" | "dark";

export interface FotoTokens {
  surfaces: {
    /** Page background. Pure white in light, deep neutral in dark. */
    canvas: string;
    /** Bandeja background, hover state. One step softer than canvas. */
    panel: string;
    /** Inputs, cards inside Bandeja. Two steps softer than canvas. */
    inset: string;
    /** Hover of inset — one step deeper than inset. v2 token. */
    inset2: string;
    /** Row resting state. Same as canvas — rows live ON the page. */
    row: string;
    /** Row hover — whisper-quiet shift. Same as panel. */
    rowHover: string;
    /** Row active (selected for Bandeja). Soft emerald wash. */
    rowActive: string;
    /** 1px hairline — barely visible separator. */
    edge: string;
    /** 1px standard rule — section breaks. */
    rule: string;
    /** 1px strong border — segmented controls, pressed states. */
    edgeStrong: string;
  };
  ink: {
    /** Headlines + primary text. */
    primary: string;
    /** Body + supporting text. */
    secondary: string;
    /** Labels + metadata. */
    tertiary: string;
    /** Disabled, placeholder. */
    mute: string;
    /** Text on a solid emerald or ink button. */
    inverse: string;
  };
  accent: {
    /** Emerald — buttons, active states, sparkline fill. */
    primary: string;
    /** Background tint for selected row, soft glow. */
    soft: string;
    /** Deeper emerald — hover of primary, prominent numbers. v2 token. */
    deep: string;
    /** Focus ring tint — 3px box-shadow on focused inputs. v2 token. */
    glow: string;
  };
  status: {
    available: string;
    consigned: string;
    sold: string;
  };
  motion: {
    rowHover: string;
    sheet: string;
  };
}

const LIGHT: FotoTokens = {
  surfaces: {
    canvas: "#FFFFFF",
    panel: "#FAFAFA",
    inset: "#F4F5F4",
    inset2: "#ECEDEA",
    row: "#FFFFFF",
    rowHover: "#FAFAFA",
    rowActive: "rgba(0, 92, 66, 0.06)",
    edge: "rgba(11, 16, 14, 0.06)",
    rule: "rgba(11, 16, 14, 0.10)",
    edgeStrong: "rgba(11, 16, 14, 0.18)",
  },
  ink: {
    primary: "#0B100E",
    secondary: "#4A5251",
    tertiary: "#5F6764",
    mute: "#B7BCBA",
    inverse: "#FFFFFF",
  },
  accent: {
    // emeraldCore.dark = #008C61 — passes WCAG AA contrast on white
    primary: emeraldCore.dark,
    soft: "rgba(0, 92, 66, 0.07)",
    // Handoff §2.1: #006B4A — hover of accent, prominent numbers
    deep: "#006B4A",
    // Handoff §2.5: focus-ring tint, used as `0 0 0 3px var(--accent-glow)`
    glow: "rgba(0, 140, 98, 0.15)",
  },
  status: {
    available: emeraldCore.dark,
    consigned: goldAccent.primary,
    sold: "#B33A2F",
  },
  motion: {
    rowHover: "background 120ms ease",
    sheet:
      "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms linear",
  },
};

const DARK: FotoTokens = {
  surfaces: {
    canvas: "#0B0D0C",
    panel: "#131614",
    inset: "#1B1F1D",
    inset2: "#232826",
    row: "#0B0D0C",
    rowHover: "#131614",
    rowActive: "rgba(124, 205, 169, 0.08)",
    edge: "rgba(255, 255, 255, 0.05)",
    rule: "rgba(255, 255, 255, 0.09)",
    edgeStrong: "rgba(255, 255, 255, 0.18)",
  },
  ink: {
    primary: "#EFF1EF",
    secondary: "#B0B6B3",
    tertiary: "#7B807E",
    mute: "#555A58",
    inverse: "#0B0D0C",
  },
  accent: {
    // emeraldCore.light = #33C194 — passes WCAG AA contrast on dark
    primary: emeraldCore.light,
    soft: "rgba(124, 205, 169, 0.10)",
    // In dark mode "deep" reads as "more saturated emerald" — use lighter for visibility
    deep: emeraldCore.lighter,
    // Brighter glow on dark for the same focus-ring effect
    glow: "rgba(124, 205, 169, 0.18)",
  },
  status: {
    available: emeraldCore.light,
    consigned: goldAccent.primary,
    sold: "#D75348",
  },
  motion: {
    rowHover: "background 120ms ease",
    sheet:
      "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms linear",
  },
};

export function getFoto(mode: FotoMode): FotoTokens {
  return mode === "dark" ? DARK : LIGHT;
}
