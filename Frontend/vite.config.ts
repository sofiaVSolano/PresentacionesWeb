import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // En desarrollo /api va al backend, así el formulario funciona sin configurar
    // nada. En producción front y back se sirven tras el mismo dominio, o se
    // apunta al backend con VITE_API_URL (ver .env.example).
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Three.js NO se agrupa a mano: al hacerlo el empaquetador arrastra React dentro del
    // chunk 3D y lo precarga en la entrada. El import() diferido de las escenas ya lo separa solo.
    // El aviso de tamaño se sube porque ese chunk grande solo se descarga bajo demanda.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules') && id.includes('gsap')) return 'gsap'
        },
      },
    },
  },
})
