import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy para el backend durante el desarrollo
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  build: {
    // El sw.js debe quedar en la raíz del dist, no procesado por Vite.
    // Al estar en /public, Vite lo copia automáticamente sin transformar.
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  // Asegura que /public/sw.js se sirva en la raíz durante dev
  publicDir: 'public',
});