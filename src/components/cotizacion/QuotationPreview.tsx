/**
 * QuotationPreview Component
 * Renders the printable quotation document with iOS-style minimalist design.
 * Updated to use actual Tierra Madre logo and match the app's UI system.
 */

import React, { forwardRef } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Package, DollarSign, Gem, ShoppingBag, ExternalLink, Calendar, User, FileText, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  documentShadows,
  primitiveColors,
} from '../../design-system/tokens';
import { accentColors } from '../../design-system';
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

// iOS-style design constants for the quotation
const quotationStyles = {
  // Soft shadows for iOS feel
  cardShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  sectionShadow: '0 2px 8px rgba(0,0,0,0.06)',
  // Subtle borders
  borderLight: 'rgba(0,0,0,0.06)',
  borderMedium: 'rgba(0,0,0,0.1)',
  // Background tints
  surfaceTint: 'rgba(0,174,122,0.02)',
  accentTint: 'rgba(0,174,122,0.06)',
};

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
          bgcolor: '#FAFAFA',
          border: `1px solid ${quotationStyles.borderLight}`,
          boxShadow: documentShadows.paper,
          minHeight: 700,
        }}
      >
        <Box
          ref={ref}
          className="quotation-preview"
          sx={{
            bgcolor: '#FFFFFF',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* iOS-style Clean Container */}
          <Box
            sx={{
              position: 'relative',
              borderRadius: 2,
              border: `1px solid ${quotationStyles.borderLight}`,
              bgcolor: '#FFFFFF',
              boxShadow: quotationStyles.cardShadow,
            }}
          >
            {/* Subtle emerald accent line at top */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${brandColors.emerald}, ${primitiveColors.emerald[400]})`,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              }}
            />

            {/* Clean Paper Content */}
            <Box
              sx={{
                p: 3,
                pt: 4,
                minHeight: 650,
                bgcolor: '#FFFFFF',
              }}
            >
              {/* Logo & Header Section */}
              <LogoSection />

              {/* Quotation Info Card */}
              <QuotationInfoCard
                quotationNumber={quotationNumber}
                clientName={clientName}
                asesorName={asesorName}
                date={date}
              />

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
      </Paper>
    );
  }
);

QuotationPreview.displayName = 'QuotationPreview';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * LogoSection - Clean iOS-style header with actual logo
 */
const LogoSection: React.FC = () => (
  <Box sx={{ textAlign: 'center', mb: 3 }}>
    {/* Logo */}
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 1,
      }}
    >
      <img
        src="/logo-horizontal-dark.png"
        alt="Tierra Madre"
        style={{
          height: 48,
          width: 'auto',
          objectFit: 'contain',
        }}
        onError={(e) => {
          // Fallback to text if logo fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement('span');
            fallback.textContent = 'TIERRA MADRE';
            fallback.style.cssText = 'font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em; color: #111827;';
            parent.appendChild(fallback);
          }
        }}
      />
    </Box>

    {/* Tagline */}
    <Typography sx={{
      fontSize: '0.6rem',
      color: brandColors.emerald,
      letterSpacing: '0.2em',
      fontWeight: 500,
      textTransform: 'uppercase',
    }}>
      Colombian Emeralds
    </Typography>

    {/* Simple divider */}
    <Box sx={{
      mt: 2,
      mx: 'auto',
      width: 40,
      height: 2,
      bgcolor: brandColors.emerald,
      borderRadius: 1,
      opacity: 0.6,
    }} />
  </Box>
);

/**
 * QuotationInfoCard - iOS-style info card with quotation details
 */
const QuotationInfoCard: React.FC<{
  quotationNumber: string;
  clientName: string;
  asesorName: string;
  date: string;
}> = ({ quotationNumber, clientName, asesorName, date }) => (
  <Box
    sx={{
      bgcolor: quotationStyles.surfaceTint,
      borderRadius: 2,
      p: 2,
      mb: 3,
      border: `1px solid ${quotationStyles.borderLight}`,
    }}
  >
    {/* Title */}
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      mb: 2,
      pb: 1.5,
      borderBottom: `1px solid ${quotationStyles.borderLight}`,
    }}>
      <FileText size={14} color={brandColors.emerald} />
      <Typography sx={{
        fontSize: '0.7rem',
        fontWeight: 600,
        color: brandColors.emeraldDark,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        Cotización de Venta
      </Typography>
    </Box>

    {/* Info Grid */}
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
      {/* Quotation Number */}
      <Box>
        <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
          No. Cotización
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: brandColors.textPrimary, fontFamily: 'monospace' }}>
          {quotationNumber}
        </Typography>
      </Box>

      {/* Date */}
      <Box>
        <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
          Fecha de Emisión
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Calendar size={11} color={brandColors.gray} />
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: brandColors.textPrimary }}>
            {new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
          </Typography>
        </Box>
      </Box>

      {/* Client */}
      {clientName && (
        <Box>
          <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
            Cliente
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <User size={11} color={brandColors.emerald} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.textPrimary }}>
              {clientName}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Asesor */}
      {asesorName && (
        <Box>
          <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
            Asesor
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: brandColors.emerald }}>
            {asesorName}
          </Typography>
        </Box>
      )}
    </Box>
  </Box>
);

/**
 * ProductsSection - iOS-style product list
 */
/**
 * ProductImage - Reusable product image component with proper loading states
 */
const ProductImage: React.FC<{
  src?: string;
  isJewelry: boolean;
  size?: number;
}> = ({ src, isJewelry, size = 56 }) => {
  const [imgError, setImgError] = React.useState(false);
  const [imgLoaded, setImgLoaded] = React.useState(false);

  // Reset error state when src changes
  React.useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [src]);

  const hasValidSrc = src && !imgError;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 2,
        bgcolor: isJewelry ? 'rgba(212,175,55,0.08)' : quotationStyles.accentTint,
        border: `1px solid ${quotationStyles.borderLight}`,
        flexShrink: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {hasValidSrc && (
        <Box
          component="img"
          src={src}
          alt="Product"
          onError={() => setImgError(true)}
          onLoad={() => setImgLoaded(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      {/* Fallback icon when no image or error */}
      {(!hasValidSrc || !imgLoaded) && (
        <Box
          sx={{
            position: hasValidSrc ? 'absolute' : 'static',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isJewelry ? (
            <ShoppingBag size={size * 0.4} color={brandColors.gold} />
          ) : (
            <Gem size={size * 0.4} color={brandColors.emerald} />
          )}
        </Box>
      )}
    </Box>
  );
};

const ProductsSection: React.FC<{ products: CotizacionProduct[] }> = ({ products }) => {
  if (products.length === 0) {
    return (
      <Box sx={{
        textAlign: 'center',
        py: 4,
        bgcolor: quotationStyles.surfaceTint,
        borderRadius: 2,
        border: `1px dashed ${quotationStyles.borderMedium}`,
        mb: 3,
      }}>
        <Package size={28} color={brandColors.gray} style={{ marginBottom: 8, opacity: 0.5 }} />
        <Typography sx={{ fontSize: '0.7rem', color: brandColors.gray }}>
          Agrega productos del inventario
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* Section Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mb: 1.5,
        }}
      >
        <Box sx={{
          width: 24,
          height: 24,
          borderRadius: 1,
          bgcolor: quotationStyles.accentTint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Package size={13} color={brandColors.emerald} />
        </Box>
        <Typography sx={{
          fontSize: '0.65rem',
          fontWeight: 600,
          color: brandColors.textPrimary,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Productos
        </Typography>
        <Box sx={{
          ml: 'auto',
          px: 1,
          py: 0.25,
          bgcolor: quotationStyles.accentTint,
          borderRadius: 1,
        }}>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.emerald }}>
            {products.length} {products.length === 1 ? 'item' : 'items'}
          </Typography>
        </Box>
      </Box>

      {/* Product List */}
      <Box sx={{
        border: `1px solid ${quotationStyles.borderLight}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        {products.map((product, index) => {
          const productUrl = `https://www.tierramadre.co/products/${generateProductSlug(product.name)}`;
          return (
            <Box
              key={product.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1.25,
                px: 1.5,
                bgcolor: index % 2 === 0 ? '#FAFAFA' : '#FFFFFF',
                borderBottom: index < products.length - 1 ? `1px solid ${quotationStyles.borderLight}` : 'none',
              }}
            >
              {/* Product Image - Now larger with better loading */}
              <ProductImage
                src={product.imagen}
                isJewelry={product.isJewelry}
                size={56}
              />

              {/* Product Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: brandColors.textPrimary,
                  lineHeight: 1.3,
                }}>
                  {product.name}
                </Typography>
                <Typography sx={{
                  fontSize: '0.55rem',
                  color: brandColors.gray,
                  mt: 0.25,
                }}>
                  Ref. #{product.itemNumber} • {getPesoDisplay(product)} • {product.color}
                </Typography>
                {/* Product Link */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <ExternalLink size={9} color={brandColors.emerald} />
                  <Typography
                    component="a"
                    href={productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      fontSize: '0.45rem',
                      color: brandColors.emerald,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '180px',
                    }}
                  >
                    tierramadre.co/products/{generateProductSlug(product.name)}
                  </Typography>
                </Box>
              </Box>

              {/* Price */}
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography sx={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: brandColors.emerald,
                  fontFamily: 'monospace',
                }}>
                  {formatCurrency(product.precioCOP)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

/**
 * InvestmentSection - iOS-style investment breakdown
 */
const InvestmentSection: React.FC<{
  investments: CotizacionInvestment[];
  customCosts: CustomCost[];
  totalInvestment: number;
}> = ({ investments, customCosts, totalInvestment }) => (
  <Box sx={{ mb: 3 }}>
    {/* Section Header */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
      <Box sx={{
        width: 24,
        height: 24,
        borderRadius: 1,
        bgcolor: 'rgba(212,175,55,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <DollarSign size={13} color={brandColors.gold} />
      </Box>
      <Typography sx={{
        fontSize: '0.65rem',
        fontWeight: 600,
        color: brandColors.textPrimary,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        Inversión Adicional
      </Typography>
    </Box>

    {/* Investment List */}
    <Box sx={{
      bgcolor: '#FAFAFA',
      borderRadius: 2,
      border: `1px solid ${quotationStyles.borderLight}`,
      overflow: 'hidden',
    }}>
      {investments.filter(inv => inv.value > 0).map((inv, index, filtered) => (
        <Box
          key={inv.id}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1,
            px: 1.5,
            borderBottom: index < filtered.length - 1 || customCosts.length > 0 ? `1px solid ${quotationStyles.borderLight}` : 'none',
          }}
        >
          <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray }}>
            {inv.label}
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: brandColors.textPrimary, fontFamily: 'monospace' }}>
            {formatCurrency(inv.value)}
          </Typography>
        </Box>
      ))}
      {customCosts.map((cost, index) => (
        <Box
          key={cost.id}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1,
            px: 1.5,
            borderBottom: index < customCosts.length - 1 ? `1px solid ${quotationStyles.borderLight}` : 'none',
          }}
        >
          <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray }}>
            {cost.label}
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: brandColors.textPrimary, fontFamily: 'monospace' }}>
            {formatCurrency(cost.value)}
          </Typography>
        </Box>
      ))}

      {/* Total */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1,
          px: 1.5,
          bgcolor: 'rgba(212,175,55,0.06)',
          borderTop: `1px solid ${quotationStyles.borderLight}`,
        }}
      >
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.textPrimary }}>
          Total Inversión
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: brandColors.gold, fontFamily: 'monospace' }}>
          {formatCurrency(totalInvestment)}
        </Typography>
      </Box>
    </Box>
  </Box>
);

