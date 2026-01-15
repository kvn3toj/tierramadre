/**
 * AsesorCard Component
 * Card for asesores with product image thumbnails
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
import { Package, ChevronRight, Image, MessageCircle } from 'lucide-react';
import { Asesor } from '../../hooks/useAsesores';
import { brand, lightTokens, darkTokens, accentColors } from '../../design-system';

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

  const handleCardClick = () => {
    onViewProducts?.(asesor);
  };

  return (
    <Card
      onClick={handleCardClick}
      sx={{
        bgcolor: isLight ? lightTokens.background.surface : darkTokens.background.surface,
        borderRadius: 3,
        border: '1px solid',
        borderColor: isLight ? lightTokens.border.default : darkTokens.border.default,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        '&:hover': {
          borderColor: brand.emerald[500],
          boxShadow: `0 4px 20px ${alpha(brand.emerald[500], 0.15)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header: Avatar + Name */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: brand.emerald[500],
              fontSize: '1.3rem',
              fontWeight: 700,
            }}
          >
            {asesor.name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
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
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: asesor.role === 'Administrador'
                  ? alpha(accentColors.purple.light, 0.15)
                  : asesor.role === 'Embajador'
                  ? alpha(accentColors.warning.light, 0.15)
                  : alpha(brand.emerald[500], 0.15),
                color: asesor.role === 'Administrador'
                  ? accentColors.purple.light
                  : asesor.role === 'Embajador'
                  ? accentColors.warning.light
                  : brand.emerald[500],
              }}
            />
          </Box>
        </Box>

        {/* Product Count */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 2,
            py: 1.5,
            px: 2,
            bgcolor: isLight ? brand.emerald[50] : alpha(brand.emerald[500], 0.1),
            borderRadius: 2,
          }}
        >
          <Package size={20} style={{ color: brand.emerald[500] }} />
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: brand.emerald[500],
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
              productos en inventario
            </Typography>
          </Box>
        </Box>

        {/* Product Image Thumbnails */}
        {productsWithImages.length > 0 ? (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {productsWithImages.map((product) => (
                <Box
                  key={product.item}
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: isLight ? lightTokens.border.default : darkTokens.border.default,
                    flexShrink: 0,
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
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
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
        ) : asesor.productCount && asesor.productCount > 0 ? (
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
              bgcolor: brand.emerald[500],
              '&:hover': { bgcolor: brand.emerald[600] },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {asesor.productCount && asesor.productCount > 0 ? 'Ver Productos' : 'Ver Perfil'}
          </Button>
          {asesor.whatsapp ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MessageCircle size={14} />}
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
                '&:hover': {
                  borderColor: accentColors.whatsappHover,
                  bgcolor: alpha(accentColors.whatsapp, 0.1),
                },
              }}
            >
              WhatsApp
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
  );
}
