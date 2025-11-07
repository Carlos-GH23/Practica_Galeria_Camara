// Service Worker: precache + cache-first con filtro seguro (evita chrome-extension://)
const CACHE = 'camara-pwa-v4';
const ASSETS = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './images/icons/192.png',
    './images/icons/512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const c = await caches.open(CACHE);
        await c.addAll(ASSETS);
        self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
        self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Maneja solo GET en http/https (evita chrome-extension:// y otros)
    if (req.method !== 'GET') return;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
            const net = await fetch(req);
            if (net.ok) cache.put(req, net.clone());
            return net;
        } catch {
            return cached || Response.error();
        }
    })());
});