/**
 * TotalsSection - iOS-style totals card
 */
const TotalsSection: React.FC<{
  products: CotizacionProduct[];
  totalInvestment: number;
  productSubtotal: number;
  discountPercent: number;
  subtotal: number;
  discount: number;
  total: number;
}> = ({ products, totalInvestment, productSubtotal, discountPercent, subtotal, discount, total }) => (
  <Box sx={{ mb: 3 }}>
    {/* Subtotals Card */}
    <Box sx={{
      bgcolor: '#FAFAFA',
      borderRadius: 2,
      border: `1px solid ${quotationStyles.borderLight}`,
      overflow: 'hidden',
      mb: 2,
    }}>
      {products.length > 0 && totalInvestment > 0 && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          py: 1,
          px: 1.5,
          borderBottom: `1px solid ${quotationStyles.borderLight}`,
        }}>
          <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray }}>
            Subtotal Productos
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: brandColors.textPrimary, fontFamily: 'monospace' }}>
            {formatCurrency(productSubtotal)}
          </Typography>
        </Box>
      )}

      {products.length > 0 && totalInvestment > 0 && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          py: 1,
          px: 1.5,
          borderBottom: `1px solid ${quotationStyles.borderLight}`,
        }}>
          <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray }}>
            Inversión
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: brandColors.textPrimary, fontFamily: 'monospace' }}>
            {formatCurrency(totalInvestment)}
          </Typography>
        </Box>
      )}

      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        py: 1,
        px: 1.5,
        borderBottom: discountPercent > 0 ? `1px solid ${quotationStyles.borderLight}` : 'none',
      }}>
        <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray }}>
          Subtotal
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: brandColors.textPrimary, fontFamily: 'monospace' }}>
          {formatCurrency(subtotal)}
        </Typography>
      </Box>

      {discountPercent > 0 && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          py: 1,
          px: 1.5,
          bgcolor: 'rgba(239,68,68,0.04)',
        }}>
          <Typography sx={{ fontSize: '0.6rem', color: accentColors.error.light }}>
            Descuento ({discountPercent}%)
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: accentColors.error.light, fontFamily: 'monospace' }}>
            -{formatCurrency(discount)}
          </Typography>
        </Box>
      )}
    </Box>

    {/* Total Card */}
    <Box
      sx={{
        background: `linear-gradient(135deg, ${brandColors.emerald} 0%, ${primitiveColors.emerald[600]} 100%)`,
        borderRadius: 2,
        p: 2,
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,174,122,0.25)',
      }}
    >
      <Typography sx={{
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        mb: 0.5,
      }}>
        Precio Total
      </Typography>
      <Typography sx={{
        fontSize: '1.75rem',
        fontWeight: 700,
        color: '#FFFFFF',
        fontFamily: 'monospace',
        letterSpacing: '-0.02em',
      }}>
        {formatCurrency(total)}
      </Typography>
    </Box>
  </Box>
);

