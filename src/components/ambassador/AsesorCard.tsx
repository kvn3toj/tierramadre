/**
 * AsesorCard Component
 * Refined editorial card for the ambassador directory
 *
 * Variants:
 * - default (grid): Vertical card with stacked layout
 * - list: Horizontal compact row for list view
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import { Gem, ArrowRight, MessageCircle } from 'lucide-react';
import { Asesor } from '../../hooks/useAsesores';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { accentColors, cssTransition } from '../../design-system';
import {
  emeraldCore,
  goldAccent,
  surfacesLight,
  surfacesDark,
  fontFamilies,
} from '../../design-system/index';
import { iosSemanticColors } from '../../design-system/tokens/ios-semantic';
import ProgressiveImage from '../shared/ProgressiveImage';

const formatWhatsAppLink = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  const fullNumber = digits.startsWith('57') ? digits : `57${digits}`;
  return `https://wa.me/${fullNumber}`;
};

interface AsesorCardProps {
  asesor: Asesor;
  onViewProducts?: (asesor: Asesor) => void;
  onContact?: (asesor: Asesor) => void;
  variant?: 'default' | 'list';
}

const getProductsWithImages = (asesor: Asesor, limit: number = 4) => {
  if (!asesor.products) return [];
  return asesor.products.filter(p => p.imagen).slice(0, limit);
};

export default function AsesorCard({
  asesor,
  onViewProducts,
  onContact,
  variant = 'default',
}: AsesorCardProps) {
  if (variant === 'list') {
    return (
      <ListCard
        asesor={asesor}
        onViewProducts={onViewProducts}
        onContact={onContact}
      />
    );
  }

  return (
    <GridCard
      asesor={asesor}
      onViewProducts={onViewProducts}
      onContact={onContact}
    />
  );
}

// =============================================================================
// GRID CARD (default vertical layout)
// =============================================================================

function GridCard({
  asesor,
  onViewProducts,
  onContact,
}: Omit<AsesorCardProps, 'variant'>) {
  const theme = useTheme();
  const { t } = useLanguage();
  const isLight = theme.palette.mode === 'light';
  const prefersReducedMotion = useReducedMotion();
  const productsWithImages = getProductsWithImages(asesor, 4);
  const remainingCount = (asesor.productCount || 0) - productsWithImages.length;
  const hasProducts = (asesor.productCount || 0) > 0;
  const roleBadge = getRoleBadgeStyles(asesor.role, isLight);

  const handleClick = () => onViewProducts?.(asesor);

  return (
    <Card
      onClick={handleClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      role="article"
      aria-label={`${asesor.name} - ${asesor.role || 'Asesor'}`}
      tabIndex={0}
      sx={{
        bgcolor: isLight ? surfacesLight.surface.default : surfacesDark.background.secondary,
        borderRadius: 3,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        boxShadow: isLight
          ? '0 1px 3px rgba(0,0,0,0.06)'
          : '0 1px 3px rgba(0,0,0,0.2)',
        transition: prefersReducedMotion ? 'none' : cssTransition.spring,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          borderColor: emeraldCore.primary,
          boxShadow: isLight
            ? `0 12px 28px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)`
            : `0 12px 28px rgba(0,0,0,0.35), 0 0 1px ${alpha(emeraldCore.primary, 0.15)} inset`,
          transform: prefersReducedMotion ? 'none' : 'translateY(-3px)',
        },
        '&:active': {
          transform: prefersReducedMotion ? 'none' : 'scale(0.97)',
          transition: prefersReducedMotion ? 'none' : 'transform 0.1s ease-out',
        },
        '&:focus-visible': {
          outline: `2px solid ${emeraldCore.primary}`,
          outlineOffset: 2,
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        {/* Header: Avatar + Identity */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
          <AsesorAvatar asesor={asesor} isLight={isLight} size={64} />

          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography
              component="p"
              sx={{
                fontWeight: 600,
                fontSize: '0.85rem',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                mb: 0.75,
                letterSpacing: '-0.24px',
                color: isLight ? iosSemanticColors.label.light : iosSemanticColors.label.dark,
              }}
            >
              {asesor.name}
            </Typography>

            <Chip
              label={asesor.role || 'Asesor'}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.58rem',
                fontWeight: 600,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                border: '1px solid',
                borderRadius: 1,
                width: 'fit-content',
                ...roleBadge,
              }}
            />
          </Box>
        </Box>

        {/* Inventory Indicator */}
        <InventorySection asesor={asesor} isLight={isLight} hasProducts={hasProducts} t={t} />

        {/* Product Thumbnails — Overlapping Gallery */}
        {productsWithImages.length > 0 && (
          <Box sx={{ mb: 2.5, pl: 0.5 }}>
            <Box sx={{ display: 'flex' }}>
              {productsWithImages.map((product, index) => (
                <Box
                  key={product.item}
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: isLight ? surfacesLight.surface.default : surfacesDark.background.secondary,
                    flexShrink: 0,
                    ml: index === 0 ? 0 : '-6px',
                    position: 'relative',
                    zIndex: productsWithImages.length - index,
                    transition: prefersReducedMotion ? 'none' : cssTransition.default,
                    boxShadow: `0 1px 4px ${alpha('#000', isLight ? 0.08 : 0.2)}`,
                    '& img': {
                      transition: prefersReducedMotion ? 'none' : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                    },
                    '&:hover': {
                      transform: prefersReducedMotion ? 'none' : 'translateY(-3px) scale(1.08)',
                      zIndex: 20,
                      boxShadow: `0 4px 12px ${alpha('#000', isLight ? 0.12 : 0.3)}`,
                      borderColor: alpha(emeraldCore.primary, 0.3),
                      '& img': {
                        transform: prefersReducedMotion ? 'none' : 'scale(1.06)',
                      },
                    },
                  }}
                >
                  <ProgressiveImage
                    src={product.thumbnailUrl || product.imagen}
                    alt={product.nombre}
                    height={52}
                    width={52}
                    layout="thumbnail"
                    quality="eco"
                    enableLQIP={false}
                    showPlaceholderIcon={false}
                  />
                </Box>
              ))}
              {remainingCount > 0 && (
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: isLight ? surfacesLight.surface.default : surfacesDark.background.secondary,
                    bgcolor: isLight ? alpha('#000', 0.03) : alpha('#fff', 0.04),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    ml: '-6px',
                    position: 'relative',
                    zIndex: 0,
                    boxShadow: `0 1px 4px ${alpha('#000', isLight ? 0.05 : 0.15)}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: fontFamilies.mono,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: isLight ? iosSemanticColors.secondaryLabel.light : iosSemanticColors.secondaryLabel.dark,
                      opacity: 0.7,
                    }}
                  >
                    +{remainingCount}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Actions */}
        <CardActions
          asesor={asesor}
          isLight={isLight}
          hasProducts={hasProducts}
          onViewProducts={onViewProducts}
          onContact={onContact}
          t={t}
        />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// LIST CARD (horizontal compact layout for list view)
// =============================================================================

function ListCard({
  asesor,
  onViewProducts,
  onContact,
}: Omit<AsesorCardProps, 'variant'>) {
  const theme = useTheme();
  const { t } = useLanguage();
  const isLight = theme.palette.mode === 'light';
  const prefersReducedMotion = useReducedMotion();
  const productsWithImages = getProductsWithImages(asesor, 3);
  const hasProducts = (asesor.productCount || 0) > 0;
  const roleBadge = getRoleBadgeStyles(asesor.role, isLight);

  const handleClick = () => onViewProducts?.(asesor);

  return (
    <Card
      onClick={handleClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      role="article"
      aria-label={`${asesor.name} - ${asesor.role || 'Asesor'}`}
      tabIndex={0}
      sx={{
        bgcolor: isLight ? surfacesLight.surface.default : surfacesDark.background.secondary,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        boxShadow: isLight
          ? '0 1px 3px rgba(0,0,0,0.06)'
          : '0 1px 3px rgba(0,0,0,0.2)',
        transition: prefersReducedMotion ? 'none' : cssTransition.spring,
        cursor: 'pointer',
        overflow: 'hidden',
        '&:hover': {
          borderColor: emeraldCore.primary,
          boxShadow: isLight
            ? `0 4px 16px rgba(0,0,0,0.08)`
            : `0 4px 16px rgba(0,0,0,0.3), 0 0 1px ${alpha(emeraldCore.primary, 0.15)} inset`,
        },
        '&:active': {
          transform: prefersReducedMotion ? 'none' : 'scale(0.97)',
          transition: prefersReducedMotion ? 'none' : 'transform 0.1s ease-out',
        },
        '&:focus-visible': {
          outline: `2px solid ${emeraldCore.primary}`,
          outlineOffset: 2,
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, sm: 2.5 },
          }}
        >
          {/* Avatar */}
          <AsesorAvatar asesor={asesor} isLight={isLight} size={52} />

          {/* Name + Role */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography
                component="p"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.24px',
                  color: isLight ? iosSemanticColors.label.light : iosSemanticColors.label.dark,
                }}
              >
                {asesor.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={asesor.role || 'Asesor'}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.52rem',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  border: '1px solid',
                  borderRadius: 0.75,
                  ...roleBadge,
                }}
              />
              {hasProducts && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Gem size={12} strokeWidth={1.5} style={{ color: emeraldCore.primary }} />
                  <Typography
                    sx={{
                      fontFamily: fontFamilies.mono,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: emeraldCore.primary,
                    }}
                  >
                    {asesor.productCount}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Thumbnail strip — compact overlapping */}
          {productsWithImages.length > 0 && (
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, pl: 1 }}>
              {productsWithImages.map((product, index) => (
                <Box
                  key={product.item}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: isLight ? surfacesLight.surface.default : surfacesDark.background.secondary,
                    flexShrink: 0,
                    ml: index === 0 ? 0 : '-8px',
                    position: 'relative',
                    zIndex: productsWithImages.length - index,
                    boxShadow: `0 1px 3px ${alpha('#000', isLight ? 0.06 : 0.15)}`,
                  }}
                >
                  <ProgressiveImage
                    src={product.thumbnailUrl || product.imagen}
                    alt={product.nombre}
                    height={40}
                    width={40}
                    layout="thumbnail"
                    quality="eco"
                    enableLQIP={false}
                    showPlaceholderIcon={false}
                  />
                </Box>
              ))}
            </Box>
          )}

          {/* Actions — compact */}
          <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
            <Button
              variant="contained"
              size="small"
              endIcon={<ArrowRight size={13} strokeWidth={2} />}
              onClick={(e) => {
                e.stopPropagation();
                onViewProducts?.(asesor);
              }}
              sx={{
                bgcolor: isLight ? emeraldCore.primary : emeraldCore.dark,
                color: '#fff',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: emeraldCore.dark,
                  boxShadow: `0 3px 10px ${alpha(emeraldCore.primary, 0.25)}`,
                },
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.72rem',
                letterSpacing: '0.01em',
                borderRadius: 1.5,
                py: 0.6,
                px: 1.5,
                minWidth: 0,
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {hasProducts ? t.ambassador.viewEmeralds : t.ambassador.viewProfile}
              </Box>
            </Button>
            {asesor.whatsapp && (
              <Button
                variant="outlined"
                size="small"
                aria-label="WhatsApp"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(formatWhatsAppLink(asesor.whatsapp!), '_blank');
                  onContact?.(asesor);
                }}
                sx={{
                  borderColor: alpha(accentColors.whatsapp, 0.25),
                  color: accentColors.whatsapp,
                  minWidth: 36,
                  px: 0.75,
                  py: 0.6,
                  borderRadius: 1.5,
                  '&:hover': {
                    borderColor: accentColors.whatsapp,
                    bgcolor: alpha(accentColors.whatsapp, 0.05),
                  },
                }}
              >
                <MessageCircle size={14} strokeWidth={2} />
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SHARED SUB-COMPONENTS
// =============================================================================

function AsesorAvatar({
  asesor,
  isLight,
  size,
}: {
  asesor: Asesor;
  isLight: boolean;
  size: number;
}) {
  return (
    <Avatar
      src={asesor.photoUrl}
      alt={asesor.name}
      sx={{
        width: size,
        height: size,
        bgcolor: isLight
          ? alpha(emeraldCore.primary, 0.08)
          : alpha(emeraldCore.primary, 0.12),
        color: emeraldCore.primary,
        fontSize: size * 0.35,
        fontWeight: 600,
        border: '2px solid',
        borderColor: isLight
          ? alpha(goldAccent.primary, 0.1)
          : alpha(goldAccent.primary, 0.08),
      }}
    >
      {asesor.name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

function InventorySection({
  asesor,
  isLight,
  hasProducts,
  t,
}: {
  asesor: Asesor;
  isLight: boolean;
  hasProducts: boolean;
  t: any;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 2,
        py: 1.25,
        px: 1.75,
        bgcolor: hasProducts
          ? (isLight ? alpha(emeraldCore.primary, 0.025) : alpha(emeraldCore.primary, 0.05))
          : (isLight ? alpha('#000', 0.01) : alpha('#fff', 0.02)),
        borderRadius: 2,
        border: '1px solid',
        borderColor: hasProducts
          ? (isLight ? alpha(emeraldCore.primary, 0.05) : alpha(emeraldCore.primary, 0.07))
          : (isLight ? surfacesLight.border.light : surfacesDark.border.light),
        opacity: hasProducts ? 1 : 0.7,
      }}
    >
      <Gem
        size={15}
        strokeWidth={1.5}
        style={{
          color: hasProducts ? emeraldCore.primary : (isLight ? alpha('#000', 0.25) : alpha('#fff', 0.25)),
          flexShrink: 0,
        }}
      />
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
        <Typography
          component="span"
          sx={{
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 700,
            color: hasProducts
              ? emeraldCore.primary
              : (isLight ? iosSemanticColors.secondaryLabel.light : iosSemanticColors.secondaryLabel.dark),
            fontSize: '1.05rem',
            lineHeight: 1,
          }}
        >
          {asesor.productCount || 0}
        </Typography>
        <Typography
          component="span"
          sx={{
            color: isLight ? iosSemanticColors.secondaryLabel.light : iosSemanticColors.secondaryLabel.dark,
            fontSize: '0.68rem',
            letterSpacing: '-0.01em',
          }}
        >
          {hasProducts ? t.ambassador.emeraldsInInventory : t.ambassador.portfolioUnderConstruction}
        </Typography>
      </Box>
    </Box>
  );
}

function CardActions({
  asesor,
  isLight,
  hasProducts,
  onViewProducts,
  onContact,
  t,
}: {
  asesor: Asesor;
  isLight: boolean;
  hasProducts: boolean;
  onViewProducts?: (asesor: Asesor) => void;
  onContact?: (asesor: Asesor) => void;
  t: any;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant="contained"
        size="small"
        endIcon={<ArrowRight size={14} strokeWidth={2} />}
        onClick={(e) => {
          e.stopPropagation();
          onViewProducts?.(asesor);
        }}
        sx={{
          flex: 1,
          bgcolor: isLight ? emeraldCore.primary : emeraldCore.dark,
          color: '#fff',
          boxShadow: 'none',
          '&:hover': {
            bgcolor: emeraldCore.dark,
            boxShadow: `0 4px 14px ${alpha(emeraldCore.primary, 0.25)}`,
          },
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.78rem',
          letterSpacing: '0.01em',
          borderRadius: 2,
          py: 0.85,
        }}
      >
        {hasProducts ? t.ambassador.viewEmeralds : t.ambassador.viewProfile}
      </Button>
      {asesor.whatsapp ? (
        <Button
          variant="outlined"
          size="small"
          aria-label="WhatsApp"
          onClick={(e) => {
            e.stopPropagation();
            window.open(formatWhatsAppLink(asesor.whatsapp!), '_blank');
            onContact?.(asesor);
          }}
          sx={{
            borderColor: isLight
              ? alpha(accentColors.whatsapp, 0.25)
              : alpha(accentColors.whatsapp, 0.18),
            color: accentColors.whatsapp,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.72rem',
            minWidth: { xs: 40, sm: 'auto' },
            px: { xs: 1, sm: 1.75 },
            borderRadius: 2,
            py: 0.85,
            '&:hover': {
              borderColor: accentColors.whatsapp,
              bgcolor: alpha(accentColors.whatsapp, 0.05),
            },
          }}
        >
          <MessageCircle size={14} strokeWidth={2} />
          <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>
            WhatsApp
          </Box>
        </Button>
      ) : (
        <Button
          variant="outlined"
          size="small"
          disabled
          onClick={(e) => e.stopPropagation()}
          sx={{
            borderColor: isLight ? alpha('#000', 0.05) : alpha('#fff', 0.05),
            color: 'text.secondary',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.72rem',
            borderRadius: 2,
            opacity: 0.5,
          }}
        >
          {t.ambassador.noContact}
        </Button>
      )}
    </Box>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getRoleBadgeStyles(role: string | undefined, isLight: boolean) {
  const isAdmin = (role || '').toLowerCase().includes('admin');

  if (isAdmin) {
    return {
      bgcolor: alpha(goldAccent.primary, 0.07),
      color: isLight ? goldAccent.dark : goldAccent.light,
      borderColor: alpha(goldAccent.primary, 0.12),
    };
  }

  return {
    bgcolor: alpha(emeraldCore.primary, 0.05),
    color: emeraldCore.primary,
    borderColor: alpha(emeraldCore.primary, 0.1),
  };
}
