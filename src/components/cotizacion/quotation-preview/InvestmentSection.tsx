/**
 * InvestmentSection - Displays additional investment costs in the quotation.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { DollarSign } from 'lucide-react';
import { brandColors, quotationStyles, quotationTypography } from '../constants';
import {
  CotizacionInvestment,
  CustomCost,
  useCotizacionFormat,
} from '../../../hooks/useCotizacion';
import { SectionHeader, LineItem } from './shared';
import { useLanguage } from '../../../contexts/LanguageContext';

export interface InvestmentSectionProps {
  investments: CotizacionInvestment[];
  customCosts: CustomCost[];
  totalInvestment: number;
}

export const InvestmentSection: React.FC<InvestmentSectionProps> = ({ investments, customCosts, totalInvestment }) => {
  const { formatPrice: formatCurrency } = useCotizacionFormat();
  const { t } = useLanguage();
  const labels = t.pages.cotizacion.preview;
  const activeInvestments = investments.filter(inv => inv.value > 0);
  const allItems = [
    ...activeInvestments.map(inv => ({ id: inv.id, label: inv.label, value: inv.value })),
    ...customCosts.map(cost => ({ id: cost.id, label: cost.label, value: cost.value })),
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <SectionHeader
        icon={<DollarSign size={13} color={brandColors.gold} />}
        title={labels.additionalInvestment}
        iconBgColor="rgba(212,175,55,0.1)"
      />
      <Box sx={{
        bgcolor: quotationStyles.surfaceMuted,
        borderRadius: 2,
        border: `1px solid ${quotationStyles.borderLight}`,
        overflow: 'hidden',
      }}>
        {allItems.map((item, index) => (
          <LineItem
            key={item.id}
            label={item.label}
            value={formatCurrency(item.value)}
            isLast={index === allItems.length - 1}
          />
        ))}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1,
          px: 1.5,
          bgcolor: 'rgba(212,175,55,0.06)',
          borderTop: `1px solid ${quotationStyles.borderLight}`,
        }}>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.textPrimary }}>
            {labels.totalInvestment}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: brandColors.gold, ...quotationTypography.monospace }}>
            {formatCurrency(totalInvestment)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