/**
 * NotesSection - iOS-style notes card
 */
const NotesSection: React.FC<{ notes: string }> = ({ notes }) => (
  <Box sx={{
    mb: 3,
    p: 1.5,
    bgcolor: quotationStyles.surfaceTint,
    borderRadius: 2,
    border: `1px solid ${quotationStyles.borderLight}`,
  }}>
    <Typography sx={{
      fontSize: '0.55rem',
      fontWeight: 600,
      color: brandColors.emerald,
      mb: 0.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    }}>
      Notas
    </Typography>
    <Typography sx={{ fontSize: '0.6rem', color: brandColors.textPrimary, lineHeight: 1.6 }}>
      {notes}
    </Typography>
  </Box>
);

/**
 * ValiditySection - iOS-style validity notice
 */
const ValiditySection: React.FC<{ expiryStr: string; footerNote: string }> = ({ expiryStr, footerNote }) => (
  <Box sx={{
    textAlign: 'center',
    mb: 3,
    py: 1.5,
    px: 2,
    bgcolor: '#FAFAFA',
    borderRadius: 2,
    border: `1px solid ${quotationStyles.borderLight}`,
  }}>
    <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray }}>
      Esta cotización es válida hasta
    </Typography>
    <Typography sx={{
      fontSize: '0.7rem',
      fontWeight: 600,
      color: brandColors.textPrimary,
      mt: 0.25,
    }}>
      {expiryStr}
    </Typography>
    <Typography sx={{
      fontSize: '0.45rem',
      color: brandColors.gray,
      mt: 1,
      lineHeight: 1.5,
      maxWidth: 320,
      mx: 'auto',
    }}>
      {footerNote}
    </Typography>
  </Box>
);

