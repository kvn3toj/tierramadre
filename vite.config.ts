import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Use relative paths for Electron compatibility
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Auto-update for faster deployments
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tierra Madre Studio',
        short_name: 'TM Studio',
        description: 'Internal Advertising Agency - Emerald Collection Management',
        theme_color: '#00AE7A',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/?source=pwa',
        categories: ['business', 'productivity', 'photo'],
        prefer_related_applications: false,
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        // Exclude large catalog images from precache
        globIgnores: ['**/catalog-media/**', '**/node_modules/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB max (main JS bundle is ~2.5MB)
        // Skip waiting to activate new SW immediately
        skipWaiting: true,
        clientsClaim: true,
        // Clean old caches on update
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Cloudinary images with stale-while-revalidate
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cloudinary-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
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
        manualChunks: {
          // Core vendor libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI framework
          'vendor-mui': ['@mui/material', '@emotion/react', '@emotion/styled'],
          // PDF generation libraries (lazy loaded)
          'pdf-libs': ['jspdf', 'html2canvas'],
          // Virtualization (for inventory grid)
          'virtualization': ['react-window', 'react-virtualized-auto-sizer'],
        },
      },
    },
    // Warn at 1MB chunks (reasonable for lazy-loaded features)
    chunkSizeWarningLimit: 1000,
  }
})
