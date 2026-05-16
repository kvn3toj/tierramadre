/**
 * AporteSlider
 *
 * Two-state aporte input on the Garden page:
 *   - Closed: a glowing "Regar mi esmeralda" CTA with a soft ambient halo.
 *   - Open:   a glassy card containing the chosen amount, Acorns-style
 *             quick-amount chips, a slider clamped to [min, remaining], and
 *             cancel / confirm buttons.
 *
 * The chips clamp to the slider's [min, remaining] range so "2× Sugerido"
 * still works near completion. The same chip set ships with `aria-pressed`
 * + per-chip `aria-label` and a group label "Montos rápidos".
 */
import React from "react";
import { Box, Button, Slider, Typography, alpha } from "@mui/material";
import { Droplet } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { emeraldCore } from "../../design-system/tokens/colors";
import { emeraldGradients } from "../../design-system/tokens/gradients";
import { whiteAlpha, blackAlpha } from "../../design-system/utils/colorUtils";
import { useEsmereoThemeTokens } from "../../hooks/useEsmereoThemeTokens";
import { useCurrencyFormat } from "../../contexts/CurrencyContext";
import type { EsmereoPlan } from "../../types/esmereogenesis";

export interface AporteSliderProps {
  /** When false, render the closed launcher CTA. When true, render the
   *  expanded slider card. */
  open: boolean;
  plan: EsmereoPlan;
  /** Currently selected aporte amount (controlled). */
  aporteAmount: number;
  setAporteAmount: (n: number) => void;
  /** plan.targetCOP - plan.totalAbonadoCOP — passed in to avoid recomputing
   *  in two places (it's already derived in the parent). */
  remaining: number;
  /** Disables the confirm CTA while the abono simulation is in flight. */
  isProcessing: boolean;
  /** Launcher click handler. */
  onOpen: () => void;
  /** Cancel button — also resets the amount in the parent. */
  onCancel: () => void;
  /** Confirm button — triggers the aporte/cinematic flow. */
  onConfirm: () => void;
}

