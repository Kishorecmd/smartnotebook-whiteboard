import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'Jaihind Whiteboard',
        short_name: 'Whiteboard',
        description: 'Next-Generation Interactive Classroom Whiteboard Application',
        theme_color: '#0c8fe9',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // The HTML shell is deliberately absent: precaching it serves a document
        // that keeps naming the hashed bundles of whichever build installed it,
        // and those 404 once a later deploy replaces them.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2,ttf,wasm,worker.mjs}'],
        maximumFileSizeToCacheInBytes: 5000000,
        cleanupOutdatedCaches: true,
        // vite-plugin-pwa otherwise registers a cache-first NavigationRoute
        // ahead of runtimeCaching, which would shadow the handler below.
        navigateFallback: undefined,
        runtimeCaching: [
          {
            // Serving the precached shell first pins a client to whichever build
            // installed it. When a later deploy removes that build's hashed
            // bundles the shell 404s and the board never opens, so navigations
            // ask the network first and fall back to the last good copy only
            // when the network is unavailable.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'jhw-app-shell',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 2 },
              cacheableResponse: { statuses: [200] }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
