/**
 * GlobalLoadingContext
 * Thin top-of-page progress bar for API operations.
 * Any component can call setLoading(true/false) to show/hide.
 * Nielsen H1 (Visibility of System Status).
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { LinearProgress, Box } from '@mui/material';
import { emeraldCore } from '../design-system/tokens/colors';

interface GlobalLoadingContextValue {
  /** Increment the loading counter (show bar) */
  startLoading: () => void;
  /** Decrement the loading counter (hide bar when 0) */
  stopLoading: () => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextValue>({
  startLoading: () => {},
  stopLoading: () => {},
});

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const startLoading = useCallback(() => setCount(c => c + 1), []);
  const stopLoading = useCallback(() => setCount(c => Math.max(0, c - 1)), []);

  const value = useMemo(() => ({ startLoading, stopLoading }), [startLoading, stopLoading]);

  return (
    <GlobalLoadingContext.Provider value={value}>
      {count > 0 && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
          <LinearProgress
            sx={{
              height: 2,
              '& .MuiLinearProgress-bar': { bgcolor: emeraldCore.primary },
              bgcolor: 'transparent',
            }}
          />
        </Box>
      )}
      {children}
    </GlobalLoadingContext.Provider>
  );
}

export const useGlobalLoading = () => useContext(GlobalLoadingContext);
