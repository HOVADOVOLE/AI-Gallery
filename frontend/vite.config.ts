import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redirect all calls starting with /api to the FastAPI backend
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Redirect thumbnail requests
      '/thumbnails': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})