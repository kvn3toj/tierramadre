import { useCallback, useEffect, useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { IOSLayout } from './components/ios';
import { WelcomeScreen, AdminRoute, ProviderRoute, StaffRoute } from './components/auth';
import { useAuth } from './hooks/useAuth';
import { useIsProvider } from './hooks/usePermissions';
import { Asesor } from './hooks/useAsesores';
import { initPWA } from './utils/pwa';
import { LoadingFallback, SplashScreen, ChunkErrorBoundary } from './components/shared';
// PWA update toast (version check on visibility change)
import UpdateToast from './components/pwa/UpdateToast';
import { usePWAUpdate } from './hooks/usePWAUpdate';
import { LiquidGlassProvider } from './contexts/LiquidGlassContext';
import { TrackingProvider } from './contexts/TrackingContext';
import { ScreenProtectionProvider } from './contexts/ScreenProtectionContext';
import { LiveRegionProvider } from './components/shared/LiveRegion';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { GlobalLoadingProvider } from './contexts/GlobalLoadingContext';
import { AchievementToast } from './components/gamification';
import { useViewportHeight } from './hooks/useViewportHeight';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { STORAGE_KEYS } from './constants/storage-keys';

// All routes lazy loaded with retry for optimal bundle splitting
const Home = lazyWithRetry(() => import('./components/home'), 'Home');
const TreasureBrowser = lazyWithRetry(() => import('./components/treasure/TreasureBrowser'), 'TreasureBrowser');
const ProductDetail = lazyWithRetry(() => import('./pages/treasure/ProductDetail/ProductDetailPage'), 'ProductDetail');
const AmbassadorsPage = lazyWithRetry(() => import('./pages/ambassadors/AmbassadorsPage'), 'AmbassadorsPage');
const AsesorProfilePage = lazyWithRetry(() => import('./pages/ambassadors/profile/AsesorProfilePage'), 'AsesorProfilePage');
const AccountsHub = lazyWithRetry(() => import('./components/accounts/AccountsHub'), 'AccountsHub');
const VaultPage = lazyWithRetry(() => import('./pages/VaultPage'), 'VaultPage');

// Cuentas sub-pages (accessed from AccountsHub)
const PriceSimulator = lazyWithRetry(() => import('./components/price-simulator/PriceSimulator'), 'PriceSimulator');
const ReceiptGenerator = lazyWithRetry(() => import('./pages/cuentas/recibos/ReceiptGenerator'), 'ReceiptGenerator');
const CotizacionGenerator = lazyWithRetry(() => import('./components/cotizacion/CotizacionGenerator'), 'CotizacionGenerator');
const QuotationPreview = lazyWithRetry(() => import('./pages/cuentas/cotizaciones/QuotationPreviewPage'), 'QuotationPreview');
const AdminAnalyticsPage = lazyWithRetry(() => import('./pages/admin/analytics/AdminAnalyticsPage'), 'AdminAnalyticsPage');
const NameGeneratorPage = lazyWithRetry(() => import('./pages/admin/name-generator/NameGeneratorPage'), 'NameGeneratorPage');
const ActivityPage = lazyWithRetry(() => import('./pages/admin/ActivityPage'), 'ActivityPage');
const ProductViewersPage = lazyWithRetry(() => import('./pages/admin/ProductViewers'), 'ProductViewersPage');
const UserViewsPage = lazyWithRetry(() => import('./pages/admin/UserViewsPage'), 'UserViewsPage');
const CotizacionProductsPage = lazyWithRetry(() => import('./pages/admin/CotizacionProductsPage'), 'CotizacionProductsPage');
const FeedbackDashboard = lazyWithRetry(() => import('./pages/admin/FeedbackDashboard'), 'FeedbackDashboard');
const ValuationPage = lazyWithRetry(() => import('./pages/valuation/ValuationPage'), 'ValuationPage');

// Provider Portal pages
const ProviderDashboard = lazyWithRetry(() => import('./components/provider/ProviderDashboard'), 'ProviderDashboard');
const ProviderRequestList = lazyWithRetry(() => import('./components/provider/ProviderRequestList'), 'ProviderRequestList');
const ProviderQuotationForm = lazyWithRetry(() => import('./components/provider/ProviderQuotationForm'), 'ProviderQuotationForm');
const ProviderInventory = lazyWithRetry(() => import('./components/provider/ProviderInventory'), 'ProviderInventory');

// Admin Quotation Management
const QuotationRequestForm = lazyWithRetry(() => import('./components/admin/QuotationRequestForm'), 'QuotationRequestForm');
const QuotationRequestList = lazyWithRetry(() => import('./components/admin/QuotationRequestList'), 'QuotationRequestList');
const ProviderQuotationsList = lazyWithRetry(() => import('./components/admin/ProviderQuotationsList'), 'ProviderQuotationsList');

// Product Requests (Asesor/Embajador -> Admin)
const ProductRequestsHub = lazyWithRetry(() => import('./pages/staff/requests/ProductRequestsHub'), 'ProductRequestsHub');
const AdminProductRequestList = lazyWithRetry(() => import('./components/requests/AdminProductRequestList'), 'AdminProductRequestList');

// Invitation Page (public route - accessible without auth)
const InvitationPage = lazyWithRetry(() => import('./pages/InvitationPage'), 'InvitationPage');

// Public Collection Page (shareable without auth)
const CollectionPage = lazyWithRetry(() => import('./pages/collection/CollectionPage'), 'CollectionPage');

// Cart Page
const CartPage = lazyWithRetry(() => import('./pages/CartPage'), 'CartPage');

// Primary tabs (always visible) + secondary tabs (in "More" menu)
export type TabValue = 'home' | 'treasure' | 'ambassadors';

// Tab categories for navigation logic
export const PRIMARY_TABS: TabValue[] = ['home', 'treasure', 'ambassadors'];
export const SECONDARY_TABS: TabValue[] = [];

// Smart redirect based on user role
function RoleBasedRedirect() {
  const isProvider = useIsProvider();
  return <Navigate to={isProvider ? '/provider' : '/home'} replace />;
}

// Redirect providers away from regular home to provider dashboard
function HomeOrProviderRedirect() {
  const isProvider = useIsProvider();
  if (isProvider) {
    return <Navigate to="/provider" replace />;
  }
  return (
    <Suspense fallback={<LoadingFallback message="Cargando..." />}>
      <Home />
    </Suspense>
  );
}

// Inner component that uses routing hooks
function AppContent() {
  const navigate = useNavigate();
  const { notify } = useNotification();

  // Navigate to asesor profile page
  const handleViewAsesorProducts = useCallback((asesor: Asesor) => {
    navigate(`/ambassadors/${asesor.slug}`);
  }, [navigate]);

  // Contact asesor (placeholder - can be enhanced later)
  const handleContactAsesor = useCallback((asesor: Asesor) => {
    notify(`Contacto con ${asesor.name} estará disponible próximamente`, 'info');
  }, [notify]);

  return (
    <>
      <IOSLayout>
        <Routes>
          {/* Primary routes - smart redirect based on role */}
          <Route path="/" element={<RoleBasedRedirect />} />
          <Route path="/home" element={<HomeOrProviderRedirect />} />
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

          {/* Cart / Selection */}
          <Route path="/cart" element={
            <Suspense fallback={<LoadingFallback message="Cargando selección..." />}>
              <CartPage />
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

          {/* Cuentas Hub - Staff access (Admin, Embajador, Asesor) */}
          <Route path="/cuentas" element={
            <StaffRoute>
              <Suspense fallback={<LoadingFallback message="Cargando cuentas..." />}>
                <AccountsHub />
              </Suspense>
            </StaffRoute>
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
          {/* Cotizaciones - Staff access (Admin, Embajador, Asesor) */}
          <Route path="/cuentas/cotizaciones" element={
            <StaffRoute>
              <Suspense fallback={<LoadingFallback message="Cargando cotizaciones..." />}>
                <CotizacionGenerator />
              </Suspense>
            </StaffRoute>
          } />
          <Route path="/cuentas/cotizaciones/preview" element={
            <StaffRoute>
              <Suspense fallback={<LoadingFallback message="Cargando cotización..." />}>
                <QuotationPreview />
              </Suspense>
            </StaffRoute>
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

          {/* Admin Name Generator */}
          <Route path="/admin/name-generator" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando generador..." />}>
                <NameGeneratorPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Product Viewers Analytics */}
          <Route path="/admin/analytics/item/:itemId" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando vistas..." />}>
                <ProductViewersPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* User Views Analytics */}
          <Route path="/admin/analytics/user" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando historial..." />}>
                <UserViewsPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* All Users Activity Feed */}
          <Route path="/admin/analytics/activity" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando actividad..." />}>
                <ActivityPage />
              </Suspense>
            </AdminRoute>
          } />

          {/* Cotización Products Analytics */}
          <Route path="/admin/cotizacion-products" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando productos..." />}>
                <CotizacionProductsPage />
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

          {/* Product Requests (Asesor/Embajador -> Admin) - Staff only */}
          <Route path="/solicitudes" element={
            <StaffRoute>
              <Suspense fallback={<LoadingFallback message="Cargando solicitudes..." />}>
                <ProductRequestsHub />
              </Suspense>
            </StaffRoute>
          } />
          {/* Legacy routes - redirect to unified view */}
          <Route path="/solicitar-producto" element={<Navigate to="/solicitudes?tab=nueva" replace />} />
          <Route path="/mis-solicitudes" element={<Navigate to="/solicitudes" replace />} />
          <Route path="/cuentas/solicitudes-asesores" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback message="Cargando solicitudes..." />}>
                <AdminProductRequestList />
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
      {/* Short link alias (e.g., /g/ABC123) - same as /invite/:shortCode */}
      <Route
        path="/g/:shortCode"
        element={
          <Suspense fallback={<LoadingFallback message="Cargando..." />}>
            <InvitationPage />
          </Suspense>
        }
      />
      {/* Public collection page (e.g., /c/ceo-tierra-madre) */}
      <Route
        path="/c/:folder"
        element={
          <Suspense fallback={<LoadingFallback message="Cargando coleccion..." />}>
            <CollectionPage />
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
  const navigate = useNavigate();

  // If not authenticated and URL has ?invite= param, redirect to invitation
  // flow so the guest can auto-validate and return to the original page.
  useEffect(() => {
    if (isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (inviteCode) {
      // Preserve the intended destination (e.g. /product/32)
      const returnTo = window.location.pathname;
      navigate(`/invite/${inviteCode}?redirect=${encodeURIComponent(returnTo)}`, { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
const SPLASH_SESSION_KEY = STORAGE_KEYS.SESSION_ACTIVE;
const LAST_ACTIVITY_KEY = STORAGE_KEYS.LAST_ACTIVITY;
const INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes

function shouldShowSplash(): boolean {
  // Public routes that have their own splash — skip the main app splash
  const path = window.location.pathname;
  if (path.startsWith('/c/') || path.startsWith('/invite/') || path.startsWith('/g/')) {
    return false;
  }

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
    window.addEventListener('touchstart', throttledActivity);

    // Scroll activity: target main-content container (fixed viewport shell)
    const mainEl = document.getElementById('main-content');
    const scrollTarget = mainEl || window;
    scrollTarget.addEventListener('scroll', throttledActivity);

    return () => {
      clearTimeout(activityTimeout);
      window.removeEventListener('click', throttledActivity);
      window.removeEventListener('keydown', throttledActivity);
      window.removeEventListener('touchstart', throttledActivity);
      scrollTarget.removeEventListener('scroll', throttledActivity);
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
            <LiveRegionProvider>
              <NotificationProvider>
                <GlobalLoadingProvider>
                  <BrowserRouter>
                    <InvitationRouter />
                    {/* FeedbackFAB moved to IOSMoreSheet - access via "Más" tab */}
                    {/* PWA disabled - service worker not generating correctly */}
                    {/* <UpdatePrompt /> */}
                  </BrowserRouter>
                </GlobalLoadingProvider>
              </NotificationProvider>
            </LiveRegionProvider>
          </ScreenProtectionProvider>
        </TrackingProvider>
      </LiquidGlassProvider>
    </ChunkErrorBoundary>
  );
}

export default App;
