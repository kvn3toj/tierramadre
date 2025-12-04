/**
 * TIERRA MADRE - Cotización Generator
 * Professional quotation generator selecting from inventory stock
 * Beautiful certificate-style design without simulator calculations
 */

import { useState, useRef } from 'react';
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
  Snackbar,
  Alert,
  Autocomplete,
  Avatar,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import {
  FileText,
  Download,
  Settings,
  Gem,
  Shield,
  RefreshCw,
  Plus,
  Trash2,
  Package,
  ShoppingBag,
  Printer,
  Copy,
  Layers,
  Sparkles,
  Award,
  CircleDollarSign,
  FileCheck,
  Gift,
  DollarSign,
  RotateCcw,
  User,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { documentColors, documentShadows } from '../design-system/tokens';
import { useInventory } from '../hooks/useInventory';
import { InventoryItem } from '../types';
import { SAMPLE_AMBASSADORS } from '../data/ambassadors';

// Brand colors from design system
const brandColors = {
  emerald: documentColors.emerald.primary,
  emeraldDark: documentColors.emerald.deep,
  emeraldLight: documentColors.emerald.light,
  gold: documentColors.gold.primary,
  goldLight: documentColors.gold.light,
  background: documentColors.background.container,
  cream: documentColors.background.paper,
  gray: documentColors.text.secondary,
  lightGray: '#F1F5F9',
  textPrimary: documentColors.text.primary,
  border: documentColors.border.default,
};

// Format currency
const formatCurrency = (amount: number, currency: 'COP' | 'USD' = 'COP'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
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

// Generate product URL slug from name
const generateProductSlug = (name: string): string => {
  return name
    .replace(/^[A-Z]:[A-Z]\s*/i, '') // Remove prefixes like "L:A ", "L:B ", etc.
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Remove multiple hyphens
};

// Cotización product interface
interface CotizacionProduct {
  id: string;
  itemNumber: number;
  name: string;
  peso: string | number;
  color: string;
  calidad: string;
  talla: string;
  precioCOP: number;
  imagen?: string;
  isJewelry: boolean;
  metalType?: string;
}

// Business settings interface
interface BusinessSettings {
  contactPhone: string;
  contactEmail: string;
  nit: string;
  footerMessage: string;
  footerNote: string;
}

// Investment item interface
interface InvestmentItem {
  id: string;
  label: string;
  value: number;
  icon: string;
}

// Custom cost interface
interface CustomCost {
  id: string;
  label: string;
  value: number;
}

// Default investments
const defaultInvestments: InvestmentItem[] = [
  { id: 'emerald', label: 'Valor de la Esmeralda', value: 0, icon: 'emerald' },
  { id: 'gold', label: 'Oro (Estructura)', value: 0, icon: 'gold' },
  { id: 'silver', label: 'Plata (Estructura)', value: 0, icon: 'silver' },
  { id: 'setting', label: 'Engaste', value: 0, icon: 'setting' },
  { id: 'certification', label: 'Certificación', value: 0, icon: 'certification' },
  { id: 'packaging', label: 'Empaque', value: 0, icon: 'packaging' },
];

export default function CotizacionGenerator() {
  const quotationRef = useRef<HTMLDivElement>(null);
  const { inventory } = useInventory();

  // Filter available inventory
  const availableInventory = inventory.filter(item => item.estado === 'DISPONIBLE');

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Quotation state
  const [quotationNumber, setQuotationNumber] = useState(generateQuotationNumber);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientDocument, setClientDocument] = useState('');
  const [asesorName, setAsesorName] = useState('');

  // Get asesor names from ambassadors
  const asesorOptions = SAMPLE_AMBASSADORS.map(amb => amb.displayName);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validDays, setValidDays] = useState(15);
  const [notes, setNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  // Products state
  const [products, setProducts] = useState<CotizacionProduct[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Product entry mode: 'inventory' | 'manual'
  const [productEntryMode, setProductEntryMode] = useState<'inventory' | 'manual'>('inventory');

  // Manual product entry state
  const [manualProduct, setManualProduct] = useState({
    name: '',
    peso: '',
    color: '',
    calidad: '',
    talla: '',
    precioCOP: 0,
    isJewelry: false,
    metalType: '',
  });

  // Investment state
  const [investments, setInvestments] = useState<InvestmentItem[]>(defaultInvestments);
  const [customCosts, setCustomCosts] = useState<CustomCost[]>([]);
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomValue, setNewCustomValue] = useState<number>(0);

  // Business settings
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    contactPhone: '+57 310 XXX XXXX',
    contactEmail: 'info@tierramadre.co',
    nit: 'NIT: 900.XXX.XXX-X',
    footerMessage: 'Gracias por su preferencia',
    footerNote: 'Esta cotización es válida por el tiempo indicado. Los precios están sujetos a disponibilidad. Las esmeraldas Tierra Madre cuentan con certificado de origen y autenticidad.',
  });

  // Calculate investment total
  const investmentTotal = investments.reduce((sum, inv) => sum + inv.value, 0);
  const customCostsTotal = customCosts.reduce((sum, cost) => sum + cost.value, 0);
  const totalInvestment = investmentTotal + customCostsTotal;

  // Calculate totals
  const productSubtotal = products.reduce((sum, p) => sum + p.precioCOP, 0);
  const subtotal = productSubtotal + totalInvestment;
  const discount = subtotal * (discountPercent / 100);
  const total = subtotal - discount;

  // Calculate expiry date
  const expiryDate = new Date(date);
  expiryDate.setDate(expiryDate.getDate() + validDays);
  const expiryStr = expiryDate.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Add product from inventory
  const handleAddProduct = () => {
    if (!selectedItem) return;

    const product: CotizacionProduct = {
      id: crypto.randomUUID(),
      itemNumber: selectedItem.item,
      name: selectedItem.nombre,
      peso: selectedItem.peso,
      color: selectedItem.color,
      calidad: selectedItem.calidad,
      talla: selectedItem.talla,
      precioCOP: selectedItem.precioCOP,
      imagen: selectedItem.imagen,
      isJewelry: selectedItem.isJewelry,
      metalType: selectedItem.metalType,
    };

    setProducts([...products, product]);
    setSelectedItem(null);
  };

  // Add manual product
  const handleAddManualProduct = () => {
    if (!manualProduct.name || manualProduct.precioCOP <= 0) return;

    const product: CotizacionProduct = {
      id: crypto.randomUUID(),
      itemNumber: Date.now() % 10000, // Generate a temp item number
      name: manualProduct.name,
      peso: manualProduct.peso || '-',
      color: manualProduct.color || '-',
      calidad: manualProduct.calidad || '-',
      talla: manualProduct.talla || '-',
      precioCOP: manualProduct.precioCOP,
      isJewelry: manualProduct.isJewelry,
      metalType: manualProduct.metalType,
    };

    setProducts([...products, product]);
    // Reset manual form
    setManualProduct({
      name: '',
      peso: '',
      color: '',
      calidad: '',
      talla: '',
      precioCOP: 0,
      isJewelry: false,
      metalType: '',
    });
  };

  // Remove product
  const handleRemoveProduct = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  // Regenerate quotation number
  const regenerateQuotationNumber = () => {
    setQuotationNumber(generateQuotationNumber());
  };

  // Update investment value
  const handleInvestmentChange = (id: string, value: number) => {
    setInvestments(investments.map(inv =>
      inv.id === id ? { ...inv, value } : inv
    ));
  };

  // Reset investments
  const handleResetInvestments = () => {
    setInvestments(defaultInvestments);
    setCustomCosts([]);
  };

  // Add custom cost
  const handleAddCustomCost = () => {
    if (!newCustomLabel || newCustomValue <= 0) return;
    setCustomCosts([
      ...customCosts,
      { id: crypto.randomUUID(), label: newCustomLabel, value: newCustomValue }
    ]);
    setNewCustomLabel('');
    setNewCustomValue(0);
  };

  // Remove custom cost
  const handleRemoveCustomCost = (id: string) => {
    setCustomCosts(customCosts.filter(c => c.id !== id));
  };

  // Reset form
  const handleNewQuotation = () => {
    setQuotationNumber(generateQuotationNumber());
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientDocument('');
    setAsesorName('');
    setDate(new Date().toISOString().split('T')[0]);
    setValidDays(15);
    setNotes('');
    setDiscountPercent(0);
    setProducts([]);
    setSelectedItem(null);
    setInvestments(defaultInvestments);
    setCustomCosts([]);
  };

  // Get investment icon
  const getInvestmentIcon = (iconId: string) => {
    const icons: Record<string, React.ReactNode> = {
      emerald: <Gem size={16} color={brandColors.emerald} />,
      gold: <Award size={16} color={brandColors.gold} />,
      silver: <CircleDollarSign size={16} color="#9CA3AF" />,
      setting: <Sparkles size={16} color={brandColors.emerald} />,
      certification: <FileCheck size={16} color={brandColors.emeraldDark} />,
      packaging: <Gift size={16} color={brandColors.gold} />,
    };
    return icons[iconId] || <DollarSign size={16} color={brandColors.gray} />;
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!quotationRef.current) return;

    try {
      const canvas = await html2canvas(quotationRef.current, {
        scale: 3,
        backgroundColor: brandColors.background,
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
      pdf.save(`Cotizacion_${quotationNumber}.pdf`);

      setSnackbar({
        open: true,
        message: `✅ Cotización ${quotationNumber} exportada exitosamente`,
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '❌ Error al exportar la cotización. Intenta de nuevo.',
        severity: 'error',
      });
      console.error('PDF export error:', error);
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Get peso display string
  const getPesoDisplay = (item: CotizacionProduct | InventoryItem): string => {
    if (item.isJewelry) {
      return item.metalType || 'Joya';
    }
    return typeof item.peso === 'number' ? `${item.peso} ct` : item.peso;
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
          background: `linear-gradient(135deg, ${brandColors.emeraldDark} 0%, ${brandColors.textPrimary} 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
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
                  Selecciona productos del inventario
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  textAlign: 'center',
                  minWidth: 80,
                }}
              >
                <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                  {products.length}
                </Typography>
                <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                  Productos
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(10px)',
                  textAlign: 'center',
                  minWidth: 120,
                }}
              >
                <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                  {formatCurrency(total)}
                </Typography>
                <Typography sx={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                  Total
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Form Section */}
        <Paper
          elevation={0}
          sx={{
            flex: '1 1 400px',
            p: 3,
            borderRadius: 3,
            border: '1px solid #E5E7EB',
            bgcolor: '#FFFFFF',
            maxHeight: 'calc(100vh - 250px)',
            overflowY: 'auto',
          }}
        >
          {/* Quotation Settings */}
          <Accordion
            defaultExpanded={false}
            sx={{
              bgcolor: 'transparent',
              boxShadow: 'none',
              '&:before': { display: 'none' },
              mb: 2,
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#6B7280' }} />}
              sx={{
                bgcolor: '#F9FAFB',
                borderRadius: 1,
                minHeight: 40,
                '& .MuiAccordionSummary-content': { my: 1 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Settings size={16} color="#6B7280" />
                <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
                  Configuración de Cotización
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: '#F9FAFB', borderRadius: 1, mt: 0.5, p: 2 }}>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      label="No. Cotización"
                      value={quotationNumber}
                      onChange={(e) => setQuotationNumber(e.target.value)}
                      size="small"
                    />
                    <IconButton onClick={regenerateQuotationNumber} sx={{ color: brandColors.emerald }}>
                      <RefreshCw size={18} />
                    </IconButton>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Fecha"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Teléfono de Contacto"
                    value={businessSettings.contactPhone}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, contactPhone: e.target.value })}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email de Contacto"
                    value={businessSettings.contactEmail}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, contactEmail: e.target.value })}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="NIT"
                    value={businessSettings.nit}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, nit: e.target.value })}
                    size="small"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Client Information */}
          <Typography variant="subtitle2" sx={{ color: 'grey.500', mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
            Información del Cliente
          </Typography>

          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre del Cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Documento (Cédula/Pasaporte)"
                value={clientDocument}
                onChange={(e) => setClientDocument(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                size="small"
                options={asesorOptions}
                value={asesorName}
                onChange={(_, value) => setAsesorName(value || '')}
                onInputChange={(_, value) => setAsesorName(value)}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(brandColors.emerald, 0.15) }}>
                      <User size={16} color={brandColors.emerald} />
                    </Avatar>
                    <Typography variant="body2" fontWeight={500}>{option}</Typography>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Asesor"
                    placeholder="Seleccionar o escribir nombre del asesor"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <User size={16} color={brandColors.gray} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Add Product Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'grey.500', mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
              Agregar Producto
            </Typography>

            {/* Toggle between Inventory and Manual */}
            <ToggleButtonGroup
              value={productEntryMode}
              exclusive
              onChange={(_, value) => value && setProductEntryMode(value)}
              size="small"
              sx={{ mb: 2, width: '100%' }}
            >
              <ToggleButton
                value="inventory"
                sx={{
                  flex: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  '&.Mui-selected': {
                    bgcolor: alpha(brandColors.emerald, 0.1),
                    color: brandColors.emerald,
                    '&:hover': { bgcolor: alpha(brandColors.emerald, 0.15) },
                  },
                }}
              >
                <Package size={14} style={{ marginRight: 6 }} />
                Desde Inventario
              </ToggleButton>
              <ToggleButton
                value="manual"
                sx={{
                  flex: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  '&.Mui-selected': {
                    bgcolor: alpha(brandColors.gold, 0.15),
                    color: brandColors.gold,
                    '&:hover': { bgcolor: alpha(brandColors.gold, 0.2) },
                  },
                }}
              >
                <FileText size={14} style={{ marginRight: 6 }} />
                Entrada Manual
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Inventory Selection Mode */}
          {productEntryMode === 'inventory' && (
            <>
              <Autocomplete
                size="small"
                options={availableInventory}
                getOptionLabel={(option) => `#${option.item} - ${option.nombre}`}
                value={selectedItem}
                onChange={(_, item) => setSelectedItem(item)}
                filterOptions={(options, { inputValue }) => {
                  const searchTerm = inputValue.toLowerCase();
                  return options.filter(option =>
                    option.nombre.toLowerCase().includes(searchTerm) ||
                    option.item.toString().includes(searchTerm) ||
                    option.color.toLowerCase().includes(searchTerm) ||
                    option.talla.toLowerCase().includes(searchTerm)
                  );
                }}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1 }}>
                    <Avatar
                      src={option.imagen}
                      variant="rounded"
                      sx={{ width: 48, height: 48, bgcolor: brandColors.lightGray }}
                    >
                      {option.isJewelry ? <ShoppingBag size={20} /> : <Gem size={20} />}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        #{option.item} - {option.nombre}
                      </Typography>
                      <Typography variant="caption" color="grey.500">
                        {getPesoDisplay(option)} • {option.color} • {option.talla}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ color: brandColors.emerald, fontWeight: 700 }}>
                        {formatCurrency(option.precioCOP)}
                      </Typography>
                      <Chip
                        label={option.isJewelry ? 'Joya' : 'Gema'}
                        size="small"
                        sx={{
                          fontSize: '0.65rem',
                          height: 20,
                          bgcolor: option.isJewelry ? alpha(brandColors.gold, 0.15) : alpha(brandColors.emerald, 0.15),
                          color: option.isJewelry ? brandColors.gold : brandColors.emerald,
                        }}
                      />
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar en inventario"
                    placeholder="Nombre, número, color..."
                  />
                )}
                noOptionsText="No hay productos disponibles"
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth
                variant="outlined"
                startIcon={<Plus size={18} />}
                onClick={handleAddProduct}
                disabled={!selectedItem}
                sx={{
                  borderColor: brandColors.emerald,
                  color: brandColors.emerald,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.25,
                  borderRadius: 2,
                  mb: 3,
                  '&:hover': {
                    borderColor: brandColors.emeraldDark,
                    bgcolor: alpha(brandColors.emerald, 0.05),
                  },
                }}
              >
                Agregar del Inventario
              </Button>
            </>
          )}

          {/* Manual Entry Mode */}
          {productEntryMode === 'manual' && (
            <Box sx={{ bgcolor: '#F9FAFB', p: 2, borderRadius: 2, mb: 3 }}>
              <Grid container spacing={1.5}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre del producto *"
                    value={manualProduct.name}
                    onChange={(e) => setManualProduct({ ...manualProduct, name: e.target.value })}
                    size="small"
                    placeholder="Ej: Esmeralda Corazón Verde"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={manualProduct.isJewelry}
                        onChange={(e) => setManualProduct({ ...manualProduct, isJewelry: e.target.checked })}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: brandColors.gold,
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: brandColors.gold,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', color: brandColors.gray }}>
                        Es joya (no esmeralda suelta)
                      </Typography>
                    }
                  />
                </Grid>
                {manualProduct.isJewelry ? (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Tipo de metal"
                      value={manualProduct.metalType}
                      onChange={(e) => setManualProduct({ ...manualProduct, metalType: e.target.value })}
                      size="small"
                      placeholder="Ej: Oro 18k, Plata 925"
                    />
                  </Grid>
                ) : (
                  <>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Peso (ct)"
                        value={manualProduct.peso}
                        onChange={(e) => setManualProduct({ ...manualProduct, peso: e.target.value })}
                        size="small"
                        placeholder="Ej: 2.5"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Color"
                        value={manualProduct.color}
                        onChange={(e) => setManualProduct({ ...manualProduct, color: e.target.value })}
                        size="small"
                        placeholder="Ej: Verde Intenso"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Calidad"
                        value={manualProduct.calidad}
                        onChange={(e) => setManualProduct({ ...manualProduct, calidad: e.target.value })}
                        size="small"
                        placeholder="Ej: AAA"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Talla"
                        value={manualProduct.talla}
                        onChange={(e) => setManualProduct({ ...manualProduct, talla: e.target.value })}
                        size="small"
                        placeholder="Ej: Óvalo"
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Precio COP *"
                    type="number"
                    value={manualProduct.precioCOP || ''}
                    onChange={(e) => setManualProduct({ ...manualProduct, precioCOP: parseFloat(e.target.value) || 0 })}
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
              </Grid>

              <Button
                fullWidth
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={handleAddManualProduct}
                disabled={!manualProduct.name || manualProduct.precioCOP <= 0}
                sx={{
                  mt: 2,
                  bgcolor: brandColors.gold,
                  color: '#fff',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.25,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: '#B8941F',
                  },
                  '&.Mui-disabled': {
                    bgcolor: alpha(brandColors.gold, 0.3),
                    color: 'rgba(255,255,255,0.6)',
                  },
                }}
              >
                Agregar Producto Manual
              </Button>
            </Box>
          )}

          {/* Product List */}
          {products.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Layers size={16} color={brandColors.emerald} />
                <Typography variant="subtitle2" sx={{ color: 'grey.500' }}>
                  Productos Seleccionados ({products.length})
                </Typography>
              </Box>
              {products.map((product) => (
                <Box
                  key={product.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1.5,
                    px: 1.5,
                    mb: 1,
                    bgcolor: '#F9FAFB',
                    borderRadius: 1.5,
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      src={product.imagen}
                      variant="rounded"
                      sx={{ width: 40, height: 40, bgcolor: brandColors.lightGray }}
                    >
                      {product.isJewelry ? <ShoppingBag size={16} /> : <Gem size={16} />}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        #{product.itemNumber} - {product.name}
                      </Typography>
                      <Typography variant="caption" color="grey.500">
                        {getPesoDisplay(product)} • {product.color}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: brandColors.emerald, fontWeight: 700 }}>
                      {formatCurrency(product.precioCOP)}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveProduct(product.id)}
                      sx={{
                        color: '#9CA3AF',
                        '&:hover': { color: '#EF4444', bgcolor: alpha('#EF4444', 0.1) },
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Investment Section */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ color: 'grey.500', textTransform: 'uppercase', letterSpacing: 1 }}>
                Inversión
              </Typography>
              <Tooltip title="Reiniciar inversión">
                <IconButton
                  size="small"
                  onClick={handleResetInvestments}
                  sx={{ color: '#9CA3AF', '&:hover': { color: brandColors.emerald } }}
                >
                  <RotateCcw size={16} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Base Investments */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {investments.map((inv) => (
                <Box key={inv.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    {getInvestmentIcon(inv.icon)}
                    <Typography variant="body2" sx={{ color: brandColors.textPrimary, fontWeight: 500 }}>
                      {inv.label}
                    </Typography>
                  </Box>
                  <TextField
                    size="small"
                    type="number"
                    value={inv.value || ''}
                    onChange={(e) => handleInvestmentChange(inv.id, parseFloat(e.target.value) || 0)}
                    sx={{ width: 140 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Box>
              ))}
            </Box>

            {/* Custom Costs Accordion */}
            <Accordion
              sx={{
                bgcolor: 'transparent',
                boxShadow: 'none',
                '&:before': { display: 'none' },
                mt: 2,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#6B7280' }} />}
                sx={{
                  bgcolor: '#F9FAFB',
                  borderRadius: 1,
                  minHeight: 40,
                  '& .MuiAccordionSummary-content': { my: 1 },
                }}
              >
                <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
                  Costos adicionales {customCosts.length > 0 && `(${customCosts.length})`}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ bgcolor: '#F9FAFB', borderRadius: 1, mt: 0.5, p: 2 }}>
                {/* Existing custom costs */}
                {customCosts.map((cost) => (
                  <Box
                    key={cost.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid #E5E7EB',
                    }}
                  >
                    <Typography variant="body2">{cost.label}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: brandColors.emerald, fontWeight: 600 }}>
                        {formatCurrency(cost.value)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveCustomCost(cost.id)}
                        sx={{ color: '#9CA3AF', '&:hover': { color: '#EF4444' } }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </Box>
                  </Box>
                ))}

                {/* Add new custom cost */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <TextField
                    size="small"
                    label="Otro"
                    value={newCustomLabel}
                    onChange={(e) => setNewCustomLabel(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    value={newCustomValue || ''}
                    onChange={(e) => setNewCustomValue(parseFloat(e.target.value) || 0)}
                    sx={{ width: 120 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Box>
                <Button
                  fullWidth
                  variant="text"
                  startIcon={<Plus size={16} />}
                  onClick={handleAddCustomCost}
                  disabled={!newCustomLabel || newCustomValue <= 0}
                  sx={{
                    mt: 1.5,
                    color: brandColors.emerald,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Agregar costo
                </Button>
              </AccordionDetails>
            </Accordion>

            {/* Total Investment */}
            {totalInvestment > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 2,
                  p: 1.5,
                  bgcolor: alpha(brandColors.emerald, 0.08),
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(brandColors.emerald, 0.2)}`,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: brandColors.textPrimary }}>
                  Total Inversión
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: brandColors.emerald }}>
                  {formatCurrency(totalInvestment)}
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Discount & Validity */}
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Descuento %"
                type="number"
                value={discountPercent || ''}
                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                size="small"
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="caption" sx={{ color: 'grey.500' }}>
                  Días de validez: {validDays}
                </Typography>
                <Slider
                  value={validDays}
                  onChange={(_, v) => setValidDays(v as number)}
                  min={3}
                  max={60}
                  step={1}
                  sx={{ color: brandColors.gold }}
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas adicionales"
                multiline
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                size="small"
              />
            </Grid>
          </Grid>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Download size={18} />}
              onClick={handleExportPDF}
              disabled={products.length === 0 && totalInvestment === 0}
              sx={{
                bgcolor: brandColors.emerald,
                flex: 1,
                textTransform: 'none',
                fontWeight: 700,
                py: 1.25,
                borderRadius: 2,
                boxShadow: `0 4px 16px ${alpha(brandColors.emerald, 0.3)}`,
                '&:hover': {
                  bgcolor: brandColors.emeraldDark,
                  boxShadow: `0 6px 20px ${alpha(brandColors.emerald, 0.4)}`,
                },
              }}
            >
              Exportar PDF
            </Button>
            <Tooltip title="Imprimir">
              <IconButton
                onClick={handlePrint}
                sx={{
                  border: '1px solid #E5E7EB',
                  borderRadius: 2,
                  color: '#6B7280',
                  '&:hover': { bgcolor: alpha(brandColors.emerald, 0.1), color: brandColors.emerald },
                }}
              >
                <Printer size={20} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Nueva Cotización">
              <IconButton
                onClick={handleNewQuotation}
                sx={{
                  border: '1px solid #E5E7EB',
                  borderRadius: 2,
                  color: '#6B7280',
                  '&:hover': { bgcolor: alpha(brandColors.emerald, 0.1), color: brandColors.emerald },
                }}
              >
                <Copy size={20} />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* Quotation Preview */}
        <Box sx={{ flex: '1 1 500px' }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: brandColors.background,
              border: `1px solid ${brandColors.border}`,
              boxShadow: documentShadows.paper,
              minHeight: 700,
            }}
          >
            {/* The Quotation */}
            <Box
              ref={quotationRef}
              className="quotation-preview"
              sx={{
                bgcolor: brandColors.background,
                p: 1.5,
                borderRadius: 2,
              }}
            >
              {/* Premium Gold Border with Gradient Effect */}
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: 1,
                  p: '3px',
                  background: `linear-gradient(135deg, #B8860B 0%, #D4AF37 25%, #F4E4C1 50%, #D4AF37 75%, #B8860B 100%)`,
                  boxShadow: `
                    0 2px 8px rgba(212, 175, 55, 0.2),
                    0 4px 16px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3)
                  `,
                }}
              >
                {/* Emerald inner border */}
                <Box
                  sx={{
                    border: `1.5px solid ${brandColors.emerald}`,
                    borderRadius: 0.5,
                    background: '#FFFFFF',
                  }}
                >
                  {/* Premium Paper with Subtle Texture */}
                  <Box
                    sx={{
                      p: 3,
                      minHeight: 650,
                      background: `
                        linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,248,0.95) 50%, rgba(255,255,255,0.98) 100%),
                        repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(212,175,55,0.015) 2px, rgba(212,175,55,0.015) 4px)
                      `,
                      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.02)',
                      position: 'relative',
                    }}
                  >
                    {/* Header Info - Client, Asesor, Quotation Number */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        {clientName && (
                          <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
                            Cliente: <strong>{clientName}</strong>
                          </Typography>
                        )}
                        {asesorName && (
                          <Typography sx={{ fontSize: '0.6rem', color: brandColors.emerald, mt: 0.25 }}>
                            Asesor: <strong>{asesorName}</strong>
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray, letterSpacing: 1 }}>
                          COTIZACIÓN No.
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: brandColors.textPrimary }}>
                          {quotationNumber}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Logo with Brand Name - Full Version */}
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      {/* Logo with Radial Halo */}
                      <Box
                        sx={{
                          position: 'relative',
                          width: 200,
                          mx: 'auto',
                          mb: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: '-20px',
                            background: 'radial-gradient(circle, rgba(0,174,122,0.08) 0%, rgba(0,174,122,0.03) 50%, transparent 70%)',
                            borderRadius: '50%',
                          },
                        }}
                      >
                        <img
                          src="/logo-tierra-madre.png"
                          alt="Tierra Mädre"
                          style={{ maxWidth: '100%', position: 'relative', zIndex: 1 }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </Box>

                      {/* Subtitle */}
                      <Typography sx={{
                        fontSize: '0.65rem',
                        color: brandColors.gold,
                        letterSpacing: '0.25em',
                        fontWeight: 400,
                        textTransform: 'uppercase',
                      }}>
                        Colombian Emeralds
                      </Typography>

                      {/* Fractal Decorative Divider */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 1.5 }}>
                        <Box sx={{
                          flex: 1,
                          maxWidth: 60,
                          height: '1px',
                          background: `linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.4) 50%, rgba(212,175,55,0.8) 100%)`,
                        }} />
                        {/* Gem with Crystal Effect */}
                        <Box sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: `radial-gradient(circle at 30% 30%, #00E5A0 0%, ${brandColors.emerald} 40%, ${brandColors.emeraldDark} 100%)`,
                          boxShadow: `
                            0 2px 6px rgba(0,174,122,0.3),
                            inset -2px -2px 4px rgba(0,0,0,0.15),
                            inset 2px 2px 4px rgba(255,255,255,0.2)
                          `,
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: '2px',
                            left: '2px',
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.5)',
                            filter: 'blur(1px)',
                          },
                        }} />
                        <Box sx={{
                          flex: 1,
                          maxWidth: 60,
                          height: '1px',
                          background: `linear-gradient(90deg, rgba(212,175,55,0.8) 0%, rgba(212,175,55,0.4) 50%, transparent 100%)`,
                        }} />
                      </Box>
                    </Box>

                    {/* Title Bar - Premium with Texture */}
                    <Box
                      sx={{
                        position: 'relative',
                        background: `
                          linear-gradient(180deg, ${brandColors.emeraldDark} 0%, #0D4019 100%),
                          repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)
                        `,
                        py: 1.5,
                        px: 3,
                        borderRadius: 0.5,
                        mb: 3,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '1px',
                          background: 'linear-gradient(90deg, transparent, rgba(0,174,122,0.4), transparent)',
                        },
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.2), transparent)',
                          filter: 'blur(1px)',
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#fff',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          textAlign: 'center',
                          letterSpacing: '0.2em',
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        COTIZACIÓN DE VENTA
                      </Typography>
                    </Box>

                    {/* Date */}
                    <Typography sx={{ textAlign: 'center', fontSize: '0.7rem', color: brandColors.gray, mb: 3 }}>
                      Fecha de emisión: {new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>

                    {/* Products List - Premium Table Style */}
                    {products.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        {/* Section Header */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            mb: 1.5,
                            pb: 0.75,
                            borderBottom: `2px solid ${brandColors.emeraldDark}`,
                          }}
                        >
                          <Package size={14} color={brandColors.emeraldDark} />
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.emeraldDark, letterSpacing: '0.05em' }}>
                            PRODUCTOS ({products.length})
                          </Typography>
                        </Box>
                        {/* Product Rows with zebra stripes */}
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          {products.map((product, index) => (
                            <Box
                              key={product.id}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                py: 1,
                                px: 1.25,
                                bgcolor: index % 2 === 0 ? 'rgba(27, 94, 32, 0.03)' : 'transparent',
                                borderBottom: `1px solid rgba(0,0,0,0.06)`,
                              }}
                            >
                              <Box>
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.textPrimary }}>
                                  #{product.itemNumber} - {product.name}
                                </Typography>
                                <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray, mt: 0.25 }}>
                                  {getPesoDisplay(product)} • {product.color} • {product.talla}
                                </Typography>
                              </Box>
                              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: brandColors.emerald, fontFamily: 'monospace' }}>
                                {formatCurrency(product.precioCOP)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Empty State */}
                    {products.length === 0 && (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Package size={32} color={brandColors.lightGray} style={{ marginBottom: 8 }} />
                        <Typography sx={{ fontSize: '0.75rem', color: brandColors.gray }}>
                          Agrega productos del inventario
                        </Typography>
                      </Box>
                    )}

                    {/* Investment Breakdown (in preview) */}
                    {totalInvestment > 0 && (
                      <Box sx={{ borderTop: `1px solid ${brandColors.lightGray}`, pt: 1.5, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                          <DollarSign size={12} color={brandColors.emerald} />
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: brandColors.emeraldDark }}>
                            INVERSIÓN
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          {investments.filter(inv => inv.value > 0).map((inv) => (
                            <Box
                              key={inv.id}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                py: 0.25,
                              }}
                            >
                              <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray }}>
                                {inv.label}
                              </Typography>
                              <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.textPrimary }}>
                                {formatCurrency(inv.value)}
                              </Typography>
                            </Box>
                          ))}
                          {customCosts.map((cost) => (
                            <Box
                              key={cost.id}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                py: 0.25,
                              }}
                            >
                              <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray }}>
                                {cost.label}
                              </Typography>
                              <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.textPrimary }}>
                                {formatCurrency(cost.value)}
                              </Typography>
                            </Box>
                          ))}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              pt: 0.5,
                              mt: 0.5,
                              borderTop: `1px dashed ${brandColors.lightGray}`,
                            }}
                          >
                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.emeraldDark }}>
                              Total Inversión
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: brandColors.emerald }}>
                              {formatCurrency(totalInvestment)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {/* Totals */}
                    {(products.length > 0 || totalInvestment > 0) && (
                      <Box sx={{ borderTop: `1px solid ${brandColors.lightGray}`, pt: 1.5, mb: 2 }}>
                        {/* Products Subtotal (if both products and investments exist) */}
                        {products.length > 0 && totalInvestment > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
                              Subtotal Productos
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.textPrimary }}>
                              {formatCurrency(productSubtotal)}
                            </Typography>
                          </Box>
                        )}

                        {/* Investment (if both exist) */}
                        {products.length > 0 && totalInvestment > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
                              Inversión
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.textPrimary }}>
                              {formatCurrency(totalInvestment)}
                            </Typography>
                          </Box>
                        )}

                        {/* Main Subtotal */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
                            Subtotal
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.textPrimary }}>
                            {formatCurrency(subtotal)}
                          </Typography>
                        </Box>

                        {discountPercent > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
                              Descuento ({discountPercent}%)
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#EF4444' }}>
                              -{formatCurrency(discount)}
                            </Typography>
                          </Box>
                        )}

                        {/* Total Price Box - Premium Design with Gold Accent */}
                        <Box
                          sx={{
                            bgcolor: 'rgba(27, 94, 32, 0.05)',
                            borderRadius: 1,
                            p: 2,
                            mt: 1.5,
                            borderTop: `3px solid ${brandColors.gold}`,
                          }}
                        >
                          <Typography sx={{ fontSize: '0.7rem', color: brandColors.gray, mb: 0.5, letterSpacing: '0.05em' }}>
                            PRECIO TOTAL
                          </Typography>
                          <Typography sx={{ fontSize: '1.75rem', fontWeight: 600, color: brandColors.emeraldDark, fontFamily: 'monospace' }}>
                            {formatCurrency(total)}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* Notes - Improved */}
                    {notes && (
                      <Box sx={{ mb: 2.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1, borderLeft: `3px solid ${brandColors.emerald}` }}>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: brandColors.emeraldDark, mb: 0.5, letterSpacing: '0.05em' }}>
                          NOTAS
                        </Typography>
                        <Typography sx={{ fontSize: '0.6rem', color: brandColors.textPrimary, lineHeight: 1.5 }}>
                          {notes}
                        </Typography>
                      </Box>
                    )}

                    {/* Validity - Improved */}
                    <Box sx={{ borderTop: `1px solid rgba(0,0,0,0.08)`, pt: 1.5, mb: 2.5 }}>
                      <Typography sx={{ textAlign: 'center', fontSize: '0.6rem', color: brandColors.gray }}>
                        Esta cotización es válida hasta: <strong style={{ color: brandColors.textPrimary }}>{expiryStr}</strong>
                      </Typography>
                      <Typography sx={{ textAlign: 'center', fontSize: '0.5rem', color: 'rgba(0,0,0,0.4)', mt: 0.5, lineHeight: 1.4 }}>
                        {businessSettings.footerNote}
                      </Typography>
                    </Box>

                    {/* Premium Footer - Sacred Geometry Layout */}
                    <Box
                      sx={{
                        borderTop: `1.618px solid rgba(212, 175, 55, 0.4)`,
                        pt: 2.5,
                        mt: 1.5,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1.618fr 1fr',
                        alignItems: 'center',
                        gap: 2,
                        position: 'relative',
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(249,248,245,1))',
                        mx: -3,
                        px: 3,
                        pb: 1,
                        mb: -3,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: '20%',
                          right: '20%',
                          height: '1px',
                          background: `linear-gradient(90deg, transparent, ${brandColors.emerald}, transparent)`,
                        },
                      }}
                    >
                      {/* Product QR Code with Sacred Frame */}
                      <Box
                        sx={{
                          position: 'relative',
                          width: 64,
                          height: 64,
                          p: 0.75,
                          border: `1px solid rgba(212, 175, 55, 0.3)`,
                          borderRadius: 0.5,
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(212,175,55,0.05) 100%)',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: -1,
                            left: -1,
                            width: 10,
                            height: 10,
                            borderTop: `1.618px solid ${brandColors.gold}`,
                            borderLeft: `1.618px solid ${brandColors.gold}`,
                          },
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: -1,
                            right: -1,
                            width: 10,
                            height: 10,
                            borderBottom: `1.618px solid ${brandColors.gold}`,
                            borderRight: `1.618px solid ${brandColors.gold}`,
                          },
                        }}
                      >
                        {products.length > 0 ? (
                          <QRCodeSVG
                            value={`https://www.tierramadre.co/products/${generateProductSlug(products[0].name)}`}
                            size={52}
                            level="L"
                            fgColor="#1B5E20"
                            bgColor="#FFFFFF"
                            style={{ width: '100%', height: '100%', display: 'block' }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(5, 1fr)',
                              gap: '1.5px',
                            }}
                          >
                            {Array(25).fill(0).map((_, i) => (
                              <Box
                                key={i}
                                sx={{
                                  bgcolor: (i + Math.floor(i / 5)) % 2 === 0 ? brandColors.lightGray : 'transparent',
                                  borderRadius: '1px',
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>

                      {/* Contact - Center */}
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{
                          fontSize: '0.6rem',
                          color: brandColors.textPrimary,
                          fontWeight: 500,
                          mb: 0.5,
                        }}>
                          {businessSettings.contactPhone}
                        </Typography>
                        <Typography sx={{
                          fontSize: '0.55rem',
                          color: 'rgba(26, 95, 74, 0.7)',
                          letterSpacing: '0.03em',
                        }}>
                          {businessSettings.contactEmail}
                        </Typography>
                        <Typography sx={{
                          fontSize: '0.5rem',
                          color: brandColors.gray,
                          mt: 0.75,
                          letterSpacing: '0.05em',
                        }}>
                          {businessSettings.nit}
                        </Typography>
                        {products.length > 0 && (
                          <Typography sx={{
                            fontSize: '0.45rem',
                            color: brandColors.emerald,
                            mt: 0.5,
                            fontWeight: 500,
                          }}>
                            Ver: {generateProductSlug(products[0].name)}
                          </Typography>
                        )}
                      </Box>

                      {/* Premium Seal - Sacred Geometry with Mandala Effect */}
                      <Box
                        sx={{
                          position: 'relative',
                          width: 64,
                          height: 64,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          justifySelf: 'end',
                        }}
                      >
                        {/* Outer Gold Ring with Conic Gradient */}
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            background: `conic-gradient(from 45deg, ${brandColors.gold} 0deg, rgba(212,175,55,0.3) 45deg, ${brandColors.gold} 90deg, rgba(212,175,55,0.3) 135deg, ${brandColors.gold} 180deg, rgba(212,175,55,0.3) 225deg, ${brandColors.gold} 270deg, rgba(212,175,55,0.3) 315deg, ${brandColors.gold} 360deg)`,
                            boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
                          }}
                        />
                        {/* White Ring */}
                        <Box
                          sx={{
                            position: 'absolute',
                            width: 54,
                            height: 54,
                            borderRadius: '50%',
                            bgcolor: '#fff',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                          }}
                        />
                        {/* Inner Gold Ring */}
                        <Box
                          sx={{
                            position: 'absolute',
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            border: `1.618px solid ${brandColors.gold}`,
                            opacity: 0.6,
                          }}
                        />
                        {/* Emerald Core with 3D Effect */}
                        <Box
                          sx={{
                            position: 'relative',
                            width: 42,
                            height: 42,
                            borderRadius: '50%',
                            background: `radial-gradient(circle at 30% 30%, #4fb885 0%, ${brandColors.emerald} 40%, ${brandColors.emeraldDark} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `
                              inset -3px -3px 6px rgba(0,0,0,0.25),
                              inset 3px 3px 6px rgba(255,255,255,0.15),
                              0 2px 8px rgba(0,0,0,0.2)
                            `,
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: '5px',
                              left: '10px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.35)',
                              filter: 'blur(2px)',
                            },
                          }}
                        >
                          <Shield size={20} color={brandColors.gold} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
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

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: '100%',
            fontWeight: 600,
            borderRadius: 2,
            boxShadow: documentShadows.elevated,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .quotation-preview, .quotation-preview * {
            visibility: visible;
          }
          .quotation-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </Box>
  );
}
