/**
 * TIERRA MADRE - Receipt Generator
 * Elegant purchase receipts for Colombian emeralds
 */

import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  InputAdornment,
  Tooltip,
  Autocomplete,
  Avatar,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { Receipt, Plus, Trash2, Download, Printer, Copy, Moon, Sun, Settings } from 'lucide-react';
import { ReceiptData, ReceiptProduct, Emerald } from '../../types';
import { exportReceiptToPdf } from '../../utils/pdf';
import { useEmeralds } from '../../hooks/useEmeralds';

// Design System Imports
import {
  emeraldCore,
  surfacesLight,
  surfacesDark,
  semanticColors,
} from '../../design-system/tokens/colors';
import { primitiveColors } from '../../design-system/tokens/primitives/colors';
import { iosTypographyScale } from '../../design-system';

// Logo brand green - using design system token
const logoGreen = emeraldCore.primary; // #00AE7A

// Generate unique receipt number
const generateReceiptNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `TM-${year}${month}-${random}`;
};

// Format currency
const formatCurrency = (amount: number, currency: 'USD' | 'COP' = 'USD'): string => {
  if (currency === 'COP') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// Payment method labels
const paymentMethodLabels: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta de Crédito/Débito',
  transfer: 'Transferencia Bancaria',
  crypto: 'Criptomoneda',
};

// Receipt theme colors - using design system tokens
const receiptThemes = {
  dark: {
    bg: surfacesDark.background.secondary,
    headerBg: surfacesDark.background.primary,
    cardBg: surfacesDark.background.tertiary,
    text: surfacesDark.text.primary,
    textSecondary: surfacesDark.text.secondary,
    textMuted: surfacesDark.text.tertiary,
    border: surfacesDark.border.light,
    accent: logoGreen,
    metallic: primitiveColors.metallic.silver[400],
  },
  light: {
    // Elegant gray tones with GREEN decorative lines
    bg: surfacesLight.background.secondary,
    headerBg: primitiveColors.metallic.silver[100],
    cardBg: surfacesLight.background.tertiary,
    text: surfacesLight.text.primary,
    textSecondary: surfacesLight.text.secondary,
    textMuted: surfacesLight.text.tertiary,
    border: surfacesLight.border.default,
    accent: logoGreen,
    metallic: primitiveColors.metallic.silver[300],
  },
};

type ReceiptTheme = 'dark' | 'light';
type DocumentType = 'receipt' | 'invoice';

// Document type labels interface
interface DocumentTypeLabels {
  receipt: string;
  invoice: string;
}

// Business settings interface
interface BusinessSettings {
  contactPhone: string;
  contactEmail: string;
  nit: string;
  footerMessage: string;
  footerNote: string;
  documentTypeLabels: DocumentTypeLabels;
}

