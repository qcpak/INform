const CACHE_NAME = 'injection-cache-v6';
const assets = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './bom-data.json',
    './logo.png',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});