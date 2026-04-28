/**
 * EsmereogenesisHubPage
 *
 * Route: /esmereogenesis
 * Top-level hub for all the user's plans.
 * Shows empty state, active garden grid, completed sealed cards, and a settings menu.
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  Typography,
  alpha,
  useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft,
  Settings,
  Plus,
  Volume2,
  VolumeX,
  Trash2,
  Vibrate,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEsmereogenesis } from '../../contexts/EsmereogenesisContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useTrackingDispatch } from '../../contexts/TrackingContext';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { EsmereoEmptyState } from '../../components/esmereogenesis/EsmereoEmptyState';
import { EsmereoPlanCard } from '../../components/esmereogenesis/EsmereoPlanCard';
import { StreakIndicator } from '../../components/esmereogenesis/StreakIndicator';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';
import { meshGradients } from '../../design-system/tokens/gradients';

const EsmereogenesisHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { track } = useTrackingDispatch();
  const { formatCurrency } = useCurrencyFormat();
  const isWide = useMediaQuery('(min-width: 720px)');

  const {
    activePlans,
    completedPlans,
    hubMetrics,
    hasPlans,
    audioEnabled,
    hapticEnabled,
    setAudioEnabled,
    setHapticEnabled,
    resetAll,
  } = useEsmereogenesis();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleReset = () => {
    setMenuAnchor(null);
    if (window.confirm('¿Borrar todo tu jardín de Esmereogénesis? Esta acción no se puede deshacer.')) {
      resetAll();
      notify('Tu jardín se reinició', 'info');
      track('esmereo_reset_all', {});
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: meshGradients.emerald,
        pb: 6,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 2,
          position: 'sticky',
          top: 0,
          background: alpha('#FFFFFF', 0.4),
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          borderBottom: `1px solid ${alpha(emeraldCore.primary, 0.12)}`,
          zIndex: 10,
        }}
      >
        <IconButton onClick={() => navigate(-1)} aria-label="Volver">
          <ChevronLeft />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 600,
            color: emeraldCore.dark,
          }}
        >
          Esmereogénesis
        </Typography>
        <IconButton
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          aria-label="Ajustes de Esmereogénesis"
        >
          <Settings />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 240, mt: 1 } }}
        >
          <MenuItem
            onClick={() => setAudioEnabled(!audioEnabled)}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <Typography variant="body2">Sonidos</Typography>
            </Box>
            <Switch checked={audioEnabled} size="small" />
          </MenuItem>
          <MenuItem
            onClick={() => setHapticEnabled(!hapticEnabled)}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Vibrate size={18} />
              <Typography variant="body2">Vibración</Typography>
            </Box>
            <Switch checked={hapticEnabled} size="small" />
          </MenuItem>
          {hasPlans && (
            <MenuItem
              onClick={handleReset}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'error.main' }}
            >
              <Trash2 size={18} />
              <Typography variant="body2">Reiniciar jardín</Typography>
            </MenuItem>
          )}
        </Menu>
      </Box>

      {!hasPlans ? (
        <EsmereoEmptyState />
      ) : (
        <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>
          {/* Global metrics card */}
          <Box
            component={motion.section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            sx={{
              background: alpha('#FFFFFF', 0.55),
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${alpha(emeraldCore.primary, 0.18)}`,
              borderRadius: 3,
              p: { xs: 2, md: 3 },
              mb: 3,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{ color: emeraldCore.dark, fontWeight: 700, letterSpacing: 1.4 }}
              >
                Tu jardín
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  color: emeraldCore.dark,
                }}
              >
                {hubMetrics.activeCount} {hubMetrics.activeCount === 1 ? 'esmeralda' : 'esmeraldas'}{' '}
                en proceso · {Math.round(hubMetrics.globalProgress * 100)}%
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {formatCurrency(hubMetrics.totalAbonadoCOP)} aportado
                {hubMetrics.totalTargetCOP > 0
                  ? ` de ${formatCurrency(hubMetrics.totalTargetCOP)}`
                  : ''}
              </Typography>
            </Box>
            <StreakIndicator weeks={hubMetrics.globalStreak} />
          </Box>

          {/* Active garden grid */}
          {activePlans.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: isWide
                  ? 'repeat(auto-fill, minmax(220px, 1fr))'
                  : 'repeat(2, 1fr)',
                gap: 2,
                mb: 3,
              }}
            >
              {activePlans.map((plan) => (
                <EsmereoPlanCard key={plan.id} plan={plan} />
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: completedPlans.length > 0 ? 4 : 2 }}>
            <Button
              variant="outlined"
              startIcon={<Plus size={18} />}
              onClick={() => navigate('/treasure')}
              sx={{
                color: emeraldCore.dark,
                borderColor: alpha(emeraldCore.primary, 0.4),
                py: 1.25,
                px: 3,
                fontWeight: 600,
                borderRadius: 999,
                textTransform: 'none',
                background: alpha('#FFFFFF', 0.5),
                '&:hover': {
                  borderColor: emeraldCore.primary,
                  background: alpha(emeraldCore.primary, 0.08),
                },
              }}
            >
              Sembrar nueva Esmereogénesis
            </Button>
          </Box>

          {/* Completed section */}
          {completedPlans.length > 0 && (
            <Box>
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  color: goldAccent.dark,
                  fontWeight: 700,
                  letterSpacing: 1.4,
                  mb: 1.5,
                  pl: 1,
                }}
              >
                Adquiridas
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: isWide
                    ? 'repeat(auto-fill, minmax(220px, 1fr))'
                    : 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                {completedPlans.map((plan) => (
                  <EsmereoPlanCard key={plan.id} plan={plan} />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default EsmereogenesisHubPage;
