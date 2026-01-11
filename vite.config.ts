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
    open: true,
    // Proxy API requests to production for local development
    // This allows local dev to fetch real data from Vercel serverless functions
    proxy: {
      '/api/': {
        target: 'https://tierra-madre-studio.vercel.app',
        changeOrigin: true,
        secure: true,
        // Rewrite to ensure correct path
        rewrite: (path) => path,
      },
    },
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
    // Let Vite handle chunk splitting automatically
    // Custom manualChunks was causing "Cannot access uninitialized variable" errors
    // due to incorrect module ordering in the bundled output
    chunkSizeWarningLimit: 800,
  }
})
