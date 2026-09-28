'use strict';
var CACHE_NAME = 'buscaminas-20260928-4';
var PRECACHE_URLS = [
  './', './index.html', './styles.css?v=20260928-3',
  './src/core.js?v=20260928-3', './src/app.js?v=20260928-3', './pwa.js?v=20260928-3',
  './learning-profile.js?v=20260928-4', './reading-words.js?v=20260928-1', './learning-gate.js?v=20260928-4',
  './manifest.webmanifest', './icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './credits.html', './LICENSE', './THIRD_PARTY.md', './READING_ASSETS.md', './READING_WORDS.md', './reading-images/manifest.json'
];
var READING_IDS = [3129,25900,2317,2928,2933,28479,7114,2609,2397,2488,2561,3247,10224,2525,2641,2582,2610,6573,2494,2798,2731,8299,34543,9927,7166,2663,25479,6060,5980,3298,7173,2883,28473,5892,2595,2821,2509,2489,24823,7202,2291,2404,2533,3155,8153,2339,2887,2427,2541,2520,7104,2603,3057,6932,23849,2391,2412,25191,7054,25187,2469,3022,2433,8094,2408,2668,2264,2871,2269,2277,6208,2521,34363,2440,2815,2409,2852,2549,2532,6242,5077,2445,11461,25576,2573,39387,2400,2955,8652,2527,25488,7128,4654,3135,2477,2590,3379,38275,3075,8349];
READING_IDS.forEach(function (id) { PRECACHE_URLS.push('./reading-images/' + id + '.png'); });
self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(PRECACHE_URLS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (names) {
    return Promise.all(names.filter(function (name) { return name.indexOf('buscaminas-') === 0 && name !== CACHE_NAME; }).map(function (name) { return caches.delete(name); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url), scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || url.pathname.indexOf(scope.pathname) !== 0) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(function (response) {
      if (!response.ok) throw new Error('Navigation unavailable');
      return response;
    }).catch(function () { return caches.open(CACHE_NAME).then(function (cache) { return cache.match('./index.html'); }); }));
    return;
  }
  // Only exact asset versions match. Never substitute HTML for a missing script.
  event.respondWith(caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(event.request).then(function (cached) { return cached || fetch(event.request); });
  }));
});