export default function ReceiptGenerator() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { emeralds } = useEmeralds();
  const [selectedEmerald, setSelectedEmerald] = useState<Emerald | null>(null);
  const [receiptTheme, setReceiptTheme] = useState<ReceiptTheme>('dark');
  const [documentType, setDocumentType] = useState<DocumentType>('receipt');

  // Business settings with defaults
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    contactPhone: '+57 310 XXX XXXX',
    contactEmail: 'info@tierramadre.co',
    nit: 'NIT: 900.XXX.XXX-X',
    footerMessage: 'Gracias por su preferencia',
    footerNote: 'Este documento es un comprobante de pago válido. Las esmeraldas Tierra Madre cuentan con certificado de origen y autenticidad.',
    documentTypeLabels: {
      receipt: 'Recibo de Compra',
      invoice: 'Factura',
    },
  });

  const [receipt, setReceipt] = useState<Partial<ReceiptData>>({
    receiptNumber: generateReceiptNumber(),
    date: new Date().toISOString().split('T')[0],
    client: {
      name: '',
      phone: '',
      email: '',
      document: '',
    },
    products: [],
    subtotal: 0,
    discount: 0,
    discountPercent: 0,
    tax: 0,
    total: 0,
    paymentMethod: 'cash',
    notes: '',
  });

  const [newProduct, setNewProduct] = useState<Partial<ReceiptProduct>>({
    name: '',
    description: '',
    weightCarats: undefined,
    priceUSD: 0,
  });

  // Calculate totals
  const calculateTotals = (products: ReceiptProduct[], discountPercent: number = 0) => {
    const subtotal = products.reduce((sum, p) => sum + p.priceUSD, 0);
    const discount = subtotal * (discountPercent / 100);
    const total = subtotal - discount;
    return { subtotal, discount, total };
  };

  // Add product
  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.priceUSD) return;

    const product: ReceiptProduct = {
      id: crypto.randomUUID(),
      name: newProduct.name,
      description: newProduct.description,
      weightCarats: newProduct.weightCarats,
      priceUSD: newProduct.priceUSD,
    };

    const updatedProducts = [...(receipt.products || []), product];
    const totals = calculateTotals(updatedProducts, receipt.discountPercent || 0);

    setReceipt({
      ...receipt,
      products: updatedProducts,
      ...totals,
    });

    setNewProduct({
      name: '',
      description: '',
      weightCarats: undefined,
      priceUSD: 0,
    });
    setSelectedEmerald(null);
  };

  // Remove product
  const handleRemoveProduct = (productId: string) => {
    const updatedProducts = (receipt.products || []).filter(p => p.id !== productId);
    const totals = calculateTotals(updatedProducts, receipt.discountPercent || 0);

    setReceipt({
      ...receipt,
      products: updatedProducts,
      ...totals,
    });
  };

  // Update discount
  const handleDiscountChange = (percent: number) => {
    const totals = calculateTotals(receipt.products || [], percent);
    setReceipt({
      ...receipt,
      discountPercent: percent,
      ...totals,
    });
  };

  // Get current theme
  const theme = receiptThemes[receiptTheme];

  // Export to PDF using shared utility
  const handleExportPDF = async () => {
    if (!receiptRef.current) return;

    await exportReceiptToPdf(
      receiptRef.current,
      receipt.receiptNumber || 'Receipt',
      businessSettings.documentTypeLabels[documentType],
      receiptTheme
    );
  };

  // Print receipt
  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 0 } }}>
      {/* Premium Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${primitiveColors.emerald[600]} 0%, ${primitiveColors.emerald[700]} 50%, ${primitiveColors.emerald[800]} 100%)`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          },
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
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                }}
              >
                <Receipt size={28} color={surfacesLight.background.primary} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: surfacesLight.background.primary, letterSpacing: '-0.02em' }}>
                  {documentType === 'invoice' ? 'Generador de Facturas' : 'Generador de Recibos'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                  {documentType === 'invoice' ? 'Crea facturas profesionales para tus ventas' : 'Crea recibos elegantes para tus ventas'}
                </Typography>
              </Box>
            </Box>

            {/* Stats */}
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
                <Typography sx={{ fontSize: iosTypographyScale.title1, fontWeight: 800, color: surfacesLight.background.primary, lineHeight: 1 }}>
                  {(receipt.products || []).length}
                </Typography>
                <Typography sx={{ fontSize: iosTypographyScale.caption2, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
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
                  minWidth: 100,
                }}
              >
                <Typography sx={{ fontSize: iosTypographyScale.title3, fontWeight: 800, color: surfacesLight.background.primary, lineHeight: 1.2 }}>
                  {formatCurrency(receipt.total || 0)}
                </Typography>
                <Typography sx={{ fontSize: iosTypographyScale.caption2, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
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
          border: `1px solid ${surfacesLight.border.light}`,
          bgcolor: surfacesLight.background.primary,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          maxHeight: 'calc(100vh - 300px)',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(primitiveColors.emerald[600], 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Receipt size={18} color={primitiveColors.emerald[600]} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: surfacesLight.text.primary }}>
            {documentType === 'invoice' ? 'Información de la Factura' : 'Información del Recibo'}
          </Typography>
        </Box>

        {/* Receipt Settings Accordion */}
        <Accordion
          sx={{
            bgcolor: 'transparent',
            boxShadow: 'none',
            '&:before': { display: 'none' },
            mb: 2,
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: surfacesLight.text.secondary }} />}
            sx={{
              bgcolor: surfacesLight.background.secondary,
              borderRadius: 1,
              minHeight: 44, // iOS HIG minimum touch target
              '& .MuiAccordionSummary-content': { my: 1 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings size={16} color={surfacesLight.text.secondary} />
              <Typography variant="body2" sx={{ color: surfacesLight.text.secondary, fontWeight: 500 }}>
                {documentType === 'invoice' ? 'Configuración de la Factura' : 'Configuración del Recibo'}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ bgcolor: surfacesLight.background.secondary, borderRadius: 1, mt: 0.5, p: 2 }}>
            <Grid container spacing={{ xs: 1.5, md: 2 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Documento</InputLabel>
                  <Select
                    value={documentType}
                    label="Tipo de Documento"
                    onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                  >
                    <MenuItem value="receipt">{businessSettings.documentTypeLabels.receipt}</MenuItem>
                    <MenuItem value="invoice">{businessSettings.documentTypeLabels.invoice}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre del Documento"
                  value={businessSettings.documentTypeLabels[documentType]}
                  onChange={(e) => setBusinessSettings({
                    ...businessSettings,
                    documentTypeLabels: {
                      ...businessSettings.documentTypeLabels,
                      [documentType]: e.target.value,
                    },
                  })}
                  size="small"
                  placeholder={documentType === 'receipt' ? 'Ej: Recibo de Compra' : 'Ej: Factura'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={documentType === 'invoice' ? 'Número de Factura' : 'Número de Recibo'}
                  value={receipt.receiptNumber || ''}
                  onChange={(e) => setReceipt({ ...receipt, receiptNumber: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fecha"
                  type="date"
                  value={receipt.date || ''}
                  onChange={(e) => setReceipt({ ...receipt, date: e.target.value })}
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Mensaje Final"
                  value={businessSettings.footerMessage}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, footerMessage: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nota Legal"
                  value={businessSettings.footerNote}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, footerNote: e.target.value })}
                  size="small"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Client Information */}
        <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
          Información del Cliente
        </Typography>

        <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nombre del Cliente"
              value={receipt.client?.name || ''}
              onChange={(e) => setReceipt({
                ...receipt,
                client: { ...receipt.client!, name: e.target.value },
              })}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Teléfono"
              value={receipt.client?.phone || ''}
              onChange={(e) => setReceipt({
                ...receipt,
                client: { ...receipt.client!, phone: e.target.value },
              })}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={receipt.client?.email || ''}
              onChange={(e) => setReceipt({
                ...receipt,
                client: { ...receipt.client!, email: e.target.value },
              })}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Documento (Cédula/Pasaporte)"
              value={receipt.client?.document || ''}
              onChange={(e) => setReceipt({
                ...receipt,
                client: { ...receipt.client!, document: e.target.value },
              })}
              size="small"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: 'grey.800' }} />

        {/* Add Product */}
        <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
          Agregar Producto
        </Typography>

        {/* Emerald Selector from Gallery */}
        {emeralds.length > 0 && (
          <Autocomplete
            size="small"
            options={emeralds.filter(e => e.status === 'available')}
            getOptionLabel={(option) => option.name}
            value={selectedEmerald}
            onChange={(_, emerald) => {
              setSelectedEmerald(emerald);
              if (emerald) {
                // Convert COP to USD (approximate rate)
                const priceUSD = emerald.priceCOP ? Math.round(emerald.priceCOP / 4000) : 0;
                setNewProduct({
                  name: emerald.name,
                  description: emerald.aiDescription || '',
                  weightCarats: emerald.weightCarats,
                  priceUSD: priceUSD,
                });
              }
            }}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Avatar
                  src={option.mediaData}
                  variant="rounded"
                  sx={{ width: 40, height: 40 }}
                />
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {option.name}
                  </Typography>
                  <Typography variant="caption" color="grey.500">
                    {option.weightCarats ? `${option.weightCarats} ct` : 'Sin peso'}
                    {option.priceCOP ? ` • $${Math.round(option.priceCOP / 4000).toLocaleString()} USD` : ''}
                  </Typography>
                </Box>
                <Chip
                  label={option.category}
                  size="small"
                  sx={{ ml: 'auto', fontSize: '0.7rem' }}
                />
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Seleccionar de Galería"
                placeholder="Buscar esmeralda..."
                sx={{ mb: 2 }}
              />
            )}
            noOptionsText="No hay esmeraldas disponibles"
            sx={{ mb: 1 }}
          />
        )}

        {emeralds.length === 0 && (
          <Typography variant="caption" color="grey.500" sx={{ display: 'block', mb: 2 }}>
            No hay esmeraldas en la galería. Puedes agregar productos manualmente.
          </Typography>
        )}

        <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 2 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nombre de la Esmeralda"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              size="small"
              placeholder="Ej: Esmeralda CLEOPATRA"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Descripción (opcional)"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              size="small"
              placeholder="Ej: Corte octagonal, color verde intenso"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quilates"
              type="number"
              value={newProduct.weightCarats || ''}
              onChange={(e) => setNewProduct({ ...newProduct, weightCarats: parseFloat(e.target.value) || undefined })}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">ct</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Precio USD"
              type="number"
              value={newProduct.priceUSD || ''}
              onChange={(e) => setNewProduct({ ...newProduct, priceUSD: parseFloat(e.target.value) || 0 })}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Plus size={18} />}
              onClick={handleAddProduct}
              disabled={!newProduct.name || !newProduct.priceUSD}
              sx={{
                borderColor: primitiveColors.emerald[600],
                color: primitiveColors.emerald[600],
                textTransform: 'none',
                fontWeight: 600,
                py: 1.25,
                borderRadius: 2,
                '&:hover': {
                  borderColor: primitiveColors.emerald[700],
                  bgcolor: alpha(primitiveColors.emerald[600], 0.05),
                },
              }}
            >
              Agregar Producto
            </Button>
          </Grid>
        </Grid>

        {/* Product List */}
        {(receipt.products || []).length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 1 }}>
              Productos ({receipt.products?.length})
            </Typography>
            {receipt.products?.map((product) => (
              <Box
                key={product.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'grey.800',
                }}
              >
                <Box>
                  <Typography variant="body2">{product.name}</Typography>
                  {product.weightCarats && (
                    <Typography variant="caption" color="grey.500">
                      {product.weightCarats} ct
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: primitiveColors.emerald[600], fontWeight: 600 }}>
                    {formatCurrency(product.priceUSD)}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveProduct(product.id)}
                    sx={{
                      color: surfacesLight.text.tertiary,
                      '&:hover': { color: semanticColors.error.main, bgcolor: alpha(semanticColors.error.main, 0.1) },
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        <Divider sx={{ my: 3, borderColor: 'grey.800' }} />

        {/* Discount & Payment */}
        <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Descuento %"
              type="number"
              value={receipt.discountPercent || ''}
              onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Método de Pago</InputLabel>
              <Select
                value={receipt.paymentMethod || 'cash'}
                label="Método de Pago"
                onChange={(e) => setReceipt({ ...receipt, paymentMethod: e.target.value as ReceiptData['paymentMethod'] })}
              >
                <MenuItem value="cash">Efectivo</MenuItem>
                <MenuItem value="card">Tarjeta</MenuItem>
                <MenuItem value="transfer">Transferencia</MenuItem>
                <MenuItem value="crypto">Criptomoneda</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notas adicionales"
              multiline
              rows={2}
              value={receipt.notes || ''}
              onChange={(e) => setReceipt({ ...receipt, notes: e.target.value })}
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
            disabled={(receipt.products || []).length === 0}
            sx={{
              bgcolor: primitiveColors.emerald[600],
              flex: 1,
              textTransform: 'none',
              fontWeight: 700,
              py: 1.25,
              borderRadius: 2,
              boxShadow: `0 4px 16px ${alpha(primitiveColors.emerald[600], 0.3)}`,
              '&:hover': {
                bgcolor: primitiveColors.emerald[700],
                boxShadow: `0 6px 20px ${alpha(primitiveColors.emerald[600], 0.4)}`,
              },
            }}
          >
            Descargar PDF
          </Button>
          <Tooltip title={receiptTheme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}>
            <IconButton
              onClick={() => setReceiptTheme(receiptTheme === 'dark' ? 'light' : 'dark')}
              sx={{
                border: '1px solid',
                borderColor: receiptTheme === 'dark' ? surfacesDark.border.light : primitiveColors.emerald[600],
                color: receiptTheme === 'dark' ? surfacesDark.text.tertiary : primitiveColors.emerald[600],
                borderRadius: 2,
                '&:hover': {
                  bgcolor: receiptTheme === 'dark' ? alpha(surfacesDark.border.light, 0.1) : alpha(primitiveColors.emerald[600], 0.1),
                },
              }}
            >
              {receiptTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Imprimir">
            <IconButton
              onClick={handlePrint}
              sx={{
                border: `1px solid ${surfacesLight.border.light}`,
                borderRadius: 2,
                color: surfacesLight.text.secondary,
                '&:hover': { bgcolor: alpha(primitiveColors.emerald[600], 0.1), color: primitiveColors.emerald[600] },
              }}
            >
              <Printer size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title={documentType === 'invoice' ? 'Nueva Factura' : 'Nuevo Recibo'}>
            <IconButton
              onClick={() => setReceipt({
                receiptNumber: generateReceiptNumber(),
                date: new Date().toISOString().split('T')[0],
                client: { name: '', phone: '', email: '', document: '' },
                products: [],
                subtotal: 0,
                discount: 0,
                discountPercent: 0,
                total: 0,
                paymentMethod: 'cash',
                notes: '',
              })}
              sx={{
                border: `1px solid ${surfacesLight.border.light}`,
                borderRadius: 2,
                color: surfacesLight.text.secondary,
                '&:hover': { bgcolor: alpha(primitiveColors.emerald[600], 0.1), color: primitiveColors.emerald[600] },
              }}
            >
              <Copy size={20} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Receipt Preview */}
      <Box sx={{ flex: '1 1 450px', display: 'flex', justifyContent: 'center' }}>
        <Box
          ref={receiptRef}
          className="receipt-preview"
          sx={{
            width: 450,
            minHeight: 650,
            bgcolor: theme.bg,
            borderRadius: 1,
            overflow: 'hidden',
            border: receiptTheme === 'dark'
              ? '1px solid #333'
              : `1px solid ${theme.border}`,
            boxShadow: receiptTheme === 'dark'
              ? '0 4px 20px rgba(0,0,0,0.5)'
              : '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              bgcolor: theme.headerBg,
              p: 3,
              textAlign: 'center',
              borderBottom: `2px solid ${theme.accent}`,
            }}
          >
            {/* Logo */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 1,
                mb: 1,
              }}
            >
              <Box
                component="img"
                src={receiptTheme === 'dark' ? '/logo-white.png' : '/logo-tierra-madre.png'}
                alt="Tierra Madre"
                sx={{
                  height: 60,
                  width: 'auto',
                  objectFit: 'contain',
                }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: '0.65rem',
                color: theme.textSecondary,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                mt: 1,
              }}
            >
              Esmeraldas Colombianas de Origen
            </Typography>
          </Box>

          {/* Receipt Info */}
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {businessSettings.documentTypeLabels[documentType]}
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: theme.text, fontWeight: 500 }}>
                  {receipt.receiptNumber}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '0.7rem', color: theme.textSecondary }}>
                  {businessSettings.contactPhone}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: theme.textSecondary }}>
                  {businessSettings.contactEmail}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: theme.textSecondary }}>
                  {businessSettings.nit}
                </Typography>
              </Box>
            </Box>

            {/* Date */}
            <Typography sx={{ fontSize: '0.75rem', color: theme.textSecondary, mb: 2 }}>
              Fecha: {formatDate(receipt.date || new Date().toISOString())}
            </Typography>

            {/* Client */}
            <Box
              sx={{
                bgcolor: theme.cardBg,
                p: 2,
                borderRadius: 1,
                mb: 3,
                borderLeft: `3px solid ${theme.accent}`,
              }}
            >
              <Typography sx={{ fontSize: '0.7rem', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
                Cliente
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', color: theme.text, fontWeight: 500 }}>
                {receipt.client?.name || 'Sin especificar'}
              </Typography>
              {receipt.client?.document && (
                <Typography sx={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                  Doc: {receipt.client.document}
                </Typography>
              )}
              {receipt.client?.phone && (
                <Typography sx={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                  Tel: {receipt.client.phone}
                </Typography>
              )}
            </Box>

            {/* Products */}
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: theme.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  mb: 1.5,
                  borderBottom: `1px solid ${theme.border}`,
                  pb: 1,
                }}
              >
                Detalle de Productos
              </Typography>

              {(receipt.products || []).length === 0 ? (
                <Typography sx={{ fontSize: '0.8rem', color: theme.textMuted, fontStyle: 'italic', py: 2 }}>
                  Sin productos agregados
                </Typography>
              ) : (
                receipt.products?.map((product) => (
                  <Box
                    key={product.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1.5,
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: '0.85rem', color: theme.text }}>
                        {product.name}
                      </Typography>
                      {product.description && (
                        <Typography sx={{ fontSize: '0.7rem', color: theme.textSecondary }}>
                          {product.description}
                        </Typography>
                      )}
                      {product.weightCarats && (
                        <Typography sx={{ fontSize: '0.7rem', color: receiptTheme === 'dark' ? theme.accent : theme.textSecondary }}>
                          {product.weightCarats} quilates
                        </Typography>
                      )}
                    </Box>
                    <Typography sx={{ fontSize: '0.85rem', color: theme.text, fontWeight: 500 }}>
                      {formatCurrency(product.priceUSD)}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>

            {/* Totals */}
            <Box
              sx={{
                bgcolor: theme.cardBg,
                p: 2,
                borderRadius: 1,
                mb: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: theme.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  mb: 1,
                }}
              >
                Resumen de Montos
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: '0.8rem', color: theme.textSecondary }}>Subtotal</Typography>
                <Typography sx={{ fontSize: '0.8rem', color: theme.text }}>
                  {formatCurrency(receipt.subtotal || 0)}
                </Typography>
              </Box>

              {(receipt.discount || 0) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '0.8rem', color: theme.textSecondary }}>
                    Descuento ({receipt.discountPercent}%)
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: semanticColors.error.main }}>
                    -{formatCurrency(receipt.discount || 0)}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 1, borderColor: theme.border }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                  sx={{
                    fontSize: '0.85rem',
                    color: receiptTheme === 'dark' ? theme.accent : theme.text,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  Total a Pagar
                </Typography>
                <Typography
                  sx={{
                    fontSize: '1.2rem',
                    color: receiptTheme === 'dark' ? theme.accent : theme.text,
                    fontWeight: 700,
                  }}
                >
                  {formatCurrency(receipt.total || 0)}
                </Typography>
              </Box>
            </Box>

            {/* Payment Method */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                Método de Pago:
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: theme.text }}>
                {paymentMethodLabels[receipt.paymentMethod || 'cash']}
              </Typography>
            </Box>

            {/* Notes */}
            {receipt.notes && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: '0.7rem', color: theme.textSecondary, mb: 0.5 }}>
                  Notas:
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: theme.textSecondary, fontStyle: 'italic' }}>
                  {receipt.notes}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Footer */}
          <Box
            sx={{
              bgcolor: theme.headerBg,
              p: 2,
              textAlign: 'center',
              borderTop: `1px solid ${theme.border}`,
            }}
          >
            <Typography sx={{ fontSize: '0.65rem', color: theme.textMuted, mb: 0.5 }}>
              {businessSettings.footerMessage}
            </Typography>
            <Typography sx={{ fontSize: '0.6rem', color: theme.textMuted, lineHeight: 1.4 }}>
              {businessSettings.footerNote}
            </Typography>

            {/* Decorative element */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  bgcolor: theme.accent,
                  transform: 'rotate(45deg)',
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
      </Box>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-preview, .receipt-preview * {
            visibility: visible;
          }
          .receipt-preview {
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
