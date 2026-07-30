/**
 * NetworkStatusContext
 *
 * Detects online/offline state and renders a dismissible warning banner.
 * Follows GlobalLoadingContext's thin-provider pattern.
 * ISO 9241-110:2020 P6 — Error Tolerance (offline awareness).
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Alert, Collapse, Box, IconButton } from '@mui/material';
import { WifiOff, X } from 'lucide-react';
import { zIndex, hitSlop } from '../design-system';

interface NetworkStatusContextValue {
  isOnline: boolean;
}

const NetworkStatusContext = createContext<NetworkStatusContextValue>({ isOnline: true });

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false); // Reset dismiss when reconnected then disconnected again
    };
    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false); // Show banner again on new disconnect
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleDismiss = useCallback(() => setDismissed(true), []);

  const value = useMemo(() => ({ isOnline }), [isOnline]);

  const showBanner = !isOnline && !dismissed;

  return (
    <NetworkStatusContext.Provider value={value}>
      <Collapse in={showBanner}>
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: zIndex.modal - 1 }}>
          <Alert
            severity="warning"
            icon={<WifiOff size={18} />}
            action={
              <IconButton
                size="small"
                onClick={handleDismiss}
                sx={hitSlop()}
                aria-label="Cerrar aviso"
              >
                <X size={16} />
              </IconButton>
            }
            sx={{
              borderRadius: 0,
              py: 0.25,
              '& .MuiAlert-message': { fontSize: '0.8125rem' },
            }}
          >
            Sin conexion a internet
          </Alert>
        </Box>
      </Collapse>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export const useNetworkStatus = () => useContext(NetworkStatusContext);
