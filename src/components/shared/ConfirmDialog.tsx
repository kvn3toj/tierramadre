/**
 * ConfirmDialog Component
 * Reusable confirmation dialog for destructive actions.
 * iOS HIG-styled with cancel/confirm pattern.
 */
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  alpha,
} from "@mui/material";
import { emeraldCore } from "../../design-system/tokens/colors";
import { fontWeights } from "../../design-system";
import { useLanguage } from "../../contexts/LanguageContext";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "error" | "primary";
  /** Disable confirm (and block backdrop/Esc) while an action is in-flight. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmColor = "error",
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();
  const finalConfirmLabel = confirmLabel || t.actions.delete;
  const finalCancelLabel = cancelLabel || t.actions.cancel;
  return (
    <Dialog
      open={open}
      onClose={confirmDisabled ? undefined : onCancel}
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: 340,
          mx: 2,
        },
      }}
    >
      <DialogTitle
        sx={{ fontWeight: fontWeights.bold, fontSize: "1.1rem", pb: 0.5 }}
      >
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: "0.875rem" }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: fontWeights.semibold,
            borderColor: alpha("#000", 0.15),
            color: "text.primary",
          }}
        >
          {finalCancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={confirmColor}
          disabled={confirmDisabled}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: fontWeights.semibold,
            ...(confirmColor === "primary" && {
              bgcolor: emeraldCore.primary,
              "&:hover": { bgcolor: emeraldCore.dark },
            }),
          }}
        >
          {finalConfirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
