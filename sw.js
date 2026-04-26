// Service Worker — Piangüita Diagnóstico
// Permite usar la herramienta sin internet (modo offline)
const CACHE = 'pianguita-v1';
const URLS = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(URLS)).then(() => self.skipWaiting())
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
  // Solo cachear GET de la misma origin + CDN conocidos
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;
  const isCDN = url.hostname.includes('cloudflare.com');
  if (!isLocal && !isCDN) return; // Firebase, IA proxy → siempre red

  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && (isLocal || isCDN)) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached); // sin red → devolver caché
      return cached || net;
    })
  );
});
