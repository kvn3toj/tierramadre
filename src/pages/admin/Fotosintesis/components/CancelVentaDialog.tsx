/**
 * CancelVentaDialog — confirm cancelling a sale with a required free-text
 * reason (Q-8 closeout). Cap 280 characters. Used by VentaDetailPage.
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Box,
  Button,
  TextField,
  alpha,
} from "@mui/material";
import { emeraldCore } from "../../../../design-system/tokens/colors";
import { fontWeights } from "../../../../design-system";
import { spanishText } from "../utils/fieldLang";

const REASON_MAX = 280;

interface CancelVentaDialogProps {
  open: boolean;
  saleId: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

export function CancelVentaDialog({
  open,
  saleId,
  onCancel,
  onConfirm,
}: CancelVentaDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const trimmed = reason.trim();
  const canConfirm =
    trimmed.length > 0 && trimmed.length <= REASON_MAX && !submitting;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo cancelar la venta.";
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onCancel}
      PaperProps={{
        sx: { borderRadius: 3, maxWidth: 460, mx: 2, width: "100%" },
      }}
    >
      <DialogTitle
        sx={{ fontWeight: fontWeights.bold, fontSize: "1.1rem", pb: 0.5 }}
      >
        Cancelar venta {saleId}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: "0.875rem", mb: 1.5 }}>
          Esta acción devuelve los ítems vendidos al estado DISPONIBLE y deja
          registro en el historial. Necesitamos un motivo para auditoría.
        </DialogContentText>
        <TextField
          autoFocus
          multiline
          minRows={3}
          maxRows={6}
          fullWidth
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
          placeholder="Ej. acordada devolución con la clienta, ítem regresa a inventario."
          disabled={submitting}
          variant="outlined"
          slotProps={{ htmlInput: spanishText }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: alpha("#000", 0.55),
            mt: 0.5,
          }}
        >
          <Box>{trimmed.length === 0 ? "Motivo requerido" : ""}</Box>
          <Box>
            {reason.length}/{REASON_MAX}
          </Box>
        </Box>
        {error ? (
          <Box
            role="alert"
            sx={{
              mt: 1.5,
              padding: "10px 12px",
              borderRadius: 2,
              border: `1px solid ${alpha("#B33A2F", 0.3)}`,
              background: alpha("#B33A2F", 0.06),
              color: "#B33A2F",
              fontSize: 12,
            }}
          >
            {error}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onCancel}
          disabled={submitting}
          variant="outlined"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: fontWeights.semibold,
            borderColor: alpha("#000", 0.15),
            color: "text.primary",
          }}
        >
          Volver
        </Button>
        <Button
          onClick={() => void handleConfirm()}
          disabled={!canConfirm}
          aria-busy={submitting}
          variant="contained"
          color="error"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: fontWeights.semibold,
            ...(!canConfirm && { bgcolor: alpha(emeraldCore.dark, 0.25) }),
          }}
        >
          {submitting ? "Cancelando…" : "Cancelar venta"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CancelVentaDialog;
