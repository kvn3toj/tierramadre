/**
 * ProductCard — 1080×1920 per-product quotation card.
 *
 * Vertical social-share layout (matches the design sketch):
 *  - Top ~30% (576px): product photo hero band (main visual impact).
 *  - Bottom: two columns.
 *      · Left  → Nombre, Descripción (Gemas / Joyas), Cantidad, $Total.
 *      · Right → $Unitario, Certificado de Origen (C.O.) box, QR box.
 *
 * Rendered at real 1080×1920 px so html2canvas produces a crisp export.
 * On screen it is scaled down by its container (see CotizacionGenerator).
 * Reused by the public online view (`/c/:quotationNumber`).
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck } from 'lucide-react';
import {
  CotizacionProduct,
  formatCotizacionCurrency,
  getPesoDisplay,
} from '../../../hooks/useCotizacion';
import { brandColors, quotationStyles } from '../constants';
import { getCotizacionUrl } from '../utils';
import { qeFont, qeTokens } from '../../../design-system';
import { HeroGrid } from './HeroGrid';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;
const HERO_HEIGHT = 576; // 30% of 1920

export interface ProductCardProps {
  product: CotizacionProduct;
  quotationNumber: string;
  /** Optional index label (e.g. "2 / 5") for multi-product cotizaciones. */
  positionLabel?: string;
  /**
   * Override the hero images. When omitted, the product's own images are used
   * (selected AI preview, gif, base image, extra AI previews). Pass multiple
   * URLs to render an adaptive grid collage in the hero band.
   */
  heroImages?: string[];
  /**
   * Currency formatter. Defaults to plain COP so the card is safe to render
   * on the public page (outside the authenticated currency context).
   */
  formatPrice?: (amountCOP: number) => string;
}

