import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'vendor-three';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('html2canvas')) return 'vendor-html2canvas';
            if (id.includes('jspdf') || id.includes('dompurify')) return 'vendor-jspdf';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('canvas-confetti')) return 'vendor-confetti';
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            return 'vendor-libs';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/wa': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wa/, '')
      }
    }
  }
});
