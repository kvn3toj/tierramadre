/**
 * NotificationContext
 * Global notification system replacing native alert()/confirm() calls.
 * Provides Snackbar-based feedback and confirm dialogs.
 *
 * Nielsen H2: Match between system and real world (in-UI feedback)
 * Nielsen H5: Error prevention (confirm before destructive actions)
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { registerFetchFailureHandler } from '../utils/fetchFailureBridge';
import { Snackbar, Alert, AlertColor } from '@mui/material';
import { fontSizes, fontWeights, radius, semanticColors, whiteAlpha } from '../design-system';

interface NotificationState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface ConfirmState {
  open: boolean;
  message: string;
  resolve: ((value: boolean) => void) | null;
}

interface NotificationContextValue {
  /** Show an in-UI notification (replaces alert()) */
  notify: (message: string, severity?: AlertColor) => void;
  /** Show a confirm dialog (replaces confirm()) — returns Promise<boolean> */
  confirmAction: (message: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    message: '',
    resolve: null,
  });

  // Auto-dismiss timer ref
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const notify = useCallback((message: string, severity: AlertColor = 'info') => {
    // Clear any pending timer
    if (timerRef.current) clearTimeout(timerRef.current);
    setNotification({ open: true, message, severity });
  }, []);

  const handleClose = useCallback((_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  const confirmAction = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirm({ open: true, message, resolve });
    });
  }, []);

  useEffect(() => {
    registerFetchFailureHandler((message) => notify(message, 'error'));
    return () => registerFetchFailureHandler(null);
  }, [notify]);

  const handleConfirm = useCallback((accepted: boolean) => {
    confirm.resolve?.(accepted);
    setConfirm({ open: false, message: '', resolve: null });
  }, [confirm.resolve]);

  const contextValue = useMemo(
    () => ({ notify, confirmAction }),
    [notify, confirmAction]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      {/* Snackbar notification (replaces alert()) */}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.severity === 'error' ? 6000 : 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 'env(safe-area-inset-bottom)' }}
      >
        <Alert
          onClose={handleClose}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Confirm dialog (replaces confirm()) */}
      {confirm.open && (
        <Snackbar
          open={confirm.open}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ mb: 'env(safe-area-inset-bottom)' }}
        >
          <Alert
            severity="warning"
            variant="filled"
            sx={{ width: '100%', borderRadius: 2, alignItems: 'center' }}
            action={
              <>
                <button
                  onClick={() => handleConfirm(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${whiteAlpha(0.5)}`,
                    color: 'white',
                    borderRadius: radius.sm,
                    padding: '4px 12px',
                    cursor: 'pointer',
                    marginRight: 8,
                    fontSize: fontSizes.sm,
                    fontWeight: fontWeights.semibold,
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleConfirm(true)}
                  style={{
                    background: 'white',
                    border: 'none',
                    color: semanticColors.error.dark,
                    borderRadius: radius.sm,
                    padding: '4px 12px',
                    cursor: 'pointer',
                    fontSize: fontSizes.sm,
                    fontWeight: fontWeights.semibold,
                  }}
                >
                  Eliminar
                </button>
              </>
            }
          >
            {confirm.message}
          </Alert>
        </Snackbar>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    // Fallback for components outside the provider (e.g., hooks used standalone)
    return {
      notify: (message: string) => console.warn('[Notification fallback]', message),
      confirmAction: (message: string) => Promise.resolve(window.confirm(message)),
    };
  }
  return ctx;
}
