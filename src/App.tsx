import { useCallback, useEffect, useState, Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { IOSLayout } from './components/ios';
import {
  WelcomeScreen,
  AdminRoute,
  ProviderRoute,
  StaffRoute,
  CotizacionRoute,
} from './components/auth';
import { useAuth } from './hooks/useAuth';
import { useIsProvider } from './hooks/usePermissions';
import { Asesor } from './hooks/useAsesores';
import { initPWA } from './utils/pwa';
import {
  LoadingFallback,
  SplashScreen,
  ChunkErrorBoundary,
} from './components/shared';
import { useLanguage } from './contexts/LanguageContext';
// PWA update toast (version check on visibility change)
import UpdateToast from './components/pwa/UpdateToast';
import { usePWAUpdate } from './hooks/usePWAUpdate';
import { AppShellProviders } from './contexts/AppShellProviders';
import { ComparisonProvider } from './contexts/ComparisonContext';
import { AppNavigatorProvider } from './contexts/AppNavigatorContext';
import { CopilotRailProvider } from './pages/admin/Fotosintesis/copilot-rail/CopilotRailProvider';
import { EsmereoThemeProvider } from './contexts/EsmereoThemeContext';
import { AchievementToast } from './components/gamification';
import { useViewportHeight } from './hooks/useViewportHeight';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { STORAGE_KEYS } from './constants/storage-keys';
import { getFeatureFlag } from './utils/featureFlags';
import { CAPTURA_V4_ENABLED } from './pages/admin/Fotosintesis/capturaV4/featureFlag';

/**
 * Localized Loading Component
 * Uses useLanguage hook to retrieve translated loading messages
 * Supports nested key paths (e.g., "loading.treasures")
 */
function LocalizedLoading({
  messageKey,
}: {
  messageKey: keyof typeof import('./locales/es').es.loading;
}) {
  const { t } = useLanguage();
  return <LoadingFallback message={t.loading[messageKey]} />;
}

// All routes lazy loaded with retry for optimal bundle splitting
const Home = lazyWithRetry(() => import('./components/home'), 'Home');
const TreasureBrowser = lazyWithRetry(
  () => import('./components/treasure/TreasureBrowser'),
  'TreasureBrowser',
);
const ProductDetail = lazyWithRetry(
  () => import('./pages/treasure/ProductDetail/ProductDetailPage'),
  'ProductDetail',
);
const AmbassadorsPage = lazyWithRetry(
  () => import('./pages/ambassadors/AmbassadorsPage'),
  'AmbassadorsPage',
);
const AsesorProfilePage = lazyWithRetry(
  () => import('./pages/ambassadors/profile/AsesorProfilePage'),
  'AsesorProfilePage',
);
const AccountsHub = lazyWithRetry(
  () => import('./components/accounts/AccountsHub'),
  'AccountsHub',
);
const VaultPage = lazyWithRetry(() => import('./pages/VaultPage'), 'VaultPage');
const EsmereogenesisHubPage = lazyWithRetry(
  () => import('./pages/esmereogenesis/EsmereogenesisHubPage'),
  'EsmereogenesisHubPage',
);
const EsmereogenesisGardenPage = lazyWithRetry(
  () => import('./pages/esmereogenesis/EsmereogenesisGardenPage'),
  'EsmereogenesisGardenPage',
);

// Cuentas sub-pages (accessed from AccountsHub)
const PriceSimulator = lazyWithRetry(
  () => import('./components/price-simulator/PriceSimulator'),
  'PriceSimulator',
);
const ReceiptGenerator = lazyWithRetry(
  () => import('./pages/cuentas/recibos/ReceiptGenerator'),
  'ReceiptGenerator',
);
const CotizacionGenerator = lazyWithRetry(
  () => import('./components/cotizacion/CotizacionGenerator'),
  'CotizacionGenerator',
);
const QuotationPreview = lazyWithRetry(
  () => import('./pages/cuentas/cotizaciones/QuotationPreviewPage'),
  'QuotationPreview',
);
// La ficha pública de cotización (CotizacionPublicPage) y su ruta /cot/ quedan
// DESACTIVADAS por seguridad (IDOR: exponía cliente + precios por número
// enumerable). El import se retira para no arrastrar código muerto al bundle;
// se restituye cuando la ficha exija un token ligado al registro y al QR.
const AdminAnalyticsPage = lazyWithRetry(
  () => import('./pages/admin/analytics/AdminAnalyticsPage'),
  'AdminAnalyticsPage',
);
const NameGeneratorPage = lazyWithRetry(
  () => import('./pages/admin/name-generator/NameGeneratorPage'),
  'NameGeneratorPage',
);
const ActivityPage = lazyWithRetry(
  () => import('./pages/admin/ActivityPage'),
  'ActivityPage',
);
const ProductViewersPage = lazyWithRetry(
  () => import('./pages/admin/ProductViewers'),
  'ProductViewersPage',
);
const UserViewsPage = lazyWithRetry(
  () => import('./pages/admin/UserViewsPage'),
  'UserViewsPage',
);
const CotizacionProductsPage = lazyWithRetry(
  () => import('./pages/admin/CotizacionProductsPage'),
  'CotizacionProductsPage',
);
const AdminProductManagementPage = lazyWithRetry(
  () => import('./pages/admin/ProductManagement/ProductManagementPage'),
  'AdminProductManagementPage',
);
const AdminEtiquetasPage = lazyWithRetry(
  () => import('./pages/admin/ProductManagement/etiquetas/EtiquetasPage'),
  'AdminEtiquetasPage',
);

// Fotosíntesis v2 — captura admin (Slice 1)
const FotosintesisLayout = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/FotosintesisLayout'),
  'FotosintesisLayout',
);
const FotosintesisHome = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/HomePage'),
  'FotosintesisHome',
);
const FotosintesisCapturaLote = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/CapturaLotePage'),
  'FotosintesisCapturaLote',
);
// W1 «Cerebro Racional» — el wizard del modelo SOT v4, en ruta propia detrás de
// `VITE_CAPTURA_V4`. No reemplaza a la captura actual: los dos modelos se
// contradicen en cómo llega el costo a la pieza (capturado contra prorrateado).
const FotosintesisCapturaLoteV4 = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/CapturaLoteV4Page'),
  'FotosintesisCapturaLoteV4',
);
// W2 «Cerebro Creativo» — la grilla de casillas y la casilla suelta.
const FotosintesisCasillasLote = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/CasillasLotePage'),
  'FotosintesisCasillasLote',
);
const FotosintesisCasillaW2 = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/CasillaW2Page'),
  'FotosintesisCasillaW2',
);
// W3 — venta, consignación, devolución y asesor en una sola pantalla.
const FotosintesisMovimientoV4 = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/MovimientoV4Page'),
  'FotosintesisMovimientoV4',
);
const FotosintesisLoteResumen = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/LoteResumenPage'),
  'FotosintesisLoteResumen',
);
const FotosintesisEditItem = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/EditItemPage'),
  'FotosintesisEditItem',
);
const FotosintesisVenta = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/VentaPage'),
  'FotosintesisVenta',
);
const FotosintesisVentaDetail = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/VentaDetailPage'),
  'FotosintesisVentaDetail',
);
const FotosintesisSales = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/SalesPage'),
  'FotosintesisSales',
);
const FotosintesisMovimientos = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/MovimientosKardexPage'),
  'FotosintesisMovimientos',
);
const FotosintesisEscanear = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/EscanearPage'),
  'FotosintesisEscanear',
);
const FotosintesisDirectorio = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/DirectorioPage'),
  'FotosintesisDirectorio',
);
const FotosintesisSubLotes = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/SubLotesPage'),
  'FotosintesisSubLotes',
);
const FotosintesisLotes = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/LotesPage'),
  'FotosintesisLotes',
);
const FotosintesisItems = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/ItemsPage'),
  'FotosintesisItems',
);
const FotosintesisCertificados = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/certificados/CertGeneratorPage'),
  'FotosintesisCertificados',
);
const FotosintesisWorkbench = lazyWithRetry(
  () => import('./pages/admin/Fotosintesis/workbench/WorkbenchPage'),
  'FotosintesisWorkbench',
);

