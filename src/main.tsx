import React, { ReactNode, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { GoogleAuthProvider } from './contexts/GoogleAuthContext';
import { PriceShareProvider } from './contexts/PriceShareContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { checkAndInvalidateCaches } from './utils/cacheInvalidation';
import { STORAGE_KEYS } from './constants/storage-keys';
import './design-system/tokens/css-variables.css';
// DS v3 runtime tokens (--tm-* + --maxw). Additive layer on top of the v1
// css-variables.css above — it still owns --app-main-height, box-sizing resets
// and the global reduced-motion collapse.
import './design-system/tokens/css-variables-v3.css';

// Initialize Convex client once at module load.
// Must wrap everything that depends on useQuery (e.g. CurrencyProvider's live-sync).
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

function ConvexWrapper({ children }: { children: ReactNode }) {
  if (convexClient) {
    return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
  }
  return <>{children}</>;
}

// Invalidate transient caches on new deploy (before any data fetching)
checkAndInvalidateCaches();

// Extend Window interface for version check
declare global {
  interface Window {
    __TM_VERSION_READY__?: boolean;
    __TM_VERSION__?: string;
  }
}

// Google OAuth Client ID - set in Vercel environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const isGoogleConfigured = Boolean(
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 10,
);

// Check if user is already stored (skip GSI script load to avoid 403 on localhost)
function hasStoredUser(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEYS.GOOGLE_USER);
  } catch {
    return false;
  }
}

// Conditional wrapper for Google OAuth
// Defers loading GoogleOAuthProvider (GSI script) until needed
function GoogleWrapper({ children }: { children: ReactNode }) {
  const [needsGSI, setNeedsGSI] = useState(!hasStoredUser());

  if (!isGoogleConfigured) {
    return <>{children}</>;
  }

  // User already authenticated — skip GSI script, just provide the context
  if (!needsGSI) {
    return (
      <GoogleAuthProvider onSignedOut={() => setNeedsGSI(true)}>
        {children}
      </GoogleAuthProvider>
    );
  }

  // Not authenticated — load full GSI for sign-in button
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleAuthProvider>{children}</GoogleAuthProvider>
    </GoogleOAuthProvider>
  );
}

// Wait for version check to complete before rendering
// This ensures we don't start loading chunks before version is confirmed
function waitForVersionReady(): Promise<void> {
  return new Promise((resolve) => {
    // Check immediately
    if (window.__TM_VERSION_READY__) {
      resolve();
      return;
    }

    // Poll for readiness (should be instant, but safety fallback)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.__TM_VERSION_READY__ || attempts > 50) {
        clearInterval(interval);
        resolve();
      }
    }, 10);
  });
}

// Initialize app only after version is confirmed
waitForVersionReady().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ConvexWrapper>
        <LanguageProvider>
          <ThemeProvider>
            <GoogleWrapper>
              <AuthProvider>
                <PriceShareProvider>
                  <CurrencyProvider>
                    <App />
                  </CurrencyProvider>
                </PriceShareProvider>
              </AuthProvider>
            </GoogleWrapper>
          </ThemeProvider>
        </LanguageProvider>
      </ConvexWrapper>
    </React.StrictMode>,
  );
});
