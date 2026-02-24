/**
 * IOSSettingsSheet Component
 *
 * Bottom sheet for app settings
 * - Theme toggle (dark/light)
 * - Language switcher (Spanish/English)
 * - Meditation reminder
 *
 * Refactored: Extracted reusable SettingToggleItem component
 */

import React from 'react';
import { Box, Typography, IconButton, Backdrop, Switch, SxProps, Theme, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Close, DarkMode, LightMode, Language, Visibility, VisibilityOff, AttachMoney, CurrencyExchange } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { radius, layoutConstants, iosTypographyScale, blackAlpha, blurValues, primitiveColors, primitiveSpacing as spacing } from '../../design-system';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { useCurrency, UsdMultiplier } from '../../contexts/CurrencyContext';
import { useIsAdmin } from '../../hooks/usePermissions';
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
            width: `${layoutConstants.minTouchTarget}px`,
            height: `${layoutConstants.minTouchTarget}px`,
            borderRadius: radius.md,
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
            fontSize: size === 'small' ? iosTypographyScale.subhead : iosTypographyScale.headline,
            fontWeight: size === 'small' ? 400 : 600,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{ fontSize: iosTypographyScale.footnote, color: 'var(--text-secondary)' }}
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
// MAIN COMPONENT
// =============================================================================

const IOSSettingsSheet: React.FC<IOSSettingsSheetProps> = ({ open, onClose }) => {
  const { mode, toggleTheme } = useTheme();
  const { language, t, toggleLanguage } = useLanguage();
  const { showPrices, togglePriceShare, canToggle } = usePriceShare();
  const { currency, toggleCurrency, canToggleCurrency, multiplier, setMultiplier } = useCurrency();
  const isAdmin = useIsAdmin();

  const isDarkMode = mode === 'dark';
  const isUSD = currency === 'USD';
  const isEnglish = language === 'en';

  return (
    <>
      <Backdrop
        open={open}
        onClick={onClose}
        sx={{
          zIndex: 1100,
          backgroundColor: blackAlpha(0.4),
          backdropFilter: `blur(${blurValues.md})`,
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
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
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
              sx={{ fontSize: iosTypographyScale.title2, fontWeight: 700, color: 'var(--text-primary)' }}
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
                ? <DarkMode sx={{ fontSize: '24px', color: primitiveColors.system.yellow.light }} />
                : <LightMode sx={{ fontSize: '24px', color: primitiveColors.system.orange.light }} />
            }
            iconBgColor={isDarkMode ? alpha(primitiveColors.system.yellow.light, 0.08) : alpha('#000000', 0.08)}
            title={isDarkMode ? t.settings.darkMode : t.settings.lightMode}
            subtitle={isDarkMode ? t.settings.lightMode : t.settings.darkMode}
            checked={isDarkMode}
            onChange={toggleTheme}
            accentColor={primitiveColors.system.yellow.light}
          />

          {/* Language Toggle */}
          <SettingToggleItem
            icon={<Language sx={{ fontSize: '24px', color: primitiveColors.system.blue.light }} />}
            iconBgColor={alpha(primitiveColors.system.blue.light, 0.08)}
            title={t.settings.language}
            subtitle={isEnglish ? t.settings.english : t.settings.spanish}
            checked={isEnglish}
            onChange={toggleLanguage}
            accentColor={primitiveColors.system.blue.light}
          />

          {/* Price Share Toggle - Only for staff */}
          {canToggle && (
            <SettingToggleItem
              icon={
                showPrices
                  ? <Visibility sx={{ fontSize: '24px', color: primitiveColors.system.green.light }} />
                  : <VisibilityOff sx={{ fontSize: '24px', color: primitiveColors.system.gray.light }} />
              }
              iconBgColor={showPrices ? alpha(primitiveColors.system.green.light, 0.08) : alpha(primitiveColors.system.gray.light, 0.08)}
              title={t.settings.sharePrices}
              subtitle={showPrices ? t.settings.pricesShared : t.settings.pricesPrivate}
              checked={showPrices}
              onChange={togglePriceShare}
              accentColor={primitiveColors.system.green.light}
            />
          )}

          {/* Currency Toggle - Only for authorized user */}
          {canToggleCurrency && (
            <SettingToggleItem
              icon={
                isUSD
                  ? <AttachMoney sx={{ fontSize: '24px', color: '#2E7D32' }} />
                  : <CurrencyExchange sx={{ fontSize: '24px', color: '#2E7D32' }} />
              }
              iconBgColor={alpha('#2E7D32', 0.08)}
              title={t.settings.currencyMode}
              subtitle={isUSD ? t.settings.currencyUSDActive : t.settings.currencyCOPActive}
              checked={isUSD}
              onChange={toggleCurrency}
              accentColor="#2E7D32"
            />
          )}

          {/* USD Multiplier - Only for admin + currency-authorized */}
          {canToggleCurrency && isAdmin && (
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
                <Box sx={{ ml: '28px' }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: iosTypographyScale.headline,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {t.settings.currencyMultiplier}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: iosTypographyScale.footnote, color: 'var(--text-secondary)' }}
                  >
                    {t.settings.currencyMultiplierHint}
                  </Typography>
                </Box>
              </Box>
              <ToggleButtonGroup
                value={multiplier}
                exclusive
                onChange={(_e, val) => { if (val !== null) setMultiplier(val as UsdMultiplier); }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    px: 1.5,
                    py: 0.5,
                    fontSize: iosTypographyScale.footnote,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    borderColor: 'var(--border-default)',
                    '&.Mui-selected': {
                      backgroundColor: alpha('#2E7D32', 0.12),
                      color: '#2E7D32',
                      borderColor: '#2E7D32',
                      '&:hover': { backgroundColor: alpha('#2E7D32', 0.18) },
                    },
                  },
                }}
              >
                <ToggleButton value={2}>x2</ToggleButton>
                <ToggleButton value={3}>x3</ToggleButton>
                <ToggleButton value={4}>x4</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          {/* Meditation Reminder */}
          <MeditationReminderSetting />
        </Box>
      </Box>
    </>
  );
};

export default IOSSettingsSheet;
