import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { GoogleAuthProvider } from './contexts/GoogleAuthContext';
import './design-system/tokens/css-variables.css';

// Google OAuth Client ID - set in Vercel environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <GoogleAuthProvider>
              <App />
            </GoogleAuthProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
