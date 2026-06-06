const CACHE_NAME = 'bus-boss-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Service Worker: Dateien werden gecacht...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
        .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Althergebrachter Cache wird gelöscht...');
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
           .then(cachedResponse => {
               if (cachedResponse) {
                   return cachedResponse;
               }
               return fetch(event.request);
           })
    );
});