const clean = (v?: string | number) => {
  const s = v == null ? '' : String(v).trim();
  return s && s !== '-' ? s : '';
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quotationNumber,
  positionLabel,
  heroImages,
  formatPrice,
}) => {
  const fmt =
    formatPrice ?? ((cop: number) => formatCotizacionCurrency(cop, 'COP'));
  const cantidad = product.cantidad ?? 1;
  const unit = product.precioCOP;
  const total = unit * cantidad;
  // Hero images: explicit override, else the product's own distinct images.
  const ownImages = Array.from(
    new Set(
      [
        product.selectedPreviewUrl,
        product.gifUrl,
        product.imagen,
        ...(product.aiPreviews?.map((p) => p.url) ?? []),
      ].filter((s): s is string => !!s),
    ),
  );
  const gridImages =
    heroImages && heroImages.length > 0 ? heroImages : ownImages;
  const qrUrl = getCotizacionUrl(quotationNumber);

  // Descripción / spec segments.
  const gemLine = [
    clean(getPesoDisplay(product)),
    clean(product.color),
    clean(product.calidad),
  ]
    .filter(Boolean)
    .join(' · ');
  const joyaLine = [clean(product.metalType), clean(product.medidasValores)]
    .filter(Boolean)
    .join(' · ');

  const hasCertImage =
    !!product.certificadoUrl && !/\.pdf($|\?)/i.test(product.certificadoUrl);

  return (
    <Box
      className="cotizacion-card"
      sx={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        bgcolor: quotationStyles.surface,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: qeFont.ui,
        color: qeTokens.light.text,
      }}
    >
      {/* Emerald accent line (brand) */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          zIndex: 2,
          background: `linear-gradient(90deg, ${brandColors.emerald}, ${brandColors.emeraldDark})`,
        }}
      />

      {/* ── Hero band ── */}
      <Box
        sx={{
          height: HERO_HEIGHT,
          width: '100%',
          flexShrink: 0,
          position: 'relative',
          bgcolor: product.isJewelry ? '#F2F2F2' : quotationStyles.accentTint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <HeroGrid images={gridImages} isJewelry={product.isJewelry} />

        {positionLabel && (
          <Box
            sx={{
              position: 'absolute',
              top: 28,
              right: 28,
              px: '18px',
              py: '8px',
              borderRadius: '999px',
              bgcolor: 'rgba(0,0,0,0.55)',
              color: '#fff',
              fontFamily: qeFont.mono,
              fontSize: '26px',
              letterSpacing: '0.08em',
            }}
          >
            {positionLabel}
          </Box>
        )}
      </Box>

      {/* ── Bottom content ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          px: '56px',
          py: '56px',
          gap: '48px',
        }}
      >
        {/* Left column — item detail */}
        <Box
          sx={{
            flex: 1.35,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            sx={{
              fontFamily: qeFont.serif,
              fontSize: '72px',
              fontWeight: 500,
              lineHeight: 1.02,
              color: qeTokens.light.text,
              mb: '28px',
            }}
          >
            {product.name}
          </Typography>

          {clean(product.descripcion) && (
            <Typography
              sx={{
                fontSize: '30px',
                lineHeight: 1.3,
                color: qeTokens.light.subtle,
                mb: '28px',
              }}
            >
              {product.descripcion}
            </Typography>
          )}

          {/* Gemas / Joyas sub-lines */}
          <Box sx={{ mb: '40px' }}>
            {gemLine && (
              <SpecRow
                label={product.isJewelry ? 'Gemas' : 'Gema'}
                value={gemLine}
              />
            )}
            {joyaLine && <SpecRow label="Joya" value={joyaLine} />}
          </Box>

          {/* Cantidad */}
          <MetaLine label="Cantidad" value={String(cantidad)} />

          <Box sx={{ flex: 1 }} />

          {/* Total (emphasized) */}
          <Box sx={{ mt: '32px' }}>
            <Typography
              sx={{
                fontFamily: qeFont.mono,
                fontSize: '26px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: qeTokens.light.subtle,
                mb: '8px',
              }}
            >
              Total
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  bgcolor: qeTokens.light.accent,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: qeFont.mono,
                  fontSize: '76px',
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-1px',
                  color: qeTokens.light.text,
                }}
              >
                {fmt(total)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Right column — unit price, C.O., QR */}
        <Box
          sx={{
            width: 372,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
          }}
        >
          {/* Unit price */}
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              sx={{
                fontFamily: qeFont.mono,
                fontSize: '24px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: qeTokens.light.subtle,
                mb: '6px',
              }}
            >
              Precio unitario
            </Typography>
            <Typography
              sx={{
                fontFamily: qeFont.mono,
                fontSize: '44px',
                fontWeight: 600,
                lineHeight: 1,
                color: qeTokens.light.text,
              }}
            >
              {fmt(unit)}
            </Typography>
          </Box>

          {/* Certificado de Origen box */}
          <Box
            sx={{
              border: `1px solid ${quotationStyles.borderLight}`,
              borderRadius: '20px',
              overflow: 'hidden',
              bgcolor: quotationStyles.surfaceMuted,
            }}
          >
            {hasCertImage && (
              <Box
                component="img"
                src={product.certificadoUrl}
                alt="Certificado de Origen"
                crossOrigin="anonymous"
                sx={{
                  width: '100%',
                  height: 220,
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            )}
            <Box sx={{ p: '24px' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  mb: '14px',
                }}
              >
                <ShieldCheck size={30} color={qeTokens.light.accent} />
                <Typography
                  sx={{
                    fontFamily: qeFont.mono,
                    fontSize: '22px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: qeTokens.light.text,
                    fontWeight: 600,
                  }}
                >
                  Certificado de Origen
                </Typography>
              </Box>
              {product.numeroCO && (
                <Typography
                  sx={{
                    fontFamily: qeFont.mono,
                    fontSize: '26px',
                    color: qeTokens.light.accent,
                    fontWeight: 700,
                    mb: '16px',
                  }}
                >
                  {product.numeroCO}
                </Typography>
              )}
              {['Esmeralda Colombiana', '100% Natural', 'ADN de Paz'].map(
                (badge) => (
                  <Box
                    key={badge}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      mb: '8px',
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: qeTokens.light.accent,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{ fontSize: '26px', color: qeTokens.light.text }}
                    >
                      {badge}
                    </Typography>
                  </Box>
                ),
              )}
            </Box>
          </Box>

          {/* QR box → online cotización */}
          <Box
            sx={{
              border: `1px solid ${quotationStyles.borderLight}`,
              borderRadius: '20px',
              p: '24px',
              bgcolor: quotationStyles.surface,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <QRCodeSVG
              value={qrUrl}
              size={244}
              level="M"
              fgColor={qeTokens.light.text}
              bgColor={quotationStyles.surface}
            />
            <Typography
              sx={{
                fontFamily: qeFont.mono,
                fontSize: '22px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: qeTokens.light.subtle,
                textAlign: 'center',
              }}
            >
              Ver cotización online
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer brand strip */}
      <Box
        sx={{
          flexShrink: 0,
          px: '56px',
          py: '24px',
          borderTop: `1px solid ${quotationStyles.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          sx={{
            fontFamily: qeFont.serif,
            fontSize: '30px',
            letterSpacing: '0.16em',
            color: qeTokens.light.text,
          }}
        >
          TIERRA MÄDRE
        </Typography>
        <Typography
          sx={{
            fontFamily: qeFont.mono,
            fontSize: '24px',
            color: qeTokens.light.subtle,
          }}
        >
          {quotationNumber}
        </Typography>
      </Box>
    </Box>
  );
};

// ── Small sub-components ──

const SpecRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <Box
    sx={{ display: 'flex', alignItems: 'baseline', gap: '12px', mb: '10px' }}
  >
    <Typography
      sx={{
        fontFamily: qeFont.mono,
        fontSize: '24px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: qeTokens.light.accent,
        minWidth: 120,
      }}
    >
      {label}
    </Typography>
    <Typography sx={{ fontSize: '30px', color: qeTokens.light.text }}>
      {value}
    </Typography>
  </Box>
);

const MetaLine: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
    <Typography
      sx={{
        fontFamily: qeFont.mono,
        fontSize: '26px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: qeTokens.light.subtle,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{ fontSize: '36px', fontWeight: 600, color: qeTokens.light.text }}
    >
      {value}
    </Typography>
  </Box>
);

export default ProductCard;
