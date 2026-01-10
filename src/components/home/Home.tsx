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

import React, { Suspense, lazy, useCallback, useEffect } from 'react';
import { Box } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { ErrorBoundary } from 'react-error-boundary';
import { useTreasure } from '../../hooks/useTreasure';
import { useNewProductImages } from '../../hooks/useNewProductImages';
import { DailyOracle } from '../../data/homeContent';
import { useGamification, AchievementToast } from './gamification';
import { useAnalytics, useSavedFacts } from './hooks';
import { SectionSkeleton, ErrorFallback } from './common';
import { InstallButton, NotificationPermission } from '../pwa';
import { isPWA } from '../../utils/pwa';
import { createLogger } from '../../utils/logger';
import { useNewProductNotification } from '../../hooks/useNewProductNotification';

const log = createLogger('Home');
import {
  MAX_PRODUCTS_DISPLAY,

  TAB_BAR_HEIGHT,
  SKELETON_HEIGHTS,
  SHARE_CONFIG,
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
const KnowledgeSection = lazy(() => import('./sections/KnowledgeSection'));
const Footer = lazy(() => import('./sections/Footer'));

// Reserved for future use (minimalistic redesign)
// const MeditationSection = lazy(() => import('./sections/MeditationSection'));
// const WelcomeCard = lazy(() => import('./sections/WelcomeCard'));

// Always visible components
import WhatsAppButton from './sections/WhatsAppButton';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Home: React.FC = () => {
  const muiTheme = useMuiTheme();
  const isDarkMode = muiTheme.palette.mode === 'dark';
  const { treasure } = useTreasure();

  // Pre-fetch Drive images for newest products (images stored in Drive folders, not Sheets URL)
  // Scan up to 30 items - the hook will stop early once enough products with images are found
  const { productsWithImages: newProducts } = useNewProductImages(
    treasure,
    MAX_PRODUCTS_DISPLAY,
    30
  );

  const [, gamificationActions, pendingAchievement] = useGamification();
  const analytics = useAnalytics();
  const [{ savedFacts }, savedFactsActions] = useSavedFacts();

  // ==========================================================================
  // ANALYTICS TRACKING
  // ==========================================================================

  useEffect(() => {
    analytics.trackPageView('home');
  }, [analytics]);

  // Check for new products and notify
  useNewProductNotification({ productCount: treasure.length });


  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSaveFact = useCallback((factId: number) => {
    savedFactsActions.toggleSave(factId);
  }, [savedFactsActions]);

  const handleShare = useCallback(async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: SHARE_CONFIG.title,
          text: text,
          url: window.location.origin,
        });
      } catch (err) {
        log.debug('Share cancelled or failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        log.debug('Clipboard write failed:', err);
      }
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSelectFact = useCallback((_fact: DailyOracle) => {
    // Reserved for fact detail modal integration
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Box
      component="main"
      role="main"
      aria-label="Página principal de Tierra Madre"
      sx={{
        pb: `calc(env(safe-area-inset-bottom, 0px) + ${TAB_BAR_HEIGHT}px)`,
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {/* Hero + Gallery - Merged with interactive thumbnails */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <HeroGallery />
      </ErrorBoundary>

      {/* Products Section - Latest arrivals */}
      {newProducts.length > 0 && (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<SectionSkeleton height={SKELETON_HEIGHTS.products} />}>
            <ProductsSection products={newProducts} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Oracle - Floating glass quote */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <OracleSection
          savedFacts={savedFacts}
          onSaveFact={handleSaveFact}
          onShare={handleShare}
        />
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
            backgroundAttachment: 'fixed', // Parallax scroll effect
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

        {/* Knowledge - iOS Settings-style list */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<SectionSkeleton height={SKELETON_HEIGHTS.knowledge} />}>
              <KnowledgeSection
                savedFacts={savedFacts}
                onSelectFact={handleSelectFact}
                onSaveFact={handleSaveFact}
              />
            </Suspense>
          </ErrorBoundary>
        </Box>

        {/* Install App Prompt - Before footer */}
        {!isPWA() && (
          <Box sx={{ px: 2, mb: 2, position: 'relative', zIndex: 1 }}>
            <InstallButton variant="card" />
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

      {/* WhatsApp Button - Floating contact */}
      <WhatsAppButton />

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
