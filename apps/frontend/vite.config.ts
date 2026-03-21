import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const markdownPackages = [
  'react-markdown',
  'remark-',
  'rehype-',
  'mdast-',
  'micromark',
  'unified',
  'vfile',
  'hast-',
  'unist-',
  'property-information',
]

const pdfPackages = [
  '@react-pdf/',
  'react-pdf',
  'pdfkit',
  'fontkit',
  'yoga-layout',
  'canvg',
  'jspdf',
  'jspdf-autotable',
  'html2canvas',
  'html2pdf.js',
]

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
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('@radix-ui/')) return 'vendor-radix'
          if (id.includes('@tiptap/')) return 'vendor-tiptap'
          if (id.includes('@tensorflow/') || id.includes('@tensorflow-models/')) return 'vendor-tf'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('socket.io-client')) return 'vendor-socket'
          if (id.includes('@dnd-kit/')) return 'vendor-dnd'
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers')) return 'vendor-forms'
          if (markdownPackages.some((pkg) => id.includes(pkg))) {
            return 'vendor-markdown'
          }
          if (id.includes('axios')) return 'vendor-axios'
          if (id.includes('zod')) return 'vendor-zod'
          if (id.includes('sonner')) return 'vendor-sonner'
          if (id.includes('echarts') || id.includes('zrender')) return 'vendor-charts'

          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('@tanstack/react-query')) return 'vendor-query'
          if (pdfPackages.some((pkg) => id.includes(pkg))) {
            return 'vendor-pdf'
          }
          if (id.includes('date-fns')) return 'vendor-date'

          return 'vendor'
        },
      },
    }
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})
