'use strict';
const CACHE_NAME = 'burbujas-20260928-1';
const PRECACHE_URLS = [
    './',
    './index.html',
    './styles.css?v=20260928-1',
    "./learning-profile.js?v=20260928-1","./reading-words.js?v=20260928-1","./learning-gate.js?v=20260928-1","./READING_ASSETS.md","./READING_WORDS.md","./reading-images/manifest.json","./reading-images/3129.png","./reading-images/25900.png","./reading-images/2317.png","./reading-images/2928.png","./reading-images/2933.png","./reading-images/28479.png","./reading-images/7114.png","./reading-images/2609.png","./reading-images/2397.png","./reading-images/2488.png","./reading-images/2561.png","./reading-images/3247.png","./reading-images/10224.png","./reading-images/2525.png","./reading-images/2641.png","./reading-images/2582.png","./reading-images/2610.png","./reading-images/6573.png","./reading-images/2494.png","./reading-images/2798.png","./reading-images/2731.png","./reading-images/8299.png","./reading-images/34543.png","./reading-images/9927.png","./reading-images/7166.png","./reading-images/2663.png","./reading-images/25479.png","./reading-images/6060.png","./reading-images/5980.png","./reading-images/3298.png","./reading-images/7173.png","./reading-images/2883.png","./reading-images/28473.png","./reading-images/5892.png","./reading-images/2595.png","./reading-images/2821.png","./reading-images/2509.png","./reading-images/2489.png","./reading-images/24823.png","./reading-images/7202.png","./reading-images/2291.png","./reading-images/2404.png","./reading-images/2533.png","./reading-images/3155.png","./reading-images/8153.png","./reading-images/2339.png","./reading-images/2887.png","./reading-images/2427.png","./reading-images/2541.png","./reading-images/2520.png","./reading-images/7104.png","./reading-images/2603.png","./reading-images/3057.png","./reading-images/6932.png","./reading-images/23849.png","./reading-images/2391.png","./reading-images/2412.png","./reading-images/25191.png","./reading-images/7054.png","./reading-images/25187.png","./reading-images/2469.png","./reading-images/3022.png","./reading-images/2433.png","./reading-images/8094.png","./reading-images/2408.png","./reading-images/2668.png","./reading-images/2264.png","./reading-images/2871.png","./reading-images/2269.png","./reading-images/2277.png","./reading-images/6208.png","./reading-images/2521.png","./reading-images/34363.png","./reading-images/2440.png","./reading-images/2815.png","./reading-images/2409.png","./reading-images/2852.png","./reading-images/2549.png","./reading-images/2532.png","./reading-images/6242.png","./reading-images/5077.png","./reading-images/2445.png","./reading-images/11461.png","./reading-images/25576.png","./reading-images/2573.png","./reading-images/39387.png","./reading-images/2400.png","./reading-images/2955.png","./reading-images/8652.png","./reading-images/2527.png","./reading-images/25488.png","./reading-images/7128.png","./reading-images/4654.png","./reading-images/3135.png","./reading-images/2477.png","./reading-images/2590.png","./reading-images/3379.png","./reading-images/38275.png","./reading-images/3075.png","./reading-images/8349.png",
    './src/core.js?v=20260928-1',
    './src/render.js?v=20260928-1',
    './src/app.js?v=20260928-1',
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
