import { useCallback, useEffect, useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { IOSLayout } from './components/ios';
import { WelcomeScreen, AdminRoute, ProviderRoute } from './components/auth';
import { useAuth } from './hooks/useAuth';
import { Asesor } from './hooks/useAsesores';
import { initPWA } from './utils/pwa';
import LoadingFallback from './components/LoadingFallback';
import SplashScreen from './components/SplashScreen';
// PWA update toast (version check on visibility change)
import UpdateToast from './components/pwa/UpdateToast';
import { usePWAUpdate } from './hooks/usePWAUpdate';
import { LiquidGlassProvider } from './contexts/LiquidGlassContext';
import { TrackingProvider } from './contexts/TrackingContext';
import { ScreenProtectionProvider } from './contexts/ScreenProtectionContext';
import { AchievementToast } from './components/gamification';
import { useViewportHeight } from './hooks/useViewportHeight';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';

// All routes lazy loaded with retry for optimal bundle splitting
const Home = lazyWithRetry(() => import('./components/home'), 'Home');
const TreasureBrowser = lazyWithRetry(() => import('./components/TreasureBrowser'), 'TreasureBrowser');
const ProductDetail = lazyWithRetry(() => import('./components/ProductDetail'), 'ProductDetail');
const AmbassadorsPage = lazyWithRetry(() => import('./pages/AmbassadorsPage'), 'AmbassadorsPage');
const AsesorProfilePage = lazyWithRetry(() => import('./components/ambassador/AsesorProfile'), 'AsesorProfilePage');
const AccountsHub = lazyWithRetry(() => import('./components/AccountsHub'), 'AccountsHub');
const VaultPage = lazyWithRetry(() => import('./pages/VaultPage'), 'VaultPage');

// Cuentas sub-pages (accessed from AccountsHub)
const PriceSimulator = lazyWithRetry(() => import('./components/PriceSimulator'), 'PriceSimulator');
const ReceiptGenerator = lazyWithRetry(() => import('./components/ReceiptGenerator'), 'ReceiptGenerator');
const CotizacionGenerator = lazyWithRetry(() => import('./components/CotizacionGenerator'), 'CotizacionGenerator');
const QuotationPreview = lazyWithRetry(() => import('./components/QuotationPreview'), 'QuotationPreview');
const AdminAnalyticsPage = lazyWithRetry(() => import('./pages/AdminAnalyticsPage'), 'AdminAnalyticsPage');
const ProductViewersPage = lazyWithRetry(() => import('./pages/ProductViewersPage'), 'ProductViewersPage');
const UserViewsPage = lazyWithRetry(() => import('./pages/UserViewsPage'), 'UserViewsPage');
const FeedbackDashboard = lazyWithRetry(() => import('./pages/admin/FeedbackDashboard'), 'FeedbackDashboard');
const ValuationPage = lazyWithRetry(() => import('./pages/ValuationPage'), 'ValuationPage');

// Provider Portal pages
const ProviderDashboard = lazyWithRetry(() => import('./components/provider/ProviderDashboard'), 'ProviderDashboard');
const ProviderRequestList = lazyWithRetry(() => import('./components/provider/ProviderRequestList'), 'ProviderRequestList');
const ProviderQuotationForm = lazyWithRetry(() => import('./components/provider/ProviderQuotationForm'), 'ProviderQuotationForm');
const ProviderInventory = lazyWithRetry(() => import('./components/provider/ProviderInventory'), 'ProviderInventory');

// Admin Quotation Management
const QuotationRequestForm = lazyWithRetry(() => import('./components/admin/QuotationRequestForm'), 'QuotationRequestForm');
const QuotationRequestList = lazyWithRetry(() => import('./components/admin/QuotationRequestList'), 'QuotationRequestList');
const ProviderQuotationsList = lazyWithRetry(() => import('./components/admin/ProviderQuotationsList'), 'ProviderQuotationsList');

// Invitation Pages (public routes - accessible without auth)
const InvitationPage = lazyWithRetry(() => import('./pages/InvitationPage'), 'InvitationPage');
const ShortLinkRedirect = lazyWithRetry(() => import('./pages/ShortLinkRedirect'), 'ShortLinkRedirect');

// Primary tabs (always visible) + secondary tabs (in "More" menu)
export type TabValue = 'home' | 'treasure' | 'ambassadors';

// Tab categories for navigation logic
export const PRIMARY_TABS: TabValue[] = ['home', 'treasure', 'ambassadors'];
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

          {/* Valuation Page - Emerald investment information */}
          <Route path="/valuation" element={
            <Suspense fallback={<LoadingFallback message="Cargando información..." />}>
              <ValuationPage />
            </Suspense>
          } />

          {/* Cuentas Hub and sub-pages - Admin only */}
          <Route path="/cuentas" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando cuentas..." />}>
                <AccountsHub />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="/cuentas/simulador" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando simulador..." />}>
                <PriceSimulator />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="/cuentas/recibos" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando recibos..." />}>
                <ReceiptGenerator />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="/cuentas/cotizaciones" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando cotizaciones..." />}>
                <CotizacionGenerator />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="/cuentas/cotizaciones/preview" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando cotización..." />}>
                <QuotationPreview />
              </Suspense>
            </AdminRoute>
          } />

          {/* Bóveda Secreta */}
          <Route path="/boveda-secreta" element={
            <Suspense fallback={<LoadingFallback message="Cargando bóveda..." />}>
              <VaultPage />
            </Suspense>
          } />

          {/* Admin Analytics Dashboard */}
          <Route path="/admin/analytics" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando analytics..." />}>
                <AdminAnalyticsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Product Viewers Detail - Who viewed a specific product */}
          <Route path="/admin/analytics/product/:itemId" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando analytics..." />}>
                <ProductViewersPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* User Views Detail - What products a user viewed */}
          <Route path="/admin/analytics/user" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando analytics..." />}>
                <UserViewsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Admin Feedback Dashboard */}
          <Route path="/admin/feedback" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando feedback..." />}>
                <FeedbackDashboard />
              </Suspense>
            </AdminRoute>
          } />

          {/* Admin Quotation Management */}
          <Route path="/cuentas/solicitudes" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando solicitudes..." />}>
                <QuotationRequestList />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="/cuentas/solicitudes/nueva" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando formulario..." />}>
                <QuotationRequestForm />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="/cuentas/cotizaciones-proveedor" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando cotizaciones..." />}>
                <ProviderQuotationsList />
              </Suspense>
            </AdminRoute>
          } />

          {/* Provider Portal Routes */}
          <Route path="/provider" element={
            <ProviderRoute>
              <Suspense fallback={<LoadingFallback message="Cargando portal..." />}>
                <ProviderDashboard />
              </Suspense>
            </ProviderRoute>
          } />
          <Route path="/provider/requests" element={
            <ProviderRoute>
              <Suspense fallback={<LoadingFallback message="Cargando solicitudes..." />}>
                <ProviderRequestList />
              </Suspense>
            </ProviderRoute>
          } />
          <Route path="/provider/submit" element={
            <ProviderRoute>
              <Suspense fallback={<LoadingFallback message="Cargando formulario..." />}>
                <ProviderQuotationForm />
              </Suspense>
            </ProviderRoute>
          } />
          <Route path="/provider/inventory" element={
            <ProviderRoute>
              <Suspense fallback={<LoadingFallback message="Cargando inventario..." />}>
                <ProviderInventory />
              </Suspense>
            </ProviderRoute>
          } />
        </Routes>
      </IOSLayout>
    </>
  );
}

