const CACHE_VERSION = 'sevalog-v15';
const CACHE_NAME = `sevalog-cache-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `sevalog-dynamic-${CACHE_VERSION}`;

// Assets essential for the offline app shell
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/layout.css',
    '/public-layout.css',
    '/frontend/reset-password.html',
    '/frontend/forgot-password.html',
    '/frontend/login.html',
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

    // STRATEGY B: Navigation to clean reset-password paths (/reset-password/:userId/:token)
    if (req.mode === 'navigate' && (url.pathname.includes('/reset-password') || url.pathname.includes('/reset_password'))) {
        const uuidMatch = url.pathname.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const jwtMatch = url.pathname.match(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]+/);
        let target = '/frontend/reset-password.html';
        const parts = [];
        if (uuidMatch) parts.push('userId=' + encodeURIComponent(uuidMatch[0]));
        if (jwtMatch) parts.push('token=' + encodeURIComponent(jwtMatch[0]));
        if (parts.length > 0) {
            target += '?' + parts.join('&');
        } else if (url.search) {
            target += url.search;
        }
        if (url.hash) target += url.hash;

        event.respondWith(
            fetch(target)
                .then((res) => {
                    if (res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(target, copy));
                    }
                    return res;
                })
                .catch(() => caches.match('/frontend/reset-password.html').then((c) => c || caches.match('/offline.html')))
        );
        return;
    }

    // STRATEGY C: Web Pages, JS, CSS, and Assets (Always Network-First)
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
