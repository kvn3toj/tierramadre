/**
 * TIERRA MADRE - Cotizacion Generator
 * Professional quotation generator selecting from treasure stock.
 *
 * Refactored: Form components extracted to ./form folder for maintainability.
 */

import { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { documentShadows } from '../../design-system/tokens';
import { useTreasure } from '../../hooks/useTreasure';
import { useCotizacion } from '../../hooks/useCotizacion';
import { TreasureItem } from '../../types';
import { useAsesores } from '../../hooks/useAsesores';
import { CotizacionHeader, QuotationPreview, brandColors } from './';
import { createLogger } from '../../utils/logger';
import { useTracking } from '../../contexts/TrackingContext';
import { useRecentClients } from '../../hooks/useRecentClients';
import { useCotizacionHistory } from '../../hooks/useCotizacionHistory';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { useCreatorInvitations } from '../../hooks/useCreatorInvitations';
import { useIsAdmin } from '../../hooks/usePermissions';
import { useIsEmbajador } from '../../hooks/useAuth';

// Form components
import {
  SettingsAccordion,
  ClientInfoSection,
  ProductEntrySection,
  ProductListSection,
  InvestmentFormSection,
  DiscountValiditySection,
  ActionButtons,
} from './form';

const log = createLogger('Cotizacion');

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
  const { asesores, isLoading: isLoadingAsesores } = useAsesores();
  const {
    invitations: invitedGuests,
    isLoading: isLoadingInvitations,
    isInvitedGuest,
  } = useCreatorInvitations(googleUser?.email);

  // Check if user can use manual product entry (admins and ambassadors only)
  const isAdmin = useIsAdmin();
  const isEmbajador = useIsEmbajador();
  const canUseManualEntry = isAdmin || isEmbajador;

  // Track cotizacion start time for funnel metrics
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
  const handleManualProductMediaUpload = async (file: File) => {
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeLabel = isVideo ? '100MB' : '10MB';
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

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

    const uploadStartTime = Date.now();
    log.info(`[Upload] Starting upload: ${file.name} (${fileSizeMB}MB, ${isVideo ? 'video' : 'image'})`);

    try {
      const formData = new FormData();
      formData.append('quotationId', `manual-${quotationNumber}`);
      formData.append('file', file);

      // Use fast-upload for speed
      let response = await fetch('/api/fast-upload', {
        method: 'POST',
        body: formData,
      });

      let data = await response.json();

      // Fallback to Cloudinary if fast-upload fails
      if (!data.success) {
        log.info('[Upload] Fast upload failed, trying Cloudinary fallback...');
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('quotationId', `manual-${quotationNumber}`);
        cloudinaryFormData.append('file', file);

        response = await fetch('/api/cloudinary-upload', {
          method: 'POST',
          body: cloudinaryFormData,
        });
        data = await response.json();
      }

      const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(1);
      log.info(`[Upload] Complete in ${uploadTime}s:`, { status: response.status, files: data.files?.length });

      if (data.success && data.files && data.files.length > 0) {
        const uploadedFile = data.files[0];
        const isVideoUpload = uploadedFile.isVideo || uploadedFile.isConvertedFromVideo;
        const displayUrl = isVideoUpload
          ? (uploadedFile.thumbnailUrl || uploadedFile.url)
          : uploadedFile.url;

        setManualProduct(prev => ({
          ...prev,
          imagen: displayUrl,
          ...(isVideoUpload && {
            videoUrl: uploadedFile.videoUrl,
            gifUrl: uploadedFile.gifUrl,
          }),
        }));

        const mediaType = isVideo ? 'Video' : isGif ? 'GIF' : 'Imagen';
        setSnackbar({
          open: true,
          message: `${mediaType} subido en ${uploadTime}s`,
          severity: 'success',
        });
      } else {
        throw new Error(data.error || 'Error al subir el archivo');
      }
    } catch (error) {
      log.error('Media upload error:', error);

      let errorMessage = 'Error al subir el archivo';
      if (error instanceof Error && error.message) {
        if (error.message.includes('storage quota') || error.message.includes('Service Accounts')) {
          errorMessage = 'El archivo es muy grande. Por favor intenta con un archivo mas pequeno.';
        } else if (error.message.includes('Failed to create upload folder')) {
          errorMessage = 'Error de configuracion. Contacta al administrador.';
        } else if (error.message.includes('maxFileSize')) {
          errorMessage = 'El archivo excede el tamano maximo permitido (100MB).';
        } else if (error.message.includes('Cloudinary not configured') || error.message.includes('OAuth')) {
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
    track('cotizacion_started', {
      entry_source: 'accounts_hub',
    });

    startTimeRef.current = Date.now();
    resetAll();
    setSelectedItem(null);
  };

  const handleExportPDF = async () => {
    if (!quotationRef.current) return;

    try {
      const contentElement = quotationRef.current;
      const contentWidth = contentElement.offsetWidth;
      const contentHeight = contentElement.offsetHeight;

      const canvas = await html2canvas(contentElement, {
        scale: 2.5,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        logging: false,
        width: contentWidth,
        height: contentHeight,
        windowWidth: contentWidth,
        windowHeight: contentHeight,
      });

      const imgData = canvas.toDataURL('image/png', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 4;
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - (margin * 2);

      const aspectRatio = canvas.width / canvas.height;
      let imgWidth = maxWidth;
      let imgHeight = imgWidth / aspectRatio;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * aspectRatio;
      }

      const xOffset = (pageWidth - imgWidth) / 2;
      const yOffset = margin;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
      pdf.save(`Cotizacion_${quotationNumber}.pdf`);

      // Track cotizacion exported
      const timeToComplete = Math.floor((Date.now() - startTimeRef.current) / 1000);
      track('cotizacion_exported', {
        quotation_number: quotationNumber,
        products_count: products.length,
        total_amount: total,
        has_discount: discountPercent > 0,
        time_to_complete: timeToComplete,
      });

      // Save client for future autocomplete
      if (clientName && clientName.length >= 3) {
        recentClients.saveClient({
          name: clientName,
          phone: clientPhone || undefined,
          email: clientEmail || undefined,
          document: clientDocument || undefined,
        });
      }

      // Log mismatch report if client is not in invited guests
      if (clientName && clientName.length >= 3 && !isInvitedGuest(clientName) && invitedGuests.length > 0) {
        fetch('/api/cotizacion-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asesorEmail: googleUser?.email || '',
            asesorName,
            clientNameEntered: clientName,
            clientPhone: clientPhone || undefined,
            clientEmail: clientEmail || undefined,
            expectedGuests: invitedGuests
              .filter(g => g.guestName)
              .map(g => g.guestName),
            quotationNumber,
          }),
        }).catch(err => {
          log.warn('Failed to log mismatch report:', err);
        });
      }

      checkAchievements();

      // Save cotizacion to history
      const effectiveAsesorName = asesorName || googleUser?.name || '';
      if (googleUser?.email && effectiveAsesorName) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + validDays);

        cotizacionHistory.saveCotizacion({
          quotationNumber,
          asesorEmail: googleUser.email,
          asesorName: effectiveAsesorName,
          clientName: clientName || undefined,
          clientPhone: clientPhone || undefined,
          productsCount: products.length,
          total,
          expiryDate: expiryDate.toISOString(),
          imageBase64: imgData,
        }).then((saved) => {
          if (saved) {
            log.info(`Cotizacion ${quotationNumber} saved to history`);
          }
        }).catch((err) => {
          log.warn('Failed to save cotizacion to history:', err);
        });
      }

      setSnackbar({
        open: true,
        message: `Cotizacion ${quotationNumber} exportada exitosamente`,
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error al exportar la cotizacion. Intenta de nuevo.',
        severity: 'error',
      });
      log.error('PDF export error:', error);
    }
  };

  const handlePrint = () => {
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
              {['Informacion', 'Productos', 'Revision'].map((label, index) => (
                <Box
                  key={index}
                  component="span"
                  sx={{
                    fontSize: '0.65rem',
                    color: brandColors.textSecondary,
                    fontWeight: 500,
                  }}
                >
                  {label}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Quotation Settings */}
          <SettingsAccordion
            quotationNumber={quotationNumber}
            setQuotationNumber={setQuotationNumber}
            regenerateQuotationNumber={regenerateQuotationNumber}
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
            asesores={asesores}
            isLoadingAsesores={isLoadingAsesores}
            googleUser={googleUser}
            recentClients={recentClients.clients}
            onSelectClient={(client) => {
              setClientName(client.name);
              if (client.phone) setClientPhone(client.phone);
              if (client.email) setClientEmail(client.email);
              if (client.document) setClientDocument(client.document);
            }}
            invitedGuests={invitedGuests}
            isLoadingInvitations={isLoadingInvitations}
            onSelectInvitedGuest={(guest) => {
              setClientName(guest.guestName || '');
              if (guest.guestContact) {
                if (guest.contactType === 'email' || guest.guestContact.includes('@')) {
                  setClientEmail(guest.guestContact);
                } else {
                  setClientPhone(guest.guestContact);
                }
              }
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
            canUseManualEntry={canUseManualEntry}
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
        sx={{
          zIndex: 1400,
          mb: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
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
