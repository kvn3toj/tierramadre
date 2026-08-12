/**
 * QuotationCertificate Component
 * The actual quotation document preview for PDF export.
 */

import React, { forwardRef } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import {
  Gem,
  Shield,
  Sparkles,
  TrendingUp,
  CircleDollarSign,
  Award,
  Gift,
  FileCheck,
  DollarSign,
  Percent,
  Calculator,
  Layers,
  ShoppingBag,
  Image,
} from 'lucide-react';
import { documentShadows } from '../../../../design-system/tokens';
import {
  brandColors,
  PRODUCTION_URL,
} from '../../../../components/cotizacion/constants';
import { useCurrencyFormat } from '../../../../contexts/CurrencyContext';

// Investment item interface
export interface InvestmentItem {
  id: string;
  label: string;
  value: number;
  icon?: string;
}

// Selected product from multi-select
export interface SelectedProduct {
  id: string;
  name: string;
  price: number;
  source: 'gallery' | 'inventory';
}

// Quotation data interface
export interface QuotationData {
  quotationNumber: string;
  productName: string;
  caratWeight: number;
  investments: InvestmentItem[];
  customItems: { label: string; value: number }[];
  selectedProducts?: SelectedProduct[];
  multiSelectMode?: boolean;
  totalProductsValue?: number;
  totalInvestment: number;
  priceFactor: number;
  salePrice: number;
  margin: number;
  roi: number;
  profit: number;
  pricePerCarat: number;
  date: string;
  validDays: number;
  clientName: string;
  notes: string;
  createdAt?: string;
}

export interface QuotationCertificateProps {
  quotationData: QuotationData;
}

export const QuotationCertificate = forwardRef<
  HTMLDivElement,
  QuotationCertificateProps
