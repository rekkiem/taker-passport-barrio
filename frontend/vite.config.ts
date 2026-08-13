import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Activa la nueva versión del Service Worker de inmediato en vez de
        // esperar a que se cierren todas las pestañas — evita que quede
        // "pegada" una build vieja en caché tras cada despliegue.
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Taker Passport Barrio',
        short_name: 'TakerPass',
        description: 'El vecino de confianza que necesitas — Providencia y Ñuñoa',
        theme_color: '#2F6B57',
        background_color: '#EFEDE2',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: { port: 3000, proxy: { '/api': 'http://localhost:4000' } }
});