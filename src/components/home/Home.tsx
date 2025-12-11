/**
 * Home Page Component (Orchestrator)
 *
 * Composes all home page sections with:
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

// =============================================================================
// LAZY LOADED SECTIONS
// =============================================================================

// Critical sections - load immediately
import HeroSection from './sections/HeroSection';
import OracleSection from './sections/OracleSection';

// Below-the-fold sections - lazy load
const MeditationSection = lazy(() => import('./sections/MeditationSection'));
const ProductsSection = lazy(() => import('./sections/ProductsSection'));
const KnowledgeSection = lazy(() => import('./sections/KnowledgeSection'));

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
        bgcolor: 'var(--surface-secondary)',
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
      bgcolor: 'var(--surface-secondary)',
      borderRadius: 3,
      border: '1px solid var(--border-default)',
    }}
  >
    <Typography variant="body1" color="error" sx={{ mb: 2 }}>
      Algo salió mal al cargar esta sección
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
      {error.message}
    </Typography>
    <Button variant="outlined" size="small" onClick={resetErrorBoundary}>
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

  // Log gamification state for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Home] Gamification:', { level: gamificationState.level, xp: gamificationState.xp });
  }

  // ==========================================================================
  // DERIVED DATA
  // ==========================================================================

  // Get newest products (last 3)
  const newProducts = useMemo(() => {
    return [...inventory]
      .sort((a: InventoryItem, b: InventoryItem) => (b.item || 0) - (a.item || 0))
      .slice(0, 3);
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
        bgcolor: 'var(--surface-primary)',
      }}
    >
      {/* ================================================================== */}
      {/* HERO SECTION - Critical, loads immediately */}
      {/* ================================================================== */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <HeroSection />
      </ErrorBoundary>

      {/* ================================================================== */}
      {/* ORACLE SECTION - High priority */}
      {/* ================================================================== */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <OracleSection
          savedFacts={savedFacts}
          onSaveFact={handleSaveFact}
          onShare={handleShare}
        />
      </ErrorBoundary>

      {/* ================================================================== */}
      {/* MEDITATION SECTION - Lazy loaded */}
      {/* ================================================================== */}
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SectionSkeleton height={180} />}>
          <MeditationSection />
        </Suspense>
      </ErrorBoundary>

      {/* ================================================================== */}
      {/* PRODUCTS SECTION - Lazy loaded */}
      {/* ================================================================== */}
      {newProducts.length > 0 && (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<SectionSkeleton height={200} />}>
            <ProductsSection products={newProducts} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* ================================================================== */}
      {/* KNOWLEDGE SECTION - Lazy loaded (lowest priority) */}
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
