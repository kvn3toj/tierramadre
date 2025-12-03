/**
 * TIERRA MADRE - Quotation Preview & Generator
 * Professional price quotation with certificate-style design
 * Beautiful frontend design first, then export to PDF
 */

import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  Divider,
  InputAdornment,
  Slider,
  Chip,
} from '@mui/material';
import {
  FileText,
  Download,
  Settings,
  Gem,
  Shield,
  Sparkles,
  Eye,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  CircleDollarSign,
  Award,
  Gift,
  FileCheck,
  DollarSign,
  Percent,
  Calculator,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Brand colors
const brandColors = {
  emerald: '#10B981',
  emeraldDark: '#064E3B',
  emeraldLight: '#34D399',
  gold: '#B48E49',
  goldLight: '#D4AF37',
  slate: '#0F172A',
  cream: '#FAF9F6',
  gray: '#64748B',
  lightGray: '#F1F5F9',
};

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Generate quotation number
const generateQuotationNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Date.now()).slice(-5);
  return `COT-${year}${month}${day}-${random}`;
};

// Investment item interface
interface InvestmentItem {
  id: string;
  label: string;
  value: number;
}

// Quotation data interface
interface QuotationData {
  quotationNumber: string;
  productName: string;
  caratWeight: number;
  investments: InvestmentItem[];
  customItems: { label: string; value: number }[];
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
}

// Default quotation data
const defaultQuotationData: QuotationData = {
  quotationNumber: generateQuotationNumber(),
  productName: 'Esmeralda Natural Colombiana',
  caratWeight: 2.5,
  investments: [
    { id: 'emerald', label: 'Valor de la Esmeralda', value: 500000 },
    { id: 'gold', label: 'Oro (Estructura)', value: 0 },
    { id: 'silver', label: 'Plata (Estructura)', value: 320000 },
    { id: 'setting', label: 'Engaste', value: 60000 },
    { id: 'certification', label: 'Certificación', value: 0 },
    { id: 'packaging', label: 'Empaque', value: 0 },
  ],
  customItems: [],
  totalInvestment: 880000,
  priceFactor: 2.5,
  salePrice: 2200000,
  margin: 60,
  roi: 150,
  profit: 1320000,
  pricePerCarat: 880000,
  date: new Date().toISOString().split('T')[0],
  validDays: 15,
  clientName: '',
  notes: '',
};