export const AporteSlider: React.FC<AporteSliderProps> = ({
  open,
  plan,
  aporteAmount,
  setAporteAmount,
  remaining,
  isProcessing,
  onOpen,
  onCancel,
  onConfirm,
}) => {
  const reducedMotion = useReducedMotion();
  const { formatCurrency } = useCurrencyFormat();
  const {
    isLight,
    sliderCardBg,
    cardBorder,
    cardShadow,
    titleColor,
    overlineColor,
    headlineColor,
    mutedColor,
    accentColor,
  } = useEsmereoThemeTokens();

  if (!open) {
    return (
      <Box
        sx={{
          position: "relative",
          textAlign: "center",
          mb: { xs: 3, md: 4 },
        }}
      >
        {/* Soft ambient halo behind the button */}
        <Box
          aria-hidden
          component={motion.div}
          animate={
            reducedMotion
              ? undefined
              : { scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }
          }
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "min(78%, 320px)",
            height: 64,
            transform: "translate(-50%, -50%)",
            borderRadius: 999,
            background: `radial-gradient(ellipse at center, ${alpha(emeraldCore.primary, 0.45)} 0%, ${alpha(emeraldCore.primary, 0)} 70%)`,
            filter: "blur(18px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <Button
          onClick={onOpen}
          variant="contained"
          size="large"
          startIcon={<Droplet size={22} />}
          sx={{
            position: "relative",
            zIndex: 1,
            background: emeraldGradients.intense,
            color: "#FFFFFF",
            py: 2,
            px: { xs: 4, sm: 5 },
            minHeight: 60,
            fontSize: 17,
            fontWeight: 700,
            borderRadius: 999,
            textTransform: "none",
            letterSpacing: 0.3,
            boxShadow: `0 18px 40px ${alpha(emeraldCore.dark, 0.4)}, 0 0 0 1px ${whiteAlpha(0.12)} inset`,
            "&:hover": {
              background: emeraldGradients.deep,
              boxShadow: `0 22px 46px ${alpha(emeraldCore.dark, 0.45)}, 0 0 0 1px ${whiteAlpha(0.16)} inset`,
            },
            "&:active": { transform: "scale(0.98)" },
          }}
        >
          Regar mi esmeralda
        </Button>
        <Typography
          variant="caption"
          sx={{
            position: "relative",
            zIndex: 1,
            display: "block",
            color: mutedColor,
            mt: 1.25,
            fontWeight: 500,
          }}
        >
          Aporte sugerido {formatCurrency(plan.weeklySuggestedCOP)} · monto
          editable
        </Typography>
      </Box>
    );
  }

  const min = Math.min(10_000, remaining);
  const clamp = (n: number) =>
    Math.max(min, Math.min(remaining, Math.round(n)));
  const suggestion = plan.weeklySuggestedCOP;
  const chips: Array<{ label: string; value: number; aria: string }> = [
    {
      label: "½ Sugerido",
      value: clamp(suggestion / 2),
      aria: "Medio aporte sugerido",
    },
    { label: "Sugerido", value: clamp(suggestion), aria: "Aporte sugerido" },
    {
      label: "2× Sugerido",
      value: clamp(suggestion * 2),
      aria: "Doble del aporte sugerido",
    },
    { label: "Restante", value: remaining, aria: "Completar el plan" },
  ];

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{
        background: sliderCardBg,
        backdropFilter: "blur(16px) saturate(160%)",
        WebkitBackdropFilter: "blur(16px) saturate(160%)",
        border: `1px solid ${cardBorder}`,
        borderRadius: 3,
        p: 2.5,
        mb: 3,
        boxShadow: cardShadow,
      }}
    >
      <Typography
        variant="overline"
        sx={{
          color: overlineColor,
          fontWeight: 700,
          letterSpacing: 1.4,
          opacity: isLight ? 0.85 : 0.85,
        }}
      >
        Cuánto vas a regar
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 700,
          color: headlineColor,
          mb: 1,
          textShadow: isLight
            ? "none"
            : `0 2px 14px ${alpha(emeraldCore.dark, 0.6)}`,
        }}
      >
        {formatCurrency(aporteAmount)}
      </Typography>

      {/* Quick-amount chips — Acorns-style shortcuts so the user can land on
          a meaningful aporte without dragging. Phones overflow-scroll (room
          is too tight to wrap without truncating "2× Sugerido"); tablets and
          desktop wrap to a second row so "Restante" never clips off-screen. */}
      <Box
        role="group"
        aria-label="Montos rápidos"
        sx={{
          display: "flex",
          gap: 0.75,
          mb: 1.5,
          flexWrap: { xs: "nowrap", sm: "wrap" },
          overflowX: { xs: "auto", sm: "visible" },
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {chips.map((chip) => {
          const isActive = aporteAmount === chip.value;
          return (
            <Button
              key={chip.label}
              onClick={() => setAporteAmount(chip.value)}
              aria-pressed={isActive}
              aria-label={chip.aria}
              size="small"
              sx={{
                flexShrink: 0,
                py: 1,
                px: 2,
                minHeight: 44,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 999,
                textTransform: "none",
                letterSpacing: 0.2,
                border: `1px solid ${
                  isActive ? accentColor : alpha(accentColor, 0.35)
                }`,
                color: isActive ? "#FFFFFF" : titleColor,
                bgcolor: isActive ? accentColor : "transparent",
                "&:hover": {
                  bgcolor: isActive ? accentColor : alpha(accentColor, 0.1),
                  borderColor: accentColor,
                },
              }}
            >
              {chip.label}
            </Button>
          );
        })}
      </Box>

      <Slider
        value={aporteAmount}
        min={Math.min(10_000, remaining)}
        max={remaining}
        step={Math.max(10_000, Math.round(plan.weeklySuggestedCOP / 5))}
        onChange={(_, value) =>
          setAporteAmount(typeof value === "number" ? value : value[0])
        }
        marks={[
          { value: plan.weeklySuggestedCOP, label: "Sugerido" },
          { value: remaining, label: "Restante" },
        ]}
        sx={{
          color: accentColor,
          mb: 2,
          "& .MuiSlider-rail": {
            opacity: 0.4,
            bgcolor: isLight ? alpha(emeraldCore.dark, 0.18) : blackAlpha(0.5),
          },
          "& .MuiSlider-markLabel": { fontSize: 12, color: mutedColor },
          "& .MuiSlider-mark": {
            bgcolor: isLight ? alpha(emeraldCore.dark, 0.45) : whiteAlpha(0.4),
          },
        }}
      />
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{
            flex: 1,
            py: 1.25,
            minHeight: 48,
            borderRadius: 2,
            textTransform: "none",
            color: titleColor,
            borderColor: alpha(accentColor, 0.45),
            "&:hover": {
              borderColor: accentColor,
              bgcolor: alpha(accentColor, 0.1),
            },
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isProcessing}
          startIcon={<Droplet size={18} />}
          sx={{
            flex: 2,
            py: 1.25,
            minHeight: 48,
            background: emeraldGradients.intense,
            color: "#FFFFFF",
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            boxShadow: `0 8px 18px ${alpha(emeraldCore.dark, 0.3)}`,
            "&:hover": { background: emeraldGradients.deep },
          }}
        >
          Regar {formatCurrency(aporteAmount)}
        </Button>
      </Box>
    </Box>
  );
};

export default AporteSlider;
