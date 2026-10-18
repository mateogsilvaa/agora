// Primero red, si no hay red tira de caché: el juego entero se puede jugar sin conexión.
const CACHE = 'votagora-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;
  if (request.url.includes('firestore') || request.url.includes('googleapis.com/identitytoolkit')) return;
  e.respondWith(
    fetch(request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(request, copy));
      return res;
    }).catch(() => caches.match(request).then(r => r || caches.match('/')))
  );
});