// Component to handle invitation routes before auth check
function InvitationRouter() {
  return (
    <Routes>
      {/* Invitation page with short code (e.g., /invite/ABC123) */}
      <Route
        path="/invite/:shortCode"
        element={
          <Suspense fallback={<LoadingFallback message="Cargando..." />}>
            <InvitationPage />
          </Suspense>
        }
      />
      {/* Short link alias (e.g., /g/ABC123) - redirects to /invite/:shortCode */}
      <Route
        path="/g/:shortCode"
        element={
          <Suspense fallback={<LoadingFallback message="Cargando..." />}>
            <ShortLinkRedirect />
          </Suspense>
        }
      />
      <Route path="*" element={<AuthenticatedApp />} />
    </Routes>
  );
}

// Main authenticated app with all routes
function AuthenticatedApp() {
  const { isAuthenticated } = useAuth();
  const { showToast, dismissToast } = usePWAUpdate();

  // Show welcome screen if not authenticated
  if (!isAuthenticated) {
    return <WelcomeScreen />;
  }

  return (
    <>
      <AppContent />
      <AchievementToast />
      <UpdateToast visible={showToast} onDismiss={dismissToast} />
    </>
  );
}

// Session storage key for splash screen
const SPLASH_SESSION_KEY = 'tm_session_active';
const LAST_ACTIVITY_KEY = 'tm_last_activity';
const INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes

function shouldShowSplash(): boolean {
  // Check if this is a fresh session (browser was closed)
  const sessionActive = sessionStorage.getItem(SPLASH_SESSION_KEY);

  if (!sessionActive) {
    // Fresh session - show splash
    return true;
  }

  // Check for inactivity timeout
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (lastActivity) {
    const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
    if (timeSinceActivity > INACTIVITY_THRESHOLD) {
      // User was inactive for too long - show splash
      return true;
    }
  }

  // Same session and recently active - skip splash
  return false;
}

function App() {
  const [showSplash, setShowSplash] = useState(() => shouldShowSplash());

  // Initialize viewport height CSS variable for iOS Safari 100vh fix
  // This sets --vh to the actual viewport height (excluding address bar)
  useViewportHeight();

  // Initialize PWA behaviors on mount
  useEffect(() => {
    initPWA();
  }, []);

  // Mark session as active and track activity
  useEffect(() => {
    // Mark this session as active (survives refresh, clears on browser close)
    sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');

    // Update last activity timestamp
    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    };

    // Initial activity mark
    updateActivity();

    // Track user activity (throttled)
    let activityTimeout: ReturnType<typeof setTimeout>;
    const throttledActivity = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(updateActivity, 5000); // Update at most every 5s
    };

    window.addEventListener('click', throttledActivity);
    window.addEventListener('keydown', throttledActivity);
    window.addEventListener('scroll', throttledActivity);
    window.addEventListener('touchstart', throttledActivity);

    return () => {
      clearTimeout(activityTimeout);
      window.removeEventListener('click', throttledActivity);
      window.removeEventListener('keydown', throttledActivity);
      window.removeEventListener('scroll', throttledActivity);
      window.removeEventListener('touchstart', throttledActivity);
    };
  }, []);

  // Show splash screen only on fresh session or after inactivity
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <ChunkErrorBoundary>
      <LiquidGlassProvider>
        <TrackingProvider>
          <ScreenProtectionProvider>
            <BrowserRouter>
              <InvitationRouter />
              {/* FeedbackFAB moved to IOSMoreSheet - access via "Más" tab */}
              {/* PWA disabled - service worker not generating correctly */}
              {/* <UpdatePrompt /> */}
            </BrowserRouter>
          </ScreenProtectionProvider>
        </TrackingProvider>
      </LiquidGlassProvider>
    </ChunkErrorBoundary>
  );
}

export default App;
