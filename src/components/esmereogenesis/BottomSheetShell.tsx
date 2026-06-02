/**
 * BottomSheetShell
 *
 * Canonical bottom-sheet primitive for the Esmereogénesis feature. Wraps MUI
 * Drawer anchor="bottom" with the shared visual recipe: emerald mesh surface,
 * draggable handle, top-right close button, scroll-locked content area that
 * honours the iOS home indicator via env(safe-area-inset-bottom).
 *
 * The visual surface + scroll container live on an inner Framer `motion.div`
 * (not the MUI Paper) so swipe-to-close can translate it freely without
 * fighting the Drawer's own Slide transition. Dragging is gated to the handle
 * via `useDragControls`, so content still scrolls normally.
 *
 * Both EsmereoCreationSheet and ClaimSheet route through this shell so focus
 * trap, scroll-lock and swipe behaviour stay consistent.
 */
import React, { useRef } from "react";
import { Box, Drawer, IconButton, alpha } from "@mui/material";
import {
  motion,
  useAnimationControls,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import { X } from "lucide-react";
import { emeraldCore } from "../../design-system/tokens/colors";
import { meshGradients } from "../../design-system/tokens/gradients";
import { blackAlpha } from "../../design-system/utils/colorUtils";

export interface BottomSheetShellProps {
  open: boolean;
  onClose: () => void;
  /** id of the inner heading element — links the Drawer to it for screen readers */
  ariaLabelledBy?: string;
  /** Cap on desktop so the sheet doesn't stretch absurd widths. Default 600. */
  maxWidth?: number;
  /** Hide the draggable handle for sheets that don't read as draggable. */
  hideHandle?: boolean;
  /** Hide the close button (the consumer must offer its own dismiss path). */
  hideCloseButton?: boolean;
  /** Override the close-button aria-label (default "Cerrar"). */
  closeLabel?: string;
  /**
   * The sheet is performing an uninterruptible action (e.g. submitting). Hides
   * the close button, disables swipe + backdrop + Esc dismissal, and marks the
   * content `aria-busy` so the lock is perceivable to assistive tech.
   */
  locked?: boolean;
  children: React.ReactNode;
}

// Drag distance / velocity past which a downward swipe dismisses the sheet.
const CLOSE_THRESHOLD = 120;
const CLOSE_VELOCITY = 600;

export const BottomSheetShell: React.FC<BottomSheetShellProps> = ({
  open,
  onClose,
  ariaLabelledBy,
  maxWidth = 600,
  hideHandle = false,
  hideCloseButton = false,
  closeLabel = "Cerrar",
  locked = false,
  children,
}) => {
  const controls = useAnimationControls();
  const dragControls = useDragControls();
  // Suppress the click that browsers synthesize after a drag gesture so a
  // short drag-and-snap-back doesn't also fire the handle's keyboard close.
  const draggedRef = useRef(false);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (
      !locked &&
      (info.offset.y > CLOSE_THRESHOLD || info.velocity.y > CLOSE_VELOCITY)
    ) {
      onClose();
    } else {
      // Snap back to rest.
      void controls.start({ y: 0 });
    }
    // Clear after the gesture settles so a real keypress isn't swallowed.
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      // When locked, swallow backdrop/Esc dismissal — the action must finish.
      onClose={locked ? undefined : onClose}
      keepMounted
      aria-labelledby={ariaLabelledBy}
      PaperProps={{
        elevation: 0,
        sx: {
          // Transparent positioning shell — the visible surface lives on the
          // inner motion.div so it can be dragged without fighting Slide.
          mx: "auto",
          width: "100%",
          maxWidth,
          background: "transparent",
          boxShadow: "none",
          overflow: "visible",
        },
      }}
    >
      <Box
        component={motion.div}
        drag={locked ? false : "y"}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragStart={() => {
          draggedRef.current = true;
        }}
        onDragEnd={handleDragEnd}
        animate={controls}
        aria-busy={locked || undefined}
        sx={{
          maxHeight: "calc(100vh - env(safe-area-inset-top, 0px) - 24px)",
          borderRadius: "24px 24px 0 0",
          background: meshGradients.emerald,
          backgroundColor: emeraldCore.dark,
          overflowY: "auto",
          overscrollBehavior: "contain",
          pb: "env(safe-area-inset-bottom, 0px)",
          boxShadow: `0 -16px 40px ${blackAlpha(0.45)}`,
        }}
      >
        <Box sx={{ position: "relative", p: 3, pb: 4 }}>
          {!hideHandle && (
            <Box
              role="button"
              tabIndex={locked ? -1 : 0}
              aria-label="Deslizar hacia abajo para cerrar"
              onPointerDown={(e) => {
                if (!locked) dragControls.start(e);
              }}
              onKeyDown={(e) => {
                if (!locked && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  if (!draggedRef.current) onClose();
                }
              }}
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                py: 1.25,
                mb: 1,
                cursor: locked ? "default" : "grab",
                // Let the handle own vertical pointer gestures (drag), not scroll.
                touchAction: "none",
                "&:active": { cursor: locked ? "default" : "grabbing" },
                "&:focus-visible": {
                  outline: `2px solid ${alpha(emeraldCore.primary, 0.6)}`,
                  outlineOffset: 2,
                  borderRadius: 8,
                },
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 44,
                  height: 4,
                  borderRadius: 2,
                  bgcolor: alpha(emeraldCore.primary, 0.25),
                }}
              />
            </Box>
          )}
          {!hideCloseButton && !locked && (
            <IconButton
              onClick={onClose}
              aria-label={closeLabel}
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                color: "text.secondary",
              }}
            >
              <X size={20} />
            </IconButton>
          )}
          {children}
        </Box>
      </Box>
    </Drawer>
  );
};

export default BottomSheetShell;
