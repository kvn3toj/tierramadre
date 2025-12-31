/**
 * FormulaInfo Component
 * Displays pricing formulas reference.
 */

import { Box, Typography, Paper, alpha } from '@mui/material';
import { Info } from 'lucide-react';
import { studioColors } from '../../design-system';
import { semanticColors } from '../../design-system/tokens/colors';

// Accent color for purple elements
const PURPLE_ACCENT = '#8B5CF6';

const FORMULAS = [
  { color: semanticColors.info.main, formula: 'Precio = Inversion x Factor' },
  { color: PURPLE_ACCENT, formula: 'Margen = (Precio - Inversion) / Precio x 100' },
  { color: studioColors.emerald, formula: 'ROI = (Precio - Inversion) / Inversion x 100' },
];

export const FormulaInfo: React.FC = () => {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        bgcolor: studioColors.surfaceMuted,
        border: `1px solid ${studioColors.border}`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            bgcolor: alpha(semanticColors.info.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Info size={14} color={semanticColors.info.main} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: semanticColors.info.main }}>
          Formulas Aplicadas
        </Typography>
      </Box>
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: 0,
          borderTop: `1px solid ${studioColors.border}`,
          bgcolor: studioColors.surface,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pt: 1.5 }}>
          {FORMULAS.map(({ color, formula }) => (
            <Box key={formula} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color }} />
              <Typography
                variant="caption"
                sx={{ color: studioColors.textSecondary, fontFamily: 'monospace', fontSize: '0.7rem' }}
              >
                {formula}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

export default FormulaInfo;
