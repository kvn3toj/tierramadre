/**
 * Route Prefetching Utility
 * Pre-loads route chunks on hover/focus for faster navigation.
 * Uses dynamic import() to trigger Vite's chunk download without rendering.
 */

const prefetchedRoutes = new Set<string>();

const routeImports: Record<string, () => Promise<unknown>> = {
  product: () => import('../pages/treasure/ProductDetail/ProductDetailPage'),
  cotizacion: () => import('../components/cotizacion/CotizacionGenerator'),
  analytics: () => import('../pages/admin/analytics/AdminAnalyticsPage'),
};

export function prefetchRoute(routeKey: string): void {
  if (prefetchedRoutes.has(routeKey)) return;
  prefetchedRoutes.add(routeKey);

  const importFn = routeImports[routeKey];
  if (importFn) {
    // Fire and forget - just trigger the chunk download
    importFn().catch(() => {
      // Remove from cache so it can retry later
      prefetchedRoutes.delete(routeKey);
    });
  }
}
