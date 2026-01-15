/**
 * TIERRA MADRE - Cotización Generator
 * Professional quotation generator selecting from treasure stock.
 *
 * Refactored: Extracted CotizacionHeader, QuotationPreview, and constants
 * to separate components for better maintainability.
 */

import React, { useState, useRef, useEffect } from 'react';
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
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Video,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { documentShadows } from '../design-system/tokens';
import { useTreasure } from '../hooks/useTreasure';
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
import { TreasureItem } from '../types';
import { SAMPLE_AMBASSADORS } from '../data/ambassadors';
import { CotizacionHeader, QuotationPreview, brandColors } from './cotizacion';
import { createLogger } from '../utils/logger';
import { useTracking } from '../contexts/TrackingContext';
import { useRecentClients, RecentClient } from '../hooks/useRecentClients';
import { useCotizacionHistory } from '../hooks/useCotizacionHistory';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

const log = createLogger('Cotizacion');
const formatCurrency = formatCotizacionCurrency;

// =============================================================================
// INVESTMENT ICON HELPER
// =============================================================================

const getInvestmentIcon = (iconId: string) => {
  const icons: Record<string, React.ReactNode> = {
    emerald: <Gem size={16} color={brandColors.emerald} />,
    gold: <Award size={16} color={brandColors.gold} />,
    silver: <CircleDollarSign size={16} color={brandColors.textMuted} />,
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
  const { treasure } = useTreasure();
  const { track, checkAchievements } = useTracking();
  const recentClients = useRecentClients();
  const cotizacionHistory = useCotizacionHistory();
  const { user: googleUser } = useGoogleAuth();

  // Track cotización start time for funnel metrics
  const startTimeRef = useRef<number>(Date.now());

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
    addProductFromTreasure,
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

  // Filter available treasure
  const availableTreasure = treasure.filter(item => item.estado === 'DISPONIBLE');

  // UI-only state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const asesorOptions = SAMPLE_AMBASSADORS.map(amb => amb.displayName);
  const [selectedItem, setSelectedItem] = useState<TreasureItem | null>(null);
  const [productEntryMode, setProductEntryMode] = useState<'treasure' | 'manual'>('treasure');
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomValue, setNewCustomValue] = useState<number>(0);

  // Media upload state for manual product entry
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isVideoPreview, setIsVideoPreview] = useState(false);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleAddProduct = () => {
    if (!selectedItem) return;
    addProductFromTreasure(selectedItem);

    // Track product added from treasure
    track('cotizacion_product_added', {
      product_id: selectedItem.item,
      product_name: selectedItem.nombre || 'Sin nombre',
      product_price: selectedItem.precioCOP || 0,
      entry_mode: 'treasure',
      products_count: products.length + 1,
    });

    setSelectedItem(null);
  };

  const handleAddManualProduct = () => {
    addManualProduct(manualProduct);

    // Track manual product added
    track('cotizacion_product_added', {
      product_id: null,
      product_name: manualProduct.name || 'Producto manual',
      product_price: manualProduct.precioCOP || 0,
      entry_mode: 'manual',
      products_count: products.length + 1,
    });

    // Reset image preview after adding
    setImagePreview(null);
  };

  // Handle media upload for manual product entry (images and videos)
  // Uses Cloudinary for optimized uploads with automatic format conversion
  const handleManualProductMediaUpload = async (file: File) => {
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for images
    const maxSizeLabel = isVideo ? '100MB' : '10MB';

    // Validate file size
    if (file.size > maxSize) {
      setSnackbar({
        open: true,
        message: `El archivo es muy grande. Maximo ${maxSizeLabel}.`,
        severity: 'error',
      });
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setIsVideoPreview(isVideo);
    setIsUploadingImage(true);

    try {
      // Upload to Cloudinary for optimized delivery
      const formData = new FormData();
      formData.append('quotationId', `manual-${quotationNumber}`);
      formData.append('file', file);

      // Try Cloudinary first (better optimization and CDN)
      let response = await fetch('/api/cloudinary-upload', {
        method: 'POST',
        body: formData,
      });

      let data = await response.json();

      // Fallback to Google Drive if Cloudinary fails
      if (!data.success) {
        console.log('[Upload] Cloudinary failed, trying Google Drive fallback...');
        const driveFormData = new FormData();
        driveFormData.append('quotationId', `manual-${quotationNumber}`);
        driveFormData.append('file', file);

        response = await fetch('/api/media-upload', {
          method: 'POST',
          body: driveFormData,
        });
        data = await response.json();
      }

      // Log the full response for debugging
      console.log('[Upload] API Response:', { status: response.status, data });

      if (data.success && data.files && data.files.length > 0) {
        const uploadedFile = data.files[0];
        // Update manual product with uploaded URL (use thumbnail for videos in product card)
        const displayUrl = uploadedFile.isVideo
          ? (uploadedFile.thumbnailUrl || uploadedFile.url)
          : uploadedFile.url;

        setManualProduct(prev => ({
          ...prev,
          imagen: displayUrl,
          // Store video URL and GIF URL for videos (GIF used in PDF export)
          ...(uploadedFile.isVideo && {
            videoUrl: uploadedFile.videoUrl,
            gifUrl: uploadedFile.gifUrl, // Animated GIF for PDF display
          }),
        }));

        const mediaType = isVideo ? 'Video' : isGif ? 'GIF' : 'Imagen';
        setSnackbar({
          open: true,
          message: `${mediaType} subido exitosamente`,
          severity: 'success',
        });
      } else {
        throw new Error(data.error || 'Error al subir el archivo');
      }
    } catch (error) {
      log.error('Media upload error:', error);

      // Parse error message for user-friendly display
      let errorMessage = 'Error al subir el archivo';
      if (error instanceof Error && error.message) {
        if (error.message.includes('storage quota') || error.message.includes('Service Accounts')) {
          errorMessage = 'El archivo es muy grande. Por favor intenta con un archivo más pequeño.';
        } else if (error.message.includes('Failed to create upload folder')) {
          errorMessage = 'Error de configuración. Contacta al administrador.';
        } else if (error.message.includes('maxFileSize')) {
          errorMessage = 'El archivo excede el tamaño máximo permitido (100MB).';
        } else if (error.message.includes('Cloudinary not configured')) {
          errorMessage = 'Servicio de subida no configurado. Contacta al administrador.';
        } else {
          errorMessage = error.message;
        }
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });

      // Revert preview on error
      setImagePreview(null);
      setIsVideoPreview(false);
      setManualProduct(prev => ({ ...prev, imagen: undefined, videoUrl: undefined }));
    } finally {
      setIsUploadingImage(false);
    }
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
    // Track cotización started
    track('cotizacion_started', {
      entry_source: 'accounts_hub',
    });

    // Reset start time for new cotización
    startTimeRef.current = Date.now();

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

      const imgData = canvas.toDataURL('image/png', 0.95); // High quality PNG
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

      // Track cotización exported - KEY FUNNEL EVENT
      const timeToComplete = Math.floor((Date.now() - startTimeRef.current) / 1000);
      track('cotizacion_exported', {
        quotation_number: quotationNumber,
        products_count: products.length,
        total_amount: total,
        has_discount: discountPercent > 0,
        time_to_complete: timeToComplete,
      });

      // Save client for future autocomplete (Quick Win)
      if (clientName && clientName.length >= 3) {
        recentClients.saveClient({
          name: clientName,
          phone: clientPhone || undefined,
          email: clientEmail || undefined,
          document: clientDocument || undefined,
        });
      }

      // Check for achievements after export
      checkAchievements();

      // Save cotización to history (if user is authenticated)
      if (googleUser?.email && asesorName) {
        // Calculate expiry date
        const expiryDate = new Date(date);
        expiryDate.setDate(expiryDate.getDate() + validDays);

        cotizacionHistory.saveCotizacion({
          quotationNumber,
          asesorEmail: googleUser.email,
          asesorName,
          clientName: clientName || undefined,
          clientPhone: clientPhone || undefined,
          productsCount: products.length,
          total,
          expiryDate: expiryDate.toISOString(),
          imageBase64: imgData,
        }).then((saved) => {
          if (saved) {
            log.info(`Cotización ${quotationNumber} saved to history`);
          }
        }).catch((err) => {
          log.warn('Failed to save cotización to history:', err);
        });
      }

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
    // Track print action
    track('cotizacion_printed', {
      quotation_number: quotationNumber,
    });
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
            border: `1px solid ${brandColors.borderSubtle}`,
            bgcolor: brandColors.white,
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
                    bgcolor: step.completed ? brandColors.emerald : brandColors.borderSubtle,
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
                    color: brandColors.textSecondary,
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
            recentClients={recentClients.clients}
            onSelectClient={(client) => {
              setClientName(client.name);
              if (client.phone) setClientPhone(client.phone);
              if (client.email) setClientEmail(client.email);
              if (client.document) setClientDocument(client.document);
            }}
          />

          <Divider sx={{ my: 3 }} />

          {/* Add Product Section */}
          <ProductEntrySection
            productEntryMode={productEntryMode}
            setProductEntryMode={setProductEntryMode}
            availableTreasure={availableTreasure}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            handleAddProduct={handleAddProduct}
            manualProduct={manualProduct}
            setManualProduct={setManualProduct}
            handleAddManualProduct={handleAddManualProduct}
            quotationNumber={quotationNumber}
            isUploadingImage={isUploadingImage}
            setIsUploadingImage={setIsUploadingImage}
            imagePreview={imagePreview}
            setImagePreview={setImagePreview}
            isVideoPreview={isVideoPreview}
            setIsVideoPreview={setIsVideoPreview}
            onImageUpload={handleManualProductMediaUpload}
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

      {/* Snackbar - positioned above bottom tab bar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          zIndex: 1400, // Above IOSTabBar (1000)
          mb: 'calc(env(safe-area-inset-bottom, 0px) + 72px)', // Above tab bar
        }}
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

      {/* Print Styles & Animations */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .quotation-preview, .quotation-preview * { visibility: visible; }
          .quotation-preview { position: absolute; left: 0; top: 0; width: 100%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
      sx={{ bgcolor: brandColors.surfaceElevated, borderRadius: 1, minHeight: 44, '& .MuiAccordionSummary-content': { my: 1 } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings size={16} color={brandColors.emerald} />
        <Typography variant="body2" sx={{ color: brandColors.textPrimary, fontWeight: 600 }}>
          Configuración de Cotización
        </Typography>
      </Box>
    </AccordionSummary>
    <AccordionDetails sx={{ bgcolor: brandColors.surfaceElevated, borderRadius: 1, mt: 0.5, p: 2 }}>
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
  recentClients?: RecentClient[];
  onSelectClient?: (client: RecentClient) => void;
}

const ClientInfoSection: React.FC<ClientInfoSectionProps> = ({
  clientName, setClientName, clientPhone, setClientPhone, clientEmail, setClientEmail,
  clientDocument, setClientDocument, asesorName, setAsesorName, asesorOptions,
  recentClients = [], onSelectClient,
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
        <Autocomplete
          freeSolo
          size="small"
          options={recentClients}
          getOptionLabel={(option) =>
            typeof option === 'string' ? option : option.name
          }
          value={clientName}
          onChange={(_, value) => {
            if (typeof value === 'string') {
              setClientName(value);
            } else if (value && onSelectClient) {
              onSelectClient(value);
            }
          }}
          onInputChange={(_, value) => setClientName(value)}
          renderOption={(props, option) => (
            <li {...props}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {option.name}
                </Typography>
                {(option.phone || option.email) && (
                  <Typography variant="caption" sx={{ color: brandColors.textMuted }}>
                    {option.phone}{option.phone && option.email ? ' · ' : ''}{option.email}
                  </Typography>
                )}
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Nombre del Cliente"
              placeholder="Ej: Juan Pérez (o selecciona uno reciente)"
              helperText={clientName && clientName.length < 3 ? "El nombre debe tener al menos 3 caracteres" : recentClients.length > 0 ? "Clientes frecuentes disponibles" : ""}
              error={clientName !== '' && clientName.length < 3}
            />
          )}
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
  productEntryMode: 'treasure' | 'manual';
  setProductEntryMode: (mode: 'treasure' | 'manual') => void;
  availableTreasure: TreasureItem[];
  selectedItem: TreasureItem | null;
  setSelectedItem: (item: TreasureItem | null) => void;
  handleAddProduct: () => void;
  manualProduct: ManualProductState;
  setManualProduct: React.Dispatch<React.SetStateAction<ManualProductState>>;
  handleAddManualProduct: () => void;
  quotationNumber: string;
  isUploadingImage: boolean;
  setIsUploadingImage: (v: boolean) => void;
  imagePreview: string | null;
  setImagePreview: (v: string | null) => void;
  isVideoPreview: boolean;
  setIsVideoPreview: (v: boolean) => void;
  onImageUpload: (file: File) => Promise<void>;
}

const ProductEntrySection: React.FC<ProductEntrySectionProps> = ({
  productEntryMode, setProductEntryMode, availableTreasure, selectedItem, setSelectedItem,
  handleAddProduct, manualProduct, setManualProduct, handleAddManualProduct,
  isUploadingImage, imagePreview, setImagePreview, isVideoPreview, setIsVideoPreview, onImageUpload,
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
      <ToggleButton value="treasure" sx={{ flex: 1, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', '&.Mui-selected': { bgcolor: alpha(brandColors.emerald, 0.1), color: brandColors.emerald } }}>
        <Package size={14} style={{ marginRight: 6 }} />Desde Tesoros
      </ToggleButton>
      <ToggleButton value="manual" sx={{ flex: 1, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', '&.Mui-selected': { bgcolor: alpha(brandColors.gold, 0.15), color: brandColors.gold } }}>
        <FileText size={14} style={{ marginRight: 6 }} />Entrada Manual
      </ToggleButton>
    </ToggleButtonGroup>

    {productEntryMode === 'treasure' && (
      <>
        <Autocomplete
          size="small" options={availableTreasure}
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
            color: brandColors.white,
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
              bgcolor: brandColors.borderSubtle,
              color: brandColors.textMuted,
            },
          }}
        >
          Agregar del Inventario
        </Button>
      </>
    )}

    {productEntryMode === 'manual' && (
      <Box sx={{ bgcolor: brandColors.surfaceElevated, p: 2, borderRadius: 2, mb: 3 }}>
        <Grid container spacing={1.5}>
          {/* Image Upload Section */}
          <Grid item xs={12}>
            <Typography variant="caption" sx={{ color: brandColors.gray, display: 'block', mb: 1 }}>
              Imagen del producto (opcional)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              {/* Image Preview / Upload Zone */}
              <Box
                component="label"
                htmlFor="manual-product-image"
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2,
                  border: `2px dashed ${imagePreview ? brandColors.emerald : brandColors.borderSubtle}`,
                  bgcolor: imagePreview ? 'transparent' : alpha(brandColors.emerald, 0.02),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isUploadingImage ? 'wait' : 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  '&:hover': {
                    borderColor: brandColors.emerald,
                    bgcolor: alpha(brandColors.emerald, 0.05),
                  },
                }}
              >
                <input
                  id="manual-product-image"
                  type="file"
                  accept="image/*,video/*,.gif,.mp4,.mov,.webm"
                  hidden
                  disabled={isUploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImageUpload(file);
                    }
                    e.target.value = '';
                  }}
                />
                {isUploadingImage ? (
                  <Loader2 size={24} color={brandColors.emerald} style={{ animation: 'spin 1s linear infinite' }} />
                ) : imagePreview ? (
                  isVideoPreview ? (
                    <Box
                      component="video"
                      src={imagePreview}
                      muted
                      playsInline
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="Preview"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )
                ) : (
                  <Box sx={{ textAlign: 'center' }}>
                    <Upload size={20} color={brandColors.gray} />
                    <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray, mt: 0.5 }}>
                      Foto/Video
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Media Info / Actions */}
              <Box sx={{ flex: 1 }}>
                {imagePreview ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {isVideoPreview ? (
                        <Video size={14} color={brandColors.emerald} />
                      ) : (
                        <ImageIcon size={14} color={brandColors.emerald} />
                      )}
                      <Typography sx={{ fontSize: '0.75rem', color: brandColors.emerald, fontWeight: 600 }}>
                        {isVideoPreview ? 'Video cargado' : 'Imagen cargada'}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<X size={14} />}
                      onClick={() => {
                        setImagePreview(null);
                        setIsVideoPreview(false);
                        setManualProduct({ ...manualProduct, imagen: undefined, videoUrl: undefined });
                      }}
                      sx={{
                        fontSize: '0.7rem',
                        color: brandColors.error,
                        textTransform: 'none',
                        p: 0.5,
                        minWidth: 'auto',
                        '&:hover': { bgcolor: alpha(brandColors.error, 0.1) },
                      }}
                    >
                      Eliminar
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <Typography sx={{ fontSize: '0.7rem', color: brandColors.textSecondary }}>
                      Arrastra o haz clic para subir
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: brandColors.textMuted, mt: 0.25 }}>
                      JPG, PNG, GIF (max 10MB)
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Product Type Toggle - Gem vs Jewelry */}
          <Grid item xs={12}>
            <Typography variant="caption" sx={{ color: brandColors.gray, display: 'block', mb: 1 }}>
              Tipo de producto
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box
                onClick={() => setManualProduct({ ...manualProduct, isJewelry: false })}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.75,
                  py: 1.5,
                  px: 2,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: `2px solid ${!manualProduct.isJewelry ? brandColors.emerald : brandColors.borderSubtle}`,
                  bgcolor: !manualProduct.isJewelry ? alpha(brandColors.emerald, 0.08) : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: brandColors.emerald,
                    bgcolor: alpha(brandColors.emerald, 0.05),
                  },
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: !manualProduct.isJewelry ? alpha(brandColors.emerald, 0.15) : alpha(brandColors.gray, 0.1),
                  }}
                >
                  <Gem size={22} color={!manualProduct.isJewelry ? brandColors.emerald : brandColors.gray} />
                </Box>
                <Typography sx={{
                  fontSize: '0.75rem',
                  fontWeight: !manualProduct.isJewelry ? 700 : 500,
                  color: !manualProduct.isJewelry ? brandColors.emerald : brandColors.gray,
                }}>
                  Esmeralda
                </Typography>
                <Typography sx={{ fontSize: '0.6rem', color: brandColors.textMuted, textAlign: 'center' }}>
                  Gema suelta
                </Typography>
              </Box>

              <Box
                onClick={() => setManualProduct({ ...manualProduct, isJewelry: true })}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.75,
                  py: 1.5,
                  px: 2,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: `2px solid ${manualProduct.isJewelry ? brandColors.gold : brandColors.borderSubtle}`,
                  bgcolor: manualProduct.isJewelry ? alpha(brandColors.gold, 0.08) : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: brandColors.gold,
                    bgcolor: alpha(brandColors.gold, 0.05),
                  },
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: manualProduct.isJewelry ? alpha(brandColors.gold, 0.15) : alpha(brandColors.gray, 0.1),
                  }}
                >
                  <ShoppingBag size={22} color={manualProduct.isJewelry ? brandColors.gold : brandColors.gray} />
                </Box>
                <Typography sx={{
                  fontSize: '0.75rem',
                  fontWeight: manualProduct.isJewelry ? 700 : 500,
                  color: manualProduct.isJewelry ? brandColors.gold : brandColors.gray,
                }}>
                  Joya
                </Typography>
                <Typography sx={{ fontSize: '0.6rem', color: brandColors.textMuted, textAlign: 'center' }}>
                  Con metal
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth label="Nombre del producto *" value={manualProduct.name} onChange={(e) => setManualProduct({ ...manualProduct, name: e.target.value })} size="small" placeholder={manualProduct.isJewelry ? "Ej: Anillo Esperanza Oro 18k" : "Ej: Esmeralda Corazón Verde"} />
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
        <Button fullWidth variant="contained" startIcon={isUploadingImage ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={18} />} onClick={handleAddManualProduct} disabled={!manualProduct.name || manualProduct.precioCOP <= 0 || isUploadingImage}
          sx={{ mt: 2, bgcolor: brandColors.gold, color: brandColors.white, textTransform: 'none', fontWeight: 600, py: 1.25, borderRadius: 2, '&:hover': { bgcolor: brandColors.goldDark }, '&.Mui-disabled': { bgcolor: alpha(brandColors.gold, 0.3), color: 'rgba(255,255,255,0.6)' } }}
        >
          {isUploadingImage ? 'Subiendo imagen...' : 'Agregar Producto Manual'}
        </Button>
      </Box>
    )}
  </Box>
);

