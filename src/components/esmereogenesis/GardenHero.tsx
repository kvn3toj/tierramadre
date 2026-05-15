/**
 * GardenHero
 *
 * Title block for the Garden page — overline, nickname headline (or product
 * name when no nickname), and an italic product-name sub-line that surfaces
 * only when the user has chosen a nickname so the source gem stays
 * recognisable.
 *
 * Lives between the page header strip ("Esmereogénesis") and the LivingEmerald
 * so the gem feels named, owned, personal.
 */
import React from "react";
import { Box, Typography, alpha } from "@mui/material";
import { motion } from "framer-motion";
import { emeraldCore } from "../../design-system/tokens/colors";
import { useEsmereoThemeTokens } from "../../hooks/useEsmereoThemeTokens";

export interface GardenHeroProps {
  /** Optional user-given nickname; promoted to the headline when present. */
  nickname?: string;
  /** Product name from the plan snapshot. Headline if no nickname,
   *  italic sub-line if a nickname is shown above it. */
  productName: string;
}

export const GardenHero: React.FC<GardenHeroProps> = ({
  nickname,
  productName,
}) => {
  const { isLight, overlineColor, headlineColor, mutedColor } =
    useEsmereoThemeTokens();
  const displayName = nickname ?? productName;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      sx={{ textAlign: "center", mb: { xs: 2.5, md: 3 } }}
    >
      <Typography
        variant="overline"
        sx={{
          display: "block",
          color: overlineColor,
          fontWeight: 700,
          letterSpacing: 2,
          opacity: isLight ? 0.85 : 0.72,
          mb: 0.5,
        }}
      >
        Tu esmeralda
      </Typography>
      <Typography
        sx={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 700,
          fontStyle: "italic",
          color: headlineColor,
          fontSize: { xs: 32, sm: 40, md: 44 },
          lineHeight: 1.1,
          letterSpacing: -0.4,
          textShadow: isLight
            ? `0 2px 12px ${alpha(emeraldCore.primary, 0.18)}`
            : `0 4px 22px ${alpha(emeraldCore.dark, 0.6)}`,
        }}
      >
        {displayName}
      </Typography>
      {nickname && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.5,
            color: mutedColor,
            fontStyle: "italic",
            letterSpacing: 0.3,
          }}
        >
          {productName}
        </Typography>
      )}
    </Box>
  );
};

export default GardenHero;
