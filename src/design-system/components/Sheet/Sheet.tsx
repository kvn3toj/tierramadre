/**
 * Tierra Madre Design System v3 — Sheet Component
 *
 * The ONE overlay (DS3 §5.4/§5.5, addendum §C). Absorbs `BottomSheetShell`,
 * `IOSMoreSheet`, `IOSSettingsSheet`, and the esmereo sheets (`ClaimSheet`,
 * `EsmereoCreationSheet`, `EsmereoExplainerSheet`).
 *
 * Built on MUI `Dialog`/`Drawer` (both wrap `Modal`) rather than a hand-rolled
 * `Backdrop` + fixed `Box` — this gets focus-trap, focus-restore-on-close, and
 * Escape-to-dismiss for free (WCAG 2.4.3), which the two `IOS*Sheet`
 * predecessors implemented `role="dialog" aria-modal="true"` for cosmetically
 * but never actually trapped focus in.
 *
 * Desktop (≥ MUI `sm`, 600px): centered modal, capped at `maxWidth`.
 * Mobile (< 600px): bottom sheet, `max-height: 85dvh` (§5.4.6) + safe-area.
 */

import React from 'react';
import { Box, Dialog, Drawer, useMediaQuery, useTheme } from '@mui/material';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Accessible name for the dialog region. Prefer `ariaLabelledBy` when the content has its own heading. */
  ariaLabel?: string;
  /** id of an element inside `children` that serves as the sheet's heading. */
  ariaLabelledBy?: string;
  /** Desktop centered-modal width cap, in px. Default 520. */
  maxWidth?: number;
  /** Hides the mobile drag handle. Default false. */
  hideHandle?: boolean;
  /**
   * Blocks backdrop-click and Escape dismissal (e.g. while an action is
   * in-flight). The consumer must still offer an explicit way to call
   * `onClose`. Default false.
   */
  disableClose?: boolean;
  className?: string;
}

// MUI's Transition components need numeric ms, not CSS custom properties —
// these match --tm-slow (enter) / --tm-base (exit) from css-variables-v3.css.
const ENTER_MS = 420;
const EXIT_MS = 240;

export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  children,
  ariaLabel,
  ariaLabelledBy,
  maxWidth = 520,
  hideHandle = false,
  disableClose = false,
  className,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const sharedPaperSx = {
    backgroundColor: 'var(--tm-surface)',
    border: '1px solid var(--tm-border)',
    boxShadow: 'var(--tm-shadow)',
    backgroundImage: 'none',
  };

  const sharedSlotProps = {
    backdrop: {
      sx: { backgroundColor: 'var(--tm-scrim)' },
    },
  };

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={disableClose ? undefined : onClose}
        className={className}
        transitionDuration={{ enter: ENTER_MS, exit: EXIT_MS }}
        slotProps={{
          ...sharedSlotProps,
          paper: {
            role: 'dialog',
            'aria-modal': true,
            'aria-label': ariaLabel,
            'aria-labelledby': ariaLabelledBy,
            sx: {
              ...sharedPaperSx,
              borderRadius: 'var(--tm-radius-sheet) var(--tm-radius-sheet) 0 0',
              borderBottom: 'none',
              maxHeight: '85vh',
              '@supports (height: 100dvh)': {
                maxHeight: '85dvh',
              },
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            },
          },
        }}
      >
        {!hideHandle && (
          <Box
            aria-hidden
            sx={{
              width: 36,
              height: 4,
              borderRadius: 'var(--tm-radius-pill)',
              backgroundColor: 'var(--tm-border)',
              margin: '10px auto 0',
              flexShrink: 0,
            }}
          />
        )}
        {children}
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={disableClose ? undefined : onClose}
      className={className}
      transitionDuration={{ enter: ENTER_MS, exit: EXIT_MS }}
      slotProps={{
        ...sharedSlotProps,
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-label': ariaLabel,
          'aria-labelledby': ariaLabelledBy,
          sx: {
            ...sharedPaperSx,
            borderRadius: 'var(--tm-radius-sheet)',
            width: '100%',
            maxWidth,
            maxHeight: '85vh',
            '@supports (height: 100dvh)': {
              maxHeight: '85dvh',
            },
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          },
        },
      }}
    >
      {children}
    </Dialog>
  );
};

export default Sheet;
