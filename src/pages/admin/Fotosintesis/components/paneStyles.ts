/**
 * Shared pane recipes for Fotosíntesis pages.
 *
 * `fotoPaneSx` is the canonical lg-only self-scrolling side pane (Venta right
 * rail, Directorio list column, Captura pane, …). It replaces the old
 * `calc(100vh - 56px)` guesses — those overshot the real scrollport (<main>
 * is 100dvh minus shell chrome), producing double scroll and rows tucked
 * under the FotoTabBar. See "Navigation UX Rules" in design-system/README.md.
 *
 * Anatomy:
 * - height budget from the shell-published --app-main-height, minus the
 *   sticky FotoTopbar it sits below;
 * - sticky within its grid column so it stays pinned while <main> scrolls
 *   the sibling column (grid parents need alignItems/alignSelf: start);
 * - contained scroll: boundary gestures never chain into <main>;
 * - internal bottom clearance so the last row clears the floating FotoTabBar.
 */

import {
  appShell,
  bottomBarClearance,
  paneHeight,
} from '../../../../design-system';
import { FOTO_TOPBAR_HEIGHT } from './FotoTopbar';

export const fotoPaneSx = {
  height: { lg: paneHeight(FOTO_TOPBAR_HEIGHT) },
  position: { lg: 'sticky' },
  top: { lg: FOTO_TOPBAR_HEIGHT },
  alignSelf: { lg: 'start' },
  minHeight: 0,
  overflowY: { lg: 'auto' },
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
  paddingBottom: { lg: bottomBarClearance(appShell.fotoTabBarReserve) },
} as const;

/** Page-root min-height below the sticky FotoTopbar (replaces calc(100vh - 56px)). */
export const fotoPageMinHeight = paneHeight(FOTO_TOPBAR_HEIGHT);
