import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AthletiPath',
        short_name: 'AthletiPath',
        description: 'Sports Career & Performance Tracking Platform',
        theme_color: '#111827',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/Athletipathilogo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/Athletipathilogo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
