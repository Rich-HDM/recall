/* Recall service worker: makes the app work offline. Bump VERSION whenever files change. */
const VERSION = 'recall-v5';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './maps.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './data/collections.json',
  './data/monarchs.json',
  './data/pms.json',
  './data/presidents.json',
  './data/universe.json',
  './data/world-history.json',
  './data/british-history.json',
  './data/maps/uk.json',
  './data/maps/world.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first for our own files (so updates arrive promptly), falling back to the cache when offline.
// Fonts and other cross-origin files: cache first, then network (and keep a copy).
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
      return res;
    }).catch(() => new Response('', { status: 504 })))
  );
});
