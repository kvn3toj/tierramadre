/**
 * CompletedCelebration
 *
 * Eclosionada panel — the gold-rimmed glass surface that takes the slider's
 * place once a plan reaches 100%. Shows the ceremony copy and either a
 * "Reclamar tu Esmeralda" CTA (state: completed) or a quiet acknowledgement
 * that the claim has already been requested (state: claimed).
 */
import React from "react";
import { Box, Button, Typography, alpha } from "@mui/material";
import { motion } from "framer-motion";
import { Sparkles, HandHeart } from "lucide-react";
import { emeraldCore, goldAccent } from "../../design-system/tokens/colors";
import { emeraldGradients } from "../../design-system/tokens/gradients";
import { blackAlpha } from "../../design-system/utils/colorUtils";
import { useEsmereoThemeTokens } from "../../hooks/useEsmereoThemeTokens";

export interface CompletedCelebrationProps {
  /** True once the user has requested the physical claim (state === "claimed"). */
  isClaimed: boolean;
  /** Opens the ClaimSheet — only invoked when not yet claimed. */
  onClaim: () => void;
}

export const CompletedCelebration: React.FC<CompletedCelebrationProps> = ({
  isClaimed,
  onClaim,
}) => {
  const { isLight, completedCardBg, headlineColor, bodyColor } =
    useEsmereoThemeTokens();

  return (
    <Box
      sx={{
        textAlign: "center",
        mb: 3,
        p: 3,
        borderRadius: 3,
        background: completedCardBg,
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        border: `1px solid ${alpha(goldAccent.primary, 0.55)}`,
        boxShadow: isLight
          ? `0 14px 32px ${alpha(emeraldCore.dark, 0.18)}, 0 0 24px ${alpha(goldAccent.primary, 0.18)}, 0 0 0 1px ${alpha(goldAccent.primary, 0.22)} inset`
          : `0 14px 32px ${blackAlpha(0.4)}, 0 0 24px ${alpha(goldAccent.primary, 0.18)}, 0 0 0 1px ${alpha(goldAccent.primary, 0.22)} inset`,
      }}
    >
      <Box
        component={motion.div}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        sx={{
          display: "inline-flex",
          mb: 1,
          color: goldAccent.primary,
          filter: `drop-shadow(0 0 12px ${alpha(goldAccent.primary, 0.6)})`,
        }}
      >
        <Sparkles size={28} />
      </Box>
      <Typography
        variant="h5"
        sx={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 700,
          fontStyle: "italic",
          color: headlineColor,
          mb: 0.5,
          textShadow: isLight
            ? "none"
            : `0 2px 14px ${alpha(emeraldCore.dark, 0.6)}`,
        }}
      >
        Tu Esmeralda ha cobrado vida
      </Typography>
      <Typography variant="body2" sx={{ color: bodyColor, mb: 2 }}>
        {isClaimed
          ? "Ya solicitaste su entrega. Tu asesor te contactará pronto."
          : "Coordina con tu asesor para recibir tu Esmeralda Tierra Madre."}
      </Typography>
      {!isClaimed && (
        <Button
          variant="contained"
          size="large"
          startIcon={<HandHeart size={18} />}
          onClick={onClaim}
          sx={{
            background: emeraldGradients.intense,
            color: "#FFFFFF",
            py: 1.5,
            px: 3,
            minHeight: 52,
            fontWeight: 700,
            borderRadius: 999,
            textTransform: "none",
            boxShadow: `0 12px 28px ${alpha(emeraldCore.dark, 0.35)}`,
            "&:hover": { background: emeraldGradients.deep },
          }}
        >
          Reclamar tu Esmeralda
        </Button>
      )}
    </Box>
  );
};

export default CompletedCelebration;
