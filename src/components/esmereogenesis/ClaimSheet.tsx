/**
 * ClaimSheet
 *
 * Bottom sheet shown when the user taps "Reclamar tu Esmeralda" on a completed
 * plan. Mock-only — real flow would coordinate with the asesor backend.
 *
 * Surface + dismiss behaviour live in BottomSheetShell so this file mirrors the
 * creation sheet recipe (same focus-trap, scroll-lock, swipe behaviour). Form
 * vs confirmed states animate via AnimatePresence inside the shell.
 */

import React, { useState } from "react";
import { Box, Button, TextField, Typography, alpha } from "@mui/material";
import { MessageCircle, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { EsmereoPlan } from "../../types/esmereogenesis";
import { useEsmereogenesis } from "../../contexts/EsmereogenesisContext";
import { useTrackingDispatch } from "../../contexts/TrackingContext";
import { emeraldCore, goldAccent } from "../../design-system/tokens/colors";
import { emeraldGradients } from "../../design-system/tokens/gradients";
import { whiteAlpha } from "../../design-system/utils/colorUtils";
import { BottomSheetShell } from "./BottomSheetShell";

interface ClaimSheetProps {
  open: boolean;
  onClose: () => void;
  plan: EsmereoPlan;
}

export const ClaimSheet: React.FC<ClaimSheetProps> = ({
  open,
  onClose,
  plan,
}) => {
  const { claimPlan } = useEsmereogenesis();
  const { track } = useTrackingDispatch();
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleClaim = () => {
    claimPlan(plan.id);
    track("esmereo_claimed", {
      planId: plan.id,
      hasPhone: phone.trim().length > 0,
    });
    setConfirmed(true);
  };

  const handleClose = () => {
    setConfirmed(false);
    setPhone("");
    onClose();
  };

  const productName = plan.productSnapshot.nombre
    .replace(/^L:.*?\s/, "")
    .replace(/^L:/, "")
    .trim();

  return (
    <BottomSheetShell
      open={open}
      onClose={handleClose}
      ariaLabelledBy="esmereo-claim-title"
    >
      <AnimatePresence mode="wait">
        {!confirmed ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: emeraldGradients.intense,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  mb: 2,
                  boxShadow: `0 12px 28px ${alpha(emeraldCore.dark, 0.3)}`,
                }}
              >
                <MessageCircle size={28} strokeWidth={1.5} />
              </Box>
              <Typography
                id="esmereo-claim-title"
                variant="h5"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  color: emeraldCore.dark,
                  mb: 0.5,
                }}
              >
                Reclamar tu Esmeralda
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Tu <strong>{productName}</strong> está lista. Un asesor de
                Tierra Madre coordinará contigo la entrega y certificación.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Tu número de WhatsApp (opcional)"
                placeholder="+57 300 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: whiteAlpha(0.5),
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "text.secondary",
                  mt: 1,
                  textAlign: "center",
                }}
              >
                Si lo dejas vacío, te contactaremos por el medio que tengas
                registrado.
              </Typography>
            </Box>

            <Button
              onClick={handleClaim}
              variant="contained"
              size="large"
              fullWidth
              sx={{
                background: emeraldGradients.intense,
                color: "#FFFFFF",
                py: 1.5,
                minHeight: 52,
                fontWeight: 700,
                fontSize: 16,
                borderRadius: 2,
                textTransform: "none",
                boxShadow: `0 12px 28px ${alpha(emeraldCore.dark, 0.35)}`,
                "&:hover": { background: emeraldGradients.deep },
                "&:active": { transform: "scale(0.98)" },
              }}
            >
              Confirmar reclamación
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            // a11y: announce the success state to assistive tech — fixes the
            // audit finding where the confirmation lacked aria-live.
            role="status"
            aria-live="polite"
          >
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Box
                component={motion.div}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 18 }}
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: alpha(goldAccent.primary, 0.15),
                  border: `2px solid ${goldAccent.primary}`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: goldAccent.primary,
                  mb: 2,
                }}
              >
                <Check size={36} strokeWidth={2.5} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  color: emeraldCore.dark,
                  mb: 1,
                }}
              >
                Reclamación enviada
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", mb: 3, lineHeight: 1.6 }}
              >
                Tu asesor de Tierra Madre te contactará pronto para coordinar la
                entrega de tu <strong>{productName}</strong>.
              </Typography>
              <Button
                onClick={handleClose}
                variant="outlined"
                size="large"
                sx={{
                  color: emeraldCore.dark,
                  borderColor: alpha(emeraldCore.primary, 0.4),
                  py: 1.25,
                  px: 4,
                  minHeight: 48,
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: "none",
                  "&:hover": {
                    borderColor: emeraldCore.primary,
                    bgcolor: alpha(emeraldCore.primary, 0.08),
                  },
                }}
              >
                Cerrar
              </Button>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </BottomSheetShell>
  );
};

export default ClaimSheet;
