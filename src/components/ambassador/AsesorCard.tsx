/**
 * AsesorCard Component
 * Premium card for asesores with product image thumbnails
 */

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
import { Gem, ChevronRight, Image, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Asesor } from '../../hooks/useAsesores';
import { brand, lightTokens, darkTokens, accentColors, cssTransition } from '../../design-system';
import {
  emeraldCore,
  goldAccent,
  emeraldGradients,
  emeraldShadows,
  cardShadows,
  fontFamilies,
} from '../../design-system/index';
import { cardVariants } from '../../design-system/tokens/motion';

// Format phone for WhatsApp link
const formatWhatsAppLink = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  const fullNumber = digits.startsWith('57') ? digits : `57${digits}`;
  return `https://wa.me/${fullNumber}`;
};

interface AsesorCardProps {
  asesor: Asesor;
  onViewProducts?: (asesor: Asesor) => void;
  onContact?: (asesor: Asesor) => void;
}

// Get products with images for thumbnail display
const getProductsWithImages = (asesor: Asesor, limit: number = 4) => {
  if (!asesor.products) return [];
  return asesor.products.filter(p => p.imagen).slice(0, limit);
};

export default function AsesorCard({
  asesor,
  onViewProducts,
  onContact,
}: AsesorCardProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const productsWithImages = getProductsWithImages(asesor, 4);
  const remainingCount = (asesor.productCount || 0) - productsWithImages.length;
  const isEmbajador = (asesor.role || '').toLowerCase().includes('embajador');
  const hasProducts = (asesor.productCount || 0) > 0;

  const handleCardClick = () => {
    onViewProducts?.(asesor);
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
    >
      <Card
        onClick={handleCardClick}
        sx={{
          bgcolor: isLight ? lightTokens.background.surface : darkTokens.background.surface,
          borderRadius: 3,
          border: '1px solid',
          borderColor: isLight
            ? alpha(emeraldCore.primary, 0.06)
            : alpha(emeraldCore.primary, 0.1),
          boxShadow: cardShadows.resting,
          transition: cssTransition.default,
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: emeraldGradients.deep,
            opacity: 0,
            transition: cssTransition.default,
            zIndex: 1,
          },
          '&:hover': {
            borderColor: emeraldCore.primary,
            boxShadow: cardShadows.emeraldHover,
          },
          '&:hover::before': {
            opacity: 1,
          },
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          {/* Header: Avatar + Name */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Avatar
              src={asesor.photoUrl}
              alt={asesor.name}
              sx={{
                width: 56,
                height: 56,
                background: emeraldGradients.deep,
                fontSize: '1.3rem',
                fontWeight: 700,
                border: '2px solid transparent',
                backgroundClip: 'padding-box',
                boxShadow: `0 0 0 2px ${alpha(emeraldCore.primary, 0.3)}`,
              }}
            >
              {asesor.name.charAt(0).toUpperCase()}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                component="p"
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mb: 0.5,
                }}
              >
                {asesor.name}
              </Typography>

              <Chip
                label={asesor.role || 'Asesor'}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  border: '1px solid',
                  ...(asesor.role === 'Administrador'
                    ? {
                        bgcolor: alpha(accentColors.purple.light, 0.12),
                        color: accentColors.purple.light,
                        borderColor: alpha(accentColors.purple.light, 0.2),
                      }
                    : isEmbajador
                    ? {
                        bgcolor: alpha(goldAccent.primary, 0.1),
                        color: isLight ? goldAccent.dark : goldAccent.light,
                        borderColor: alpha(goldAccent.primary, 0.2),
                      }
                    : {
                        bgcolor: alpha(emeraldCore.primary, 0.1),
                        color: emeraldCore.primary,
                        borderColor: alpha(emeraldCore.primary, 0.2),
                      }),
                }}
              />
            </Box>
          </Box>

          {/* Product Count */}
          {hasProducts ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mb: 2,
                py: 1.5,
                px: 2,
                bgcolor: isLight
                  ? alpha(emeraldCore.primary, 0.06)
                  : alpha(emeraldCore.primary, 0.08),
                borderRadius: 2,
              }}
            >
              <Gem size={20} style={{ color: emeraldCore.primary }} />
              <Box>
                <Typography
                  component="p"
                  variant="h6"
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 700,
                    color: emeraldCore.primary,
                    fontSize: '1.1rem',
                    lineHeight: 1,
                  }}
                >
                  {asesor.productCount || 0}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
                >
                  esmeraldas en inventario
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                mb: 2,
                py: 1.5,
                px: 2,
                border: '1px dashed',
                borderColor: isLight
                  ? alpha(emeraldCore.primary, 0.2)
                  : alpha(emeraldCore.primary, 0.15),
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  fontSize: '0.75rem',
                }}
              >
                Portafolio en construcci&oacute;n
              </Typography>
            </Box>
          )}

          {/* Product Image Thumbnails */}
          {productsWithImages.length > 0 ? (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {productsWithImages.map((product) => (
                  <Box
                    key={product.item}
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '2px solid',
                      borderColor: isLight ? lightTokens.border.default : darkTokens.border.default,
                      flexShrink: 0,
                      transition: cssTransition.default,
                      '&:hover': {
                        borderColor: alpha(emeraldCore.primary, 0.4),
                      },
                    }}
                  >
                    <img
                      src={product.thumbnailUrl || product.imagen}
                      alt={product.nombre}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                ))}
                {remainingCount > 0 && (
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 2,
                      border: '2px dashed',
                      borderColor: isLight ? brand.slate[300] : darkTokens.border.default,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, color: 'text.secondary' }}
                    >
                      +{remainingCount}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          ) : hasProducts ? (
            <Box
              sx={{
                mb: 2,
                display: 'flex',
                gap: 0.5,
                alignItems: 'center',
                justifyContent: 'center',
                py: 1.5,
                bgcolor: isLight ? lightTokens.background.muted : darkTokens.background.surface,
                borderRadius: 2,
              }}
            >
              <Image size={16} color={lightTokens.text.muted} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {asesor.productCount} productos sin fotos
              </Typography>
            </Box>
          ) : null}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              endIcon={<ChevronRight size={16} />}
              onClick={(e) => {
                e.stopPropagation();
                onViewProducts?.(asesor);
              }}
              sx={{
                flex: 1,
                background: emeraldGradients.deep,
                boxShadow: emeraldShadows.sm,
                '&:hover': {
                  background: emeraldGradients.intense,
                  boxShadow: emeraldShadows.md,
                },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {hasProducts ? 'Ver Esmeraldas' : 'Ver Perfil'}
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
                  borderColor: accentColors.whatsapp,
                  color: accentColors.whatsapp,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: { xs: 40, sm: 'auto' },
                  px: { xs: 1, sm: 2 },
                  '&:hover': {
                    borderColor: accentColors.whatsappHover,
                    bgcolor: alpha(accentColors.whatsapp, 0.1),
                  },
                }}
              >
                <MessageCircle size={16} />
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
                  borderColor: isLight ? lightTokens.border.default : darkTokens.border.default,
                  color: 'text.secondary',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Sin contacto
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}
