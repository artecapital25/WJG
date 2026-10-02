// Service Worker Oficial de WJGEEKS 3D (PWA)
const CACHE_NAME = 'wjgeeks-3d-v1.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/wjg_logo_vector.svg',
  '/wjg_logo_transparent.svg'
];

// Instalación: Precarga de archivos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Evitar interceptar llamadas a Supabase en caché estático (deben ser siempre en vivo)
  if (url.hostname.includes('supabase.co') || event.request.method !== 'GET') {
    return;
  }

  // Estrategia Stale-While-Revalidate para recursos estáticos y páginas
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Si no hay red y no está en caché, servir index.html para navegación SPA
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
