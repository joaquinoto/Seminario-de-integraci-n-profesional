import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Proxy para el backend durante el desarrollo
      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: false, //evita que Vite rechace la conexión por problemas de certificados SSL/TLS no válidos en entornos de prueba
        },
        '/auth': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: false, //evita que Vite rechace la conexión por problemas de certificados SSL/TLS no válidos en entornos de prueba
        },
        '/users': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: false, //evita que Vite rechace la conexión por problemas de certificados SSL/TLS no válidos en entornos de prueba
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
  };
});