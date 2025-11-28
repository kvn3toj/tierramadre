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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  ContentCopy as CopyIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { brandColors } from '../theme';
import { ReceiptData, ReceiptProduct, Emerald } from '../types';
import { useEmeralds } from '../hooks/useEmeralds';

// Logo brand green - now also in brandColors
const logoGreen = '#00AE7A';

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

// Receipt theme colors
const receiptThemes = {
  dark: {
    bg: '#1a1a1a',
    headerBg: '#0d0d0d',
    cardBg: '#252525',
    text: '#ffffff',
    textSecondary: '#9e9e9e',
    textMuted: '#616161',
    border: '#333333',
    accent: logoGreen,
    metallic: '#9e9e9e',
  },
  light: {
    // Elegant gray tones with GREEN decorative lines
    bg: '#f8f8f8',           // Soft warm gray
    headerBg: '#e8e8e8',     // Light silver gray
    cardBg: '#f0f0f0',       // Subtle gray card
    text: '#2c2c2c',         // Charcoal for readability
    textSecondary: '#5a5a5a', // Medium gray
    textMuted: '#8a8a8a',    // Muted silver
    border: '#c0c0c0',       // Silver border
    accent: logoGreen,       // GREEN for decorative lines (brand color)
    metallic: '#a8a8a8',     // Brushed silver metallic
  },
};

type ReceiptTheme = 'dark' | 'light';

// Business settings interface
interface BusinessSettings {
  contactPhone: string;
  contactEmail: string;
  nit: string;
  footerMessage: string;
  footerNote: string;
}

export default function ReceiptGenerator() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { emeralds } = useEmeralds();
  const [selectedEmerald, setSelectedEmerald] = useState<Emerald | null>(null);
  const [receiptTheme, setReceiptTheme] = useState<ReceiptTheme>('dark');

  // Business settings with defaults
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    contactPhone: '+57 310 XXX XXXX',
    contactEmail: 'info@tierramadre.co',
    nit: 'NIT: 900.XXX.XXX-X',
    footerMessage: 'Gracias por su preferencia',
    footerNote: 'Este documento es un comprobante de pago válido. Las esmeraldas Tierra Madre cuentan con certificado de origen y autenticidad.',
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

  // Export to PDF with high quality and margins
  const handleExportPDF = async () => {
    if (!receiptRef.current) return;

    // Wait for any pending renders
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get the receipt element dimensions
    const receiptElement = receiptRef.current;
    const rect = receiptElement.getBoundingClientRect();

    const canvas = await html2canvas(receiptElement, {
      scale: 4, // High quality for crisp PDF export
      backgroundColor: theme.bg,
      useCORS: true,
      logging: false,
      allowTaint: true,
      width: rect.width,
      height: rect.height,
      x: 0,
      y: 0,
    });

    const imgData = canvas.toDataURL('image/png', 1.0); // PNG for best quality

    // A4 dimensions: 210 x 297 mm
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20; // 20mm margin for elegant spacing

    // Calculate dimensions to fit receipt nicely
    const receiptAspectRatio = canvas.height / canvas.width;

    // Target width: use most of available width for a nice presentation
    const targetWidth = pageWidth - (margin * 2);
    let imgWidth = targetWidth;
    let imgHeight = imgWidth * receiptAspectRatio;

    // If too tall, scale down to fit
    const maxHeight = pageHeight - (margin * 2);
    if (imgHeight > maxHeight) {
      imgHeight = maxHeight;
      imgWidth = imgHeight / receiptAspectRatio;
    }

    // Center both horizontally and vertically
    const xOffset = (pageWidth - imgWidth) / 2;
    const yOffset = (pageHeight - imgHeight) / 2;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add elegant background
    const bgColor = receiptTheme === 'dark' ? '#1a1a1a' : '#f0f0f0';
    pdf.setFillColor(bgColor);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Add subtle shadow effect behind receipt
    pdf.setFillColor(receiptTheme === 'dark' ? '#0a0a0a' : '#c8c8c8');
    pdf.rect(xOffset + 1.5, yOffset + 1.5, imgWidth, imgHeight, 'F');

    // Add the receipt image centered
    pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);

    // Add elegant border around receipt
    pdf.setDrawColor(receiptTheme === 'dark' ? '#444444' : '#b0b0b0');
    pdf.setLineWidth(0.3);
    pdf.rect(xOffset, yOffset, imgWidth, imgHeight, 'S');

    pdf.save(`Recibo-${receipt.receiptNumber}.pdf`);
  };

  // Print receipt
  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {/* Form Section */}
      <Paper
        sx={{
          flex: '1 1 400px',
          p: 3,
          bgcolor: brandColors.darkSurface,
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        }}
      >
        <Typography variant="h5" sx={{ color: brandColors.emeraldLight, mb: 3 }}>
          Generar Recibo
        </Typography>

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
            expandIcon={<ExpandMoreIcon sx={{ color: 'grey.500' }} />}
            sx={{
              bgcolor: brandColors.darkBg,
              borderRadius: 1,
              minHeight: 40,
              '& .MuiAccordionSummary-content': { my: 1 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon sx={{ fontSize: 18, color: 'grey.500' }} />
              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                Configuración del Recibo
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ bgcolor: brandColors.darkBg, borderRadius: 1, mt: 0.5, p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Número de Recibo"
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

        <Grid container spacing={2} sx={{ mb: 3 }}>
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
                  src={option.imageUrl}
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

        <Grid container spacing={2} sx={{ mb: 2 }}>
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
              startIcon={<AddIcon />}
              onClick={handleAddProduct}
              disabled={!newProduct.name || !newProduct.priceUSD}
              sx={{ borderColor: brandColors.emeraldGreen, color: brandColors.emeraldLight }}
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
                  <Typography variant="body2" sx={{ color: brandColors.emeraldLight }}>
                    {formatCurrency(product.priceUSD)}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveProduct(product.id)}
                    sx={{ color: 'error.main' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        <Divider sx={{ my: 3, borderColor: 'grey.800' }} />

        {/* Discount & Payment */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
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
            startIcon={<DownloadIcon />}
            onClick={handleExportPDF}
            disabled={(receipt.products || []).length === 0}
            sx={{ bgcolor: brandColors.emeraldGreen, flex: 1 }}
          >
            Descargar PDF
          </Button>
          <Tooltip title={receiptTheme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}>
            <IconButton
              onClick={() => setReceiptTheme(receiptTheme === 'dark' ? 'light' : 'dark')}
              sx={{
                border: '1px solid',
                borderColor: receiptTheme === 'dark' ? 'grey.700' : logoGreen,
                color: receiptTheme === 'dark' ? 'grey.400' : logoGreen,
              }}
            >
              {receiptTheme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Imprimir">
            <IconButton
              onClick={handlePrint}
              sx={{ border: '1px solid', borderColor: 'grey.700' }}
            >
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Nuevo Recibo">
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
              sx={{ border: '1px solid', borderColor: 'grey.700' }}
            >
              <CopyIcon />
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
                  Recibo de Compra
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
                  <Typography sx={{ fontSize: '0.8rem', color: '#ef5350' }}>
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
