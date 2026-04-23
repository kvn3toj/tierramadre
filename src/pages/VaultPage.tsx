/**
 * VaultPage Component
 *
 * Bóveda Secreta — Gate de acceso con dos anillos concéntricos (T9.1).
 * Si el usuario no ha desbloqueado, muestra VaultLockScreen.
 * Tras desbloquear, renderiza el contenido actual (placeholder hasta T9.2).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Paper, alpha } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Sparkles, Crown, Shield, Upload } from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { emeraldCore, goldAccent } from '../design-system/tokens/colors';
import { iosTypographyScale, vaultEasing } from '../design-system';
import { VaultLockScreen } from '../components/vault';
import { VAULT_STORAGE } from '../config/vault';
import { useAsesores } from '../hooks/useAsesores';
import type { UnlockMethod } from '../types/vault';

const VaultPage: React.FC = () => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const { ambassadorVaultCodes } = useAsesores();

  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(VAULT_STORAGE.UNLOCKED) === 'true';
    } catch {
      return false;
    }
  });

  // Revalidate on tab focus in case admin reset unlock in another tab.
  useEffect(() => {
    const onFocus = () => {
      try {
        setUnlocked(localStorage.getItem(VAULT_STORAGE.UNLOCKED) === 'true');
      } catch {
        /* no-op */
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleUnlock = useCallback((_meta: UnlockMethod) => {
    setUnlocked(true);
    // TODO(T9.3 analytics): track _meta.method with TrackingContext
  }, []);

  return (
    <AnimatePresence mode="wait">
      {!unlocked ? (
        <motion.div
          key="vault-lock"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: vaultEasing.silk }}
        >
          <VaultLockScreen onUnlock={handleUnlock} ambassadorCodes={ambassadorVaultCodes} />
        </motion.div>
      ) : (
        <motion.div
          key="vault-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: vaultEasing.silk, delay: 0.05 }}
        >
          <Box>
            <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, py: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: alpha(goldAccent.primary, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                border: `2px solid ${goldAccent.primary}`,
              }}
            >
              <Lock size={36} color={goldAccent.primary} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontSize: iosTypographyScale.title1,
                fontWeight: 600,
                color: goldAccent.primary,
                mb: 1,
              }}
            >
              Bóveda Secreta
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontSize: iosTypographyScale.subhead, color: 'text.secondary', maxWidth: 400, mx: 'auto' }}
            >
              Espacio exclusivo para gemas únicas y excepcionales
            </Typography>
          </Box>

          {/* Description Card */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: isLight ? alpha(goldAccent.primary, 0.05) : alpha(goldAccent.primary, 0.1),
              border: `1px solid ${alpha(goldAccent.primary, 0.2)}`,
              mb: 3,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}
            >
              ¿Qué es la Bóveda Secreta?
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.7 }}>
              La Bóveda Secreta es un espacio reservado para las <strong>gemas más exclusivas y raras</strong> de
              nuestra colección. A diferencia del inventario general, este espacio está curado personalmente
              por la administración.
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              Las piezas que aparecerán aquí son <strong>seleccionadas cuidadosamente</strong> por su excepcional
              calidad, rareza o características únicas que las hacen verdaderos tesoros de colección.
            </Typography>
          </Paper>

          {/* Features List */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
            {[
              {
                icon: <Sparkles size={20} />,
                title: 'Gemas Exclusivas',
                desc: 'Piezas únicas no disponibles en el inventario general',
              },
              {
                icon: <Crown size={20} />,
                title: 'Curación Premium',
                desc: 'Seleccionadas personalmente por expertos',
              },
              {
                icon: <Shield size={20} />,
                title: 'Acceso Restringido',
                desc: 'Solo para miembros autorizados del equipo',
              },
              {
                icon: <Upload size={20} />,
                title: 'Gestión Admin',
                desc: 'Contenido subido exclusivamente desde Google Drive',
              },
            ].map((feature, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isLight ? 'background.paper' : alpha('#fff', 0.03),
                  border: '1px solid',
                  borderColor: isLight ? 'divider' : alpha('#fff', 0.1),
                }}
              >
                <Box
                  sx={{
                    color: goldAccent.primary,
                    mt: 0.25,
                  }}
                >
                  {feature.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.25 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {feature.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Coming Soon Notice */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: alpha(emeraldCore.primary, 0.08),
              border: `1px dashed ${emeraldCore.primary}`,
              textAlign: 'center',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: emeraldCore.primary, mb: 1 }}
            >
              Próximamente
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Estamos preparando una colección especial de gemas extraordinarias.
              Pronto podrás explorar tesoros únicos en este espacio exclusivo.
            </Typography>
          </Paper>
        </Box>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VaultPage;
