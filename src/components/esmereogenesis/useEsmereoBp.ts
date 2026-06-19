import { useMediaQuery } from "@mui/material";

export type EsmereoBp = "mobile" | "ipad" | "desktop";

/** Desktop side-nav / bottom-bar handoff threshold (kept in sync with IOSTabBar). */
export const ESMEREO_DESKTOP_MIN = 1180;
const ESMEREO_IPAD_MIN = 760;

/**
 * Single source of truth for the Bóveda responsive tiers. Thresholds match the
 * prototype (mobile < 760, iPad 760–1179, desktop ≥ 1180) so a 834-wide iPad is
 * the iPad tier, not mobile. Mobile is the untouched 390 path; iPad gets the
 * wider centered column + centered modals; desktop adds the slim left side-nav.
 */
export function useEsmereoBp(): EsmereoBp {
  const upIpad = useMediaQuery(`(min-width:${ESMEREO_IPAD_MIN}px)`);
  const upDesktop = useMediaQuery(`(min-width:${ESMEREO_DESKTOP_MIN}px)`);
  return upDesktop ? "desktop" : upIpad ? "ipad" : "mobile";
}
