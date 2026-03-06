/**
 * Shared sub-components used across quotation preview sections.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { brandColors, quotationStyles, quotationTypography } from '../constants';
import { useLanguage } from '../../../contexts/LanguageContext';

// =============================================================================
// InfoField - Reusable label + value display
// =============================================================================

export interface InfoFieldProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  valueStyle?: object;
}

export const InfoField: React.FC<InfoFieldProps> = ({ label, value, icon, valueStyle }) => (
  <Box>
    <Typography sx={quotationTypography.label}>{label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {icon}
      <Typography sx={{ ...quotationTypography.value, ...valueStyle }}>{value}</Typography>
    </Box>
  </Box>
);

// =============================================================================
// SectionHeader - Reusable section header with icon and optional count
// =============================================================================

export interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  iconBgColor?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, count, iconBgColor = quotationStyles.accentTint }) => {
  const { t } = useLanguage();
  const labels = t.pages.cotizacion.preview;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
      <Box sx={{
        width: 24,
        height: 24,
        borderRadius: 1,
        bgcolor: iconBgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {icon}
      </Box>
      <Typography sx={quotationTypography.sectionHeader}>{title}</Typography>
      {count !== undefined && (
        <Box sx={{ ml: 'auto', px: 1, py: 0.25, bgcolor: quotationStyles.accentTint, borderRadius: 1 }}>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.emerald }}>
            {count} {count === 1 ? labels.item : labels.items}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// =============================================================================
// LineItem - Reusable row for lists (investments, subtotals)
// =============================================================================

export interface LineItemProps {
  label: string;
  value: string;
  isLast?: boolean;
  labelColor?: string;
  valueColor?: string;
  bgColor?: string;
}

export const LineItem: React.FC<LineItemProps> = ({
  label,
  value,
  isLast = false,
  labelColor = brandColors.gray,
  valueColor = brandColors.textPrimary,
  bgColor,
}) => (
  <Box sx={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    py: 1,
    px: 1.5,
    bgcolor: bgColor,
    borderBottom: isLast ? 'none' : `1px solid ${quotationStyles.borderLight}`,
  }}>
    <Typography sx={{ fontSize: '0.6rem', color: labelColor }}>{label}</Typography>
    <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: valueColor, ...quotationTypography.monospace }}>
      {value}
    </Typography>
  </Box>
);
