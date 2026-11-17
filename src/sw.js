/* Service worker de SITO.

   - Guarda la app completa en el celular al instalarla, para que abra sin señal.
   - También guarda el prototipo de validación (legacy/index.html), que sigue
     disponible sin señal en …/legacy/.
   - Reemplaza al service worker del prototipo: tiene el mismo nombre (sw.js) y la misma
     ubicación, así que los celulares que ya tenían el prototipo instalado lo actualizan solos.
     Al activarse borra las cachés "sito-proto-*" y recarga las ventanas abiertas,
     para que nadie se quede viendo el prototipo antiguo.

   No guarda nada de Supabase: los datos viven en IndexedDB y los maneja la app. */

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

/* Cualquier dirección de la app abre index.html; la del prototipo abre su propio archivo. */
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/\/legacy(\/|$)/] }))

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys()
      const antiguas = nombres.filter((n) => n.startsWith('sito-proto-'))
      if (!antiguas.length) return
      await Promise.all(antiguas.map((n) => caches.delete(n)))
      /* Venían del prototipo: se recargan para mostrar la app nueva. */
      await self.clients.claim()
      const ventanas = await self.clients.matchAll({ type: 'window' })
      await Promise.all(ventanas.map((v) => v.navigate(v.url).catch(() => null)))
    })(),
  )
})
