// Service worker de Ágora: abre sin red (la carcasa) y gestiona los clics en los avisos.
// Firestore va por su cuenta (otro dominio), aquí solo se cachea la propia web.
const CACHE = 'agora-v3';

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== location.origin) return;
    // Páginas: red primero (siempre la última versión), caché si no hay conexión
    if (req.mode === 'navigate') {
        e.respondWith(fetch(req).then(r => { caches.open(CACHE).then(c => c.put('/', r.clone())); return r; }).catch(() => caches.match('/')));
        return;
    }
    // Recursos con hash en el nombre: caché primero
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return r;
    })));
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = e.notification.data?.url || '/';
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) if ('focus' in c) { c.navigate(url); return c.focus(); }
        return self.clients.openWindow(url);
    }));
});
