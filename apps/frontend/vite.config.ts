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
  'core-js',
  'crypto-js',
  'restructure',
  'jay-peg',
  'brotli',
  'pako',
  'fast-png',
  '@ungap/structured-clone',
  'media-engine',
  'unicode-trie',
  'linebreak',
  'hyphen',
  'iobuffer',
]

const socketPackages = [
  'socket.io-client',
  'engine.io-client',
  'engine.io-parser',
  'socket.io-parser',
  '@socket.io/component-emitter',
]

const queryPackages = [
  '@tanstack/react-query',
  '@tanstack/query-core',
]

const radixSupportPackages = [
  '@floating-ui/',
  'react-remove-scroll',
  'react-remove-scroll-bar',
  'react-style-singleton',
  'use-callback-ref',
  'use-sidecar',
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

          if (id.includes('@radix-ui/') || radixSupportPackages.some((pkg) => id.includes(pkg))) {
            return 'vendor-radix'
          }
          if (id.includes('@tiptap/')) return 'vendor-tiptap'
          if (id.includes('@tensorflow/') || id.includes('@tensorflow-models/')) return 'vendor-tf'
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (socketPackages.some((pkg) => id.includes(pkg))) return 'vendor-socket'
          if (id.includes('@dnd-kit/')) return 'vendor-dnd'
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers')) return 'vendor-forms'
          if (markdownPackages.some((pkg) => id.includes(pkg))) {
            return 'vendor-markdown'
          }
          if (id.includes('axios')) return 'vendor-axios'
          if (id.includes('zod')) return 'vendor-zod'
          if (id.includes('sonner')) return 'vendor-sonner'
          if (id.includes('echarts') || id.includes('zrender')) return 'vendor-charts'

          if (id.includes('react-router') || id.includes('@remix-run/router')) return 'vendor-router'
          if (queryPackages.some((pkg) => id.includes(pkg))) return 'vendor-query'
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
