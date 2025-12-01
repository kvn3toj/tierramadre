import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  alpha,
  useTheme,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  ArrowLeft,
  Package,
  Gem,
  Ruler,
  Palette,
  Award,
  DollarSign,
  MapPin,
  User,
  Calendar,
  FileCheck,
  Crown,
  ShoppingCart,
} from 'lucide-react';
import { useThemeMode } from '../context/ThemeContext';
import { inventoryData } from '../data/inventory';
import { calculateTrustScore, getTrustBadge } from '../utils/trustScore';
import { TrustBadgeCompact } from './TrustBadge';

// Format currency in COP
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Get color dot style
const getColorDot = (color: string): string => {
  const colorMap: Record<string, string> = {
    'Verde Vivido': '#059669',
    'Verde Muzo': '#065F46',
    'Verde Limón': '#84CC16',
    'Verde Menta': '#34D399',
    'Verde Natural': '#22C55E',
  };
  return colorMap[color] || '#6B7280';
};

// Get quality badge style
const getQualityBadge = (calidad: string): { label: string; bg: string; color: string; border: string } => {
  if (calidad.includes('SuperFina') || calidad === 'Fina') {
    return {
      label: 'Premium',
      bg: '#FEF3C7',
      color: '#92400E',
      border: '#F59E0B',
    };
  }
  if (calidad.includes('Superior')) {
    return {
      label: 'Superior',
      bg: '#DBEAFE',
      color: '#1E3A8A',
      border: '#3B82F6',
    };
  }
  if (calidad.includes('Fina')) {
    return {
      label: 'Fina',
      bg: '#F3E8FF',
      color: '#6B21A8',
      border: '#A855F7',
    };
  }
  return {
    label: 'Comercial',
    bg: '#F3F4F6',
    color: '#374151',
    border: '#9CA3AF',
  };
};