const FeedbackDashboard = lazyWithRetry(
  () => import('./pages/admin/FeedbackDashboard'),
  'FeedbackDashboard',
);
const ValuationPage = lazyWithRetry(
  () => import('./pages/valuation/ValuationPage'),
  'ValuationPage',
);

// Provider Portal pages
const ProviderDashboard = lazyWithRetry(
  () => import('./components/provider/ProviderDashboard'),
  'ProviderDashboard',
);
const ProviderRequestList = lazyWithRetry(
  () => import('./components/provider/ProviderRequestList'),
  'ProviderRequestList',
);
const ProviderQuotationForm = lazyWithRetry(
  () => import('./components/provider/ProviderQuotationForm'),
  'ProviderQuotationForm',
);
const ProviderInventory = lazyWithRetry(
  () => import('./components/provider/ProviderInventory'),
  'ProviderInventory',
);

// Admin Quotation Management
const QuotationRequestForm = lazyWithRetry(
  () => import('./components/admin/QuotationRequestForm'),
  'QuotationRequestForm',
);
const QuotationRequestList = lazyWithRetry(
  () => import('./components/admin/QuotationRequestList'),
  'QuotationRequestList',
);
const ProviderQuotationsList = lazyWithRetry(
  () => import('./components/admin/ProviderQuotationsList'),
  'ProviderQuotationsList',
);

