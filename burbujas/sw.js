'use strict';
const CACHE_NAME = 'burbujas-20260925-1';
const PRECACHE_URLS = [
    './',
    './index.html',
    './styles.css?v=20260925-1',
    './learning-gate.js?v=20260925-1',
    './src/core.js?v=20260925-1',
    './src/render.js?v=20260925-1',
    './src/app.js?v=20260925-1',
    './manifest.webmanifest',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', event => {
    // addAll rejects if any required resource (including the gate) is unavailable.
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(names => Promise.all(
        names.filter(name => name.startsWith('burbujas-') && name !== CACHE_NAME).map(name => caches.delete(name))
    )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const scope = new URL(self.registration.scope);
    if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
    if (event.request.mode === 'navigate') {
        // Never put a newer online index into an older version's offline cache.
        event.respondWith(fetch(event.request).then(response => {
            if (!response.ok) throw new Error('Navigation unavailable');
            return response;
        }).catch(() => caches.open(CACHE_NAME).then(cache => cache.match('./index.html'))));
        return;
    }
    // Exact query matching prevents old assets answering a new version's URL.
    // Missing scripts fail normally; there is no ungated or HTML asset fallback.
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(event.request).then(cached => cached || fetch(event.request))));
});
