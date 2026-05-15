/**
 * StreakIndicator
 *
 * Small chip-style readout for the current weekly streak. Shows a flame icon
 * that pulses while the streak is active.
 */

import React from "react";
import { Box, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { emeraldCore, goldAccent } from "../../design-system/tokens/colors";

const STREAK_TOOLTIP =
  'Cada semana que riegas, tu racha crece. Si te saltas una, "Lluvia generosa" la perdona — una vez cada 30 días.';

interface StreakIndicatorProps {
  weeks: number;
  longest?: number;
  variant?: "pill" | "compact";
}

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({
  weeks,
  longest,
  variant = "pill",
}) => {
  const isActive = weeks > 0;
  const tone = isActive ? goldAccent.primary : emeraldCore.primary;
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";

  const ariaLabel = `Racha de ${weeks} ${weeks === 1 ? "semana" : "semanas"}. ${STREAK_TOOLTIP}`;

  if (variant === "compact") {
    return (
      <Tooltip title={STREAK_TOOLTIP} placement="top" arrow enterTouchDelay={0}>
        <Box
          tabIndex={0}
          aria-label={ariaLabel}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            color: tone,
            cursor: "help",
          }}
        >
          <Box
            component={motion.span}
            animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{
              duration: 1.6,
              repeat: isActive ? Infinity : 0,
              ease: "easeInOut",
            }}
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            <Flame size={14} fill={isActive ? tone : "transparent"} />
          </Box>
          <Typography variant="caption" sx={{ color: tone, fontWeight: 700 }}>
            {weeks} sem
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  // Theme-aware tones — on light cards we keep a gold-12% tint with the
  // dark gold variant for AA-passing text; on dark cards we bump tint and
  // use the light gold variant. Inactive (no streak) leans on emerald.
  const activeBg = isLight ? alpha(tone, 0.16) : alpha(tone, 0.18);
  const inactiveBg = alpha(tone, 0.08);
  const activeText = isLight ? goldAccent.dark : goldAccent.light;

  return (
    <Tooltip title={STREAK_TOOLTIP} placement="top" arrow enterTouchDelay={0}>
      <Box
        tabIndex={0}
        aria-label={ariaLabel}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: 999,
          bgcolor: isActive ? activeBg : inactiveBg,
          border: `1px solid ${alpha(tone, isActive ? 0.55 : 0.22)}`,
          color: isActive ? activeText : tone,
          boxShadow: isActive ? `0 4px 12px ${alpha(tone, 0.18)}` : "none",
          cursor: "help",
        }}
      >
        <Box
          component={motion.span}
          animate={isActive ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={{
            duration: 1.6,
            repeat: isActive ? Infinity : 0,
            ease: "easeInOut",
          }}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            color: isActive ? tone : "inherit",
          }}
        >
          <Flame size={16} fill={isActive ? tone : "transparent"} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "inherit" }}>
          {weeks > 0
            ? `${weeks} ${weeks === 1 ? "semana" : "semanas"}`
            : "Sin racha aún"}
        </Typography>
        {typeof longest === "number" && longest > weeks && (
          <Typography variant="caption" sx={{ color: alpha(activeText, 0.75) }}>
            · Máx {longest}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default StreakIndicator;
