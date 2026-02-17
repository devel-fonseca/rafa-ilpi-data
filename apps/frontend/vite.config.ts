import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: 'buffer/',
    },
  },
  define: {
    'global': 'globalThis',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Mantém aviso útil para chunks realmente anômalos após code-splitting
    chunkSizeWarningLimit: 2000,
    // Desabilitar type checking temporariamente para permitir build de produção
    // TODO: Reabilitar após corrigir todos os erros TypeScript no módulo de prescrições
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react'
          if (id.includes('@radix-ui/')) return 'vendor-radix'
          if (id.includes('@tiptap/')) return 'vendor-tiptap'
          if (id.includes('@tensorflow/') || id.includes('@tensorflow-models/')) return 'vendor-tf'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('socket.io-client')) return 'vendor-socket'
          if (id.includes('@dnd-kit/')) return 'vendor-dnd'
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers')) return 'vendor-forms'
          if (
            id.includes('react-markdown') ||
            id.includes('remark-') ||
            id.includes('rehype-') ||
            id.includes('mdast-') ||
            id.includes('micromark') ||
            id.includes('unified') ||
            id.includes('vfile') ||
            id.includes('hast-') ||
            id.includes('unist-') ||
            id.includes('property-information')
          ) {
            return 'vendor-markdown'
          }
          if (id.includes('axios')) return 'vendor-axios'
          if (id.includes('zod')) return 'vendor-zod'
          if (id.includes('sonner')) return 'vendor-sonner'

          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('@tanstack/react-query')) return 'vendor-query'
          if (id.includes('recharts')) return 'vendor-charts'
          if (
            id.includes('@react-pdf/') ||
            id.includes('react-pdf') ||
            id.includes('pdfkit') ||
            id.includes('fontkit') ||
            id.includes('yoga-layout') ||
            id.includes('canvg') ||
            id.includes('jspdf') ||
            id.includes('jspdf-autotable') ||
            id.includes('html2canvas') ||
            id.includes('html2pdf.js') ||
            id.includes('@react-pdf/renderer')
          ) {
            return 'vendor-pdf'
          }
          if (id.includes('xlsx')) return 'vendor-xlsx'
          if (id.includes('date-fns')) return 'vendor-date'

          return 'vendor'
        },
      },
      onwarn(warning, warn) {
        // Ignorar warnings de TypeScript durante o build
        if (warning.code === 'PLUGIN_WARNING') return
        warn(warning)
      }
    }
  },
  esbuild: {
    // Desabilitar type checking do esbuild durante o build
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})
