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
  alpha,
} from '@mui/material';
import { Receipt, Download, Printer, Copy, Moon, Sun } from 'lucide-react';
import { ReceiptData, ReceiptProduct, Emerald } from '../../../types';
import { exportReceiptToPdf } from '../../../utils/pdf';
import { useEmeralds } from '../../../hooks/useEmeralds';

// Design System Imports
import { surfacesLight, surfacesDark } from '../../../design-system/tokens/colors';
import { iosTypographyScale, blurValues, primitiveColors } from '../../../design-system';

// Local components and constants
import { ReceiptPreview, ReceiptSettings, ProductListEditor } from './components';
import {
  generateReceiptNumber,
  formatCurrency,
  defaultBusinessSettings,
  type ReceiptTheme,
  type DocumentType,
  type BusinessSettings,
} from './constants';

export default function ReceiptGenerator() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { emeralds } = useEmeralds();
  const [selectedEmerald, setSelectedEmerald] = useState<Emerald | null>(null);
  const [receiptTheme, setReceiptTheme] = useState<ReceiptTheme>('dark');
  const [documentType, setDocumentType] = useState<DocumentType>('receipt');
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(defaultBusinessSettings);

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
    setReceipt({ ...receipt, products: updatedProducts, ...totals });
  };

  // Update discount
  const handleDiscountChange = (percent: number) => {
    const totals = calculateTotals(receipt.products || [], percent);
    setReceipt({ ...receipt, discountPercent: percent, ...totals });
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!receiptRef.current) return;
    await exportReceiptToPdf(
      receiptRef.current,
      receipt.receiptNumber || 'Receipt',
      businessSettings.documentTypeLabels[documentType],
      receiptTheme
    );
  };

  // Reset receipt
  const handleNewReceipt = () => {
    setReceipt({
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
    });
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
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -50, right: -50,
            width: 200, height: 200,
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
                  width: 56, height: 56,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: `blur(${blurValues.sm})`,
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
              <Box sx={{ px: 2.5, py: 1.5, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: `blur(${blurValues.sm})`, textAlign: 'center', minWidth: 80 }}>
                <Typography sx={{ fontSize: iosTypographyScale.title1, fontWeight: 800, color: surfacesLight.background.primary, lineHeight: 1 }}>
                  {(receipt.products || []).length}
                </Typography>
                <Typography sx={{ fontSize: iosTypographyScale.caption2, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                  Productos
                </Typography>
              </Box>
              <Box sx={{ px: 2.5, py: 1.5, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.25)', backdropFilter: `blur(${blurValues.sm})`, textAlign: 'center', minWidth: 100 }}>
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
                width: 36, height: 36,
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
          <ReceiptSettings
            documentType={documentType}
            setDocumentType={setDocumentType}
            businessSettings={businessSettings}
            setBusinessSettings={setBusinessSettings}
            receipt={receipt}
            setReceipt={setReceipt}
          />

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
                onChange={(e) => setReceipt({ ...receipt, client: { ...receipt.client!, name: e.target.value } })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={receipt.client?.phone || ''}
                onChange={(e) => setReceipt({ ...receipt, client: { ...receipt.client!, phone: e.target.value } })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={receipt.client?.email || ''}
                onChange={(e) => setReceipt({ ...receipt, client: { ...receipt.client!, email: e.target.value } })}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Documento (Cédula/Pasaporte)"
                value={receipt.client?.document || ''}
                onChange={(e) => setReceipt({ ...receipt, client: { ...receipt.client!, document: e.target.value } })}
                size="small"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3, borderColor: 'grey.800' }} />

          {/* Product List Editor */}
          <ProductListEditor
            emeralds={emeralds}
            selectedEmerald={selectedEmerald}
            setSelectedEmerald={setSelectedEmerald}
            newProduct={newProduct}
            setNewProduct={setNewProduct}
            products={receipt.products || []}
            onAddProduct={handleAddProduct}
            onRemoveProduct={handleRemoveProduct}
          />

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
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
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
                onClick={() => window.print()}
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
                onClick={handleNewReceipt}
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
          <ReceiptPreview
            ref={receiptRef}
            receipt={receipt}
            receiptTheme={receiptTheme}
            documentType={documentType}
            businessSettings={businessSettings}
          />
        </Box>
      </Box>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-preview, .receipt-preview * { visibility: visible; }
          .receipt-preview { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </Box>
  );
}
