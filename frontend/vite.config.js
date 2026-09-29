import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendTarget = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'
const gisTarget = process.env.VITE_GIS_URL || 'http://127.0.0.1:5174'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // The Coal Mine GIS app is a separate Vite project that must be running on
      // its own dev server. Without this proxy Vite's SPA fallback answers /gis/
      // with the CarboNex index.html, so the GIS iframe renders CarboNex inside
      // CarboNex. Proxying keeps the GIS app same-origin, so its /api/* calls
      // resolve against the backend through the rules below.
      '^/gis/': {
        target: gisTarget,
        changeOrigin: true
      },
      '/api': {
        target: backendTarget,
        changeOrigin: true
      },
      '/endpoint': {
        target: backendTarget,
        changeOrigin: true
      },
      '/latest': {
        target: backendTarget,
        changeOrigin: true
      }
    }
  }
})

