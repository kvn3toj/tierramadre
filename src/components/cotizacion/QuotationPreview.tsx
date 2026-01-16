/**
 * QuotationPreview Component
 * Renders the printable quotation document with iOS-style minimalist design.
 * Updated to use actual Tierra Madre logo and match the app's UI system.
 */

import React, { forwardRef } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Package, DollarSign, Gem, ShoppingBag, ExternalLink, Calendar, User, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  documentShadows,
  primitiveColors,
} from '../../design-system/tokens';
import { accentColors } from '../../design-system';
import { brandColors, quotationStyles, quotationTypography } from './constants';
import { getProductDisplayUrl, getQrCodeUrl } from './utils';
import {
  CotizacionProduct,
  CotizacionInvestment,
  CustomCost,
  BusinessSettings,
  formatCotizacionCurrency,
  getPesoDisplay,
} from '../../hooks/useCotizacion';

export interface QuotationPreviewProps {
  quotationNumber: string;
  clientName: string;
  asesorName: string;
  expiryStr: string;
  notes: string;
  products: CotizacionProduct[];
  investments: CotizacionInvestment[];
  customCosts: CustomCost[];
  totalInvestment: number;
  productSubtotal: number;
  discountPercent: number;
  subtotal: number;
  discount: number;
  total: number;
  businessSettings: BusinessSettings;
}

const formatCurrency = formatCotizacionCurrency;

// =============================================================================
// REUSABLE SUB-COMPONENTS
// =============================================================================

/**
 * InfoField - Reusable label + value display
 */
interface InfoFieldProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  valueStyle?: object;
}

const InfoField: React.FC<InfoFieldProps> = ({ label, value, icon, valueStyle }) => (
  <Box>
    <Typography sx={quotationTypography.label}>{label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {icon}
      <Typography sx={{ ...quotationTypography.value, ...valueStyle }}>{value}</Typography>
    </Box>
  </Box>
);

/**
 * SectionHeader - Reusable section header with icon and optional count
 */
interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  iconBgColor?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, count, iconBgColor = quotationStyles.accentTint }) => (
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
          {count} {count === 1 ? 'item' : 'items'}
        </Typography>
      </Box>
    )}
  </Box>
);

/**
 * LineItem - Reusable row for lists (investments, subtotals)
 */
interface LineItemProps {
  label: string;
  value: string;
  isLast?: boolean;
  labelColor?: string;
  valueColor?: string;
  bgColor?: string;
}

const LineItem: React.FC<LineItemProps> = ({
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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(
  (props, ref) => {
    const {
      quotationNumber,
      clientName,
      asesorName,
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
    } = props;

    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          bgcolor: quotationStyles.surfaceMuted,
          border: `1px solid ${quotationStyles.borderLight}`,
          boxShadow: documentShadows.paper,
          minHeight: 700,
        }}
      >
        <Box
          ref={ref}
          className="quotation-preview"
          sx={{
            bgcolor: quotationStyles.surface,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              borderRadius: 2,
              border: `1px solid ${quotationStyles.borderLight}`,
              bgcolor: quotationStyles.surface,
              boxShadow: quotationStyles.cardShadow,
            }}
          >
            {/* Emerald accent line */}
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

            {/* Content */}
            <Box sx={{ p: 3, pt: 4, minHeight: 650, bgcolor: quotationStyles.surface }}>
              <LogoSection />
              <QuotationInfoCard
                quotationNumber={quotationNumber}
                clientName={clientName}
                asesorName={asesorName}
              />
              <ProductsSection products={products} />
              {totalInvestment > 0 && (
                <InvestmentSection
                  investments={investments}
                  customCosts={customCosts}
                  totalInvestment={totalInvestment}
                />
              )}
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
              {notes && <NotesSection notes={notes} />}
              <ValiditySection expiryStr={expiryStr} footerNote={businessSettings.footerNote} />
              <CertificationLogosSection />
              <FooterSection businessSettings={businessSettings} />
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  }
);

QuotationPreview.displayName = 'QuotationPreview';

// =============================================================================
// SECTION COMPONENTS
// =============================================================================

