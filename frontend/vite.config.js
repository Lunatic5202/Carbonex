import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendTarget = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
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

