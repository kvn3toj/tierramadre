import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { GoogleAuthProvider } from './contexts/GoogleAuthContext';
import { PriceShareProvider } from './contexts/PriceShareContext';
import { checkAndInvalidateCaches } from './utils/cacheInvalidation';
import './design-system/tokens/css-variables.css';

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
const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 10);

// Conditional wrapper for Google OAuth
function GoogleWrapper({ children }: { children: ReactNode }) {
  if (isGoogleConfigured) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <GoogleAuthProvider>{children}</GoogleAuthProvider>
      </GoogleOAuthProvider>
    );
  }
  return <>{children}</>;
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
      <LanguageProvider>
        <ThemeProvider>
          <GoogleWrapper>
            <AuthProvider>
                <PriceShareProvider>
                  <App />
                </PriceShareProvider>
              </AuthProvider>
          </GoogleWrapper>
        </ThemeProvider>
      </LanguageProvider>
    </React.StrictMode>
  );
});
