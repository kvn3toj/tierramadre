/**
 * ProviderInventory - Catalog browser for providers
 *
 * Shows the treasure catalog without prices or commercial actions.
 * Providers can only view product details and pictures.
 *
 * Designed by Aria - Capitana del Concilio de Creación
 */

import { Box, Typography, useTheme } from '@mui/material';
import { iosSemanticColors, iosTypographyScale, legacyTypography as typography } from '../../design-system';
import TreasureBrowser from '../treasure/TreasureBrowser';

export default function ProviderInventory() {
  const theme = useTheme();

  // iOS HIG semantic colors
  const isDark = theme.palette.mode === 'dark';
  const mode = isDark ? 'dark' : 'light';
  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header - iOS Large Title style */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography
          sx={{
            fontSize: iosTypographyScale.largeTitle,
            fontWeight: typography.weight.bold,
            color: labelColor,
            letterSpacing: typography.letterSpacing.tighter,
            mb: 0.5,
          }}
        >
          Inventario
        </Typography>
        <Typography
          sx={{
            fontSize: iosTypographyScale.subhead,
            color: secondaryLabelColor,
            letterSpacing: typography.letterSpacing.tight,
          }}
        >
          Explora el catálogo de esmeraldas disponibles
        </Typography>
      </Box>

      {/* Treasure Browser in Provider Mode */}
      <TreasureBrowser isProviderMode defaultViewMode="list" />
    </Box>
  );
}
