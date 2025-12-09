/**
 * AsesorProfile Component
 * Shows asesor details and their inventory products
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Button,
  Grid,
  Paper,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowLeft,
  Package,
  Phone,
  Gem,
  DollarSign,
} from 'lucide-react';
import { useAsesores } from '../../hooks/useAsesores';
import { useInventory } from '../../hooks/useInventory';
import { InventoryItem } from '../../types';
import { InventoryCard } from '../inventory/InventoryCard';
import { calculateTrustScore } from '../../utils/trustScore';

// Normalize name for comparison
const normalizeName = (name: string): string => {
  let result = '';
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
      result += name[i].toUpperCase();
    }
  }
  return result;
};

export default function AsesorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const { inventory } = useInventory();
  const { asesores, isLoading } = useAsesores(inventory);

  // Find the asesor by slug
  const asesor = useMemo(() => {
    if (!slug || !asesores.length) return null;
    return asesores.find(a => a.slug === slug) || null;
  }, [slug, asesores]);

  // Get products for this asesor
  const products = useMemo(() => {
    if (!asesor || !inventory) return [];
    const normalizedAsesorName = normalizeName(asesor.name);
    return inventory.filter(item => {
      if (!item.asesor) return false;
      return normalizeName(item.asesor) === normalizedAsesorName;
    });
  }, [asesor, inventory]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!products.length) return { totalValue: 0, avgPrice: 0, looseCount: 0, jewelryCount: 0 };

    const totalValue = products.reduce((sum, p) => sum + (p.precioCOP || 0), 0);
    const avgPrice = totalValue / products.length;
    const looseCount = products.filter(p => !p.isJewelry).length;
    const jewelryCount = products.filter(p => p.isJewelry).length;

    return { totalValue, avgPrice, looseCount, jewelryCount };
  }, [products]);

  const handleBack = () => {
    navigate('/ambassadors');
  };

  const handleProductClick = (item: InventoryItem) => {
    navigate(`/product/${item.item}`);
  };

  const handleContact = () => {
    if (asesor) {
      alert(`Contactar a ${asesor.name}\n\nEsta funcionalidad se habilitará próximamente.`);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: '#059669' }} />
      </Box>
    );
  }

  if (!asesor) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Asesor no encontrado
        </Typography>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={handleBack}
          sx={{ textTransform: 'none' }}
        >
          Volver a Asesores
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowLeft size={18} />}
        onClick={handleBack}
        sx={{
          textTransform: 'none',
          color: 'text.secondary',
          mb: 2,
          '&:hover': { color: '#059669' },
        }}
      >
        Volver a Asesores
      </Button>

      {/* Profile Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
          border: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        }}
      >
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Avatar and Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: '#059669',
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              {asesor.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {asesor.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Asesor de Esmeraldas - Tierra Madre
              </Typography>
            </Box>
          </Box>

          {/* Contact Button */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Phone size={18} />}
              onClick={handleContact}
              sx={{
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Contactar
            </Button>
          </Box>
        </Box>

        {/* Stats */}
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            mt: 3,
            pt: 3,
            borderTop: '1px solid',
            borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
            flexWrap: 'wrap',
          }}
        >
          <StatBox
            icon={<Package size={20} />}
            value={products.length.toString()}
            label="Productos"
            color="#059669"
          />
          <StatBox
            icon={<Gem size={20} />}
            value={stats.looseCount.toString()}
            label="Gemas"
            color="#3B82F6"
          />
          <StatBox
            icon={<Gem size={20} />}
            value={stats.jewelryCount.toString()}
            label="Joyería"
            color="#8B5CF6"
          />
          <StatBox
            icon={<DollarSign size={20} />}
            value={formatCurrency(stats.totalValue)}
            label="Valor Total"
            color="#F59E0B"
          />
        </Box>
      </Paper>

      {/* Products Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Catálogo de {asesor.name}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {products.length} productos disponibles
        </Typography>
      </Box>

      {products.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
          }}
        >
          <Package size={48} style={{ color: '#9CA3AF', marginBottom: 16 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Este asesor no tiene productos asignados actualmente
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {products.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.item}>
              <InventoryCard
                item={item}
                isCompact={false}
                trustScore={calculateTrustScore(item)}
                onCertClick={() => {}}
                onClick={() => handleProductClick(item)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

// Stat Box Component
function StatBox({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        bgcolor: alpha(color, isLight ? 0.1 : 0.15),
        minWidth: 120,
      }}
    >
      <Box sx={{ color }}>{icon}</Box>
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1, color }}
        >
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

// Format currency helper
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toLocaleString('es-CO')}`;
}
