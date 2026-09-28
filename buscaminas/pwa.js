(function () {
  'use strict';
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'}).catch(function () {
        // Online play can continue; offline use requires a complete installation.
      });
    });
  }
}());
