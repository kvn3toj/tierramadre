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
  alpha,
  useTheme,
} from '@mui/material';
import { Package, ChevronRight, Phone, Image } from 'lucide-react';
import { Asesor } from '../../hooks/useAsesores';

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

  return (
    <Card
      sx={{
        bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
        borderRadius: 3,
        border: '1px solid',
        borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#059669',
          boxShadow: `0 4px 20px ${alpha('#059669', 0.15)}`,
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
              bgcolor: '#059669',
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

            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: '0.85rem',
              }}
            >
              Asesor de Esmeraldas
            </Typography>
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
            bgcolor: isLight ? '#F0FDF4' : alpha('#059669', 0.1),
            borderRadius: 2,
          }}
        >
          <Package size={20} style={{ color: '#059669' }} />
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#059669',
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
                    borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
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
                    borderColor: isLight ? '#D1D5DB' : '#4B4B4D',
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
              bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
              borderRadius: 2,
            }}
          >
            <Image size={16} color="#9CA3AF" />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {asesor.productCount} productos sin fotos
            </Typography>
          </Box>
        ) : null}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {asesor.productCount && asesor.productCount > 0 ? (
            <Button
              variant="contained"
              size="small"
              endIcon={<ChevronRight size={16} />}
              onClick={() => onViewProducts?.(asesor)}
              sx={{
                flex: 1,
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Ver Productos
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="small"
              disabled
              sx={{
                flex: 1,
                textTransform: 'none',
              }}
            >
              Sin productos
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<Phone size={14} />}
            onClick={() => onContact?.(asesor)}
            sx={{
              borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
              color: 'text.primary',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#059669',
                bgcolor: alpha('#059669', 0.05),
              },
            }}
          >
            Contactar
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
