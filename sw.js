const CACHE_NAME = 'sevalog-cache-v2';
const DYNAMIC_CACHE = 'sevalog-dynamic-v2';

// Assets essential for the app shell
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

// 1. Install Event - Cache App Shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching App Shell');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// 2. Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
                        console.log('[Service Worker] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Fetch Event - Advanced Routing Strategy
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // STRATEGY A: API Requests (Network First, fallback to cache)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(req)
                .then((networkRes) => {
                    return caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(req, networkRes.clone());
                        return networkRes;
                    });
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    // STRATEGY B: Static Assets & HTML (Stale-While-Revalidate)
    event.respondWith(
        caches.match(req).then((cachedRes) => {
            const fetchPromise = fetch(req).then((networkRes) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(req, networkRes.clone());
                });
                return networkRes;
            }).catch(() => {
                // If offline and trying to navigate to a new HTML page, show offline.html
                if (req.mode === 'navigate') {
                    return caches.match('/offline.html');
                }
            });

            // Return cached response immediately if available, while fetching update in background
            return cachedRes || fetchPromise;
        })
    );
});
