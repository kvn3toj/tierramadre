/**
 * ComparisonContext — lifts the emerald comparison state (useComparison) above
 * the router so it is SHARED across routes. The catalog grid no longer carries
 * the per-card compare button; instead the product detail page adds/removes the
 * piece, and the comparison bar/modal read the same state. Because the provider
 * sits above <Routes>, the selection survives navigation between the catalog and
 * a product page.
 */
import { createContext, useContext, ReactNode } from 'react';
import { useComparison } from '../hooks/useComparison';

type ComparisonContextValue = ReturnType<typeof useComparison>;

const ComparisonContext = createContext<ComparisonContextValue | null>(null);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const comparison = useComparison();
  return (
    <ComparisonContext.Provider value={comparison}>
      {children}
    </ComparisonContext.Provider>
  );
}

/** Access the shared comparison state. Must be used under <ComparisonProvider>. */
export function useComparisonContext(): ComparisonContextValue {
  const ctx = useContext(ComparisonContext);
  if (!ctx) {
    throw new Error(
      'useComparisonContext must be used within a ComparisonProvider',
    );
  }
  return ctx;
}

export default ComparisonContext;
