import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { GoogleAuthProvider } from './contexts/GoogleAuthContext';
import './design-system/tokens/css-variables.css';

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <GoogleWrapper>
            <App />
            <Analytics />
            <SpeedInsights />
          </GoogleWrapper>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>
);
