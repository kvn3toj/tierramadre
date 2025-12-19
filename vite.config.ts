import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// PWA disabled - vite-plugin-pwa not generating files correctly
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Use relative paths for Electron compatibility
  base: '/',
  plugins: [
    react(),
    // PWA temporarily disabled due to SW generation issues
    // Re-enable when vite-plugin-pwa is working correctly
  ],
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/material/styles',
    ],
  },
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // React Router
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
            return 'vendor-router';
          }
          // MUI + Emotion combined (prevents initialization order issues)
          // Emotion must load before MUI, so we bundle them together
          if (
            id.includes('node_modules/@mui/') ||
            id.includes('node_modules/@emotion')
          ) {
            return 'vendor-mui';
          }
          // Framer Motion (animations)
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion')) {
            return 'vendor-framer';
          }
          // PDF generation
          if (id.includes('node_modules/jspdf')) {
            return 'vendor-jspdf';
          }
          if (id.includes('node_modules/html2canvas')) {
            return 'vendor-html2canvas';
          }
          // Virtualization
          if (id.includes('node_modules/react-window') || id.includes('node_modules/react-virtualized')) {
            return 'vendor-virtual';
          }
          // DOMPurify
          if (id.includes('node_modules/dompurify')) {
            return 'vendor-purify';
          }
          // Floating UI (popovers)
          if (id.includes('node_modules/@floating-ui')) {
            return 'vendor-floating';
          }
        },
      },
    },
    // Warn at 750KB chunks (jspdf is 560KB, MUI+Emotion combined is larger)
    chunkSizeWarningLimit: 750,
  }
})
