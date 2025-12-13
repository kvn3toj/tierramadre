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
 */

import React, { Suspense, lazy, useState, useMemo, useCallback, useEffect } from 'react';
import { Box, Skeleton, Typography, Button } from '@mui/material';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { useInventory } from '../../hooks/useInventory';
import { InventoryItem } from '../../types';
import { DailyOracle } from '../../data/homeContent';
import { useGamification, AchievementToast } from './gamification';
import { QuickActions } from './navigation';
import { useAnalytics } from './hooks';
import { InstallButton, NotificationPermission } from '../pwa';
import { isPWA } from '../../utils/pwa';
import { useNewProductNotification } from '../../hooks/useNewProductNotification';

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
// LOADING FALLBACK
// =============================================================================

const SectionSkeleton: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <Box sx={{ px: 2, mb: 2 }}>
    <Skeleton
      variant="rounded"
      height={height}
      animation="wave"
      sx={{
        bgcolor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
      }}
    />
  </Box>
);

// =============================================================================
// ERROR FALLBACK
// =============================================================================

const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => (
  <Box
    role="alert"
    sx={{
      p: 3,
      m: 2,
      textAlign: 'center',
      bgcolor: 'rgba(255,255,255,0.1)',
      borderRadius: 3,
      backdropFilter: 'blur(10px)',
    }}
  >
    <Typography variant="body1" sx={{ color: 'rgba(255,200,200,0.9)', mb: 2 }}>
      Algo salió mal al cargar esta sección
    </Typography>
    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 2 }}>
      {error.message}
    </Typography>
    <Button variant="outlined" size="small" onClick={resetErrorBoundary} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
      Reintentar
    </Button>
  </Box>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Home: React.FC = () => {
  const { inventory } = useInventory();
  const [gamificationState, gamificationActions, pendingAchievement] = useGamification();
  const analytics = useAnalytics();

  // ==========================================================================
  // SHARED STATE
  // ==========================================================================

  // Saved facts state (persisted in localStorage)
  const [savedFacts, setSavedFacts] = useState<number[]>(() => {
    const saved = localStorage.getItem('tierra-madre-saved-facts');
    return saved ? JSON.parse(saved) : [];
  });

  // Selected fact for detail modal (shared between Oracle and Knowledge sections)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedFact, setSelectedFact] = useState<DailyOracle | null>(null);

  // ==========================================================================
  // ANALYTICS TRACKING
  // ==========================================================================

  // Track page view on mount
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
        // Valid URL: starts with http, https, / or contains cloudinary
        return img.startsWith('http') || img.startsWith('/') || img.includes('cloudinary');
      })
      .sort((a: InventoryItem, b: InventoryItem) => (b.item || 0) - (a.item || 0))
      .slice(0, 6);

    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log('[Home] Products with images:', productsWithImages.length, 'of', inventory.length);
    }

    return productsWithImages;
  }, [inventory]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // Handle save/unsave fact
  const handleSaveFact = useCallback((factId: number) => {
    setSavedFacts(prev => {
      const newSaved = prev.includes(factId)
        ? prev.filter(id => id !== factId)
        : [...prev, factId];
      localStorage.setItem('tierra-madre-saved-facts', JSON.stringify(newSaved));
      return newSaved;
    });
  }, []);

  // Handle share
  const handleShare = useCallback(async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tierra Madre - Sabiduría Esmeralda',
          text: text,
          url: window.location.origin,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text);
        // Could show a toast notification here
      } catch (err) {
        console.log('Clipboard write failed:', err);
      }
    }
  }, []);

  // Handle fact selection (for modal)
  const handleSelectFact = useCallback((fact: DailyOracle) => {
    setSelectedFact(fact);
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
        pb: 'calc(env(safe-area-inset-bottom, 0px) + 96px)', // TabBar + safe area
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {/* ================================================================== */}
      {/* BACKGROUND IMAGE */}
      {/* ================================================================== */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          backgroundImage: 'url(/images/home-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.77,
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)',
          },
        }}
      />

      {/* ================================================================== */}
      {/* HERO SECTION - Logo + Brand */}
      {/* ================================================================== */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <HeroSection />
      </ErrorBoundary>

      {/* ================================================================== */}
      {/* CATEGORY CAROUSELS - Rings & Gems */}
      {/* ================================================================== */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <CategoryCarousels />
      </ErrorBoundary>

      {/* ================================================================== */}
      {/* PRODUCTS SECTION - High visibility, right after carousels */}
      {/* ================================================================== */}
      {newProducts.length > 0 && (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<SectionSkeleton height={200} />}>
            <ProductsSection products={newProducts} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* ================================================================== */}
      {/* ORACLE SECTION - Daily wisdom */}
      {/* ================================================================== */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <OracleSection
          savedFacts={savedFacts}
          onSaveFact={handleSaveFact}
          onShare={handleShare}
        />
      </ErrorBoundary>

      {/* ================================================================== */}
      {/* INSTALL APP PROMPT - Only shown when not installed */}
      {/* ================================================================== */}
      {!isPWA() && (
        <Box sx={{ px: 2, mb: 2 }}>
          <InstallButton variant="card" />
        </Box>
      )}

      {/* ================================================================== */}
      {/* NOTIFICATION PERMISSION - Gentle prompt for notifications */}
      {/* ================================================================== */}
      <Box sx={{ px: 2, mb: 2 }}>
        <NotificationPermission variant="card" />
      </Box>

      {/* ================================================================== */}
      {/* MEDITATION SECTION - Lazy loaded */}
      {/* ================================================================== */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SectionSkeleton height={180} />}>
          <MeditationSection />
        </Suspense>
      </ErrorBoundary>

      {/* ================================================================== */}
      {/* KNOWLEDGE SECTION - Lazy loaded */}
      {/* ================================================================== */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SectionSkeleton height={300} />}>
          <KnowledgeSection
            savedFacts={savedFacts}
            onSelectFact={handleSelectFact}
          />
        </Suspense>
      </ErrorBoundary>

      {/* ================================================================== */}
      {/* WELCOME CARD - Gamification stats at bottom */}
      {/* ================================================================== */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SectionSkeleton height={250} />}>
          <WelcomeCard />
        </Suspense>
      </ErrorBoundary>

      {/* ================================================================== */}
      {/* FOOTER - Social links and contact */}
      {/* ================================================================== */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SectionSkeleton height={150} />}>
          <Footer />
        </Suspense>
      </ErrorBoundary>

      {/* ================================================================== */}
      {/* WHATSAPP BUTTON - Floating contact button */}
      {/* ================================================================== */}
      <WhatsAppButton />

      {/* ================================================================== */}
      {/* ACHIEVEMENT TOAST - Global notification for achievements */}
      {/* ================================================================== */}
      <AchievementToast
        achievement={pendingAchievement}
        onDismiss={gamificationActions.dismissAchievement}
        autoDismiss={5000}
      />

      {/* ================================================================== */}
      {/* QUICK ACTIONS - Floating navigation menu */}
      {/* ================================================================== */}
      <QuickActions
        position="bottom-right"
        showShortcuts={true}
      />
    </Box>
  );
};

export default Home;
