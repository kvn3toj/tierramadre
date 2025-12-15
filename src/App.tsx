import { useCallback, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { IOSLayout } from './components/ios';
import { WelcomeScreen } from './components/auth';
import { useAuth } from './hooks/useAuth';
import { Asesor } from './hooks/useAsesores';
import { initPWA } from './utils/pwa';
import LoadingFallback from './components/LoadingFallback';
import UpdatePrompt from './components/pwa/UpdatePrompt';
import { LiquidGlassProvider } from './contexts/LiquidGlassContext';

// Primary routes - keep in main bundle (frequently used)
import Home from './components/home';
import InventoryBrowser from './components/InventoryBrowser';

// Secondary routes - lazy load (less frequent, heavy dependencies)
const ProductDetail = lazy(() => import('./components/ProductDetail'));
const AmbassadorsPage = lazy(() => import('./pages/AmbassadorsPage'));
const AsesorProfilePage = lazy(() => import('./components/ambassador/AsesorProfile'));
const AccountsHub = lazy(() => import('./components/AccountsHub'));
const VaultPage = lazy(() => import('./pages/VaultPage'));

// Cuentas sub-pages (accessed from AccountsHub)
const PriceSimulator = lazy(() => import('./components/PriceSimulator'));
const ReceiptGenerator = lazy(() => import('./components/ReceiptGenerator'));
const CotizacionGenerator = lazy(() => import('./components/CotizacionGenerator'));
const QuotationPreview = lazy(() => import('./components/QuotationPreview'));

// Primary tabs (always visible) + secondary tabs (in "More" menu)
export type TabValue = 'home' | 'inventory' | 'ambassadors';

// Tab categories for navigation logic
export const PRIMARY_TABS: TabValue[] = ['home', 'inventory', 'ambassadors'];
export const SECONDARY_TABS: TabValue[] = [];

// Inner component that uses routing hooks
function AppContent() {
  const navigate = useNavigate();

  // Navigate to asesor profile page
  const handleViewAsesorProducts = useCallback((asesor: Asesor) => {
    navigate(`/ambassadors/${asesor.slug}`);
  }, [navigate]);

  // Contact asesor (placeholder - can be enhanced later)
  const handleContactAsesor = useCallback((asesor: Asesor) => {
    alert(`Contactar a ${asesor.name}\n\nEsta funcionalidad se habilitará próximamente con datos de contacto del Google Sheet.`);
  }, []);

  return (
    <>
      <IOSLayout>
        <Routes>
          {/* Primary routes - no Suspense needed (in main bundle) */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/inventory" element={<InventoryBrowser />} />

          {/* Product detail */}
          <Route path="/product/:itemId" element={
            <Suspense fallback={<LoadingFallback message="Cargando producto..." />}>
              <ProductDetail />
            </Suspense>
          } />

          {/* Ambassadors (Embajadores) */}
          <Route
            path="/ambassadors"
            element={
              <Suspense fallback={<LoadingFallback message="Cargando embajadores..." />}>
                <AmbassadorsPage
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

          {/* Cuentas Hub and sub-pages */}
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
          <Route path="/cuentas/cotizaciones/preview" element={
            <Suspense fallback={<LoadingFallback message="Cargando cotización..." />}>
              <QuotationPreview />
            </Suspense>
          } />

          {/* Bóveda Secreta */}
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
    <LiquidGlassProvider>
      <BrowserRouter>
        <AppContent />
        <UpdatePrompt />
      </BrowserRouter>
    </LiquidGlassProvider>
  );
}

export default App;
