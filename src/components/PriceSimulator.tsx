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
  Button,
  Autocomplete,
  Avatar,
  alpha,
  LinearProgress,
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
  Download,
  FileText,
  Image,
  Percent,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useEmeralds } from '../hooks/useEmeralds';
import { Emerald } from '../types';
import {
  studioColors,
  studioGradients,
  studioShadows,
  studioCardStyles,
} from './PremiumHeader';

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

// Pricing tier presets with brand colors
const PRICING_TIERS = [
  { factor: 2.0, margin: 50, roi: 100, label: 'Mínimo', color: '#64748B' },
  { factor: 2.5, margin: 60, roi: 150, label: 'Base', color: '#3B82F6' },
  { factor: 3.0, margin: 66.7, roi: 200, label: 'Ideal', color: studioColors.emerald },
  { factor: 3.5, margin: 71.4, roi: 250, label: 'Premium', color: studioColors.gold },
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
  // Get emeralds from gallery
  const { emeralds } = useEmeralds();

  // Selected emerald from gallery
  const [selectedEmerald, setSelectedEmerald] = useState<Emerald | null>(null);

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

  // Product name for quotation
  const [productName, setProductName] = useState('');

  // Export loading state
  const [isExporting, setIsExporting] = useState(false);

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
    setProductName('');
    setSelectedEmerald(null);
  };

  // Handle emerald selection from gallery
  const handleEmeraldSelect = (emerald: Emerald | null) => {
    setSelectedEmerald(emerald);
    if (emerald) {
      setProductName(emerald.name);
      if (emerald.priceCOP && emerald.priceCOP > 0) {
        updateInvestment('emerald', emerald.priceCOP);
      }
    }
  };

  // Get category label in Spanish
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      loose: 'Suelta',
      ring: 'Anillo',
      pendant: 'Dije',
      earrings: 'Aretes',
    };
    return labels[category] || category;
  };

  // Export quotation as PDF with Tierra Madre branding
  const exportQuotation = async () => {
    setIsExporting(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let y = 25;

      // Header with Tierra Madre dark background
      pdf.setFillColor(15, 23, 42); // Dark slate
      pdf.rect(0, 0, pageWidth, 48, 'F');

      // Emerald accent line at top
      pdf.setFillColor(0, 174, 122); // Brand emerald
      pdf.rect(0, 0, pageWidth, 3, 'F');

      // Brand name
      pdf.setTextColor(0, 174, 122); // Emerald
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('TM STUDIO', margin, y - 3);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TIERRA MADRE', margin, y + 5);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(255, 255, 255, 0.7);
      pdf.text('Colombian Emeralds', margin, y + 12);

      // Cotización title
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 174, 122);
      pdf.text('COTIZACIÓN', pageWidth - margin, y, { align: 'right' });

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(255, 255, 255);
      const today = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      pdf.text(today, pageWidth - margin, y + 7, { align: 'right' });

      y = 65;

      // Product name section
      if (productName) {
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(productName, margin, y);
        y += 12;
      }

      // Divider
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 15;

      // Investment breakdown section
      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DETALLE DE INVERSIÓN', margin, y);
      y += 10;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      investments.forEach(item => {
        if (item.value > 0) {
          pdf.setTextColor(15, 23, 42);
          pdf.text(item.label, margin, y);
          pdf.text(formatCurrency(item.value), pageWidth - margin, y, { align: 'right' });
          y += 7;
        }
      });

      customItems.forEach(item => {
        if (item.value > 0) {
          pdf.setTextColor(15, 23, 42);
          pdf.text(item.label, margin, y);
          pdf.text(formatCurrency(item.value), pageWidth - margin, y, { align: 'right' });
          y += 7;
        }
      });

      y += 3;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('Total Inversión', margin, y);
      pdf.text(formatCurrency(totalInvestment), pageWidth - margin, y, { align: 'right' });
      y += 20;

      // Pricing section
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y - 5, pageWidth - (margin * 2), 55, 3, 3, 'F');

      pdf.setDrawColor(0, 174, 122);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin, y - 5, pageWidth - (margin * 2), 55, 3, 3, 'S');

      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PRECIO PROPUESTO', margin + 5, y + 5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Factor aplicado: ${priceFactor.toFixed(1)}x (${currentTier.label})`, margin + 5, y + 13);

      pdf.setTextColor(0, 174, 122);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatCurrency(pricingMetrics.salePrice), margin + 5, y + 32);

      const metricsY = y + 45;
      const colWidth = (pageWidth - (margin * 2)) / 3;

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);

      pdf.text('Margen s/Venta', margin + 5, metricsY);
      pdf.setTextColor(59, 130, 246);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatPercent(pricingMetrics.margin), margin + 5, metricsY + 6);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text('ROI', margin + colWidth + 5, metricsY);
      pdf.setTextColor(139, 92, 246);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatPercent(pricingMetrics.roi), margin + colWidth + 5, metricsY + 6);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text('Ganancia Neta', margin + (colWidth * 2) + 5, metricsY);
      pdf.setTextColor(0, 174, 122);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatCurrency(pricingMetrics.profit), margin + (colWidth * 2) + 5, metricsY + 6);

      // Footer
      const footerY = pdf.internal.pageSize.getHeight() - 25;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(148, 163, 184);
      pdf.text('Esta cotización es válida por 15 días a partir de la fecha de emisión.', margin, footerY);
      pdf.text('Precios en Pesos Colombianos (COP). No incluye IVA.', margin, footerY + 5);

      pdf.setTextColor(0, 174, 122);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Tierra Madre - Colombian Emeralds', pageWidth - margin, footerY + 5, { align: 'right' });

      const fileName = productName
        ? `Cotizacion_${productName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
        : `Cotizacion_TierraMadre_${new Date().toISOString().split('T')[0]}.pdf`;

      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const marginProgress = Math.min((pricingMetrics.margin / 75) * 100, 100);

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      {/* Jewelry Studio Header */}
      <Box
        sx={{
          mb: 4,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: studioShadows.lg,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 0,
            background: studioGradients.header,
            position: 'relative',
            overflow: 'hidden',
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
              background: studioGradients.emerald,
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 300,
              height: '100%',
              background: `radial-gradient(circle at 100% 0%, ${alpha(studioColors.emerald, 0.08)} 0%, transparent 60%)`,
              pointerEvents: 'none',
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2.5,
                  background: alpha(studioColors.emerald, 0.15),
                  border: `1px solid ${alpha(studioColors.emerald, 0.3)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calculator size={26} color={studioColors.emerald} />
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    color: studioColors.emerald,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    fontSize: '0.625rem',
                    display: 'block',
                    mb: 0.25,
                  }}
                >
                  TM STUDIO
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 600,
                    color: '#FFFFFF',
                    fontFamily: '"Libre Baskerville", Georgia, serif',
                    letterSpacing: '-0.02em',
                    fontSize: '1.5rem',
                  }}
                >
                  Simulador de Precios
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: alpha('#FFFFFF', 0.7),
                    fontWeight: 400,
                    fontSize: '0.875rem',
                  }}
                >
                  Calcula el precio de venta ideal para tus esmeraldas
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Download size={18} />}
              onClick={exportQuotation}
              disabled={isExporting || totalInvestment === 0}
              sx={{
                background: studioGradients.emerald,
                color: '#FFFFFF',
                fontWeight: 600,
                px: 3,
                py: 1.25,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '0.875rem',
                boxShadow: studioShadows.emerald,
                '&:hover': {
                  background: `linear-gradient(135deg, ${studioColors.emeraldLight} 0%, ${studioColors.emerald} 100%)`,
                  boxShadow: `0 6px 20px ${alpha(studioColors.emerald, 0.35)}`,
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: alpha('#FFFFFF', 0.1),
                  color: alpha('#FFFFFF', 0.4),
                },
                transition: 'all 0.2s ease',
              }}
            >
              {isExporting ? 'Exportando...' : 'Exportar Cotización'}
            </Button>
          </Box>
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Left Column - Investments */}
        <Box>
          <Paper elevation={0} sx={{ ...studioCardStyles.card }}>
            {/* Product Name Field */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <FileText size={18} color={studioColors.emerald} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: studioColors.emerald }}>
                    Nombre del Producto
                  </Typography>
                </Box>
                {emeralds.length > 0 && (
                  <Chip
                    icon={<Image size={12} />}
                    label={`${emeralds.length} en galería`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.625rem',
                      fontWeight: 500,
                      bgcolor: alpha(studioColors.emerald, 0.1),
                      color: studioColors.emerald,
                      '& .MuiChip-icon': { color: studioColors.emerald },
                    }}
                  />
                )}
              </Box>
              <Autocomplete
                freeSolo
                options={emeralds}
                value={selectedEmerald}
                inputValue={productName}
                onInputChange={(_, newValue) => setProductName(newValue)}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    setProductName(newValue);
                    setSelectedEmerald(null);
                  } else {
                    handleEmeraldSelect(newValue);
                  }
                }}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.name;
                }}
                renderOption={(props, option) => (
                  <Box
                    component="li"
                    {...props}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      py: 1,
                      '&:hover': { bgcolor: alpha(studioColors.emerald, 0.06) },
                    }}
                  >
                    <Avatar
                      src={option.imageUrl}
                      variant="rounded"
                      sx={{ width: 40, height: 40, borderRadius: 1.5 }}
                    >
                      <Gem size={20} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: studioColors.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {option.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: studioColors.textSecondary }}>
                          {getCategoryLabel(option.category)}
                        </Typography>
                        {option.weightCarats && (
                          <Typography variant="caption" sx={{ color: studioColors.emerald, fontWeight: 500 }}>
                            {option.weightCarats} ct
                          </Typography>
                        )}
                        {option.priceCOP && option.priceCOP > 0 && (
                          <Typography variant="caption" sx={{ color: '#3B82F6', fontWeight: 500 }}>
                            {formatCurrency(option.priceCOP)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder={emeralds.length > 0 ? "Escribe o selecciona de la galería..." : "Ej: Anillo Esmeralda Colombiana 2.5ct"}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: studioColors.surface,
                        fontSize: '0.875rem',
                        '& fieldset': { borderColor: studioColors.border },
                        '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.5) },
                        '&.Mui-focused fieldset': { borderColor: studioColors.emerald, borderWidth: 2 },
                      },
                    }}
                  />
                )}
                PaperComponent={(props) => (
                  <Paper
                    {...props}
                    sx={{
                      mt: 0.5,
                      boxShadow: studioShadows.lg,
                      border: `1px solid ${studioColors.border}`,
                      borderRadius: 2,
                    }}
                  />
                )}
                noOptionsText={
                  <Box sx={{ py: 2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: studioColors.textSecondary }}>
                      No hay esmeraldas en la galería
                    </Typography>
                    <Typography variant="caption" sx={{ color: studioColors.textMuted }}>
                      Agrega esmeraldas en la sección "Subir"
                    </Typography>
                  </Box>
                }
              />
              {selectedEmerald && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 1,
                    p: 1,
                    bgcolor: alpha(studioColors.emerald, 0.06),
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(studioColors.emerald, 0.2)}`,
                  }}
                >
                  <Avatar
                    src={selectedEmerald.imageUrl}
                    variant="rounded"
                    sx={{ width: 32, height: 32, borderRadius: 1 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: studioColors.emerald, fontWeight: 600 }}>
                      Seleccionado de galería
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedEmerald(null);
                      setProductName('');
                    }}
                    sx={{ color: studioColors.textMuted, '&:hover': { color: '#EF4444' } }}
                  >
                    <RotateCcw size={14} />
                  </IconButton>
                </Box>
              )}
            </Box>

            <Divider sx={{ borderColor: studioColors.border, mb: 2.5 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography variant="subtitle1" sx={{ ...studioCardStyles.sectionTitle }}>
                Inversión
              </Typography>
              <Tooltip title="Reiniciar valores">
                <IconButton size="small" onClick={resetValues} sx={{ color: studioColors.textMuted }}>
                  <RotateCcw size={16} />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {investments.map((item) => (
                <Box key={item.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                    <Box sx={{ color: studioColors.textSecondary }}>{item.icon}</Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: studioColors.textPrimary, flex: 1 }}>
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
                          bgcolor: alpha(studioColors.emerald, 0.1),
                          color: studioColors.emerald,
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
                          <Typography sx={{ fontSize: '0.875rem', color: studioColors.textMuted }}>$</Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: studioColors.surface,
                        fontSize: '0.875rem',
                        '& fieldset': { borderColor: studioColors.border },
                        '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.4) },
                        '&.Mui-focused fieldset': { borderColor: studioColors.emerald },
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
                <Typography variant="body2" sx={{ fontWeight: 600, color: studioColors.textSecondary }}>
                  Costos adicionales
                </Typography>
                {showAdvanced ? <ChevronUp size={18} color={studioColors.textSecondary} /> : <ChevronDown size={18} color={studioColors.textSecondary} />}
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
                            bgcolor: studioColors.surface,
                            fontSize: '0.875rem',
                            '& fieldset': { borderColor: studioColors.border },
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
                              <Typography sx={{ fontSize: '0.875rem', color: studioColors.textMuted }}>$</Typography>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          width: 150,
                          '& .MuiOutlinedInput-root': {
                            bgcolor: studioColors.surface,
                            fontSize: '0.875rem',
                            '& fieldset': { borderColor: studioColors.border },
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
                      color: studioColors.emerald,
                      '&:hover': { color: studioColors.emeraldLight },
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

            <Divider sx={{ borderColor: studioColors.border, my: 2.5 }} />

            {/* Total Investment */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: studioColors.textPrimary }}>
                Total Inversión
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: studioColors.textPrimary,
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
          <Paper elevation={0} sx={{ ...studioCardStyles.card, position: 'relative', overflow: 'hidden' }}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 150,
                height: 150,
                background: `radial-gradient(circle, ${alpha(currentTier.color, 0.06)} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, position: 'relative' }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: alpha(currentTier.color, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Target size={18} color={currentTier.color} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: studioColors.textPrimary }}>
                  Factor sobre Inversión
                </Typography>
                <Typography variant="caption" sx={{ color: studioColors.textSecondary }}>
                  Multiplicador de precio
                </Typography>
              </Box>
              <Tooltip title="Multiplicador que se aplica al total de inversión para calcular el precio de venta">
                <IconButton size="small" sx={{ color: studioColors.textMuted }}>
                  <Info size={16} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Large Factor Display */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3, mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 0.5,
                  px: 4,
                  py: 2,
                  borderRadius: 3,
                  bgcolor: alpha(currentTier.color, 0.08),
                  border: `2px solid ${alpha(currentTier.color, 0.2)}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '3rem',
                    fontWeight: 800,
                    color: currentTier.color,
                    lineHeight: 1,
                    fontFamily: 'monospace',
                  }}
                >
                  {priceFactor.toFixed(1)}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: currentTier.color,
                    opacity: 0.7,
                  }}
                >
                  x
                </Typography>
              </Box>
            </Box>

            <Box sx={{ px: 2, mb: 3 }}>
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
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: studioColors.textMuted,
                    top: 30,
                  },
                  '& .MuiSlider-mark': {
                    bgcolor: studioColors.border,
                    height: 12,
                    width: 2,
                    borderRadius: 1,
                  },
                  '& .MuiSlider-thumb': {
                    width: 24,
                    height: 24,
                    boxShadow: `0 2px 8px ${alpha(currentTier.color, 0.4)}`,
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: `0 0 0 6px ${alpha(currentTier.color, 0.16)}, 0 2px 8px ${alpha(currentTier.color, 0.4)}`,
                    },
                  },
                  '& .MuiSlider-track': {
                    height: 6,
                    borderRadius: 3,
                    border: 'none',
                  },
                  '& .MuiSlider-rail': {
                    height: 6,
                    borderRadius: 3,
                    bgcolor: studioColors.border,
                    opacity: 1,
                  },
                }}
              />
            </Box>

            {/* Quick Select Tiers */}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              {PRICING_TIERS.map((tier) => (
                <Chip
                  key={tier.label}
                  label={tier.label}
                  onClick={() => setPriceFactor(tier.factor)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: Math.abs(priceFactor - tier.factor) < 0.05 ? tier.color : alpha(tier.color, 0.1),
                    color: Math.abs(priceFactor - tier.factor) < 0.05 ? '#FFFFFF' : tier.color,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 28,
                    border: '1px solid',
                    borderColor: Math.abs(priceFactor - tier.factor) < 0.05 ? tier.color : alpha(tier.color, 0.3),
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: Math.abs(priceFactor - tier.factor) < 0.05 ? tier.color : alpha(tier.color, 0.15),
                      transform: 'translateY(-1px)',
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
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${studioColors.border}`,
              boxShadow: studioShadows.emerald,
            }}
          >
            {/* Main Price Section */}
            <Box
              sx={{
                p: 3,
                background: studioGradients.header,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: studioGradients.emerald,
                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  top: -100,
                  right: -100,
                  width: 250,
                  height: 250,
                  borderRadius: '50%',
                  background: alpha(studioColors.emerald, 0.08),
                  pointerEvents: 'none',
                }}
              />

              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: alpha(studioColors.emerald, 0.2),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp size={18} color={studioColors.emerald} />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: alpha('#FFFFFF', 0.9) }}>
                    Precio de Venta Sugerido
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography
                    sx={{
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      color: studioColors.emerald,
                      fontFamily: 'monospace',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {formatCurrency(pricingMetrics.salePrice)}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      bgcolor: alpha(studioColors.emerald, 0.15),
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                    }}
                  >
                    <ArrowUpRight size={14} color={studioColors.emerald} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: studioColors.emerald }}>
                      {priceFactor.toFixed(1)}x
                    </Typography>
                  </Box>
                </Box>

                {/* Margin Progress Bar */}
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.7), fontWeight: 500 }}>
                      Margen de ganancia
                    </Typography>
                    <Typography variant="caption" sx={{ color: studioColors.emerald, fontWeight: 600 }}>
                      {formatPercent(pricingMetrics.margin)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={marginProgress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha('#FFFFFF', 0.15),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        background: studioGradients.emerald,
                      },
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Metrics Grid */}
            <Box sx={{ p: 2.5, bgcolor: studioColors.surface }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                {/* Margin */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha('#3B82F6', 0.06),
                    textAlign: 'center',
                    border: `1px solid ${alpha('#3B82F6', 0.1)}`,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: alpha('#3B82F6', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <Percent size={16} color="#3B82F6" />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#3B82F6',
                      fontFamily: 'monospace',
                      lineHeight: 1,
                      mb: 0.5,
                    }}
                  >
                    {formatPercent(pricingMetrics.margin)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontWeight: 500 }}>
                    Margen s/Venta
                  </Typography>
                </Box>

                {/* ROI */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha('#8B5CF6', 0.06),
                    textAlign: 'center',
                    border: `1px solid ${alpha('#8B5CF6', 0.1)}`,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: alpha('#8B5CF6', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <TrendingUp size={16} color="#8B5CF6" />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#8B5CF6',
                      fontFamily: 'monospace',
                      lineHeight: 1,
                      mb: 0.5,
                    }}
                  >
                    {formatPercent(pricingMetrics.roi)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontWeight: 500 }}>
                    ROI (Retorno)
                  </Typography>
                </Box>

                {/* Profit */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(studioColors.emerald, 0.06),
                    textAlign: 'center',
                    border: `1px solid ${alpha(studioColors.emerald, 0.1)}`,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: alpha(studioColors.emerald, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <DollarSign size={16} color={studioColors.emerald} />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: studioColors.emerald,
                      fontFamily: 'monospace',
                      lineHeight: 1.2,
                      mb: 0.5,
                    }}
                  >
                    {formatCurrency(pricingMetrics.profit)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontWeight: 500 }}>
                    Ganancia Neta
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Formula Info */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              bgcolor: studioColors.surfaceMuted,
              border: `1px solid ${studioColors.border}`,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1.5,
                  bgcolor: alpha('#3B82F6', 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Info size={14} color="#3B82F6" />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#3B82F6' }}>
                Fórmulas Aplicadas
              </Typography>
            </Box>
            <Box
              sx={{
                px: 2,
                pb: 2,
                pt: 0,
                borderTop: `1px solid ${studioColors.border}`,
                bgcolor: studioColors.surface,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pt: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    Precio = Inversión × Factor
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#8B5CF6' }} />
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    Margen = (Precio - Inversión) / Precio × 100
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: studioColors.emerald }} />
                  <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    ROI = (Precio - Inversión) / Inversión × 100
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