export default function QuotationPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const quotationRef = useRef<HTMLDivElement>(null);

  // Get data from navigation state or use defaults
  const passedData = location.state?.quotationData;

  const [quotationData, setQuotationData] = useState<QuotationData>(() => {
    if (passedData) {
      return {
        ...defaultQuotationData,
        ...passedData,
        quotationNumber: passedData.quotationNumber || generateQuotationNumber(),
        date: passedData.date || new Date().toISOString().split('T')[0],
      };
    }
    return defaultQuotationData;
  });

  // Calculate expiry date
  const expiryDate = new Date(quotationData.date);
  expiryDate.setDate(expiryDate.getDate() + quotationData.validDays);
  const expiryStr = expiryDate.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Export to PDF
  const handleExportPDF = async () => {
    if (!quotationRef.current) return;

    const canvas = await html2canvas(quotationRef.current, {
      scale: 2,
      backgroundColor: brandColors.slate,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const xOffset = 10;
    const yOffset = Math.max((pageHeight - imgHeight) / 2, 10);

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, Math.min(imgHeight, pageHeight - 20));
    pdf.save(`Cotizacion_${quotationData.quotationNumber}.pdf`);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Regenerate quotation number
  const regenerateQuotationNumber = () => {
    setQuotationData({ ...quotationData, quotationNumber: generateQuotationNumber() });
  };

  // Get active investments (non-zero)
  const activeInvestments = quotationData.investments.filter(inv => inv.value > 0);

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
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 0 } }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${brandColors.emeraldDark} 0%, ${brandColors.slate} 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <IconButton
                onClick={() => navigate('/simulator')}
                sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}
              >
                <ArrowLeft size={24} />
              </IconButton>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={28} color="#FFFFFF" />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
                  Cotización de Venta
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Diseña y exporta cotizaciones profesionales
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="contained"
                startIcon={<Eye size={18} />}
                onClick={handlePrint}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                }}
              >
                Imprimir
              </Button>
              <Button
                variant="contained"
                startIcon={<Download size={18} />}
                onClick={handleExportPDF}
                sx={{
                  bgcolor: brandColors.emerald,
                  '&:hover': { bgcolor: brandColors.emeraldLight },
                }}
              >
                Exportar PDF
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Configuration Panel */}
        <Paper
          elevation={0}
          sx={{
            flex: '1 1 350px',
            maxWidth: { xs: '100%', md: 400 },
            p: 3,
            borderRadius: 3,
            border: '1px solid #E5E7EB',
            bgcolor: '#FFFFFF',
            maxHeight: 'calc(100vh - 250px)',
            overflowY: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Settings size={20} color={brandColors.emerald} />
            <Typography sx={{ fontWeight: 700, color: brandColors.slate }}>
              Configuración de Cotización
            </Typography>
          </Box>

          {/* Basic Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: brandColors.gray, mb: 1.5, fontWeight: 600 }}>
              Información de Cotización
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="No. Cotización"
                value={quotationData.quotationNumber}
                onChange={(e) => setQuotationData({ ...quotationData, quotationNumber: e.target.value })}
                size="small"
              />
              <IconButton onClick={regenerateQuotationNumber} sx={{ color: brandColors.emerald }}>
                <RefreshCw size={18} />
              </IconButton>
            </Box>

            <TextField
              fullWidth
              label="Nombre del Producto"
              value={quotationData.productName}
              onChange={(e) => setQuotationData({ ...quotationData, productName: e.target.value })}
              size="small"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Cliente (Opcional)"
              value={quotationData.clientName}
              onChange={(e) => setQuotationData({ ...quotationData, clientName: e.target.value })}
              size="small"
              placeholder="Nombre del cliente"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Pricing */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: brandColors.gray, mb: 1.5, fontWeight: 600 }}>
              Precios
            </Typography>

            <TextField
              fullWidth
              label="Inversión Total"
              type="number"
              value={quotationData.totalInvestment}
              onChange={(e) => {
                const newTotal = Number(e.target.value);
                const newSalePrice = newTotal * quotationData.priceFactor;
                setQuotationData({
                  ...quotationData,
                  totalInvestment: newTotal,
                  salePrice: newSalePrice,
                  profit: newSalePrice - newTotal,
                });
              }}
              size="small"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label="Precio de Venta"
              type="number"
              value={quotationData.salePrice}
              onChange={(e) => {
                const newSalePrice = Number(e.target.value);
                setQuotationData({
                  ...quotationData,
                  salePrice: newSalePrice,
                  profit: newSalePrice - quotationData.totalInvestment,
                  margin: ((newSalePrice - quotationData.totalInvestment) / newSalePrice) * 100,
                });
              }}
              size="small"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: brandColors.gray }}>
                Quilates: {quotationData.caratWeight} ct
              </Typography>
              <Slider
                value={quotationData.caratWeight}
                onChange={(_, v) => setQuotationData({ ...quotationData, caratWeight: v as number })}
                min={0.1}
                max={20}
                step={0.1}
                sx={{ color: brandColors.emerald }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Validity */}
          <Box>
            <Typography variant="subtitle2" sx={{ color: brandColors.gray, mb: 1.5, fontWeight: 600 }}>
              Validez
            </Typography>

            <TextField
              fullWidth
              label="Fecha de Emisión"
              type="date"
              value={quotationData.date}
              onChange={(e) => setQuotationData({ ...quotationData, date: e.target.value })}
              size="small"
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />

            <Box>
              <Typography variant="caption" sx={{ color: brandColors.gray }}>
                Días de validez: {quotationData.validDays}
              </Typography>
              <Slider
                value={quotationData.validDays}
                onChange={(_, v) => setQuotationData({ ...quotationData, validDays: v as number })}
                min={3}
                max={60}
                step={1}
                sx={{ color: brandColors.gold }}
              />
            </Box>

            <TextField
              fullWidth
              label="Notas (Opcional)"
              value={quotationData.notes}
              onChange={(e) => setQuotationData({ ...quotationData, notes: e.target.value })}
              size="small"
              multiline
              rows={2}
              sx={{ mt: 2 }}
              placeholder="Notas adicionales..."
            />
          </Box>
        </Paper>

        {/* Quotation Preview */}
        <Box sx={{ flex: '1 1 500px' }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: brandColors.slate,
              minHeight: 700,
            }}
          >
            {/* The Quotation */}
            <Box
              ref={quotationRef}
              sx={{
                bgcolor: brandColors.slate,
                p: 1.5,
                borderRadius: 2,
              }}
            >
              {/* Gold outer border */}
              <Box
                sx={{
                  border: `2px solid ${brandColors.gold}`,
                  borderRadius: 1,
                  p: 0.5,
                }}
              >
                {/* Emerald inner border */}
                <Box
                  sx={{
                    border: `1px solid ${brandColors.emerald}`,
                    borderRadius: 0.5,
                  }}
                >
                  {/* White quotation area */}
                  <Box
                    sx={{
                      bgcolor: brandColors.cream,
                      p: 3,
                      minHeight: 650,
                    }}
                  >
                    {/* Quotation Number (top right) */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        {quotationData.clientName && (
                          <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
                            Cliente: <strong>{quotationData.clientName}</strong>
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray, letterSpacing: 1 }}>
                          COTIZACIÓN No.
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: brandColors.slate }}>
                          {quotationData.quotationNumber}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Logo & Brand */}
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          mx: 'auto',
                          mb: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src="/logo-tierra-madre.png"
                          alt="Tierra Madre"
                          style={{ maxWidth: '100%', maxHeight: '100%' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </Box>

                      <Typography
                        sx={{
                          fontSize: '1.5rem',
                          fontWeight: 800,
                          color: brandColors.emeraldDark,
                          letterSpacing: 2,
                        }}
                      >
                        TIERRA MADRE
                      </Typography>
                      <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray, letterSpacing: 3 }}>
                        COLOMBIAN EMERALDS
                      </Typography>

                      {/* Decorative lines */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1 }}>
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
                    <Typography sx={{ textAlign: 'center', fontSize: '0.65rem', color: brandColors.gray, mb: 2 }}>
                      Fecha de emisión: {new Date(quotationData.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>

                    {/* Product Info Section */}
                    <Box sx={{ borderTop: `1px solid ${brandColors.lightGray}`, pt: 1.5, mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: brandColors.emeraldDark }}>
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
                        {/* Gem Icon */}
                        <Box
                          sx={{
                            width: 50,
                            height: 60,
                            bgcolor: brandColors.emerald,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                          }}
                        >
                          <Sparkles size={24} color="#fff" />
                        </Box>

                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: brandColors.slate }}>
                            {quotationData.productName.toUpperCase()}
                          </Typography>
                          {quotationData.caratWeight > 0 && (
                            <Typography sx={{ fontSize: '0.75rem', color: brandColors.emerald, fontWeight: 600 }}>
                              {quotationData.caratWeight} quilates
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {/* Investment Breakdown */}
                    {activeInvestments.length > 0 && (
                      <Box sx={{ borderTop: `1px solid ${brandColors.lightGray}`, pt: 1.5, mb: 2 }}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: brandColors.emeraldDark, mb: 1 }}>
                          DETALLE DE INVERSIÓN
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {getIcon(inv.id)}
                                <Typography sx={{ fontSize: '0.6rem', color: brandColors.slate }}>
                                  {inv.label}
                                </Typography>
                              </Box>
                              <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: brandColors.slate }}>
                                {formatCurrency(inv.value)}
                              </Typography>
                            </Box>
                          ))}

                          {/* Custom items */}
                          {quotationData.customItems.map((item, idx) => item.value > 0 && (
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
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <DollarSign size={14} color={brandColors.gray} />
                                <Typography sx={{ fontSize: '0.6rem', color: brandColors.slate }}>
                                  {item.label}
                                </Typography>
                              </Box>
                              <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: brandColors.slate }}>
                                {formatCurrency(item.value)}
                              </Typography>
                            </Box>
                          ))}

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
                            <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                              INVERSIÓN TOTAL
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
                              {formatCurrency(quotationData.totalInvestment)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {/* Metrics Grid */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
                      <Box
                        sx={{
                          bgcolor: brandColors.lightGray,
                          borderRadius: 0.5,
                          p: 1,
                          textAlign: 'center',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
                          <Percent size={12} color={brandColors.emerald} />
                          <Typography sx={{ fontSize: '0.5rem', color: brandColors.gray, fontWeight: 600 }}>
                            MARGEN
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: brandColors.emerald }}>
                          {quotationData.margin.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          bgcolor: brandColors.lightGray,
                          borderRadius: 0.5,
                          p: 1,
                          textAlign: 'center',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
                          <TrendingUp size={12} color={brandColors.gold} />
                          <Typography sx={{ fontSize: '0.5rem', color: brandColors.gray, fontWeight: 600 }}>
                            ROI
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: brandColors.gold }}>
                          {quotationData.roi.toFixed(0)}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          bgcolor: brandColors.lightGray,
                          borderRadius: 0.5,
                          p: 1,
                          textAlign: 'center',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
                          <Calculator size={12} color={brandColors.emeraldDark} />
                          <Typography sx={{ fontSize: '0.5rem', color: brandColors.gray, fontWeight: 600 }}>
                            GANANCIA
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: brandColors.emeraldDark }}>
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
                      <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', mb: 0.5 }}>
                        PRECIO DE VENTA
                      </Typography>
                      <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
                        {formatCurrency(quotationData.salePrice)}
                      </Typography>
                      {quotationData.caratWeight > 0 && (
                        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
                          {formatCurrency(quotationData.salePrice / quotationData.caratWeight)} / quilate
                        </Typography>
                      )}
                    </Box>

                    {/* Notes */}
                    {quotationData.notes && (
                      <Box sx={{ mb: 2, p: 1, bgcolor: brandColors.lightGray, borderRadius: 0.5 }}>
                        <Typography sx={{ fontSize: '0.55rem', fontWeight: 600, color: brandColors.emeraldDark, mb: 0.25 }}>
                          NOTAS:
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem', color: brandColors.slate }}>
                          {quotationData.notes}
                        </Typography>
                      </Box>
                    )}

                    {/* Includes */}
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: brandColors.emeraldDark, mb: 0.5 }}>
                        INCLUYE
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                        {[
                          'Certificado de autenticidad',
                          'Garantía de origen colombiano',
                          'Evaluación gemológica',
                          'Estuche premium',
                        ].map((item) => (
                          <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Shield size={10} color={brandColors.emerald} />
                            <Typography sx={{ fontSize: '0.55rem', color: brandColors.slate }}>
                              {item}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {/* Validity */}
                    <Box sx={{ borderTop: `1px solid ${brandColors.lightGray}`, pt: 1, mb: 2 }}>
                      <Typography sx={{ textAlign: 'center', fontSize: '0.5rem', color: brandColors.gray }}>
                        Esta cotización es válida hasta: <strong>{expiryStr}</strong>
                      </Typography>
                      <Typography sx={{ textAlign: 'center', fontSize: '0.45rem', color: brandColors.gray }}>
                        Los precios están sujetos a disponibilidad. Cotización verificable en nuestra plataforma.
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
                        {Array(25).fill(0).map((_, i) => (
                          <Box
                            key={i}
                            sx={{
                              bgcolor: (i + Math.floor(i / 5)) % 2 === 0 ? brandColors.slate : 'transparent',
                              borderRadius: '1px',
                            }}
                          />
                        ))}
                      </Box>

                      {/* Contact */}
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray }}>
                          www.tierramadre.co • contacto@tierramadre.co • +57 (1) 234 5678
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: brandColors.emeraldDark, mt: 0.5 }}>
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
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
