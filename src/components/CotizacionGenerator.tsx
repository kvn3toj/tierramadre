/**
 * TIERRA MADRE - Cotización Generator
 * Professional quotation generator selecting from inventory stock.
 *
 * Refactored: Extracted CotizacionHeader, QuotationPreview, and constants
 * to separate components for better maintainability.
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
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
  Download,
  Settings,
  Gem,
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
  FileText,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { documentShadows } from '../design-system/tokens';
import { useInventory } from '../hooks/useInventory';
import {
  useCotizacion,
  formatCotizacionCurrency,
  getPesoDisplay,
  BusinessSettings,
  ManualProductState,
  CotizacionProduct,
  CotizacionInvestment,
  CustomCost,
} from '../hooks/useCotizacion';
import { InventoryItem } from '../types';
import { SAMPLE_AMBASSADORS } from '../data/ambassadors';
import { CotizacionHeader, QuotationPreview, brandColors } from './cotizacion';
import { createLogger } from '../utils/logger';

const log = createLogger('Cotizacion');
const formatCurrency = formatCotizacionCurrency;

// =============================================================================
// INVESTMENT ICON HELPER
// =============================================================================

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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CotizacionGenerator() {
  const quotationRef = useRef<HTMLDivElement>(null);
  const { inventory } = useInventory();

  // Use the cotizacion hook for state management
  const cotizacion = useCotizacion();
  const {
    quotationNumber, setQuotationNumber, regenerateQuotationNumber,
    clientName, setClientName,
    clientPhone, setClientPhone,
    clientEmail, setClientEmail,
    clientDocument, setClientDocument,
    asesorName, setAsesorName,
    date, setDate,
    validDays, setValidDays,
    expiryStr,
    notes, setNotes,
    discountPercent, setDiscountPercent,
    products,
    addProductFromInventory,
    addManualProduct,
    removeProduct,
    manualProduct, setManualProduct,
    investments, updateInvestment, resetInvestments,
    customCosts, addCustomCost, removeCustomCost,
    businessSettings, setBusinessSettings,
    totalInvestment,
    productSubtotal,
    subtotal,
    discount,
    total,
    resetAll,
  } = cotizacion;

  // Filter available inventory
  const availableInventory = inventory.filter(item => item.estado === 'DISPONIBLE');

  // UI-only state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const asesorOptions = SAMPLE_AMBASSADORS.map(amb => amb.displayName);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [productEntryMode, setProductEntryMode] = useState<'inventory' | 'manual'>('inventory');
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomValue, setNewCustomValue] = useState<number>(0);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleAddProduct = () => {
    if (!selectedItem) return;
    addProductFromInventory(selectedItem);
    setSelectedItem(null);
  };

  const handleAddManualProduct = () => {
    addManualProduct(manualProduct);
  };

  const handleRemoveProduct = (productId: string) => {
    removeProduct(productId);
  };

  const handleInvestmentChange = (id: string, value: number) => {
    updateInvestment(id, value);
  };

  const handleResetInvestments = () => {
    resetInvestments();
  };

  const handleAddCustomCost = () => {
    if (!newCustomLabel || newCustomValue <= 0) return;
    addCustomCost(newCustomLabel, newCustomValue);
    setNewCustomLabel('');
    setNewCustomValue(0);
  };

  const handleRemoveCustomCost = (id: string) => {
    removeCustomCost(id);
  };

  const handleNewQuotation = () => {
    resetAll();
    setSelectedItem(null);
  };

  const handleExportPDF = async () => {
    if (!quotationRef.current) return;

    try {
      // Capture at high quality with optimal scale for A4 dimensions
      const canvas = await html2canvas(quotationRef.current, {
        scale: 2.5, // Balanced quality without excessive file size
        backgroundColor: brandColors.background,
        useCORS: true,
        logging: false,
        windowWidth: quotationRef.current.scrollWidth,
        windowHeight: quotationRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png', 0.95); // High quality JPEG compression
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true, // Enable PDF compression
      });

      // A4 dimensions: 210mm x 297mm
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Use smaller margins for better space utilization
      const margin = 8; // 8mm margins
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Center horizontally, align near top
      const xOffset = margin;
      const yOffset = margin;

      // Add image - if too tall, it will overflow to next page automatically
      if (imgHeight > pageHeight - (margin * 2)) {
        // Content is taller than one page - fit to full height
        const scaledHeight = pageHeight - (margin * 2);
        const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, scaledWidth, scaledHeight);
      } else {
        // Content fits in one page - center vertically
        const centeredY = (pageHeight - imgHeight) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, centeredY, imgWidth, imgHeight);
      }

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
      log.error('PDF export error:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 0 } }}>
      {/* Header */}
      <CotizacionHeader productCount={products.length} total={total} />

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Form Section */}
        <Paper
          elevation={0}
          sx={{
            flex: '1 1 450px',
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            border: '1px solid #E5E7EB',
            bgcolor: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          {/* Progress Indicator */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              {[
                { label: 'Info', completed: clientName !== '' },
                { label: 'Productos', completed: products.length > 0 },
                { label: 'Total', completed: total > 0 },
              ].map((step, index) => (
                <Box
                  key={index}
                  sx={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    bgcolor: step.completed ? brandColors.emerald : '#E5E7EB',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              {['Información', 'Productos', 'Revisión'].map((label, index) => (
                <Typography
                  key={index}
                  sx={{
                    fontSize: '0.65rem',
                    color: '#6B7280',
                    fontWeight: 500,
                  }}
                >
                  {label}
                </Typography>
              ))}
            </Box>
          </Box>
          {/* Quotation Settings */}
          <SettingsAccordion
            quotationNumber={quotationNumber}
            setQuotationNumber={setQuotationNumber}
            regenerateQuotationNumber={regenerateQuotationNumber}
            date={date}
            setDate={setDate}
            businessSettings={businessSettings}
            setBusinessSettings={setBusinessSettings}
          />

          {/* Client Information */}
          <ClientInfoSection
            clientName={clientName}
            setClientName={setClientName}
            clientPhone={clientPhone}
            setClientPhone={setClientPhone}
            clientEmail={clientEmail}
            setClientEmail={setClientEmail}
            clientDocument={clientDocument}
            setClientDocument={setClientDocument}
            asesorName={asesorName}
            setAsesorName={setAsesorName}
            asesorOptions={asesorOptions}
          />

          <Divider sx={{ my: 3 }} />

          {/* Add Product Section */}
          <ProductEntrySection
            productEntryMode={productEntryMode}
            setProductEntryMode={setProductEntryMode}
            availableInventory={availableInventory}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            handleAddProduct={handleAddProduct}
            manualProduct={manualProduct}
            setManualProduct={setManualProduct}
            handleAddManualProduct={handleAddManualProduct}
          />

          {/* Product List */}
          <ProductListSection
            products={products}
            handleRemoveProduct={handleRemoveProduct}
          />

          <Divider sx={{ my: 3 }} />

          {/* Investment Section */}
          <InvestmentFormSection
            investments={investments}
            handleInvestmentChange={handleInvestmentChange}
            handleResetInvestments={handleResetInvestments}
            customCosts={customCosts}
            handleRemoveCustomCost={handleRemoveCustomCost}
            newCustomLabel={newCustomLabel}
            setNewCustomLabel={setNewCustomLabel}
            newCustomValue={newCustomValue}
            setNewCustomValue={setNewCustomValue}
            handleAddCustomCost={handleAddCustomCost}
            totalInvestment={totalInvestment}
          />

          <Divider sx={{ my: 3 }} />

          {/* Discount & Validity */}
          <DiscountValiditySection
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            validDays={validDays}
            setValidDays={setValidDays}
            notes={notes}
            setNotes={setNotes}
          />

          {/* Actions */}
          <ActionButtons
            handleExportPDF={handleExportPDF}
            handlePrint={handlePrint}
            handleNewQuotation={handleNewQuotation}
            disabled={products.length === 0 && totalInvestment === 0}
          />
        </Paper>

        {/* Quotation Preview */}
        <Box sx={{ flex: '1 1 500px' }}>
          <QuotationPreview
            ref={quotationRef}
            quotationNumber={quotationNumber}
            clientName={clientName}
            asesorName={asesorName}
            date={date}
            expiryStr={expiryStr}
            notes={notes}
            products={products}
            investments={investments}
            customCosts={customCosts}
            totalInvestment={totalInvestment}
            productSubtotal={productSubtotal}
            discountPercent={discountPercent}
            subtotal={subtotal}
            discount={discount}
            total={total}
            businessSettings={businessSettings}
          />
        </Box>
      </Box>

      {/* Snackbar */}
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
          sx={{ width: '100%', fontWeight: 600, borderRadius: 2, boxShadow: documentShadows.elevated }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .quotation-preview, .quotation-preview * { visibility: visible; }
          .quotation-preview { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </Box>
  );
}

// =============================================================================
// FORM SUB-COMPONENTS (Inline to reduce file count)
// =============================================================================

interface SettingsAccordionProps {
  quotationNumber: string;
  setQuotationNumber: (num: string) => void;
  regenerateQuotationNumber: () => void;
  date: string;
  setDate: (date: string) => void;
  businessSettings: BusinessSettings;
  setBusinessSettings: React.Dispatch<React.SetStateAction<BusinessSettings>>;
}

const SettingsAccordion: React.FC<SettingsAccordionProps> = ({
  quotationNumber, setQuotationNumber, regenerateQuotationNumber,
  date, setDate,
  businessSettings, setBusinessSettings,
}) => (
  <Accordion defaultExpanded={false} sx={{ bgcolor: 'transparent', boxShadow: 'none', '&:before': { display: 'none' }, mb: 2 }}>
    <AccordionSummary
      expandIcon={<ExpandMoreIcon sx={{ color: brandColors.textPrimary }} />}
      sx={{ bgcolor: '#F9FAFB', borderRadius: 1, minHeight: 40, '& .MuiAccordionSummary-content': { my: 1 } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings size={16} color={brandColors.emerald} />
        <Typography variant="body2" sx={{ color: brandColors.textPrimary, fontWeight: 600 }}>
          Configuración de Cotización
        </Typography>
      </Box>
    </AccordionSummary>
    <AccordionDetails sx={{ bgcolor: '#F9FAFB', borderRadius: 1, mt: 0.5, p: 2 }}>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField fullWidth label="No. Cotización" value={quotationNumber} onChange={(e) => setQuotationNumber(e.target.value)} size="small" />
            <IconButton onClick={regenerateQuotationNumber} sx={{ color: brandColors.emerald }}><RefreshCw size={18} /></IconButton>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Teléfono de Contacto" value={businessSettings.contactPhone} onChange={(e) => setBusinessSettings({ ...businessSettings, contactPhone: e.target.value })} size="small" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Email de Contacto" value={businessSettings.contactEmail} onChange={(e) => setBusinessSettings({ ...businessSettings, contactEmail: e.target.value })} size="small" />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="NIT" value={businessSettings.nit} onChange={(e) => setBusinessSettings({ ...businessSettings, nit: e.target.value })} size="small" />
        </Grid>
      </Grid>
    </AccordionDetails>
  </Accordion>
);

interface ClientInfoSectionProps {
  clientName: string; setClientName: (v: string) => void;
  clientPhone: string; setClientPhone: (v: string) => void;
  clientEmail: string; setClientEmail: (v: string) => void;
  clientDocument: string; setClientDocument: (v: string) => void;
  asesorName: string; setAsesorName: (v: string) => void;
  asesorOptions: string[];
}

const ClientInfoSection: React.FC<ClientInfoSectionProps> = ({
  clientName, setClientName, clientPhone, setClientPhone, clientEmail, setClientEmail,
  clientDocument, setClientDocument, asesorName, setAsesorName, asesorOptions,
}) => (
  <>
    <Typography variant="subtitle2" sx={{
      color: brandColors.textPrimary,
      mb: 2,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: 700,
      fontSize: '0.875rem',
    }}>
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
          placeholder="Ej: Juan Pérez"
          helperText={clientName && clientName.length < 3 ? "El nombre debe tener al menos 3 caracteres" : ""}
          error={clientName !== '' && clientName.length < 3}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Teléfono"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          size="small"
          placeholder="+57 300 123 4567"
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
          placeholder="cliente@ejemplo.com"
          error={clientEmail !== '' && !clientEmail.includes('@')}
          helperText={clientEmail !== '' && !clientEmail.includes('@') ? "Ingresa un email válido" : ""}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Documento (Cédula/Pasaporte)"
          value={clientDocument}
          onChange={(e) => setClientDocument(e.target.value)}
          size="small"
          placeholder="Ej: 123456789"
        />
      </Grid>
      <Grid item xs={12}>
        <Autocomplete
          freeSolo size="small" options={asesorOptions} value={asesorName}
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
            <TextField {...params} label="Asesor" placeholder="Seleccionar o escribir nombre del asesor"
              InputProps={{ ...params.InputProps, startAdornment: <InputAdornment position="start"><User size={16} color={brandColors.gray} /></InputAdornment> }}
            />
          )}
        />
      </Grid>
    </Grid>
  </>
);

interface ProductEntrySectionProps {
  productEntryMode: 'inventory' | 'manual';
  setProductEntryMode: (mode: 'inventory' | 'manual') => void;
  availableInventory: InventoryItem[];
  selectedItem: InventoryItem | null;
  setSelectedItem: (item: InventoryItem | null) => void;
  handleAddProduct: () => void;
  manualProduct: ManualProductState;
  setManualProduct: React.Dispatch<React.SetStateAction<ManualProductState>>;
  handleAddManualProduct: () => void;
}

const ProductEntrySection: React.FC<ProductEntrySectionProps> = ({
  productEntryMode, setProductEntryMode, availableInventory, selectedItem, setSelectedItem,
  handleAddProduct, manualProduct, setManualProduct, handleAddManualProduct,
}) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2" sx={{
      color: brandColors.textPrimary,
      mb: 1.5,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: 700,
      fontSize: '0.875rem',
    }}>
      Agregar Producto
    </Typography>

    <ToggleButtonGroup value={productEntryMode} exclusive onChange={(_, value) => value && setProductEntryMode(value)} size="small" sx={{ mb: 2, width: '100%' }}>
      <ToggleButton value="inventory" sx={{ flex: 1, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', '&.Mui-selected': { bgcolor: alpha(brandColors.emerald, 0.1), color: brandColors.emerald } }}>
        <Package size={14} style={{ marginRight: 6 }} />Desde Inventario
      </ToggleButton>
      <ToggleButton value="manual" sx={{ flex: 1, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', '&.Mui-selected': { bgcolor: alpha(brandColors.gold, 0.15), color: brandColors.gold } }}>
        <FileText size={14} style={{ marginRight: 6 }} />Entrada Manual
      </ToggleButton>
    </ToggleButtonGroup>

    {productEntryMode === 'inventory' && (
      <>
        <Autocomplete
          size="small" options={availableInventory}
          getOptionLabel={(option) => `#${option.item} - ${option.nombre}`}
          value={selectedItem} onChange={(_, item) => setSelectedItem(item)}
          filterOptions={(options, { inputValue }) => {
            const term = inputValue.toLowerCase();
            return options.filter(o => o.nombre.toLowerCase().includes(term) || o.item.toString().includes(term) || o.color.toLowerCase().includes(term));
          }}
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1 }}>
              <Avatar src={option.imagen} variant="rounded" sx={{ width: 48, height: 48, bgcolor: brandColors.lightGray }}>
                {option.isJewelry ? <ShoppingBag size={20} /> : <Gem size={20} />}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>#{option.item} - {option.nombre}</Typography>
                <Typography variant="caption" color="grey.500">{getPesoDisplay(option)} • {option.color} • {option.talla}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ color: brandColors.emerald, fontWeight: 700 }}>{formatCurrency(option.precioCOP)}</Typography>
                <Chip label={option.isJewelry ? 'Joya' : 'Gema'} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: option.isJewelry ? alpha(brandColors.gold, 0.15) : alpha(brandColors.emerald, 0.15), color: option.isJewelry ? brandColors.gold : brandColors.emerald }} />
              </Box>
            </Box>
          )}
          renderInput={(params) => <TextField {...params} label="Buscar en inventario" placeholder="Nombre, número, color..." />}
          noOptionsText="No hay productos disponibles" sx={{ mb: 2 }}
        />
        <Button
          fullWidth
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={handleAddProduct}
          disabled={!selectedItem}
          sx={{
            bgcolor: brandColors.emerald,
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.5,
            borderRadius: 2,
            mb: 3,
            boxShadow: selectedItem ? `0 4px 12px ${alpha(brandColors.emerald, 0.3)}` : 'none',
            '&:hover': {
              bgcolor: brandColors.emeraldDark,
              boxShadow: `0 6px 16px ${alpha(brandColors.emerald, 0.4)}`,
            },
            '&:disabled': {
              bgcolor: '#E5E7EB',
              color: '#9CA3AF',
            },
          }}
        >
          Agregar del Inventario
        </Button>
      </>
    )}

    {productEntryMode === 'manual' && (
      <Box sx={{ bgcolor: '#F9FAFB', p: 2, borderRadius: 2, mb: 3 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12}>
            <TextField fullWidth label="Nombre del producto *" value={manualProduct.name} onChange={(e) => setManualProduct({ ...manualProduct, name: e.target.value })} size="small" placeholder="Ej: Esmeralda Corazón Verde" />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={manualProduct.isJewelry} onChange={(e) => setManualProduct({ ...manualProduct, isJewelry: e.target.checked })} size="small" sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: brandColors.gold }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: brandColors.gold } }} />}
              label={<Typography variant="body2" sx={{ fontSize: '0.8rem', color: brandColors.gray }}>Es joya (no esmeralda suelta)</Typography>}
            />
          </Grid>
          {manualProduct.isJewelry ? (
            <Grid item xs={12}>
              <TextField fullWidth label="Tipo de metal" value={manualProduct.metalType} onChange={(e) => setManualProduct({ ...manualProduct, metalType: e.target.value })} size="small" placeholder="Ej: Oro 18k, Plata 925" />
            </Grid>
          ) : (
            <>
              <Grid item xs={6}><TextField fullWidth label="Peso (ct)" value={manualProduct.peso} onChange={(e) => setManualProduct({ ...manualProduct, peso: e.target.value })} size="small" placeholder="Ej: 2.5" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Color" value={manualProduct.color} onChange={(e) => setManualProduct({ ...manualProduct, color: e.target.value })} size="small" placeholder="Ej: Verde Intenso" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Calidad" value={manualProduct.calidad} onChange={(e) => setManualProduct({ ...manualProduct, calidad: e.target.value })} size="small" placeholder="Ej: AAA" /></Grid>
              <Grid item xs={6}><TextField fullWidth label="Talla" value={manualProduct.talla} onChange={(e) => setManualProduct({ ...manualProduct, talla: e.target.value })} size="small" placeholder="Ej: Óvalo" /></Grid>
            </>
          )}
          <Grid item xs={12}>
            <TextField fullWidth label="Precio COP *" type="number" value={manualProduct.precioCOP || ''} onChange={(e) => setManualProduct({ ...manualProduct, precioCOP: parseFloat(e.target.value) || 0 })} size="small" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          </Grid>
        </Grid>
        <Button fullWidth variant="contained" startIcon={<Plus size={18} />} onClick={handleAddManualProduct} disabled={!manualProduct.name || manualProduct.precioCOP <= 0}
          sx={{ mt: 2, bgcolor: brandColors.gold, color: '#fff', textTransform: 'none', fontWeight: 600, py: 1.25, borderRadius: 2, '&:hover': { bgcolor: '#B8941F' }, '&.Mui-disabled': { bgcolor: alpha(brandColors.gold, 0.3), color: 'rgba(255,255,255,0.6)' } }}
        >
          Agregar Producto Manual
        </Button>
      </Box>
    )}
  </Box>
);

