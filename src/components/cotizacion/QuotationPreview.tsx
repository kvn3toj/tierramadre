/**
 * QuotationPreview Component
 * Renders the printable quotation document with premium styling.
 */

import React, { forwardRef } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Package, DollarSign, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { documentShadows } from '../../design-system/tokens';
import { brandColors } from './constants';
import {
  CotizacionProduct,
  CotizacionInvestment,
  CustomCost,
  BusinessSettings,
  formatCotizacionCurrency,
  generateProductSlug,
  getPesoDisplay,
} from '../../hooks/useCotizacion';

export interface QuotationPreviewProps {
  // Basic info
  quotationNumber: string;
  clientName: string;
  asesorName: string;
  date: string;
  expiryStr: string;
  notes: string;

  // Products
  products: CotizacionProduct[];

  // Investments
  investments: CotizacionInvestment[];
  customCosts: CustomCost[];
  totalInvestment: number;

  // Totals
  productSubtotal: number;
  discountPercent: number;
  subtotal: number;
  discount: number;
  total: number;

  // Settings
  businessSettings: BusinessSettings;
}

const formatCurrency = formatCotizacionCurrency;

export const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(
  (
    {
      quotationNumber,
      clientName,
      asesorName,
      date,
      expiryStr,
      notes,
      products,
      investments,
      customCosts,
      totalInvestment,
      productSubtotal,
      discountPercent,
      subtotal,
      discount,
      total,
      businessSettings,
    },
    ref
  ) => {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          bgcolor: brandColors.background,
          border: `1px solid ${brandColors.border}`,
          boxShadow: documentShadows.paper,
          minHeight: 700,
        }}
      >
        <Box
          ref={ref}
          className="quotation-preview"
          sx={{
            bgcolor: brandColors.background,
            p: 1.5,
            borderRadius: 2,
          }}
        >
          {/* Premium Gold Border */}
          <Box
            sx={{
              position: 'relative',
              borderRadius: 1,
              p: '3px',
              background: `linear-gradient(135deg, #B8860B 0%, #D4AF37 25%, #F4E4C1 50%, #D4AF37 75%, #B8860B 100%)`,
              boxShadow: `
                0 2px 8px rgba(212, 175, 55, 0.2),
                0 4px 16px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.3)
              `,
            }}
          >
            {/* Emerald inner border */}
            <Box
              sx={{
                border: `1.5px solid ${brandColors.emerald}`,
                borderRadius: 0.5,
                background: '#FFFFFF',
              }}
            >
              {/* Premium Paper */}
              <Box
                sx={{
                  p: 3,
                  minHeight: 650,
                  background: `
                    linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,248,0.95) 50%, rgba(255,255,255,0.98) 100%),
                    repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(212,175,55,0.015) 2px, rgba(212,175,55,0.015) 4px)
                  `,
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.02)',
                  position: 'relative',
                }}
              >
                {/* Header Info */}
                <HeaderInfo
                  clientName={clientName}
                  asesorName={asesorName}
                  quotationNumber={quotationNumber}
                />

                {/* Logo Section */}
                <LogoSection />

                {/* Title Bar */}
                <TitleBar />

                {/* Date */}
                <Typography sx={{ textAlign: 'center', fontSize: '0.7rem', color: brandColors.gray, mb: 3 }}>
                  Fecha de emisión: {new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>

                {/* Products List */}
                <ProductsSection products={products} />

                {/* Investment Breakdown */}
                {totalInvestment > 0 && (
                  <InvestmentSection
                    investments={investments}
                    customCosts={customCosts}
                    totalInvestment={totalInvestment}
                  />
                )}

                {/* Totals */}
                {(products.length > 0 || totalInvestment > 0) && (
                  <TotalsSection
                    products={products}
                    totalInvestment={totalInvestment}
                    productSubtotal={productSubtotal}
                    discountPercent={discountPercent}
                    subtotal={subtotal}
                    discount={discount}
                    total={total}
                  />
                )}

                {/* Notes */}
                {notes && <NotesSection notes={notes} />}

                {/* Validity */}
                <ValiditySection expiryStr={expiryStr} footerNote={businessSettings.footerNote} />

                {/* Footer */}
                <FooterSection
                  products={products}
                  businessSettings={businessSettings}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  }
);

