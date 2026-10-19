const CACHE_NAME = 'fdc-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.jpg',
  '/icon.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-192x192.png',
  '/icons/maskable-512x512.png'
];

// Install: Cache critical static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Failed to cache some static assets during install', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
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

// Fetch: Network first, fall back to cache for navigation and assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Do not intercept non-GET requests or API requests (API should always be fresh)
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first strategy with cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache successful responses for static images, css, js
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (request.destination === 'image' ||
           request.destination === 'font' ||
           url.pathname.startsWith('/_next/static/'))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If navigating to an HTML page and offline, return cached root page
        if (request.mode === 'navigate') {
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
        }
        return new Response('Offline: Connection lost', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
