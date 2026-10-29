// Service Worker Oficial de WJGEEKS 3D PRO (PWA)
// Versión 2.1 - Estrategia Network-First con Fallback Offline para actualización instantánea (sin F5)
const CACHE_NAME = 'wjgeeks-3d-v2.1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/wjg_logo_vector.svg',
  '/wjg_logo_transparent.svg'
];

// 1. Instalación: precarga de cascarón PWA y activación inmediata
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activación: purga de cachés antiguas y toma de control inmediata
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

// 3. Soporte para mensaje SKIP_WAITING desde la aplicación cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. Intercepción de peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  // Ignorar esquemas no soportados (chrome-extension://, etc.)
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return;
  }

  const url = new URL(event.request.url);

  // El Service Worker SOLO debe gestionar recursos del propio origen (archivos de la app)
  // NUNCA interceptar APIs externas, gateways locales (localhost:3001), Supabase o Google
  if (url.origin !== self.location.origin) {
    return;
  }

  // APIs en vivo y webhooks NUNCA se guardan en caché estático
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleapis.com') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // ESTRATEGIA A: Solicitudes de Navegación HTML (Network-First con timeout de 2.5s)
  // Garantiza que el usuario SIEMPRE vea el index.html más reciente sin requerir F5/Ctrl+F5.
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          const networkResponse = await fetch(event.request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/index.html', networkResponse.clone()).catch(() => {});
            return networkResponse;
          }
        } catch (_) {
          // Si falló la red o timeout, usar la versión en caché para soporte offline
        }

        const cached = await caches.match('/index.html');
        return cached || (await fetch(event.request));
      })()
    );
    return;
  }

  // ESTRATEGIA B: Recursos estáticos con hash único de Vite (/assets/*)
  // Al tener hash inmutable en el nombre de archivo, Stale-While-Revalidate es ultra rápido y seguro.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          // Si no hay red y no está en caché, intentar index.html para navegación SPA
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('', { status: 504, statusText: 'Offline / Network Failed' });
        });

      return cachedResponse || fetchPromise;
    })
  );
});
