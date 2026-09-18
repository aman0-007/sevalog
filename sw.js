const CACHE_VERSION = 'sevalog-v13';
const CACHE_NAME = `sevalog-cache-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `sevalog-dynamic-${CACHE_VERSION}`;

// Assets essential for the offline app shell
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/layout.css',
    '/public-layout.css',
    '/js/api.js',
    '/js/auth.js',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    'https://unpkg.com/lucide@latest'
];

// 1. Install Event - Cache App Shell & Immediately skip waiting
self.addEventListener('install', (event) => {
    // Force the waiting service worker to become active immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching App Shell for', CACHE_NAME);
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Allow clients to trigger skipWaiting directly
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// 2. Activate Event - Purge all previous caches & take control of all open windows immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
                        console.log('[Service Worker] Purging obsolete cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            // Claim all open clients immediately without requiring reloads or reinstall
            return self.clients.claim();
        })
    );
});

// 3. Fetch Event - True Network-First Strategy
// Always fetch fresh from the network so updates appear instantly.
// Falls back to cache or offline.html only when disconnected.
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Do not intercept non-GET requests (e.g. POST / PUT / PATCH)
    if (req.method !== 'GET') {
        return;
    }

    const url = new URL(req.url);

    // STRATEGY A: API Requests (Network First, update dynamic cache, fallback to cache)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(req)
                .then((networkRes) => {
                    if (networkRes && networkRes.status === 200) {
                        const copy = networkRes.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => {
                            cache.put(req, copy);
                        });
                    }
                    return networkRes;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    // STRATEGY B: Web Pages, JS, CSS, and Assets (Always Network-First)
    event.respondWith(
        fetch(req)
            .then((networkRes) => {
                // If network fetch succeeded, update cache for offline use
                if (networkRes && networkRes.status === 200) {
                    const copy = networkRes.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(req, copy);
                    });
                }
                return networkRes;
            })
            .catch(() => {
                // Network failed -> Device is offline. Serve from cache.
                return caches.match(req).then((cachedRes) => {
                    if (cachedRes) return cachedRes;

                    // If offline and navigating to a page, show offline fallback
                    if (req.mode === 'navigate') {
                        return caches.match('/offline.html');
                    }
                });
            })
    );
});
