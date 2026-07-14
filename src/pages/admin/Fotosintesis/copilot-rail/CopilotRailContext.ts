import { createContext, useContext } from 'react';
import { layoutBreakpoints } from '../../../../design-system';

export type RailMode = 'docked' | 'overlay';

/** Docked-rail sizing + the breakpoint at which docking gives way to an overlay. */
export const RAIL_MIN_WIDTH = 320;
export const RAIL_MAX_WIDTH = 560;
export const RAIL_DEFAULT_WIDTH = 400;
/** Below this the rail can't push content, so it becomes a temporary overlay. */
export const RAIL_DOCK_BREAKPOINT = layoutBreakpoints.railDock;
/** Below this the overlay goes full-screen (phone). */
export const RAIL_FULLSCREEN_BREAKPOINT = 600;

export const RAIL_STORAGE = {
  OPEN: 'tierra-madre-copilot-rail/open',
  WIDTH: 'tierra-madre-copilot-rail/width',
  NAV_MAP_OPEN: 'tierra-madre-copilot-rail/navMapOpen',
} as const;

/** Max docked width that still leaves a usable content column on `viewport`. */
export function clampRailWidth(width: number, viewport: number): number {
  const ceiling = Math.min(
    RAIL_MAX_WIDTH,
    Math.max(RAIL_MIN_WIDTH, viewport - 760),
  );
  return Math.min(ceiling, Math.max(RAIL_MIN_WIDTH, width));
}

export interface CopilotRailContextValue {
  /** Expanded panel (true) vs the thin collapsed edge handle (false). */
  open: boolean;
  /** Docked (pushes content) above the breakpoint; overlay below it. */
  mode: RailMode;
  /** Docked panel width in px. */
  width: number;
  /** Whether the nav-map accordion is expanded. */
  navMapOpen: boolean;
  openRail: () => void;
  closeRail: () => void;
  toggle: () => void;
  setWidth: (w: number) => void;
  toggleNavMap: () => void;
}

export const CopilotRailContext = createContext<CopilotRailContextValue | null>(
  null,
);

export function useCopilotRail(): CopilotRailContextValue {
  const ctx = useContext(CopilotRailContext);
  if (!ctx) {
    throw new Error('useCopilotRail must be used within a CopilotRailProvider');
  }
  return ctx;
}