interface ProductListSectionProps {
  products: CotizacionProduct[];
  handleRemoveProduct: (id: string) => void;
}

/**
 * ProductThumbnail - Improved product image with proper loading states
 */
const ProductThumbnail: React.FC<{
  src?: string;
  isJewelry: boolean;
  size?: number;
}> = ({ src, isJewelry, size = 48 }) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Reset states when src changes
  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [src]);

  const hasValidSrc = src && !imgError;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        bgcolor: isJewelry ? alpha(brandColors.gold, 0.1) : alpha(brandColors.emerald, 0.1),
        border: `1px solid ${brandColors.borderSubtle}`,
        flexShrink: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {hasValidSrc && (
        <Box
          component="img"
          src={src}
          alt="Product"
          onError={() => setImgError(true)}
          onLoad={() => setImgLoaded(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      {/* Fallback icon */}
      {(!hasValidSrc || !imgLoaded) && (
        <Box
          sx={{
            position: hasValidSrc ? 'absolute' : 'static',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isJewelry ? (
            <ShoppingBag size={size * 0.4} color={brandColors.gold} />
          ) : (
            <Gem size={size * 0.4} color={brandColors.emerald} />
          )}
        </Box>
      )}
    </Box>
  );
};

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
        <Box key={product.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, px: 1.5, mb: 1, bgcolor: brandColors.surfaceElevated, borderRadius: 1.5, border: `1px solid ${brandColors.borderSubtle}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ProductThumbnail
              src={product.imagen}
              isJewelry={product.isJewelry}
              size={48}
            />
            <Box>
              <Typography variant="body2" fontWeight={600}>#{product.itemNumber} - {product.name}</Typography>
              <Typography variant="caption" color="grey.500">{getPesoDisplay(product)} • {product.color}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: brandColors.emerald, fontWeight: 700 }}>{formatCurrency(product.precioCOP)}</Typography>
            <IconButton size="small" onClick={() => handleRemoveProduct(product.id)} sx={{ color: brandColors.textMuted, '&:hover': { color: brandColors.error, bgcolor: alpha(brandColors.error, 0.1) } }}>
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
        <IconButton size="small" onClick={handleResetInvestments} sx={{ color: brandColors.textMuted, '&:hover': { color: brandColors.emerald } }}>
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
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: brandColors.textPrimary }} />} sx={{ bgcolor: brandColors.surfaceElevated, borderRadius: 1, minHeight: 40, '& .MuiAccordionSummary-content': { my: 1 } }}>
        <Typography variant="body2" sx={{ color: brandColors.textPrimary, fontWeight: 600 }}>Costos adicionales {customCosts.length > 0 && `(${customCosts.length})`}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: brandColors.surfaceElevated, borderRadius: 1, mt: 0.5, p: 2 }}>
        {customCosts.map((cost) => (
          <Box key={cost.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${brandColors.borderSubtle}` }}>
            <Typography variant="body2">{cost.label}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: brandColors.emerald, fontWeight: 600 }}>{formatCurrency(cost.value)}</Typography>
              <IconButton size="small" onClick={() => handleRemoveCustomCost(cost.id)} sx={{ color: brandColors.textMuted, '&:hover': { color: brandColors.error } }}><Trash2 size={14} /></IconButton>
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
      <IconButton onClick={handlePrint} sx={{ border: `1px solid ${brandColors.borderSubtle}`, borderRadius: 2, color: brandColors.textSecondary, '&:hover': { bgcolor: alpha(brandColors.emerald, 0.1), color: brandColors.emerald } }}>
        <Printer size={20} />
      </IconButton>
    </Tooltip>
    <Tooltip title="Nueva Cotización">
      <IconButton onClick={handleNewQuotation} sx={{ border: `1px solid ${brandColors.borderSubtle}`, borderRadius: 2, color: brandColors.textSecondary, '&:hover': { bgcolor: alpha(brandColors.emerald, 0.1), color: brandColors.emerald } }}>
        <Copy size={20} />
      </IconButton>
    </Tooltip>
  </Box>
);
