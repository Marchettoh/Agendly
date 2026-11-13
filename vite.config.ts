import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'logo/*.svg'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        globIgnores: ['splash/**', 'icons/mstile-*'],
      },
      manifest: {
        id: '/',
        name: 'Agendly',
        short_name: 'Agendly',
        description: 'La tua giornata, sotto controllo. Agenda personale con promemoria e notifiche urgenti.',
        lang: 'it',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#2563EB',
        background_color: '#F8FAFC',
        categories: ['productivity'],
        icons: [
          ...[48, 72, 96, 128, 144].map((s) => ({ src: `/icons/icon-${s}.png`, sizes: `${s}x${s}`, type: 'image/png', purpose: 'any' })),
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Nuovo impegno', short_name: 'Aggiungi', url: '/nuovo', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Oggi', url: '/', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      devOptions: { enabled: false, type: 'module' },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/messaging'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