QuotationPreview.displayName = 'QuotationPreview';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const HeaderInfo: React.FC<{ clientName: string; asesorName: string; quotationNumber: string }> = ({
  clientName,
  asesorName,
  quotationNumber,
}) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
    <Box>
      {clientName && (
        <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
          Cliente: <strong>{clientName}</strong>
        </Typography>
      )}
      {asesorName && (
        <Typography sx={{ fontSize: '0.6rem', color: brandColors.emerald, mt: 0.25 }}>
          Asesor: <strong>{asesorName}</strong>
        </Typography>
      )}
    </Box>
    <Box sx={{ textAlign: 'right' }}>
      <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray, letterSpacing: 1 }}>
        COTIZACIÓN No.
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: brandColors.textPrimary }}>
        {quotationNumber}
      </Typography>
    </Box>
  </Box>
);

const LogoSection: React.FC = () => (
  <Box sx={{ textAlign: 'center', mb: 3 }}>
    <Box
      sx={{
        position: 'relative',
        width: 200,
        mx: 'auto',
        mb: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '-20px',
          background: 'radial-gradient(circle, rgba(0,174,122,0.08) 0%, rgba(0,174,122,0.03) 50%, transparent 70%)',
          borderRadius: '50%',
        },
      }}
    >
      <img
        src="/logo-tierra-madre.png"
        alt="Tierra Mädre"
        style={{ maxWidth: '100%', position: 'relative', zIndex: 1 }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </Box>

    <Typography sx={{
      fontSize: '0.65rem',
      color: brandColors.gold,
      letterSpacing: '0.25em',
      fontWeight: 400,
      textTransform: 'uppercase',
    }}>
      Colombian Emeralds
    </Typography>

    {/* Decorative Divider */}
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 1.5 }}>
      <Box sx={{
        flex: 1,
        maxWidth: 60,
        height: '1px',
        background: `linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.4) 50%, rgba(212,175,55,0.8) 100%)`,
      }} />
      <Box sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, #00E5A0 0%, ${brandColors.emerald} 40%, ${brandColors.emeraldDark} 100%)`,
        boxShadow: `
          0 2px 6px rgba(0,174,122,0.3),
          inset -2px -2px 4px rgba(0,0,0,0.15),
          inset 2px 2px 4px rgba(255,255,255,0.2)
        `,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '2px',
          left: '2px',
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.5)',
          filter: 'blur(1px)',
        },
      }} />
      <Box sx={{
        flex: 1,
        maxWidth: 60,
        height: '1px',
        background: `linear-gradient(90deg, rgba(212,175,55,0.8) 0%, rgba(212,175,55,0.4) 50%, transparent 100%)`,
      }} />
    </Box>
  </Box>
);

const TitleBar: React.FC = () => (
  <Box
    sx={{
      position: 'relative',
      background: `
        linear-gradient(180deg, ${brandColors.emeraldDark} 0%, #0D4019 100%),
        repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)
      `,
      py: 1.5,
      px: 3,
      borderRadius: 0.5,
      mb: 3,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0,174,122,0.4), transparent)',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.2), transparent)',
        filter: 'blur(1px)',
      },
    }}
  >
    <Typography
      sx={{
        color: '#fff',
        fontSize: '0.8rem',
        fontWeight: 500,
        textAlign: 'center',
        letterSpacing: '0.2em',
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      COTIZACIÓN DE VENTA
    </Typography>
  </Box>
);

const ProductsSection: React.FC<{ products: CotizacionProduct[] }> = ({ products }) => {
  if (products.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Package size={32} color={brandColors.lightGray} style={{ marginBottom: 8 }} />
        <Typography sx={{ fontSize: '0.75rem', color: brandColors.gray }}>
          Agrega productos del inventario
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mb: 1.5,
          pb: 0.75,
          borderBottom: `2px solid ${brandColors.emeraldDark}`,
        }}
      >
        <Package size={14} color={brandColors.emeraldDark} />
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.emeraldDark, letterSpacing: '0.05em' }}>
          PRODUCTOS ({products.length})
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {products.map((product, index) => (
          <Box
            key={product.id}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1,
              px: 1.25,
              bgcolor: index % 2 === 0 ? 'rgba(27, 94, 32, 0.03)' : 'transparent',
              borderBottom: `1px solid rgba(0,0,0,0.06)`,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.textPrimary }}>
                #{product.itemNumber} - {product.name}
              </Typography>
              <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray, mt: 0.25 }}>
                {getPesoDisplay(product)} • {product.color} • {product.talla}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: brandColors.emerald, fontFamily: 'monospace' }}>
              {formatCurrency(product.precioCOP)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const InvestmentSection: React.FC<{
  investments: CotizacionInvestment[];
  customCosts: CustomCost[];
  totalInvestment: number;
}> = ({ investments, customCosts, totalInvestment }) => (
  <Box sx={{ borderTop: `1px solid ${brandColors.lightGray}`, pt: 1.5, mb: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
      <DollarSign size={12} color={brandColors.emerald} />
      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: brandColors.emeraldDark }}>
        INVERSIÓN
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {investments.filter(inv => inv.value > 0).map((inv) => (
        <Box
          key={inv.id}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 0.25,
          }}
        >
          <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray }}>
            {inv.label}
          </Typography>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.textPrimary }}>
            {formatCurrency(inv.value)}
          </Typography>
        </Box>
      ))}
      {customCosts.map((cost) => (
        <Box
          key={cost.id}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 0.25,
          }}
        >
          <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray }}>
            {cost.label}
          </Typography>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.textPrimary }}>
            {formatCurrency(cost.value)}
          </Typography>
        </Box>
      ))}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 0.5,
          mt: 0.5,
          borderTop: `1px dashed ${brandColors.lightGray}`,
        }}
      >
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.emeraldDark }}>
          Total Inversión
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: brandColors.emerald }}>
          {formatCurrency(totalInvestment)}
        </Typography>
      </Box>
    </Box>
  </Box>
);

