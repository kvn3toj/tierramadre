import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { IOSLayout } from './components/ios';
import { WelcomeScreen } from './components/auth';
import { useAuth } from './hooks/useAuth';
import { Asesor } from './hooks/useAsesores';
import { initPWA } from './utils/pwa';
import LoadingFallback from './components/LoadingFallback';
import SplashScreen from './components/SplashScreen';
// PWA disabled - service worker not generating correctly
// import UpdatePrompt from './components/pwa/UpdatePrompt';
import { LiquidGlassProvider } from './contexts/LiquidGlassContext';
import { useViewportHeight } from './hooks/useViewportHeight';

// All routes lazy loaded for optimal bundle splitting
const Home = lazy(() => import('./components/home'));
const TreasureBrowser = lazy(() => import('./components/TreasureBrowser'));
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
export type TabValue = 'home' | 'treasure' | 'ambassadors';

// Tab categories for navigation logic
export const PRIMARY_TABS: TabValue[] = ['home', 'treasure', 'ambassadors'];
export const SECONDARY_TABS: TabValue[] = [];

/** @deprecated Use 'treasure' instead of 'inventory' */
export type LegacyTabValue = 'home' | 'inventory' | 'ambassadors';

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
          {/* Primary routes */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={
            <Suspense fallback={<LoadingFallback message="Cargando..." />}>
              <Home />
            </Suspense>
          } />
          <Route path="/treasure" element={
            <Suspense fallback={<LoadingFallback message="Cargando tesoros..." />}>
              <TreasureBrowser />
            </Suspense>
          } />
          {/* Redirect from old /inventory route for backward compatibility */}
          <Route path="/inventory" element={<Navigate to="/treasure" replace />} />

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
  const [showSplash, setShowSplash] = useState(true);

  // Initialize viewport height CSS variable for iOS Safari 100vh fix
  // This sets --vh to the actual viewport height (excluding address bar)
  useViewportHeight();

  // Initialize PWA behaviors on mount
  useEffect(() => {
    initPWA();
  }, []);

  // Show splash screen on app open
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Show welcome screen if not authenticated
  if (!isAuthenticated) {
    return <WelcomeScreen />;
  }

  return (
    <LiquidGlassProvider>
      <BrowserRouter>
        <AppContent />
        {/* PWA disabled - service worker not generating correctly */}
        {/* <UpdatePrompt /> */}
      </BrowserRouter>
    </LiquidGlassProvider>
  );
}

export default App;