interface ProductListSectionProps {
  products: CotizacionProduct[];
  handleRemoveProduct: (id: string) => void;
}

const ProductListSection: React.FC<ProductListSectionProps> = ({ products, handleRemoveProduct }) => {
  if (products.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Layers size={16} color={brandColors.emerald} />
        <Typography variant="subtitle2" sx={{
          color: brandColors.textPrimary,
          fontWeight: 700,
          fontSize: '0.875rem',
        }}>Productos Seleccionados ({products.length})</Typography>
      </Box>
      {products.map((product) => (
        <Box key={product.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, px: 1.5, mb: 1, bgcolor: '#F9FAFB', borderRadius: 1.5, border: '1px solid #E5E7EB' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar src={product.imagen} variant="rounded" sx={{ width: 40, height: 40, bgcolor: brandColors.lightGray }}>
              {product.isJewelry ? <ShoppingBag size={16} /> : <Gem size={16} />}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>#{product.itemNumber} - {product.name}</Typography>
              <Typography variant="caption" color="grey.500">{getPesoDisplay(product)} • {product.color}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: brandColors.emerald, fontWeight: 700 }}>{formatCurrency(product.precioCOP)}</Typography>
            <IconButton size="small" onClick={() => handleRemoveProduct(product.id)} sx={{ color: '#9CA3AF', '&:hover': { color: '#EF4444', bgcolor: alpha('#EF4444', 0.1) } }}>
              <Trash2 size={16} />
            </IconButton>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

interface InvestmentFormSectionProps {
  investments: CotizacionInvestment[];
  handleInvestmentChange: (id: string, value: number) => void;
  handleResetInvestments: () => void;
  customCosts: CustomCost[];
  handleRemoveCustomCost: (id: string) => void;
  newCustomLabel: string;
  setNewCustomLabel: (v: string) => void;
  newCustomValue: number;
  setNewCustomValue: (v: number) => void;
  handleAddCustomCost: () => void;
  totalInvestment: number;
}

const InvestmentFormSection: React.FC<InvestmentFormSectionProps> = ({
  investments, handleInvestmentChange, handleResetInvestments, customCosts,
  handleRemoveCustomCost, newCustomLabel, setNewCustomLabel, newCustomValue,
  setNewCustomValue, handleAddCustomCost, totalInvestment,
}) => (
  <Box sx={{ mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Typography variant="subtitle2" sx={{
        color: brandColors.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: 700,
        fontSize: '0.875rem',
      }}>Inversión</Typography>
      <Tooltip title="Reiniciar inversión">
        <IconButton size="small" onClick={handleResetInvestments} sx={{ color: '#9CA3AF', '&:hover': { color: brandColors.emerald } }}>
          <RotateCcw size={16} />
        </IconButton>
      </Tooltip>
    </Box>

    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {investments.map((inv) => (
        <Box key={inv.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            {getInvestmentIcon(inv.icon)}
            <Typography variant="body2" sx={{ color: brandColors.textPrimary, fontWeight: 500 }}>{inv.label}</Typography>
          </Box>
          <TextField size="small" type="number" value={inv.value || ''} onChange={(e) => handleInvestmentChange(inv.id, parseFloat(e.target.value) || 0)} sx={{ width: 140 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        </Box>
      ))}
    </Box>

    <Accordion sx={{ bgcolor: 'transparent', boxShadow: 'none', '&:before': { display: 'none' }, mt: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: brandColors.textPrimary }} />} sx={{ bgcolor: '#F9FAFB', borderRadius: 1, minHeight: 40, '& .MuiAccordionSummary-content': { my: 1 } }}>
        <Typography variant="body2" sx={{ color: brandColors.textPrimary, fontWeight: 600 }}>Costos adicionales {customCosts.length > 0 && `(${customCosts.length})`}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: '#F9FAFB', borderRadius: 1, mt: 0.5, p: 2 }}>
        {customCosts.map((cost) => (
          <Box key={cost.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #E5E7EB' }}>
            <Typography variant="body2">{cost.label}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: brandColors.emerald, fontWeight: 600 }}>{formatCurrency(cost.value)}</Typography>
              <IconButton size="small" onClick={() => handleRemoveCustomCost(cost.id)} sx={{ color: '#9CA3AF', '&:hover': { color: '#EF4444' } }}><Trash2 size={14} /></IconButton>
            </Box>
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <TextField size="small" label="Otro" value={newCustomLabel} onChange={(e) => setNewCustomLabel(e.target.value)} sx={{ flex: 1 }} />
          <TextField size="small" type="number" value={newCustomValue || ''} onChange={(e) => setNewCustomValue(parseFloat(e.target.value) || 0)} sx={{ width: 120 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        </Box>
        <Button fullWidth variant="text" startIcon={<Plus size={16} />} onClick={handleAddCustomCost} disabled={!newCustomLabel || newCustomValue <= 0} sx={{ mt: 1.5, color: brandColors.emerald, textTransform: 'none', fontWeight: 600 }}>
          Agregar costo
        </Button>
      </AccordionDetails>
    </Accordion>

    {totalInvestment > 0 && (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, p: 1.5, bgcolor: alpha(brandColors.emerald, 0.08), borderRadius: 1.5, border: `1px solid ${alpha(brandColors.emerald, 0.2)}` }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: brandColors.textPrimary }}>Total Inversión</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: brandColors.emerald }}>{formatCurrency(totalInvestment)}</Typography>
      </Box>
    )}
  </Box>
);

interface DiscountValiditySectionProps {
  discountPercent: number;
  setDiscountPercent: (v: number) => void;
  validDays: number;
  setValidDays: (v: number) => void;
  notes: string;
  setNotes: (v: string) => void;
}

const DiscountValiditySection: React.FC<DiscountValiditySectionProps> = ({
  discountPercent, setDiscountPercent, validDays, setValidDays, notes, setNotes,
}) => (
  <Grid container spacing={1.5} sx={{ mb: 3 }}>
    <Grid item xs={12} sm={6}>
      <TextField fullWidth label="Descuento %" type="number" value={discountPercent || ''} onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} size="small" InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <Box>
        <Typography variant="caption" sx={{ color: 'grey.500' }}>Días de validez: {validDays}</Typography>
        <Slider value={validDays} onChange={(_, v) => setValidDays(v as number)} min={3} max={60} step={1} sx={{ color: brandColors.gold }} />
      </Box>
    </Grid>
    <Grid item xs={12}>
      <TextField fullWidth label="Notas adicionales" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} size="small" />
    </Grid>
  </Grid>
);

interface ActionButtonsProps {
  handleExportPDF: () => void;
  handlePrint: () => void;
  handleNewQuotation: () => void;
  disabled: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ handleExportPDF, handlePrint, handleNewQuotation, disabled }) => (
  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button
      variant="contained" startIcon={<Download size={18} />} onClick={handleExportPDF} disabled={disabled}
      sx={{ bgcolor: brandColors.emerald, flex: 1, textTransform: 'none', fontWeight: 700, py: 1.25, borderRadius: 2, boxShadow: `0 4px 16px ${alpha(brandColors.emerald, 0.3)}`, '&:hover': { bgcolor: brandColors.emeraldDark, boxShadow: `0 6px 20px ${alpha(brandColors.emerald, 0.4)}` } }}
    >
      Exportar PDF
    </Button>
    <Tooltip title="Imprimir">
      <IconButton onClick={handlePrint} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, color: '#6B7280', '&:hover': { bgcolor: alpha(brandColors.emerald, 0.1), color: brandColors.emerald } }}>
        <Printer size={20} />
      </IconButton>
    </Tooltip>
    <Tooltip title="Nueva Cotización">
      <IconButton onClick={handleNewQuotation} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, color: '#6B7280', '&:hover': { bgcolor: alpha(brandColors.emerald, 0.1), color: brandColors.emerald } }}>
        <Copy size={20} />
      </IconButton>
    </Tooltip>
  </Box>
);
