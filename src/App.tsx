import { useCallback, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { IOSLayout } from './components/ios';
import { getFeatureFlag } from './utils/featureFlags';
import { WelcomeScreen } from './components/auth';
import { useAuth } from './hooks/useAuth';
import { Asesor } from './hooks/useAsesores';
import { initPWA } from './utils/pwa';
import LoadingFallback from './components/LoadingFallback';
import UpdatePrompt from './components/pwa/UpdatePrompt';

// Primary routes - keep in main bundle (frequently used)
import Home from './components/home';
import InventoryBrowser from './components/InventoryBrowser';
import Gallery from './components/Gallery';
import { CatalogBrowser } from './components/CatalogBrowser';

// Secondary routes - lazy load (less frequent, heavy dependencies)
const EmeraldUploader = lazy(() => import('./components/EmeraldUploader'));
const EmeraldUploaderIOS = lazy(() => import('./components/EmeraldUploader.ios'));
const CalendarGrid = lazy(() => import('./components/CalendarGrid'));
const PDFExport = lazy(() => import('./components/PDFExport'));
const ImageNormalizer = lazy(() => import('./components/ImageNormalizer'));
const ReceiptGenerator = lazy(() => import('./components/ReceiptGenerator'));
const PriceSimulator = lazy(() => import('./components/PriceSimulator'));
const CertificatePreview = lazy(() => import('./components/CertificatePreview'));
const QuotationPreview = lazy(() => import('./components/QuotationPreview'));
const CotizacionGenerator = lazy(() => import('./components/CotizacionGenerator'));
const SlidePreview = lazy(() => import('./components/slides').then(m => ({ default: m.SlidePreview })));
const ProductDetail = lazy(() => import('./components/ProductDetail'));
const AmbassadorDirectory = lazy(() => import('./components/ambassador').then(m => ({ default: m.AmbassadorDirectory })));
const AsesorProfilePage = lazy(() => import('./components/ambassador/AsesorProfile'));
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage'));
const AccountsHub = lazy(() => import('./components/AccountsHub'));
const VaultPage = lazy(() => import('./pages/VaultPage'));

// Primary tabs (always visible) + secondary tabs (in "More" menu)
export type TabValue = 'home' | 'gallery' | 'upload' | 'catalog' | 'calendar' | 'slides' | 'normalizer' | 'receipts' | 'biblioteca' | 'simulator' | 'inventory' | 'ambassadors' | 'certificate' | 'cotizacion';

// Tab categories for navigation logic
export const PRIMARY_TABS: TabValue[] = ['home', 'inventory', 'biblioteca'];
export const SECONDARY_TABS: TabValue[] = ['gallery', 'catalog', 'calendar', 'ambassadors', 'slides', 'normalizer', 'receipts', 'simulator', 'cotizacion', 'certificate', 'upload'];

// Inner component that uses routing hooks
function AppContent() {
  const navigate = useNavigate();

  // Navigate to asesor profile page
  const handleViewAsesorProducts = useCallback((asesor: Asesor) => {
    navigate(`/ambassadors/${asesor.slug}`);
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
          {/* Primary routes - no Suspense needed (in main bundle) */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/biblioteca" element={<CatalogBrowser />} />
          <Route path="/inventory" element={<InventoryBrowser />} />

          {/* Secondary routes - wrapped with Suspense (lazy loaded) */}
          <Route
            path="/upload"
            element={
              <Suspense fallback={<LoadingFallback message="Cargando uploader..." />}>
                {getFeatureFlag('IOS_UPLOAD')
                  ? <EmeraldUploaderIOS onComplete={() => navigate('/gallery')} />
                  : <EmeraldUploader onComplete={() => navigate('/gallery')} />
                }
              </Suspense>
            }
          />
          <Route path="/calendar" element={
            <Suspense fallback={<LoadingFallback message="Cargando calendario..." />}>
              <CalendarGrid />
            </Suspense>
          } />
          <Route path="/catalog" element={
            <Suspense fallback={<LoadingFallback message="Cargando catálogo..." />}>
              <PDFExport />
            </Suspense>
          } />
          <Route path="/normalizer" element={
            <Suspense fallback={<LoadingFallback message="Cargando normalizador..." />}>
              <ImageNormalizer />
            </Suspense>
          } />
          <Route path="/slides" element={
            <Suspense fallback={<LoadingFallback message="Cargando slides..." />}>
              <SlidePreview />
            </Suspense>
          } />
          <Route path="/receipts" element={
            <Suspense fallback={<LoadingFallback message="Cargando recibos..." />}>
              <ReceiptGenerator />
            </Suspense>
          } />
          <Route path="/simulator" element={
            <Suspense fallback={<LoadingFallback message="Cargando simulador..." />}>
              <PriceSimulator />
            </Suspense>
          } />
          <Route path="/simulator/preview" element={
            <Suspense fallback={<LoadingFallback message="Cargando cotización..." />}>
              <QuotationPreview />
            </Suspense>
          } />
          <Route path="/certificate" element={
            <Suspense fallback={<LoadingFallback message="Cargando certificado..." />}>
              <CertificatePreview />
            </Suspense>
          } />
          <Route path="/cotizacion" element={
            <Suspense fallback={<LoadingFallback message="Cargando cotización..." />}>
              <CotizacionGenerator />
            </Suspense>
          } />
          <Route path="/product/:itemId" element={
            <Suspense fallback={<LoadingFallback message="Cargando producto..." />}>
              <ProductDetail />
            </Suspense>
          } />
          <Route path="/design-system" element={
            <Suspense fallback={<LoadingFallback />}>
              <DesignSystemPage />
            </Suspense>
          } />
          <Route
            path="/ambassadors"
            element={
              <Suspense fallback={<LoadingFallback message="Cargando embajadores..." />}>
                <AmbassadorDirectory
                  onViewProducts={handleViewAsesorProducts}
                  onContact={handleContactAsesor}
                />
              </Suspense>
            }
          />
          <Route path="/ambassadors/:slug" element={
            <Suspense fallback={<LoadingFallback message="Cargando perfil..." />}>
              <AsesorProfilePage />
            </Suspense>
          } />
          <Route path="/cuentas" element={
            <Suspense fallback={<LoadingFallback message="Cargando cuentas..." />}>
              <AccountsHub />
            </Suspense>
          } />
          <Route path="/cuentas/simulador" element={
            <Suspense fallback={<LoadingFallback message="Cargando simulador..." />}>
              <PriceSimulator />
            </Suspense>
          } />
          <Route path="/cuentas/recibos" element={
            <Suspense fallback={<LoadingFallback message="Cargando recibos..." />}>
              <ReceiptGenerator />
            </Suspense>
          } />
          <Route path="/cuentas/cotizaciones" element={
            <Suspense fallback={<LoadingFallback message="Cargando cotizaciones..." />}>
              <CotizacionGenerator />
            </Suspense>
          } />
          <Route path="/boveda-secreta" element={
            <Suspense fallback={<LoadingFallback message="Cargando bóveda..." />}>
              <VaultPage />
            </Suspense>
          } />
        </Routes>
      </IOSLayout>
    </>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  // Initialize PWA behaviors on mount
  useEffect(() => {
    initPWA();
  }, []);

  // Show welcome screen if not authenticated
  if (!isAuthenticated) {
    return <WelcomeScreen />;
  }

  return (
    <BrowserRouter>
      <AppContent />
      <UpdatePrompt />
    </BrowserRouter>
  );
}

export default App;
