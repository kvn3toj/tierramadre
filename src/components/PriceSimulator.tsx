import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  Slider,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  alpha,
} from '@mui/material';
import {
  Calculator,
  TrendingUp,
  Gem,
  CircleDollarSign,
  Award,
  FileCheck,
  Gift,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  RotateCcw,
  Info,
} from 'lucide-react';

// Investment item interface
interface InvestmentItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: number;
  unit?: string;
  unitLabel?: string;
  placeholder?: string;
}

// Pricing tier presets
const PRICING_TIERS = [
  { factor: 2.0, margin: 50, roi: 100, label: 'Mínimo', color: '#F59E0B' },
  { factor: 2.5, margin: 60, roi: 150, label: 'Base', color: '#3B82F6' },
  { factor: 3.0, margin: 66.7, roi: 200, label: 'Ideal', color: '#059669' },
  { factor: 3.5, margin: 71.4, roi: 250, label: 'Premium', color: '#8B5CF6' },
];

// Format currency in COP
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format percentage
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export default function PriceSimulator() {
  // Investment items state
  const [investments, setInvestments] = useState<InvestmentItem[]>([
    { id: 'emerald', label: 'Valor de la Esmeralda', icon: <Gem size={18} />, value: 300000, unit: 'CTs', unitLabel: 'quilates', placeholder: '0' },
    { id: 'gold', label: 'Oro (Estructura)', icon: <Award size={18} />, value: 0, unit: 'Grms', unitLabel: 'gramos', placeholder: '0' },
    { id: 'silver', label: 'Plata (Estructura)', icon: <CircleDollarSign size={18} />, value: 320000, unit: 'Grms', unitLabel: 'gramos', placeholder: '0' },
    { id: 'setting', label: 'Engaste', icon: <Sparkles size={18} />, value: 60000, placeholder: '0' },
    { id: 'certification', label: 'Certificación', icon: <FileCheck size={18} />, value: 0, placeholder: '0' },
    { id: 'packaging', label: 'Empaque', icon: <Gift size={18} />, value: 0, placeholder: '0' },
  ]);

  // Custom items
  const [customItems, setCustomItems] = useState<{ label: string; value: number }[]>([
    { label: 'Otro', value: 50000 },
  ]);

  // Price factor slider
  const [priceFactor, setPriceFactor] = useState(1.9);

  // Show advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate total investment
  const totalInvestment = useMemo(() => {
    const baseTotal = investments.reduce((sum, item) => sum + item.value, 0);
    const customTotal = customItems.reduce((sum, item) => sum + item.value, 0);
    return baseTotal + customTotal;
  }, [investments, customItems]);

  // Calculate pricing metrics
  const pricingMetrics = useMemo(() => {
    const salePrice = totalInvestment * priceFactor;
    const margin = ((salePrice - totalInvestment) / salePrice) * 100;
    const roi = ((salePrice - totalInvestment) / totalInvestment) * 100;
    const profit = salePrice - totalInvestment;

    return {
      salePrice,
      margin,
      roi,
      profit,
    };
  }, [totalInvestment, priceFactor]);

  // Get tier based on current factor
  const currentTier = useMemo(() => {
    return PRICING_TIERS.reduce((closest, tier) => {
      return Math.abs(tier.factor - priceFactor) < Math.abs(closest.factor - priceFactor)
        ? tier
        : closest;
    }, PRICING_TIERS[0]);
  }, [priceFactor]);

  // Update investment value
  const updateInvestment = (id: string, value: number) => {
    setInvestments(prev =>
      prev.map(item => (item.id === id ? { ...item, value } : item))
    );
  };

  // Update custom item
  const updateCustomItem = (index: number, field: 'label' | 'value', value: string | number) => {
    setCustomItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Add custom item
  const addCustomItem = () => {
    setCustomItems(prev => [...prev, { label: 'Otro', value: 0 }]);
  };

  // Reset all values
  const resetValues = () => {
    setInvestments(prev =>
      prev.map(item => ({ ...item, value: 0 }))
    );
    setCustomItems([{ label: 'Otro', value: 0 }]);
    setPriceFactor(2.5);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: alpha('#059669', 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <Calculator size={24} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827' }}>
              Simulador de Precios
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              Calcula el precio de venta ideal para tus esmeraldas
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Left Column - Investments */}
        <Box>
          {/* Investment Section */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: '#E5E7EB',
              bgcolor: '#FAFAFA',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#374151' }}>
                Inversión
              </Typography>
              <Tooltip title="Reiniciar valores">
                <IconButton size="small" onClick={resetValues} sx={{ color: '#9CA3AF' }}>
                  <RotateCcw size={16} />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {investments.map((item) => (
                <Box key={item.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                    <Box sx={{ color: '#6B7280' }}>{item.icon}</Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151', flex: 1 }}>
                      {item.label}
                    </Typography>
                    {item.unit && (
                      <Chip
                        label={item.unit}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          bgcolor: alpha('#059669', 0.1),
                          color: '#059669',
                        }}
                      />
                    )}
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={item.value || ''}
                    onChange={(e) => updateInvestment(item.id, Number(e.target.value) || 0)}
                    placeholder={item.placeholder}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ fontSize: '0.875rem', color: '#9CA3AF' }}>$</Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#FFFFFF',
                        fontSize: '0.875rem',
                        '& fieldset': { borderColor: '#E5E7EB' },
                        '&:hover fieldset': { borderColor: '#D1D5DB' },
                        '&.Mui-focused fieldset': { borderColor: '#059669' },
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>

            {/* Custom Items */}
            <Box sx={{ mt: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  py: 1,
                }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#6B7280' }}>
                  Costos adicionales
                </Typography>
                {showAdvanced ? <ChevronUp size={18} color="#6B7280" /> : <ChevronDown size={18} color="#6B7280" />}
              </Box>

              <Collapse in={showAdvanced}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  {customItems.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1.5 }}>
                      <TextField
                        size="small"
                        value={item.label}
                        onChange={(e) => updateCustomItem(index, 'label', e.target.value)}
                        placeholder="Concepto"
                        sx={{
                          flex: 1,
                          '& .MuiOutlinedInput-root': {
                            bgcolor: '#FFFFFF',
                            fontSize: '0.875rem',
                            '& fieldset': { borderColor: '#E5E7EB' },
                          },
                        }}
                      />
                      <TextField
                        size="small"
                        type="number"
                        value={item.value || ''}
                        onChange={(e) => updateCustomItem(index, 'value', Number(e.target.value) || 0)}
                        placeholder="0"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Typography sx={{ fontSize: '0.875rem', color: '#9CA3AF' }}>$</Typography>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          width: 150,
                          '& .MuiOutlinedInput-root': {
                            bgcolor: '#FFFFFF',
                            fontSize: '0.875rem',
                            '& fieldset': { borderColor: '#E5E7EB' },
                          },
                        }}
                      />
                    </Box>
                  ))}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      color: '#059669',
                      '&:hover': { color: '#047857' },
                    }}
                    onClick={addCustomItem}
                  >
                    <Plus size={16} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Agregar costo
                    </Typography>
                  </Box>
                </Box>
              </Collapse>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            {/* Total Investment */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827' }}>
                Total Inversión
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: '#111827',
                  fontFamily: 'monospace',
                }}
              >
                {formatCurrency(totalInvestment)}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Right Column - Pricing */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Factor Slider */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: '#E5E7EB',
              bgcolor: '#FAFAFA',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Target size={18} color="#6B7280" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#374151' }}>
                Factor sobre Inversión
              </Typography>
              <Tooltip title="Multiplicador que se aplica al total de inversión para calcular el precio de venta">
                <Info size={14} color="#9CA3AF" style={{ cursor: 'help' }} />
              </Tooltip>
            </Box>

            <Box sx={{ px: 1 }}>
              <Slider
                value={priceFactor}
                onChange={(_, value) => setPriceFactor(value as number)}
                min={1.5}
                max={4.0}
                step={0.1}
                marks={PRICING_TIERS.map(tier => ({
                  value: tier.factor,
                  label: tier.label,
                }))}
                sx={{
                  color: currentTier.color,
                  '& .MuiSlider-markLabel': {
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    color: '#9CA3AF',
                  },
                  '& .MuiSlider-thumb': {
                    width: 24,
                    height: 24,
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: `0 0 0 8px ${alpha(currentTier.color, 0.16)}`,
                    },
                  },
                  '& .MuiSlider-track': {
                    height: 6,
                    borderRadius: 3,
                  },
                  '& .MuiSlider-rail': {
                    height: 6,
                    borderRadius: 3,
                    bgcolor: '#E5E7EB',
                  },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
              <Chip
                label={`${priceFactor.toFixed(1)}x`}
                sx={{
                  bgcolor: alpha(currentTier.color, 0.12),
                  color: currentTier.color,
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  height: 40,
                  px: 2,
                }}
              />
            </Box>

            {/* Quick Select Tiers */}
            <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center' }}>
              {PRICING_TIERS.map((tier) => (
                <Chip
                  key={tier.label}
                  label={tier.label}
                  size="small"
                  onClick={() => setPriceFactor(tier.factor)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: priceFactor === tier.factor ? alpha(tier.color, 0.2) : 'transparent',
                    color: tier.color,
                    borderColor: tier.color,
                    border: '1px solid',
                    fontWeight: 600,
                    fontSize: '0.6875rem',
                    '&:hover': {
                      bgcolor: alpha(tier.color, 0.1),
                    },
                  }}
                />
              ))}
            </Box>
          </Paper>

          {/* Results Card */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '2px solid',
              borderColor: '#059669',
              bgcolor: alpha('#059669', 0.04),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <TrendingUp size={20} color="#059669" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#059669' }}>
                Precio de Venta
              </Typography>
            </Box>

            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: '#059669',
                fontFamily: 'monospace',
                letterSpacing: '-0.02em',
                mb: 3,
              }}
            >
              {formatCurrency(pricingMetrics.salePrice)}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {/* Margin */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#FFFFFF',
                  border: '1px solid',
                  borderColor: '#E5E7EB',
                  textAlign: 'center',
                }}
              >
                <Typography variant="overline" sx={{ color: '#6B7280', fontWeight: 600 }}>
                  Margen
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: '#3B82F6',
                    fontFamily: 'monospace',
                  }}
                >
                  {formatPercent(pricingMetrics.margin)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                  s/Venta
                </Typography>
              </Box>

              {/* ROI */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#FFFFFF',
                  border: '1px solid',
                  borderColor: '#E5E7EB',
                  textAlign: 'center',
                }}
              >
                <Typography variant="overline" sx={{ color: '#6B7280', fontWeight: 600 }}>
                  ROI
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: '#8B5CF6',
                    fontFamily: 'monospace',
                  }}
                >
                  {formatPercent(pricingMetrics.roi)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                  Retorno
                </Typography>
              </Box>

              {/* Profit */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#FFFFFF',
                  border: '1px solid',
                  borderColor: '#E5E7EB',
                  textAlign: 'center',
                }}
              >
                <Typography variant="overline" sx={{ color: '#6B7280', fontWeight: 600 }}>
                  Ganancia
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: '#059669',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  }}
                >
                  {formatCurrency(pricingMetrics.profit)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                  Neta
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Formula Info */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: alpha('#3B82F6', 0.06),
              border: '1px solid',
              borderColor: alpha('#3B82F6', 0.2),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Info size={18} color="#3B82F6" style={{ marginTop: 2 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E40AF', mb: 0.5 }}>
                  Fórmulas Aplicadas
                </Typography>
                <Typography variant="caption" sx={{ color: '#3B82F6', display: 'block', fontFamily: 'monospace' }}>
                  Precio = Inversión × Factor
                </Typography>
                <Typography variant="caption" sx={{ color: '#3B82F6', display: 'block', fontFamily: 'monospace' }}>
                  Margen = (Precio - Inversión) / Precio × 100
                </Typography>
                <Typography variant="caption" sx={{ color: '#3B82F6', display: 'block', fontFamily: 'monospace' }}>
                  ROI = (Precio - Inversión) / Inversión × 100
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