const TotalsSection: React.FC<{
  products: CotizacionProduct[];
  totalInvestment: number;
  productSubtotal: number;
  discountPercent: number;
  subtotal: number;
  discount: number;
  total: number;
}> = ({ products, totalInvestment, productSubtotal, discountPercent, subtotal, discount, total }) => (
  <Box sx={{ borderTop: `1px solid ${brandColors.lightGray}`, pt: 1.5, mb: 2 }}>
    {products.length > 0 && totalInvestment > 0 && (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
          Subtotal Productos
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.textPrimary }}>
          {formatCurrency(productSubtotal)}
        </Typography>
      </Box>
    )}

    {products.length > 0 && totalInvestment > 0 && (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
          Inversión
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.textPrimary }}>
          {formatCurrency(totalInvestment)}
        </Typography>
      </Box>
    )}

    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
        Subtotal
      </Typography>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.textPrimary }}>
        {formatCurrency(subtotal)}
      </Typography>
    </Box>

    {discountPercent > 0 && (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
          Descuento ({discountPercent}%)
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#EF4444' }}>
          -{formatCurrency(discount)}
        </Typography>
      </Box>
    )}

    <Box
      sx={{
        bgcolor: 'rgba(27, 94, 32, 0.05)',
        borderRadius: 1,
        p: 2,
        mt: 1.5,
        borderTop: `3px solid ${brandColors.gold}`,
      }}
    >
      <Typography sx={{ fontSize: '0.7rem', color: brandColors.gray, mb: 0.5, letterSpacing: '0.05em' }}>
        PRECIO TOTAL
      </Typography>
      <Typography sx={{ fontSize: '1.75rem', fontWeight: 600, color: brandColors.emeraldDark, fontFamily: 'monospace' }}>
        {formatCurrency(total)}
      </Typography>
    </Box>
  </Box>
);

const NotesSection: React.FC<{ notes: string }> = ({ notes }) => (
  <Box sx={{ mb: 2.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1, borderLeft: `3px solid ${brandColors.emerald}` }}>
    <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.emeraldDark, mb: 0.5, letterSpacing: '0.05em' }}>
      NOTAS
    </Typography>
    <Typography sx={{ fontSize: '0.6rem', color: brandColors.textPrimary, lineHeight: 1.5 }}>
      {notes}
    </Typography>
  </Box>
);

const ValiditySection: React.FC<{ expiryStr: string; footerNote: string }> = ({ expiryStr, footerNote }) => (
  <Box sx={{ borderTop: `1px solid rgba(0,0,0,0.08)`, pt: 1.5, mb: 2.5 }}>
    <Typography sx={{ textAlign: 'center', fontSize: '0.6rem', color: brandColors.gray }}>
      Esta cotización es válida hasta: <strong style={{ color: brandColors.textPrimary }}>{expiryStr}</strong>
    </Typography>
    <Typography sx={{ textAlign: 'center', fontSize: '0.5rem', color: 'rgba(0,0,0,0.4)', mt: 0.5, lineHeight: 1.4 }}>
      {footerNote}
    </Typography>
  </Box>
);