/**
 * FooterSection - iOS-style clean footer
 */
const FooterSection: React.FC<{
  products: CotizacionProduct[];
  businessSettings: BusinessSettings;
}> = ({ products, businessSettings }) => (
  <Box
    sx={{
      borderTop: `1px solid ${quotationStyles.borderLight}`,
      pt: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
    }}
  >
    {/* QR Code */}
    <QRCodeBox products={products} />

    {/* Contact Info - Center */}
    <Box sx={{ textAlign: 'center', flex: 1 }}>
      <Typography sx={{ fontSize: '0.6rem', color: brandColors.textPrimary, fontWeight: 500 }}>
        {businessSettings.contactPhone}
      </Typography>
      <Typography sx={{ fontSize: '0.55rem', color: brandColors.emerald, letterSpacing: '0.02em' }}>
        {businessSettings.contactEmail}
      </Typography>
      <Typography sx={{ fontSize: '0.45rem', color: brandColors.gray, mt: 0.5 }}>
        {businessSettings.nit}
      </Typography>
    </Box>

    {/* Authenticity Seal */}
    <AuthenticityBadge />
  </Box>
);

/**
 * QRCodeBox - iOS-style QR code container
 * Links to Treasure Browser with all quoted products pre-filtered
 */
const QRCodeBox: React.FC<{ products: CotizacionProduct[] }> = ({ products }) => {
  // Generate URL with item numbers for filtering in Treasure Browser
  const qrUrl = products.length > 0
    ? `https://tierra-madre-studio.vercel.app/tesoro?items=${products.map(p => p.itemNumber).join(',')}&status=all`
    : 'https://tierra-madre-studio.vercel.app/tesoro';

  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        p: 0.5,
        bgcolor: '#FFFFFF',
        border: `1px solid ${quotationStyles.borderLight}`,
        borderRadius: 1.5,
        flexShrink: 0,
      }}
    >
      {products.length > 0 ? (
        <QRCodeSVG
          value={qrUrl}
          size={48}
          level="L"
          fgColor={primitiveColors.emerald[700]}
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
          gap: '1px',
        }}
      >
        {Array(25).fill(0).map((_, i) => (
          <Box
            key={i}
            sx={{
              bgcolor: (i + Math.floor(i / 5)) % 2 === 0 ? '#E5E7EB' : 'transparent',
              borderRadius: '0.5px',
            }}
          />
        ))}
      </Box>
      )}
    </Box>
  );
};

/**
 * AuthenticityBadge - iOS-style authenticity seal with logo
 */
const AuthenticityBadge: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0.5,
      flexShrink: 0,
    }}
  >
    {/* Logo Symbol */}
    <img
      src="/logosymbol-dark.png"
      alt="Tierra Madre"
      style={{
        height: 20,
        width: 'auto',
        opacity: 0.8,
      }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
    {/* Authenticity Circle */}
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        bgcolor: quotationStyles.accentTint,
        border: `2px solid ${brandColors.emerald}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Shield size={18} color={brandColors.emerald} />
      <Typography sx={{
        fontSize: '0.4rem',
        fontWeight: 600,
        color: brandColors.emerald,
        mt: 0.25,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Auténtico
      </Typography>
    </Box>
  </Box>
);

export default QuotationPreview;
