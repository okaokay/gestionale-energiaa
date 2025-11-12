import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'chart-vendor': ['recharts'],
          'pdf-vendor': ['pdfjs-dist', 'react-pdf'],
          'form-vendor': ['react-hook-form'],
          'date-vendor': ['date-fns'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['@headlessui/react', 'lucide-react'],
          'utils-vendor': ['axios', 'zustand', 'react-hot-toast'],
          'ocr-vendor': ['tesseract.js']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

