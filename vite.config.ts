import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: false,
      },
    },
  },
  build: {
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: {
        // Sadece bilgilendirme log'larını drop et; warn/error prod'da Render
        // Logs üzerinden görünebilir kalsın (debug için kritik).
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
        drop_debugger: true,
        passes: 2,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design/icons')) {
            return 'vendor-antd'
          }
          if (id.includes('node_modules/html2canvas') || id.includes('node_modules/jspdf')) {
            return 'vendor-pdf'
          }
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx'
          }
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