// My Profile (Ambassador personal dashboard)
const MyProfilePage = lazyWithRetry(
  () => import('./pages/mi-perfil/MyProfilePage'),
  'MyProfilePage',
);
const AllActivityPage = lazyWithRetry(
  () => import('./pages/mi-perfil/AllActivityPage'),
  'AllActivityPage',
);
const GuestDetailPage = lazyWithRetry(
  () => import('./pages/mi-perfil/GuestDetailPage'),
  'GuestDetailPage',
);

// Product Requests (Asesor/Embajador -> Admin)
const ProductRequestsHub = lazyWithRetry(
  () => import('./pages/staff/requests/ProductRequestsHub'),
  'ProductRequestsHub',
);
const AdminProductRequestList = lazyWithRetry(
  () => import('./components/requests/AdminProductRequestList'),
  'AdminProductRequestList',
);

// Invitation Page (public route - accessible without auth)
const InvitationPage = lazyWithRetry(
  () => import('./pages/InvitationPage'),
  'InvitationPage',
);

// Public Collection Page (shareable without auth)
const RenacerRoutes = lazyWithRetry(
  () => import('./pages/public/renacer/RenacerRoutes'),
  'RenacerRoutes',
);

const CollectionPage = lazyWithRetry(
  () => import('./pages/collection/CollectionPage'),
  'CollectionPage',
);

// Cart Page
const CartPage = lazyWithRetry(() => import('./pages/CartPage'), 'CartPage');

// Public "Vitrina" — sandboxed client-facing product share (no app shell, no auth)
const VitrinaPage = lazyWithRetry(
  () => import('./pages/vitrina/VitrinaPage'),
  'VitrinaPage',
);
const PublicProductPage = lazyWithRetry(
  () =>
    import('./pages/vitrina/VitrinaPage').then((m) => ({
      default: m.PublicProductPage,
    })),
  'PublicProductPage',
);

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
    <Suspense fallback={<LocalizedLoading messageKey="general" />}>
      <Home />
    </Suspense>
  );
}

