import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const PROTOTIPO = fileURLToPath(new URL('./legacy/index.html', import.meta.url))

/* Publica el prototipo de validación en /legacy/ sin tocar su contenido.
   Solo se copia legacy/index.html. legacy/sw.js queda en el repositorio pero NO se publica:
   al activarse borra todas las cachés que no son la suya, y con eso dejaría a la app
   nueva sin funcionar sin señal. El prototipo sigue abriendo sin conexión porque
   el service worker de la app también lo guarda (ver docs/DECISIONES.md). */
function prototipoLegacy() {
  return {
    name: 'sito-prototipo-legacy',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'legacy/index.html', source: readFileSync(PROTOTIPO) })
    },
    configureServer(servidor) {
      servidor.middlewares.use((req, res, siguiente) => {
        const ruta = (req.url || '').split('?')[0]
        if (ruta === '/legacy' || ruta === '/legacy/' || ruta === '/legacy/index.html') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(readFileSync(PROTOTIPO))
          return
        }
        siguiente()
      })
    },
  }
}

export default defineConfig({
  /* Rutas relativas: la app funciona igual en usuario.github.io/sito-prototipo/ que en un dominio propio. */
  base: './',
  plugins: [
    react(),
    prototipoLegacy(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: false,
      /* Los íconos ya entran por globPatterns; así no quedan repetidos en la precarga. */
      includeManifestIcons: false,
      manifest: {
        name: 'SITO · Trazabilidad de obras',
        short_name: 'SITO',
        description: 'Tareas, evidencias e incidentes de la obra, también sin señal.',
        lang: 'es-CL',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F5F1',
        theme_color: '#15181D',
        icons: [
          { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
  build: {
    target: 'es2020',
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/pruebas/preparar.js'],
    include: ['src/**/*.test.js', 'supabase/**/*.test.js', 'scripts/**/*.test.js'],
    testTimeout: 30000,
  },
})
