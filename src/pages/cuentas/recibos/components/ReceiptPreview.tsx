/**
 * ReceiptPreview Component
 * Renders the receipt document preview for PDF export.
 * Shows product thumbnails and currency-aware pricing.
 */

import React, { forwardRef } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { ReceiptData } from '../../../../types';
import { semanticColors } from '../../../../design-system/tokens/colors';
import { useCotizacionFormat } from '../../../../hooks/useCotizacion';
import { formatCarats } from '../../../../utils/formatting';
import {
  receiptThemes,
  paymentMethodLabels,
  formatDate,
  type ReceiptTheme,
  type BusinessSettings,
  type DocumentType,
} from '../constants/receiptThemes';

interface ReceiptPreviewProps {
  receipt: Partial<ReceiptData>;
  receiptTheme: ReceiptTheme;
  documentType: DocumentType;
  businessSettings: BusinessSettings;
}

export const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptPreviewProps>(
  ({ receipt, receiptTheme, documentType, businessSettings }, ref) => {
    const theme = receiptThemes[receiptTheme];
    const { formatPrice } = useCotizacionFormat();

    const getPesoLabel = (product: ReceiptData['products'][number]): string => {
      if (product.isJewelry) return product.metalType || 'Joya';
      if (product.peso != null) {
        return typeof product.peso === 'number'
          ? `${formatCarats(product.peso)} ct`
          : String(product.peso);
      }
      if (product.weightCarats)
        return `${formatCarats(product.weightCarats)} quilates`;
      return '';
    };

    return (
      <Box
        ref={ref}
        className="receipt-preview"
        sx={{
          width: 450,
          minHeight: 650,
          bgcolor: theme.bg,
          borderRadius: 1,
          overflow: 'hidden',
          border:
            receiptTheme === 'dark'
              ? '1px solid #333'
              : `1px solid ${theme.border}`,
          boxShadow:
            receiptTheme === 'dark'
              ? '0 4px 20px rgba(0,0,0,0.5)'
              : '0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: theme.headerBg,
            p: 3,
            textAlign: 'center',
            borderBottom: `2px solid ${theme.accent}`,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
              mb: 1,
            }}
          >
            <Box
              component="img"
              src={
                receiptTheme === 'dark' ? '/logo-white.png' : '/logo-brand.png'
              }
              alt="Tierra Mädre"
              sx={{
                // Full lockup, same geometry in both themes (1280×687).
                // ≥80px keeps the slogan legible.
                height: 90,
                width: 'auto',
                objectFit: 'contain',
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </Box>
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: theme.textSecondary,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              mt: 1,
            }}
          >
            Esmeraldas Colombianas de Origen
          </Typography>
        </Box>

        {/* Receipt Info */}
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Box>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: theme.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {businessSettings.documentTypeLabels[documentType]}
              </Typography>
              <Typography
                sx={{ fontSize: '0.85rem', color: theme.text, fontWeight: 500 }}
              >
                {receipt.receiptNumber}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                sx={{ fontSize: '0.7rem', color: theme.textSecondary }}
              >
                {businessSettings.contactPhone}
              </Typography>
              <Typography
                sx={{ fontSize: '0.7rem', color: theme.textSecondary }}
              >
                {businessSettings.contactEmail}
              </Typography>
              <Typography
                sx={{ fontSize: '0.7rem', color: theme.textSecondary }}
              >
                {businessSettings.nit}
              </Typography>
            </Box>
          </Box>

          {/* Date */}
          <Typography
            sx={{ fontSize: '0.75rem', color: theme.textSecondary, mb: 2 }}
          >
            Fecha: {formatDate(receipt.date || new Date().toISOString())}
          </Typography>

          {/* Client */}
          <Box
            sx={{
              bgcolor: theme.cardBg,
              p: 2,
              borderRadius: 1,
              mb: 3,
              borderLeft: `3px solid ${theme.accent}`,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.7rem',
                color: theme.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                mb: 0.5,
              }}
            >
              Cliente
            </Typography>
            <Typography
              sx={{ fontSize: '0.9rem', color: theme.text, fontWeight: 500 }}
            >
              {receipt.client?.name || 'Sin especificar'}
            </Typography>
            {receipt.client?.document && (
              <Typography
                sx={{ fontSize: '0.75rem', color: theme.textSecondary }}
              >
                Doc: {receipt.client.document}
              </Typography>
            )}
            {receipt.client?.phone && (
              <Typography
                sx={{ fontSize: '0.75rem', color: theme.textSecondary }}
              >
                Tel: {receipt.client.phone}
              </Typography>
            )}
          </Box>

          {/* Products */}
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: '0.7rem',
                color: theme.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                mb: 1.5,
                borderBottom: `1px solid ${theme.border}`,
                pb: 1,
              }}
            >
              Detalle de Productos
            </Typography>

            {(receipt.products || []).length === 0 ? (
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  color: theme.textMuted,
                  fontStyle: 'italic',
                  py: 2,
                }}
              >
                Sin productos agregados
              </Typography>
            ) : (
              receipt.products?.map((product) => (
                <Box
                  key={product.id}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    py: 1.5,
                    borderBottom: `1px solid ${theme.border}`,
                  }}
                >
                  {/* Product Thumbnail */}
                  {product.imagen && (
                    <Box
                      component="img"
                      src={product.imagen}
                      alt={product.name}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 0.5,
                        objectFit: 'cover',
                        flexShrink: 0,
                        border: `1px solid ${theme.border}`,
                      }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '0.85rem', color: theme.text }}>
                      {product.itemNumber ? `#${product.itemNumber} - ` : ''}
                      {product.name}
                    </Typography>
                    {product.description && (
                      <Typography
                        sx={{ fontSize: '0.7rem', color: theme.textSecondary }}
                      >
                        {product.description}
                      </Typography>
                    )}
                    {(getPesoLabel(product) || product.color) && (
                      <Typography
                        sx={{
                          fontSize: '0.7rem',
                          color:
                            receiptTheme === 'dark'
                              ? theme.accent
                              : theme.textSecondary,
                        }}
                      >
                        {[getPesoLabel(product), product.color]
                          .filter(Boolean)
                          .join(' \u2022 ')}
                      </Typography>
                    )}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.85rem',
                      color: theme.text,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {formatPrice(product.precioCOP)}
                  </Typography>
                </Box>
              ))
            )}
          </Box>

          {/* Totals */}
          <Box
            sx={{
              bgcolor: theme.cardBg,
              p: 2,
              borderRadius: 1,
              mb: 3,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.7rem',
                color: theme.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                mb: 1,
              }}
            >
              Resumen de Montos
            </Typography>

            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}
            >
              <Typography
                sx={{ fontSize: '0.8rem', color: theme.textSecondary }}
              >
                Subtotal
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: theme.text }}>
                {formatPrice(receipt.subtotal || 0)}
              </Typography>
            </Box>

            {(receipt.discount || 0) > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Typography
                  sx={{ fontSize: '0.8rem', color: theme.textSecondary }}
                >
                  Descuento ({receipt.discountPercent}%)
                </Typography>
                <Typography
                  sx={{ fontSize: '0.8rem', color: semanticColors.error.main }}
                >
                  -{formatPrice(receipt.discount || 0)}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 1, borderColor: theme.border }} />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  color: receiptTheme === 'dark' ? theme.accent : theme.text,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Total a Pagar
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.2rem',
                  color: receiptTheme === 'dark' ? theme.accent : theme.text,
                  fontWeight: 700,
                }}
              >
                {formatPrice(receipt.total || 0)}
              </Typography>
            </Box>
          </Box>

          {/* Payment Method */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              sx={{ fontSize: '0.75rem', color: theme.textSecondary }}
            >
              Metodo de Pago:
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: theme.text }}>
              {paymentMethodLabels[receipt.paymentMethod || 'cash']}
            </Typography>
          </Box>

          {/* Notes */}
          {receipt.notes && (
            <Box sx={{ mb: 2 }}>
              <Typography
                sx={{ fontSize: '0.7rem', color: theme.textSecondary, mb: 0.5 }}
              >
                Notas:
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: theme.textSecondary,
                  fontStyle: 'italic',
                }}
              >
                {receipt.notes}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            bgcolor: theme.headerBg,
            p: 2,
            textAlign: 'center',
            borderTop: `1px solid ${theme.border}`,
          }}
        >
          <Typography
            sx={{ fontSize: '0.65rem', color: theme.textMuted, mb: 0.5 }}
          >
            {businessSettings.footerMessage}
          </Typography>
          <Typography
            sx={{ fontSize: '0.6rem', color: theme.textMuted, lineHeight: 1.4 }}
          >
            {businessSettings.footerNote}
          </Typography>

          {/* Decorative element */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                bgcolor: theme.accent,
                transform: 'rotate(45deg)',
              }}
            />
          </Box>
        </Box>
      </Box>
    );
  },
);

ReceiptPreview.displayName = 'ReceiptPreview';

export default ReceiptPreview;
