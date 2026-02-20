/**
 * PriceSimulatorHeader Component
 * Studio header with preview button.
 */

import { Box, Typography, Paper, Button, alpha } from '@mui/material';
import { Calculator, Eye } from 'lucide-react';
import { studioColors, studioGradients, studioShadows, cssTransition } from '../../design-system';

export interface PriceSimulatorHeaderProps {
  totalInvestment: number;
  onPreview: () => void;
}

export const PriceSimulatorHeader: React.FC<PriceSimulatorHeaderProps> = ({
  totalInvestment,
  onPreview,
}) => {
  return (
    <Box
      sx={{
        mb: { xs: 3, md: 4 },
        borderRadius: { xs: 2, md: 3 },
        overflow: 'hidden',
        boxShadow: studioShadows.lg,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5, md: 3 },
          borderRadius: 0,
          background: studioGradients.header,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Emerald accent line */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: studioGradients.emerald,
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 300,
            height: '100%',
            background: `radial-gradient(circle at 100% 0%, ${alpha(studioColors.emerald, 0.08)} 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />

        <Box sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 1,
          flexDirection: { xs: 'column', sm: 'row' },
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 2.5 } }}>
            <Box
              sx={{
                width: { xs: 44, md: 52 },
                height: { xs: 44, md: 52 },
                borderRadius: 2.5,
                background: alpha(studioColors.emerald, 0.15),
                border: `1px solid ${alpha(studioColors.emerald, 0.3)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calculator size={26} color={studioColors.emerald} />
            </Box>
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: studioColors.emerald,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  fontSize: { xs: '0.5625rem', md: '0.625rem' },
                  display: 'block',
                  mb: 0.25,
                }}
              >
                TM STUDIO
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: '#FFFFFF',
                  fontFamily: '"Libre Baskerville", Georgia, serif',
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem' },
                }}
              >
                Simulador de Precios
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: alpha('#FFFFFF', 0.7),
                  fontWeight: 400,
                  fontSize: { xs: '0.8125rem', md: '0.875rem' },
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                Calcula el precio de venta ideal para tus esmeraldas
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Eye size={18} />}
            onClick={onPreview}
            disabled={totalInvestment === 0}
            sx={{
              background: studioGradients.emerald,
              color: '#FFFFFF',
              fontWeight: 600,
              px: { xs: 2.5, md: 3 },
              py: { xs: 1, md: 1.25 },
              minHeight: 44, // iOS HIG touch target
              borderRadius: 2,
              textTransform: 'none',
              fontSize: { xs: '0.8125rem', md: '0.875rem' },
              boxShadow: studioShadows.emerald,
              width: { xs: '100%', sm: 'auto' },
              '&:hover': {
                background: `linear-gradient(135deg, ${studioColors.emeraldLight} 0%, ${studioColors.emerald} 100%)`,
                boxShadow: `0 6px 20px ${alpha(studioColors.emerald, 0.35)}`,
                transform: 'translateY(-1px)',
              },
              '&:disabled': {
                background: alpha('#FFFFFF', 0.1),
                color: alpha('#FFFFFF', 0.4),
              },
              transition: cssTransition.default,
            }}
          >
            Vista Previa
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default PriceSimulatorHeader;
