/**
 * Touch-target mixins.
 *
 * iOS HIG and WCAG 2.5.8 both want ~44px of reachable area, but the catalog
 * toolbar is visually dense: a 390px row holds a search field plus three
 * controls, and growing those controls to 44px would push the field below a
 * usable width. `hitSlop` resolves that the way native does — it grows the
 * TOUCH area without growing the PAINTED control.
 */

import type { SxProps, Theme } from '@mui/material';
import { touchTargets } from '../tokens/spacing';

/**
 * Expands an element's effective tap area to at least `min` square, centered
 * on the element, without changing its visual size or layout footprint.
 *
 * Implemented as a transparent `::after` overlay: pseudo-elements hit-test as
 * their host, so `event.target` is unchanged and every existing handler,
 * ripple and focus style keeps working untouched.
 *
 * Two caveats worth knowing before you reach for this:
 *
 *  - The slop is absolutely positioned and therefore escapes the element's
 *    box. In a tight flex row it can overlap a NEIGHBOUR's slop, and the one
 *    painted later wins the press. For controls sitting in a `gap: 0` row,
 *    grow the real padding instead — see the quick-access tabs in
 *    `MobileSearchBar`.
 *  - It needs the host to not clip. MUI dropped IconButton's `overflow:
 *    visible` reset in v6, so verify per host rather than assuming.
 *
 * @param min - Minimum square hit area in px. Defaults to the iOS 44px floor.
 */
export const hitSlop = (
  min: number = touchTargets.minimum,
): SxProps<Theme> => ({
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: `max(100%, ${min}px)`,
    height: `max(100%, ${min}px)`,
    // Transparent, but must still receive pointer events to do its job.
    backgroundColor: 'transparent',
  },
});