const LogoSection: React.FC = () => (
  <Box sx={{ textAlign: 'center', mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src="/logo-quotation.png"
        alt="Tierra Madre"
        style={{ height: 72, width: 'auto', objectFit: 'contain' }}
        onError={(e) => {
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
    <Typography sx={{
      fontSize: '0.55rem',
      color: brandColors.textPrimary,
      letterSpacing: '0.15em',
      fontWeight: 500,
      textTransform: 'uppercase',
      mt: 0.5,
    }}>
      Colombian Emeralds
    </Typography>
    <Box sx={{
      mt: 1.5,
      mx: 'auto',
      width: 40,
      height: 2,
      bgcolor: brandColors.emerald,
      borderRadius: 1,
      opacity: 0.6,
    }} />
  </Box>
);

interface QuotationInfoCardProps {
  quotationNumber: string;
  clientName: string;
  asesorName: string;
}

const QuotationInfoCard: React.FC<QuotationInfoCardProps> = ({ quotationNumber, clientName, asesorName }) => {
  // Always use today's date (date of export/preview)
  const formattedDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Box
      sx={{
        bgcolor: quotationStyles.surfaceTint,
        borderRadius: 2,
        p: 1.5,
        mb: 2.5,
        border: `1px solid ${quotationStyles.borderLight}`,
      }}
    >
      {/* Title with client/asesor on sides */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        mb: 1.5,
        pb: 1,
        borderBottom: `1px solid ${quotationStyles.borderLight}`,
      }}>
        {/* Client - Left side */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {clientName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <User size={10} color={brandColors.emerald} />
              <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {clientName}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Title - Center */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          <FileText size={12} color={brandColors.emerald} />
          <Typography sx={{
            fontSize: '0.6rem',
            fontWeight: 600,
            color: brandColors.emeraldDark,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Cotización de Venta
          </Typography>
        </Box>

        {/* Asesor - Right side */}
        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          {asesorName && (
            <Typography sx={{ fontSize: '0.55rem', color: brandColors.emerald, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {asesorName}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Info Row - Compact */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <InfoField
          label="No. Cotización"
          value={quotationNumber}
          valueStyle={{ fontSize: '0.7rem', fontWeight: 700, ...quotationTypography.monospace }}
        />
        <InfoField
          label="Fecha de Emisión"
          value={formattedDate}
          icon={<Calendar size={10} color={brandColors.gray} />}
          valueStyle={{ fontWeight: 500, fontSize: '0.65rem' }}
        />
      </Box>
    </Box>
  );
};

// =============================================================================
// PRODUCT COMPONENTS
// =============================================================================

interface ProductImageProps {
  src?: string;
  isJewelry: boolean;
  size?: number;
}

const ProductImage: React.FC<ProductImageProps> = ({ src, isJewelry, size = 56 }) => {
  const [imgError, setImgError] = React.useState(false);
  const [imgLoaded, setImgLoaded] = React.useState(false);

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

interface ProductRowProps {
  product: CotizacionProduct;
  isEven: boolean;
  isLast: boolean;
}

const ProductRow: React.FC<ProductRowProps> = ({ product, isEven, isLast }) => {
  const displayUrl = getProductDisplayUrl(product);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.25,
        px: 1.5,
        bgcolor: isEven ? quotationStyles.surfaceMuted : quotationStyles.surface,
        borderBottom: isLast ? 'none' : `1px solid ${quotationStyles.borderLight}`,
      }}
    >
      <ProductImage
        src={product.gifUrl || product.imagen}
        isJewelry={product.isJewelry}
        size={56}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.textPrimary, lineHeight: 1.3 }}>
          {product.name}
        </Typography>
        <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray, mt: 0.25 }}>
          Ref. #{product.itemNumber} • {getPesoDisplay(product)} • {product.color}
        </Typography>
        <Box
          component="a"
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.5,
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <ExternalLink size={9} color={brandColors.emerald} />
          <Typography sx={{
            fontSize: '0.45rem',
            color: brandColors.emerald,
            fontWeight: 500,
          }}>
            Expandir visión
          </Typography>
        </Box>
      </Box>
      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
        <Typography sx={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: brandColors.emerald,
          ...quotationTypography.monospace,
        }}>
          {formatCurrency(product.precioCOP)}
        </Typography>
      </Box>
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
      <SectionHeader
        icon={<Package size={13} color={brandColors.emerald} />}
        title="Productos"
        count={products.length}
      />
      <Box sx={{
        border: `1px solid ${quotationStyles.borderLight}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        {products.map((product, index) => (
          <ProductRow
            key={product.id}
            product={product}
            isEven={index % 2 === 0}
            isLast={index === products.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
};

// =============================================================================
// INVESTMENT & TOTALS
// =============================================================================

interface InvestmentSectionProps {
  investments: CotizacionInvestment[];
  customCosts: CustomCost[];
  totalInvestment: number;
}

const InvestmentSection: React.FC<InvestmentSectionProps> = ({ investments, customCosts, totalInvestment }) => {
  const activeInvestments = investments.filter(inv => inv.value > 0);
  const allItems = [
    ...activeInvestments.map(inv => ({ id: inv.id, label: inv.label, value: inv.value })),
    ...customCosts.map(cost => ({ id: cost.id, label: cost.label, value: cost.value })),
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <SectionHeader
        icon={<DollarSign size={13} color={brandColors.gold} />}
        title="Inversión Adicional"
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
            Total Inversión
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: brandColors.gold, ...quotationTypography.monospace }}>
            {formatCurrency(totalInvestment)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

interface TotalsSectionProps {
  products: CotizacionProduct[];
  totalInvestment: number;
  productSubtotal: number;
  discountPercent: number;
  subtotal: number;
  discount: number;
  total: number;
}

const TotalsSection: React.FC<TotalsSectionProps> = ({
  products,
  totalInvestment,
  productSubtotal,
  discountPercent,
  subtotal,
  discount,
  total,
}) => {
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

// =============================================================================
// NOTES & VALIDITY
// =============================================================================

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

interface ValiditySectionProps {
  expiryStr: string;
  footerNote: string;
}

const ValiditySection: React.FC<ValiditySectionProps> = ({ expiryStr, footerNote }) => (
  <Box sx={{
    textAlign: 'center',
    mb: 1.5,
    py: 1,
    px: 1.5,
    bgcolor: quotationStyles.surfaceMuted,
    borderRadius: 2,
    border: `1px solid ${quotationStyles.borderLight}`,
  }}>
    <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray }}>
      Esta cotización es válida hasta
    </Typography>
    <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: brandColors.textPrimary, mt: 0.25 }}>
      {expiryStr}
    </Typography>
    <Typography sx={{
      fontSize: '0.4rem',
      color: brandColors.gray,
      mt: 0.75,
      lineHeight: 1.4,
      maxWidth: 300,
      mx: 'auto',
    }}>
      {footerNote}
    </Typography>
  </Box>
);

// =============================================================================
// CERTIFICATION LOGOS
// =============================================================================

const CertificationLogosSection: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      mb: 1.5,
      py: 1,
    }}
  >
    <Box
      component="img"
      src="/certification-logo-1.png"
      alt="Certification 1"
      sx={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        objectFit: 'cover',
      }}
    />
    <Box
      component="img"
      src="/certification-logo-2.png"
      alt="Certification 2"
      sx={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        objectFit: 'cover',
      }}
    />
    <Box
      component="img"
      src="/certification-logo-3.png"
      alt="Certification 3"
      sx={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        objectFit: 'cover',
      }}
    />
  </Box>
);

// =============================================================================
// FOOTER
// =============================================================================

interface FooterSectionProps {
  businessSettings: BusinessSettings;
}

const FooterSection: React.FC<FooterSectionProps> = ({ businessSettings }) => (
  <Box
    sx={{
      borderTop: `1px solid ${quotationStyles.borderLight}`,
      pt: 1.5,
      textAlign: 'center',
    }}
  >
    <Typography sx={{ fontSize: '0.55rem', color: brandColors.textPrimary, fontWeight: 500 }}>
      {businessSettings.contactPhone}
    </Typography>
    <Typography sx={{ fontSize: '0.45rem', color: brandColors.gray, mt: 0.25, letterSpacing: '0.02em' }}>
      {businessSettings.appUrl}
    </Typography>
    <Typography sx={{ fontSize: '0.5rem', color: brandColors.emerald, mt: 0.25, letterSpacing: '0.02em' }}>
      {businessSettings.contactEmail}
    </Typography>
  </Box>
);

export default QuotationPreview;