// Inner component that uses routing hooks
function AppContent() {
  const navigate = useNavigate();
  // Esmereogénesis is dev-only: gated OFF in production so its routes are not
  // reachable. Toggle locally via window.featureFlags.enable('ESMEREOGENESIS').
  const esmereoEnabled = getFeatureFlag('ESMEREOGENESIS');
  // Navigate to asesor profile page
  const handleViewAsesorProducts = useCallback(
    (asesor: Asesor) => {
      navigate(`/ambassadors/${asesor.slug}`);
    },
    [navigate],
  );

  return (
    <AppNavigatorProvider>
      <CopilotRailProvider>
        <IOSLayout>
          <ComparisonProvider>
            <Routes>
              {/* Primary routes - smart redirect based on role */}
              <Route path="/" element={<RoleBasedRedirect />} />
              <Route path="/home" element={<HomeOrProviderRedirect />} />
              <Route
                path="/treasure"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="treasures" />}
                  >
                    <TreasureBrowser />
                  </Suspense>
                }
              />
              {/* Redirect from old /inventory route for backward compatibility */}
              <Route
                path="/inventory"
                element={<Navigate to="/treasure" replace />}
              />

              {/* Product detail. `/p/:itemId` is a short alias of
                `/product/:itemId` — a shorter QR payload so printed labels stay
                low-density and scan off tiny 12mm jewelry tape. Same page. */}
              <Route
                path="/product/:itemId"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="product" />}
                  >
                    <ProductDetail />
                  </Suspense>
                }
              />
              <Route
                path="/p/:itemId"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="product" />}
                  >
                    <ProductDetail />
                  </Suspense>
                }
              />

              {/* Grouped lote/sublote bundle detail (same page, resolved by groupId) */}
              <Route
                path="/grupo/:groupId"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="product" />}
                  >
                    <ProductDetail />
                  </Suspense>
                }
              />

              {/* Public online cotización view — DESACTIVADO por seguridad (IDOR).
                Resolvía la cotización sólo por su número (enumerable), exponiendo
                nombre/teléfono del cliente + precios a cualquiera. No se reactiva
                hasta ligar un token de alta entropía al registro y al QR. La ruta
                queda fuera para que la página no sea alcanzable en producción.
            <Route
              path="/cot/:quotationNumber"
              element={
                <Suspense fallback={<LocalizedLoading messageKey="general" />}>
                  <CotizacionPublicPage />
                </Suspense>
              }
            />
            */}

              {/* Cart / Selection */}
              <Route
                path="/cart"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="selection" />}
                  >
                    <CartPage />
                  </Suspense>
                }
              />

              {/* Ambassadors (Embajadores) */}
              <Route
                path="/ambassadors"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="ambassadors" />}
                  >
                    <AmbassadorsPage
                      onViewProducts={handleViewAsesorProducts}
                    />
                  </Suspense>
                }
              />
              <Route
                path="/ambassadors/:slug"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="profile" />}
                  >
                    <AsesorProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="/ambassadors/:slug/product/:itemId"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="profile" />}
                  >
                    <AsesorProfilePage />
                  </Suspense>
                }
              />
              {/* Profile sub-views. Each renders AsesorProfilePage, which
                  derives which view to show from the URL, so browser-back
                  pops one view at a time instead of leaving the profile. */}
              <Route
                path="/ambassadors/:slug/c/:categoryKey"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="profile" />}
                  >
                    <AsesorProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="/ambassadors/:slug/editar"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="profile" />}
                  >
                    <AsesorProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="/ambassadors/:slug/favoritas"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="profile" />}
                  >
                    <AsesorProfilePage />
                  </Suspense>
                }
              />

              {/* Valuation Page - Emerald investment information */}
              <Route
                path="/valuation"
                element={
                  <Suspense
                    fallback={<LocalizedLoading messageKey="information" />}
                  >
                    <ValuationPage />
                  </Suspense>
                }
              />

              {/* Cuentas Hub - Staff + Invitado Especial (cotizaciones).
                Admin-only tools inside the hub stay gated by isAdmin. */}
              <Route
                path="/cuentas"
                element={
                  <CotizacionRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="accounts" />}
                    >
                      <AccountsHub />
                    </Suspense>
                  </CotizacionRoute>
                }
              />
              <Route
                path="/cuentas/simulador"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="simulator" />}
                    >
                      <PriceSimulator />
                    </Suspense>
                  </AdminRoute>
                }
              />
              <Route
                path="/cuentas/recibos"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="receipts" />}
                    >
                      <ReceiptGenerator />
                    </Suspense>
                  </AdminRoute>
                }
              />
              {/* Cotizaciones - Staff + Invitado Especial */}
              <Route
                path="/cuentas/cotizaciones"
                element={
                  <CotizacionRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="quotations" />}
                    >
                      <CotizacionGenerator />
                    </Suspense>
                  </CotizacionRoute>
                }
              />
              <Route
                path="/cuentas/cotizaciones/preview"
                element={
                  <CotizacionRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="quotation" />}
                    >
                      <QuotationPreview />
                    </Suspense>
                  </CotizacionRoute>
                }
              />

              {/* Bóveda Secreta */}
              <Route
                path="/boveda-secreta"
                element={
                  <Suspense fallback={<LocalizedLoading messageKey="vault" />}>
                    <VaultPage />
                  </Suspense>
                }
              />

              {/* Esmereogénesis - savings-with-purpose method (Bóveda).
                Dev-only feature: routes are omitted in production so the URLs
                fall through to the catch-all redirect. */}
              {esmereoEnabled && (
                <Route
                  path="/esmereogenesis"
                  element={
                    <EsmereoThemeProvider>
                      <Suspense
                        fallback={<LocalizedLoading messageKey="general" />}
                      >
                        <EsmereogenesisHubPage />
                      </Suspense>
                    </EsmereoThemeProvider>
                  }
                />
              )}
              {esmereoEnabled && (
                <Route
                  path="/esmereogenesis/:planId"
                  element={
                    <EsmereoThemeProvider>
                      <Suspense
                        fallback={<LocalizedLoading messageKey="general" />}
                      >
                        <EsmereogenesisGardenPage />
                      </Suspense>
                    </EsmereoThemeProvider>
                  }
                />
              )}
              {!esmereoEnabled && (
                <Route
                  path="/esmereogenesis/*"
                  element={<Navigate to="/" replace />}
                />
              )}

              {/* Admin Analytics Dashboard */}
              <Route
                path="/admin/analytics"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="analytics" />}
                    >
                      <AdminAnalyticsPage />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* Admin Name Generator */}
              <Route
                path="/admin/name-generator"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="generator" />}
                    >
                      <NameGeneratorPage />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* Product Viewers Analytics */}
              <Route
                path="/admin/analytics/item/:itemId"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="views" />}
                    >
                      <ProductViewersPage />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* User Views Analytics */}
              <Route
                path="/admin/analytics/user"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="history" />}
                    >
                      <UserViewsPage />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* All Users Activity Feed */}
              <Route
                path="/admin/analytics/activity"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="activity" />}
                    >
                      <ActivityPage />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* Cotización Products Analytics */}
              <Route
                path="/admin/cotizacion-products"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="products" />}
                    >
                      <CotizacionProductsPage />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* Admin Product Management — atelier */}
              <Route
                path="/admin/products"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="products" />}
                    >
                      <AdminProductManagementPage />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* Atelier · Etiquetas — QR label gallery for products + insumos */}
              <Route
                path="/admin/products/etiquetas"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="products" />}
                    >
                      <AdminEtiquetasPage />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* Fotosíntesis v2 — captura admin (handoff §6) */}
              <Route
                path="/admin/fotosintesis"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="general" />}
                    >
                      <FotosintesisLayout />
                    </Suspense>
                  </AdminRoute>
                }
              >
                <Route index element={<FotosintesisHome />} />
                <Route path="items" element={<FotosintesisItems />} />
                <Route path="lots" element={<FotosintesisLotes />} />
                {/* Antes de `lots/:loteId`, si no el param se traga "new-v4". */}
                {CAPTURA_V4_ENABLED ? (
                  <Route
                    path="lots/new-v4"
                    element={<FotosintesisCapturaLoteV4 />}
                  />
                ) : null}
                {CAPTURA_V4_ENABLED ? (
                  <Route
                    path="lots/:loteId/casillas"
                    element={<FotosintesisCasillasLote />}
                  />
                ) : null}
                {CAPTURA_V4_ENABLED ? (
                  <Route
                    path="lots/:loteId/casillas/:itemId"
                    element={<FotosintesisCasillaW2 />}
                  />
                ) : null}
                {CAPTURA_V4_ENABLED ? (
                  <Route
                    path="movimientos-v4"
                    element={<FotosintesisMovimientoV4 />}
                  />
                ) : null}
                <Route
                  path="lots/:loteId"
                  element={<FotosintesisCapturaLote />}
                />
                <Route
                  path="lots/:loteId/close"
                  element={<FotosintesisLoteResumen />}
                />
                <Route
                  path="lots/:loteId/sublotes"
                  element={<FotosintesisSubLotes />}
                />
                <Route
                  path="lots/:loteId/items/:lotItemId/edit"
                  element={<FotosintesisEditItem />}
                />
                <Route path="sales" element={<FotosintesisSales />} />
                <Route path="sales/new" element={<FotosintesisVenta />} />
                <Route
                  path="sales/:saleId"
                  element={<FotosintesisVentaDetail />}
                />
                <Route
                  path="movimientos"
                  element={<FotosintesisMovimientos />}
                />
                <Route path="escanear" element={<FotosintesisEscanear />} />
                <Route path="directory" element={<FotosintesisDirectorio />} />
                <Route
                  path="certificados"
                  element={<FotosintesisCertificados />}
                />
                <Route
                  path="copilot/:flow"
                  element={<FotosintesisWorkbench />}
                />
              </Route>

              {/* Admin Feedback Dashboard */}
              <Route
                path="/admin/feedback"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="feedback" />}
                    >
                      <FeedbackDashboard />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* Admin Quotation Management */}
              <Route
                path="/cuentas/solicitudes"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="requests" />}
                    >
                      <QuotationRequestList />
                    </Suspense>
                  </AdminRoute>
                }
              />
              <Route
                path="/cuentas/solicitudes/nueva"
                element={
                  <AdminRoute>
                    <Suspense fallback={<LocalizedLoading messageKey="form" />}>
                      <QuotationRequestForm />
                    </Suspense>
                  </AdminRoute>
                }
              />
              <Route
                path="/cuentas/cotizaciones-proveedor"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="quotations" />}
                    >
                      <ProviderQuotationsList />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* My Profile - Staff only */}
              <Route
                path="/mi-perfil"
                element={
                  <StaffRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="profile" />}
                    >
                      <MyProfilePage />
                    </Suspense>
                  </StaffRoute>
                }
              />
              <Route
                path="/mi-perfil/actividad"
                element={
                  <StaffRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="profile" />}
                    >
                      <AllActivityPage />
                    </Suspense>
                  </StaffRoute>
                }
              />
              <Route
                path="/mi-perfil/invitado/:guestName"
                element={
                  <StaffRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="profile" />}
                    >
                      <GuestDetailPage />
                    </Suspense>
                  </StaffRoute>
                }
              />

              {/* Product Requests (Asesor/Embajador -> Admin) - Staff only */}
              <Route
                path="/solicitudes"
                element={
                  <StaffRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="requests" />}
                    >
                      <ProductRequestsHub />
                    </Suspense>
                  </StaffRoute>
                }
              />
              {/* Legacy routes - redirect to unified view */}
              <Route
                path="/solicitar-producto"
                element={<Navigate to="/solicitudes?tab=nueva" replace />}
              />
              <Route
                path="/mis-solicitudes"
                element={<Navigate to="/solicitudes" replace />}
              />
              <Route
                path="/cuentas/solicitudes-asesores"
                element={
                  <AdminRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="requests" />}
                    >
                      <AdminProductRequestList />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* Provider Portal Routes */}
              <Route
                path="/provider"
                element={
                  <ProviderRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="portal" />}
                    >
                      <ProviderDashboard />
                    </Suspense>
                  </ProviderRoute>
                }
              />
              <Route
                path="/provider/requests"
                element={
                  <ProviderRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="requests" />}
                    >
                      <ProviderRequestList />
                    </Suspense>
                  </ProviderRoute>
                }
              />
              <Route
                path="/provider/submit"
                element={
                  <ProviderRoute>
                    <Suspense fallback={<LocalizedLoading messageKey="form" />}>
                      <ProviderQuotationForm />
                    </Suspense>
                  </ProviderRoute>
                }
              />
              <Route
                path="/provider/inventory"
                element={
                  <ProviderRoute>
                    <Suspense
                      fallback={<LocalizedLoading messageKey="inventory" />}
                    >
                      <ProviderInventory />
                    </Suspense>
                  </ProviderRoute>
                }
              />
            </Routes>
          </ComparisonProvider>
        </IOSLayout>
      </CopilotRailProvider>
    </AppNavigatorProvider>
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
          <Suspense fallback={<LocalizedLoading messageKey="general" />}>
            <InvitationPage />
          </Suspense>
        }
      />
      {/* Short link alias (e.g., /g/ABC123) - same as /invite/:shortCode */}
      <Route
        path="/g/:shortCode"
        element={
          <Suspense fallback={<LocalizedLoading messageKey="general" />}>
            <InvitationPage />
          </Suspense>
        }
      />
      {/* Public collection page (e.g., /c/ceo-tierra-madre or /c/ceo-tierra-madre/916) */}
      <Route
        path="/c/:folder/:itemId?"
        element={
          <Suspense fallback={<LocalizedLoading messageKey="collection" />}>
            <CollectionPage />
          </Suspense>
        }
      />
      {/* Public sandboxed product share ("Vitrina"): /v/AB3K9P (token) or
          /v/324 · /v/324-323-370 (stateless id-list), optional /:itemId detail */}
      <Route
        path="/v/:code/:itemId?"
        element={
          <Suspense fallback={<LocalizedLoading messageKey="product" />}>
            <VitrinaPage />
          </Suspense>
        }
      />
      {/* Kit Renacer campaign — destination of the bracelet QR. The whole
          subtree sits here, above the auth check: the landing and every screen
          adjacent to it are public, no sign-in anywhere in the flow. */}
      <Route
        path="/renacer/*"
        element={
          <Suspense fallback={<LocalizedLoading messageKey="general" />}>
            <RenacerRoutes />
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
      navigate(
        `/invite/${inviteCode}?redirect=${encodeURIComponent(returnTo)}`,
        { replace: true },
      );
    }
  }, [isAuthenticated, navigate]);

  // Not authenticated: serve the public sandboxed product view for shared
  // /product/:itemId links (so clients can see the product without signing in);
  // everything else falls through to the sign-in WelcomeScreen. This nested
  // <Routes> matches the full URL because AuthenticatedApp renders under the
  // InvitationRouter "*" splat (no path is consumed).
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route
          path="/product/:itemId"
          element={
            <Suspense fallback={<LocalizedLoading messageKey="product" />}>
              <PublicProductPage />
            </Suspense>
          }
        />
        {/* Short alias of /product/:itemId — see the authed route above. */}
        <Route
          path="/p/:itemId"
          element={
            <Suspense fallback={<LocalizedLoading messageKey="product" />}>
              <PublicProductPage />
            </Suspense>
          }
        />
        <Route path="*" element={<WelcomeScreen />} />
      </Routes>
    );
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
  // Video generation mode — always show splash so the animation can be recorded
  if (new URLSearchParams(window.location.search).get('video') === 'true') {
    return true;
  }

  // Public routes that have their own splash — skip the main app splash
  const path = window.location.pathname;
  if (
    path.startsWith('/c/') ||
    path.startsWith('/v/') ||
    path.startsWith('/product/') ||
    path.startsWith('/p/') ||
    path.startsWith('/invite/') ||
    path.startsWith('/g/') ||
    path === '/renacer' ||
    path.startsWith('/renacer/')
  ) {
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
      <AppShellProviders>
        <BrowserRouter>
          <InvitationRouter />
          {/* FeedbackFAB moved to IOSMoreSheet - access via "Más" tab */}
        </BrowserRouter>
      </AppShellProviders>
    </ChunkErrorBoundary>
  );
}

export default App;
