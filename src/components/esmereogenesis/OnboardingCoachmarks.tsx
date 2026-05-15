/**
 * OnboardingCoachmarks
 *
 * Three-step explainer shown the first time a user lands on the garden detail
 * for a plan. Introduces the three concepts that the audit found unexplained:
 * aporte sugerido, racha, and eclosión.
 *
 * Surface: centred glass Dialog. Persistence: localStorage flag, set once on
 * dismiss. Skippable at any step. Honours prefers-reduced-motion (no fade
 * crossover when stepping).
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography,
  alpha,
} from "@mui/material";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Droplet, Flame, Sparkles, X } from "lucide-react";
import { emeraldCore, goldAccent } from "../../design-system/tokens/colors";
import { emeraldGradients } from "../../design-system/tokens/gradients";
import { whiteAlpha, blackAlpha } from "../../design-system/utils/colorUtils";
import { PEARL_SURFACE } from "./tokens";

interface Step {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: <Droplet size={28} strokeWidth={1.5} />,
    title: "Aporte sugerido",
    body: "Cada semana, riega tu esmeralda con un aporte. El monto sugerido divide el total por las semanas de tu plan — pero puedes regar más, menos, o saltarte una semana. Sin multas, sin deuda.",
  },
  {
    icon: <Flame size={28} strokeWidth={1.5} />,
    title: "Racha",
    body: "Cada semana que riegas, tu racha crece. Si se rompe, tu progreso queda intacto: la esmeralda no regresa, solo deja de florecer nuevas raíces hasta el próximo aporte. El jardín espera, no juzga.",
  },
  {
    icon: <Sparkles size={28} strokeWidth={1.5} />,
    title: "Eclosión",
    body: "Cuando completes el 100%, tu Esmeralda cobra vida en una ceremonia única. Después tu asesor de Tierra Madre coordina la entrega y la certificación.",
  },
];

interface OnboardingCoachmarksProps {
  open: boolean;
  onClose: () => void;
}

export const OnboardingCoachmarks: React.FC<OnboardingCoachmarksProps> = ({
  open,
  onClose,
}) => {
  const reducedMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);

  // Reset step when reopened — defensive in case the same instance is re-used
  // (the consumer normally mounts/unmounts via `open`, but this guarantees
  // first-step landing every time).
  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  const isLast = stepIndex === STEPS.length - 1;
  const step = STEPS[stepIndex];

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
    }
  };
  const handlePrev = () => setStepIndex((i) => Math.max(0, i - 1));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="esmereo-onboarding-title"
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: emeraldGradients.intense,
          color: PEARL_SURFACE,
          overflow: "hidden",
          boxShadow: `0 24px 60px ${blackAlpha(0.45)}`,
          // Subtle glass sheen on the surface — matches the Hub / Garden
          // recipe so the explainer reads as part of the feature, not a
          // generic modal.
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 30% 0%, ${whiteAlpha(0.18)} 0%, transparent 60%)`,
            pointerEvents: "none",
          },
        },
      }}
    >
      <Box sx={{ position: "relative", p: 3, pt: 2.5, pb: 3 }}>
        <IconButton
          onClick={onClose}
          aria-label="Cerrar guía"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: whiteAlpha(0.78),
            "&:hover": { color: PEARL_SURFACE, bgcolor: whiteAlpha(0.08) },
          }}
        >
          <X size={20} />
        </IconButton>

        {/* Step indicator */}
        <Box
          sx={{
            display: "flex",
            gap: 0.75,
            justifyContent: "center",
            mb: 2.5,
          }}
          aria-hidden
        >
          {STEPS.map((_, i) => (
            <Box
              key={i}
              sx={{
                width: i === stepIndex ? 24 : 8,
                height: 4,
                borderRadius: 999,
                bgcolor:
                  i === stepIndex ? goldAccent.primary : whiteAlpha(0.35),
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </Box>

        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  bgcolor: whiteAlpha(0.16),
                  border: `1px solid ${whiteAlpha(0.32)}`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: goldAccent.light,
                  mb: 2,
                  boxShadow: `0 8px 22px ${blackAlpha(0.28)}`,
                }}
              >
                {step.icon}
              </Box>
              <Typography
                id="esmereo-onboarding-title"
                variant="h5"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  color: PEARL_SURFACE,
                  mb: 1,
                  textShadow: `0 2px 14px ${alpha(emeraldCore.dark, 0.6)}`,
                }}
              >
                {step.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: whiteAlpha(0.82),
                  lineHeight: 1.6,
                  px: 0.5,
                }}
              >
                {step.body}
              </Typography>
            </Box>
          </motion.div>
        </AnimatePresence>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {stepIndex > 0 && (
            <Button
              onClick={handlePrev}
              variant="text"
              size="medium"
              sx={{
                color: whiteAlpha(0.78),
                textTransform: "none",
                fontWeight: 600,
                "&:hover": { bgcolor: whiteAlpha(0.08) },
              }}
            >
              Anterior
            </Button>
          )}
          {stepIndex === 0 && (
            <Button
              onClick={onClose}
              variant="text"
              size="medium"
              sx={{
                color: whiteAlpha(0.6),
                textTransform: "none",
                fontWeight: 500,
                "&:hover": { bgcolor: whiteAlpha(0.08) },
              }}
            >
              Saltar
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={handleNext}
            variant="contained"
            size="medium"
            sx={{
              bgcolor: goldAccent.primary,
              color: emeraldCore.dark,
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              minHeight: 44,
              borderRadius: 999,
              boxShadow: `0 8px 18px ${alpha(goldAccent.primary, 0.35)}`,
              "&:hover": {
                bgcolor: goldAccent.light,
                boxShadow: `0 10px 22px ${alpha(goldAccent.primary, 0.45)}`,
              },
            }}
          >
            {isLast ? "Comenzar" : "Siguiente"}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default OnboardingCoachmarks;
