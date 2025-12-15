/**
 * Home Page Component (Orchestrator)
 *
 * Composes all home page sections with:
 * - Beautiful background image
 * - Lazy loading for below-the-fold content
 * - Error boundaries for resilience
 * - Shared state management
 * - Accessibility structure
 *
 * Refactored by: CoomÜnity Council (Aria, Moksart, Eunoia, Zeno, Steve)
 * Evolutionary Refactor: Modular architecture with sacred geometry
 */

import React, { Suspense, lazy, useMemo, useCallback, useEffect } from 'react';
import { Box } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import { useInventory } from '../../hooks/useInventory';
import { InventoryItem } from '../../types';
import { DailyOracle } from '../../data/homeContent';
import { useGamification, AchievementToast } from './gamification';
import { useAnalytics, useSavedFacts } from './hooks';
import { SectionSkeleton, ErrorFallback } from './common';
import { InstallButton, NotificationPermission } from '../pwa';
import { isPWA } from '../../utils/pwa';
import { useNewProductNotification } from '../../hooks/useNewProductNotification';
import {
  MAX_PRODUCTS_DISPLAY,
  BACKGROUND_OPACITY,
  TAB_BAR_HEIGHT,
  SKELETON_HEIGHTS,
  SHARE_CONFIG,
  ANIMATION_DELAYS,
} from './constants';

// =============================================================================
// LAZY LOADED SECTIONS
// =============================================================================

// Critical sections - load immediately
import HeroSection from './sections/HeroSection';
import CategoryCarousels from './sections/CategoryCarousels';
import OracleSection from './sections/OracleSection';

// Below-the-fold sections - lazy load
const MeditationSection = lazy(() => import('./sections/MeditationSection'));
const ProductsSection = lazy(() => import('./sections/ProductsSection'));
const KnowledgeSection = lazy(() => import('./sections/KnowledgeSection'));
const WelcomeCard = lazy(() => import('./sections/WelcomeCard'));
const Footer = lazy(() => import('./sections/Footer'));

// Always visible components
import WhatsAppButton from './sections/WhatsAppButton';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Home: React.FC = () => {
  const { inventory } = useInventory();
  const [gamificationState, gamificationActions, pendingAchievement] = useGamification();
  const analytics = useAnalytics();
  const [{ savedFacts }, savedFactsActions] = useSavedFacts();

  // ==========================================================================
  // ANALYTICS TRACKING
  // ==========================================================================

  useEffect(() => {
    analytics.trackPageView('home');
  }, [analytics]);

  // Check for new products and notify
  useNewProductNotification({ productCount: inventory.length });

  // Log gamification state for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Home] Gamification:', { level: gamificationState.level, xp: gamificationState.xp });
  }

  // ==========================================================================
  // DERIVED DATA
  // ==========================================================================

  // Get newest products WITH VALID IMAGES
  const newProducts = useMemo(() => {
    const productsWithImages = [...inventory]
      .filter((item: InventoryItem) => {
        const img = item.imagen?.trim();
        if (!img) return false;
        return img.startsWith('http') || img.startsWith('/') || img.includes('cloudinary');
      })
      .sort((a: InventoryItem, b: InventoryItem) => (b.item || 0) - (a.item || 0))
      .slice(0, MAX_PRODUCTS_DISPLAY);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Home] Products with images:', productsWithImages.length, 'of', inventory.length);
    }

    return productsWithImages;
  }, [inventory]);

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
        console.log('Share cancelled or failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.log('Clipboard write failed:', err);
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
      {/* Background Image */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          backgroundImage: 'url(/images/home-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: BACKGROUND_OPACITY,
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)',
          },
        }}
      />

      {/* Hero Section - Logo + Brand */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <HeroSection />
      </ErrorBoundary>

      {/* Category Carousels - Rings & Gems */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <CategoryCarousels />
      </ErrorBoundary>

      {/* Products Section - High visibility */}
      {newProducts.length > 0 && (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<SectionSkeleton height={SKELETON_HEIGHTS.products} />}>
            <ProductsSection products={newProducts} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Oracle Section - Daily wisdom */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <OracleSection
          savedFacts={savedFacts}
          onSaveFact={handleSaveFact}
          onShare={handleShare}
        />
      </ErrorBoundary>

      {/* Install App Prompt - Only shown when not installed */}
      {!isPWA() && (
        <Box sx={{ px: 2, mb: 2 }}>
          <InstallButton variant="card" />
        </Box>
      )}

      {/* Notification Permission - Gentle prompt */}
      <Box sx={{ px: 2, mb: 2 }}>
        <NotificationPermission variant="card" />
      </Box>

      {/* Meditation Section - Lazy loaded */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SectionSkeleton height={SKELETON_HEIGHTS.meditation} />}>
          <MeditationSection />
        </Suspense>
      </ErrorBoundary>

      {/* Knowledge Section - Lazy loaded */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SectionSkeleton height={SKELETON_HEIGHTS.knowledge} />}>
          <KnowledgeSection
            savedFacts={savedFacts}
            onSelectFact={handleSelectFact}
          />
        </Suspense>
      </ErrorBoundary>

      {/* Welcome Card - Gamification stats */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SectionSkeleton height={SKELETON_HEIGHTS.welcome} />}>
          <WelcomeCard />
        </Suspense>
      </ErrorBoundary>

      {/* Footer - Social links and contact */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SectionSkeleton height={SKELETON_HEIGHTS.footer} />}>
          <Footer />
        </Suspense>
      </ErrorBoundary>

      {/* WhatsApp Button - Floating contact */}
      <WhatsAppButton />

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
