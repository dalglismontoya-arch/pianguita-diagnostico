// Service Worker — Piangüita Diagnóstico
// v2: network-first para HTML, cache-first para CDN
const CACHE = 'pianguita-v2';
const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CDN_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;
  const isCDN = url.hostname.includes('cloudflare.com');
  if (!isLocal && !isCDN) return; // Firebase, IA proxy → siempre red

  if (isLocal) {
    // RED PRIMERO para index.html y archivos locales
    // Así siempre llega la versión más reciente cuando hay conexión
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request)) // sin red → caché
    );
  } else {
    // CACHÉ PRIMERO para CDN (no cambian nunca)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        });
      })
    );
  }
});
