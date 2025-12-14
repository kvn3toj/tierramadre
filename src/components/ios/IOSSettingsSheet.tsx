/**
 * IOSSettingsSheet Component
 *
 * Bottom sheet for app settings
 * - Theme toggle (dark/light)
 * - Language switcher (Spanish/English)
 * - Liquid Glass effects configuration
 *
 * Refactored: Extracted reusable SettingToggleItem component
 */

import React from 'react';
import { Box, Typography, IconButton, Backdrop, Switch, SxProps, Theme } from '@mui/material';
import { Close, DarkMode, LightMode, Language, AutoAwesome, Tune } from '@mui/icons-material';
import { spacing } from '../../design-system/tokens/primitives/spacing';
import { primitiveColors } from '../../design-system/tokens/primitives/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLiquidGlassSafe, type LiquidGlassEffects } from '../../contexts/LiquidGlassContext';
import MeditationReminderSetting from '../settings/MeditationReminderSetting';
import { UserProfileCard } from '../auth';

// =============================================================================
// TYPES
// =============================================================================

export interface IOSSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

interface SettingToggleItemProps {
  icon?: React.ReactNode;
  iconBgColor: string;
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: () => void;
  accentColor: string;
  size?: 'normal' | 'small';
  indented?: boolean;
}

interface LiquidGlassEffectConfig {
  key: keyof LiquidGlassEffects;
  label: string;
  hasIcon?: boolean;
}

// =============================================================================
// REUSABLE COMPONENTS
// =============================================================================

/**
 * Get switch styles for a given accent color
 */
const getSwitchStyles = (accentColor: string): SxProps<Theme> => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: accentColor,
    '&:hover': { backgroundColor: `${accentColor}14` },
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: accentColor,
  },
});

/**
 * Reusable setting toggle item
 */
const SettingToggleItem: React.FC<SettingToggleItemProps> = ({
  icon,
  iconBgColor,
  title,
  subtitle,
  checked,
  onChange,
  accentColor,
  size = 'normal',
  indented = false,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: size === 'small' ? spacing.xxs : spacing.sm,
      paddingY: size === 'small' ? spacing.xxs : spacing.sm,
      backgroundColor: size === 'small' ? 'transparent' : 'var(--surface-primary)',
      borderRadius: size === 'small' ? 0 : spacing.md,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
      {icon && (
        <Box
          sx={{
            width: '44px',
            height: '44px',
            borderRadius: spacing.md,
            backgroundColor: iconBgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      )}
      <Box sx={{ ml: indented && !icon ? '28px' : 0 }}>
        <Typography
          variant="body1"
          sx={{
            fontSize: size === 'small' ? '15px' : '17px',
            fontWeight: size === 'small' ? 400 : 600,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{ fontSize: '13px', color: 'var(--text-secondary)' }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
    <Switch
      size={size === 'small' ? 'small' : 'medium'}
      checked={checked}
      onChange={onChange}
      sx={getSwitchStyles(accentColor)}
    />
  </Box>
);

// =============================================================================
// LIQUID GLASS SETTINGS SECTION
// =============================================================================

const LIQUID_GLASS_EFFECTS: LiquidGlassEffectConfig[] = [
  { key: 'dynamicTabBar', label: 'Tab Bar dinámica', hasIcon: true },
  { key: 'blur', label: 'Blur dinámico' },
  { key: 'specular', label: 'Brillos especulares' },
  { key: 'animations', label: 'Animaciones fluidas' },
];

const TIER_LABELS: Record<string, string> = {
  high: 'Alto rendimiento',
  medium: 'Rendimiento medio',
  low: 'Modo ahorro',
};

const LiquidGlassSettings: React.FC = () => {
  const {
    enabled,
    effectiveTier,
    effects,
    updateSettings,
    toggleEffect,
  } = useLiquidGlassSafe();

  const accentColor = primitiveColors.emerald[500];

  return (
    <Box sx={{ marginTop: spacing.sm }}>
      {/* Section Header */}
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
      <Box sx={{ marginBottom: spacing.xs }}>
        <SettingToggleItem
          icon={<AutoAwesome sx={{ fontSize: '24px', color: accentColor }} />}
          iconBgColor={`${accentColor}15`}
          title="Liquid Glass"
          subtitle={TIER_LABELS[effectiveTier] || TIER_LABELS.medium}
          checked={enabled}
          onChange={() => updateSettings({ enabled: !enabled })}
          accentColor={accentColor}
        />
      </Box>

      {/* Effect Toggles (only show when enabled) */}
      {enabled && (
        <Box
          sx={{
            display: 'grid',
            gap: spacing.xxs,
            padding: spacing.sm,
            backgroundColor: 'var(--surface-primary)',
            borderRadius: spacing.md,
          }}
        >
          {LIQUID_GLASS_EFFECTS.map((effect) => (
            <SettingToggleItem
              key={effect.key}
              icon={effect.hasIcon ? <Tune sx={{ fontSize: '20px', color: 'var(--text-secondary)' }} /> : undefined}
              iconBgColor="transparent"
              title={effect.label}
              checked={effects[effect.key]}
              onChange={() => toggleEffect(effect.key)}
              accentColor={accentColor}
              size="small"
              indented={!effect.hasIcon}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const IOSSettingsSheet: React.FC<IOSSettingsSheetProps> = ({ open, onClose }) => {
  const { mode, toggleTheme } = useTheme();
  const { language, t, toggleLanguage } = useLanguage();

  const isDarkMode = mode === 'dark';
  const isEnglish = language === 'en';

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
              sx={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}
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
          <SettingToggleItem
            icon={
              isDarkMode
                ? <DarkMode sx={{ fontSize: '24px', color: '#FFD60A' }} />
                : <LightMode sx={{ fontSize: '24px', color: '#FF9500' }} />
            }
            iconBgColor={isDarkMode ? '#FFD60A15' : '#00000015'}
            title={isDarkMode ? t.settings.darkMode : t.settings.lightMode}
            subtitle={isDarkMode ? t.settings.lightMode : t.settings.darkMode}
            checked={isDarkMode}
            onChange={toggleTheme}
            accentColor="#FFD60A"
          />

          {/* Language Toggle */}
          <SettingToggleItem
            icon={<Language sx={{ fontSize: '24px', color: '#007AFF' }} />}
            iconBgColor="#007AFF15"
            title={t.settings.language}
            subtitle={isEnglish ? t.settings.english : t.settings.spanish}
            checked={isEnglish}
            onChange={toggleLanguage}
            accentColor="#007AFF"
          />

          {/* Meditation Reminder */}
          <MeditationReminderSetting />

          {/* Liquid Glass Settings */}
          <LiquidGlassSettings />
        </Box>
      </Box>
    </>
  );
};

export default IOSSettingsSheet;