export default function ProductDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  // Find the product
  const product = useMemo(() => {
    return inventoryData.find(item => item.item.toString() === itemId);
  }, [itemId]);

  // Calculate trust score
  const trustScore = useMemo(() => {
    return product ? calculateTrustScore(product) : null;
  }, [product]);

  const trustBadge = trustScore ? getTrustBadge(trustScore.overall) : null;

  if (!product) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: 8, textAlign: 'center' }}>
        <Package size={64} color="#9CA3AF" style={{ marginBottom: 16, opacity: 0.5 }} />
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Producto no encontrado
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
          El producto que buscas no existe o ha sido eliminado.
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate('/inventario')}
          sx={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#FFFFFF',
          }}
        >
          Volver al Inventario
        </Button>
      </Box>
    );
  }

  const displayName = product.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const quality = getQualityBadge(product.calidad);
  const colorDot = getColorDot(product.color);
  const weight = typeof product.peso === 'number' ? `${product.peso} ct` : product.metalType;
  const isAvailable = product.estado === 'DISPONIBLE';

  return (
    <Box sx={{
      maxWidth: 1400,
      mx: 'auto',
      px: { xs: 2, sm: 3, md: 4 },
      py: { xs: 2, sm: 3 },
      pb: { xs: 'calc(16px + env(safe-area-inset-bottom))', sm: 3 }
    }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/')}
          sx={{
            color: theme.palette.text.secondary,
            textDecoration: 'none',
            '&:hover': { color: '#059669' },
          }}
        >
          Inicio
        </Link>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/inventario')}
          sx={{
            color: theme.palette.text.secondary,
            textDecoration: 'none',
            '&:hover': { color: '#059669' },
          }}
        >
          Inventario
        </Link>
        <Typography variant="body2" color="text.primary">
          {displayName}
        </Typography>
      </Breadcrumbs>

      {/* Back Button */}
      <Button
        startIcon={<ArrowLeft size={18} />}
        onClick={() => navigate('/inventario')}
        sx={{
          mb: 3,
          color: theme.palette.text.secondary,
          '&:hover': {
            bgcolor: isLight ? alpha('#059669', 0.08) : alpha('#059669', 0.15),
            color: '#059669',
          },
        }}
      >
        Volver al Inventario
      </Button>

      <Grid container spacing={{ xs: 3, md: 4 }}>
        {/* Left Column - Image & Gallery */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
              bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
              position: 'relative',
            }}
          >
            {/* Status Badge */}
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 1,
              }}
            >
              <Chip
                label={isAvailable ? 'Disponible' : 'Vendido'}
                color={isAvailable ? 'success' : 'default'}
                sx={{
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              />
            </Box>

            {/* Placeholder Image - Replace with actual image when available */}
            <Box
              sx={{
                width: '100%',
                height: { xs: 300, sm: 400, md: 500 },
                minHeight: { xs: 300, md: 500 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(colorDot, 0.1),
                position: 'relative',
              }}
            >
              <Gem size={120} color={colorDot} style={{ opacity: 0.3 }} />
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: theme.palette.text.secondary,
                }}
              >
                Imagen no disponible
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column - Product Details */}
        <Grid item xs={12} md={6}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {product.isJewelry && <Crown size={20} color="#D4AF37" />}
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                #{product.item}
              </Typography>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2 }}>
              {displayName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                label={product.isJewelry ? 'Joyería' : 'Gema Suelta'}
                size="small"
                sx={{ bgcolor: isLight ? '#F3F4F6' : '#2C2C2E' }}
              />
              <Chip
                label={quality.label}
                size="small"
                sx={{
                  bgcolor: quality.bg,
                  color: quality.color,
                  border: `1px solid ${quality.border}`,
                  fontWeight: 600,
                }}
              />
              {product.cantidad > 1 && (
                <Chip
                  label={`Lote x${product.cantidad}`}
                  size="small"
                  sx={{
                    bgcolor: alpha('#8B5CF6', 0.1),
                    color: '#8B5CF6',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>

            {/* Price */}
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                color: '#059669',
                mb: 0.5,
                fontFamily: 'system-ui',
                letterSpacing: '-0.02em',
              }}
            >
              {formatCurrency(product.precioCOP)}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              Precio en pesos colombianos
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Specifications */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Especificaciones
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Color */}
            <Grid item xs={6}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                  border: '1px solid',
                  borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Palette size={16} color={theme.palette.text.secondary} />
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      Color
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: colorDot }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {product.color}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Weight */}
            <Grid item xs={6}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                  border: '1px solid',
                  borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Gem size={16} color={theme.palette.text.secondary} />
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {product.isJewelry ? 'Metal' : 'Peso'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {weight}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Shape/Talla */}
            {product.talla && product.talla !== '-' && (
              <Grid item xs={6}>
                <Card
                  elevation={0}
                  sx={{
                    bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                    border: '1px solid',
                    borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Ruler size={16} color={theme.palette.text.secondary} />
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {product.isJewelry ? 'Talla' : 'Corte'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {product.talla}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Measurements */}
            {product.medidas && product.medidas !== '-' && product.medidas !== 'Anillo' && (
              <Grid item xs={6}>
                <Card
                  elevation={0}
                  sx={{
                    bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                    border: '1px solid',
                    borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Ruler size={16} color={theme.palette.text.secondary} />
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        Medidas
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {product.medidas} mm
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Quality */}
            <Grid item xs={12}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                  border: '1px solid',
                  borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Award size={16} color={theme.palette.text.secondary} />
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      Calidad
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {product.calidad}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Trust Score */}
          {trustScore && trustBadge && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Certificación del Producto
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(trustBadge.color, 0.08),
                  border: '1px solid',
                  borderColor: alpha(trustBadge.color, 0.2),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Autenticidad de la Esmeralda
                  </Typography>
                  <TrustBadgeCompact score={trustScore} />
                </Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 1 }}>
                  Evaluación basada en origen, calidad y certificaciones
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileCheck size={14} />}
                  sx={{
                    borderColor: trustBadge.color,
                    color: trustBadge.color,
                    '&:hover': {
                      bgcolor: alpha(trustBadge.color, 0.08),
                      borderColor: trustBadge.color,
                    },
                  }}
                >
                  Ver Certificaciones
                </Button>
              </Paper>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Additional Info */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Información Adicional
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MapPin size={18} color="#9CA3AF" />
              <Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                  Ubicación
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {product.ubicacion}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <User size={18} color="#9CA3AF" />
              <Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                  Asesor
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {product.asesor}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Calendar size={18} color="#9CA3AF" />
              <Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                  Fecha de Ingreso
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {product.fechaIngreso}
                </Typography>
              </Box>
            </Box>

            {product.costoTM && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DollarSign size={18} color="#9CA3AF" />
                <Box>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                    Costo TM
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatCurrency(product.costoTM)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* CTA Buttons */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={!isAvailable}
              startIcon={<ShoppingCart size={20} />}
              sx={{
                background: isAvailable
                  ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  : undefined,
                color: '#FFFFFF',
                py: 1.5,
                minHeight: 48,
                fontWeight: 600,
                boxShadow: isAvailable ? '0 4px 12px rgba(16, 185, 129, 0.3)' : undefined,
                '&:hover': {
                  background: isAvailable
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                    : undefined,
                  boxShadow: isAvailable ? '0 6px 16px rgba(16, 185, 129, 0.4)' : undefined,
                },
              }}
            >
              {isAvailable ? 'Añadir al Carrito' : 'Vendido'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                borderColor: '#059669',
                color: '#059669',
                py: 1.5,
                minHeight: 48,
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#047857',
                  bgcolor: alpha('#059669', 0.08),
                },
              }}
            >
              Contactar
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
