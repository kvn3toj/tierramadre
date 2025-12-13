/**
 * IOSSettingsSheet Component
 *
 * Bottom sheet for app settings
 * - Theme toggle (dark/light)
 * - Language switcher (Spanish/English)
 */

import React from 'react';
import { Box, Typography, IconButton, Backdrop, Switch } from '@mui/material';
import { Close, DarkMode, LightMode, Language, AutoAwesome, Tune } from '@mui/icons-material';
import { spacing } from '../../design-system/tokens/primitives/spacing';
import { primitiveColors } from '../../design-system/tokens/primitives/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLiquidGlassSafe } from '../../contexts/LiquidGlassContext';
import MeditationReminderSetting from '../settings/MeditationReminderSetting';
import { UserProfileCard } from '../auth';

export interface IOSSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

const IOSSettingsSheet: React.FC<IOSSettingsSheetProps> = ({ open, onClose }) => {
  const { mode, toggleTheme } = useTheme();
  const { language, t, toggleLanguage } = useLanguage();
  const {
    enabled: liquidGlassEnabled,
    effectiveTier,
    effects,
    updateSettings,
    toggleEffect,
  } = useLiquidGlassSafe();

  return (
    <>
      <Backdrop
        open={open}
        onClick={onClose}
        sx={{
          zIndex: 1100,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
        }}
      />

      <Box
        role="dialog"
        aria-modal="true"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1101,
          backgroundColor: 'var(--surface-secondary)',
          borderTopLeftRadius: spacing.lg,
          borderTopRightRadius: spacing.lg,
          boxShadow: 'var(--shadow-lg)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.4s cubic-bezier(0.5, 1.25, 0.75, 1.25)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--surface-secondary)',
            zIndex: 1,
            paddingTop: spacing.sm,
            paddingX: spacing.md,
            paddingBottom: spacing.xs,
            borderBottom: '0.5px solid var(--border-default)',
          }}
        >
          {/* Handle Bar */}
          <Box
            sx={{
              width: '36px',
              height: '5px',
              backgroundColor: 'var(--border-default)',
              borderRadius: '2.5px',
              margin: '0 auto',
              marginBottom: spacing.sm,
            }}
          />

          {/* Title and Close */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {t.settings.theme}
            </Typography>

            <IconButton
              onClick={onClose}
              aria-label={t.actions.close}
              sx={{
                color: 'var(--text-secondary)',
                '&:hover': { backgroundColor: 'var(--surface-tertiary)' },
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </Box>

        {/* Settings List */}
        <Box sx={{ padding: spacing.md, display: 'grid', gap: spacing.md }}>
          {/* User Profile / Google Sign In */}
          <UserProfileCard />

          {/* Theme Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.sm,
              backgroundColor: 'var(--surface-primary)',
              borderRadius: spacing.md,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              {/* Icon */}
              <Box
                sx={{
                  width: '44px',
                  height: '44px',
                  borderRadius: spacing.md,
                  backgroundColor: mode === 'dark' ? '#FFD60A15' : '#00000015',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {mode === 'dark' ? (
                  <DarkMode sx={{ fontSize: '24px', color: '#FFD60A' }} />
                ) : (
                  <LightMode sx={{ fontSize: '24px', color: '#FF9500' }} />
                )}
              </Box>

              {/* Text */}
              <Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {mode === 'dark' ? t.settings.darkMode : t.settings.lightMode}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {mode === 'dark' ? t.settings.lightMode : t.settings.darkMode}
                </Typography>
              </Box>
            </Box>

            {/* Switch */}
            <Switch
              checked={mode === 'dark'}
              onChange={toggleTheme}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#FFD60A',
                  '&:hover': { backgroundColor: 'rgba(255, 214, 10, 0.08)' },
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#FFD60A',
                },
              }}
            />
          </Box>

          {/* Language Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.sm,
              backgroundColor: 'var(--surface-primary)',
              borderRadius: spacing.md,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              {/* Icon */}
              <Box
                sx={{
                  width: '44px',
                  height: '44px',
                  borderRadius: spacing.md,
                  backgroundColor: '#007AFF15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Language sx={{ fontSize: '24px', color: '#007AFF' }} />
              </Box>

              {/* Text */}
              <Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {t.settings.language}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {language === 'es' ? t.settings.spanish : t.settings.english}
                </Typography>
              </Box>
            </Box>

            {/* Switch */}
            <Switch
              checked={language === 'en'}
              onChange={toggleLanguage}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#007AFF',
                  '&:hover': { backgroundColor: 'rgba(0, 122, 255, 0.08)' },
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#007AFF',
                },
              }}
            />
          </Box>

          {/* Meditation Reminder */}
          <MeditationReminderSetting />

          {/* Liquid Glass Section */}
          <Box sx={{ marginTop: spacing.sm }}>
            <Typography
              variant="overline"
              sx={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.5px',
                marginBottom: spacing.xs,
                display: 'block',
              }}
            >
              LIQUID GLASS (iOS 26)
            </Typography>

            {/* Master Toggle */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing.sm,
                backgroundColor: 'var(--surface-primary)',
                borderRadius: spacing.md,
                marginBottom: spacing.xs,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <Box
                  sx={{
                    width: '44px',
                    height: '44px',
                    borderRadius: spacing.md,
                    backgroundColor: `${primitiveColors.emerald[500]}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AutoAwesome sx={{ fontSize: '24px', color: primitiveColors.emerald[500] }} />
                </Box>
                <Box>
                  <Typography
                    variant="body1"
                    sx={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}
                  >
                    Liquid Glass
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: '13px', color: 'var(--text-secondary)' }}
                  >
                    {effectiveTier === 'high' ? 'Alto rendimiento' : effectiveTier === 'medium' ? 'Rendimiento medio' : 'Modo ahorro'}
                  </Typography>
                </Box>
              </Box>
              <Switch
                checked={liquidGlassEnabled}
                onChange={() => updateSettings({ enabled: !liquidGlassEnabled })}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: primitiveColors.emerald[500],
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: primitiveColors.emerald[500],
                  },
                }}
              />
            </Box>

            {/* Effect Toggles (only show when enabled) */}
            {liquidGlassEnabled && (
              <Box
                sx={{
                  display: 'grid',
                  gap: spacing.xxs,
                  padding: spacing.sm,
                  backgroundColor: 'var(--surface-primary)',
                  borderRadius: spacing.md,
                }}
              >
                {/* Dynamic Tab Bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: spacing.xxs }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                    <Tune sx={{ fontSize: '20px', color: 'var(--text-secondary)' }} />
                    <Typography sx={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                      Tab Bar din\u00e1mica
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={effects.dynamicTabBar}
                    onChange={() => toggleEffect('dynamicTabBar')}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: primitiveColors.emerald[500] },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: primitiveColors.emerald[500] },
                    }}
                  />
                </Box>

                {/* Blur Effect */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: spacing.xxs }}>
                  <Typography sx={{ fontSize: '15px', color: 'var(--text-primary)', ml: '28px' }}>
                    Blur din\u00e1mico
                  </Typography>
                  <Switch
                    size="small"
                    checked={effects.blur}
                    onChange={() => toggleEffect('blur')}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: primitiveColors.emerald[500] },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: primitiveColors.emerald[500] },
                    }}
                  />
                </Box>

                {/* Specular Highlights */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: spacing.xxs }}>
                  <Typography sx={{ fontSize: '15px', color: 'var(--text-primary)', ml: '28px' }}>
                    Brillos especulares
                  </Typography>
                  <Switch
                    size="small"
                    checked={effects.specular}
                    onChange={() => toggleEffect('specular')}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: primitiveColors.emerald[500] },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: primitiveColors.emerald[500] },
                    }}
                  />
                </Box>

                {/* Animations */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: spacing.xxs }}>
                  <Typography sx={{ fontSize: '15px', color: 'var(--text-primary)', ml: '28px' }}>
                    Animaciones fluidas
                  </Typography>
                  <Switch
                    size="small"
                    checked={effects.animations}
                    onChange={() => toggleEffect('animations')}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: primitiveColors.emerald[500] },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: primitiveColors.emerald[500] },
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default IOSSettingsSheet;
