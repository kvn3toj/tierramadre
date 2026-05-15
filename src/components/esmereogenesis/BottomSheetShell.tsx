/**
 * BottomSheetShell
 *
 * Canonical bottom-sheet primitive for the Esmereogénesis feature. Wraps MUI
 * Drawer anchor="bottom" with the shared visual recipe: emerald mesh surface,
 * decorative drag handle, top-right close button, scroll-locked content area
 * that honours the iOS home indicator via env(safe-area-inset-bottom).
 *
 * Both EsmereoCreationSheet and ClaimSheet route through this shell so focus
 * trap, scroll-lock and swipe behaviour stay consistent — the audit caught
 * them using divergent primitives (Drawer vs Dialog+Slide) which produced two
 * different a11y code paths for what should be the same UX.
 */
import React from "react";
import { Box, Drawer, IconButton, alpha } from "@mui/material";
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
  /** Hide the decorative drag handle for sheets that don't read as draggable. */
  hideHandle?: boolean;
  /** Hide the close button (the consumer must offer its own dismiss path). */
  hideCloseButton?: boolean;
  /** Override the close-button aria-label (default "Cerrar"). */
  closeLabel?: string;
  children: React.ReactNode;
}

export const BottomSheetShell: React.FC<BottomSheetShellProps> = ({
  open,
  onClose,
  ariaLabelledBy,
  maxWidth = 600,
  hideHandle = false,
  hideCloseButton = false,
  closeLabel = "Cerrar",
  children,
}) => {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      keepMounted
      aria-labelledby={ariaLabelledBy}
      PaperProps={{
        elevation: 0,
        sx: {
          mx: "auto",
          width: "100%",
          maxWidth,
          maxHeight: "calc(100vh - env(safe-area-inset-top, 0px) - 24px)",
          borderRadius: "24px 24px 0 0",
          background: meshGradients.emerald,
          backgroundColor: emeraldCore.dark,
          overflowY: "auto",
          overscrollBehavior: "contain",
          pb: "env(safe-area-inset-bottom, 0px)",
          boxShadow: `0 -16px 40px ${blackAlpha(0.45)}`,
        },
      }}
    >
      <Box sx={{ position: "relative", p: 3, pb: 4 }}>
        {!hideHandle && (
          <Box
            aria-hidden
            sx={{
              width: 44,
              height: 4,
              borderRadius: 2,
              bgcolor: alpha(emeraldCore.primary, 0.25),
              mx: "auto",
              mb: 2,
            }}
          />
        )}
        {!hideCloseButton && (
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
    </Drawer>
  );
};

export default BottomSheetShell;
