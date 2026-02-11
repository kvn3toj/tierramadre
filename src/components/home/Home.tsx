/**
 * Home Page Component (Orchestrator)
 *
 * Liquid Glass Design - Apple iOS 26 inspired
 * Minimalistic, elegant, content-first approach
 *
 * Sections:
 * 1. HeroGallery - Full-bleed hero with thumbnail carousel (click to change)
 * 2. Products - Latest arrivals
 * 3. Oracle - Compact quote card
 * 4. Knowledge - iOS Settings-style list
 * 5. Footer - Minimal contact info
 *
 * Refactored by: CoomÜnity Council (Aria, Moksart, Eunoia, Zeno)
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { Box } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { ErrorBoundary } from 'react-error-boundary';
import { useTreasure } from '../../hooks/useTreasure';
import { useNewestProducts } from '../../hooks/useNewestProducts';
import { useGamification, AchievementToastAnimated as AchievementToast } from '../gamification';
import { useAnalytics } from './hooks';
import { SectionSkeleton, ErrorFallback } from './common';
import { NotificationPermission } from '../pwa';
import { useNewProductNotification } from '../../hooks/useNewProductNotification';

import {
  MAX_PRODUCTS_DISPLAY,
  SKELETON_HEIGHTS,
  ANIMATION_DELAYS,
} from './constants';

// =============================================================================
// LAZY LOADED SECTIONS
// =============================================================================

// Critical sections - load immediately
import HeroGallery from './sections/HeroGallery';
import OracleSection from './sections/OracleSection';

// Below-the-fold sections - lazy load
const ProductsSection = lazy(() => import('./sections/ProductsSection'));
const ValuationSection = lazy(() => import('./sections/ValuationSection'));
// KnowledgeSection removed - content consolidated into OracleSection
const Footer = lazy(() => import('./sections/Footer'));

// Reserved for future use (minimalistic redesign)
// const MeditationSection = lazy(() => import('./sections/MeditationSection'));
// const WelcomeCard = lazy(() => import('./sections/WelcomeCard'));


// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Home: React.FC = () => {
  const muiTheme = useMuiTheme();
  const isDarkMode = muiTheme.palette.mode === 'dark';
  const { treasure } = useTreasure();

  // Fetch newest products based on image upload date in Google Drive (SOURCE OF TRUTH)
  const { newestProducts: newProducts, isLoading: isLoadingNewProducts } = useNewestProducts(
    treasure,
    MAX_PRODUCTS_DISPLAY
  );

  const [, gamificationActions, pendingAchievement] = useGamification();
  const analytics = useAnalytics();

  // ==========================================================================
  // ANALYTICS TRACKING
  // ==========================================================================

  useEffect(() => {
    analytics.trackPageView('home');
  }, [analytics]);

  // Check for new products and notify (uses product IDs for accurate detection)
  useNewProductNotification({ products: treasure });


  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Box
      aria-label="Página principal de Tierra Madre"
      sx={{
        position: 'relative',
        // Prevent overscroll bounce showing black background
        overscrollBehavior: 'contain',
      }}
    >
      {/* Hero + Gallery - Merged with interactive thumbnails */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <HeroGallery treasure={treasure} />
      </ErrorBoundary>

      {/* Oracle - Animated random quote */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <OracleSection />
      </ErrorBoundary>

      {/* Lower sections with background image - starts from chart */}
      <Box
        sx={{
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage: isDarkMode
              ? 'url(/images/home-bg.png)'
              : 'url(/images/home-bg-light.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'scroll', // Was 'fixed' but broken on iOS inside scroll containers
            opacity: 0.25,
            // Fade in from top
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%)',
            zIndex: 0,
          },
        }}
      >
        {/* Valuation - Emerald appreciation */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<SectionSkeleton height={SKELETON_HEIGHTS.valuation} />}>
              <ValuationSection />
            </Suspense>
          </ErrorBoundary>
        </Box>

        {/* Products Section - Latest arrivals (beside chart section) */}
        {/* Show skeleton while loading, then show products if found */}
        {(isLoadingNewProducts || newProducts.length > 0) && (
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <Suspense fallback={<SectionSkeleton height={SKELETON_HEIGHTS.products} />}>
                {isLoadingNewProducts ? (
                  <SectionSkeleton height={SKELETON_HEIGHTS.products} />
                ) : (
                  <ProductsSection products={newProducts} />
                )}
              </Suspense>
            </ErrorBoundary>
          </Box>
        )}

        {/* Footer - Social links and contact */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<SectionSkeleton height={SKELETON_HEIGHTS.footer} />}>
              <Footer />
            </Suspense>
          </ErrorBoundary>
        </Box>
      </Box>

      {/* Notification Permission - Floating tooltip */}
      <NotificationPermission variant="tooltip" />

      {/* Achievement Toast - Global notification */}
      <AchievementToast
        achievement={pendingAchievement}
        onDismiss={gamificationActions.dismissAchievement}
        autoDismiss={ANIMATION_DELAYS.achievementDismiss}
      />
    </Box>
  );
};

export default Home;
