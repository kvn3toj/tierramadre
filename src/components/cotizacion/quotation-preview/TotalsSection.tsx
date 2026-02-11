/**
 * TotalsSection - Displays subtotals, discounts, and final total with QR code.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { brandColors, quotationStyles, quotationTypography } from '../constants';
import { getQrCodeUrl } from '../utils';
import { accentColors } from '../../../design-system';
import {
  CotizacionProduct,
  useCotizacionFormat,
} from '../../../hooks/useCotizacion';
import { LineItem } from './shared';

export interface TotalsSectionProps {
  products: CotizacionProduct[];
  totalInvestment: number;
  productSubtotal: number;
  discountPercent: number;
  subtotal: number;
  discount: number;
  total: number;
}

export const TotalsSection: React.FC<TotalsSectionProps> = ({
  products,
  totalInvestment,
  productSubtotal,
  discountPercent,
  subtotal,
  discount,
  total,
}) => {
  const { formatPrice: formatCurrency } = useCotizacionFormat();
  const showBreakdown = products.length > 0 && totalInvestment > 0;
  const qrUrl = getQrCodeUrl(products);

  return (
    <Box sx={{ mb: 3 }}>
      {/* Subtotals Card */}
      <Box sx={{
        bgcolor: quotationStyles.surfaceMuted,
        borderRadius: 2,
        border: `1px solid ${quotationStyles.borderLight}`,
        overflow: 'hidden',
        mb: 2,
      }}>
        {showBreakdown && (
          <>
            <LineItem label="Subtotal Productos" value={formatCurrency(productSubtotal)} />
            <LineItem label="Inversión" value={formatCurrency(totalInvestment)} />
          </>
        )}
        <LineItem
          label="Subtotal"
          value={formatCurrency(subtotal)}
          isLast={discountPercent <= 0}
        />
        {discountPercent > 0 && (
          <LineItem
            label={`Descuento (${discountPercent}%)`}
            value={`-${formatCurrency(discount)}`}
            isLast
            labelColor={accentColors.error.light}
            valueColor={accentColors.error.light}
            bgColor="rgba(239,68,68,0.04)"
          />
        )}
      </Box>

      {/* Total Card - Subtle inline style with QR */}
      <Box
        sx={{
          bgcolor: quotationStyles.accentTint,
          border: `1px solid ${brandColors.emerald}`,
          borderRadius: 2,
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Price Content - Subtle, inline */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography sx={{
            fontSize: '0.55rem',
            color: brandColors.gray,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}>
            Total
          </Typography>
          <Typography sx={{
            fontSize: '1rem',
            fontWeight: 700,
            color: brandColors.emerald,
            letterSpacing: '-0.01em',
            lineHeight: 1,
            ...quotationTypography.monospace,
          }}>
            {formatCurrency(total)}
          </Typography>
        </Box>

        {/* QR Code - Compact */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{
            fontSize: '0.4rem',
            color: brandColors.gray,
            letterSpacing: '0.02em',
          }}>
            Escanea
          </Typography>
          <Box
            sx={{
              width: 44,
              height: 44,
              p: 0.5,
              bgcolor: quotationStyles.surface,
              borderRadius: 1.5,
              border: `1px solid ${quotationStyles.borderLight}`,
              flexShrink: 0,
            }}
          >
            {products.length > 0 ? (
              <QRCodeSVG
                value={qrUrl}
                size={36}
                level="L"
                fgColor={brandColors.emerald}
                bgColor={quotationStyles.surface}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '1px',
                }}
              >
                {Array(16).fill(0).map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      bgcolor: (i + Math.floor(i / 4)) % 2 === 0 ? '#E5E7EB' : 'transparent',
                      borderRadius: '0.5px',
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
