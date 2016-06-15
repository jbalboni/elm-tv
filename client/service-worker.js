(global => {
    'use strict';

    // Load the sw-tookbox library.
    importScripts('dist/sw-toolbox.js');

    // Turn on debug logging, visible in the Developer Tools' console.
    global.toolbox.options.debug = true;

    global.toolbox.router.get(/\/dist\//, global.toolbox.cacheFirst);
    global.toolbox.router.get(/fonts\.googleapis\.com\//, global.toolbox.cacheFirst);
    global.toolbox.router.get(/fonts\.gstatic\.com\//, global.toolbox.cacheFirst);

    toolbox.precache(['/dist/index.html', '/dist/styles.css', '/dist/material.min.js']);

    // By default, all requests that don't match our custom handler will use the
    // toolbox.networkFirst cache strategy, and their responses will be stored in
    // the default cache.
    global.toolbox.router.default = global.toolbox.networkFirst;

    // Boilerplate to ensure our service worker takes control of the page as soon
    // as possible.
    global.addEventListener('install',
    event => event.waitUntil(global.skipWaiting()));
    global.addEventListener('activate',
    event => event.waitUntil(global.clients.claim()));
})(self);
