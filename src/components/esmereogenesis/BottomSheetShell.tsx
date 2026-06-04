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
import "./boveda.css";

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
  /** Bóveda re-skin: paint the paper with the feature `--sheet-bg` + CSS vars. */
  boveda?: boolean;
  /** Feature theme for the Bóveda surface (default dark). */
  bovedaTheme?: "light" | "dark";
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
  boveda = false,
  bovedaTheme = "dark",
  children,
}) => {
  // Literal Bóveda sheet surface (the prototype's --sheet-bg). Painted directly
  // on the paper so we DON'T put `.bov-root` on it — that class forces
  // `position: relative` and would clobber the Drawer paper's positioning. The
  // CSS vars instead live on the inner content Box (already position:relative).
  const isLight = bovedaTheme === "light";
  const sheetBg = boveda
    ? isLight
      ? "linear-gradient(180deg, #FFFFFF, #EAEFF1 72%)"
      : "linear-gradient(180deg, #0c1a14, #060f0b 70%)"
    : meshGradients.emerald;
  const sheetBorder = boveda
    ? isLight
      ? "1px solid #DCE3E5"
      : "1px solid rgba(255,255,255,0.1)"
    : undefined;
  const sheetShadow = boveda
    ? isLight
      ? "0 -18px 48px rgba(54,74,80,0.20)"
      : "0 -24px 60px rgba(0,0,0,0.6)"
    : `0 -16px 40px ${blackAlpha(0.45)}`;

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
          background: sheetBg,
          backgroundColor: boveda ? undefined : emeraldCore.dark,
          border: sheetBorder,
          borderBottom: boveda ? "none" : undefined,
          overflowY: "auto",
          overscrollBehavior: "contain",
          pb: "env(safe-area-inset-bottom, 0px)",
          boxShadow: sheetShadow,
        },
      }}
    >
      <Box
        {...(boveda
          ? { className: "bov-root", "data-theme": bovedaTheme }
          : {})}
        sx={{ position: "relative", p: 3, pb: 4, background: "transparent" }}
      >
        {!hideHandle && (
          <Box
            aria-hidden
            sx={{
              width: 44,
              height: 4,
              borderRadius: 2,
              bgcolor: boveda
                ? "var(--ink-faint)"
                : alpha(emeraldCore.primary, 0.25),
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
              color: boveda ? "var(--ink-soft)" : "text.secondary",
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
