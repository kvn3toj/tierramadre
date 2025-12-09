/**
 * AsesorCard Component
 * Simple card for asesores loaded from Google Sheets
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import { Package, ChevronRight, Phone } from 'lucide-react';
import { Asesor } from '../../hooks/useAsesores';

interface AsesorCardProps {
  asesor: Asesor;
  onViewProducts?: (asesor: Asesor) => void;
  onContact?: (asesor: Asesor) => void;
}

export default function AsesorCard({
  asesor,
  onViewProducts,
  onContact,
}: AsesorCardProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

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

        {/* Product Preview Chips */}
        {asesor.products && asesor.products.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {asesor.products.slice(0, 3).map((product) => (
                <Chip
                  key={product.item}
                  label={`#${product.item}`}
                  size="small"
                  sx={{
                    bgcolor: alpha('#059669', 0.1),
                    color: '#059669',
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
              ))}
              {asesor.products.length > 3 && (
                <Chip
                  label={`+${asesor.products.length - 3} mas`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 22 }}
                />
              )}
            </Box>
          </Box>
        )}

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
