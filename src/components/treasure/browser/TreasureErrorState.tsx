import { Box, Typography, Paper, Button, CircularProgress, alpha } from '@mui/material';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../../design-system/tokens/colors';

interface TreasureErrorStateProps {
  isLight: boolean;
  error: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export default function TreasureErrorState({
  isLight,
  error,
  onRetry,
  isRetrying = false,
}: TreasureErrorStateProps) {
  const { t } = useLanguage();
  return (
    <Paper
      elevation={0}
      sx={{
        p: 6,
        borderRadius: 4,
        border: '2px dashed',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
        textAlign: 'center',
        bgcolor: isLight
          ? alpha(surfacesLight.background.secondary, 0.5)
          : alpha(surfacesDark.background.secondary, 0.5),
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.tertiary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <AlertTriangle
          size={32}
          color={isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary}
        />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        {t.treasure.error.loadingFailed}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', mb: 2, maxWidth: 340, mx: 'auto' }}
      >
        {error || 'No pudimos conectar con el servidor. Verifica tu conexion a internet e intenta de nuevo.'}
      </Typography>
      <Button
        variant="outlined"
        size="small"
        onClick={onRetry}
        disabled={isRetrying}
        startIcon={
          isRetrying ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <RefreshCw size={16} />
          )
        }
        sx={{
          borderColor: emeraldCore.primary,
          color: emeraldCore.primary,
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': {
            bgcolor: alpha(emeraldCore.primary, 0.08),
            borderColor: emeraldCore.dark,
          },
        }}
      >
        {isRetrying ? 'Reintentando...' : t.actions.retry}
      </Button>
    </Paper>
  );
}
