import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { IOSLayout } from './components/ios';
import Gallery from './components/Gallery';
import EmeraldUploader from './components/EmeraldUploader';
import EmeraldUploaderIOS from './components/EmeraldUploader.ios';
import { getFeatureFlag } from './utils/featureFlags';
import CalendarGrid from './components/CalendarGrid';
import PDFExport from './components/PDFExport';
import ImageNormalizer from './components/ImageNormalizer';
import ReceiptGenerator from './components/ReceiptGenerator';
import PriceSimulator from './components/PriceSimulator';
import CertificatePreview from './components/CertificatePreview';
import QuotationPreview from './components/QuotationPreview';
import CotizacionGenerator from './components/CotizacionGenerator';
import PinLock from './components/PinLock';
import { SlidePreview } from './components/slides';
import { CatalogBrowser } from './components/CatalogBrowser';
import InventoryBrowser from './components/InventoryBrowser';
import ProductDetail from './components/ProductDetail';
import { AmbassadorDirectory } from './components/ambassador';
import { Asesor } from './hooks/useAsesores';
import { initPWA } from './utils/pwa';
import Home from './components/Home';
import DesignSystemPage from './pages/DesignSystemPage';

// Primary tabs (always visible) + secondary tabs (in "More" menu)
export type TabValue = 'home' | 'gallery' | 'upload' | 'catalog' | 'calendar' | 'slides' | 'normalizer' | 'receipts' | 'biblioteca' | 'simulator' | 'inventory' | 'ambassadors' | 'certificate' | 'cotizacion';

// Tab categories for navigation logic
export const PRIMARY_TABS: TabValue[] = ['home', 'inventory', 'biblioteca'];
export const SECONDARY_TABS: TabValue[] = ['gallery', 'catalog', 'calendar', 'ambassadors', 'slides', 'normalizer', 'receipts', 'simulator', 'cotizacion', 'certificate', 'upload'];

// Inner component that uses routing hooks
function AppContent() {
  const navigate = useNavigate();

  // Navigate to inventory filtered by asesor name
  const handleViewAsesorProducts = useCallback((asesor: Asesor) => {
    // Navigate to inventory with asesor filter as URL param
    navigate(`/inventory?asesor=${encodeURIComponent(asesor.name)}`);
  }, [navigate]);

  // Contact asesor (placeholder - can be enhanced later)
  const handleContactAsesor = useCallback((asesor: Asesor) => {
    // For now, show an alert with asesor name
    // Later can be enhanced with phone/whatsapp from sheets
    alert(`Contactar a ${asesor.name}\n\nEsta funcionalidad se habilitara proximamente con datos de contacto del Google Sheet.`);
  }, []);

  return (
    <>
      <IOSLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route
            path="/upload"
            element={
              getFeatureFlag('IOS_UPLOAD')
                ? <EmeraldUploaderIOS onComplete={() => navigate('/gallery')} />
                : <EmeraldUploader onComplete={() => navigate('/gallery')} />
            }
          />
          <Route path="/calendar" element={<CalendarGrid />} />
          <Route path="/catalog" element={<PDFExport />} />
          <Route path="/normalizer" element={<ImageNormalizer />} />
          <Route path="/slides" element={<SlidePreview />} />
          <Route path="/receipts" element={<ReceiptGenerator />} />
          <Route path="/biblioteca" element={<CatalogBrowser />} />
          <Route path="/simulator" element={<PriceSimulator />} />
          <Route path="/simulator/preview" element={<QuotationPreview />} />
          <Route path="/certificate" element={<CertificatePreview />} />
          <Route path="/cotizacion" element={<CotizacionGenerator />} />
          <Route path="/inventory" element={<InventoryBrowser />} />
          <Route path="/product/:itemId" element={<ProductDetail />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          <Route
            path="/ambassadors"
            element={
              <AmbassadorDirectory
                onViewProducts={handleViewAsesorProducts}
                onContact={handleContactAsesor}
              />
            }
          />
        </Routes>
      </IOSLayout>
    </>
  );
}

function App() {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    // Check if already authenticated in this session
    return sessionStorage.getItem('tierra-madre-auth') === 'true';
  });

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true);
  }, []);

  // Initialize PWA behaviors on mount
  useEffect(() => {
    initPWA();
  }, []);

  // Show PIN lock screen if not authenticated
  if (!isUnlocked) {
    return <PinLock onUnlock={handleUnlock} />;
  }

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