const FooterSection: React.FC<{
  products: CotizacionProduct[];
  businessSettings: BusinessSettings;
}> = ({ products, businessSettings }) => (
  <Box
    sx={{
      borderTop: `1.618px solid rgba(212, 175, 55, 0.4)`,
      pt: 2.5,
      mt: 1.5,
      display: 'grid',
      gridTemplateColumns: '1fr 1.618fr 1fr',
      alignItems: 'center',
      gap: 2,
      position: 'relative',
      background: 'linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(249,248,245,1))',
      mx: -3,
      px: 3,
      pb: 1,
      mb: -3,
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '20%',
        right: '20%',
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${brandColors.emerald}, transparent)`,
      },
    }}
  >
    {/* QR Code */}
    <QRCodeBox products={products} />

    {/* Contact Info */}
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ fontSize: '0.6rem', color: brandColors.textPrimary, fontWeight: 500, mb: 0.5 }}>
        {businessSettings.contactPhone}
      </Typography>
      <Typography sx={{ fontSize: '0.55rem', color: 'rgba(26, 95, 74, 0.7)', letterSpacing: '0.03em' }}>
        {businessSettings.contactEmail}
      </Typography>
      <Typography sx={{ fontSize: '0.5rem', color: brandColors.gray, mt: 0.75, letterSpacing: '0.05em' }}>
        {businessSettings.nit}
      </Typography>
      {products.length > 0 && (
        <Typography sx={{ fontSize: '0.45rem', color: brandColors.emerald, mt: 0.5, fontWeight: 500 }}>
          Ver: {generateProductSlug(products[0].name)}
        </Typography>
      )}
    </Box>

    {/* Premium Seal */}
    <PremiumSeal />
  </Box>
);

const QRCodeBox: React.FC<{ products: CotizacionProduct[] }> = ({ products }) => (
  <Box
    sx={{
      position: 'relative',
      width: 64,
      height: 64,
      p: 0.75,
      border: `1px solid rgba(212, 175, 55, 0.3)`,
      borderRadius: 0.5,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(212,175,55,0.05) 100%)',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: -1,
        left: -1,
        width: 10,
        height: 10,
        borderTop: `1.618px solid ${brandColors.gold}`,
        borderLeft: `1.618px solid ${brandColors.gold}`,
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: -1,
        right: -1,
        width: 10,
        height: 10,
        borderBottom: `1.618px solid ${brandColors.gold}`,
        borderRight: `1.618px solid ${brandColors.gold}`,
      },
    }}
  >
    {products.length > 0 ? (
      <QRCodeSVG
        value={`https://www.tierramadre.co/products/${generateProductSlug(products[0].name)}`}
        size={52}
        level="L"
        fgColor="#1B5E20"
        bgColor="#FFFFFF"
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    ) : (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '1.5px',
        }}
      >
        {Array(25).fill(0).map((_, i) => (
          <Box
            key={i}
            sx={{
              bgcolor: (i + Math.floor(i / 5)) % 2 === 0 ? brandColors.lightGray : 'transparent',
              borderRadius: '1px',
            }}
          />
        ))}
      </Box>
    )}
  </Box>
);

const PremiumSeal: React.FC = () => (
  <Box
    sx={{
      position: 'relative',
      width: 64,
      height: 64,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      justifySelf: 'end',
    }}
  >
    {/* Outer Gold Ring */}
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: `conic-gradient(from 45deg, ${brandColors.gold} 0deg, rgba(212,175,55,0.3) 45deg, ${brandColors.gold} 90deg, rgba(212,175,55,0.3) 135deg, ${brandColors.gold} 180deg, rgba(212,175,55,0.3) 225deg, ${brandColors.gold} 270deg, rgba(212,175,55,0.3) 315deg, ${brandColors.gold} 360deg)`,
        boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
      }}
    />
    {/* White Ring */}
    <Box
      sx={{
        position: 'absolute',
        width: 54,
        height: 54,
        borderRadius: '50%',
        bgcolor: '#fff',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
      }}
    />
    {/* Inner Gold Ring */}
    <Box
      sx={{
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: `1.618px solid ${brandColors.gold}`,
        opacity: 0.6,
      }}
    />
    {/* Emerald Core */}
    <Box
      sx={{
        position: 'relative',
        width: 42,
        height: 42,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, #4fb885 0%, ${brandColors.emerald} 40%, ${brandColors.emeraldDark} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `
          inset -3px -3px 6px rgba(0,0,0,0.25),
          inset 3px 3px 6px rgba(255,255,255,0.15),
          0 2px 8px rgba(0,0,0,0.2)
        `,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '5px',
          left: '10px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.35)',
          filter: 'blur(2px)',
        },
      }}
    >
      <Shield size={20} color={brandColors.gold} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
    </Box>
  </Box>
);

export default QuotationPreview;