>(({ quotationData }, ref) => {
  const { formatFullCurrency: formatCurrency } = useCurrencyFormat();
  // Calculate expiry date
  const expiryDate = new Date(quotationData.date);
  expiryDate.setDate(expiryDate.getDate() + quotationData.validDays);
  const expiryStr = expiryDate.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get active investments (non-zero)
  const activeInvestments = quotationData.investments.filter(
    (inv) => inv.value > 0,
  );

  // Icon mapping
  const getIcon = (id: string) => {
    const icons: Record<string, React.ReactNode> = {
      emerald: <Gem size={14} color={brandColors.emerald} />,
      gold: <Award size={14} color={brandColors.gold} />,
      silver: <CircleDollarSign size={14} color={brandColors.gray} />,
      setting: <Sparkles size={14} color={brandColors.emerald} />,
      certification: <FileCheck size={14} color={brandColors.emeraldDark} />,
      packaging: <Gift size={14} color={brandColors.gold} />,
    };
    return icons[id] || <DollarSign size={14} color={brandColors.gray} />;
  };

  return (
    <Box
      ref={ref}
      sx={{
        bgcolor: brandColors.background,
        p: 1.5,
        borderRadius: 2,
      }}
    >
      {/* Gold outer border with glow */}
      <Box
        sx={{
          border: `2px solid ${brandColors.gold}`,
          borderRadius: 1,
          p: 0.5,
          boxShadow: `0 0 0 1px ${brandColors.goldLight}, ${documentShadows.paper}`,
        }}
      >
        {/* Emerald inner border */}
        <Box
          sx={{
            border: `1px solid ${brandColors.emerald}`,
            borderRadius: 0.5,
          }}
        >
          {/* White quotation area with paper effect */}
          <Box
            sx={{
              bgcolor: brandColors.cream,
              p: 3,
              minHeight: 650,
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.02)',
            }}
          >
            {/* Quotation Number (top right) */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 1,
              }}
            >
              <Box>
                {quotationData.clientName && (
                  <Typography
                    sx={{ fontSize: '0.65rem', color: brandColors.gray }}
                  >
                    Cliente: <strong>{quotationData.clientName}</strong>
                  </Typography>
                )}
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    color: brandColors.gray,
                    letterSpacing: 1,
                  }}
                >
                  COTIZACIÓN No.
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: brandColors.textPrimary,
                  }}
                >
                  {quotationData.quotationNumber}
                </Typography>
              </Box>
            </Box>

            {/* Logo & Brand */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              {/* Full lockup — carries the TIERRA MÄDRE wordmark and the
                    "ESMERALDAS CON ADN DE PAZ" slogan, so the wordmark is no
                    longer typed out below it. Height ≥80px keeps the slogan
                    legible; width follows the 1.863:1 ratio. */}
              <Box
                sx={{
                  width: 168,
                  height: 90,
                  mx: 'auto',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src="/logo-brand.png"
                  alt="Tierra Mädre"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </Box>

              <Typography
                sx={{
                  fontSize: '0.65rem',
                  color: brandColors.gray,
                  letterSpacing: 3,
                }}
              >
                COLOMBIAN EMERALDS
              </Typography>

              {/* Decorative lines */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1,
                  mt: 1,
                }}
              >
                <Box sx={{ width: 60, height: 1, bgcolor: brandColors.gold }} />
                <Gem size={12} color={brandColors.emerald} />
                <Box sx={{ width: 60, height: 1, bgcolor: brandColors.gold }} />
              </Box>
            </Box>

            {/* Title Bar */}
            <Box
              sx={{
                bgcolor: brandColors.emeraldDark,
                py: 1,
                px: 2,
                borderRadius: 0.5,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: 2,
                }}
              >
                COTIZACIÓN DE VENTA
              </Typography>
            </Box>

            {/* Date */}
            <Typography
              sx={{
                textAlign: 'center',
                fontSize: '0.65rem',
                color: brandColors.gray,
                mb: 2,
              }}
            >
              Fecha de emisión:{' '}
              {new Date(quotationData.date).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>

            {/* Product Info Section */}
            <Box
              sx={{
                borderTop: `1px solid ${brandColors.lightGray}`,
                pt: 1.5,
                mb: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 1.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: brandColors.emeraldDark,
                  }}
                >
                  PRODUCTO
                </Typography>
                <Chip
                  label="ORIGEN COLOMBIANO"
                  size="small"
                  sx={{
                    bgcolor: brandColors.emerald,
                    color: '#fff',
                    fontSize: '0.5rem',
                    height: 20,
                    fontWeight: 700,
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 50,
                    height: 60,
                    bgcolor: brandColors.emerald,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    clipPath:
                      'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  }}
                >
                  <Sparkles size={24} color="#fff" />
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: brandColors.textPrimary,
                    }}
                  >
                    {quotationData.productName.toUpperCase()}
                  </Typography>
                  {quotationData.caratWeight > 0 && (
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: brandColors.emerald,
                        fontWeight: 600,
                      }}
                    >
                      {quotationData.caratWeight} quilates
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Selected Products (Multi-select Collection) */}
            {quotationData.selectedProducts &&
              quotationData.selectedProducts.length > 0 && (
                <Box
                  sx={{
                    borderTop: `1px solid ${brandColors.lightGray}`,
                    pt: 1.5,
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mb: 1,
                    }}
                  >
                    <Layers size={12} color="#8B5CF6" />
                    <Typography
                      sx={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#8B5CF6',
                      }}
                    >
                      COLECCIÓN ({quotationData.selectedProducts.length}{' '}
                      productos)
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
                  >
                    {quotationData.selectedProducts.map((product) => (
                      <Box
                        key={product.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 0.5,
                          px: 1,
                          bgcolor: 'rgba(139, 92, 246, 0.06)',
                          borderRadius: 0.5,
                          border: '1px solid rgba(139, 92, 246, 0.1)',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          {product.source === 'inventory' ? (
                            <ShoppingBag size={12} color="#8B5CF6" />
                          ) : (
                            <Image size={12} color="#8B5CF6" />
                          )}
                          <Typography
                            sx={{
                              fontSize: '0.6rem',
                              color: brandColors.textPrimary,
                            }}
                          >
                            {product.name}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: '#8B5CF6',
                          }}
                        >
                          {formatCurrency(product.price)}
                        </Typography>
                      </Box>
                    ))}
                    {quotationData.totalProductsValue &&
                      quotationData.totalProductsValue > 0 && (
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 0.5,
                            px: 1,
                            bgcolor: '#8B5CF6',
                            borderRadius: 0.5,
                            mt: 0.5,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.6rem',
                              color: 'rgba(255,255,255,0.9)',
                              fontWeight: 600,
                            }}
                          >
                            Subtotal Colección
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {formatCurrency(quotationData.totalProductsValue)}
                          </Typography>
                        </Box>
                      )}
                  </Box>
                </Box>
              )}

            {/* Investment Breakdown */}
            {activeInvestments.length > 0 && (
              <Box
                sx={{
                  borderTop: `1px solid ${brandColors.lightGray}`,
                  pt: 1.5,
                  mb: 2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: brandColors.emeraldDark,
                    mb: 1,
                  }}
                >
                  DETALLE DE INVERSIÓN
                </Typography>

                <Box
                  sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
                >
                  {activeInvestments.map((inv) => (
                    <Box
                      key={inv.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 0.5,
                        px: 1,
                        bgcolor: brandColors.lightGray,
                        borderRadius: 0.5,
                      }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        {getIcon(inv.id)}
                        <Typography
                          sx={{
                            fontSize: '0.6rem',
                            color: brandColors.textPrimary,
                          }}
                        >
                          {inv.label}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          color: brandColors.textPrimary,
                        }}
                      >
                        {formatCurrency(inv.value)}
                      </Typography>
                    </Box>
                  ))}

                  {/* Custom items */}
                  {quotationData.customItems.map(
                    (item, idx) =>
                      item.value > 0 && (
                        <Box
                          key={idx}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 0.5,
                            px: 1,
                            bgcolor: brandColors.lightGray,
                            borderRadius: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <DollarSign size={14} color={brandColors.gray} />
                            <Typography
                              sx={{
                                fontSize: '0.6rem',
                                color: brandColors.textPrimary,
                              }}
                            >
                              {item.label}
                            </Typography>
                          </Box>
                          <Typography
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              color: brandColors.textPrimary,
                            }}
                          >
                            {formatCurrency(item.value)}
                          </Typography>
                        </Box>
                      ),
                  )}

                  {/* Total Investment */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 0.75,
                      px: 1,
                      bgcolor: brandColors.emeraldDark,
                      borderRadius: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.9)',
                        fontWeight: 600,
                      }}
                    >
                      INVERSIÓN TOTAL
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#fff',
                      }}
                    >
                      {formatCurrency(quotationData.totalInvestment)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Metrics Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
                mb: 2,
              }}
            >
              <Box
                sx={{
                  bgcolor: '#F8FAFC',
                  borderRadius: 1,
                  p: 1.25,
                  textAlign: 'center',
                  border: `1px solid ${brandColors.border}`,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    mb: 0.5,
                  }}
                >
                  <Percent size={14} color={brandColors.emerald} />
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      color: brandColors.gray,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    MARGEN
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: brandColors.emerald,
                  }}
                >
                  {quotationData.margin.toFixed(1)}%
                </Typography>
              </Box>
              <Box
                sx={{
                  bgcolor: '#F8FAFC',
                  borderRadius: 1,
                  p: 1.25,
                  textAlign: 'center',
                  border: `1px solid ${brandColors.border}`,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    mb: 0.5,
                  }}
                >
                  <TrendingUp size={14} color={brandColors.gold} />
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      color: brandColors.gray,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    ROI
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: brandColors.gold,
                  }}
                >
                  {quotationData.roi.toFixed(0)}%
                </Typography>
              </Box>
              <Box
                sx={{
                  bgcolor: '#F8FAFC',
                  borderRadius: 1,
                  p: 1.25,
                  textAlign: 'center',
                  border: `1px solid ${brandColors.border}`,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    mb: 0.5,
                  }}
                >
                  <Calculator size={14} color={brandColors.emeraldDark} />
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      color: brandColors.gray,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    GANANCIA
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: brandColors.emeraldDark,
                  }}
                >
                  {formatCurrency(quotationData.profit)}
                </Typography>
              </Box>
            </Box>

            {/* Price Box */}
            <Box
              sx={{
                bgcolor: brandColors.emerald,
                borderRadius: 1,
                p: 2,
                textAlign: 'center',
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.9)',
                  mb: 0.5,
                }}
              >
                PRECIO DE VENTA
              </Typography>
              <Typography
                sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}
              >
                {formatCurrency(quotationData.salePrice)}
              </Typography>
              {quotationData.caratWeight > 0 && (
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.8)',
                    mt: 0.5,
                  }}
                >
                  {formatCurrency(
                    quotationData.salePrice / quotationData.caratWeight,
                  )}{' '}
                  / quilate
                </Typography>
              )}
            </Box>

            {/* Notes */}
            {quotationData.notes && (
              <Box
                sx={{
                  mb: 2,
                  p: 1,
                  bgcolor: brandColors.lightGray,
                  borderRadius: 0.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.55rem',
                    fontWeight: 600,
                    color: brandColors.emeraldDark,
                    mb: 0.25,
                  }}
                >
                  NOTAS:
                </Typography>
                <Typography
                  sx={{ fontSize: '0.55rem', color: brandColors.textPrimary }}
                >
                  {quotationData.notes}
                </Typography>
              </Box>
            )}

            {/* Includes */}
            <Box sx={{ mb: 2 }}>
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: brandColors.emeraldDark,
                  mb: 0.5,
                }}
              >
                INCLUYE
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 0.5,
                }}
              >
                {[
                  'Certificado de autenticidad',
                  'Garantía de origen colombiano',
                  'Evaluación gemológica',
                  'Estuche premium',
                ].map((item) => (
                  <Box
                    key={item}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <Shield size={10} color={brandColors.emerald} />
                    <Typography
                      sx={{
                        fontSize: '0.55rem',
                        color: brandColors.textPrimary,
                      }}
                    >
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Validity */}
            <Box
              sx={{
                borderTop: `1px solid ${brandColors.lightGray}`,
                pt: 1,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  textAlign: 'center',
                  fontSize: '0.5rem',
                  color: brandColors.gray,
                }}
              >
                Esta cotización es válida hasta: <strong>{expiryStr}</strong>
              </Typography>
              <Typography
                sx={{
                  textAlign: 'center',
                  fontSize: '0.45rem',
                  color: brandColors.gray,
                }}
              >
                Los precios están sujetos a disponibilidad. Cotización
                verificable en nuestra plataforma.
              </Typography>
            </Box>

            {/* Footer */}
            <Box
              sx={{
                borderTop: `1px solid ${brandColors.gold}`,
                pt: 1.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {/* QR Placeholder */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  border: `1px solid ${brandColors.lightGray}`,
                  borderRadius: 0.5,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '1px',
                  p: 0.5,
                }}
              >
                {Array(25)
                  .fill(0)
                  .map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        bgcolor:
                          (i + Math.floor(i / 5)) % 2 === 0
                            ? brandColors.textPrimary
                            : 'transparent',
                        borderRadius: '1px',
                      }}
                    />
                  ))}
              </Box>

              {/* Contact */}
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography
                  sx={{ fontSize: '0.55rem', color: brandColors.gray }}
                >
                  {PRODUCTION_URL} • direccion.tierramadre@gmail.com • +57 311
                  305 2755
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: brandColors.emeraldDark,
                    mt: 0.5,
                  }}
                >
                  TIERRA MADRE
                </Typography>
              </Box>

              {/* Seal */}
              <Box
                sx={{
                  width: 45,
                  height: 45,
                  borderRadius: '50%',
                  border: `2px solid ${brandColors.gold}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: brandColors.emerald,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield size={16} color="#fff" />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
});

QuotationCertificate.displayName = 'QuotationCertificate';

export default QuotationCertificate;
