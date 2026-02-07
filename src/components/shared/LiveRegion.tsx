/**
 * LiveRegion Component & Context
 * Provides aria-live announcements for screen readers.
 * WCAG 4.1.3 Status Messages compliance.
 *
 * Usage:
 *   <LiveRegionProvider>
 *     <App />
 *   </LiveRegionProvider>
 *
 *   const { announce } = useLiveRegion();
 *   announce('5 productos encontrados');
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Box } from '@mui/material';

interface LiveRegionContextValue {
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
}

const LiveRegionContext = createContext<LiveRegionContextValue>({
  announce: () => {},
});

export const useLiveRegion = () => useContext(LiveRegionContext);

export const LiveRegionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const clearTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    // Clear previous message first to ensure screen reader re-announces
    if (politeness === 'assertive') {
      setAssertiveMessage('');
    } else {
      setPoliteMessage('');
    }

    // Use requestAnimationFrame to ensure the clear is processed first
    requestAnimationFrame(() => {
      if (politeness === 'assertive') {
        setAssertiveMessage(message);
      } else {
        setPoliteMessage(message);
      }
    });

    // Auto-clear after 5 seconds
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setPoliteMessage('');
      setAssertiveMessage('');
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  // Visually hidden styles for screen reader only
  const srOnly = {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: 0,
  };

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <Box
        aria-live="polite"
        aria-atomic="true"
        role="status"
        sx={srOnly}
      >
        {politeMessage}
      </Box>
      <Box
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        sx={srOnly}
      >
        {assertiveMessage}
      </Box>
    </LiveRegionContext.Provider>
  );
};
